import React from 'react';
import { Card, Typography, Space, Tag, Button, Table, Row, Col, Progress, Statistic, Tooltip } from 'antd';
import { CloudSyncOutlined, PlayCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { SUB_CONNECTORS, ENTERPRISE_APPS } from '../mock/data';

const { Title, Text } = Typography;

export const Ingestion: React.FC = () => {
  const totalToday = SUB_CONNECTORS.reduce((s, c) => s + c.objects_today, 0);
  const failedToday = SUB_CONNECTORS.reduce((s, c) => s + c.failed_today, 0);
  const errored = SUB_CONNECTORS.filter(c => c.status === 'error').length;
  const warning = SUB_CONNECTORS.filter(c => c.status === 'warn').length;

  return (
    <AppLayout currentPath="/ingestion">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#172033', margin: 0 }}>数据接入</Title>
        <Text style={{ color: '#7a86a3', fontSize: 13 }}>
          5 个 EnterpriseApp · {SUB_CONNECTORS.length} 个子 Connector · Webhook + Cron 双轨同步
        </Text>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#ffffff' }}>
            <Statistic
              title={<span style={{ color: '#4b5875', fontSize: 13 }}>今日入库对象</span>}
              value={totalToday}
              valueStyle={{ color: '#1f6fff', fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#ffffff' }}>
            <Statistic
              title={<span style={{ color: '#4b5875', fontSize: 13 }}>失败</span>}
              value={failedToday}
              valueStyle={{ color: failedToday > 0 ? '#e5484d' : '#20a84a', fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#ffffff' }}>
            <Statistic
              title={<span style={{ color: '#4b5875', fontSize: 13 }}>故障 Connector</span>}
              value={errored}
              suffix={`/ ${SUB_CONNECTORS.length}`}
              valueStyle={{ color: errored > 0 ? '#e5484d' : '#20a84a', fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#ffffff' }}>
            <Statistic
              title={<span style={{ color: '#4b5875', fontSize: 13 }}>预警 Connector</span>}
              value={warning}
              valueStyle={{ color: warning > 0 ? '#f59f18' : '#20a84a', fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{ background: '#ffffff' }}
        title={<Space><CloudSyncOutlined /><span>子 Connector 健康度</span></Space>}
        extra={<Space>
          <Button icon={<PlayCircleOutlined />}>全部立即同步</Button>
        </Space>}
      >
        <Table
          size="small"
          dataSource={SUB_CONNECTORS}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: '所属应用',
              dataIndex: 'app',
              render: (v) => {
                const app = ENTERPRISE_APPS.find(a => a.app_id === v);
                return <Tag>{app?.display_name.split(' ')[0] ?? v}</Tag>;
              },
            },
            { title: '子模块', dataIndex: 'name', render: (v) => <Text style={{ color: '#172033' }}>{v}</Text> },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s, row) => (
                <Space>
                  <StatusBadge status={s} />
                  {row.failed_today > 0 && (
                    <Tooltip title={`今日失败 ${row.failed_today} 条`}>
                      <Tag color="error" icon={<WarningOutlined />}>{row.failed_today}</Tag>
                    </Tooltip>
                  )}
                </Space>
              ),
            },
            {
              title: '同步延迟',
              dataIndex: 'lag_minutes',
              align: 'right',
              render: (m) => {
                const color = m < 30 ? '#20a84a' : m < 60 ? '#f59f18' : '#e5484d';
                return <Text style={{ color, fontWeight: 600 }}>{m}m</Text>;
              },
            },
            { title: '最近成功', dataIndex: 'last_success_at', render: (v) => <Text style={{ color: '#4b5875', fontSize: 12 }}>{v}</Text> },
            { title: '今日入库', dataIndex: 'objects_today', align: 'right', render: (v) => <Text className="mono">{v}</Text> },
            {
              title: '操作',
              align: 'right',
              render: () => (
                <Space>
                  <Button type="link" size="small">立即同步</Button>
                  <Button type="link" size="small">查看日志</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </AppLayout>
  );
};
