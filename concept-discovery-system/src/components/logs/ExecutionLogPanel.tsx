import clsx from 'clsx';
import type { AppPhase, LogEntry } from '@/types';

interface ExecutionLogPanelProps {
  logs: LogEntry[];
  phase: AppPhase;
}

export function ExecutionLogPanel({ logs, phase }: ExecutionLogPanelProps) {
  return (
    <section className="glass-panel rounded-xl border border-white/10 overflow-hidden">
      <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
          Execution logs
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">
          {phase.replaceAll('_', ' ')}
        </span>
      </header>

      <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-2 font-mono text-[11px]">
        {logs.length === 0 ? (
          <p className="text-slate-500 italic">No logs yet.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={clsx(
                'leading-relaxed',
                log.type === 'error' && 'text-rose-300',
                log.type === 'warning' && 'text-amber-200',
                log.type === 'success' && 'text-emerald-200',
                log.type === 'info' && 'text-slate-200'
              )}
            >
              <span className="text-slate-500 mr-2">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

