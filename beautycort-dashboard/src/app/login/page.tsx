'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginForm {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isArabic, setIsArabic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const translations = {
    en: {
      title: 'Provider Login',
      subtitle: 'Welcome back to BeautyCort Dashboard',
      email: 'Email Address',
      password: 'Password',
      emailPlaceholder: 'Enter your email',
      passwordPlaceholder: 'Enter your password',
      loginButton: 'Sign In',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
      emailRequired: 'Email is required',
      emailInvalid: 'Please enter a valid email',
      passwordRequired: 'Password is required',
      passwordLength: 'Password must be at least 6 characters',
      invalidCredentials: 'Invalid email or password',
      serverError: 'Server error. Please try again later.',
      language: 'العربية'
    },
    ar: {
      title: 'تسجيل دخول مقدم الخدمة',
      subtitle: 'مرحباً بك في لوحة تحكم بيوتي كورت',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      passwordPlaceholder: 'أدخل كلمة المرور',
      loginButton: 'تسجيل الدخول',
      forgotPassword: 'نسيت كلمة المرور؟',
      noAccount: 'ليس لديك حساب؟',
      signUp: 'إنشاء حساب',
      emailRequired: 'البريد الإلكتروني مطلوب',
      emailInvalid: 'يرجى إدخال بريد إلكتروني صالح',
      passwordRequired: 'كلمة المرور مطلوبة',
      passwordLength: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      serverError: 'خطأ في الخادم. يرجى المحاولة لاحقاً.',
      language: 'English'
    }
  };

  const t = isArabic ? translations.ar : translations.en;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = t.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.emailInvalid;
    }
    
    if (!formData.password) {
      newErrors.password = t.passwordRequired;
    } else if (formData.password.length < 6) {
      newErrors.password = t.passwordLength;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/provider/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('provider', JSON.stringify(data.data.provider));
        router.push('/dashboard');
      } else {
        setErrors({ general: data.message || t.invalidCredentials });
      }
    } catch (error) {
      setErrors({ general: t.serverError });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-600 mt-2">{t.subtitle}</p>
            </div>
            <button
              onClick={() => setIsArabic(!isArabic)}
              className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              {t.language}
            </button>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t.email}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={t.emailPlaceholder}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t.password}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={t.passwordPlaceholder}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <a href="#" className="text-sm text-purple-600 hover:text-purple-700">
                {t.forgotPassword}
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                t.loginButton
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t.noAccount}{' '}
              <a href="/signup" className="font-medium text-purple-600 hover:text-purple-700">
                {t.signUp}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}