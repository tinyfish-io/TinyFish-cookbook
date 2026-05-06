import fs from 'fs';
import path from 'path';

let currentHistoryFile = path.join(process.cwd(), 'data', 'history.json');

function ensureDirectory(filePath: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch {
            return false;
        }
    }
    return true;
}

export interface HistoricalSnapshot {
    timestamp: string;
    lifecycle_status: string;
    lead_time_weeks?: number;
    moq?: number;
    availability?: string;
    risk_score?: number;
}

export function saveSnapshot(partNumber: string, snapshot: HistoricalSnapshot) {
    const attemptSave = (file: string) => {
        ensureDirectory(file);
        let data: Record<string, { snapshots?: HistoricalSnapshot[] }> = {};
        if (fs.existsSync(file)) {
            try {
                data = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, { snapshots?: HistoricalSnapshot[] }>;
            } catch {
                data = {};
            }
        }

        if (!data[partNumber]) data[partNumber] = { snapshots: [] };
        const snapshots: HistoricalSnapshot[] = data[partNumber].snapshots || [];
        const last = snapshots[snapshots.length - 1];
        if (last?.timestamp === snapshot.timestamp) {
            snapshots[snapshots.length - 1] = snapshot;
        } else {
            snapshots.push(snapshot);
        }
        const seen = new Set<string>();
        const deduped: HistoricalSnapshot[] = [];
        for (let i = snapshots.length - 1; i >= 0; i--) {
            const ts = snapshots[i]?.timestamp;
            if (!ts || seen.has(ts)) continue;
            seen.add(ts);
            deduped.unshift(snapshots[i]);
        }
        data[partNumber].snapshots = deduped;
        if (data[partNumber].snapshots.length > 10) {
            data[partNumber].snapshots = data[partNumber].snapshots.slice(-10);
        }

        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        currentHistoryFile = file;
        return true;
    };

    try {
        attemptSave(currentHistoryFile);
    } catch {
        // If write fails (e.g. EROFS), fallback to /tmp
        const tmpFile = path.join('/tmp', 'history.json');
        if (currentHistoryFile !== tmpFile) {
            try {
                attemptSave(tmpFile);
            } catch (innerError) {
                // Silently fail as we are in a read-only environment
                console.error("Critical: Could not save to /tmp either", innerError);
            }
        }
    }
}

export function getHistory(partNumber: string): HistoricalSnapshot[] {
    const files = [currentHistoryFile, path.join('/tmp', 'history.json'), path.join(process.cwd(), 'data', 'history.json')];
    for (const file of files) {
        if (fs.existsSync(file)) {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, { snapshots?: HistoricalSnapshot[] }>;
                return data[partNumber]?.snapshots || [];
            } catch {
                continue;
            }
        }
    }
    return [];
}

export function getLastSnapshot(partNumber: string): HistoricalSnapshot | null {
    const history = getHistory(partNumber);
    return history.length > 0 ? history[history.length - 1] : null;
}
