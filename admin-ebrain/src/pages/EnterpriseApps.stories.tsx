import type { Meta, StoryObj } from '@storybook/react';
import { EnterpriseApps } from './EnterpriseApps';

const meta = {
  title: 'Pages/EnterpriseApps',
  component: EnterpriseApps,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof EnterpriseApps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
