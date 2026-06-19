import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from '../components/ui/switch';

const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: { layout: 'centered' },
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the switch is on',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the switch',
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="switch" {...args} />
      <label htmlFor="switch" className="text-sm font-medium">Airplane mode</label>
    </div>
  ),
  args: { checked: false, disabled: false },
};

export const Checked: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="switch-on" {...args} />
      <label htmlFor="switch-on" className="text-sm font-medium">Enabled</label>
    </div>
  ),
  args: { checked: true },
};

export const Disabled: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="switch-disabled" {...args} />
      <label htmlFor="switch-disabled" className="text-sm font-medium">Disabled</label>
    </div>
  ),
  args: { disabled: true },
};
