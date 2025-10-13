import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Pen, Save, X, Moon, Sun } from 'lucide-react'; // Added Sun icon
import { api } from '../api';

function DeviceManagementPage() {
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openSites, setOpenSites] = useState({});
    
    const [editingSite, setEditingSite] = useState(null);
    const [sleepingCamera, setSleepingCamera] = useState(null);

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

    const handleMonitorAllToggle = async (siteId, newStatus) => {
        try {
            await api.updateSiteMonitorStatus(siteId, newStatus);
            setDevices(prevDevices => prevDevices.map(s =>
                s._id === siteId
                ? { ...s, cameras: s.cameras.map(c => ({...c, isMonitored: newStatus})) }
                : s
            ));
        } catch (error) {
            console.error("Failed to update all cameras for site:", error);
        }
    };

    const handleSaveSite = async (siteToSave) => {
        try {
            await api.updateSiteProfile(siteToSave._id, siteToSave);
            setEditingSite(null);
            loadDevices();
        } catch (error) {
            console.error("Failed to save site:", error);
            alert("Error saving site profile.");
        }
    };

    const handleSleepCamera = async (cameraId, hours) => {
        try {
            await api.putCameraToSleep(cameraId, hours);
            setSleepingCamera(null);
            loadDevices();
        } catch (error) {
            console.error("Failed to put camera to sleep:", error);
            alert("Error putting camera to sleep.");
        }
    };

    // --- NEW HANDLER for waking a camera up ---
    const handleWakeUpCamera = async (cameraId) => {
        try {
            await api.wakeUpCamera(cameraId);
            loadDevices(); // Reload data to show the updated status
        } catch (error) {
            console.error("Failed to wake up camera:", error);
            alert("Error waking up camera.");
        }
    };

    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">Device & Site Management</h1>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <p className="text-gray-400 mb-6">Manage site profiles and control monitoring status for all cameras detected from the Turing API.</p>
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
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => setEditingSite(site)} className="flex items-center px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                                                <Pen size={14} className="mr-2"/> Edit Profile
                                            </button>
                                            <div className="flex items-center space-x-2">
                                                <label className="text-sm text-gray-300">Monitor All</label>
                                                <input type="checkbox" checked={allMonitored} onChange={(e) => handleMonitorAllToggle(site._id, e.target.checked)} className="h-4 w-4 rounded bg-gray-900 border-gray-600 text-blue-600 focus:ring-blue-500"/>
                                            </div>
                                        </div>
                                    </div>
                                    {openSites[site._id] && (
                                        <div className="border-t border-gray-600 p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {site.cameras.map(camera => {
                                                    const isSleeping = camera.isSleeping && new Date(camera.sleepExpiresAt) > new Date();
                                                    return (
                                                        <div key={camera.id} className={`p-3 rounded-md flex justify-between items-center ${isSleeping ? 'bg-indigo-900/50' : 'bg-gray-800'}`}>
                                                            <div>
                                                                <span className="text-sm">{camera.name}</span>
                                                                {isSleeping && (
                                                                    <p className="text-xs text-indigo-300">
                                                                        Sleeping until {new Date(camera.sleepExpiresAt).toLocaleTimeString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center space-x-3">
                                                                {/* --- NEW CONDITIONAL BUTTON --- */}
                                                                {isSleeping ? (
                                                                    <button onClick={() => handleWakeUpCamera(camera.id)} className="p-1 text-yellow-400 hover:text-yellow-300" title="Wake up camera">
                                                                        <Sun size={16} />
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => setSleepingCamera(camera)} className="p-1 text-gray-400 hover:text-white" title="Put camera to sleep">
                                                                        <Moon size={16} />
                                                                    </button>
                                                                )}
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" checked={camera.isMonitored} onChange={() => handleMonitorToggle(camera.id, camera.isMonitored)} className="sr-only peer" />
                                                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {editingSite && ( <SiteEditModal site={editingSite} onClose={() => setEditingSite(null)} onSave={handleSaveSite} /> )}
            {sleepingCamera && ( <CameraSleepModal camera={sleepingCamera} onClose={() => setSleepingCamera(null)} onConfirm={handleSleepCamera} /> )}
        </div>
    );
}

function CameraSleepModal({ camera, onClose, onConfirm }) {
    const [hours, setHours] = useState(1);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Put Camera to Sleep</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-300">Temporarily pause monitoring for <span className="font-semibold text-white">{camera.name}</span>.</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Duration (in hours)</label>
                        <input type="number" min="1" value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-full bg-gray-700 border-gray-600 rounded-md text-white"/>
                    </div>
                </div>
                <div className="bg-gray-700/50 px-6 py-4 flex justify-end space-x-3">
                   <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">Cancel</button>
                   <button onClick={() => onConfirm(camera.id, hours)} className="flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500">
                        <Moon size={16} className="mr-2"/> Confirm Sleep
                   </button>
                </div>
            </div>
        </div>
    );
}

function SiteEditModal({ site, onClose, onSave }) {
    const [formData, setFormData] = useState(site);
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Edit Site: {site.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Account Number</label>
                        <input name="account_number" value={formData.account_number || ''} onChange={handleChange} className="w-full bg-gray-700 border-gray-600 rounded-md text-white"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">District</label>
                        <input name="district" value={formData.district || ''} onChange={handleChange} className="w-full bg-gray-700 border-gray-600 rounded-md text-white"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Pertinent Information</label>
                        <textarea name="pertinent_info" value={formData.pertinent_info || ''} onChange={handleChange} rows="4" className="w-full bg-gray-700 border-gray-600 rounded-md text-white"></textarea>
                    </div>
                </div>
                <div className="bg-gray-700/50 px-6 py-4 flex justify-end">
                   <button onClick={() => onSave(formData)} className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                        <Save size={16} className="mr-2"/> Save Changes
                   </button>
                </div>
            </div>
        </div>
    );
}

export default DeviceManagementPage;