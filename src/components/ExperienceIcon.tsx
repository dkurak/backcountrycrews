import { ExperienceLevel } from '@/lib/constants';

interface ExperienceIconProps {
  level: ExperienceLevel;
  size?: 'sm' | 'lg';
  variant?: 'default' | 'light'; // 'light' for use on dark backgrounds
}

export function ExperienceIcon({ level, size = 'sm', variant = 'default' }: ExperienceIconProps) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  // For advanced/expert diamonds on dark backgrounds, use white
  const diamondColor = variant === 'light' ? 'text-white' : 'text-black';

  switch (level) {
    case 'beginner':
      // Green circle
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" className="text-green-500" />
        </svg>
      );
    case 'intermediate':
      // Blue square
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="2" width="20" height="20" className="text-blue-500" />
        </svg>
      );
    case 'advanced':
      // Black diamond
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L22 12L12 22L2 12L12 2Z" className={diamondColor} />
        </svg>
      );
    case 'expert':
      // Double black diamond (two side-by-side diamonds, tightly spaced)
      return (
        <span className="inline-flex -space-x-1">
          <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L22 12L12 22L2 12L12 2Z" className={diamondColor} />
          </svg>
          <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L22 12L12 22L2 12L12 2Z" className={diamondColor} />
          </svg>
        </span>
      );
  }
}
