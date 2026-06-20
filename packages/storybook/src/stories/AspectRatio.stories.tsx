import type { Meta, StoryObj } from '@storybook/react';
import { AspectRatio } from '../components/ui/aspect-ratio';

const meta: Meta = {
  title: 'UI/AspectRatio',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

export const Widescreen: Story = {
  render: () => (
    <div className="w-full max-w-sm">
      <AspectRatio ratio={16 / 9} className="bg-muted rounded-md overflow-hidden">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
          <span className="text-sm text-muted-foreground">16 / 9</span>
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div className="w-full max-w-xs">
      <AspectRatio ratio={1} className="bg-muted rounded-md overflow-hidden">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
          <span className="text-sm text-muted-foreground">1 / 1</span>
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Portrait: Story = {
  render: () => (
    <div className="w-48">
      <AspectRatio ratio={3 / 4} className="bg-muted rounded-md overflow-hidden">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
          <span className="text-sm text-muted-foreground">3 / 4</span>
        </div>
      </AspectRatio>
    </div>
  ),
};
