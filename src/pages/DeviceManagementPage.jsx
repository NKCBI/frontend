import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../api';

function DeviceManagementPage() {
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openSites, setOpenSites] = useState({});

    const loadDevices = async () => {
        setIsLoading(true);
        try {
            const { data: devicesData } = await api.getDevices();
            setDevices(devicesData);
        } catch (error) {
            console.error("Failed to load devices:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDevices();
    }, []);

    const toggleSite = (siteId) => {
        setOpenSites(prev => ({ ...prev, [siteId]: !prev[siteId] }));
    };

    const handleMonitorToggle = async (cameraId, currentStatus) => {
        // --- LOGGING ADDED ---
        console.log(`[FRONTEND] handleMonitorToggle called. Camera ID: ${cameraId}, Current Status: ${currentStatus}. Sending NEW status: ${!currentStatus}`);
        try {
            await api.updateCameraMonitorStatus(cameraId, !currentStatus);
            setDevices(prevDevices => prevDevices.map(site => ({
                ...site,
                cameras: site.cameras.map(camera =>
                    camera.id === cameraId ? { ...camera, isMonitored: !currentStatus } : camera
                )
            })));
        } catch (error) {
            console.error("Failed to update monitor status:", error);
            alert("Error updating camera status. Please refresh.");
        }
    };

    const handleMonitorAllToggle = async (site, newStatus) => {
        try {
            await api.updateSiteMonitorStatus(site._id, newStatus);
            setDevices(prevDevices => prevDevices.map(s =>
                s._id === site._id
                ? { ...s, cameras: s.cameras.map(c => ({...c, isMonitored: newStatus})) }
                : s
            ));
        } catch (error) {
            console.error("Failed to update all cameras for site:", error);
        }
    };

    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">Device Management (Master Roster)</h1>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <p className="text-gray-400 mb-6">This is the master list of all sites and cameras detected from the Turing API. Use the toggles to select which cameras should be actively monitored by the dispatch system.</p>
                {isLoading ? <p>Loading devices...</p> : (
                    <div className="space-y-2">
                        {devices.map(site => {
                            const allMonitored = site.cameras.length > 0 && site.cameras.every(c => c.isMonitored);
                            return (
                                <div key={site._id} className="bg-gray-700/60 rounded-lg">
                                    <div className="w-full flex justify-between items-center p-4 text-left">
                                        <button onClick={() => toggleSite(site._id)} className="flex items-center flex-1">
                                            {openSites[site._id] ? <ChevronDown size={20} className="mr-3" /> : <ChevronRight size={20} className="mr-3" />}
                                            <p className="font-semibold text-lg">{site.name || `Site ID: ${site._id}`}</p>
                                            {!site.isConfigured && (
                                                <span className="ml-4 text-xs bg-yellow-600 text-white font-bold py-1 px-2 rounded-full">Needs Configuration</span>
                                            )}
                                        </button>
                                        <div className="flex items-center space-x-2">
                                            <label className="text-sm text-gray-300">Monitor All</label>
                                            <input type="checkbox" checked={allMonitored} onChange={(e) => handleMonitorAllToggle(site, e.target.checked)} className="h-4 w-4 rounded bg-gray-900 border-gray-600 text-blue-600 focus:ring-blue-500"/>
                                        </div>
                                    </div>
                                    {openSites[site._id] && (
                                        <div className="border-t border-gray-600 p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {site.cameras.map(camera => (
                                                    <div key={camera.id} className="bg-gray-800 p-3 rounded-md flex justify-between items-center">
                                                        <span className="text-sm">{camera.name}</span>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" checked={camera.isMonitored} onChange={() => handleMonitorToggle(camera.id, camera.isMonitored)} className="sr-only peer" />
                                                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DeviceManagementPage;