import type { Meta, StoryObj } from '@storybook/react';
import { Executives } from './Executives';

const meta = {
  title: 'Pages/Executives',
  component: Executives,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Executives>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
