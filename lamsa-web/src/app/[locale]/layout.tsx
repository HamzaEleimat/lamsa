import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { locales, localeConfig, type Locale } from '../../i18n/request';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata = {
  title: 'Lamsa - Jordan\'s Premier Beauty Services Platform',
  description: 'Connect with verified beauty professionals and manage your appointments seamlessly in Jordan',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({
  children,
  params
}: RootLayoutProps) {
  const { locale } = await params;
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  // Enable static rendering for this locale
  setRequestLocale(locale);

  const messages = await getMessages();
  const currentLocale = locale as Locale;
  const config = localeConfig[currentLocale];

  return (
    <html 
      lang={currentLocale} 
      dir={config.direction}
      className={config.direction === 'rtl' ? 'rtl' : 'ltr'}
    >
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <div className="relative min-h-screen">
                <div className="absolute top-4 right-4 z-10">
                  <LanguageSwitcher />
                </div>
                {children}
              </div>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}