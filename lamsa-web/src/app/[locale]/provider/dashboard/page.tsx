'use client';

import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Calendar, 
  DollarSign, 
  Star, 
  Users,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

export default function ProviderDashboardPage() {
  const t = useTranslations('provider.dashboard');

  const stats = [
    {
      title: t('todayBookings'),
      value: '12',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBgColor: 'bg-blue-100'
    },
    {
      title: t('monthRevenue'),
      value: '2,450 JOD',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBgColor: 'bg-green-100'
    },
    {
      title: t('avgRating'),
      value: '4.8',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      iconBgColor: 'bg-yellow-100'
    },
    {
      title: t('totalCustomers'),
      value: '156',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBgColor: 'bg-purple-100'
    }
  ];

  const recentBookings = [
    {
      id: 1,
      clientName: 'Sarah Johnson',
      service: 'Hair Cut & Style',
      time: '10:00 AM',
      status: 'confirmed',
      avatar: 'SJ'
    },
    {
      id: 2,
      clientName: 'Ahmed Hassan',
      service: 'Beard Trim',
      time: '11:30 AM',
      status: 'pending',
      avatar: 'AH'
    },
    {
      id: 3,
      clientName: 'Layla Al-Zahra',
      service: 'Manicure',
      time: '2:00 PM',
      status: 'completed',
      avatar: 'LZ'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`${stat.bgColor} rounded-lg p-6 border border-border/50`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className={`text-2xl font-bold ${stat.color} mt-1`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.iconBgColor} p-2 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bookings */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('recentBookings')}
                </h2>
                <button className="text-primary hover:text-primary/80 text-sm font-medium">
                  View all
                </button>
              </div>
              
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {booking.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {booking.clientName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.service}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-medium text-foreground">
                        {booking.time}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Today's Schedule
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    8:00 AM - 6:00 PM
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-foreground">
                    8 appointments booked
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-foreground">
                    4 slots available
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  {t('addService')}
                </button>
                <button className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors">
                  View Calendar
                </button>
                <button className="w-full bg-muted text-muted-foreground py-2 px-4 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}