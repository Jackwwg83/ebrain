import React from 'react';

export type StatusTone = 'success' | 'warn' | 'error' | 'idle';

const palette: Record<StatusTone, { color: string; background: string; border: string }> = {
  success: { color: 'var(--success)', background: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.28)' },
  warn: { color: 'var(--warning)', background: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)' },
  error: { color: 'var(--error)', background: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.28)' },
  idle: { color: 'var(--text-muted)', background: 'rgba(136,136,136,0.10)', border: 'rgba(136,136,136,0.24)' },
};

export function toneFromState(state?: string | null): StatusTone {
  const value = (state ?? '').toLowerCase();
  if (['success', 'healthy', 'connected', 'closed', 'ok', 'active', 'enabled', 'passed'].includes(value)) return 'success';
  if (['warn', 'warning', 'degraded', 'open', 'pending', 'running'].includes(value)) return 'warn';
  if (['error', 'failed', 'failure', 'disconnected', 'disabled'].includes(value)) return 'error';
  return 'idle';
}

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const style = palette[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        padding: '3px 9px',
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: style.color }} />
      {children}
    </span>
  );
}
