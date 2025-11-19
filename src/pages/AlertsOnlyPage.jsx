import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LogOut, PanelRightClose, X } from 'lucide-react';
import IncidentModal from './IncidentModal.jsx';

// --- Helper Functions & Constants ---
const getWsUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const url = new URL(apiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}`;
};
const SESSION_KEY = 'vms_dispatch_session';
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes


// Helper to adapt server alert format
const adaptServerAlert = (serverAlert) => {
    const turingData = serverAlert.originalData;
    let snapshotUrl = `https://placehold.co/600x400/111827/9CA3AF?text=No+Snapshot`;
    let clipUrl = null; 

    // Find Snapshot
    if (turingData.mediums?.find(m => m.name === 'snapshot')?.files?.[0]?.url) {
        snapshotUrl = turingData.mediums.find(m => m.name === 'snapshot').files[0].url;
    }
    
    // Find Clip
    const clipMedium = turingData.mediums?.find(m => m.name === 'clip' && m.files?.[0]?.url);
    if (clipMedium) {
        clipUrl = clipMedium.files[0].url;
    } else {
        const mp4Medium = turingData.mediums?.find(m => m.files?.[0]?.url?.endsWith('.mp4'));
        if (mp4Medium) {
            clipUrl = mp4Medium.files[0].url;
        }
    }
    
    return { 
        ...serverAlert, 
        id: serverAlert._id, 
        type: turingData.event_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Event', 
        cameraName: turingData.camera?.name || 'Unknown Camera', 
        cameraId: turingData.camera?.id, 
        snapshotUrl: snapshotUrl,
        clipUrl: clipUrl // Crucial: ensure clipUrl is passed
    };
};

