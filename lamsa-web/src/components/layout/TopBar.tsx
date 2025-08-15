'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Menu, 
  Bell, 
  Search, 
  User, 
  Settings, 
  LogOut,
  ChevronDown
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const t = useTranslations('provider.topbar');
  const [notificationCount] = useState(3); // Mock notification count

  return (
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md hover:bg-muted lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-muted rounded-lg px-3 py-2 w-80">
          <Search className="w-4 h-4 text-muted-foreground me-2" />
          <input
            type="text"
            placeholder={t('searchPlaceholder', { defaultValue: 'Search appointments, clients...' })}
            className="bg-transparent border-0 outline-none flex-1 text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3">
        {/* Mobile Search Button */}
        <button className="p-2 rounded-md hover:bg-muted md:hidden">
          <Search className="w-5 h-5" />
        </button>
        
        {/* Language Switcher */}
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-md hover:bg-muted relative">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {notificationCount}
              </Badge>
            )}
          </button>
        </div>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-2 rounded-lg px-2 py-1 hover:bg-muted transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/api/placeholder/32/32" alt="Provider" />
              <AvatarFallback className="bg-secondary text-primary">
                SA
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-start">
              <p className="text-sm font-medium">Sarah Ahmed</p>
              <p className="text-xs text-muted-foreground">Hair Stylist</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Sarah Ahmed</p>
                <p className="text-xs text-muted-foreground">sarah@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 me-2" />
              {t('profile', { defaultValue: 'Profile' })}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 me-2" />
              {t('settings', { defaultValue: 'Settings' })}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 me-2" />
              {t('logout', { defaultValue: 'Logout' })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}