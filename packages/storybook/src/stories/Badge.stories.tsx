import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/ui/badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
      description: 'Visual style variant',
    },
    children: {
      control: 'text',
      description: 'Badge label',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Badge', variant: 'default' } };
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } };
export const Destructive: Story = { args: { children: 'Error', variant: 'destructive' } };
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } };
