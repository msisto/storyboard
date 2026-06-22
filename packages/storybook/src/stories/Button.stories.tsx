import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/ui/button';

type ButtonArgs = {
  label: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size: 'default' | 'sm' | 'lg' | 'icon';
  disabled: boolean;
};

const meta: Meta<ButtonArgs> = {
  title: 'UI/Button',
  parameters: { layout: 'centered' },
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<ButtonArgs>;

const render = ({ label, ...rest }: ButtonArgs) => <Button {...rest}>{label}</Button>;

export const Default: Story = { args: { label: 'Button', variant: 'default', size: 'default', disabled: false }, render };
export const Destructive: Story = { args: { label: 'Delete', variant: 'destructive', size: 'default', disabled: false }, render };
export const Outline: Story = { args: { label: 'Outline', variant: 'outline', size: 'default', disabled: false }, render };
export const Secondary: Story = { args: { label: 'Secondary', variant: 'secondary', size: 'default', disabled: false }, render };
export const Ghost: Story = { args: { label: 'Ghost', variant: 'ghost', size: 'default', disabled: false }, render };
export const Small: Story = { args: { label: 'Small', variant: 'default', size: 'sm', disabled: false }, render };
export const Large: Story = { args: { label: 'Large', variant: 'default', size: 'lg', disabled: false }, render };
export const Disabled: Story = { args: { label: 'Disabled', variant: 'default', size: 'default', disabled: true }, render };
