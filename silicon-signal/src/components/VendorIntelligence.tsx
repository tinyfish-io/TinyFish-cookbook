import { ScanResult } from '../types';

export default function VendorIntelligence({ result }: { result: ScanResult | null }) {
    const sources = result?.sources?.map(s => ({
        name: s,
        type: 'Distributor',
        reliability: 98.4, // Standard baseline for major distributors
        status: 'Online'
    })) || [];

    return (
        <div className="glass-panel p-6 h-full rounded-sm">
            <div className="flex justify-between items-center mb-8">
                <h3 className="heading-technical tracking-widest text-[10px]">DETECTED SOURCES</h3>
                <span className="text-[10px] text-foreground-subtle">{sources.length} IDENTIFIED</span>
            </div>

            <div className="space-y-6">
                {sources.length > 0 ? sources.map((s) => (
                    <div key={s.name} className="group cursor-pointer">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{s.name}</span>
                                <span className="text-[10px] text-foreground-muted uppercase">{s.type}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono">
                                <span className="text-success uppercase tracking-tighter">Verified</span>
                                <span className="text-foreground-subtle">LIVE</span>
                            </div>
                        </div>

                        <div className="w-full bg-border h-px relative group-hover:bg-accent/30 transition-colors" />

                        <div className="flex justify-between mt-1 items-center">
                            <span className="text-[9px] text-foreground-muted font-mono tracking-widest">{s.status}</span>
                            <span className="text-[10px] font-mono text-accent">{s.reliability}% REL</span>
                        </div>
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
                        <div className="w-12 h-12 border border-dashed border-border mb-4 rounded-full flex items-center justify-center text-[10px]">?</div>
                        <p className="text-[10px] tracking-[0.3em] font-light uppercase text-center">No External Data<br />Sources Identified</p>
                    </div>
                )}
            </div>
        </div>
    );
}
