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

interface ProviderSidebarProps {
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

export function ProviderSidebar({ isOpen, onClose }: ProviderSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('provider.sidebar');

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-primary h-full flex flex-col",
        // Desktop: always visible, static positioning
        "lg:flex lg:static lg:translate-x-0",
        // Mobile: overlay positioning when open
        "fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transform transition-transform duration-300 ease-in-out lg:shadow-none lg:transform-none",
        // Mobile show/hide logic
        isOpen ? "flex translate-x-0" : "hidden -translate-x-full lg:flex lg:translate-x-0"
      )}>
        {/* Logo Area */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">
              Lamsa Pro
            </span>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
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
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/15 text-white shadow-sm"
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
          <button className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
            <LogOut className="w-5 h-5 me-3 flex-shrink-0" />
            <span className="truncate">{t('logout')}</span>
          </button>
        </div>
      </div>
    </>
  );
}