import React, { useState, useEffect } from 'react';
import { api } from '../api';

function EventHistoryPage() {
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', siteId: '' });
    const [sites, setSites] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
            const { data: historicalAlerts } = await api.getHistoricalAlerts(cleanFilters);
            setAlerts(historicalAlerts);
        } catch (error) {
            console.error("Failed to search alerts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const { data: sitesData } = await api.getDevices();
                setSites(sitesData);
                handleSearch();
            } catch (error) {
                console.error("Failed to load initial data for event history:", error);
            }
        };
        loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };
    
    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">Event History</h1>
            
            <div className="bg-brand-800 p-6 rounded-lg shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                    <div>
                        <label className="text-sm text-brand-400">Start Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full bg-brand-700 border-brand-600 rounded-md mt-1 text-white"/>
                    </div>
                    <div>
                        <label className="text-sm text-brand-400">End Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full bg-brand-700 border-brand-600 rounded-md mt-1 text-white"/>
                    </div>
                    <div>
                        <label className="text-sm text-brand-400">Site</label>
                        <select name="siteId" value={filters.siteId} onChange={handleFilterChange} className="w-full bg-brand-700 border-brand-600 rounded-md mt-1 text-white">
                            <option value="">All Sites</option>
                            {sites.map(site => <option key={site._id} value={site._id}>{site.name}</option>)}
                        </select>
                    </div>
                    <button onClick={handleSearch} className="px-4 py-2 bg-accent text-brand-900 font-semibold rounded-lg hover:bg-accent-hover h-10">Search</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-brand-700/60">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-300 uppercase tracking-wider">Site</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-300 uppercase tracking-wider">Camera</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-300 uppercase tracking-wider">Event Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-300 uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-300 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-brand-800 divide-y divide-brand-700">
                            {isLoading ? (
                                <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
                            ) : alerts.map(alert => (
                                <tr key={alert._id} onClick={() => setSelectedAlert(alert)} className="hover:bg-brand-700/50 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-300">{alert.siteProfile?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-300">{alert.originalData.camera?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-300">{alert.originalData.event_type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-300">{new Date(alert.createdAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-300">{alert.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedAlert && <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
        </div>
    );
}

function AlertDetailModal({ alert, onClose }) {
    const [showRawData, setShowRawData] = useState(false);
    const snapshotUrl = alert.originalData.mediums?.find(m => m.name === 'snapshot')?.files?.[0]?.url || `https://placehold.co/600x400/111827/9CA3AF?text=No+Snapshot`;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-brand-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Alert Details</h2>
                    <button onClick={onClose} className="text-brand-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                             <p className="text-sm text-brand-400">Event Snapshot</p>
                             <img src={snapshotUrl} alt="Event snapshot" className="mt-2 rounded-lg w-full aspect-video object-cover bg-black" />
                        </div>
                        <div>
                            <p className="text-sm text-brand-400">Details</p>
                            <ul className="mt-2 space-y-2 text-brand-300 bg-brand-700/50 p-3 rounded-md">
                                <li><strong>Site:</strong> {alert.siteProfile?.name}</li>
                                <li><strong>Camera:</strong> {alert.originalData.camera?.name}</li>
                                <li><strong>Time:</strong> {new Date(alert.createdAt).toLocaleString()}</li>
                                <li><strong>Status:</strong> {alert.status}</li>
                            </ul>
                        </div>
                    </div>
                     <div className="mt-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-white">Dispatcher Notes</h3>
                            <button onClick={() => setShowRawData(!showRawData)} className="text-xs text-brand-400 hover:text-white">
                                {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
                            </button>
                        </div>
                        <div className="bg-brand-900/50 rounded-lg p-3 space-y-3 h-48 overflow-y-auto">
                            {(alert.notes || []).length > 0 ? alert.notes.map((note, index) => (
                                <div key={index} className="text-sm border-b border-brand-700 pb-2">
                                    <p className="text-brand-300">{note.text}</p>
                                    <p className="text-xs text-brand-400 text-right">- {note.username} at {new Date(note.timestamp).toLocaleString()}</p>
                                </div>
                            )) : <p className="text-sm text-brand-400">No notes for this event.</p>}
                        </div>
                        {showRawData && (
                            <div className="mt-4">
                               <h4 className="text-sm font-semibold text-brand-400">Raw Alert Data</h4>
                               <pre className="text-xs bg-black p-2 rounded-md overflow-x-auto text-brand-300 max-h-48">
                                   {JSON.stringify(alert, null, 2)}
                               </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EventHistoryPage;