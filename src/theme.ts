import {
  Briefcase,
  Zap,
  Wind,
  HardHat,
  Wrench,
  Paintbrush,
  Flame,
  Droplet,
  Truck,
  type LucideIcon
} from 'lucide-react';

export interface ThemeConfig {
  id: string;             // e.g. "blue"
  name: string;           // e.g. "Blue"
  hexColor: string;       // e.g. "#3b82f6" (used for default contractor avatar preview)
  activeBg: string;
  activeText: string;
  activeBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  resizeBar: string;
  Icon: LucideIcon;
}

export const THEMES: Record<string, ThemeConfig> = {
  slate: {
    id: 'slate', name: 'Slate (Default)',
    hexColor: '#64748b',
    activeBg: 'bg-slate-100', activeText: 'text-slate-800', activeBorder: 'border-slate-300',
    badgeBg: 'bg-slate-200',  badgeText: 'text-slate-700',  badgeBorder: 'border-slate-300',
    resizeBar: 'bg-slate-400',
    Icon: Briefcase,
  },
  blue: {
    id: 'blue', name: 'Blue',
    hexColor: '#3b82f6',
    activeBg: 'bg-blue-100', activeText: 'text-blue-800', activeBorder: 'border-blue-300',
    badgeBg: 'bg-blue-200',  badgeText: 'text-blue-800',  badgeBorder: 'border-blue-300',
    resizeBar: 'bg-blue-400',
    Icon: Wind,
  },
  green: {
    id: 'green', name: 'Green',
    hexColor: '#22c55e',
    activeBg: 'bg-green-100', activeText: 'text-green-800', activeBorder: 'border-green-300',
    badgeBg: 'bg-green-200',  badgeText: 'text-green-800',  badgeBorder: 'border-green-300',
    resizeBar: 'bg-green-400',
    Icon: Zap,
  },
  orange: {
    id: 'orange', name: 'Orange',
    hexColor: '#f97316',
    activeBg: 'bg-orange-100', activeText: 'text-orange-900', activeBorder: 'border-orange-400',
    badgeBg: 'bg-orange-200',  badgeText: 'text-orange-800',  badgeBorder: 'border-orange-300',
    resizeBar: 'bg-orange-400',
    Icon: Wrench,
  },
  red: {
    id: 'red', name: 'Red',
    hexColor: '#ef4444',
    activeBg: 'bg-red-100', activeText: 'text-red-900', activeBorder: 'border-red-300',
    badgeBg: 'bg-red-200',  badgeText: 'text-red-800',  badgeBorder: 'border-red-300',
    resizeBar: 'bg-red-400',
    Icon: Flame,
  },
  purple: {
    id: 'purple', name: 'Purple',
    hexColor: '#a855f7',
    activeBg: 'bg-purple-100', activeText: 'text-purple-900', activeBorder: 'border-purple-300',
    badgeBg: 'bg-purple-200',  badgeText: 'text-purple-800',  badgeBorder: 'border-purple-300',
    resizeBar: 'bg-purple-400',
    Icon: Paintbrush,
  },
  cyan: {
    id: 'cyan', name: 'Cyan',
    hexColor: '#06b6d4',
    activeBg: 'bg-cyan-100', activeText: 'text-cyan-900', activeBorder: 'border-cyan-300',
    badgeBg: 'bg-cyan-200',  badgeText: 'text-cyan-800',  badgeBorder: 'border-cyan-300',
    resizeBar: 'bg-cyan-400',
    Icon: Droplet,
  },
  yellow: {
    id: 'yellow', name: 'Yellow',
    hexColor: '#eab308',
    activeBg: 'bg-yellow-100', activeText: 'text-yellow-900', activeBorder: 'border-yellow-300',
    badgeBg: 'bg-yellow-200',  badgeText: 'text-yellow-800',  badgeBorder: 'border-yellow-300',
    resizeBar: 'bg-yellow-400',
    Icon: HardHat,
  },
  indigo: {
    id: 'indigo', name: 'Indigo',
    hexColor: '#6366f1',
    activeBg: 'bg-indigo-100', activeText: 'text-indigo-900', activeBorder: 'border-indigo-300',
    badgeBg: 'bg-indigo-200',  badgeText: 'text-indigo-800',  badgeBorder: 'border-indigo-300',
    resizeBar: 'bg-indigo-400',
    Icon: Truck,
  }
};

export function getTheme(themeId: string): ThemeConfig {
  return THEMES[themeId] || THEMES.slate;
}
