'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatsCardsGrid } from '@/components/dashboard/StatsCard';
import { BookingsList } from '@/components/dashboard/BookingsList';

export default function ProviderDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen dashboard-gradient">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Header */}
        <Header onMenuClick={toggleSidebar} />
        
        {/* Page Content */}
        <main className="p-6 space-y-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-lamsa-primary mb-2">
              Dashboard
            </h1>
            <p className="text-lamsa-primary/70">
              Welcome back! Here's what's happening with your business today.
            </p>
          </div>

          {/* Stats Cards with Stagger Animation */}
          <section className="stats-container">
            <StatsCardsGrid />
          </section>

          {/* Recent Bookings */}
          <section>
            <BookingsList />
          </section>
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}