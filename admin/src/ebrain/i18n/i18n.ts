import zhCN from './zh-CN.json';
import enUS from './en-US.json';

export type Locale = 'zh-CN' | 'en-US';

type Vars = Record<string, string | number>;

const dictionaries: Record<Locale, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function initialLocale(): Locale {
  const persisted = localStorage.getItem('ebrain.locale');
  if (persisted === 'zh-CN' || persisted === 'en-US') return persisted;
  return 'zh-CN';
}

export function translate(locale: Locale, key: string, vars: Vars = {}): string {
  const template = dictionaries[locale][key] ?? dictionaries['en-US'][key] ?? key;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template,
  );
}
