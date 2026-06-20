import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../components/ui/tooltip';
import { Button } from '../components/ui/button';

type TooltipArgs = { content: string; side: 'top' | 'right' | 'bottom' | 'left' };

const meta: Meta<TooltipArgs> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<TooltipArgs>;

export const Default: Story = {
  args: { content: 'This is a tooltip', side: 'top' },
  render: ({ content, side }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const OnIcon: Story = {
  args: { content: 'Add to favorites', side: 'top' },
  render: ({ content, side }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Add to favorites">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-8 place-items-center">
      <div />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">Top</Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>Tooltip on top</p></TooltipContent>
      </Tooltip>
      <div />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">Left</Button>
        </TooltipTrigger>
        <TooltipContent side="left"><p>Tooltip on left</p></TooltipContent>
      </Tooltip>
      <div />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">Right</Button>
        </TooltipTrigger>
        <TooltipContent side="right"><p>Tooltip on right</p></TooltipContent>
      </Tooltip>
      <div />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">Bottom</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Tooltip on bottom</p></TooltipContent>
      </Tooltip>
      <div />
    </div>
  ),
};
