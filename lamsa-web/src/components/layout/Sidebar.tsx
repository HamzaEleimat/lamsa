'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Calendar,
  Scissors,
  Users,
  DollarSign,
  Star,
  TrendingUp,
  Settings
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  {
    href: '/provider/dashboard',
    icon: BarChart3,
    label: 'Dashboard'
  },
  {
    href: '/provider/appointments',
    icon: Calendar,
    label: 'Appointments'
  },
  {
    href: '/provider/services',
    icon: Scissors,
    label: 'Services'
  },
  {
    href: '/provider/customers',
    icon: Users,
    label: 'Customers'
  },
  {
    href: '/provider/revenue',
    icon: DollarSign,
    label: 'Revenue'
  },
  {
    href: '/provider/reviews',
    icon: Star,
    label: 'Reviews'
  },
  {
    href: '/provider/analytics',
    icon: TrendingUp,
    label: 'Analytics'
  },
  {
    href: '/provider/settings',
    icon: Settings,
    label: 'Settings'
  }
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 w-64 h-screen bg-white shadow-lg z-50",
        "transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out",
        isOpen && "translate-x-0"
      )}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center justify-center">
          <Image
            src="/Logo for light theme.png"
            alt="Lamsa Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              className={cn(
                "flex items-center gap-4 px-6 py-3 text-text-secondary hover:text-primary hover:bg-surface transition-all",
                isActive && "text-primary bg-primary/5 border-l-4 border-primary"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile overlay - close sidebar when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
    </aside>
  );
}