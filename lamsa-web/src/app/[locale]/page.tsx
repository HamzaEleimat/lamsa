import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations('home');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <div className="flex justify-center mb-8">
          <Image
            src="/images/logo.png"
            alt="Lamsa Logo"
            width={180}
            height={180}
            className="object-contain"
          />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            {t('title', { name: 'Lamsa' })}
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/provider/login"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {t('providerLogin')}
          </Link>
          <Link 
            href="/provider/register"
            className="bg-background hover:bg-muted text-primary border-2 border-primary px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {t('providerRegister')}
          </Link>
        </div>
        
        <div className="pt-8 text-sm text-muted-foreground">
          <p>{t('description')}</p>
        </div>
      </div>
    </div>
  );
}