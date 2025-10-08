import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { PlusCircle, Pen, Save, Trash2, X, ArrowRight, ArrowLeft } from 'lucide-react';

function DispatchGroupsPage() {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);

    const loadGroups = async () => {
        setIsLoading(true);
        try {
            const { data: groupsData } = await api.getDispatchGroups();
            setGroups(groupsData);
        } catch (error) {
            console.error("Failed to load dispatch groups:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadGroups();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingGroup({ name: '', siteIds: [] });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (group) => {
        setEditingGroup(JSON.parse(JSON.stringify(group)));
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingGroup(null);
    };

    const handleSave = async (groupToSave) => {
        try {
            if (groupToSave._id) {
                await api.updateDispatchGroup(groupToSave._id, groupToSave);
            } else {
                await api.createDispatchGroup(groupToSave);
            }
            loadGroups();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save dispatch group:", error);
            alert("Error saving dispatch group.");
        }
    };
    
    const handleDelete = async (groupId, groupName) => {
        if (window.confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
            try {
                await api.deleteDispatchGroup(groupId);
                loadGroups();
                handleCloseModal();
            } catch (error) {
                console.error("Failed to delete dispatch group:", error);
            }
        }
    };

    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">Dispatch Groups</h1>
             <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-400 max-w-2xl">Create and manage groups of sites for dedicated monitoring desks. Assign these groups to Dispatcher users.</p>
                    <button onClick={handleOpenCreateModal} className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        <PlusCircle size={16} className="mr-2"/> Create New Group
                    </button>
                </div>
                {isLoading ? <p>Loading groups...</p> : (
                    <div className="space-y-3">
                        {groups.map(group => (
                            <div key={group._id} className="bg-gray-700/60 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{group.name}</p>
                                    <p className="text-sm text-gray-400">{group.siteIds.length} site(s) assigned</p>
                                </div>
                                <button onClick={() => handleOpenEditModal(group)} className="flex items-center px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                                    <Pen size={14} className="mr-2"/> Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {isModalOpen && (
                <DispatchGroupModal
                    group={editingGroup}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}

function DispatchGroupModal({ group, onClose, onSave, onDelete }) {
    const [allSites, setAllSites] = useState([]);
    const [currentGroup, setCurrentGroup] = useState(group);

    useEffect(() => {
        const fetchSites = async () => {
            try {
                const { data } = await api.getDevices();
                setAllSites(data);
            } catch (error) {
                console.error("Failed to load sites for modal:", error);
            }
        }
        fetchSites();
    }, []);

    const handleNameChange = (e) => {
        setCurrentGroup({ ...currentGroup, name: e.target.value });
    };

    const handleSiteMove = (siteId, to) => {
        setCurrentGroup(prev => {
            const currentIds = prev.siteIds || [];
            if (to === 'assign') {
                return { ...prev, siteIds: [...currentIds, siteId] };
            } else {
                return { ...prev, siteIds: currentIds.filter(id => id !== siteId) };
            }
        });
    };
    
    const assignedSites = allSites.filter(s => currentGroup.siteIds.includes(s._id));
    const availableSites = allSites.filter(s => !currentGroup.siteIds.includes(s._id));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{group._id ? 'Edit' : 'Create'} Dispatch Group</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Group Name</label>
                        <input value={currentGroup.name} onChange={handleNameChange} className="w-full bg-gray-700 border-gray-600 rounded-md text-white"/>
                    </div>
                    <div className="flex space-x-6 h-[50vh] pt-4">
                        <div className="w-1/2 flex flex-col">
                            <h3 className="text-lg font-semibold mb-2">Available Sites</h3>
                            <div className="bg-gray-900 rounded-lg p-3 flex-1 overflow-y-auto">
                                {availableSites.map(site => (
                                    <div key={site._id} className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                                        <p className="text-sm font-medium">{site.name}</p>
                                        <button onClick={() => handleSiteMove(site._id, 'assign')} className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white"><ArrowRight size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-1/2 flex flex-col">
                            <h3 className="text-lg font-semibold mb-2">Assigned to Group</h3>
                            <div className="bg-gray-900 rounded-lg p-3 flex-1 overflow-y-auto">
                                {assignedSites.map(site => (
                                     <div key={site._id} className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                                        <button onClick={() => handleSiteMove(site._id, 'unassign')} className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white"><ArrowLeft size={16} /></button>
                                        <p className="text-sm font-medium text-right">{site.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-700/50 px-6 py-4 flex justify-between items-center">
                    {group._id && <button onClick={() => onDelete(group._id, group.name)} className="flex items-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"><Trash2 size={16} className="mr-2"/> Delete</button>}
                    <div className="space-x-3 ml-auto">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">Cancel</button>
                        <button onClick={() => onSave(currentGroup)} className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"><Save size={16} className="mr-2"/> Save Group</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DispatchGroupsPage;

