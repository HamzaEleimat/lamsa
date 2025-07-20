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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
        </div>
        
        <form className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder={t('emailPlaceholder')}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('password')}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder={t('passwordPlaceholder')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">
                {t('rememberMe')}
              </span>
            </label>
            <a href="#" className="text-sm text-pink-600 hover:text-pink-500">
              {t('forgotPassword')}
            </a>
          </div>
          
          <button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {t('signIn')}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            {t('noAccount')}{' '}
            <a href="/provider/register" className="text-pink-600 hover:text-pink-500 font-semibold">
              {t('signUp')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}