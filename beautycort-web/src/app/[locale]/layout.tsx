import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { locales, localeConfig, type Locale } from '../../i18n/request';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

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
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}