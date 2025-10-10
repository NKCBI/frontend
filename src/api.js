import axios from 'axios';

// This uses a Vite environment variable to set the API URL for your backend.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// --- NEW: A separate URL for the MediaMTX WebRTC (WHEP) endpoint ---
const MEDIAMTX_WHEP_URL = import.meta.env.VITE_MEDIAMTX_WHEP_URL || 'http://localhost:8889';

const apiClient = axios.create({
    baseURL: API_URL,
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const api = {
    login: (username, password) => apiClient.post('/auth/login', { username, password }),
    getDevices: () => apiClient.get('/devices'),
    getMonitoredDevices: () => apiClient.get('/monitored-devices'),
    updateCameraMonitorStatus: (id, isMonitored) => apiClient.put(`/cameras/${id}/monitor`, { isMonitored }),
    updateSiteMonitorStatus: (siteId, isMonitored) => apiClient.put(`/sites/${siteId}/monitor-all`, { isMonitored }),
    updateSiteProfile: (id, data) => apiClient.put(`/devices/${id}/profile`, data),
    getHistoricalAlerts: (filters) => apiClient.get('/alerts/history', { params: filters }),
    updateAlertStatus: (id, status) => apiClient.post(`/alerts/${id}/status`, { status }),
    addNoteToAlert: (alertId, noteText) => apiClient.post(`/alerts/${alertId}/notes`, { noteText }),
    getRtspUrl: (cameraId) => apiClient.post('/video/rtsp-url', { camera_id: cameraId }),
    startMediaMTXStream: (pathName, rtspUrl) => apiClient.post('/video/start-stream', { pathName, rtspUrl }),
    
    startWhepsession: async (pathName, offerSdp) => {
        const baseWhepUrl = MEDIAMTX_WHEP_URL.replace(/\/$/, '');
        const finalWhepUrl = `${baseWhepUrl}/${pathName}/whep`;
        
        // --- NEW LINE FOR PROOF ---
        console.log(`[WebRTC Proof] Attempting to connect to WHEP endpoint: ${finalWhepUrl}`);
        
        const response = await fetch(finalWhepUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: offerSdp,
        });
        if (!response.ok) {
            throw new Error(`WHEP request to ${finalWhepUrl} failed with status ${response.status}`);
        }
        return response.text();
    },

    renewMediaMTXStream: (pathName, rtspUrl) => apiClient.patch('/video/stream', { pathName, rtspUrl }),
    getSchedules: () => apiClient.get('/schedules'),
    createSchedule: (data) => apiClient.post('/schedules', data),
    updateSchedule: (id, data) => apiClient.put(`/schedules/${id}`, data),
    deleteSchedule: (id) => apiClient.delete(`/schedules/${id}`),
    getAssignments: () => apiClient.get('/schedule-assignments'),
    saveAssignments: (data) => apiClient.post('/schedule-assignments', data),
    getUsers: () => apiClient.get('/users'),
    createUser: (data) => apiClient.post('/users', data),
    updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
    deleteUser: (id) => apiClient.delete(`/users/${id}`),
    getDispatchGroups: () => apiClient.get('/dispatch-groups'),
    createDispatchGroup: (data) => apiClient.post('/dispatch-groups', data),
    updateDispatchGroup: (id, data) => apiClient.put(`/dispatch-groups/${id}`, data),
    deleteDispatchGroup: (id) => apiClient.delete(`/dispatch-groups/${id}`),
    getActiveAlerts: () => apiClient.get('/alerts/active'),
    getSystemSettings: () => apiClient.get('/settings'),
    updateSystemSettings: (data) => apiClient.put('/settings', data),
};