'use client';

import { useTranslations } from 'next-intl';
import { ProviderLayout } from '@/components/layout/ProviderLayout';
import {
  Calendar,
  DollarSign,
  Star,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import type { LucideIcon } from 'lucide-react';

interface StatItem {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'flat';
  icon: LucideIcon; // lucide-react icon component
  color?: string; // text color utility
  accent?: string; // bg accent utility
  description?: string;
}

interface BookingItem {
  id: number;
  clientName: string;
  service: string;
  time: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  avatar: string;
}

function StatCard({ item }: { item: StatItem }) {
  const TrendIcon = item.trend === 'down' ? ArrowDownRight : ArrowUpRight;
  const trendColor = item.trend === 'down' ? 'text-destructive' : 'text-success';
  const Icon = item.icon;
  return (
    <div className="card h-full flex flex-col overflow-hidden shadow-lamsa-sm hover:shadow-lamsa-md transition-shadow group">
      <div className="card-header pb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground tracking-wide">
            {item.title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn('text-2xl font-semibold text-text-primary', item.color)}>
              {item.value}
            </span>
            {item.change && (
              <span className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
                <TrendIcon className="w-3.5 h-3.5" />{item.change}
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg shrink-0 ring-1 ring-border/60 bg-muted group-hover:bg-accent/40 transition-colors', item.accent)}>
          <Icon className={cn('w-5 h-5 text-primary', item.color)} />
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingItem }) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-md border border-transparent hover:border-border hover:bg-muted/60 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-10 w-10 text-sm">
          <AvatarFallback className="bg-accent text-text-primary font-medium">
            {booking.avatar}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {booking.clientName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {booking.service}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-xs font-medium text-text-secondary">
          {booking.time}
        </p>
        <StatusBadge status={booking.status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingItem['status'] }) {
  const map: Record<BookingItem['status'], { label: string; className: string; } > = {
    confirmed: { label: 'Confirmed', className: 'bg-success/10 text-success border-success/20' },
    pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/30' },
    completed: { label: 'Completed', className: 'bg-primary/10 text-primary border-primary/20' },
    cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  };
  const cfg = map[status];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border', cfg.className)}>
      {cfg.label}
    </span>
  );
}

export default function ProviderDashboardPage() {
  const t = useTranslations('provider.dashboard');

  const stats: StatItem[] = [
    {
      title: t('todayBookings'),
      value: '12',
      change: '+8%',
      trend: 'up',
      icon: Calendar,
      description: t('todayBookingsDesc', { defaultValue: 'vs yesterday' }),
    },
    {
      title: t('monthRevenue'),
      value: '2,450 JOD',
      change: '+4.3%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-success',
      description: t('monthRevenueDesc', { defaultValue: 'MTD' }),
    },
    {
      title: t('avgRating'),
      value: '4.8',
      change: '-0.1',
      trend: 'down',
      icon: Star,
      color: 'text-secondary',
      description: t('avgRatingDesc', { defaultValue: 'Last 30 days' }),
    },
    {
      title: t('totalCustomers'),
      value: '156',
      change: '+12',
      trend: 'up',
      icon: Users,
      description: t('totalCustomersDesc', { defaultValue: 'New this month' }),
    }
  ];

  const recentBookings: BookingItem[] = [
    { id: 1, clientName: 'Sarah Johnson', service: 'Hair Cut & Style', time: '10:00 AM', status: 'confirmed', avatar: 'SJ' },
    { id: 2, clientName: 'Ahmed Hassan', service: 'Beard Trim', time: '11:30 AM', status: 'pending', avatar: 'AH' },
    { id: 3, clientName: 'Layla Al-Zahra', service: 'Manicure', time: '2:00 PM', status: 'completed', avatar: 'LZ' },
    { id: 4, clientName: 'Omar Khaled', service: 'Facial Treatment', time: '3:15 PM', status: 'confirmed', avatar: 'OK' },
  ];

  // Future: fetch data with react-query & Supabase

  return (
    <ProviderLayout>
      <div className="space-y-8">
        {/* Heading */}
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            {t('title')}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            {t('subtitle')}
          </p>
        </header>

        {/* Stats */}
        <section aria-labelledby="stats-heading" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <h2 id="stats-heading" className="sr-only">{t('stats', { defaultValue: 'Key metrics' })}</h2>
          {stats.map((item) => (
            <StatCard key={item.title} item={item} />
          ))}
        </section>

        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Bookings */}
            <section aria-labelledby="recent-bookings" className="lg:col-span-2 flex flex-col gap-4">
              <div className="card">
                <div className="card-header pb-2 flex items-center justify-between">
                  <div>
                    <h2 id="recent-bookings" className="text-lg font-semibold tracking-tight">
                      {t('recentBookings')}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">{t('recentBookingsDesc', { defaultValue: 'Today & upcoming' })}</p>
                  </div>
                  <button className="text-xs font-medium text-primary hover:underline focus-visible rounded-md">
                    {t('viewAll', { defaultValue: 'View all' })}
                  </button>
                </div>
                <div className="card-content pt-4">
                  <div className="space-y-2">
                    {recentBookings.map((b) => <BookingRow key={b.id} booking={b} />)}
                  </div>
                </div>
              </div>
            </section>

          {/* Sidebar Panels */}
          <aside className="flex flex-col gap-8">
            {/* Schedule */}
            <div className="card">
              <div className="card-header pb-3">
                <h3 className="text-md font-semibold tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> {t('todaySchedule', { defaultValue: "Today's Schedule" })}
                </h3>
              </div>
              <div className="card-content pt-2">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2 text-text-secondary">
                    <Clock className="w-4 h-4 text-muted-foreground" /> <span>8:00 AM - 6:00 PM</span>
                  </li>
                  <li className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle className="w-4 h-4 text-success" /> <span>8 {t('appointmentsBooked', { defaultValue: 'appointments booked' })}</span>
                  </li>
                  <li className="flex items-center gap-2 text-text-secondary">
                    <TrendingUp className="w-4 h-4 text-secondary" /> <span>4 {t('slotsAvailable', { defaultValue: 'slots available' })}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header pb-3">
                <h3 className="text-md font-semibold tracking-tight">
                  {t('quickActions', { defaultValue: 'Quick Actions' })}
                </h3>
              </div>
              <div className="card-content pt-2 space-y-3">
                <button className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-4 shadow-lamsa-sm hover:shadow-lamsa focus-visible">
                  {t('addService')}
                </button>
                <button className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-muted text-text-primary text-sm font-medium h-10 px-4 hover:bg-accent/50 focus-visible">
                  {t('viewCalendar', { defaultValue: 'View Calendar' })}
                </button>
                <button className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-muted text-text-primary text-sm font-medium h-10 px-4 hover:bg-accent/50 focus-visible">
                  {t('generateReport', { defaultValue: 'Generate Report' })}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ProviderLayout>
  );
}