'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { AudioRecorder, formatDuration, checkMicrophoneSupport } from '@/lib/audio-utils';

interface VoiceRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void;
    disabled?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, disabled }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [isSupported, setIsSupported] = useState(true);
    const recorderRef = useRef<AudioRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsSupported(checkMicrophoneSupport());
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            recorderRef.current?.cancelRecording();
        };
    }, []);

    const startRecording = async () => {
        try {
            recorderRef.current = new AudioRecorder();
            await recorderRef.current.startRecording();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            alert('Failed to access microphone. Please grant permission and try again.');
            console.error(error);
        }
    };

    const stopRecording = async () => {
        if (!recorderRef.current) return;

        try {
            const audioBlob = await recorderRef.current.stopRecording();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            onRecordingComplete(audioBlob);
            setDuration(0);
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    };

    if (!isSupported) {
        return (
            <div className="text-center text-slate-400 text-sm">
                Voice recording is not supported in your browser
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled}
                className={`
          relative group w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
          ${isRecording
                        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50 animate-pulse'
                        : 'bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/50 hover:scale-110'
                    }
        `}
            >
                {isRecording ? (
                    <Square className="w-8 h-8 text-white" fill="white" />
                ) : (
                    <Mic className="w-8 h-8 text-white" />
                )}

                {isRecording && (
                    <div className="absolute -inset-1 rounded-full border-2 border-red-400 animate-ping opacity-75" />
                )}
            </button>

            {isRecording && (
                <div className="flex flex-col items-center gap-2">
                    <div className="text-white font-mono text-xl font-bold">
                        {formatDuration(duration)}
                    </div>
                    <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="w-1 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-full animate-pulse"
                                style={{
                                    height: `${Math.random() * 20 + 10}px`,
                                    animationDelay: `${i * 0.1}s`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {!isRecording && (
                <p className="text-slate-400 text-sm">
                    Click to record your research query
                </p>
            )}
        </div>
    );
}
