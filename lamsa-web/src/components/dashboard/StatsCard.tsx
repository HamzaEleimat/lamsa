'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  icon: string;
  value: string;
  label: string;
  change: string;
  changeType: 'increase' | 'decrease';
  changeText: string;
  iconBgColor: string;
  gradientFrom: string;
  gradientTo: string;
}

export function StatsCard({
  icon,
  value,
  label,
  change,
  changeType,
  changeText,
  iconBgColor,
  gradientFrom,
  gradientTo,
}: StatsCardProps) {
  const isIncrease = changeType === 'increase';
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;

  return (
    <div className="relative bg-white rounded-lg shadow-sm border hover:-translate-y-1 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Top Gradient Border */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`
        }}
      />
      
      <div className="p-6">
        {/* Icon and Value Row */}
        <div className="flex items-start justify-between mb-4">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            style={{ backgroundColor: iconBgColor }}
          >
            {icon}
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-text-primary">
              {value}
            </div>
          </div>
        </div>

        {/* Label */}
        <div className="mb-3">
          <h3 className="text-sm font-medium text-text-secondary">
            {label}
          </h3>
        </div>

        {/* Change Indicator */}
        <div className={`flex items-center gap-1 text-xs ${
          isIncrease ? 'text-success' : 'text-destructive'
        }`}>
          <TrendIcon className="w-3 h-3" />
          <span className="font-medium">{change}</span>
          <span className="text-text-tertiary">{changeText}</span>
        </div>
      </div>
    </div>
  );
}

// Container component for all stats cards
export function StatsCardsGrid() {
  const statsData = [
    {
      icon: '📅',
      value: '12',
      label: "Today's Bookings",
      change: '20%',
      changeType: 'increase' as const,
      changeText: 'from yesterday',
      iconBgColor: 'rgba(59, 130, 246, 0.1)', // Blue background
      gradientFrom: 'hsl(var(--primary))',
      gradientTo: 'hsl(var(--secondary))',
    },
    {
      icon: '💵',
      value: '2,450 JOD',
      label: 'Monthly Revenue',
      change: '15%',
      changeType: 'increase' as const,
      changeText: 'from last month',
      iconBgColor: 'rgba(34, 197, 94, 0.1)', // Green background
      gradientFrom: 'hsl(var(--primary))',
      gradientTo: 'hsl(var(--secondary))',
    },
    {
      icon: '⭐',
      value: '4.8',
      label: 'Average Rating',
      change: '0.2 points',
      changeType: 'increase' as const,
      changeText: 'this month',
      iconBgColor: 'rgba(251, 191, 36, 0.1)', // Yellow background
      gradientFrom: 'hsl(var(--primary))',
      gradientTo: 'hsl(var(--secondary))',
    },
    {
      icon: '👥',
      value: '156',
      label: 'Total Customers',
      change: '12 new',
      changeType: 'increase' as const,
      changeText: 'this week',
      iconBgColor: 'rgba(168, 85, 247, 0.1)', // Purple background
      gradientFrom: 'hsl(var(--primary))',
      gradientTo: 'hsl(var(--secondary))',
    },
  ];

  return (
    <div 
      className="grid gap-6"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
      }}
    >
      {statsData.map((stat, index) => (
        <div
          key={index}
          className="stats-card-stagger"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <StatsCard {...stat} />
        </div>
      ))}
    </div>
  );
}