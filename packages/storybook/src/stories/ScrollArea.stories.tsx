import type { Meta, StoryObj } from '@storybook/react';
import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';

type ScrollAreaArgs = { height: string };

const meta: Meta<ScrollAreaArgs> = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<ScrollAreaArgs>;

const tags = [
  'v1.2.0-beta.1', 'v1.1.0', 'v1.0.9', 'v1.0.8', 'v1.0.7',
  'v1.0.6', 'v1.0.5', 'v1.0.4', 'v1.0.3', 'v1.0.2', 'v1.0.1', 'v1.0.0',
];

export const Default: Story = {
  args: { height: 'h-72' },
  render: ({ height }) => (
    <ScrollArea className={`${height} w-48 rounded-md border`}>
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {tags.map((tag) => (
          <div key={tag} className="text-sm py-1 border-b last:border-0">{tag}</div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const HorizontalScroll: Story = {
  args: { height: 'h-auto' },
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="h-20 w-20 shrink-0 rounded-md bg-muted flex items-center justify-center text-sm font-medium">
            Item {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

export const WithContent: Story = {
  args: { height: 'h-64' },
  render: ({ height }) => (
    <ScrollArea className={`${height} w-80 rounded-md border p-4`}>
      <p className="text-sm leading-relaxed">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
      </p>
    </ScrollArea>
  ),
};
