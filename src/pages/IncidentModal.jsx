import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

function IncidentModal({ siteName, alertsForSite, onClose, onAcknowledge, onResolve, onAddNote }) {
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [noteText, setNoteText] = useState('');
    const notesEndRef = useRef(null);

    // --- BUG FIX: This useEffect is updated to correctly sync state ---
    useEffect(() => {
        if (alertsForSite && alertsForSite.length > 0) {
            // If an alert is already selected, find its updated version in the new prop array.
            // This ensures we always show the freshest data (e.g., with new notes).
            if (selectedAlert) {
                const updatedSelectedAlert = alertsForSite.find(a => a.id === selectedAlert.id);
                // If the selected alert still exists, update our state to its new version.
                // If not (e.g., it was resolved), default to the newest alert in the list.
                setSelectedAlert(updatedSelectedAlert || alertsForSite[0]);
            } else {
                // If no alert is selected yet, default to the newest one.
                setSelectedAlert(alertsForSite[0]);
            }
        }
    // We ONLY want this effect to run when the incoming prop changes.
    }, [alertsForSite]);
    
    useEffect(() => {
        if (selectedAlert) {
            notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedAlert?.notes]);

    const handleAddNote = () => {
        if (selectedAlert && noteText.trim()) {
            onAddNote(selectedAlert, noteText);
            setNoteText('');
        }
    };

    if (!selectedAlert) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex items-center justify-center">
                    <p className="text-white">Loading incident...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{siteName} Incident</h2>
                            <p className="text-sm text-gray-400">{alertsForSite.length} active alert(s)</p>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/3 border-r border-gray-700 overflow-y-auto p-3 space-y-2">
                        {alertsForSite.map(alert => (
                            <button
                                key={alert.id}
                                onClick={() => setSelectedAlert(alert)}
                                className={`w-full text-left p-3 rounded-lg transition-colors border-l-4 ${selectedAlert.id === alert.id ? 'bg-blue-900/50 border-blue-400' : 'bg-gray-700/50 hover:bg-gray-700 border-transparent'}`}
                            >
                                <p className="font-semibold">{alert.type}</p>
                                <p className="text-sm text-gray-300">{alert.cameraName}</p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(alert.createdAt).toLocaleTimeString()}</p>
                            </button>
                        ))}
                    </div>

                    <div className="w-2/3 flex flex-col">
                        <div className="flex-1 flex overflow-y-auto p-6 space-x-6">
                            <div className="w-1/2 flex flex-col">
                                <p className="text-sm text-gray-400 flex-shrink-0">Event Snapshot</p>
                                <img src={selectedAlert.snapshotUrl} alt="Event snapshot" className="mt-2 rounded-lg w-full aspect-video object-cover bg-black flex-shrink-0" />
                                <div className="flex-1 flex flex-col mt-4 min-h-0">
                                    <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Dispatcher Notes</h3>
                                    <div className="bg-gray-900/50 rounded-lg p-3 flex-1 overflow-y-auto space-y-3">
                                        {(selectedAlert.notes || []).map((note, index) => (
                                            <div key={index} className="text-sm">
                                                <p className="text-gray-300 whitespace-pre-wrap">{note.text}</p>
                                                <p className="text-xs text-gray-500 text-right">- {note.username} at {new Date(note.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        ))}
                                        <div ref={notesEndRef} />
                                    </div>
                                    <div className="mt-3 flex space-x-2 flex-shrink-0">
                                        <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a new note..." rows="2" className="flex-1 bg-gray-700 border-gray-600 rounded-md text-white text-sm p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                                        <button onClick={handleAddNote} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 self-end"><Send size={16}/></button>
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/2 flex flex-col space-y-4">
                                <div>
                                    <p className="text-sm text-gray-400">Alert Details</p>
                                    <div className="mt-2 p-4 bg-gray-700/50 rounded-lg">
                                        <ul className="space-y-2 text-gray-300">
                                            <li><strong>Camera:</strong> {selectedAlert.cameraName}</li>
                                            <li><strong>Event:</strong> {selectedAlert.type}</li>
                                            <li><strong>Time:</strong> {new Date(selectedAlert.createdAt).toLocaleString()}</li>
                                            <li><strong>Status:</strong> <span className="font-semibold">{selectedAlert.status}</span></li>
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Pertinent Information</p>
                                    <div className="mt-2 p-4 bg-gray-700/50 rounded-lg h-32 overflow-y-auto">
                                        <p className="text-sm text-gray-300">{selectedAlert.siteProfile.pertinent_info || 'No information provided.'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-700/50 px-6 py-4 flex justify-end space-x-4 rounded-b-lg">
                            <button onClick={() => onAcknowledge(selectedAlert)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={selectedAlert.status !== 'New'}>Acknowledge</button>
                            <button onClick={() => onResolve(selectedAlert)} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600">Resolve</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default IncidentModal;