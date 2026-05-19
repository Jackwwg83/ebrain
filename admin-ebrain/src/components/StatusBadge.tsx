import React from 'react';
import { Tag } from 'antd';

type Status = 'ok' | 'warn' | 'error' | 'idle' | 'not_configured' | 'token_expired' | 'connected';

const labels: Record<Status, string> = {
  ok: '正常',
  warn: '警告',
  error: '故障',
  idle: '空闲',
  not_configured: '未配置',
  token_expired: 'Token 过期',
  connected: '已连接',
};

const colors: Record<Status, string> = {
  ok: 'success',
  connected: 'success',
  warn: 'warning',
  error: 'error',
  token_expired: 'error',
  idle: 'default',
  not_configured: 'default',
};

export const StatusBadge: React.FC<{ status: Status; label?: string }> = ({ status, label }) => (
  <Tag color={colors[status]} style={{ marginRight: 0 }}>
    {label ?? labels[status]}
  </Tag>
);

export const SeverityBadge: React.FC<{ severity: number }> = ({ severity }) => {
  const color = severity >= 5 ? 'error' : severity >= 3 ? 'warning' : 'default';
  const label = severity >= 5 ? `🔴 ${severity}` : severity >= 3 ? `🟡 ${severity}` : `⚪ ${severity}`;
  return <Tag color={color}>{label}</Tag>;
};
