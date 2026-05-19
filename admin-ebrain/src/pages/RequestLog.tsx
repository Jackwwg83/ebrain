import React from 'react';
import { Card, Typography, Space, Tag, Table, Select, Input, DatePicker } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';
import { REQUEST_LOG, EXECUTIVES } from '../mock/data';

const { Title, Text } = Typography;

export const RequestLog: React.FC = () => {
  return (
    <AppLayout currentPath="/log">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#172033', margin: 0 }}>请求日志</Title>
        <Text style={{ color: '#7a86a3', fontSize: 13 }}>
          MCP 调用审计日志 · 按 executive_id 过滤 · 默认保留 90 天
        </Text>
      </div>

      <Card bordered={false} style={{ background: '#ffffff', marginBottom: 16 }}>
        <Space size={12} wrap>
          <Input
            placeholder="搜索 query / slug / agent"
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="按高管过滤"
            allowClear
            style={{ width: 200 }}
            options={EXECUTIVES.map(e => ({ value: e.executive_id, label: `${e.display_name} (${e.role})` }))}
          />
          <Select
            placeholder="操作类型"
            allowClear
            style={{ width: 200 }}
            options={[
              { value: 'search', label: 'search' },
              { value: 'get_page', label: 'get_page' },
              { value: 'put_page', label: 'put_page' },
              { value: 'list_takes', label: 'list_takes' },
              { value: 'detect_enterprise_conflicts', label: 'detect_enterprise_conflicts' },
            ]}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            options={[
              { value: 'success', label: '成功' },
              { value: 'denied', label: '拒绝' },
              { value: 'error', label: '错误' },
            ]}
          />
          <DatePicker.RangePicker style={{ background: 'transparent' }} />
        </Space>
      </Card>

      <Card bordered={false} style={{ background: '#ffffff' }}>
        <Table
          size="small"
          dataSource={REQUEST_LOG}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          columns={[
            { title: '时间', dataIndex: 'ts', width: 100, render: (v) => <Text style={{ color: '#4b5875', fontSize: 12 }}>{v}</Text> },
            {
              title: '高管',
              dataIndex: 'executive_id',
              width: 140,
              render: (id, row) => (
                <Space size={4}>
                  <Tag color="blue">{row.executive_role}</Tag>
                  <Text className="mono" style={{ fontSize: 11 }}>{id}</Text>
                </Space>
              ),
            },
            {
              title: '客户端',
              dataIndex: 'agent_name',
              width: 200,
              render: (v) => <Text style={{ color: '#172033', fontSize: 12 }}>{v}</Text>,
            },
            {
              title: '操作',
              dataIndex: 'operation',
              width: 220,
              render: (v) => <Text className="mono" style={{ color: '#1f6fff' }}>{v}</Text>,
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 80,
              render: (s) => {
                if (s === 'success') return <Tag color="success">成功</Tag>;
                if (s === 'denied') return <Tag color="error">拒绝</Tag>;
                return <Tag color="warning">错误</Tag>;
              },
            },
            {
              title: '耗时',
              dataIndex: 'latency_ms',
              width: 80,
              align: 'right',
              render: (ms) => {
                const color = ms < 500 ? '#20a84a' : ms < 1500 ? '#f59f18' : '#e5484d';
                return <Text style={{ color }}>{ms}ms</Text>;
              },
            },
            {
              title: '参数摘要',
              dataIndex: 'params_summary',
              render: (v) => <Text className="mono" style={{ color: '#4b5875', fontSize: 12 }}>{v}</Text>,
              ellipsis: true,
            },
          ]}
        />
      </Card>
    </AppLayout>
  );
};
