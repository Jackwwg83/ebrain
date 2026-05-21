import React from 'react';
import { StatusBadge, type StatusTone } from './StatusBadge';

export function StatCard({
  title,
  value,
  detail,
  tone = 'idle',
  badge,
}: {
  title: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: StatusTone;
  badge?: string;
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012)), var(--bg-secondary)',
        border: '1px solid #24243a',
        borderRadius: 12,
        padding: 18,
        minHeight: 126,
        boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, letterSpacing: 0.2 }}>{title}</div>
        {badge && <StatusBadge tone={tone}>{badge}</StatusBadge>}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 34, lineHeight: 1.15, marginTop: 14 }}>
        {value}
      </div>
      {detail && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 10 }}>{detail}</div>}
    </div>
  );
}
