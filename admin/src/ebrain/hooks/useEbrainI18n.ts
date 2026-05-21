import { useCallback, useState } from 'react';
import { initialLocale, translate, type Locale } from '../i18n/i18n';

export function useEbrainI18n() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
  return { locale, setLocale, t };
}
