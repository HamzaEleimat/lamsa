'use client';

import { StatsCardsGrid } from '@/components/dashboard/StatsCard';
import { BookingsList } from '@/components/dashboard/BookingsList';

export default function ProviderDashboardPage() {
  return (
    <div className="p-6 space-y-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-lamsa-primary mb-2">
            Dashboard
          </h1>
          <p className="text-lamsa-primary/70">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>

        {/* Stats Cards */}
        <section>
          <StatsCardsGrid />
        </section>

        {/* Recent Bookings */}
        <section>
          <BookingsList />
        </section>
    </div>
  );
}