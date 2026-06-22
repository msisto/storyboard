import type { Meta, StoryObj } from '@storybook/react';
import { Label } from '../components/ui/label';

type LabelArgs = { label: string; htmlFor: string };

const meta: Meta<LabelArgs> = {
  title: 'UI/Label',
  parameters: { layout: 'centered' },
  argTypes: {
    label: { control: 'text' },
    htmlFor: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<LabelArgs>;

export const Default: Story = {
  args: { label: 'Email address', htmlFor: 'email' },
  render: ({ label, htmlFor }) => <Label htmlFor={htmlFor}>{label}</Label>,
};

export const WithInput: Story = {
  args: { label: 'Username', htmlFor: 'username' },
  render: ({ label, htmlFor }) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <input id={htmlFor} type="text" placeholder="Enter username" className="h-9 rounded-md border px-3 text-sm" />
    </div>
  ),
};

export const WithRequiredField: Story = {
  args: { label: 'Password', htmlFor: 'password' },
  render: ({ label, htmlFor }) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label} <span className="text-destructive">*</span>
      </Label>
      <input id={htmlFor} type="password" placeholder="Enter password" className="h-9 rounded-md border px-3 text-sm" />
      <p className="text-xs text-muted-foreground">Required field</p>
    </div>
  ),
};
