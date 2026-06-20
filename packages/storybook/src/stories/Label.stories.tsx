import type { Meta, StoryObj } from '@storybook/react';
import { Label } from '../components/ui/label';

const meta = {
  title: 'UI/Label',
  component: Label,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Email address', htmlFor: 'email' },
};

export const WithInput: Story = {
  args: { children: 'Username', htmlFor: 'username' },
  render: ({ children, htmlFor }) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{children}</Label>
      <input
        id={htmlFor}
        type="text"
        placeholder="Enter username"
        className="h-9 rounded-md border px-3 text-sm"
      />
    </div>
  ),
};

export const WithRequiredField: Story = {
  args: { children: 'Password', htmlFor: 'password' },
  render: ({ children, htmlFor }) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {children} <span className="text-destructive">*</span>
      </Label>
      <input
        id={htmlFor}
        type="password"
        placeholder="Enter password"
        className="h-9 rounded-md border px-3 text-sm"
      />
      <p className="text-xs text-muted-foreground">Required field</p>
    </div>
  ),
};
