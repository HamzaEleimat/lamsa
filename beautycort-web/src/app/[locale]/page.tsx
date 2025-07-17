import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('home');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            {t('title', { name: 'BeautyCort' })}
          </h1>
          <p className="text-xl text-gray-600 max-w-md mx-auto">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/provider/login"
            className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {t('providerLogin')}
          </Link>
          <Link 
            href="/provider/register"
            className="bg-white hover:bg-gray-50 text-pink-600 border-2 border-pink-600 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {t('providerRegister')}
          </Link>
        </div>
        
        <div className="pt-8 text-sm text-gray-500">
          <p>{t('description')}</p>
        </div>
      </div>
    </div>
  );
}