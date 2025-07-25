import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderLoginPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations('provider.login');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
      <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/logo.png"
            alt="Lamsa Logo"
            width={120}
            height={120}
            className="object-contain"
          />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-card-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        
        <form className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
              {t('email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              placeholder={t('emailPlaceholder')}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
              {t('password')}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              placeholder={t('passwordPlaceholder')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('rememberMe')}
              </span>
            </label>
            <a href="#" className="text-sm text-primary hover:text-primary/80">
              {t('forgotPassword')}
            </a>
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition-colors"
          >
            {t('signIn')}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <a href="/provider/register" className="text-primary hover:text-primary/80 font-semibold">
              {t('signUp')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}