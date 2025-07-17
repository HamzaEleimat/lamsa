'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { localeConfig, type Locale } from '@/i18n/request';
import { createLocalizedPathname } from '@/lib/i18n-utils';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = () => {
    const newLocale: Locale = locale === 'ar' ? 'en' : 'ar';
    const newPathname = createLocalizedPathname(pathname, newLocale);
    router.push(newPathname);
  };

  const currentConfig = localeConfig[locale];
  const targetConfig = localeConfig[locale === 'ar' ? 'en' : 'ar'];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLanguageChange}
      className={`flex items-center gap-2 ${className}`}
      title={`Switch to ${targetConfig.name}`}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">{currentConfig.name}</span>
      <span className="sm:hidden">{currentConfig.flag}</span>
    </Button>
  );
}