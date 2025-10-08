import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LogOut, ChevronDown, ChevronRight, Send, PanelLeftClose, PanelRightClose, Video, Grid3x3, LayoutGrid, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

// --- Helper Functions & Constants ---
const getWsUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const url = new URL(apiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}`;
};

// Main Dashboard Component
function DispatcherDashboard() {
    const { user, logout } = useAuth();
    const [monitoredDevices, setMonitoredDevices] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeAlert, setActiveAlert] = useState(null);
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
    
    useEffect(() => {
        viewModeRef.current = viewMode;
    }, [viewMode]);

    const monitoredDevicesRef = useRef(monitoredDevices);
    useEffect(() => {
        monitoredDevicesRef.current = monitoredDevices;
    }, [monitoredDevices]);

    // Function to play a simple alert sound
    const playAlertSound = () => {
        if (!audioContextRef.current) {
            try { audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { console.error("AudioContext not supported.", e); return; }
        }
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, audioContextRef.current.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContextRef.current.currentTime);
        oscillator.start(audioContextRef.current.currentTime);
        oscillator.stop(audioContextRef.current.currentTime + 0.5);
    };
    
    // Adapts the alert format from the server for frontend use
    const adaptServerAlert = (serverAlert) => {
        const turingData = serverAlert.originalData;
        let snapshotUrl = `https://placehold.co/600x400/111827/9CA3AF?text=No+Snapshot`;
        if (turingData.mediums?.find(m => m.name === 'snapshot')?.files?.[0]?.url) {
            snapshotUrl = turingData.mediums.find(m => m.name === 'snapshot').files[0].url;
        }
        return { ...serverAlert, id: serverAlert._id, type: turingData.event_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Event', cameraName: turingData.camera?.name || 'Unknown Camera', cameraId: turingData.camera?.id, snapshotUrl: snapshotUrl };
    };

    // Helper to find a camera by its ID across all sites
    const findCameraById = (cameraId) => {
        for (const site of monitoredDevicesRef.current) {
            const camera = site.cameras.find(c => c.id === cameraId);
            if (camera) return { camera, site };
        }
        return { camera: null, site: null };
    };

    // Handlers for changing the view mode
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
        setActiveAlert(alert);
        setIsModalOpen(true);
        const { camera, site } = findCameraById(alert.cameraId);
        if (camera && site) handleFocusCamera(camera, site);
    };

    // Effect for handling the alert WebSocket connection
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const wsUrl = getWsUrl();
        const socket = new WebSocket(`${wsUrl}?token=${token}`);
        socketRef.current = socket;

        socket.onopen = () => setConnectionStatus('Connected');
        socket.onclose = () => setConnectionStatus('Disconnected');
        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            setConnectionStatus('Error');
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const adaptedAlert = adaptServerAlert(message.alert);
            
            if (message.type === 'new_alert') {
                setAlerts(prev => prev.some(a => a.id === adaptedAlert.id) ? prev : [adaptedAlert, ...prev]);
                setActiveAlert(adaptedAlert);
                setIsModalOpen(true);
                playAlertSound();
                if (viewModeRef.current === 'videoWall') {
                    setAlertingCameraId(adaptedAlert.cameraId);
                    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
                    alertTimeoutRef.current = setTimeout(() => setAlertingCameraId(null), 10000);
                } else {
                    const { camera, site } = findCameraById(adaptedAlert.cameraId);
                    if (camera && site) handleFocusCamera(camera, site);
                }
            } else if (message.type === 'update_alert') {
                setAlerts(prev => prev.map(a => a.id === adaptedAlert.id ? adaptedAlert : a));
                setActiveAlert(current => current?.id === adaptedAlert.id ? adaptedAlert : current);
            }
        };
        
        return () => {
            console.log("Running WebSocket cleanup for connection:", socket.url);
            socket.close(); // Close the specific socket instance from this effect.
            if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
        };
    }, []);

    // --- MODIFIED ---
    // Effect for fetching initial monitored devices
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.getMonitoredDevices();
                // Defensively set the state to ensure it's always an array
                if (Array.isArray(response.data)) {
                    setMonitoredDevices(response.data);
                } else {
                    console.error("API did not return an array for monitored devices:", response.data);
                    setMonitoredDevices([]); // Default to empty array on malformed response
                }
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                setMonitoredDevices([]); // Also default to empty array on any thrown error
            }
        };
        fetchInitialData();
    }, []);

    // Functions to interact with the API for alerts
    const handleUpdateStatus = async (status) => {
        if (!activeAlert) return;
        try {
            await api.updateAlertStatus(activeAlert.id, status);
            if (status === 'Resolved') {
                setIsModalOpen(false);
                setActiveAlert(null);
            }
        } catch (error) {
            console.error(`Failed to update alert status to ${status}:`, error);
        }
    };

    const handleAddNote = async (noteText) => {
        if (!activeAlert || !noteText.trim()) return;
        try {
            const { data } = await api.addNoteToAlert(activeAlert.id, noteText);
            const adaptedAlert = adaptServerAlert(data.alert);
            setAlerts(prevAlerts => prevAlerts.map(a => a.id === adaptedAlert.id ? adaptedAlert : a));
            setActiveAlert(adaptedAlert);
        } catch (error) {
            console.error("Failed to add note:", error);
        }
    };

    const toggleSite = (siteId) => {
        setOpenSites(prev => ({ ...prev, [siteId]: !prev[siteId] }));
    };

    // Main JSX for the dashboard layout
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
                
                <div className="flex-1 p-4 flex flex-col items-center justify-center bg-black">
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
                                {monitoredDevices.flatMap(site =>
                                    site.cameras.map(cam => (
                                        <CameraView key={cam.id} camera={cam} siteName={site.name} isFocused={false} isAlerting={cam.id === alertingCameraId} />
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                    {!focusedCamera && !gridSite && viewMode !== 'videoWall' && (
                        <div className="text-center text-gray-500"><p>Select a camera or a site grid to view live feeds.</p></div>
                    )}
                </div>
                
                {isAlertLogVisible && (
                    <div className="w-1/4 flex flex-col border-l border-gray-700 max-w-sm">
                        <div className="p-4 border-b border-gray-700 bg-gray-800"><h2 className="text-lg font-semibold">Real-time Event Log</h2></div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-900">
                            {alerts.map(alert => <AlertItem key={alert.id} alert={alert} onSelect={() => handleAlertSelect(alert)} isActive={activeAlert?.id === alert.id} />)}
                        </div>
                    </div>
                )}
            </main>
            
            {isModalOpen && activeAlert && <AlertModal alert={activeAlert} onClose={() => setIsModalOpen(false)} onAcknowledge={() => handleUpdateStatus('Acknowledged')} onResolve={() => handleUpdateStatus('Resolved')} onAddNote={handleAddNote}/>}
        </div>
    );
}

// Component to display the video stream using WebRTC
function CameraView({ camera, isFocused, siteName, isAlerting }) {
    const videoRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryAttempt, setRetryAttempt] = useState(0);
    const retryTimeoutRef = useRef(null);
    
    const restartStream = () => {
        setRetryAttempt(prev => prev + 1);
    };

    useEffect(() => {
        let pc; // RTCPeerConnection
        let isMounted = true;
        const videoElement = videoRef.current;
        const pathName = `camera_${camera.id}`;

        const cleanup = () => {
            isMounted = false;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            if (pc) {
                pc.onconnectionstatechange = null;
                pc.ontrack = null;
                pc.close();
            }
            if (videoElement) {
                videoElement.srcObject = null;
            }
        };

        const startStream = async () => {
            if (!videoElement) return;

            cleanup();
            isMounted = true;
            setIsLoading(true);
            setError(null);
            
            const startTime = performance.now();
            console.log(`[${camera.name}] Attempting to start stream (Attempt: ${retryAttempt + 1})...`);
            
            try {
                const rtspRes = await api.getRtspUrl(camera.id);
                if (!isMounted || !rtspRes.data.ret.play_url) {
                    throw new Error("RTSP URL not provided by API.");
                }
                const rtspUrl = rtspRes.data.ret.play_url;

                await api.startMediaMTXStream(pathName, rtspUrl);

                pc = new RTCPeerConnection();

                pc.ontrack = (event) => {
                    if (videoElement.srcObject !== event.streams[0]) {
                        videoElement.srcObject = event.streams[0];
                    }
                };
                
                pc.onconnectionstatechange = () => {
                    if (!isMounted || !pc) return;
                    console.log(`[${camera.name}] WebRTC Connection State: ${pc.connectionState}`);

                    if (pc.connectionState === 'connected') {
                        const endTime = performance.now();
                        const loadTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
                        console.log(`[${camera.name}] WebRTC connection established in ${loadTimeInSeconds} seconds.`);
                        setIsLoading(false);
                    } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                        console.log(`[${camera.name}] Stream disconnected. Scheduling retry...`);
                        setError('Stream interrupted. Retrying...');
                        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                        retryTimeoutRef.current = setTimeout(() => {
                            if (isMounted) {
                                setRetryAttempt(prev => prev + 1);
                            }
                        }, 5000); // Retry after 5 seconds
                    }
                };

                pc.addTransceiver('video', { 'direction': 'recvonly' });
                pc.addTransceiver('audio', { 'direction': 'recvonly' });

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const answerSdp = await api.startWhepsession(pathName, pc.localDescription.sdp);
                
                await pc.setRemoteDescription({
                    type: 'answer',
                    sdp: answerSdp,
                });
                
            } catch (err) {
                console.error(`[${camera.name}] Failed to start WebRTC stream:`, err);
                if (isMounted) {
                    const errorMessage = err.response?.data?.message || 'Could not load camera feed.';
                    setError(errorMessage);
                    setIsLoading(false);
                }
            }
        };

        startStream();

        return cleanup;
    }, [camera.id, retryAttempt]);

    const borderClass = isAlerting ? 'ring-4 ring-red-500 animate-pulse' : 'ring-1 ring-gray-700';
    const containerClasses = isFocused 
        ? "w-full h-full bg-black flex flex-col items-center justify-center" 
        : `w-full h-full bg-black rounded-lg flex flex-col items-center justify-center relative overflow-hidden ${borderClass}`;
    
    const videoClasses = "w-full h-full object-contain";
    const cameraDisplayName = siteName ? `${siteName} - ${camera.name}` : camera.name;

    return (
        <div className={containerClasses}>
            <div className={`w-full flex-1 relative ${isFocused ? 'h-full' : 'aspect-video'} flex items-center justify-center`}>
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-50">
                        <Loader2 className="animate-spin h-8 w-8 mb-2" />
                        <span>Loading...</span>
                    </div>
                )}
                {error && !isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-50 p-2">
                        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                        <span className="text-center text-sm">{error}</span>
                        <button onClick={restartStream} className="mt-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-xs flex items-center">
                            <RefreshCw size={12} className="mr-1" />
                            Retry Now
                        </button>
                    </div>
                )}
                <video ref={videoRef} className={videoClasses} style={{ display: isLoading || error ? 'none' : 'block' }} autoPlay muted playsInline></video>
                {!isFocused && (
                    <div className="absolute bottom-0 left-0 w-full p-2 bg-black bg-opacity-50">
                        <p className="text-white text-xs truncate">{cameraDisplayName}</p>
                    </div>
                )}
            </div>
             {isFocused && <h3 className="text-lg font-semibold mt-2 text-white">{cameraDisplayName}</h3>}
        </div>
    );
}

