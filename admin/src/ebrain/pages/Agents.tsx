import React, { useEffect, useState } from 'react';
import {
  createOAuthClient,
  getExecutives,
  getOAuthClients,
  revokeOAuthClient,
  type CreateOAuthClientInput,
  type EbrainExecutiveSummary,
  type EbrainOAuthClient,
} from '../../api';
import { AppLayout } from '../components/AppLayout';
import { ClientConfigExportModal } from '../components/ClientConfigExportModal';
import { StatusBadge, toneFromState } from '../components/StatusBadge';
import { useEbrainI18n } from '../hooks/useEbrainI18n';

export function EbrainAgentsPage() {
  const { locale, setLocale, t } = useEbrainI18n();
  const [clients, setClients] = useState<EbrainOAuthClient[]>([]);
  const [executives, setExecutives] = useState<EbrainExecutiveSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [exportClientId, setExportClientId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getOAuthClients(), getExecutives({ activeOnly: true, limit: 500 })])
      .then(([clientRows, executiveRows]) => { setClients(clientRows); setExecutives(executiveRows); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const revoke = async (clientId: string) => {
    if (!confirm(t('agents.revokeConfirm', { clientId }))) return;
    try {
      await revokeOAuthClient(clientId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <AppLayout
      title={t('agents.title')}
      eyebrow={t('agents.eyebrow')}
      locale={locale}
      setLocale={setLocale}
      t={t}
      actions={(
        <>
          <button className="btn btn-secondary" onClick={load}>{t('common.refresh')}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('agents.create')}</button>
        </>
      )}
    >
      {error && <div style={{ color: 'var(--error)', marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div className="feed-empty">{t('common.loading')}</div>
      ) : clients.length === 0 ? (
        <div className="feed-empty">{t('agents.noRows')}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>client_id</th>
              <th>{t('agents.name')}</th>
              <th>{t('agents.scopes')}</th>
              <th>{t('agents.binding')}</th>
              <th>{t('agents.createdAt')}</th>
              <th>{t('agents.lastUsedAt')}</th>
              <th>{t('agents.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.client_id}>
                <td className="mono">{client.client_id}</td>
                <td>{client.client_name}</td>
                <td className="mono">{client.scopes.join(' ')}</td>
                <td className="mono">{client.executive_id ?? '--'}</td>
                <td>{new Date(client.created_at).toLocaleString()}</td>
                <td>{client.last_used_at ? new Date(client.last_used_at).toLocaleString() : t('common.never')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" type="button" onClick={() => setExportClientId(client.client_id)}>{t('agents.export')}</button>
                    <button className="btn btn-secondary" type="button" onClick={() => revoke(client.client_id)}><StatusBadge tone={toneFromState('error')}>{t('agents.revoke')}</StatusBadge></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showCreate && <CreateAgentModal executives={executives} onClose={() => setShowCreate(false)} onCreated={load} t={t} />}
      {exportClientId && <ClientConfigExportModal clientId={exportClientId} onClose={() => setExportClientId(null)} t={t} />}
    </AppLayout>
  );
}

function CreateAgentModal({ executives, onClose, onCreated, t }: {
  executives: EbrainExecutiveSummary[];
  onClose: () => void;
  onCreated: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [form, setForm] = useState<CreateOAuthClientInput>({
    name: '',
    executive_id: executives[0]?.executiveId ?? '',
    scopes: 'read write',
    grant_types: ['client_credentials'],
    redirect_uris: [],
    source_id: 'enterprise',
    federated_read: ['enterprise'],
  });
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await createOAuthClient(form) as { clientSecret?: string; client_secret?: string };
      setSecret(result.clientSecret ?? result.client_secret ?? '');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={event => event.stopPropagation()} onSubmit={submit}>
        <div className="modal-title">{t('agents.createTitle')}</div>
        <label>{t('agents.name')}<input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} required autoFocus /></label>
        <label>{t('agents.binding')}
          <select value={form.executive_id} onChange={event => setForm(prev => ({ ...prev, executive_id: event.target.value }))} required>
            <option value="">{t('agents.chooseExecutive')}</option>
            {executives.map(row => <option key={row.executiveId} value={row.executiveId}>{row.executiveId} / {row.displayName}</option>)}
          </select>
        </label>
        <label>{t('agents.scopes')}<input value={form.scopes} onChange={event => setForm(prev => ({ ...prev, scopes: event.target.value }))} required /></label>
        {secret && <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ clientSecret: secret }, null, 2)}</pre>}
        {error && <div style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>{t('common.close')}</button>
          <button className="btn btn-primary" type="submit" disabled={saving || Boolean(secret)}>{saving ? t('common.loading') : t('common.save')}</button>
        </div>
      </form>
    </div>
  );
}
