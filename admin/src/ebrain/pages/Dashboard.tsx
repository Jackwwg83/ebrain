import React, { useEffect, useMemo, useState } from 'react';
import { getEbrainEventSource, getStats, type EbrainAppType, type EbrainStats } from '../../api';
import { AppLayout } from '../components/AppLayout';
import { StatCard } from '../components/StatCard';
import { StatusBadge, toneFromState, type StatusTone } from '../components/StatusBadge';
import { useEbrainI18n } from '../hooks/useEbrainI18n';

interface FeedEvent {
  agent?: string;
  operation?: string;
  scopes?: string;
  latency_ms?: number;
  status?: string;
  timestamp?: string;
}

const APP_TYPES: EbrainAppType[] = ['feishu', 'dingtalk', 'wecom', 'salesforce', 'feishu-meetings'];
const ENTERPRISE_OPS = new Set(['list_executives', 'get_executive_context', 'enterprise_ingest_status', 'detect_enterprise_conflicts']);

function isEnterpriseEvent(event: FeedEvent): boolean {
  const operation = event.operation ?? '';
  return ENTERPRISE_OPS.has(operation) || operation.startsWith('enterprise_') || operation.includes('executive') || operation.includes('ebrain');
}

function timeAgo(ts?: string | null): string {
  if (!ts) return '--';
  const diff = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(diff)) return '--';
  if (diff < 60000) return `${Math.max(0, Math.floor(diff / 1000))}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function statusLabel(t: (key: string) => string, tone: StatusTone): string {
  if (tone === 'success') return t('status.success');
  if (tone === 'warn') return t('status.warn');
  if (tone === 'error') return t('status.error');
  return t('status.idle');
}

export function EbrainDashboardPage() {
  const { locale, setLocale, t } = useEbrainI18n();
  const [stats, setStats] = useState<EbrainStats | null>(null);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const load = () => {
    getStats()
      .then(data => { setStats(data); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : String(err)));
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    const es = getEbrainEventSource();
    es.onopen = () => setSseStatus('connected');
    es.onmessage = event => {
      try {
        const parsed = JSON.parse(event.data) as FeedEvent;
        if (isEnterpriseEvent(parsed)) setEvents(prev => [parsed, ...prev].slice(0, 50));
      } catch {
        // Ignore malformed SSE rows; the backend feed is best-effort audit data.
      }
    };
    es.onerror = () => setSseStatus('disconnected');
    return () => { window.clearInterval(interval); es.close(); };
  }, []);

  const appMap = useMemo(() => new Map(stats?.appHealth.map(app => [app.app_type, app]) ?? []), [stats]);
  const dreamTone = stats?.dreamCycle.status ?? 'idle';
  const sseTone = sseStatus === 'connected' ? 'success' : sseStatus === 'connecting' ? 'warn' : 'error';

  return (
    <AppLayout
      title={t('dashboard.title')}
      eyebrow={t('dashboard.eyebrow')}
      locale={locale}
      setLocale={setLocale}
      t={t}
      actions={<button className="btn btn-secondary" onClick={load}>{t('common.refresh')}</button>}
    >
      {error && (
        <div style={{ color: 'var(--error)', marginBottom: 16 }} role="alert">
          {t('dashboard.apiError', { error })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 22 }}>
        <StatCard
          title={t('dashboard.activeExecutives')}
          value={stats ? stats.activeExecutiveCount : '--'}
          tone="success"
          badge={t('status.success')}
        />
        <StatCard
          title={t('dashboard.briefsToday')}
          value={stats?.briefsToday ?? '--'}
          detail={t('dashboard.successRate', { rate: stats?.briefSuccessRate == null ? '--' : `${Math.round(stats.briefSuccessRate * 100)}%` })}
          tone="idle"
          badge={t('status.idle')}
        />
        <StatCard
          title={t('dashboard.conflicts')}
          value={stats ? stats.pendingConflictCount : '--'}
          tone={stats && stats.pendingConflictCount > 0 ? 'warn' : 'success'}
          badge={stats && stats.pendingConflictCount > 0 ? t('status.warn') : t('status.success')}
        />
        <StatCard
          title={t('dashboard.dreamHealth')}
          value={statusLabel(t, dreamTone)}
          detail={t('dashboard.lastRun', { time: timeAgo(stats?.dreamCycle.lastRunAt) })}
          tone={dreamTone}
          badge={statusLabel(t, dreamTone)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 18 }}>
        <section className="health-panel" style={{ minHeight: 420 }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('dashboard.liveActivity')}
            <StatusBadge tone={sseTone}>{t(`status.${sseStatus}`)}</StatusBadge>
          </h2>
          {events.length === 0 ? (
            <div className="feed-empty">{t('dashboard.noActivity')}</div>
          ) : (
            <div className="feed">
              <table>
                <thead>
                  <tr>
                    <th>{t('dashboard.eventAgent')}</th>
                    <th>{t('dashboard.eventOperation')}</th>
                    <th>{t('dashboard.eventLatency')}</th>
                    <th>{t('dashboard.eventStatus')}</th>
                    <th>{t('dashboard.eventTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => {
                    const tone = toneFromState(event.status);
                    return (
                      <tr key={`${event.timestamp ?? 'event'}-${index}`}>
                        <td className="mono">{event.agent ?? '--'}</td>
                        <td className="mono">{event.operation ?? '--'}</td>
                        <td className="mono">{event.latency_ms ?? '--'} ms</td>
                        <td><StatusBadge tone={tone}>{event.status ?? t('common.unknown')}</StatusBadge></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{timeAgo(event.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside>
          <section className="health-panel" style={{ marginBottom: 16 }}>
            <h2 className="section-title">{t('dashboard.appHealth')}</h2>
            {APP_TYPES.map(appType => {
              const app = appMap.get(appType);
              const tone = toneFromState(app?.status);
              return (
                <div className="health-row" key={appType} style={{ alignItems: 'center', borderTop: '1px solid #232338' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{appType}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {app ? t('apps.sourceCount', { count: app.source_count }) : t('common.empty')}
                    </div>
                  </div>
                  <StatusBadge tone={tone}>{app?.status ?? t('status.idle')}</StatusBadge>
                </div>
              );
            })}
          </section>

          <section className="health-panel">
            <h2 className="section-title">{t('dashboard.dreamCycle')}</h2>
            {(stats?.dreamCycle.phases ?? []).map(phase => (
              <div className="health-row" key={phase.phase} style={{ alignItems: 'center', borderTop: '1px solid #232338' }}>
                <span className="mono">{phase.phase}</span>
                <StatusBadge tone={phase.status}>{statusLabel(t, phase.status)}</StatusBadge>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </AppLayout>
  );
}
