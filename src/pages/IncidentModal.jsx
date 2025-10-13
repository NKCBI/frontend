import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

function IncidentModal({ siteName, alertsForSite, onClose, onAcknowledge, onResolve, onAddNote }) {
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [noteText, setNoteText] = useState('');
    const notesEndRef = useRef(null);

    useEffect(() => {
        if (alertsForSite && alertsForSite.length > 0) {
            if (selectedAlert) {
                const updatedSelectedAlert = alertsForSite.find(a => a.id === selectedAlert.id);
                setSelectedAlert(updatedSelectedAlert || alertsForSite[0]);
            } else {
                setSelectedAlert(alertsForSite[0]);
            }
        }
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
                <div className="bg-brand-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex items-center justify-center">
                    <p className="text-brand-300">Loading incident...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-brand-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="p-6 border-b border-brand-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{siteName} Incident</h2>
                            <p className="text-sm text-brand-400">{alertsForSite.length} active alert(s)</p>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full text-brand-400 hover:text-white hover:bg-brand-700">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/3 border-r border-brand-700 overflow-y-auto p-3 space-y-2">
                        {alertsForSite.map(alert => (
                             <button
                                key={alert.id}
                                onClick={() => setSelectedAlert(alert)}
                                className={`w-full text-left p-3 rounded-lg transition-colors border-l-4 ${selectedAlert.id === alert.id ? 'bg-accent/20 border-accent' : 'bg-brand-700/50 hover:bg-brand-700 border-transparent'} ${alert.status === 'Resolved' ? 'opacity-50' : ''}`}
                            >
                                <p className="font-semibold">{alert.type}</p>
                                <p className="text-sm text-brand-300">{alert.cameraName}</p>
                                <p className="text-xs text-brand-400 mt-1">{new Date(alert.createdAt).toLocaleTimeString()}</p>
                            </button>
                        ))}
                    </div>

                    <div className="w-2/3 flex flex-col p-6 overflow-y-auto">
                        {/* --- NEW LAYOUT: Image is now at the top and takes full width of this pane --- */}
                        <div>
                            <p className="text-sm text-brand-400 flex-shrink-0">Event Snapshot</p>
                            <img src={selectedAlert.snapshotUrl} alt="Event snapshot" className="mt-2 rounded-lg w-full aspect-video object-cover bg-black flex-shrink-0" />
                        </div>
                        
                        {/* --- NEW LAYOUT: Info and Notes are in a grid below the image --- */}
                        <div className="flex-1 grid grid-cols-2 gap-6 mt-6">
                            {/* Notes Column */}
                            <div className="flex flex-col min-h-0">
                                <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Dispatcher Notes</h3>
                                <div className="bg-brand-900/50 rounded-lg p-3 flex-1 overflow-y-auto space-y-3">
                                    {(selectedAlert.notes || []).length > 0 ? selectedAlert.notes.map((note, index) => (
                                        <div key={index} className="text-sm">
                                            <p className="text-brand-300 whitespace-pre-wrap">{note.text}</p>
                                            <p className="text-xs text-brand-400 text-right">- {note.username} at {new Date(note.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    )) : <p className="text-sm text-brand-400">No notes for this alert.</p>}
                                    <div ref={notesEndRef} />
                                </div>
                                <div className="mt-3 flex space-x-2 flex-shrink-0">
                                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a new note..." rows="2" className="flex-1 bg-brand-700 border-brand-700 rounded-md text-white text-sm p-2 focus:ring-accent focus:border-accent"></textarea>
                                    <button onClick={handleAddNote} className="px-4 py-2 bg-accent text-brand-900 font-semibold rounded-lg hover:bg-accent-hover self-end"><Send size={16}/></button>
                                </div>
                            </div>
                            {/* Info Column */}
                            <div className="flex flex-col space-y-4">
                                <div>
                                    <p className="text-sm text-brand-400">Alert Details</p>
                                    <div className="mt-2 p-4 bg-brand-900/50 rounded-lg">
                                        <ul className="space-y-2 text-brand-300">
                                            <li><strong>Camera:</strong> {selectedAlert.cameraName}</li>
                                            <li><strong>Event:</strong> {selectedAlert.type}</li>
                                            <li><strong>Time:</strong> {new Date(selectedAlert.createdAt).toLocaleString()}</li>
                                            <li><strong>Status:</strong> <span className="font-semibold">{selectedAlert.status}</span></li>
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-brand-400">Pertinent Information</p>
                                    <div className="mt-2 p-4 bg-brand-900/50 rounded-lg h-32 overflow-y-auto">
                                        <p className="text-sm text-brand-300">{selectedAlert.siteProfile.pertinent_info || 'No information provided.'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-brand-700/50 px-6 py-4 flex justify-end space-x-4">
                    <button onClick={() => onAcknowledge(selectedAlert)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={selectedAlert.status !== 'New'}>Acknowledge</button>
                    <button onClick={() => onResolve(selectedAlert)} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600">Resolve</button>
                </div>
            </div>
        </div>
    );
}

export default IncidentModal;