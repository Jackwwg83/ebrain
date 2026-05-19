import React from 'react';
import { Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  tone?: 'default' | 'success' | 'warn' | 'danger';
}

const toneColor: Record<string, string> = {
  default: '#1f6fff',
  success: '#20a84a',
  warn: '#f59f18',
  danger: '#e5484d',
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, suffix, prefix, trend, tone = 'default' }) => {
  const color = toneColor[tone];
  return (
    <Card bordered={false} style={{ background: '#ffffff' }}>
      <Statistic
        title={<span style={{ color: '#4b5875', fontSize: 13 }}>{title}</span>}
        value={value}
        suffix={suffix}
        prefix={prefix}
        valueStyle={{ color, fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}
      />
      {trend && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#4b5875' }}>
          {trend.direction === 'up' ? (
            <ArrowUpOutlined style={{ color: '#20a84a' }} />
          ) : (
            <ArrowDownOutlined style={{ color: '#e5484d' }} />
          )}
          <span style={{ marginLeft: 4 }}>{Math.abs(trend.value)}%</span>
          <span style={{ marginLeft: 6, color: '#7a86a3' }}>较昨天</span>
        </div>
      )}
    </Card>
  );
};
