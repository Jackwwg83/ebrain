import React, { useEffect, useMemo, useState } from 'react';
import {
  getEnterpriseApps,
  registerEnterpriseApp,
  testConnection,
  type ConnectionTestResult,
  type EbrainAppType,
  type EbrainEnterpriseApp,
  type EnterpriseAppRegistrationInput,
} from '../../api';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge, toneFromState } from '../components/StatusBadge';
import { useEbrainI18n } from '../hooks/useEbrainI18n';

const APP_TYPES: Array<{ type: EbrainAppType; label: string; connectors: string[] }> = [
  { type: 'feishu', label: 'Feishu', connectors: ['im', 'docs', 'wiki', 'drive', 'calendar', 'approval'] },
  { type: 'dingtalk', label: 'DingTalk', connectors: ['im', 'docs', 'drive', 'calendar', 'meeting'] },
  { type: 'wecom', label: 'WeCom', connectors: ['im', 'docs', 'drive', 'calendar'] },
  { type: 'salesforce', label: 'Salesforce', connectors: ['accounts', 'opportunities', 'contacts', 'cases'] },
  { type: 'feishu-meetings', label: 'Feishu Meetings', connectors: ['recordings', 'transcripts', 'summaries'] },
];

const steps = ['apps.chooseType', 'apps.credentials', 'apps.connection', 'apps.subconnectors', 'apps.review'] as const;

function emptyInput(): EnterpriseAppRegistrationInput {
  return {
    app_type: 'feishu',
    app_id: '',
    display_name: '',
    credentials: { client_id: '', client_secret: '' },
    config: { api_base_url: '', webhook_token: '', sub_connectors: [] },
  };
}

function updateCredential(
  input: EnterpriseAppRegistrationInput,
  key: string,
  value: string,
): EnterpriseAppRegistrationInput {
  return { ...input, credentials: { ...input.credentials, [key]: value } };
}

