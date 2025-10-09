import React, { useState, useEffect } from 'react';
import { Pen, Save, Trash2, X, PlusCircle, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../api';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ScheduleManagementPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [schedules, setSchedules] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);

    const loadInitialData = async () => {
        try {
            setIsLoading(true);
            const [schedulesResponse, assignmentsResponse] = await Promise.all([
                api.getSchedules(),
                api.getAssignments(),
            ]);
            setSchedules(schedulesResponse.data);
            setAssignments(assignmentsResponse.data.assignments || {});
        } catch (error) {
            console.error("Failed to load initial data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const handleOpenCreateWizard = () => {
        setEditingSchedule({ name: '', days: {} });
        setIsWizardOpen(true);
    };

    const handleOpenEditWizard = (schedule) => {
        setEditingSchedule(JSON.parse(JSON.stringify(schedule)));
        setIsWizardOpen(true);
    };
    
    const handleCloseWizard = () => {
        setIsWizardOpen(false);
        setEditingSchedule(null);
    };

    const handleSave = async (scheduleToSave, newAssignments) => {
        try {
            let savedSchedule;
            if (scheduleToSave._id) {
                await api.updateSchedule(scheduleToSave._id, scheduleToSave);
                savedSchedule = scheduleToSave;
            } else {
                const { data: result } = await api.createSchedule(scheduleToSave);
                savedSchedule = result.schedule;
            }
            
            const assignmentsToSave = { ...assignments };
            
            Object.keys(assignmentsToSave).forEach(camId => {
                if (assignmentsToSave[camId] === (scheduleToSave._id || savedSchedule._id)) {
                    delete assignmentsToSave[camId];
                }
            });

            Object.keys(newAssignments).forEach(camId => {
                assignmentsToSave[camId] = savedSchedule._id;
            });

            await api.saveAssignments({ assignments: assignmentsToSave });

            loadInitialData();
            handleCloseWizard();
        } catch (error) {
            console.error("Failed to save:", error);
        }
    };
    
    const handleDeleteSchedule = async (scheduleId, scheduleName) => {
        if (window.confirm(`Are you sure you want to delete "${scheduleName}"?`)) {
            try {
                await api.deleteSchedule(scheduleId);
                loadInitialData();
                handleCloseWizard();
            } catch (error) {
                console.error("Failed to delete schedule:", error);
            }
        }
    };
    
    return (
        <div className="space-y-8 text-white">
            <h1 className="text-3xl font-bold">Monitoring Schedules</h1>
             <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-400 max-w-2xl">Create reusable schedules and assign cameras to them. Only cameras that are enabled for monitoring in 'Device Management' will appear in the assignment list.</p>
                    <button onClick={handleOpenCreateWizard} className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        <PlusCircle size={16} className="mr-2"/> Create New Schedule
                    </button>
                </div>

                {isLoading ? <p>Loading schedules...</p> : (
                    <div className="space-y-3">
                        {schedules.map(schedule => (
                            <div key={schedule._id} className="bg-gray-700/60 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{schedule.name}</p>
                                    <p className="text-sm text-gray-400">{Object.values(assignments).filter(id => id === schedule._id).length} camera(s) assigned</p>
                                </div>
                                <button onClick={() => handleOpenEditWizard(schedule)} className="flex items-center px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                                    <Pen size={14} className="mr-2"/> Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {isWizardOpen && (
                <ScheduleWizard
                    initialSchedule={editingSchedule}
                    onClose={handleCloseWizard}
                    onSave={handleSave}
                    onDelete={handleDeleteSchedule}
                    allAssignments={assignments}
                />
            )}
        </div>
    );
}

function ScheduleWizard({ initialSchedule, onClose, onSave, onDelete, allAssignments }) {
    const [step, setStep] = useState(1);
    const [schedule, setSchedule] = useState(initialSchedule);
    const [localAssignments, setLocalAssignments] = useState(() => {
        const relevant = {};
        if(initialSchedule._id) {
            for(const camId in allAssignments) {
                if(allAssignments[camId] === initialSchedule._id) {
                    relevant[camId] = initialSchedule._id;
                }
            }
        }
        return relevant;
    });

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleFinalSave = () => {
        onSave(schedule, localAssignments);
    };
    
    const title = initialSchedule._id ? "Edit Schedule" : "Create New Schedule";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{title}: <span className="text-blue-400">{schedule.name || '...'}</span></h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto">
                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between mb-1">
                            <span className={`text-sm font-medium ${step >= 1 ? 'text-blue-400' : 'text-gray-500'}`}>Details</span>
                            <span className={`text-sm font-medium ${step >= 2 ? 'text-blue-400' : 'text-gray-500'}`}>Time Blocks</span>
                            <span className={`text-sm font-medium ${step >= 3 ? 'text-blue-400' : 'text-gray-500'}`}>Assignments</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{width: `${((step - 1) / 2) * 100}%`}}></div>
                        </div>
                    </div>
                    
                    {step === 1 && <Step1_Details schedule={schedule} setSchedule={setSchedule} />}
                    {step === 2 && <Step2_TimeBlocks schedule={schedule} setSchedule={setSchedule} />}
                    {step === 3 && <Step3_Assignments schedule={schedule} allAssignments={allAssignments} localAssignments={localAssignments} setLocalAssignments={setLocalAssignments} />}
                </div>

                <div className="bg-gray-700/50 px-5 py-4 flex justify-between items-center">
                    <div>
                        {initialSchedule._id && <button onClick={() => onDelete(initialSchedule._id, initialSchedule.name)} className="flex items-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"><Trash2 size={16} className="mr-2"/> Delete</button>}
                    </div>
                    <div className="space-x-4">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">Cancel</button>
                        {step > 1 && <button onClick={handleBack} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">Back</button>}
                        {step < 3 && <button onClick={handleNext} disabled={!schedule.name} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500">Next</button>}
                        {step === 3 && <button onClick={handleFinalSave} className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"><Save size={16} className="mr-2"/> Save Schedule</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Step1_Details({ schedule, setSchedule }) {
    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Schedule Name</h3>
            <p className="text-sm text-gray-400 mb-2">Give this schedule a descriptive name (e.g., "Weekday Monitoring", "Overnight Security").</p>
            <input
                type="text"
                placeholder="Enter schedule name"
                className="w-full bg-gray-700 border-gray-600 rounded-md text-white"
                value={schedule.name}
                onChange={(e) => setSchedule({...schedule, name: e.target.value})}
                autoFocus
            />
        </div>
    );
}

function Step2_TimeBlocks({ schedule, setSchedule }) {
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [sourceDayIndex, setSourceDayIndex] = useState(null);

    const handleTimeBlockChange = (dayIndex, blockIndex, field, value) => {
        const newDays = {...schedule.days};
        if (!newDays[dayIndex]) newDays[dayIndex] = [];
        newDays[dayIndex][blockIndex][field] = value;
        setSchedule({...schedule, days: newDays});
    };

    const handleAddTimeBlock = (dayIndex) => {
        const newDays = {...schedule.days};
        if (!newDays[dayIndex]) newDays[dayIndex] = [];
        newDays[dayIndex].push({ startTime: '09:00', endTime: '17:00' });
        setSchedule({...schedule, days: newDays});
    };
    
    const handleRemoveTimeBlock = (dayIndex, blockIndex) => {
        const newDays = {...schedule.days};
        newDays[dayIndex].splice(blockIndex, 1);
        setSchedule({...schedule, days: newDays});
    };
    
    const handleSetAllDay = (dayIndex) => {
        const newDays = {...schedule.days};
        newDays[dayIndex] = [{ startTime: '00:00', endTime: '23:59' }];
        setSchedule({...schedule, days: newDays});
    };

    const openCopyModal = (dayIndex) => {
        setSourceDayIndex(dayIndex);
        setIsCopyModalOpen(true);
    };

    const handleCopy = (targetDayIndexes) => {
        const sourceBlocks = schedule.days[sourceDayIndex] || [];
        const newDays = {...schedule.days};
        targetDayIndexes.forEach(targetIndex => {
            newDays[targetIndex] = JSON.parse(JSON.stringify(sourceBlocks));
        });
        setSchedule({...schedule, days: newDays});
        setIsCopyModalOpen(false);
    };

    return (
        <div className="space-y-4">
            {DAYS_OF_WEEK.map((day, dayIndex) => {
                const dayBlocks = schedule.days[dayIndex] || [];
                const isAllDay = dayBlocks.length === 1 && dayBlocks[0].startTime === '00:00' && dayBlocks[0].endTime === '23:59';

                return(
                    <div key={dayIndex} className="border-t border-gray-700 pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{day}</h4>
                            <div className="flex items-center space-x-4">
                                <button onClick={() => handleSetAllDay(dayIndex)} className={`text-sm font-medium ${isAllDay ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>
                                    All Day
                                </button>
                                <button onClick={() => openCopyModal(dayIndex)} className="text-sm text-gray-400 hover:text-white flex items-center"><Copy size={14} className="mr-1"/> Copy to...</button>
                                <button onClick={() => handleAddTimeBlock(dayIndex)} disabled={isAllDay} className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed">+ Add Time Block</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {(schedule.days[dayIndex] || []).length === 0 && <p className="text-xs text-gray-500 pl-4">No monitoring scheduled for this day.</p>}
                            {(schedule.days[dayIndex] || []).map((block, blockIndex) => (
                                <div key={blockIndex} className="flex items-center space-x-2 pl-4">
                                    <input type="time" value={block.startTime} disabled={isAllDay} onChange={(e) => handleTimeBlockChange(dayIndex, blockIndex, 'startTime', e.target.value)} className="w-full bg-gray-900 border-gray-600 rounded-md p-1 text-sm disabled:opacity-50"/>
                                    <span className="text-gray-400">to</span>
                                    <input type="time" value={block.endTime} disabled={isAllDay} onChange={(e) => handleTimeBlockChange(dayIndex, blockIndex, 'endTime', e.target.value)} className="w-full bg-gray-900 border-gray-600 rounded-md p-1 text-sm disabled:opacity-50"/>
                                    <button onClick={() => handleRemoveTimeBlock(dayIndex, blockIndex)} disabled={isAllDay} className="text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed"><X size={20}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
            {isCopyModalOpen && <CopyTimeBlocksModal sourceDayIndex={sourceDayIndex} onCopy={handleCopy} onClose={() => setIsCopyModalOpen(false)} />}
        </div>
    );
}

function CopyTimeBlocksModal({ sourceDayIndex, onCopy, onClose }) {
    const [selectedDays, setSelectedDays] = useState([]);

    const toggleDay = (dayIndex) => {
        setSelectedDays(prev => 
            prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
        );
    };

    const handleConfirmCopy = () => {
        onCopy(selectedDays);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b border-gray-700">
                    <h3 className="text-lg font-semibold">Copy {DAYS_OF_WEEK[sourceDayIndex]}'s schedule</h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-400 mb-4">Select the days you want to apply this time schedule to.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {DAYS_OF_WEEK.map((day, index) => {
                            if (index === sourceDayIndex) return null;
                            return (
                                <button key={index} onClick={() => toggleDay(index)} className={`p-2 rounded-md text-sm text-left ${selectedDays.includes(index) ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {day}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="bg-gray-700/50 px-6 py-4 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">Cancel</button>
                    <button onClick={handleConfirmCopy} disabled={selectedDays.length === 0} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500">Copy</button>
                </div>
            </div>
        </div>
    );
}

function Step3_Assignments({ schedule, allAssignments, localAssignments, setLocalAssignments }) {
    const [monitoredDevices, setMonitoredDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const { data } = await api.getMonitoredDevices();
                setMonitoredDevices(data);
            } catch (error) {
                console.error("Failed to load monitored devices for assignments:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDevices();
    }, []);
    
    const allMonitoredCameras = monitoredDevices.flatMap(site => site.cameras.map(cam => ({...cam, siteName: site.name})));

    const assignedCameras = allMonitoredCameras.filter(cam => localAssignments[cam.id]);
    
    // --- FIX: Simplified the filter to only check against the current schedule's assignments ---
    const availableCameras = allMonitoredCameras.filter(cam => !localAssignments[cam.id]);

    const moveCamera = (cameraId, to) => {
        setLocalAssignments(prev => {
            const newAssignments = {...prev};
            if(to === 'assign') {
                newAssignments[cameraId] = schedule._id || 'new';
            } else {
                delete newAssignments[cameraId];
            }
            return newAssignments;
        });
    };

    if(loading) return <p>Loading cameras...</p>

    return (
        <div className="flex space-x-6 h-[50vh]">
            {/* Available Cameras Panel */}
            <div className="w-1/2 flex flex-col">
                <h3 className="text-lg font-semibold mb-2">Available Cameras</h3>
                <div className="bg-gray-900 rounded-lg p-3 flex-1 overflow-y-auto">
                    {availableCameras.map(cam => (
                        <div key={cam.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                            <div>
                                <p className="text-sm font-medium">{cam.name}</p>
                                <p className="text-xs text-gray-400">{cam.siteName}</p>
                            </div>
                            <button onClick={() => moveCamera(cam.id, 'assign')} className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white">
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Assigned Cameras Panel */}
            <div className="w-1/2 flex flex-col">
                <h3 className="text-lg font-semibold mb-2">Assigned to this Schedule</h3>
                <div className="bg-gray-900 rounded-lg p-3 flex-1 overflow-y-auto">
                     {assignedCameras.map(cam => (
                        <div key={cam.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                             <button onClick={() => moveCamera(cam.id, 'unassign')} className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white">
                                <ArrowLeft size={16} />
                            </button>
                            <div>
                                <p className="text-sm font-medium">{cam.name}</p>
                                <p className="text-xs text-gray-400">{cam.siteName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ScheduleManagementPage;