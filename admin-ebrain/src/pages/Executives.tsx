import React from 'react';
import { Card, Typography, Space, Tag, Button, Table, Avatar, Drawer, Descriptions, Divider } from 'antd';
import { UserAddOutlined, EditOutlined, SafetyOutlined, AudioOutlined } from '@ant-design/icons';
import { AppLayout } from '../components/AppLayout';
import { EXECUTIVES } from '../mock/data';

const { Title, Text } = Typography;

export const Executives: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<typeof EXECUTIVES[0] | null>(null);

  return (
    <AppLayout currentPath="/executives">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ color: '#172033', margin: 0 }}>高管管理</Title>
          <Text style={{ color: '#7a86a3', fontSize: 13 }}>
            5 / 10 个 C-Level · MVP 最大 10 人
          </Text>
        </div>
        <Button type="primary" icon={<UserAddOutlined />}>添加高管</Button>
      </div>

      <Card bordered={false} style={{ background: '#ffffff' }}>
        <Table
          dataSource={EXECUTIVES}
          rowKey="executive_id"
          pagination={false}
          columns={[
            {
              title: '高管',
              dataIndex: 'display_name',
              render: (name, row) => (
                <Space>
                  <Avatar style={{ background: '#1f6fff' }}>{name[0]}</Avatar>
                  <div>
                    <div style={{ color: '#172033' }}>{name}</div>
                    <div className="mono" style={{ fontSize: 11 }}>{row.executive_id}</div>
                  </div>
                </Space>
              ),
            },
            { title: '角色', dataIndex: 'role', render: (r) => <Tag color="blue">{r}</Tag> },
            { title: '部门', dataIndex: 'department' },
            { title: '邮箱', dataIndex: 'email', render: (e) => <Text className="mono" style={{ fontSize: 12 }}>{e}</Text> },
            {
              title: 'IM 绑定',
              render: (_, row) => (
                <Space size={4}>
                  {row.feishu_user_id && <Tag color="green">飞书 ✓</Tag>}
                  {row.dingtalk_user_id && <Tag color="blue">钉钉 ✓</Tag>}
                  {row.wecom_user_id && <Tag color="purple">企微 ✓</Tag>}
                  {!row.feishu_user_id && !row.dingtalk_user_id && !row.wecom_user_id && <Tag>未绑定</Tag>}
                </Space>
              ),
            },
            {
              title: 'Profile',
              render: (_, row) => (
                <Space size={4}>
                  <Tag>SOUL ✓</Tag>
                  <Tag>USER ✓</Tag>
                  <Tag>PERSONA ✓</Tag>
                  <Tag>偏好 ✓</Tag>
                </Space>
              ),
            },
            { title: '今日查询', dataIndex: 'queries_today', align: 'right', render: (v) => <Text className="mono">{v}</Text> },
            { title: '最近使用', dataIndex: 'last_used_at', render: (v) => <Text style={{ color: '#7a86a3', fontSize: 12 }}>{v}</Text> },
            {
              title: '操作',
              align: 'right',
              render: (_, row) => (
                <Space>
                  <Button type="link" size="small" onClick={() => { setSelected(row); setDrawerOpen(true); }}>
                    详情
                  </Button>
                  <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
                  <Button type="link" size="small" icon={<AudioOutlined />}>SOUL Audit</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={selected ? `${selected.display_name} (${selected.role})` : ''}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
      >
        {selected && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="executive_id"><Text className="mono">{selected.executive_id}</Text></Descriptions.Item>
              <Descriptions.Item label="邮箱">{selected.email}</Descriptions.Item>
              <Descriptions.Item label="时区">{selected.timezone}</Descriptions.Item>
              <Descriptions.Item label="部门">{selected.department}</Descriptions.Item>
              <Descriptions.Item label="SOUL 路径"><Text className="mono">{selected.soul_path}</Text></Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5} style={{ color: '#172033' }}><SafetyOutlined /> IM 用户绑定</Title>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="飞书 OpenID">
                  <Text className="mono">{selected.feishu_user_id ?? '未绑定'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="钉钉 userid">
                  <Text className="mono">{selected.dingtalk_user_id ?? '未绑定'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="企微 userid">
                  <Text className="mono">{selected.wecom_user_id ?? '未绑定'}</Text>
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div>
              <Title level={5} style={{ color: '#172033' }}>推送偏好</Title>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Morning Brief">每天 08:00 通过飞书推送</Descriptions.Item>
                <Descriptions.Item label="Critical Signal">仅 severity ≥ 3，静默时段 22:00-07:00</Descriptions.Item>
                <Descriptions.Item label="冲突告警">关闭</Descriptions.Item>
              </Descriptions>
            </div>

            <Divider />

            <Space>
              <Button type="primary" icon={<AudioOutlined />}>运行 SOUL Audit</Button>
              <Button>查看 personal-skills</Button>
              <Button danger>停用</Button>
            </Space>
          </Space>
        )}
      </Drawer>
    </AppLayout>
  );
};