export function EbrainEnterpriseAppsPage() {
  const { locale, setLocale, t } = useEbrainI18n();
  const [apps, setApps] = useState<EbrainEnterpriseApp[]>([]);
  const [error, setError] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const load = () => {
    getEnterpriseApps()
      .then(data => { setApps(data); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : String(err)));
  };

  useEffect(() => { load(); }, []);

  return (
    <AppLayout
      title={t('apps.title')}
      eyebrow={t('apps.eyebrow')}
      locale={locale}
      setLocale={setLocale}
      t={t}
      actions={(
        <>
          <button className="btn btn-secondary" onClick={load}>{t('common.refresh')}</button>
          <button className="btn btn-primary" onClick={() => setShowWizard(true)}>{t('apps.register')}</button>
        </>
      )}
    >
      {error && <div style={{ color: 'var(--error)', marginBottom: 16 }}>{error}</div>}
      <section className="health-panel">
        <h2 className="section-title">{t('apps.registered')}</h2>
        {apps.length === 0 ? (
          <div className="feed-empty">{t('apps.noRows')}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>app_type</th>
                <th>{t('apps.displayName')}</th>
                <th>{t('apps.sourceCount', { count: '' }).trim()}</th>
                <th>last_sync_at</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.app_type}>
                  <td className="mono">{app.app_type}</td>
                  <td>{app.display_name}</td>
                  <td className="mono">{app.source_count}</td>
                  <td>{app.last_sync_at ? new Date(app.last_sync_at).toLocaleString() : t('common.never')}</td>
                  <td><StatusBadge tone={toneFromState(app.status)}>{app.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {showWizard && <RegisterWizard onClose={() => setShowWizard(false)} onSaved={load} t={t} />}
    </AppLayout>
  );
}

function RegisterWizard({ onClose, onSaved, t }: {
  onClose: () => void;
  onSaved: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<EnterpriseAppRegistrationInput>(emptyInput);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(() => APP_TYPES.find(app => app.type === input.app_type) ?? APP_TYPES[0], [input.app_type]);
  const setField = <K extends keyof EnterpriseAppRegistrationInput>(key: K, value: EnterpriseAppRegistrationInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }));
    setTestResult(null);
  };
  const setConfig = (key: keyof EnterpriseAppRegistrationInput['config'], value: string | string[]) => {
    setInput(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
    setTestResult(null);
  };
  const setCredential = (key: string, value: string) => {
    setInput(prev => updateCredential(prev, key, value));
    setTestResult(null);
  };
  const toggleConnector = (name: string) => {
    const next = input.config.sub_connectors.includes(name)
      ? input.config.sub_connectors.filter(item => item !== name)
      : [...input.config.sub_connectors, name];
    setConfig('sub_connectors', next);
  };

  const runTest = async () => {
    setTesting(true);
    setError('');
    try {
      const result = await testConnection(input);
      setTestResult(result);
      if (!result.ok) setError(result.message ?? t('apps.testFailed', { error: t('common.unknown') }));
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!testResult?.ok) {
      setError(t('apps.testRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await registerEnterpriseApp(input);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const canAdvance = step !== 2 || testResult?.ok;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={event => event.stopPropagation()} style={{ maxWidth: 720, width: 720 }}>
        <div className="modal-title">{t('apps.register')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
          {steps.map((labelKey, index) => (
            <button
              key={labelKey}
              className={index === step ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setStep(index)}
              type="button"
              style={{ paddingLeft: 8, paddingRight: 8 }}
            >
              {index + 1}. {t(labelKey)}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {APP_TYPES.map(app => (
              <button
                key={app.type}
                type="button"
                className={input.app_type === app.type ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setField('app_type', app.type)}
                style={{ textAlign: 'left', padding: 16 }}
              >
                <div style={{ fontWeight: 700 }}>{app.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>{app.connectors.join(' / ')}</div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label>{t('apps.appId')}<input value={input.app_id} onChange={event => setField('app_id', event.target.value)} /></label>
            <label>{t('apps.displayName')}<input value={input.display_name} onChange={event => setField('display_name', event.target.value)} /></label>
            <label>client_id<input value={input.credentials.client_id ?? ''} onChange={event => setCredential('client_id', event.target.value)} /></label>
            <label>{t('apps.secret')}<input type="password" value={input.credentials.client_secret ?? ''} onChange={event => setCredential('client_secret', event.target.value)} /></label>
            <label>{t('apps.baseUrl')}<input value={input.config.api_base_url ?? ''} onChange={event => setConfig('api_base_url', event.target.value)} /></label>
            <label>{t('apps.webhook')}<input type="password" value={input.config.webhook_token ?? ''} onChange={event => setConfig('webhook_token', event.target.value)} /></label>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>{t('apps.testRequired')}</p>
            <button className="btn btn-primary" type="button" onClick={runTest} disabled={testing}>
              {testing ? t('common.loading') : t('common.test')}
            </button>
            {testResult && (
              <div style={{ marginTop: 16 }}>
                <StatusBadge tone={testResult.ok ? 'success' : 'error'}>
                  {testResult.ok ? t('apps.testPassed') : t('apps.testFailed', { error: testResult.message ?? t('common.unknown') })}
                </StatusBadge>
                {testResult.details && <pre className="code-block" style={{ marginTop: 12 }}>{JSON.stringify(testResult.details, null, 2)}</pre>}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>{selected.label}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {selected.connectors.map(name => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #333', borderRadius: 8, padding: 10, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={input.config.sub_connectors.includes(name)}
                    onChange={() => toggleConnector(name)}
                    style={{ width: 'auto' }}
                  />
                  <span className="mono">{name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>{t('apps.saveHint')}</p>
            <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify({
                app_type: input.app_type,
                app_id: input.app_id,
                display_name: input.display_name,
                config: input.config,
                testConnection: testResult?.ok ? 'passed' : 'required',
              }, null, 2)}
            </pre>
          </div>
        )}

        {error && <div style={{ color: 'var(--error)', marginTop: 14 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" type="button" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>{t('common.back')}</button>
            {step < 4 ? (
              <button className="btn btn-primary" type="button" disabled={!canAdvance} onClick={() => setStep(s => Math.min(4, s + 1))}>{t('common.next')}</button>
            ) : (
              <button className="btn btn-primary" type="button" disabled={saving || !testResult?.ok} onClick={save}>{saving ? t('common.loading') : t('common.save')}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
