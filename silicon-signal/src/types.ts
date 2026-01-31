export interface RiskAnalysis {
    score: number;
    level: string;
    reasoning: string;
}

export interface ScanResult {
    part_number: string;
    manufacturer: string;
    lifecycle_status: string;

    // New SiliconSignal Fields
    lead_time_weeks?: number;
    lead_time_days?: number;
    moq?: number;
    availability?: string;
    timestamp: string;

    last_time_buy_date?: string;
    pcn_summary?: string;
    risk: RiskAnalysis;
    evidence_links: string[];

    // Tinyfish (Mino) Agent Extensions
    price_estimate?: string;
    sources?: string[];
    sources_checked?: string[];
    sources_blocked?: string[];
    source_signals?: SourceSignal[];
    signals?: SignalSummary;
    confidence?: ConfidenceInfo;
    scanned_at?: string;
    scan_duration_ms?: number;
    scan_timed_out?: boolean;
    agent_logs?: string[];
    history?: { timestamp: string; score: number }[];
}

export interface SourceSignal {
    name: string;
    url: string;
    ok: boolean;
    blocked: boolean;
    availability?: string;
    lifecycle_status?: string;
    lead_time_weeks?: number;
    price_estimate?: string;
}

export interface SignalSummary {
    availability: string;
    lifecycle_status: string;
    lead_time_weeks?: number;
    price_estimate?: string;
}

export interface ConfidenceInfo {
    score: number;
    level: string;
    sources: number;
    signals: number;
}
