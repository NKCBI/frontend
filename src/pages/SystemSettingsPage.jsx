import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Save, AlertTriangle, PlusCircle, Trash2 } from 'lucide-react';

// Get a list of timezones supported by the browser
const timezones = Intl.supportedValuesOf('timeZone');

function SystemSettingsPage() {
    const [settings, setSettings] = useState({ turingApiTokens: [''], webhookSecret: '', timezone: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setIsLoading(true);
                const { data: currentSettings } = await api.getSystemSettings();
                setSettings({
                    turingApiTokens: Array.isArray(currentSettings.turingApiTokens) && currentSettings.turingApiTokens.length > 0 ? currentSettings.turingApiTokens : [''],
                    webhookSecret: currentSettings.webhookSecret || '',
                    timezone: currentSettings.timezone || 'UTC', // Set timezone
                });
            } catch (err) {
                setError('Failed to load settings.');
                console.error("Failed to load settings:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleTokenChange = (index, value) => {
        const newTokens = [...settings.turingApiTokens];
        newTokens[index] = value;
        setSettings({ ...settings, turingApiTokens: newTokens });
    };

    const handleAddToken = () => {
        setSettings({ ...settings, turingApiTokens: [...settings.turingApiTokens, ''] });
    };

    const handleRemoveToken = (index) => {
        const newTokens = settings.turingApiTokens.filter((_, i) => i !== index);
        if (newTokens.length === 0) {
            setSettings({ ...settings, turingApiTokens: [''] });
        } else {
            setSettings({ ...settings, turingApiTokens: newTokens });
        }
    };
    
    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        setSuccess('');
        try {
            const settingsToSave = {
                ...settings,
                turingApiTokens: settings.turingApiTokens.filter(token => token.trim() !== '')
            };
            await api.updateSystemSettings(settingsToSave);
            setSuccess('Settings saved successfully. Restart the backend server for changes to take effect.');
        } catch (err) {
            setError('Failed to save settings.');
            console.error("Failed to save settings:", err);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">System Settings</h1>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <p className="text-gray-400 mb-6">Configure global settings for the application. Changes require a backend restart to apply.</p>
                
                {isLoading ? <p>Loading settings...</p> : (
                    <div className="space-y-6 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Turing API Access Tokens</label>
                            <div className="space-y-3">
                                {settings.turingApiTokens.map((token, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <input
                                            type="password"
                                            value={token}
                                            onChange={(e) => handleTokenChange(index, e.target.value)}
                                            className="flex-grow bg-gray-700 border-gray-600 rounded-md text-white"
                                            placeholder={`API Token #${index + 1}`}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveToken(index)} 
                                            className="text-gray-400 hover:text-red-400 p-2"
                                            title="Remove Token"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                             <button
                                type="button"
                                onClick={handleAddToken}
                                className="mt-3 flex items-center text-sm text-blue-400 hover:text-blue-300"
                            >
                                <PlusCircle size={16} className="mr-2" />
                                Add Another Token
                            </button>
                        </div>

                        <div>
                            <label htmlFor="webhookSecret" className="block text-sm font-medium text-gray-300 mb-1">Webhook Secret</label>
                            <input
                                type="password"
                                id="webhookSecret"
                                name="webhookSecret"
                                value={settings.webhookSecret || ''}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border-gray-600 rounded-md text-white"
                                placeholder="Paste your webhook secret here"
                            />
                            <p className="text-xs text-gray-500 mt-1">This secret is used to verify incoming webhook requests from Turing.</p>
                        </div>

                        <div>
                            <label htmlFor="timezone" className="block text-sm font-medium text-gray-300 mb-1">System Timezone</label>
                            <select
                                id="timezone"
                                name="timezone"
                                value={settings.timezone}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border-gray-600 rounded-md text-white"
                            >
                                {timezones.map(tz => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">This timezone will be used for all schedule calculations.</p>
                        </div>
                        
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
                            >
                                <Save size={16} className="mr-2" />
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>

                        {success && (
                            <div className="mt-4 p-4 bg-green-900/50 border border-green-700 text-green-300 rounded-lg flex items-center">
                                <AlertTriangle size={20} className="mr-3 text-green-500" />
                                <div>
                                    <p className="font-semibold">Important:</p>
                                    <p>{success}</p>
                                </div>
                            </div>
                        )}
                        {error && <p className="mt-4 text-red-400">{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SystemSettingsPage;