import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export const AVAILABLE_ICONS = [
  'Brain',
  'Dumbbell',
  'Zap',
  'BookOpen',
  'Droplets',
  'PiggyBank',
  'Target',
  'Award',
  'Flame',
  'Activity',
  'Sparkles',
  'Heart',
  'Sun',
  'Smile',
  'Compass',
  'CheckSquare',
  'Clock',
  'Coffee',
  'Shield',
  'Star'
];

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-5 h-5', size }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as any)[name] || Icons.CheckCircle2;
  return <IconComponent className={className} size={size} />;
};
