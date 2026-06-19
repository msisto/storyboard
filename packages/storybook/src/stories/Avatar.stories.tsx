import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes for sizing',
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

export const WithFallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/broken-image.jpg" alt="User" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const Large: Story = {
  render: () => (
    <Avatar className="h-16 w-16">
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback className="text-xl">CN</AvatarFallback>
    </Avatar>
  ),
};

export const Small: Story = {
  render: () => (
    <Avatar className="h-6 w-6">
      <AvatarFallback className="text-xs">SM</AvatarFallback>
    </Avatar>
  ),
};
