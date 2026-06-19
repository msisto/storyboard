import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from '../components/ui/separator';

const meta: Meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: { layout: 'centered' },
};

export default meta;

export const Default: StoryObj<{ heading: string; subheading: string; link1: string; link2: string; link3: string }> = {
  args: { heading: 'Radix Primitives', subheading: 'An open-source UI component library.', link1: 'Blog', link2: 'Docs', link3: 'Source' },
  render: ({ heading, subheading, link1, link2, link3 }) => (
    <div className="w-[300px]">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">{heading}</h4>
        <p className="text-sm text-muted-foreground">{subheading}</p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>{link1}</div>
        <Separator orientation="vertical" />
        <div>{link2}</div>
        <Separator orientation="vertical" />
        <div>{link3}</div>
      </div>
    </div>
  ),
};

export const Horizontal: StoryObj<{ above: string; below: string }> = {
  args: { above: 'Above the line', below: 'Below the line' },
  render: ({ above, below }) => (
    <div className="w-[300px] space-y-4">
      <p className="text-sm">{above}</p>
      <Separator />
      <p className="text-sm">{below}</p>
    </div>
  ),
};

export const Vertical: StoryObj<{ left: string; right: string }> = {
  args: { left: 'Left', right: 'Right' },
  render: ({ left, right }) => (
    <div className="flex h-10 items-center space-x-4 text-sm">
      <span>{left}</span>
      <Separator orientation="vertical" />
      <span>{right}</span>
    </div>
  ),
};
