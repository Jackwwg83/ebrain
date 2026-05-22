import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { i18n, type Locale } from '../i18n/react-i18next';

export function useEbrainI18n() {
  const { t: translate } = useTranslation();
  const locale = (i18n.language === 'en-US' ? 'en-US' : 'zh-CN') as Locale;
  const updateLocale = useCallback((next: Locale) => {
    localStorage.setItem('ebrain.locale', next);
    void i18n.changeLanguage(next);
  }, []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, vars),
    [translate],
  );
  return { locale, setLocale: updateLocale, t };
}
