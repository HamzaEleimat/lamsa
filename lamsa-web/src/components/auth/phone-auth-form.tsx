'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/auth';
import { useAuth } from '@/contexts/auth-context';
import { validateJordanianPhone, formatPhoneNumber, getFullPhoneNumber } from '@/lib/validation';

const phoneSchema = z.object({
  phone: z.string().refine(validateJordanianPhone, {
    message: 'Invalid Jordanian phone number',
  }),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export function PhoneAuthForm() {
  const t = useTranslations('provider.phoneAuth');
  const router = useRouter();
  const { loginWithPhone } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  });

  // Start resend timer
  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onPhoneSubmit = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const fullPhone = getFullPhoneNumber(data.phone);
      const response = await authApi.sendProviderOTP(fullPhone);
      
      if (response.success) {
        setPhoneNumber(fullPhone);
        setStep('otp');
        startResendTimer();
      } else {
        setError(response.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const onOTPSubmit = async (data: OTPFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginWithPhone(phoneNumber, data.otp);
      
      if (result.success) {
        router.push('/provider/dashboard');
      } else {
        setError(result.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.sendProviderOTP(phoneNumber);
      
      if (response.success) {
        startResendTimer();
      } else {
        setError(response.error || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{t('verifyPhone')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('otpSentTo')} {phoneNumber}
          </p>
        </div>

        <div>
          <label htmlFor="otp" className="block text-sm font-medium text-card-foreground mb-2">
            {t('otpCode')}
          </label>
          <input
            {...otpForm.register('otp')}
            type="text"
            id="otp"
            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-center text-2xl tracking-widest"
            placeholder="000000"
            maxLength={6}
            pattern="[0-9]{6}"
            disabled={isLoading}
          />
          {otpForm.formState.errors.otp && (
            <p className="mt-1 text-sm text-destructive">{otpForm.formState.errors.otp.message}</p>
          )}
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
            t('verify')
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={resendOTP}
            disabled={resendTimer > 0 || isLoading}
            className="text-sm text-primary hover:text-primary/80 disabled:text-muted-foreground"
          >
            {resendTimer > 0 ? (
              t('resendIn', { seconds: resendTimer })
            ) : (
              t('resendOTP')
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep('phone');
            setError(null);
            otpForm.reset();
          }}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {t('changeNumber')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-card-foreground mb-2">
          {t('phoneNumber')}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-muted-foreground sm:text-sm">+962</span>
          </div>
          <input
            {...phoneForm.register('phone', {
              onChange: (e) => {
                e.target.value = formatPhoneNumber(e.target.value);
              },
            })}
            type="tel"
            id="phone"
            className="w-full pl-14 pr-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
            placeholder="79 123 4567"
            maxLength={11}
            disabled={isLoading}
          />
        </div>
        {phoneForm.formState.errors.phone && (
          <p className="mt-1 text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-start">
          <input
            {...phoneForm.register('acceptTerms')}
            type="checkbox"
            className="h-4 w-4 text-primary focus:ring-ring border-input rounded mt-0.5"
          />
          <span className="ml-2 text-sm text-muted-foreground">
            {t('acceptTerms')}{' '}
            <a href="/terms" className="text-primary hover:text-primary/80">
              {t('termsLink')}
            </a>
          </span>
        </label>
        {phoneForm.formState.errors.acceptTerms && (
          <p className="mt-1 text-sm text-destructive">{phoneForm.formState.errors.acceptTerms.message}</p>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !phoneForm.watch('acceptTerms')}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('sendingOTP')}
          </>
        ) : (
          <>
            {t('sendOTP')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}