import type { Meta, StoryObj } from '@storybook/react';
import { Agents } from './Agents';

const meta = {
  title: 'Pages/Agents',
  component: Agents,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Agents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
