'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, ResearchPaper } from '@/lib/types';
import { Send, Bot, User, Mic, Square } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

interface ConversationInterfaceProps {
    initialContext?: { papers?: ResearchPaper[], query?: string };
}

export default function ConversationInterface({ initialContext }: ConversationInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: initialContext?.papers && initialContext.papers.length > 0
                ? `I found ${initialContext.papers.length} papers relating to "${initialContext.query}". How can I help you explore them?`
                : "Hello! I'm your Research Assistant. Ask me to find papers or discuss a topic.",
            timestamp: Date.now(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showVoice, setShowVoice] = useState(false);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (content: string) => {
        if (!content.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);
        setShowVoice(false);

        try {
            const response = await fetch('/api/conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
                    context: initialContext
                }),
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content,
                timestamp: Date.now(),
                relatedPapers: data.relatedPapers,
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: "Sorry, I encountered an error responding to that.",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleVoiceInput = async (audioBlob: Blob) => {
        // Ideally we transcribe this first or send audio to conversation API
        // For now, simpler implementation: Transcribe via existing voice API then send text
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice_chat.webm');

            const res = await fetch('/api/search/voice', { // Reusing voice endpoint for transcription mostly
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.transcript) {
                handleSend(data.transcript);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-900/80 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-white">Research Assistant</h3>
                    <p className="text-xs text-slate-400">Powered by GPT-4</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map(m => (
                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${m.role === 'user' ? 'bg-purple-500/20' : m.role === 'system' ? 'bg-red-500/20' : 'bg-indigo-500/20'}
            `}>
                            {m.role === 'user' ? <User className="w-5 h-5 text-purple-400" /> : <Bot className="w-5 h-5 text-indigo-400" />}
                        </div>
                        <div className={`
              max-w-[80%] rounded-2xl p-4
              ${m.role === 'user'
                                ? 'bg-purple-600/20 text-purple-100 rounded-tr-sm'
                                : m.role === 'system'
                                    ? 'bg-red-900/20 text-red-200 border border-red-500/20'
                                    : 'bg-slate-800/80 text-slate-200 rounded-tl-sm'
                            }
            `}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="bg-slate-800/80 rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-900/80">
                {showVoice ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <p className="text-sm text-slate-400">Speak your question...</p>
                        <VoiceRecorder onRecordingComplete={handleVoiceInput} />
                        <button onClick={() => setShowVoice(false)} className="text-sm text-slate-500 hover:text-white underline">Cancel</button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowVoice(true)}
                            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                            placeholder="Ask a follow-up question..."
                            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button
                            onClick={() => handleSend(input)}
                            disabled={!input.trim() || isThinking}
                            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
