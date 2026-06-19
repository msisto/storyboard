import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

type AvatarArgs = { src?: string; alt: string; fallback: string };

const meta: Meta<AvatarArgs> = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<AvatarArgs>;

export const Default: Story = {
  args: { src: 'https://github.com/shadcn.png', alt: '@shadcn', fallback: 'CN' },
  render: ({ src, alt, fallback }) => (
    <Avatar>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  ),
};

export const WithFallback: Story = {
  args: { alt: 'User', fallback: 'JD' },
  render: ({ alt, fallback }) => (
    <Avatar>
      <AvatarImage src="/broken-image.jpg" alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  ),
};

export const Large: Story = {
  args: { src: 'https://github.com/shadcn.png', alt: '@shadcn', fallback: 'CN' },
  render: ({ src, alt, fallback }) => (
    <Avatar className="h-16 w-16">
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback className="text-xl">{fallback}</AvatarFallback>
    </Avatar>
  ),
};

export const Small: Story = {
  args: { fallback: 'SM', alt: '' },
  render: ({ fallback }) => (
    <Avatar className="h-6 w-6">
      <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
    </Avatar>
  ),
};
