import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Pen, Save, X } from 'lucide-react';

function SiteManagementPage() {
    const [sites, setSites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSite, setEditingSite] = useState(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Correctly destructure the data from the axios response
            const { data: sitesData } = await api.getDevices();
            setSites(sitesData);
        } catch (error) {
            console.error("Failed to load site data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveSite = async (siteToSave) => {
        try {
            const { _id, name, cameras, ...profileData } = siteToSave;
            await api.updateSiteProfile(_id, profileData);
            setEditingSite(null);
            loadData(); // Reload data to show changes
        } catch (error) {
            console.error("Failed to save site:", error);
            alert("Error saving site profile.");
        }
    };

    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">Site Profiles</h1>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <p className="text-gray-400 mb-6">Edit the profile information for each site. This information will be shown to dispatchers during an alert.</p>
                {isLoading ? <p>Loading sites...</p> : (
                    <div className="space-y-3">
                        {sites.map(site => (
                            <div key={site._id} className="bg-gray-700/60 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{site.name || `Site ID: ${site._id}`}</p>
                                    <p className="text-sm text-gray-400">Account #: {site.account_number || 'Not Set'}</p>
                                </div>
                                <button onClick={() => setEditingSite(site)} className="flex items-center px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                                    <Pen size={14} className="mr-2"/> Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {editingSite && (
                <SiteEditModal
                    site={editingSite}
                    onClose={() => setEditingSite(null)}
                    onSave={handleSaveSite}
                />
            )}
        </div>
    );
}

function SiteEditModal({ site, onClose, onSave }) {
    const [formData, setFormData] = useState(site);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Edit Site: {site.name || `Site ID: ${site._id}`}</h2>
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
                   <button onClick={handleSave} className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                        <Save size={16} className="mr-2"/> Save Changes
                   </button>
                </div>
            </div>
        </div>
    );
}

export default SiteManagementPage;

