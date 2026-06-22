import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from '../components/ui/toggle';
import { Bold, Italic, Underline } from 'lucide-react';

type ToggleArgs = {
  label: string;
  variant: 'default' | 'outline';
  size: 'default' | 'sm' | 'lg';
  disabled: boolean;
  pressed: boolean;
};

const meta: Meta<ToggleArgs> = {
  title: 'UI/Toggle',
  parameters: { layout: 'centered' },
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['default', 'outline'] },
    size: { control: 'select', options: ['default', 'sm', 'lg'] },
    disabled: { control: 'boolean' },
    pressed: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<ToggleArgs>;

const render = ({ label, ...rest }: ToggleArgs) => <Toggle {...rest}>{label}</Toggle>;

export const Default: Story = { args: { label: 'Toggle', variant: 'default', size: 'default', disabled: false, pressed: false }, render };
export const Outline: Story = { args: { label: 'Outline Toggle', variant: 'outline', size: 'default', disabled: false, pressed: false }, render };

export const WithIcon: Story = {
  render: () => (
    <Toggle aria-label="Toggle bold">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
};

export const TextFormatting: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Toggle aria-label="Bold" defaultPressed><Bold className="h-4 w-4" /></Toggle>
      <Toggle aria-label="Italic"><Italic className="h-4 w-4" /></Toggle>
      <Toggle aria-label="Underline" variant="outline"><Underline className="h-4 w-4" /></Toggle>
    </div>
  ),
};
