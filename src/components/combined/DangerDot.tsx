'use client';

import { DangerLevel, DANGER_COLORS } from '@/types/forecast';

interface DangerDotProps {
  level: DangerLevel;
  size?: 'sm' | 'md';
}

export function DangerDot({ level, size = 'md' }: DangerDotProps) {
  const dimensions = {
    sm: 12,
    md: 16,
  };

  const dim = dimensions[size];

  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: dim,
        height: dim,
        backgroundColor: DANGER_COLORS[level],
        border: level === 2 ? '1px solid #d4d400' : undefined, // Subtle border for yellow
      }}
      title={`Danger Level ${level}`}
    />
  );
}
