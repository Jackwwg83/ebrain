import React from 'react';
import { Card, Typography, Space, Tag, Button, Table, Dropdown, Modal, Alert } from 'antd';
import { KeyOutlined, DownloadOutlined, CopyOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';
import { OAUTH_CLIENTS } from '../mock/data';

const { Title, Text, Paragraph } = Typography;

const exportFormats = [
  { key: 'claude-desktop', label: 'Claude Desktop (mcp.json)' },
  { key: 'cursor', label: 'Cursor (.cursor/mcp.json)' },
  { key: 'json', label: '通用 JSON' },
];

const sampleClaudeDesktopConfig = `{
  "mcpServers": {
    "ebrain": {
      "url": "https://ebrain.your-company.com/mcp",
      "headers": {
        "Authorization": "Bearer <生成的 token>",
        "X-Executive-Id": "ceo"
      },
      "transport": "http"
    }
  }
}`;

export const Agents: React.FC = () => {
  const [exportModalOpen, setExportModalOpen] = React.useState(false);

  return (
    <AppLayout currentPath="/agents">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ color: '#172033', margin: 0 }}>MCP 客户端管理</Title>
          <Text style={{ color: '#7a86a3', fontSize: 13 }}>
            OAuth 2.1 客户端 · 每个客户端绑定一个 executive_id · MVP 简化版（admin token 通行）
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>注册新客户端</Button>
      </div>

      <Card bordered={false} style={{ background: '#ffffff' }}>
        <Table
          dataSource={OAUTH_CLIENTS}
          rowKey="client_id"
          pagination={false}
          columns={[
            {
              title: '客户端',
              dataIndex: 'client_name',
              render: (name, row) => (
                <div>
                  <div style={{ color: '#172033', fontSize: 14, fontWeight: 500 }}>{name}</div>
                  <Text className="mono" style={{ fontSize: 11 }}>{row.client_id}</Text>
                </div>
              ),
            },
            {
              title: '绑定高管',
              render: (_, row) =>
                row.executive_id ? (
                  <Tag color="blue">{row.executive_name} ({row.executive_id})</Tag>
                ) : (
                  <Tag color="orange">平台 Ops（无 executive 绑定）</Tag>
                ),
            },
            {
              title: '授权类型',
              dataIndex: 'grant_types',
              render: (gt) => (
                <Space size={4}>
                  {gt.map((g: string) => (
                    <Tag key={g} className="mono" style={{ fontSize: 11 }}>{g}</Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: 'Scope',
              dataIndex: 'scopes',
              render: (s) => (
                <Space size={4}>
                  {s.map((sc: string) => (
                    <Tag key={sc} color="cyan">{sc}</Tag>
                  ))}
                </Space>
              ),
            },
            { title: '30 天请求数', dataIndex: 'requests_30d', align: 'right', render: (v) => <Text className="mono">{v.toLocaleString()}</Text> },
            { title: '最近使用', dataIndex: 'last_used_at', render: (v) => <Text style={{ color: '#7a86a3', fontSize: 12 }}>{v}</Text> },
            {
              title: '操作',
              align: 'right',
              render: (_, row) => (
                <Space>
                  <Dropdown
                    menu={{
                      items: exportFormats.map(f => ({ key: f.key, label: f.label })),
                      onClick: () => setExportModalOpen(true),
                    }}
                  >
                    <Button type="link" icon={<DownloadOutlined />}>导出配置 ▼</Button>
                  </Dropdown>
                  <Button type="link" size="small" icon={<KeyOutlined />}>重发 token</Button>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>撤销</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* 导出 Claude Desktop 配置 Modal */}
      <Modal
        title="导出 Claude Desktop 配置"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        width={600}
        footer={[
          <Button key="close" onClick={() => setExportModalOpen(false)}>关闭</Button>,
          <Button key="copy" type="primary" icon={<CopyOutlined />}>复制 JSON</Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />}>下载 mcp.json</Button>,
        ]}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="一次性显示 token"
            description="为安全考虑，bearer token 仅在生成后一次性显示。关闭此窗口后无法重新查看，需要重发。"
          />

          <div>
            <Text style={{ color: '#172033' }}>1. 复制以下配置到 Claude Desktop:</Text>
            <Text style={{ color: '#7a86a3', fontSize: 12, marginLeft: 8 }} className="mono">
              ~/Library/Application Support/Claude/claude_desktop_config.json
            </Text>
          </div>

          <pre style={{
            background: '#eef3ff',
            border: '1px solid #e0e4ee',
            borderRadius: 6,
            padding: 16,
            fontSize: 12,
            color: '#172033',
            overflowX: 'auto',
            margin: 0,
          }}>
            <code className="mono">{sampleClaudeDesktopConfig}</code>
          </pre>

          <Paragraph style={{ color: '#4b5875', fontSize: 13, margin: 0 }}>
            2. 重启 Claude Desktop。在新对话中输入 <Text className="mono" style={{ color: '#1f6fff' }}>"What did our team discuss this morning?"</Text>，Claude 会自动调用 ebrain 工具。
          </Paragraph>
        </Space>
      </Modal>
    </AppLayout>
  );
};
