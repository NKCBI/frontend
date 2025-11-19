import React, { useState, useEffect, useRef } from 'react';
import { Send, X, CheckCheck, ShieldCheck, AlertCircle } from 'lucide-react';

function IncidentModal({ siteName, alertsForSite, onClose, onAcknowledge, onResolve, onAddNote, onAcknowledgeAll, onResolveAll, currentUser }) {
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [noteError, setNoteError] = useState('');
    const notesEndRef = useRef(null);

    const isIncidentResolved = alertsForSite.every(a => a.status === 'Resolved');

    useEffect(() => {
        if (alertsForSite && alertsForSite.length > 0) {
            if (selectedAlert) {
                const updatedSelectedAlert = alertsForSite.find(a => a.id === selectedAlert.id);
                setSelectedAlert(updatedSelectedAlert || alertsForSite[0]);
            } else {
                setSelectedAlert(alertsForSite[0]);
            }
        }
    }, [alertsForSite, selectedAlert]);
    
    useEffect(() => {
        if (selectedAlert) {
            notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedAlert?.notes]);

    const handleAddNote = () => {
        if (selectedAlert && noteText.trim()) {
            onAddNote(selectedAlert, noteText);
            setNoteText('');
            setNoteError('');
        }
    };

    const handleResolve = () => {
        if (currentUser.role !== 'Administrator') {
            const hasNote = selectedAlert.notes.some(note => note.username === currentUser.username);
            if (!hasNote) {
                setNoteError('A note is required before resolving an alert.');
                return;
            }
        }
        onResolve(selectedAlert);
    };
    
    const handleResolveAll = () => {
        if (currentUser.role !== 'Administrator') {
            const hasAnyNote = alertsForSite.some(alert => alert.notes.some(note => note.username === currentUser.username));
            if (!hasAnyNote) {
                setNoteError('At least one note is required before resolving the incident.');
                return;
            }
        }
        onResolveAll();
    };


    const hasUnacknowledgedAlerts = alertsForSite.some(a => a.status === 'New');

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
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{siteName} Incident</h2>
                            <p className="text-sm text-brand-400">{alertsForSite.length} active alert(s)</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {alertsForSite.length > 1 && (
                                <>
                                    <button
                                        onClick={onAcknowledgeAll}
                                        disabled={!hasUnacknowledgedAlerts}
                                        className="flex items-center px-3 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        <CheckCheck size={16} className="mr-2"/> Acknowledge All
                                    </button>
                                     <button
                                        onClick={handleResolveAll}
                                        disabled={isIncidentResolved}
                                        className="flex items-center px-3 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        <ShieldCheck size={16} className="mr-2"/> Resolve Incident
                                    </button>
                                </>
                            )}
                            <button onClick={onClose} className="p-2 rounded-full text-brand-400 hover:text-white hover:bg-brand-700">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/3 border-r border-brand-700 overflow-y-auto p-3 space-y-2">
                        {alertsForSite.map(alert => (
                             <button
                                key={alert.id}
                                onClick={() => { setSelectedAlert(alert); setNoteError(''); }}
                                className={`w-full text-left p-3 rounded-lg transition-colors border-l-4 ${selectedAlert.id === alert.id ? 'bg-accent/20 border-accent' : 'bg-brand-700/50 hover:bg-brand-700 border-transparent'} ${alert.status === 'Resolved' ? 'opacity-50' : ''}`}
                            >
                                <p className="font-semibold text-white">{alert.type}</p>
                                <p className="text-sm text-brand-300">{alert.cameraName}</p>
                                <p className="text-xs text-brand-400 mt-1">{new Date(alert.createdAt).toLocaleTimeString()}</p>
                            </button>
                        ))}
                    </div>

                    <div className="w-2/3 flex flex-col p-6 overflow-y-auto">
                        <div>
                            <p className="text-sm text-brand-400 flex-shrink-0">Event Media</p>
                            {selectedAlert.clipUrl ? (
                                <video
                                    key={selectedAlert.clipUrl} 
                                    src={selectedAlert.clipUrl}
                                    className="mt-2 rounded-lg w-full aspect-video object-contain bg-black flex-shrink-0"
                                    controls
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                >
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <img 
                                    src={selectedAlert.snapshotUrl} 
                                    alt="Event snapshot" 
                                    className="mt-2 rounded-lg w-full aspect-video object-cover bg-black flex-shrink-0" 
                                />
                            )}
                        </div>
                        
                        <div className="flex-1 grid grid-cols-2 gap-6 mt-6">
                            <div className="flex flex-col min-h-0">
                                <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                    <h3 className="text-lg font-semibold text-white">Dispatcher Notes</h3>
                                    {noteError && <span className="text-xs text-red-400 flex items-center"><AlertCircle size={14} className="mr-1"/> {noteError}</span>}
                                </div>
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
                                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a new note..." rows="2" className={`flex-1 bg-brand-700 border rounded-md text-white text-sm p-2 focus:ring-accent focus:border-accent ${noteError ? 'border-red-500' : 'border-brand-700'}`}></textarea>
                                    <button onClick={handleAddNote} className="px-4 py-2 bg-accent text-brand-900 font-semibold rounded-lg hover:bg-accent-hover self-end"><Send size={16}/></button>
                                </div>
                            </div>
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
                    <button onClick={handleResolve} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={selectedAlert.status === 'Resolved'}>Resolve</button>
                </div>
            </div>
        </div>
    );
}

export default IncidentModal;