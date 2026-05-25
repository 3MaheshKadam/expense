import React from 'react';
import { 
  Briefcase, 
  Utensils, 
  Home, 
  Car, 
  Sparkles, 
  PiggyBank, 
  TrendingUp, 
  Users, 
  Scale, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2, 
  Plus, 
  Search, 
  LogOut, 
  Sun, 
  Moon, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ArrowRightLeft, 
  ShieldCheck, 
  AlertCircle, 
  Edit, 
  UserCheck, 
  Smile, 
  DollarSign as DefaultIcon 
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Briefcase,
  Utensils,
  Home,
  Car,
  Sparkles,
  PiggyBank,
  TrendingUp,
  Users,
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Plus,
  Search,
  LogOut,
  Sun,
  Moon,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  ShieldCheck,
  AlertCircle,
  Edit,
  UserCheck,
  Smile
};

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export default function DynamicIcon({ name, className, size = 18 }: DynamicIconProps) {
  const IconComponent = iconMap[name] || DefaultIcon;
  return <IconComponent className={className} size={size} />;
}

export const AVAILABLE_ICONS = [
  'Briefcase',
  'Utensils',
  'Home',
  'Car',
  'Sparkles',
  'PiggyBank',
  'TrendingUp',
  'Users',
  'Scale',
  'ArrowUpRight',
  'ArrowDownLeft',
  'Clock',
  'Smile'
];
