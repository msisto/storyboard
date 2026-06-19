import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/ui/input';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      description: 'Input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the input',
    },
    value: {
      control: 'text',
      description: 'Input value',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: 'Enter text...', type: 'text' } };
export const Email: Story = { args: { placeholder: 'Email address', type: 'email' } };
export const Password: Story = { args: { placeholder: 'Password', type: 'password' } };
export const Disabled: Story = { args: { placeholder: 'Disabled input', disabled: true } };
export const WithValue: Story = { args: { value: 'Hello world', readOnly: true } };
