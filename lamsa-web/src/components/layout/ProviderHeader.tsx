'use client';

import { useTranslations } from 'next-intl';
import { Bell, Menu, Search, User } from 'lucide-react';

interface ProviderHeaderProps {
  onMenuClick: () => void;
}

export function ProviderHeader({ onMenuClick }: ProviderHeaderProps) {
  const t = useTranslations('provider.header');

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Search bar - hidden on mobile */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64"
            />
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-3">
        {/* Mobile search button */}
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors md:hidden">
          <Search className="w-5 h-5" />
        </button>
        
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
            <p className="text-xs text-gray-500">Beauty Specialist</p>
          </div>
          <button className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}