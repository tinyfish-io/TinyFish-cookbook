'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, FastForward, Loader2, Download } from 'lucide-react';

interface AudioPlayerProps {
    src?: string;
    title?: string;
    onGenerate?: () => void;
    isGenerating?: boolean;
}

export default function AudioPlayer({ src, title, onGenerate, isGenerating }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (src && audioRef.current) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    }, [src]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            setProgress((current / duration) * 100);
        }
    };

    const skipForward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime += 15;
        }
    };

    if (!src && !isGenerating && !onGenerate) return null;

    return (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-slate-200 line-clamp-1">{title || 'Audio Summary'}</h4>
                {!src && !isGenerating && onGenerate && (
                    <button onClick={onGenerate} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1">
                        <Play className="w-3 h-3" /> Generate Audio
                    </button>
                )}
            </div>

            {isGenerating && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating AI Summary...
                </div>
            )}

            {src && (
                <>
                    <audio
                        ref={audioRef}
                        src={src}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                    />

                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center text-white transition-all">
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                        </button>

                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>

                        <button onClick={skipForward} className="text-slate-400 hover:text-white transition-colors">
                            <FastForward className="w-5 h-5" />
                        </button>

                        <a href={src} download="summary.mp3" className="text-slate-400 hover:text-white transition-colors">
                            <Download className="w-5 h-5" />
                        </a>
                    </div>
                </>
            )}
        </div>
    );
}
