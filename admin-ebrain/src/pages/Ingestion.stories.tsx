import type { Meta, StoryObj } from '@storybook/react';
import { Ingestion } from './Ingestion';

const meta = {
  title: 'Pages/Ingestion',
  component: Ingestion,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Ingestion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
