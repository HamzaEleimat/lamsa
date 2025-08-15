'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout - Professional and Clean */}
      <div className="hidden lg:flex lg:h-screen lg:overflow-hidden">
        {/* Fixed Sidebar */}
        <div className="w-64 bg-primary shadow-lg flex-shrink-0 border-r border-primary/20">
          <Sidebar 
            isOpen={true} 
            onClose={() => {}} 
          />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Top Bar */}
          <div className="bg-white border-b border-gray-200 shadow-sm z-10 flex-shrink-0">
            <TopBar onMenuClick={() => setSidebarOpen(true)} />
          </div>
          
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-6 max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Top Bar */}
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
        </div>
        
        {/* Mobile Content */}
        <main className="p-4 bg-gray-50 min-h-[calc(100vh-64px)]">
          {children}
        </main>
        
        {/* Mobile Sidebar - Overlay handled inside Sidebar component */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      </div>
    </div>
  );
}