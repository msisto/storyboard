import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../components/ui/checkbox';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the checkbox',
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Checkbox id="checkbox" {...args} />
      <label htmlFor="checkbox" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Accept terms
      </label>
    </div>
  ),
  args: { checked: false, disabled: false },
};

export const Checked: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Checkbox id="checkbox-checked" {...args} />
      <label htmlFor="checkbox-checked" className="text-sm font-medium">Checked</label>
    </div>
  ),
  args: { checked: true },
};

export const Disabled: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Checkbox id="checkbox-disabled" {...args} />
      <label htmlFor="checkbox-disabled" className="text-sm font-medium">Disabled</label>
    </div>
  ),
  args: { disabled: true },
};
