import type { Meta, StoryObj } from '@storybook/react';
import { FactConflicts } from './FactConflicts';

const meta = {
  title: 'Pages/FactConflicts',
  component: FactConflicts,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FactConflicts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
