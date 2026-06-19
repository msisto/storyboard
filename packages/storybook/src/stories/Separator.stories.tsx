import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from '../components/ui/separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: { layout: 'centered' },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Orientation of the separator',
    },
    decorative: {
      control: 'boolean',
      description: 'Whether it is purely decorative',
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[300px]">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Radix Primitives</h4>
        <p className="text-sm text-muted-foreground">An open-source UI component library.</p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  ),
  args: { orientation: 'horizontal' },
};

export const Horizontal: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <p className="text-sm">Above the line</p>
      <Separator />
      <p className="text-sm">Below the line</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-10 items-center space-x-4 text-sm">
      <span>Left</span>
      <Separator orientation="vertical" />
      <span>Right</span>
    </div>
  ),
};
