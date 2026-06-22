import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/ui/badge';

type BadgeArgs = { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };

const meta: Meta<BadgeArgs> = {
  title: 'UI/Badge',
  parameters: { layout: 'centered' },
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['default', 'secondary', 'destructive', 'outline'] },
  },
};

export default meta;
type Story = StoryObj<BadgeArgs>;

const render = ({ label, variant }: BadgeArgs) => <Badge variant={variant}>{label}</Badge>;

export const Default: Story = { args: { label: 'Badge', variant: 'default' }, render };
export const Secondary: Story = { args: { label: 'Secondary', variant: 'secondary' }, render };
export const Destructive: Story = { args: { label: 'Error', variant: 'destructive' }, render };
export const Outline: Story = { args: { label: 'Outline', variant: 'outline' }, render };
