import type { Meta, StoryObj } from '@storybook/react';
import { RequestLog } from './RequestLog';

const meta = {
  title: 'Pages/RequestLog',
  component: RequestLog,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RequestLog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
