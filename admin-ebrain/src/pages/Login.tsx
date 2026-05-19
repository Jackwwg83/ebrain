import React from 'react';
import { Card, Button, Space, Typography, Divider } from 'antd';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(at 20% 20%, rgba(31, 111, 255, 0.12) 0%, transparent 50%),
        radial-gradient(at 80% 80%, rgba(14, 165, 233, 0.10) 0%, transparent 50%),
        #f6f8ff
      `,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Card
        bordered={false}
        style={{
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          width: 440,
          padding: '16px 8px',
          boxShadow: '0 20px 60px -10px rgba(45, 91, 184, 0.18), 0 8px 24px -8px rgba(45, 91, 184, 0.10)',
          border: '1px solid rgba(70, 82, 120, 0.08)',
        }}
      >
        <Space direction="vertical" size={28} style={{ width: '100%' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #1f6fff, #0ea5e9)',
              boxShadow: '0 12px 24px -6px rgba(31, 111, 255, 0.45)',
              fontSize: 28, fontWeight: 800, color: '#ffffff',
            }}>
              E
            </div>
            <Title level={3} style={{ color: '#172033', marginTop: 16, marginBottom: 4 }}>Ebrain</Title>
            <Text style={{ color: '#7a86a3', fontSize: 13 }}>Enterprise AI 知识平面 · 管理后台</Text>
          </div>

          {/* SSO buttons */}
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Button
              size="large"
              block
              style={{ background: '#ffffff', borderColor: '#c4cee9', color: '#172033', height: 48 }}
              icon={<span style={{ marginRight: 4 }}>🟢</span>}
            >
              飞书（Lark）登录
            </Button>
            <Button
              size="large"
              block
              style={{ background: '#ffffff', borderColor: '#c4cee9', color: '#172033', height: 48 }}
              icon={<span style={{ marginRight: 4 }}>🔵</span>}
            >
              钉钉登录
            </Button>
            <Button
              size="large"
              block
              style={{ background: '#ffffff', borderColor: '#c4cee9', color: '#172033', height: 48 }}
              icon={<span style={{ marginRight: 4 }}>🟣</span>}
            >
              企业微信登录
            </Button>
          </Space>

          <Divider style={{ borderColor: '#e0e4ee', margin: '4px 0' }}>
            <Text style={{ color: '#7a86a3', fontSize: 12 }}>或</Text>
          </Divider>

          {/* OIDC / 反向代理 fallback */}
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Button
              size="large"
              block
              style={{ background: 'transparent', borderColor: '#c4cee9', color: '#4b5875', height: 40 }}
            >
              使用 OIDC（Google Workspace / Microsoft Entra）
            </Button>
            <Button
              type="link"
              block
              style={{ color: '#7a86a3', fontSize: 12 }}
            >
              已配置反向代理 SSO？点此进入
            </Button>
          </Space>

          {/* Footer */}
          <div style={{ textAlign: 'center', borderTop: '1px solid #e0e4ee', paddingTop: 16 }}>
            <Text style={{ color: '#7a86a3', fontSize: 11 }}>
              MVP 仅向 executives 表中 active 的高管开放
            </Text>
            <br />
            <Text style={{ color: '#7a86a3', fontSize: 11 }} className="mono">
              ebrain.your-company.com
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};
