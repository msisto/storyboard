import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from '../components/ui/toggle';
import { Bold, Italic, Underline } from 'lucide-react';

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
    },
    disabled: { control: 'boolean' },
    pressed: { control: 'boolean' },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Toggle', variant: 'default', size: 'default' },
};

export const Outline: Story = {
  args: { children: 'Outline Toggle', variant: 'outline' },
};

export const WithIcon: Story = {
  args: { 'aria-label': 'Toggle bold' },
  render: () => (
    <Toggle aria-label="Toggle bold">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
};

export const TextFormatting: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Toggle aria-label="Bold" defaultPressed>
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Italic">
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Underline" variant="outline">
        <Underline className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};
