import React from 'react';
import { Row, Col, Card, Typography, Space, Tag, Progress, Timeline, Table, Divider } from 'antd';
import { ApiOutlined, ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';
import { StatCard } from '../components/StatCard';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { STATS, ENTERPRISE_APPS, SUB_CONNECTORS, FACT_CONFLICTS, SSE_FEED, DREAM_CYCLE_STATUS } from '../mock/data';

const { Title, Text } = Typography;

export const Dashboard: React.FC = () => {
  return (
    <AppLayout currentPath="/">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#172033', margin: 0 }}>Ebrain 仪表盘</Title>
        <Text style={{ color: '#7a86a3', fontSize: 13 }}>
          企业 AI 知识平面 · 实时活动 · 关键健康指标
        </Text>
      </div>

      {/* 4 个 stat card */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <StatCard title="活跃高管" value={STATS.active_executives} suffix="/ 10" tone="success" />
        </Col>
        <Col span={6}>
          <StatCard title="知识库总页数" value={STATS.total_pages.toLocaleString()} trend={{ value: 4.2, direction: 'up' }} />
        </Col>
        <Col span={6}>
          <StatCard title="今日查询数" value={STATS.queries_today} trend={{ value: 12, direction: 'up' }} />
        </Col>
        <Col span={6}>
          <StatCard title="待处理冲突" value={STATS.open_conflicts} tone="warn" trend={{ value: 2, direction: 'down' }} />
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 实时活动流 */}
        <Col span={10}>
          <Card
            title={<Space><ThunderboltOutlined style={{ color: '#1f6fff' }} /><span>实时活动</span></Space>}
            bordered={false}
            style={{ background: '#ffffff', height: 420 }}
            extra={<Tag color="green">SSE 连接</Tag>}
          >
            <Timeline
              items={SSE_FEED.map((evt) => ({
                color: '#1f6fff',
                children: (
                  <div>
                    <Space>
                      <Tag color="blue">{evt.executive}</Tag>
                      <Text style={{ color: '#172033' }} className="mono">{evt.op}</Text>
                      <Text style={{ color: '#7a86a3', fontSize: 12 }}>{evt.latency}ms</Text>
                    </Space>
                    <div style={{ color: '#7a86a3', fontSize: 12, marginTop: 2 }}>{evt.ts}</div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>

        {/* 5 个 EnterpriseApp 健康度 */}
        <Col span={14}>
          <Card
            title={<Space><ApiOutlined style={{ color: '#1f6fff' }} /><span>企业应用接入健康度</span></Space>}
            bordered={false}
            style={{ background: '#ffffff', height: 420 }}
            extra={<a style={{ color: '#1f6fff' }}>查看全部 →</a>}
          >
            <Table
              size="small"
              pagination={false}
              dataSource={ENTERPRISE_APPS}
              rowKey="app_id"
              columns={[
                { title: '应用', dataIndex: 'display_name', render: (v) => <Text style={{ color: '#172033' }}>{v}</Text> },
                { title: '状态', dataIndex: 'status', render: (s) => <StatusBadge status={s} /> },
                { title: '机器人', dataIndex: 'bot_enabled', render: (v) => v ? <Tag color="green">已启用</Tag> : <Tag>关闭</Tag> },
                { title: '今日事件', dataIndex: 'events_today', align: 'right', render: (v) => <Text className="mono">{v}</Text> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        {/* Dream Cycle 状态 */}
        <Col span={10}>
          <Card
            title={<Space><ClockCircleOutlined style={{ color: '#1f6fff' }} /><span>Dream Cycle 维护循环</span></Space>}
            bordered={false}
            style={{ background: '#ffffff' }}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <Text style={{ color: '#7a86a3', fontSize: 12 }}>上次运行</Text>
                <div style={{ color: '#172033', marginTop: 2 }}>{DREAM_CYCLE_STATUS.last_run_at}（耗时 {DREAM_CYCLE_STATUS.duration_minutes} 分钟）</div>
              </div>
              <Divider style={{ margin: '4px 0', borderColor: '#e0e4ee' }} />
              <Row gutter={16}>
                <Col span={12}>
                  <Text style={{ color: '#7a86a3', fontSize: 12 }}>扫描页数</Text>
                  <div style={{ color: '#172033', fontSize: 18, fontWeight: 600 }}>{DREAM_CYCLE_STATUS.pages_scanned.toLocaleString()}</div>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#7a86a3', fontSize: 12 }}>提取事实</Text>
                  <div style={{ color: '#172033', fontSize: 18, fontWeight: 600 }}>{DREAM_CYCLE_STATUS.facts_extracted}</div>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Text style={{ color: '#7a86a3', fontSize: 12 }}>新增冲突</Text>
                  <div style={{ color: '#f59f18', fontSize: 18, fontWeight: 600 }}>{DREAM_CYCLE_STATUS.conflicts_opened}</div>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#7a86a3', fontSize: 12 }}>预生成 Brief</Text>
                  <div style={{ color: '#20a84a', fontSize: 18, fontWeight: 600 }}>{DREAM_CYCLE_STATUS.briefs_precomputed}</div>
                </Col>
              </Row>
              <Divider style={{ margin: '4px 0', borderColor: '#e0e4ee' }} />
              <div>
                <Text style={{ color: '#7a86a3', fontSize: 12 }}>下次运行</Text>
                <div style={{ color: '#172033', marginTop: 2 }}>{DREAM_CYCLE_STATUS.next_run_at}</div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 待处理冲突 */}
        <Col span={14}>
          <Card
            title="待处理事实冲突 Top 5"
            bordered={false}
            style={{ background: '#ffffff' }}
            extra={<a style={{ color: '#1f6fff' }}>全部冲突 →</a>}
          >
            <Table
              size="small"
              pagination={false}
              dataSource={FACT_CONFLICTS.filter(c => c.status === 'open').slice(0, 5)}
              rowKey="id"
              columns={[
                { title: '严重度', dataIndex: 'severity', width: 80, render: (s) => <SeverityBadge severity={s} /> },
                { title: '实体', dataIndex: 'entity_slug', render: (v) => <Text className="mono">{v}</Text> },
                { title: '事实键', dataIndex: 'fact_key', render: (v) => <Text className="mono">{v}</Text> },
                { title: '检出', dataIndex: 'detected_at', width: 100 },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </AppLayout>
  );
};
