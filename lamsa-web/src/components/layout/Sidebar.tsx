'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Star,
  BarChart3,
  Scissors,
  User,
  LogOut,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    href: '/provider/dashboard',
    icon: LayoutDashboard,
    label: 'dashboard'
  },
  {
    href: '/provider/appointments',
    icon: Calendar,
    label: 'appointments'
  },
  {
    href: '/provider/services',
    icon: Scissors,
    label: 'services'
  },
  {
    href: '/provider/clients',
    icon: Users,
    label: 'clients'
  },
  {
    href: '/provider/analytics',
    icon: BarChart3,
    label: 'analytics'
  },
  {
    href: '/provider/reviews',
    icon: Star,
    label: 'reviews'
  },
  {
    href: '/provider/profile',
    icon: User,
    label: 'profile'
  },
  {
    href: '/provider/settings',
    icon: Settings,
    label: 'settings'
  }
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('provider.sidebar');

  // Desktop Sidebar Content - Simplified for better performance
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-primary">
      {/* Logo Area */}
      <div className="flex items-center justify-center h-16 px-4 bg-primary/95 border-b border-primary-foreground/10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">
            Lamsa Pro
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-white/15 text-white shadow-sm border border-white/20"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-5 h-5 me-3 flex-shrink-0" />
              <span className="truncate">{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Logout */}
      <div className="px-3 py-3 border-t border-white/10">
        <button className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
          <LogOut className="w-5 h-5 me-3 flex-shrink-0" />
          <span className="truncate">{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Optimized for desktop layout */}
      <div className="hidden lg:flex lg:flex-col lg:w-full lg:h-full">
        <SidebarContent />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full bg-primary">
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-primary/95 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">
                Lamsa Pro
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mobile Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/15 text-white shadow-sm border border-white/20"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className="w-5 h-5 me-3 flex-shrink-0" />
                  <span className="truncate">{t(item.label)}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Mobile Logout */}
          <div className="px-3 py-3 border-t border-white/10">
            <button className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
              <LogOut className="w-5 h-5 me-3 flex-shrink-0" />
              <span className="truncate">{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}