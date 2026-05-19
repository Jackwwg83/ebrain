import React from 'react';
import { Card, Typography, Space, Tag, Button, Row, Col, Modal, Steps, Form, Input, Select, Alert, Result } from 'antd';
import { PlusOutlined, ApiOutlined, CheckCircleOutlined, WarningOutlined, ReloadOutlined, ExperimentOutlined } from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { ENTERPRISE_APPS } from '../mock/data';

const { Title, Text, Paragraph } = Typography;

const appIcons: Record<string, string> = {
  feishu: '🟢',
  dingtalk: '🔵',
  wecom: '🟣',
  'tencent-meeting': '🟠',
  'crm-shenxiao': '🔴',
};

export const EnterpriseApps: React.FC = () => {
  const [wizardOpen, setWizardOpen] = React.useState(false);

  return (
    <AppLayout currentPath="/enterprise-apps">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ color: '#172033', margin: 0 }}>企业应用</Title>
          <Text style={{ color: '#7a86a3', fontSize: 13 }}>
            5 个 EnterpriseApp · 20+ 子 Connector · 每应用承担数据接入 / 机器人 / 主动推送
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)}>
          注册新应用
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {ENTERPRISE_APPS.map((app) => (
          <Col span={12} key={app.app_id}>
            <Card
              bordered={false}
              style={{ background: '#ffffff' }}
              actions={[
                <Button type="link" icon={<ExperimentOutlined />}>测试连接</Button>,
                <Button type="link" icon={<ReloadOutlined />}>刷新 Token</Button>,
                <Button type="link">配置 →</Button>,
              ]}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Space>
                    <span style={{ fontSize: 24 }}>{appIcons[app.app_type] ?? '⚪'}</span>
                    <div>
                      <div style={{ color: '#172033', fontSize: 16, fontWeight: 600 }}>{app.display_name}</div>
                      <Text className="mono" style={{ fontSize: 11 }}>{app.app_id}</Text>
                    </div>
                  </Space>
                  <StatusBadge status={app.status as any} />
                </div>

                {app.status !== 'not_configured' && (
                  <>
                    <Space size={4} wrap>
                      {app.bot_enabled && <Tag color="green">机器人</Tag>}
                      {app.push_enabled && <Tag color="cyan">主动推送</Tag>}
                      {app.sub_connectors.map((c) => (
                        <Tag key={c}>{c}</Tag>
                      ))}
                    </Space>

                    <div style={{ background: '#eef3ff', padding: 12, borderRadius: 6 }}>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Text style={{ color: '#7a86a3', fontSize: 11 }}>租户域</Text>
                          <div className="mono" style={{ fontSize: 12, color: '#172033' }}>{app.tenant ?? '-'}</div>
                        </Col>
                        <Col span={12}>
                          <Text style={{ color: '#7a86a3', fontSize: 11 }}>Token 到期</Text>
                          <div className="mono" style={{ fontSize: 12, color: '#172033' }}>{app.token_expires_at ?? '-'}</div>
                        </Col>
                      </Row>
                    </div>

                    <div style={{ background: '#eef3ff', padding: 12, borderRadius: 6 }}>
                      <Text style={{ color: '#7a86a3', fontSize: 11 }}>Webhook URL</Text>
                      <div className="mono" style={{ fontSize: 12, color: '#1f6fff' }}>{app.webhook_url}</div>
                    </div>

                    <Row>
                      <Col span={12}>
                        <Text style={{ color: '#7a86a3', fontSize: 11 }}>今日事件</Text>
                        <div style={{ color: '#20a84a', fontSize: 20, fontWeight: 700 }}>{app.events_today}</div>
                      </Col>
                      <Col span={12}>
                        <Text style={{ color: '#7a86a3', fontSize: 11 }}>连续错误</Text>
                        <div style={{ color: app.consecutive_errors > 0 ? '#e5484d' : '#20a84a', fontSize: 20, fontWeight: 700 }}>
                          {app.consecutive_errors}
                        </div>
                      </Col>
                    </Row>

                    {app.status === 'token_expired' && (
                      <Alert
                        type="error"
                        showIcon
                        message="Token 已过期 13 分钟"
                        description="点击「刷新 Token」自动重新拉取，或检查 AppSecret 是否仍有效。"
                      />
                    )}
                  </>
                )}

                {app.status === 'not_configured' && (
                  <Result
                    status="info"
                    title="未配置"
                    subTitle="点击下方「配置」开始 5 步注册向导"
                    style={{ padding: '8px 0' }}
                  />
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 5 步注册 wizard */}
      <Modal
        title="注册新企业应用"
        open={wizardOpen}
        onCancel={() => setWizardOpen(false)}
        width={720}
        footer={null}
      >
        <Steps
          current={1}
          style={{ marginBottom: 24, marginTop: 16 }}
          items={[
            { title: '选类型' },
            { title: '创建自建应用' },
            { title: '填凭证' },
            { title: '配置 webhook' },
            { title: '测试连接' },
          ]}
        />

        <Card bordered style={{ background: '#eef3ff', borderColor: '#e0e4ee' }}>
          <Title level={5} style={{ color: '#172033' }}>Step 2: 在飞书开放平台创建自建应用</Title>
          <Paragraph style={{ color: '#4b5875' }}>
            前往 <a style={{ color: '#1f6fff' }}>open.feishu.cn</a> → 创建自建应用 → 完成以下配置：
          </Paragraph>
          <ol style={{ color: '#4b5875', fontSize: 13, lineHeight: 1.8 }}>
            <li>应用名称：<Text className="mono">Ebrain (你的公司)</Text></li>
            <li>权限申请：勾选 IM、云文档、Wiki、网盘、日历、视频会议 全部读权限</li>
            <li>事件订阅 → 配置请求地址：<Text className="mono" style={{ color: '#1f6fff' }}>https://ebrain.your-company.com/webhook/feishu/event</Text> <Button size="small" type="link">[复制]</Button></li>
            <li>事件订阅 → 订阅事件：消息发送 / 文档变更 / 会议结束</li>
            <li>发布版本并通过审核</li>
          </ol>
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="飞书要求审核通过后才能收到 webhook，通常 1 小时内。"
            style={{ marginTop: 12 }}
          />
          <Space style={{ marginTop: 20 }}>
            <Button>上一步</Button>
            <Button type="primary">下一步：填凭证</Button>
          </Space>
        </Card>
      </Modal>
    </AppLayout>
  );
};
