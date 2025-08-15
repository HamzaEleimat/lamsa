'use client';

import { useState } from 'react';
import { ProviderSidebar } from './ProviderSidebar';
import { ProviderHeader } from './ProviderHeader';

interface ProviderLayoutProps {
  children: React.ReactNode;
}

export function ProviderLayout({ children }: ProviderLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Fixed Sidebar */}
        <div className="w-64 flex-shrink-0">
          <ProviderSidebar isOpen={true} onClose={() => {}} />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <ProviderHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <ProviderHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4">
          {children}
        </main>
        <ProviderSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      </div>
    </div>
  );
}