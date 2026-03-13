export default function ScoreCircle({
  score,
  grade,
  gradeColor,
  size = 200,
}: {
  score: number;
  grade: string;
  gradeColor: string;
  size?: number;
}) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="score-ring" style={{ ["--glow-color" as string]: gradeColor }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1F2937"
          strokeWidth="8"
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-5xl font-bold" style={{ color: gradeColor }}>
          {score}
        </span>
        <span className="text-sm text-gray-400 mt-1">{grade}</span>
      </div>
    </div>
  );
}
