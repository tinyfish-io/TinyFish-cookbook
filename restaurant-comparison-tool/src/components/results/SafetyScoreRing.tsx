import { motion } from 'framer-motion';
import { getScoreLabel } from '@/lib/score-calculator';

interface SafetyScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: 80, stroke: 6, fontSize: 'text-lg', labelSize: 'text-[10px]' },
  md: { width: 110, stroke: 8, fontSize: 'text-2xl', labelSize: 'text-xs' },
  lg: { width: 140, stroke: 10, fontSize: 'text-3xl', labelSize: 'text-sm' },
};

function getScoreRingColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

export function SafetyScoreRing({ score, size = 'md' }: SafetyScoreRingProps) {
  const config = SIZES[size];
  const radius = (config.width - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreRingColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: config.width, height: config.width }}>
        <svg
          width={config.width}
          height={config.width}
          className="-rotate-90"
        >
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-muted/50"
          />
          <motion.circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.fontSize} font-bold`} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className={`${config.labelSize} font-medium text-muted-foreground`}>
        {getScoreLabel(score)}
      </span>
    </div>
  );
}
