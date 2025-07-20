'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { type Locale, localeConfig } from '@/i18n/request';
import { createRTLClasses } from '@/lib/i18n-utils';

interface RTLWrapperProps {
  children: React.ReactNode;
  className?: string;
  element?: keyof React.JSX.IntrinsicElements;
}

export function RTLWrapper({ 
  children, 
  className = '', 
  element: Element = 'div' 
}: RTLWrapperProps) {
  const locale = useLocale() as Locale;
  const config = localeConfig[locale];
  const rtlClasses = createRTLClasses(locale, className);
  
  return (
    <Element 
      className={rtlClasses}
      dir={config.direction}
      lang={locale}
    >
      {children}
    </Element>
  );
}

interface RTLTextProps {
  children: React.ReactNode;
  className?: string;
  element?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function RTLText({ 
  children, 
  className = '', 
  element: Element = 'span' 
}: RTLTextProps) {
  const locale = useLocale() as Locale;
  const config = localeConfig[locale];
  const rtlClasses = createRTLClasses(locale, className);
  
  return (
    <Element 
      className={`${rtlClasses} ${config.direction === 'rtl' ? 'text-right' : 'text-left'}`}
      dir={config.direction}
    >
      {children}
    </Element>
  );
}

interface RTLInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function RTLInput({ className = '', ...props }: RTLInputProps) {
  const locale = useLocale() as Locale;
  const config = localeConfig[locale];
  const rtlClasses = createRTLClasses(locale, className);
  
  return (
    <input
      {...props}
      className={`form-input ${rtlClasses}`}
      dir={config.direction}
    />
  );
}

interface RTLTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function RTLTextarea({ className = '', ...props }: RTLTextareaProps) {
  const locale = useLocale() as Locale;
  const config = localeConfig[locale];
  const rtlClasses = createRTLClasses(locale, className);
  
  return (
    <textarea
      {...props}
      className={`form-input ${rtlClasses}`}
      dir={config.direction}
    />
  );
}

interface RTLButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'destructive';
}

export function RTLButton({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}: RTLButtonProps) {
  const locale = useLocale() as Locale;
  const config = localeConfig[locale];
  const rtlClasses = createRTLClasses(locale, className);
  
  const variantClasses = {
    default: 'bg-background text-foreground border border-input hover:bg-accent hover:text-accent-foreground',
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    destructive: 'btn-destructive'
  };
  
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible ${variantClasses[variant]} ${rtlClasses}`}
      dir={config.direction}
    >
      {children}
    </button>
  );
}