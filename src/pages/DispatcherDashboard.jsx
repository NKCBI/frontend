import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LogOut, ChevronDown, ChevronRight, PanelLeftClose, PanelRightClose, Video, Grid3x3, LayoutGrid, X } from 'lucide-react';
import IncidentModal from './IncidentModal.jsx';
import CameraView from '../components/CameraView.jsx';

// --- Helper Functions & Constants ---
const getWsUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const url = new URL(apiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}`;
};
const SESSION_KEY = 'vms_dispatch_session';
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// Main Dashboard Component
function DispatcherDashboard() {
    // --- STATE REFACTOR: Use global state from AuthContext ---
    const { user, logout, alerts, setAlerts } = useAuth();
    
    const [monitoredDevices, setMonitoredDevices] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [viewingSiteId, setViewingSiteId] = useState(null);
    const [openSites, setOpenSites] = useState({});
    const [isSiteListVisible, setIsSiteListVisible] = useState(true);
    const [isAlertLogVisible, setIsAlertLogVisible] = useState(true);
    const [viewMode, setViewMode] = useState('focus');
    const [focusedCamera, setFocusedCamera] = useState(null);
    const [gridSite, setGridSite] = useState(null);
    const [alertingCameraId, setAlertingCameraId] = useState(null);

    const audioContextRef = useRef(null);
    const socketRef = useRef(null);
    const alertTimeoutRef = useRef(null);
    const viewModeRef = useRef(viewMode);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const modalCloseTimeoutRef = useRef(null);
    
    useEffect(() => {
        viewModeRef.current = viewMode;
    }, [viewMode]);

    const monitoredDevicesRef = useRef(monitoredDevices);
    useEffect(() => {
        monitoredDevicesRef.current = monitoredDevices;
    }, [monitoredDevices]);

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
    
    const adaptServerAlert = (serverAlert) => {
        const turingData = serverAlert.originalData;
        let snapshotUrl = `https://placehold.co/600x400/111827/9CA3AF?text=No+Snapshot`;
        if (turingData.mediums?.find(m => m.name === 'snapshot')?.files?.[0]?.url) {
            snapshotUrl = turingData.mediums.find(m => m.name === 'snapshot').files[0].url;
        }
        return { ...serverAlert, id: serverAlert._id, type: turingData.event_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Event', cameraName: turingData.camera?.name || 'Unknown Camera', cameraId: turingData.camera?.id, snapshotUrl: snapshotUrl };
    };

    const findCameraById = (cameraId) => {
        for (const site of monitoredDevicesRef.current) {
            const camera = site.cameras.find(c => c.id === cameraId);
            if (camera) return { camera, site };
        }
        return { camera: null, site: null };
    };

    const handleFocusCamera = (cameraToFocus, site) => {
        if (!cameraToFocus) return;
        setViewMode('focus');
        setGridSite(null);
        setFocusedCamera({ ...cameraToFocus, siteName: site.name });
        if (site) {
            setOpenSites(prev => ({ ...prev, [site._id]: true }));
        }
    };

    const handleShowGrid = (site) => {
        setViewMode('grid');
        setGridSite(site);
        setFocusedCamera(null);
    };
    
    const handleVideoWall = () => {
        setViewMode('videoWall');
        setGridSite(null);
        setFocusedCamera(null);
    };

    const handleAlertSelect = (alert) => {
        if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
        setViewingSiteId(alert.siteProfile._id);
        const { camera, site } = findCameraById(alert.cameraId);
        if (camera && site) handleFocusCamera(camera, site);
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
                    if (!viewingSiteId) setViewingSiteId(adaptedAlert.siteProfile._id);
                    else if (viewingSiteId === adaptedAlert.siteProfile._id && modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
                    if (viewModeRef.current === 'videoWall') {
                        setAlertingCameraId(adaptedAlert.cameraId);
                        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
                        alertTimeoutRef.current = setTimeout(() => setAlertingCameraId(null), 10000);
                    } else if (!viewingSiteId) {
                        const { camera, site } = findCameraById(adaptedAlert.cameraId);
                        if (camera && site) handleFocusCamera(camera, site);
                    }
                } else if (message.type === 'update_alert') {
                    const adaptedAlert = adaptServerAlert(message.alert);
                    setAlerts(prev => prev.map(a => a.id === adaptedAlert.id ? adaptedAlert : a));
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
            if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
            if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewingSiteId, setAlerts]); // Use setAlerts from context

    // --- SESSION RESTORE LOGIC ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // First, fetch the device list, which is always needed.
                const { data: devicesData } = await api.getMonitoredDevices();
                if(Array.isArray(devicesData)) setMonitoredDevices(devicesData);

                // Then, check for a saved session.
                const savedSessionJSON = localStorage.getItem(SESSION_KEY);
                if (savedSessionJSON) {
                    const savedSession = JSON.parse(savedSessionJSON);
                    const isSessionValid = user && savedSession.username === user.username && (Date.now() - savedSession.timestamp < SESSION_TIMEOUT);
                    
                    if (isSessionValid) {
                        console.log("Restoring previous session state.");
                        setAlerts(savedSession.alerts);
                        localStorage.removeItem(SESSION_KEY); // Clear after restoring
                        return; // Stop here, don't fetch from API
                    }
                }
                
                // If no valid session, fetch fresh data from the API.
                console.log("No valid session found. Fetching fresh alert data.");
                const { data: activeAlertsData } = await api.getActiveAlerts();
                if (Array.isArray(activeAlertsData)) {
                    setAlerts(activeAlertsData.map(adaptServerAlert));
                }

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                setMonitoredDevices([]);
            }
        };
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, setAlerts]); // Dependency on user and setAlerts from context

    const handleUpdateStatus = async (alert, status) => {
        if (!alert) return;
        try {
            await api.updateAlertStatus(alert.id, status);
        } catch (error) {
            console.error(`Failed to update alert status to ${status}:`, error);
        }
    };

    const handleAddNote = async (alert, noteText) => {
        if (!alert || !noteText.trim()) return;
        try {
            await api.addNoteToAlert(alert.id, noteText);
        } catch (error) {
            console.error("Failed to add note:", error);
        }
    };
    
    const alertsForViewingSite = viewingSiteId ? alerts.filter(a => a.siteProfile._id === viewingSiteId) : [];
        
    useEffect(() => {
        if (viewingSiteId && alertsForViewingSite.length > 0) {
            const allResolved = alertsForViewingSite.every(a => a.status === 'Resolved');
            if (allResolved) {
                modalCloseTimeoutRef.current = setTimeout(() => setViewingSiteId(null), 1500);
            }
        }
        return () => { if (modalCloseTimeoutRef.current) clearTimeout(modalCloseTimeoutRef.current); }
    }, [alertsForViewingSite, viewingSiteId]);

    const handleAcknowledgeAll = async () => {
        const alertsToAck = alertsForViewingSite.filter(a => a.status === 'New');
        const promises = alertsToAck.map(alert => api.updateAlertStatus(alert.id, 'Acknowledged'));
        try { await Promise.all(promises); } 
        catch (error) { console.error("Failed to acknowledge all alerts:", error); }
    };

    const handleResolveIncident = async () => {
        const alertsToResolve = alertsForViewingSite.filter(a => a.status !== 'Resolved');
        const promises = alertsToResolve.map(alert => api.updateAlertStatus(alert.id, 'Resolved'));
        try { await Promise.all(promises); } 
        catch (error) { console.error("Failed to resolve incident:", error); }
    };

    const toggleSite = (siteId) => setOpenSites(prev => ({ ...prev, [siteId]: !prev[siteId] }));
    const viewingSiteName = alertsForViewingSite[0]?.siteProfile?.name || 'Incident';
    const recentAlerts = alerts.slice(0, 50);

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
            <header className="bg-gray-800 border-b border-gray-700 shadow-md">
                 <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setIsSiteListVisible(!isSiteListVisible)} title="Toggle Site List" className="p-2 text-gray-400 hover:text-white"><PanelLeftClose /></button>
                            <h1 className="text-2xl font-bold tracking-tight text-white">Dispatch Dashboard</h1>
                            <button onClick={handleVideoWall} title="Global Video Wall" className="p-2 text-gray-400 hover:text-white"><LayoutGrid /></button>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <span className={`relative flex h-3 w-3 ${connectionStatus === 'Connected' ? '' : 'animate-pulse'}`}>
                                    <span className={`absolute inline-flex h-full w-full rounded-full ${connectionStatus === 'Connected' ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                </span>
                                <span className="text-gray-400 text-sm">{connectionStatus}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-gray-300">Welcome, {user?.username}</span>
                                <button onClick={logout} title="Logout" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"><LogOut size={20} /></button>
                            </div>
                            <button onClick={() => setIsAlertLogVisible(!isAlertLogVisible)} title="Toggle Event Log" className="p-2 text-gray-400 hover:text-white"><PanelRightClose /></button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                {isSiteListVisible && (
                    <div className="w-1/4 flex flex-col border-r border-gray-700 max-w-xs">
                        <div className="p-4 border-b border-gray-700 bg-gray-800"><h2 className="text-lg font-semibold">Sites & Cameras</h2></div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-900">
                            {monitoredDevices.map(site => (
                                <div key={site._id} className="bg-gray-800 rounded-lg">
                                    <div className="w-full flex justify-between items-center p-3 text-left">
                                        <button onClick={() => toggleSite(site._id)} className="flex items-center flex-1">
                                            {openSites[site._id] ? <ChevronDown size={18} className="mr-2" /> : <ChevronRight size={18} className="mr-2" />}
                                            <h3 className="font-semibold text-blue-300">{site.name}</h3>
                                        </button>
                                        <button onClick={() => handleShowGrid(site)} title="Show site grid view" className="p-1 text-gray-400 hover:text-white"><Grid3x3 size={18} /></button>
                                    </div>
                                    {openSites[site._id] && (
                                        <div className="border-t border-gray-700 p-2"><div className="space-y-1">
                                            {site.cameras.map(camera => (<button key={camera.id} onClick={() => handleFocusCamera(camera, site)} className={`w-full text-left p-2 rounded text-sm hover:bg-gray-700 transition-colors ${focusedCamera?.id === camera.id && viewMode === 'focus' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>{camera.name}</button>))}
                                        </div></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex-1 p-4 flex flex-col items-center justify-center bg-black relative">
                    {(focusedCamera || gridSite) && (<button onClick={() => { setFocusedCamera(null); setGridSite(null); }} className="absolute top-6 right-6 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/80" title="Close View"><X size={24} /></button>)}
                    {viewMode === 'focus' && focusedCamera && <CameraView key={focusedCamera.id} camera={focusedCamera} isFocused={true} />}
                    {viewMode === 'grid' && gridSite && (
                        <div className="w-full h-full">
                            <h2 className="text-xl font-semibold text-white mb-4 text-center">{gridSite.name} - Grid View</h2>
                            <div className={`w-full h-full grid gap-2 ${gridSite.cameras.length > 4 ? 'grid-cols-3' : 'grid-cols-2'} ${gridSite.cameras.length > 9 ? 'grid-cols-4' : ''}`}>
                                {gridSite.cameras.map(cam => <CameraView key={cam.id} camera={cam} siteName={gridSite.name} isFocused={false}/>)}
                            </div>
                        </div>
                    )}
                    {viewMode === 'videoWall' && (
                        <div className="w-full h-full flex flex-col">
                             <h2 className="text-xl font-semibold text-white mb-4 text-center">Global Video Wall</h2>
                             <div className={`w-full flex-1 grid gap-2 grid-cols-4`}>
                                {monitoredDevices.flatMap(site => site.cameras.map(cam => (<CameraView key={cam.id} camera={cam} siteName={site.name} isFocused={false} isAlerting={cam.id === alertingCameraId} />)))}
                            </div>
                        </div>
                    )}
                    {!focusedCamera && !gridSite && viewMode !== 'videoWall' && (
                        <div className="text-center text-gray-500">
                             <Video size={48} className="mx-auto mb-4" />
                            <h2 className="text-2xl text-gray-300 font-semibold">Live View</h2>
                            <p className="mt-2">Select a camera or site to begin viewing.</p>
                        </div>
                    )}
                </div>
                
                {isAlertLogVisible && (
                    <div className="w-1/4 flex flex-col border-l border-gray-700 max-w-sm">
                        <div className="p-4 border-b border-gray-700 bg-gray-800"><h2 className="text-lg font-semibold">Real-time Event Log</h2></div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-900">
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
    const statusInfo = { 'New': 'bg-red-500', 'Acknowledged': 'bg-yellow-500', 'Resolved': 'bg-gray-600' }[alert.status] || 'bg-gray-500';
    const itemClasses = alert.status === 'Resolved' ? 'opacity-50 hover:opacity-75' : 'hover:bg-gray-700/70';
    return (
        <div onClick={onSelect} className={`flex items-center p-3 rounded-lg cursor-pointer border-l-4 transition-all ${itemClasses} ${isActive && alert.status !== 'Resolved' ? 'bg-gray-700 border-blue-500' : 'border-transparent'}`}>
            <span className={`h-3 w-3 rounded-full ${statusInfo} mr-3 flex-shrink-0`}></span>
            <div className="flex-1">
                <p className={`font-semibold ${alert.status === 'Resolved' ? 'text-gray-400' : 'text-white'}`}>{alert.type}</p>
                <p className="text-sm text-gray-400">{alert.cameraName}</p>
            </div>
            <time className="text-xs text-gray-500">{new Date(alert.createdAt).toLocaleTimeString()}</time>
        </div>
    );
}

export default DispatcherDashboard;