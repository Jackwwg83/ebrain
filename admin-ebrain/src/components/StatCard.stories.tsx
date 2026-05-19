import type { Meta, StoryObj } from '@storybook/react';
import { Row, Col } from 'antd';
import { StatCard } from './StatCard';

const meta = {
  title: 'Components/StatCard',
  component: StatCard,
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '今日查询数',
    value: 312,
    trend: { value: 12, direction: 'up' },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ padding: 24, background: '#f6f8ff' }}>
      <Row gutter={16}>
        <Col span={6}><StatCard title="活跃高管" value={5} suffix="/ 10" tone="success" /></Col>
        <Col span={6}><StatCard title="知识库总页数" value="12,847" trend={{ value: 4.2, direction: 'up' }} /></Col>
        <Col span={6}><StatCard title="今日查询数" value={312} trend={{ value: 12, direction: 'up' }} /></Col>
        <Col span={6}><StatCard title="待处理冲突" value={7} tone="warn" trend={{ value: 2, direction: 'down' }} /></Col>
      </Row>
    </div>
  ),
};
