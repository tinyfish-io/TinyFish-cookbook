"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Link as LinkIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Globe, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function InventoryInput({ onInventoryLoaded }) {
    const [mode, setMode] = useState("file"); // 'file' or 'url'
    const [url, setUrl] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [activeSource, setActiveSource] = useState(null); // { type: 'file' | 'url', name: '...' }

    // --- File Upload Logic ---
    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                // Simple pseudo-parsing for demo authenticity
                // In production, use a library like PapaParse
                const text = reader.result;
                const lineCount = text.split('\n').filter(line => line.trim().length > 0).length;
                const estimatedCount = Math.max(0, lineCount - 1); // Subtract header if CSV

                const sourceData = {
                    type: 'file',
                    name: file.name,
                    count: estimatedCount,
                    timestamp: new Date().toLocaleTimeString()
                };

                setActiveSource(sourceData);
                onInventoryLoaded(sourceData);
                toast({
                    title: "Manifest Loaded",
                    description: `Successfully parsed ${estimatedCount} items from ${file.name}`
                });
            } catch (err) {
                toast({ title: "Parse Error", description: "Could not read file format.", variant: "destructive" });
            }
        };

        reader.onerror = () => {
            toast({
                title: "File Read Error",
                description: "Failed to read the file. Please try again.",
                variant: "destructive"
            });
        };

        // Unified read call
        reader.readAsText(file);
    }, [onInventoryLoaded]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/json': ['.json']
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    // --- URL Logic ---
    const handleConnectUrl = (e) => {
        e.preventDefault();
        if (!url) return;

        setIsConnecting(true);

        // Simulate a legitimate connection check
        const timer = setTimeout(() => {
            setIsConnecting(false);
            const sourceData = {
                type: 'url',
                name: url,
                count: Math.floor(Math.random() * 5000) + 500, // Mock count
                inventory: [] // In real app, would fetch
            };
            onInventoryLoaded(sourceData);
            toast({
                title: "Connection Successful",
                description: `Successfully indexed ${sourceData.count} items from ${new URL(url).hostname}`,
            });
        }, 1500);

        return () => clearTimeout(timer);
    };

    const handleClear = () => {
        setActiveSource(null);
        setUrl("");
        onInventoryLoaded(null);
    };

    return (
        <div className="mb-8 rounded-2xl border border-primary/20 bg-background/50 backdrop-blur-sm overflow-hidden shadow-lg shadow-primary/5">
            {/* Header / Tabs */}
            <div className="flex items-center border-b border-primary/10">
                <button
                    onClick={() => setMode("file")}
                    role="tab"
                    aria-selected={mode === 'file'}
                    className={cn(
                        "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                        mode === 'file' ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-primary/5"
                    )}
                >
                    Upload Manifest
                </button>
                <div className="w-[1px] h-full bg-primary/10" />
                <button
                    onClick={() => setMode("url")}
                    role="tab"
                    aria-selected={mode === 'url'}
                    className={cn(
                        "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                        mode === 'url' ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-primary/5"
                    )}
                >
                    Connect Feed
                </button>
            </div>

            <div className="p-6">
                <AnimatePresence mode="wait">
                    {activeSource ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/20"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center border border-success/20">
                                    {activeSource.type === 'file' ? (
                                        <FileSpreadsheet className="h-5 w-5 text-success" />
                                    ) : (
                                        <Globe className="h-5 w-5 text-success" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">{activeSource.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Status: <span className="text-success font-bold">Active Source</span> • {activeSource.type === 'file' ? `${activeSource.count} items` : 'Live Stream'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClear}
                                className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {mode === "file" ? (
                                <div
                                    {...getRootProps()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                                        isDragActive
                                            ? "border-primary bg-primary/5 scale-[0.99]"
                                            : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
                                    )}
                                >
                                    <input {...getInputProps()} />
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <UploadCloud className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-bold text-foreground mb-1">
                                        {isDragActive ? "Drop manifest here" : "Drag & drop inventory file"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Support for .CSV, .JSON (Max 50MB)
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleConnectUrl} className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="url"
                                            placeholder="https://myshop.com/inventory-feed or Google Sheet Link"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-primary/10 bg-background text-sm focus:outline-none focus:border-primary/50 shadow-inner font-mono"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isConnecting}
                                        className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-70"
                                    >
                                        {isConnecting ? (
                                            <>Connecting...</>
                                        ) : (
                                            <>Connect Feed</>
                                        )}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
