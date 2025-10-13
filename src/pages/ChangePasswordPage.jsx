import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Save, AlertTriangle, CheckCircle } from 'lucide-react';

function ChangePasswordPage() {
    const { logout } = useAuth();
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (passwords.newPassword.length < 6) {
            setError("New password must be at least 6 characters long.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await api.changePassword(passwords.currentPassword, passwords.newPassword);
            setSuccess(response.data.message + " You will be logged out shortly.");
            // Automatically log the user out after a successful change
            setTimeout(() => {
                logout();
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || "An error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">Change Password</h1>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={passwords.currentPassword}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-700 border-gray-600 rounded-md text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwords.newPassword}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-700 border-gray-600 rounded-md text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwords.confirmPassword}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-700 border-gray-600 rounded-md text-white"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving || success}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
                        >
                            <Save size={16} className="mr-2" />
                            {isSaving ? 'Saving...' : 'Update Password'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="mt-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg flex items-center">
                        <AlertTriangle size={20} className="mr-3 text-red-500" />
                        <p>{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mt-4 p-4 bg-green-900/50 border border-green-700 text-green-300 rounded-lg flex items-center">
                        <CheckCircle size={20} className="mr-3 text-green-500" />
                        <p>{success}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChangePasswordPage;