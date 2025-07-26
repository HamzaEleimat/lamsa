'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LoginForm } from '@/components/auth/login-form';
import { PhoneAuthForm } from '@/components/auth/phone-auth-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone } from 'lucide-react';

export default function ProviderLoginPage() {
  const t = useTranslations('provider.login');
  const [activeTab, setActiveTab] = useState('email');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center p-4">
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('emailTab')}
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t('phoneTab')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="email">
            <LoginForm />
          </TabsContent>
          
          <TabsContent value="phone">
            <PhoneAuthForm />
          </TabsContent>
        </Tabs>
        
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