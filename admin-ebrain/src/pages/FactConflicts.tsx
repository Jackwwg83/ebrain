import React from 'react';
import { Card, Typography, Space, Tag, Button, Table, Drawer, Radio, Input, Alert, Descriptions, Tabs, Divider } from 'antd';
import { WarningOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';
import { SeverityBadge } from '../components/StatusBadge';
import { FACT_CONFLICTS } from '../mock/data';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const FactConflicts: React.FC = () => {
  const [tab, setTab] = React.useState('open');
  const [selected, setSelected] = React.useState<typeof FACT_CONFLICTS[0] | null>(null);
  const [winnerSrc, setWinnerSrc] = React.useState<string>('');

  const filtered = FACT_CONFLICTS.filter(c => tab === 'all' || c.status === tab);

  return (
    <AppLayout currentPath="/conflicts">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#172033', margin: 0 }}>事实冲突</Title>
        <Text style={{ color: '#7a86a3', fontSize: 13 }}>
          跨源数据冲突不静默 resolve，按 fact_authority 决定 winning source，待平台 ops 人工确认
        </Text>
      </div>

      <Card bordered={false} style={{ background: '#ffffff' }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'open', label: <Space><WarningOutlined />待处理 ({FACT_CONFLICTS.filter(c => c.status === 'open').length})</Space> },
            { key: 'resolved', label: <Space><CheckCircleOutlined />已解决 ({FACT_CONFLICTS.filter(c => c.status === 'resolved').length})</Space> },
            { key: 'all', label: '全部' },
          ]}
        />

        <Table
          dataSource={filtered}
          rowKey="id"
          pagination={false}
          columns={[
            { title: '严重度', dataIndex: 'severity', width: 80, render: (s) => <SeverityBadge severity={s} /> },
            { title: '实体', dataIndex: 'entity_slug', render: (v) => <Text className="mono">{v}</Text> },
            { title: '事实键', dataIndex: 'fact_key', render: (v) => <Text className="mono">{v}</Text> },
            {
              title: '竞争值',
              render: (_, row) => (
                <Space size={4}>
                  {row.competing_values.map((v, i) => (
                    <Tag key={i} color={row.winning_source === v.source_type ? 'green' : undefined}>
                      {v.source_type}: {String(v.value).slice(0, 12)}
                    </Tag>
                  ))}
                </Space>
              ),
            },
            { title: '检出时间', dataIndex: 'detected_at', render: (v) => <Text style={{ color: '#7a86a3', fontSize: 12 }}>{v}</Text> },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s, row) => s === 'resolved'
                ? <Tag color="success" icon={<CheckCircleOutlined />}>已解决 ({row.winning_source})</Tag>
                : <Tag color="warning" icon={<ClockCircleOutlined />}>待处理</Tag>,
            },
            {
              title: '操作',
              align: 'right',
              render: (_, row) => (
                <Button type="link" onClick={() => { setSelected(row); setWinnerSrc(''); }}>
                  {row.status === 'open' ? '解决' : '查看'}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={selected ? `冲突 #${selected.id} · ${selected.entity_slug}` : ''}
        open={selected !== null}
        onClose={() => setSelected(null)}
        width={680}
      >
        {selected && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="严重度"><SeverityBadge severity={selected.severity} /></Descriptions.Item>
              <Descriptions.Item label="实体"><Text className="mono">{selected.entity_slug}</Text></Descriptions.Item>
              <Descriptions.Item label="事实键"><Text className="mono">{selected.fact_key}</Text></Descriptions.Item>
              <Descriptions.Item label="检出">{selected.detected_at}</Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5} style={{ color: '#172033' }}>竞争值（按 fact_authority 排序）</Title>
              <Radio.Group
                value={winnerSrc}
                onChange={(e) => setWinnerSrc(e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selected.competing_values.map((v, i) => (
                    <Radio key={i} value={v.source_type} style={{ width: '100%' }} disabled={selected.status === 'resolved'}>
                      <Card
                        size="small"
                        bordered
                        style={{
                          marginLeft: 8,
                          width: 560,
                          background: winnerSrc === v.source_type ? '#e6f7ec' : '#eef3ff',
                          borderColor: winnerSrc === v.source_type ? '#20a84a' : '#e0e4ee',
                        }}
                      >
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space>
                            <Text style={{ color: '#172033', fontSize: 16, fontWeight: 600 }}>{v.value}</Text>
                            <Tag color={i === 0 ? 'gold' : 'default'}>
                              {v.source_type}（权威优先级 {i}）
                            </Tag>
                          </Space>
                          <Text className="mono" style={{ fontSize: 11 }}>
                            page: {v.page_slug}
                          </Text>
                          <Space size={16}>
                            <Text style={{ color: '#4b5875', fontSize: 11 }}>
                              置信度: <span style={{ color: '#172033' }}>{v.confidence}</span>
                            </Text>
                            <Text style={{ color: '#4b5875', fontSize: 11 }}>
                              观察于: <span style={{ color: '#172033' }}>{v.observed_at}</span>
                            </Text>
                          </Space>
                        </Space>
                      </Card>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </div>

            <div>
              <Text style={{ color: '#172033' }}>解决备注（可选）</Text>
              <TextArea
                rows={3}
                placeholder="例如：HRIS 是权威源，已校对"
                style={{ marginTop: 8 }}
                defaultValue={selected.resolver_note ?? ''}
                disabled={selected.status === 'resolved'}
              />
            </div>

            {selected.status === 'open' ? (
              <>
                <Alert
                  type="info"
                  showIcon
                  message="点击 Resolve 后系统会"
                  description={
                    <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      <li>把 winning value 写回 entity page 的 <Text className="mono">## Compiled Truth</Text> fence</li>
                      <li>触发该 entity 的 backlink 重算</li>
                      <li>所有受影响的 agent prompt cache 失效</li>
                    </ol>
                  }
                />
                <Space>
                  <Button type="primary" disabled={!winnerSrc}>Resolve & 更新 Compiled Truth</Button>
                  <Button>跳过</Button>
                  <Button>明天再处理</Button>
                </Space>
              </>
            ) : (
              <Alert
                type="success"
                showIcon
                message="该冲突已解决"
                description={`Winning source: ${selected.winning_source}, 备注: ${selected.resolver_note}`}
              />
            )}
          </Space>
        )}
      </Drawer>
    </AppLayout>
  );
};
