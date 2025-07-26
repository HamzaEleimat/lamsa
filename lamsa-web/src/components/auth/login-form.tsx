'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations('provider.login');
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMFA, setShowMFA] = useState(false);
  const [providerId, setProviderId] = useState<string>('');
  const [mfaCode, setMfaCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        if (result.requiresMFA) {
          setShowMFA(true);
          setProviderId(result.providerId!);
        } else {
          router.push('/provider/dashboard');
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { verifyMFA } = useAuth();
      const result = await verifyMFA(providerId, mfaCode);
      
      if (result.success) {
        router.push('/provider/dashboard');
      } else {
        setError(result.error || 'Invalid MFA code');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (showMFA) {
    return (
      <form onSubmit={handleMFASubmit} className="space-y-6">
        <div>
          <label htmlFor="mfaCode" className="block text-sm font-medium text-card-foreground mb-2">
            {t('mfaCode')}
          </label>
          <input
            type="text"
            id="mfaCode"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
            placeholder={t('mfaCodePlaceholder')}
            maxLength={6}
            pattern="[0-9]{6}"
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('verifying')}
            </>
          ) : (
            t('verifyMFA')
          )}
        </Button>

        <button
          type="button"
          onClick={() => {
            setShowMFA(false);
            setMfaCode('');
            setError(null);
          }}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {t('backToLogin')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
          {t('email')}
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
          placeholder={t('emailPlaceholder')}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
          {t('password')}
        </label>
        <input
          {...register('password')}
          type="password"
          id="password"
          className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
          placeholder={t('passwordPlaceholder')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
        )}
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

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}
      
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('signingIn')}
          </>
        ) : (
          t('signIn')
        )}
      </Button>
    </form>
  );
}