// Main Dashboard Component
function AlertsOnlyPage() {
    const { user, logout, alerts, setAlerts } = useAuth();
    
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [viewingSiteId, setViewingSiteId] = useState(null);
    const [isAlertLogVisible, setIsAlertLogVisible] = useState(true);

    const audioContextRef = useRef(null);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const modalCloseTimeoutRef = useRef(null);
    const justOpenedModalRef = useRef(false);
    
    // --- REFS for state values to use in stable callbacks ---
    const viewingSiteIdRef = useRef(viewingSiteId);
    viewingSiteIdRef.current = viewingSiteId;


    const playAlertSound = () => {
        if (!audioContextRef.current) {
            try { audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { console.error("AudioContext not supported.", e); return; }
        }
        const audioCtx = audioContextRef.current;
        const now = audioCtx.currentTime;
        const duration = 0.6;
        const masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        masterGain.gain.setValueAtTime(0.3, now);
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        const highFreq = 900;
        const lowFreq = 600;
        osc1.frequency.setValueAtTime(highFreq, now);
        osc2.frequency.setValueAtTime(highFreq + 10, now);
        osc1.frequency.exponentialRampToValueAtTime(lowFreq, now + duration * 0.8);
        osc2.frequency.exponentialRampToValueAtTime(lowFreq + 10, now + duration * 0.8);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc1.connect(masterGain);
        osc2.connect(masterGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    };
    
    const handleAlertSelect = (alert) => {
        if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
        justOpenedModalRef.current = true;
        setViewingSiteId(alert.siteProfile._id);
    };

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const wsUrl = getWsUrl();

        const connect = () => {
            console.log(`[WebSocket] Attempting to connect...`);
            setConnectionStatus('Connecting...');
            const socket = new WebSocket(`${wsUrl}?token=${token}`);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('[WebSocket] Connection established.');
                setConnectionStatus('Connected');
                reconnectAttemptRef.current = 0;
            };

            socket.onclose = () => {
                console.warn('[WebSocket] Connection closed.');
                setConnectionStatus('Disconnected');
                const delay = Math.min(30000, (2 ** reconnectAttemptRef.current) * 2000);
                reconnectAttemptRef.current++;
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };

            socket.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                setConnectionStatus('Error');
                socket.close();
            };

            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                
                if (message.type === 'new_alert') {
                    const adaptedAlert = adaptServerAlert(message.alert);
                    setAlerts(prev => prev.some(a => a.id === adaptedAlert.id) ? prev : [adaptedAlert, ...prev]);
                    playAlertSound();
                    
                    if (!viewingSiteIdRef.current) {
                        setViewingSiteId(adaptedAlert.siteProfile._id);
                    } else if (viewingSiteIdRef.current === adaptedAlert.siteProfile._id && modalCloseTimeoutRef.current) {
                        clearTimeout(modalCloseTimeoutRef.current);
                    }
                } else if (message.type === 'update_alert') {
                    const adaptedAlert = adaptServerAlert(message.alert);
                    setAlerts(prev => {
                        const existing = prev.find(a => a.id === adaptedAlert.id);
                        if (existing) {
                            return prev.map(a => a.id === adaptedAlert.id ? adaptedAlert : a);
                        }
                        return [adaptedAlert, ...prev];
                    });
                }
            };
        };

        connect();

        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (socketRef.current) {
                socketRef.current.onclose = null; 
                socketRef.current.close();
            }
            if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setAlerts]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const savedSessionJSON = localStorage.getItem(SESSION_KEY);
                if (savedSessionJSON) {
                    const savedSession = JSON.parse(savedSessionJSON);
                    const isSessionValid = user && savedSession.username === user.username && (Date.now() - savedSession.timestamp < SESSION_TIMEOUT);
                    
                    if (isSessionValid) {
                        console.log("Restoring previous session state.");
                        setAlerts(savedSession.alerts);
                        localStorage.removeItem(SESSION_KEY);
                        return;
                    }
                }
                
                console.log("No valid session found. Fetching fresh alert data.");
                const { data: activeAlertsData } = await api.getActiveAlerts();
                if (Array.isArray(activeAlertsData)) {
                    setAlerts(activeAlertsData.map(adaptServerAlert));
                }

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                setAlerts([]);
            }
        };
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, setAlerts]);

    const handleUpdateStatus = async (alert, status) => {
        if (!alert) return;
        try {
            const response = await api.updateAlertStatus(alert.id, status);
            if (response.data && response.data.alert) {
                const updatedAlert = adaptServerAlert(response.data.alert);
                setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
            }
        } catch (error) {
            console.error(`Failed to update alert status to ${status}:`, error);
        }
    };

    const handleAddNote = async (alert, noteText) => {
        if (!alert || !noteText.trim()) return;
        try {
            const response = await api.addNoteToAlert(alert.id, noteText);
            if (response.data && response.data.alert) {
                const updatedAlert = adaptServerAlert(response.data.alert);
                setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
            }
        } catch (error) {
            console.error("Failed to add note:", error);
        }
    };
    
    const alertsForViewingSite = viewingSiteId ? alerts.filter(a => a.siteProfile._id === viewingSiteId) : [];
        
    useEffect(() => {
        if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);

        if (justOpenedModalRef.current) {
            justOpenedModalRef.current = false;
            return;
        }
    
        if (viewingSiteId && alertsForViewingSite.length > 0) {
            const allResolved = alertsForViewingSite.every(a => a.status === 'Resolved');
            if (allResolved) {
                modalCloseTimeoutRef.current = setTimeout(() => {
                    setViewingSiteId(null);
                }, 1500);
            }
        }
    
        return () => {
            if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
        };
    }, [alertsForViewingSite, viewingSiteId]);

    const handleAcknowledgeAll = async () => {
        const alertsToAck = alertsForViewingSite.filter(a => a.status === 'New');
        const promises = alertsToAck.map(alert => api.updateAlertStatus(alert.id, 'Acknowledged'));
        try {
            const results = await Promise.all(promises);
            const updatedAlerts = results.map(res => adaptServerAlert(res.data.alert));
            const updatedAlertsMap = new Map(updatedAlerts.map(a => [a.id, a]));
            setAlerts(prev => prev.map(a => updatedAlertsMap.get(a.id) || a));
        } 
        catch (error) { console.error("Failed to acknowledge all alerts:", error); }
    };

    const handleResolveIncident = async () => {
        const alertsToResolve = alertsForViewingSite.filter(a => a.status !== 'Resolved');
        const promises = alertsToResolve.map(alert => api.updateAlertStatus(alert.id, 'Resolved'));
        try {
            const results = await Promise.all(promises);
            const updatedAlerts = results.map(res => adaptServerAlert(res.data.alert));
            const updatedAlertsMap = new Map(updatedAlerts.map(a => [a.id, a]));
            setAlerts(prev => prev.map(a => updatedAlertsMap.get(a.id) || a));
        } 
        catch (error) { console.error("Failed to resolve incident:", error); }
    };

    const viewingSiteName = alertsForViewingSite[0]?.siteProfile?.name || 'Incident';
    const recentAlerts = alerts.slice(0, 50);

    return (
        <div className="flex flex-col h-screen bg-brand-900 text-brand-300 font-sans">
            <header className="bg-brand-800 border-b border-brand-700 shadow-md">
                 <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold tracking-tight text-white">Alerts Only Dispatch Dashboard</h1>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <span className={`relative flex h-3 w-3 ${connectionStatus === 'Connected' ? '' : 'animate-pulse'}`}>
                                    <span className={`absolute inline-flex h-full w-full rounded-full ${connectionStatus === 'Connected' ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                </span>
                                <span className="text-brand-400 text-sm">{connectionStatus}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-brand-300">Welcome, {user?.username}</span>
                                <button onClick={logout} title="Logout" className="p-2 text-brand-400 hover:text-white rounded-full hover:bg-brand-700 transition-colors"><LogOut size={20} /></button>
                            </div>
                            <button onClick={() => setIsAlertLogVisible(!isAlertLogVisible)} title="Toggle Event Log" className="p-2 text-brand-400 hover:text-white"><PanelRightClose /></button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                {/* Main alerts viewing area, empty for alerts-only mode */}
                <div className="flex-1 p-4 flex flex-col items-center justify-center bg-black relative">
                    <div className="text-center text-brand-400">
                        <X size={48} className="mx-auto mb-4" />
                        <h2 className="text-2xl text-brand-300 font-semibold">Alerts Only Mode</h2>
                        <p className="mt-2">Use the event log on the right to manage active incidents.</p>
                    </div>
                </div>
                
                {isAlertLogVisible && (
                    <div className="w-full flex flex-col border-l border-brand-700 max-w-sm">
                        <div className="p-4 border-b border-brand-700 bg-brand-800"><h2 className="text-lg font-semibold text-white">Real-time Event Log</h2></div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-brand-900">
                            {recentAlerts.map(alert => <AlertItem key={alert.id} alert={alert} onSelect={() => handleAlertSelect(alert)} isActive={viewingSiteId === alert.siteProfile._id} />)}
                        </div>
                    </div>
                )}
            </main>
            
            {viewingSiteId && alertsForViewingSite.length > 0 && (
                <IncidentModal 
                    siteName={viewingSiteName}
                    alertsForSite={alertsForViewingSite}
                    currentUser={user}
                    onClose={() => setViewingSiteId(null)} 
                    onAcknowledge={(alert) => handleUpdateStatus(alert, 'Acknowledged')} 
                    onResolve={(alert) => handleUpdateStatus(alert, 'Resolved')} 
                    onAddNote={handleAddNote}
                    onAcknowledgeAll={handleAcknowledgeAll}
                    onResolveAll={handleResolveIncident}
                />
            )}
        </div>
    );
}

function AlertItem({ alert, onSelect, isActive }) {
    const statusInfo = { 'New': 'bg-red-500', 'Acknowledged': 'bg-yellow-500', 'Resolved': 'bg-brand-700' }[alert.status] || 'bg-brand-700';
    const itemClasses = alert.status === 'Resolved' ? 'opacity-50 hover:opacity-75' : 'hover:bg-brand-700/70';
    return (
        <div onClick={onSelect} className={`flex items-center p-3 rounded-lg cursor-pointer border-l-4 transition-all ${itemClasses} ${isActive && alert.status !== 'Resolved' ? 'bg-brand-700 border-accent' : 'border-transparent'}`}>
            <span className={`h-3 w-3 rounded-full ${statusInfo} mr-3 flex-shrink-0`}></span>
            <div className="flex-1">
                <p className={`font-semibold ${alert.status === 'Resolved' ? 'text-brand-400' : 'text-white'}`}>{alert.type}</p>
                <p className="text-sm text-brand-400">{alert.cameraName}</p>
            </div>
            <time className="text-xs text-brand-400">{new Date(alert.createdAt).toLocaleTimeString()}</time>
        </div>
    );
}

export default AlertsOnlyPage;