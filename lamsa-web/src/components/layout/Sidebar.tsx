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

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-primary shadow-lg">
          {/* Logo Area */}
          <div className="flex items-center justify-center h-16 px-4 bg-primary-foreground/5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-semibold text-primary-foreground">
                Lamsa Pro
              </span>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-primary shadow-sm"
                      : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  )}
                >
                  <Icon className="w-5 h-5 me-3" />
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
          
          {/* Logout */}
          <div className="px-4 py-4 border-t border-primary-foreground/20">
            <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-lg transition-colors">
              <LogOut className="w-5 h-5 me-3" />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-primary shadow-lg transform transition-transform duration-200 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-primary-foreground/5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-semibold text-primary-foreground">
                Lamsa Pro
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Mobile Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-primary shadow-sm"
                      : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  )}
                >
                  <Icon className="w-5 h-5 me-3" />
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
          
          {/* Mobile Logout */}
          <div className="px-4 py-4 border-t border-primary-foreground/20">
            <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-lg transition-colors">
              <LogOut className="w-5 h-5 me-3" />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}