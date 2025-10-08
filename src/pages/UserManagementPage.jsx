import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { PlusCircle, Pen, Save, Trash2, X } from 'lucide-react';

function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [dispatchGroups, setDispatchGroups] = useState([]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Correctly destructure the data from the axios responses
            const [usersResponse, groupsResponse] = await Promise.all([
                api.getUsers(),
                api.getDispatchGroups()
            ]);
            setUsers(usersResponse.data);
            setDispatchGroups(groupsResponse.data);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingUser({ username: '', role: 'Dispatcher', password: '' });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setEditingUser({ ...user, password: '' }); // Clear password for editing
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSave = async (userToSave) => {
        try {
            // Filter out empty password so it's not sent on updates
            const { password, ...rest } = userToSave;
            const payload = password ? userToSave : rest;

            if (payload._id) {
                await api.updateUser(payload._id, payload);
            } else {
                await api.createUser(payload);
            }
            loadData();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save user:", error);
            alert("Error saving user.");
        }
    };
    
    const handleDelete = async (userId, username) => {
        if (window.confirm(`Are you sure you want to delete the user "${username}"?`)) {
            try {
                await api.deleteUser(userId);
                loadData();
                handleCloseModal();
            } catch (error) {
                console.error("Failed to delete user:", error);
            }
        }
    };

    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">User Management</h1>
             <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-400 max-w-2xl">Create and manage user accounts and their roles.</p>
                    <button onClick={handleOpenCreateModal} className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        <PlusCircle size={16} className="mr-2"/> Create New User
                    </button>
                </div>
                {isLoading ? <p>Loading users...</p> : (
                    <div className="space-y-3">
                        {users.map(user => (
                            <div key={user._id} className="bg-gray-700/60 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{user.username}</p>
                                    <p className="text-sm text-gray-400">{user.role}</p>
                                </div>
                                <button onClick={() => handleOpenEditModal(user)} className="flex items-center px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                                    <Pen size={14} className="mr-2"/> Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {isModalOpen && (
                <UserEditModal
                    user={editingUser}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    dispatchGroups={dispatchGroups}
                />
            )}
        </div>
    );
}

function UserEditModal({ user, onClose, onSave, onDelete, dispatchGroups }) {
    const [formData, setFormData] = useState(user);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{user._id ? 'Edit' : 'Create'} User</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                        <input name="username" value={formData.username} onChange={handleChange} className="w-full bg-gray-700 border-gray-600 rounded-md text-white"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                        <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder={user._id ? "Leave blank to keep unchanged" : ""} className="w-full bg-gray-700 border-gray-600 rounded-md text-white"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-gray-700 border-gray-600 rounded-md text-white">
                            <option>Administrator</option>
                            <option>Dispatcher</option>
                        </select>
                    </div>
                    {formData.role === 'Dispatcher' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Assign to Dispatch Group</label>
                            <select name="dispatchGroupId" value={formData.dispatchGroupId || ''} onChange={handleChange} className="w-full bg-gray-700 border-gray-600 rounded-md text-white">
                                <option value="">None</option>
                                {dispatchGroups.map(group => (
                                    <option key={group._id} value={group._id}>{group.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="bg-gray-700/50 px-6 py-4 flex justify-between items-center">
                    {user._id && <button onClick={() => onDelete(user._id, user.username)} className="flex items-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"><Trash2 size={16} className="mr-2"/> Delete</button>}
                    <div className="space-x-3 ml-auto">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">Cancel</button>
                        <button onClick={() => onSave(formData)} className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"><Save size={16} className="mr-2"/> Save User</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserManagementPage;

