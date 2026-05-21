import React from 'react';
import type { Locale } from '../i18n/i18n';

type Translator = (key: string, vars?: Record<string, string | number>) => string;

const navItems = [
  { page: 'ebrain/dashboard', labelKey: 'nav.dashboard' },
  { page: 'ebrain/executives', labelKey: 'nav.executives' },
  { page: 'ebrain/enterprise-apps', labelKey: 'nav.enterpriseApps' },
  { page: 'ebrain/ingestion', labelKey: 'nav.ingestion' },
] as const;

export function AppLayout({
  title,
  eyebrow,
  locale,
  setLocale,
  t,
  actions,
  children,
}: {
  title: string;
  eyebrow: string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const current = window.location.hash.replace('#', '') || 'ebrain/dashboard';

  return (
    <div>
      <div
        style={{
          background: 'radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 32%), var(--bg-secondary)',
          border: '1px solid #232338',
          borderRadius: 14,
          padding: 18,
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {t('layout.product')} / {eyebrow}
            </div>
            <h1 className="page-title" style={{ marginBottom: 0, marginTop: 6 }}>{title}</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('layout.scope')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {actions}
            <label style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              {t('layout.locale')}
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                style={{ width: 112, background: 'var(--bg-primary)' }}
              >
                <option value="zh-CN">zh-CN</option>
                <option value="en-US">en-US</option>
              </select>
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          {navItems.map(item => (
            <button
              key={item.page}
              className={current === item.page ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => { window.location.hash = item.page; }}
              type="button"
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
