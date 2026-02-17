import clsx from 'clsx';

interface RiskBadgeProps {
    level: string;
    score: number;
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
    const colors: Record<string, string> = {
        LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };

    const colorClass = colors[level] || colors.MEDIUM;

    return (
        <div className={clsx("flex items-center gap-2 px-3 py-1 rounded-full border w-fit", colorClass)}>
            <span className="font-semibold text-xs tracking-wider">{level} RISK</span>
            <span className="text-xs opacity-75 border-l border-current pl-2">{score}</span>
        </div>
    );
}
