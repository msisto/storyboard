import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../components/ui/textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: { layout: 'centered' },
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the textarea',
    },
    rows: {
      control: 'number',
      description: 'Number of rows',
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Type your message here...', rows: 4 },
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled textarea', disabled: true },
};

export const Large: Story = {
  args: { placeholder: 'Large textarea...', rows: 8 },
};
