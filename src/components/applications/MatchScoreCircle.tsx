import { useEffect, useState } from 'react';

interface MatchScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const MatchScoreCircle = ({ score, size = 'md' }: MatchScoreCircleProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  const sizeConfig = {
    sm: { wrapper: 'w-12 h-12', text: 'text-sm', stroke: 4 },
    md: { wrapper: 'w-16 h-16', text: 'text-lg', stroke: 4 },
    lg: { wrapper: 'w-20 h-20', text: 'text-xl', stroke: 5 },
  };

  const config = sizeConfig[size];
  const radius = size === 'sm' ? 20 : size === 'md' ? 28 : 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  // Color based on score
  const getScoreColor = () => {
    if (score >= 80) return 'hsl(var(--primary))'; // Mint for high
    if (score >= 60) return 'hsl(var(--accent))'; // Purple for medium
    return 'hsl(var(--muted-foreground))'; // Muted for low
  };

  return (
    <div className={`relative ${config.wrapper} flex items-center justify-center`}>
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full blur-md opacity-40 animate-pulse"
        style={{ backgroundColor: getScoreColor() }}
      />
      
      {/* SVG Circle */}
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={config.stroke}
        />
        {/* Progress circle */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={getScoreColor()}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${getScoreColor()})`,
          }}
        />
      </svg>

      {/* Score text */}
      <span 
        className={`relative z-10 font-bold ${config.text}`}
        style={{ color: getScoreColor() }}
      >
        {animatedScore}%
      </span>
    </div>
  );
};

export default MatchScoreCircle;
