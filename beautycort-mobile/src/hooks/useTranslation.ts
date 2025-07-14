import i18n, { getCurrentLanguage } from '../i18n';

export const useTranslation = () => {
  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  return {
    t,
    i18n: {
      language: getCurrentLanguage(),
    },
  };
};