import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { BellRing, CheckCheck } from 'lucide-react';

function DashboardPage() {
    const [unconfiguredSites, setUnconfiguredSites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const { data: devices } = await api.getDevices();
                setUnconfiguredSites(devices.filter(d => !d.isConfigured));
            } catch (error) {
                console.error("Failed to fetch devices for dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDevices();
    }, []);

    const handleResolveAllAlerts = async () => {
        const confirmation = window.confirm(
            "Are you sure you want to mark all unresolved alerts as 'Resolved'? This will clear the active queue for all dispatchers."
        );
        if (confirmation) {
            try {
                const response = await api.resolveAllActiveAlerts();
                alert(response.data.message || "Active alerts resolved successfully.");
            } catch (error) {
                console.error("Failed to resolve active alerts:", error);
                alert("An error occurred while resolving alerts.");
            }
        }
    };

    if (isLoading) {
        return <div className="text-white">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            
            {unconfiguredSites.length > 0 && (
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center mb-4">
                        <BellRing size={24} className="mr-4 text-yellow-400" />
                        <h2 className="text-xl font-semibold">New Sites Detected</h2>
                    </div>
                    <p className="text-yellow-300 mb-4">The following new sites have been synchronized from the Turing API and require configuration.</p>
                    <div className="space-y-2">
                        {unconfiguredSites.map(site => (
                            <div key={site._id} className="bg-yellow-800/50 p-3 rounded-md flex justify-between items-center">
                                <span>{site.name}</span>
                                <Link 
                                    to="/sites" 
                                    className="text-sm bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded"
                                >
                                    Configure
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {unconfiguredSites.length === 0 && !isLoading && (
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-green-400">System Ready</h2>
                    <p className="text-gray-300 mt-2">All synchronized sites have been configured. The system is ready to monitor for events.</p>
                </div>
            )}

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-yellow-400">Administrative Actions</h2>
                <div className="mt-4 border-t border-gray-700 pt-4">
                    <p className="text-gray-400 mb-4">
                        This action will mark all "New" or "Acknowledged" alerts as "Resolved". This is useful for clearing the active queue for all dispatchers after a testing period or system maintenance.
                    </p>
                    <button 
                        onClick={handleResolveAllAlerts}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                        <CheckCheck size={16} className="mr-2"/> Mass Resolve All Unresolved Alerts
                    </button>
                </div>
            </div>

        </div>
    );
}

export default DashboardPage;