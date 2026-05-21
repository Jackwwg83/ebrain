import React, { useEffect, useMemo, useState } from 'react';
import {
  createExecutive,
  getExecutiveContext,
  getExecutives,
  type CreateExecutiveInput,
  type EbrainExecutiveContext,
  type EbrainExecutiveSummary,
} from '../../api';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { useEbrainI18n } from '../hooks/useEbrainI18n';

function briefTime(profile: EbrainExecutiveSummary, fallback: string): string {
  return profile.lastBriefAt ? new Date(profile.lastBriefAt).toLocaleString() : fallback;
}

function pushTone(profile: EbrainExecutiveSummary): 'success' | 'idle' | 'warn' | 'error' {
  if (profile.pushStatus === 'error') return 'error';
  if (profile.pushStatus === 'pending') return 'warn';
  if (profile.pushStatus === 'success') return 'success';
  return profile.pushPreferences?.morning_brief?.enabled ? 'success' : 'idle';
}

function pushLabel(profile: EbrainExecutiveSummary, fallback: string): string {
  if (profile.pushStatus) return profile.pushStatus;
  const morning = profile.pushPreferences?.morning_brief;
  if (morning?.enabled) return morning.channel ? `enabled / ${morning.channel}` : 'enabled';
  return fallback;
}

export function EbrainExecutivesPage() {
  const { locale, setLocale, t } = useEbrainI18n();
  const [activeRows, setActiveRows] = useState<EbrainExecutiveSummary[]>([]);
  const [allRows, setAllRows] = useState<EbrainExecutiveSummary[]>([]);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<EbrainExecutiveSummary | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getExecutives({ activeOnly: true, limit: 500 }),
      getExecutives({ activeOnly: false, limit: 500 }),
    ])
      .then(([active, all]) => { setActiveRows(active); setAllRows(all); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const archivedRows = useMemo(() => {
    const activeIds = new Set(activeRows.map(row => row.executiveId));
    return allRows.filter(row => !activeIds.has(row.executiveId));
  }, [activeRows, allRows]);
  const rows = tab === 'active' ? activeRows : archivedRows;

  return (
    <AppLayout
      title={t('executives.title')}
      eyebrow={t('executives.eyebrow')}
      locale={locale}
      setLocale={setLocale}
      t={t}
      actions={(
        <>
          <button className="btn btn-secondary" onClick={load}>{t('common.refresh')}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('executives.create')}</button>
        </>
      )}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={tab === 'active' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('active')}>
          {t('executives.active')} ({activeRows.length})
        </button>
        <button className={tab === 'archived' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('archived')}>
          {t('executives.archived')} ({archivedRows.length})
        </button>
      </div>

      {error && <div style={{ color: 'var(--error)', marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div className="feed-empty">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="feed-empty">{t('executives.noRows')}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('executives.id')}</th>
              <th>{t('executives.name')}</th>
              <th>{t('executives.role')}</th>
              <th>{t('executives.email')}</th>
              <th>{t('executives.lastBrief')}</th>
              <th>{t('executives.pushStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.executiveId} onClick={() => setSelected(row)} style={{ cursor: 'pointer' }}>
                <td className="mono">{row.executiveId}</td>
                <td style={{ fontWeight: 600 }}>{row.displayName}</td>
                <td>{row.role}</td>
                <td>{row.email}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{briefTime(row, t('common.never'))}</td>
                <td><StatusBadge tone={pushTone(row)}>{pushLabel(row, t('status.idle'))}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && <ExecutiveDrawer profile={selected} onClose={() => setSelected(null)} t={t} />}
      {showCreate && <CreateExecutiveModal onClose={() => setShowCreate(false)} onCreated={load} t={t} />}
    </AppLayout>
  );
}

function ExecutiveDrawer({ profile, onClose, t }: {
  profile: EbrainExecutiveSummary;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [context, setContext] = useState<EbrainExecutiveContext | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getExecutiveContext(profile.executiveId)
      .then(data => { setContext(data); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : String(err)));
  }, [profile.executiveId]);

  const visibleProfile = context?.profile ?? profile;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={event => event.stopPropagation()} style={{ width: 520 }}>
        <button className="drawer-close" onClick={onClose}>x</button>
        <h2 style={{ marginBottom: 8 }}>{t('executives.drawerTitle')}</h2>
        <div className="mono" style={{ color: 'var(--accent)', marginBottom: 20 }}>{visibleProfile.executiveId}</div>
        {error && <div style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 12px', marginBottom: 20 }}>
          <span style={{ color: 'var(--text-muted)' }}>{t('executives.name')}</span><span>{visibleProfile.displayName}</span>
          <span style={{ color: 'var(--text-muted)' }}>{t('executives.role')}</span><span>{visibleProfile.role}</span>
          <span style={{ color: 'var(--text-muted)' }}>{t('executives.email')}</span><span>{visibleProfile.email}</span>
          <span style={{ color: 'var(--text-muted)' }}>timezone</span><span>{visibleProfile.timezone ?? '--'}</span>
        </div>
        <h3 className="section-title">ExecutiveProfile</h3>
        <pre className="code-block" style={{ whiteSpace: 'pre-wrap', marginBottom: 18 }}>
          {JSON.stringify(visibleProfile, null, 2)}
        </pre>
        <h3 className="section-title">{t('executives.prompt')}</h3>
        <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>
          {context?.prompt ?? t('common.loading')}
        </pre>
      </aside>
    </div>
  );
}

function CreateExecutiveModal({ onClose, onCreated, t }: {
  onClose: () => void;
  onCreated: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [form, setForm] = useState<CreateExecutiveInput>({
    executive_id: '',
    email: '',
    name: '',
    role: '',
    soul_path: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const update = (key: keyof CreateExecutiveInput, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createExecutive(form);
      setMessage(t('executives.created'));
      onCreated();
      window.setTimeout(onClose, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={event => event.stopPropagation()} onSubmit={submit}>
        <div className="modal-title">{t('executives.createTitle')}</div>
        <label>{t('executives.id')}<input value={form.executive_id} onChange={event => update('executive_id', event.target.value)} required autoFocus /></label>
        <label>{t('executives.email')}<input type="email" value={form.email} onChange={event => update('email', event.target.value)} required /></label>
        <label>{t('executives.name')}<input value={form.name} onChange={event => update('name', event.target.value)} required /></label>
        <label>{t('executives.role')}<input value={form.role} onChange={event => update('role', event.target.value)} required /></label>
        <label>{t('executives.soulPath')}<input value={form.soul_path} onChange={event => update('soul_path', event.target.value)} required /></label>
        {error && <div style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</div>}
        {message && <div style={{ color: 'var(--success)', marginBottom: 12 }}>{message}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.loading') : t('common.save')}</button>
        </div>
      </form>
    </div>
  );
}
