import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../api.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

function CameraView({ camera, isFocused, siteName, isAlerting }) {
    const videoRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryAttempt, setRetryAttempt] = useState(0);
    const retryTimeoutRef = useRef(null);
    
    const restartStream = () => {
        setRetryAttempt(prev => prev + 1);
    };

    useEffect(() => {
        let pc; // RTCPeerConnection
        let isMounted = true;
        const videoElement = videoRef.current;
        const pathName = `camera_${camera.id}`;

        const cleanup = () => {
            isMounted = false;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            if (pc) {
                pc.onconnectionstatechange = null;
                pc.ontrack = null;
                pc.close();
            }
            if (videoElement) {
                videoElement.srcObject = null;
            }
        };

        const startStream = async () => {
            if (!videoElement) return;

            cleanup();
            isMounted = true;
            setIsLoading(true);
            setError(null);
            
            const startTime = performance.now();
            console.log(`[${camera.name}] Attempting to start stream (Attempt: ${retryAttempt + 1})...`);
            
            try {
                const rtspRes = await api.getRtspUrl(camera.id);
                if (!isMounted || !rtspRes.data.ret.play_url) {
                    throw new Error("RTSP URL not provided by API.");
                }
                const rtspUrl = rtspRes.data.ret.play_url;

                await api.startMediaMTXStream(pathName, rtspUrl);

                await delay(250);

                pc = new RTCPeerConnection();

                pc.ontrack = (event) => {
                    if (videoElement.srcObject !== event.streams[0]) {
                        videoElement.srcObject = event.streams[0];
                    }
                };
                
                pc.onconnectionstatechange = () => {
                    if (!isMounted || !pc) return;
                    console.log(`[${camera.name}] WebRTC Connection State: ${pc.connectionState}`);

                    if (pc.connectionState === 'connected') {
                        const endTime = performance.now();
                        const loadTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
                        console.log(`[${camera.name}] WebRTC connection established in ${loadTimeInSeconds} seconds.`);
                        setIsLoading(false);
                    } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                        console.log(`[${camera.name}] Stream disconnected. Scheduling retry...`);
                        setError('Stream interrupted. Retrying...');
                        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                        retryTimeoutRef.current = setTimeout(() => {
                            if (isMounted) {
                                setRetryAttempt(prev => prev + 1);
                            }
                        }, 5000); // Retry after 5 seconds
                    }
                };

                pc.addTransceiver('video', { 'direction': 'recvonly' });
                pc.addTransceiver('audio', { 'direction': 'recvonly' });

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const answerSdp = await api.startWhepsession(pathName, pc.localDescription.sdp);
                
                await pc.setRemoteDescription({
                    type: 'answer',
                    sdp: answerSdp,
                });
                
            } catch (err) {
                console.error(`[${camera.name}] Failed to start WebRTC stream:`, err);
                if (isMounted) {
                    const errorMessage = err.response?.data?.message || 'Could not load camera feed.';
                    setError(errorMessage);
                    setIsLoading(false);
                }
            }
        };

        startStream();

        return cleanup;
    }, [camera.id, retryAttempt]);

    const borderClass = isAlerting ? 'ring-4 ring-red-500 animate-pulse' : 'ring-1 ring-gray-700';
    const containerClasses = isFocused 
        ? "w-full h-full bg-black flex flex-col items-center justify-center" 
        : `w-full h-full bg-black rounded-lg flex flex-col items-center justify-center relative overflow-hidden ${borderClass}`;
    
    const videoClasses = "w-full h-full object-contain";
    const cameraDisplayName = siteName ? `${siteName} - ${camera.name}` : camera.name;

    return (
        <div className={containerClasses}>
            <div className={`w-full flex-1 relative ${isFocused ? 'h-full' : 'aspect-video'} flex items-center justify-center`}>
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-50">
                        <Loader2 className="animate-spin h-8 w-8 mb-2" />
                        <span>Loading...</span>
                    </div>
                )}
                {error && !isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-50 p-2">
                        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                        <span className="text-center text-sm">{error}</span>
                        <button onClick={restartStream} className="mt-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-xs flex items-center">
                            <RefreshCw size={12} className="mr-1" />
                            Retry Now
                        </button>
                    </div>
                )}
                <video ref={videoRef} className={videoClasses} style={{ display: isLoading || error ? 'none' : 'block' }} autoPlay muted playsInline></video>
                {!isFocused && (
                    <div className="absolute bottom-0 left-0 w-full p-2 bg-black bg-opacity-50">
                        <p className="text-white text-xs truncate">{cameraDisplayName}</p>
                    </div>
                )}
            </div>
             {isFocused && <h3 className="text-lg font-semibold mt-2 text-white">{cameraDisplayName}</h3>}
        </div>
    );
}

export default CameraView;