// Sub-components for Alerts
function AlertItem({ alert, onSelect, isActive }) {
    const statusInfo = { 'New': 'bg-red-500', 'Acknowledged': 'bg-yellow-500', 'Resolved': 'bg-gray-600' }[alert.status] || 'bg-gray-500';
    return (
        <div onClick={onSelect} className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-700/70 border-l-4 ${isActive ? 'bg-gray-700 border-blue-500' : 'border-transparent'}`}>
            <span className={`h-3 w-3 rounded-full ${statusInfo} mr-3 flex-shrink-0`}></span>
            <div className="flex-1"><p className="font-semibold">{alert.type}</p><p className="text-sm text-gray-400">{alert.cameraName}</p></div>
            <time className="text-xs text-gray-500">{new Date(alert.createdAt).toLocaleTimeString()}</time>
        </div>
    );
}

function AlertModal({ alert, onClose, onAcknowledge, onResolve, onAddNote }) {
    const [noteText, setNoteText] = useState('');
    const notesEndRef = useRef(null);
    useEffect(() => { notesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [alert.notes]);
    const handleAddNote = () => { onAddNote(noteText); setNoteText(''); };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-700"><div className="flex justify-between items-start"><h2 className="text-2xl font-bold text-white">{alert.type} Alert</h2><button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button></div></div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-2/3 p-6 flex flex-col">
                        <p className="text-sm text-gray-400">Event Snapshot</p>
                        <img src={alert.snapshotUrl} alt="Event snapshot" className="mt-2 rounded-lg w-full aspect-video object-cover bg-black" />
                        <div className="flex-1 flex flex-col mt-4">
                            <h3 className="text-lg font-semibold mb-2">Dispatcher Notes</h3>
                            <div className="bg-gray-900/50 rounded-lg p-3 flex-1 overflow-y-auto space-y-3">
                                {(alert.notes || []).map((note, index) => (
                                    <div key={index} className="text-sm"><p className="text-gray-300">{note.text}</p><p className="text-xs text-gray-500 text-right">- {note.username} at {new Date(note.timestamp).toLocaleTimeString()}</p></div>
                                ))}
                                <div ref={notesEndRef} />
                            </div>
                            <div className="mt-3 flex space-x-2">
                                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a new note..." rows="2" className="flex-1 bg-gray-700 border-gray-600 rounded-md text-white text-sm"></textarea>
                                <button onClick={handleAddNote} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 self-end"><Send size={16}/></button>
                            </div>
                        </div>
                    </div>
                    <div className="w-1/3 p-6 border-l border-gray-700 flex flex-col space-y-4">
                        <div>
                            <p className="text-sm text-gray-400">Site Details</p>
                            <div className="mt-2 p-4 bg-gray-700/50 rounded-lg">
                                <ul className="space-y-2 text-gray-300">
                                    <li><strong>Site:</strong> {alert.siteProfile.name}</li>
                                    <li><strong>Account #:</strong> {alert.siteProfile.account_number || 'N/A'}</li>
                                    <li><strong>District:</strong> {alert.siteProfile.district || 'N/A'}</li>
                                    <li><strong>Camera:</strong> {alert.cameraName}</li>
                                    <li><strong>Time:</strong> {new Date(alert.createdAt).toLocaleString()}</li>
                                    <li><strong>Status:</strong> <span className="font-semibold">{alert.status}</span></li>
                                </ul>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Pertinent Information</p>
                            <div className="mt-2 p-4 bg-gray-700/50 rounded-lg h-24 overflow-y-auto">
                                <p className="text-sm text-gray-300">{alert.siteProfile.pertinent_info || 'No information provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-700/50 px-6 py-4 flex justify-end space-x-4 rounded-b-lg">
                    <button onClick={onAcknowledge} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 disabled:bg-yellow-800" disabled={alert.status !== 'New'}>Acknowledge</button>
                    <button onClick={onResolve} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600">Resolve</button>
                </div>
            </div>
        </div>
    );
}

export default DispatcherDashboard;