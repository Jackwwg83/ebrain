import React from 'react';
import { Layout, Menu, Dropdown, Space, Typography, Tag, Avatar } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  AppstoreAddOutlined,
  ApiOutlined,
  CloudSyncOutlined,
  WarningOutlined,
  KeyOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

export interface AppLayoutProps {
  currentPath?: string;
  children: React.ReactNode;
  currentUser?: { name: string; role: string };
}

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/executives', icon: <UserOutlined />, label: '高管管理' },
  { key: '/enterprise-apps', icon: <AppstoreAddOutlined />, label: '企业应用' },
  { key: '/ingestion', icon: <CloudSyncOutlined />, label: '数据接入' },
  { key: '/conflicts', icon: <WarningOutlined />, label: '事实冲突' },
  { key: '/agents', icon: <KeyOutlined />, label: 'MCP 客户端' },
  { key: '/log', icon: <FileTextOutlined />, label: '请求日志' },
];

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPath = '/',
  children,
  currentUser = { name: '平台运维', role: 'Ops' },
}) => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f6f8ff' }}>
      <Sider width={220} style={{ background: 'rgba(255, 255, 255, 0.94)', borderRight: '1px solid rgba(70, 82, 120, 0.08)' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(70, 82, 120, 0.08)' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #1f6fff, #0ea5e9)',
            boxShadow: '0 4px 10px -2px rgba(31, 111, 255, 0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: '#ffffff',
          }}>
            E
          </div>
          <div style={{ marginLeft: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#172033', letterSpacing: '-0.01em' }}>Ebrain</div>
            <div style={{ fontSize: 11, color: '#7a86a3' }}>Enterprise Admin</div>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPath]}
          items={menuItems}
          style={{ background: 'transparent', borderRight: 0, paddingTop: 8 }}
        />
      </Sider>

      <Layout style={{ background: '#f6f8ff' }}>
        <Header style={{
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(70, 82, 120, 0.08)',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Space>
            <Text style={{ color: '#7a86a3', fontSize: 13 }}>当前部署</Text>
            <Tag color="green">ebrain.your-company.com</Tag>
            <Tag>阿里云 ACK · 华东 2</Tag>
          </Space>

          <Space size={16}>
            <Dropdown
              menu={{ items: [
                { key: 'zh', label: '中文' },
                { key: 'en', label: 'English' },
              ]}}
            >
              <Space style={{ cursor: 'pointer', color: '#4b5875' }}>
                <GlobalOutlined />
                <span style={{ fontSize: 13 }}>中文</span>
              </Space>
            </Dropdown>

            <Dropdown
              menu={{ items: [
                { key: 'profile', label: '设置' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
              ]}}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size={28} style={{ background: '#1f6fff' }}>{currentUser.name[0]}</Avatar>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ color: '#172033', fontSize: 13 }}>{currentUser.name}</div>
                  <div style={{ color: '#7a86a3', fontSize: 11 }}>{currentUser.role}</div>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ background: '#f6f8ff', padding: 24, overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
