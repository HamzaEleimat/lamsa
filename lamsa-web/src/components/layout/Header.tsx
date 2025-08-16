'use client';

import { Menu, Search, Bell } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  userName?: string;
  userRole?: string;
  notificationCount?: number;
  userInitials?: string;
}

export function Header({
  onMenuClick,
  userName = "Sarah Johnson",
  userRole = "Beauty Specialist",
  notificationCount = 3,
  userInitials = "SJ"
}: HeaderProps) {
  return (
    <header className="sticky top-0 bg-white shadow-sm z-40 px-4 lg:px-8 py-4">
      <div className="flex justify-between items-center">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden block text-2xl text-text-secondary hover:text-primary transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Search Bar */}
          <div className="hidden lg:block relative w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-text-tertiary" />
            </div>
            <input
              type="text"
              placeholder="Search appointments, clients..."
              className="w-full py-2.5 px-10 bg-surface rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button className="relative text-text-secondary hover:text-primary transition-colors p-2 notification-bell">
            <Bell className="w-6 h-6" />
            {notificationCount && notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center notification-badge">
                {notificationCount}
              </span>
            )}
          </button>

          {/* User Profile */}
          <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 bg-lamsa-primary text-white rounded-full flex items-center justify-center font-medium text-sm">
                {userInitials}
              </div>
              
              {/* User Info - Hidden on mobile */}
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-text-primary">
                  {userName}
                </div>
                <div className="text-xs text-text-tertiary">
                  {userRole}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}