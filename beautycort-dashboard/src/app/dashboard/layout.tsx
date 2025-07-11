'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface Provider {
  id: string;
  name: string;
  email: string;
}

interface NavItem {
  id: string;
  labelEn: string;
  labelAr: string;
  href: string;
  icon: JSX.Element;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isArabic, setIsArabic] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navItems: NavItem[] = [
    {
      id: 'overview',
      labelEn: 'Overview',
      labelAr: 'نظرة عامة',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'services',
      labelEn: 'Services',
      labelAr: 'الخدمات',
      href: '/dashboard/services',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'availability',
      labelEn: 'Availability',
      labelAr: 'الأوقات المتاحة',
      href: '/dashboard/availability',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'bookings',
      labelEn: 'Bookings',
      labelAr: 'الحجوزات',
      href: '/dashboard/bookings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'profile',
      labelEn: 'Profile',
      labelAr: 'الملف الشخصي',
      href: '/dashboard/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const providerData = localStorage.getItem('provider');

      if (!token || !providerData) {
        router.push('/login');
        return;
      }

      try {
        const parsedProvider = JSON.parse(providerData);
        setProvider(parsedProvider);
        setIsLoading(false);
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();

    const savedLang = localStorage.getItem('language');
    if (savedLang === 'ar') {
      setIsArabic(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('provider');
    router.push('/login');
  };

  const toggleLanguage = () => {
    const newLang = !isArabic;
    setIsArabic(newLang);
    localStorage.setItem('language', newLang ? 'ar' : 'en');
  };

  const t = {
    logout: isArabic ? 'تسجيل الخروج' : 'Logout',
    menu: isArabic ? 'القائمة' : 'Menu',
    dashboard: isArabic ? 'لوحة التحكم' : 'Dashboard',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isArabic ? 'rtl' : 'ltr'}`}>
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 ${isArabic ? 'right-0' : 'left-0'} z-50 w-64 bg-white shadow-xl transform ${
          isSidebarOpen ? 'translate-x-0' : `${isArabic ? 'translate-x-full' : '-translate-x-full'}`
        } transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-6 bg-purple-600">
            <h2 className="text-xl font-semibold text-white">{t.dashboard}</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-white lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={isArabic ? 'ml-3' : 'mr-3'}>{item.icon}</span>
                  {isArabic ? item.labelAr : item.labelEn}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <svg className={`w-5 h-5 ${isArabic ? 'ml-3' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t.logout}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:mr-64">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-700 lg:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className={`text-xl font-semibold text-gray-800 ${isArabic ? 'mr-4' : 'ml-4'} lg:ml-0`}>
                {provider?.name || 'Provider'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                {isArabic ? 'English' : 'العربية'}
              </button>
              <div className="flex items-center">
                <div className={`${isArabic ? 'ml-3' : 'mr-3'}`}>
                  <p className="text-sm font-medium text-gray-700">{provider?.name}</p>
                  <p className="text-xs text-gray-500">{provider?.email}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">
                    {provider?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}