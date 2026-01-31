'use client';

import { useState, useEffect, useCallback } from 'react';

// Define the SpeechRecognition type interfaces locally since they aren't part of standard TS lib yet
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
    interface Window {
        SpeechRecognition: { new(): SpeechRecognition };
        webkitSpeechRecognition: { new(): SpeechRecognition };
    }
}

export interface VoiceCommand {
    phrases: string[];
    action: () => void;
    description: string;
}

export function useVoiceCommands(commands: VoiceCommand[]) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastCommand, setLastCommand] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                setIsSupported(true);
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';
                setSpeechRecognition(recognition);
            } else {
                setError('Voice recognition not supported in this browser');
            }
        }
    }, []);

    const processCommand = useCallback((text: string) => {
        const lowerText = text.toLowerCase().trim();

        // Check against registered commands
        for (const cmd of commands) {
            if (cmd.phrases.some(phrase => lowerText.includes(phrase.toLowerCase()))) {
                console.log(`Executing command: ${cmd.description}`);
                setLastCommand(cmd.description);
                cmd.action();
                return true;
            }
        }
        return false;
    }, [commands]);

    useEffect(() => {
        if (!speechRecognition) return;

        speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            setTranscript(interimTranscript || finalTranscript);

            if (finalTranscript) {
                processCommand(finalTranscript);
                // Clear transcript after a short delay to allow visual feedback
                setTimeout(() => setTranscript(''), 2000);
            }
        };

        speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error', event.error);
            setError(`Speech error: ${event.error}`);
            setIsListening(false);
        };

        speechRecognition.onend = () => {
            if (isListening) {
                // Auto-restart if it was meant to be listening (persistent co-pilot)
                try {
                    speechRecognition.start();
                } catch (e) {
                    setIsListening(false);
                }
            }
        };

    }, [speechRecognition, isListening, processCommand]);

    const startListening = useCallback(() => {
        if (speechRecognition) {
            try {
                speechRecognition.start();
                setIsListening(true);
                setError(null);
            } catch (e) {
                console.error(e);
            }
        }
    }, [speechRecognition]);

    const stopListening = useCallback(() => {
        if (speechRecognition) {
            speechRecognition.stop();
            setIsListening(false);
        }
    }, [speechRecognition]);

    return {
        isListening,
        transcript,
        lastCommand,
        error,
        isSupported,
        startListening,
        stopListening
    };
}
