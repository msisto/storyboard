import type { Meta, StoryObj } from '@storybook/react';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

type PopoverArgs = { triggerLabel: string };

const meta: Meta<PopoverArgs> = {
  title: 'UI/Popover',
  component: Popover,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<PopoverArgs>;

export const Default: Story = {
  args: { triggerLabel: 'Open Popover' },
  render: ({ triggerLabel }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Dimensions</h4>
            <p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="width">Width</Label>
              <input id="width" defaultValue="100%" className="col-span-2 h-8 rounded-md border px-2 text-sm" />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="maxWidth">Max. width</Label>
              <input id="maxWidth" defaultValue="300px" className="col-span-2 h-8 rounded-md border px-2 text-sm" />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="height">Height</Label>
              <input id="height" defaultValue="25px" className="col-span-2 h-8 rounded-md border px-2 text-sm" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const Simple: Story = {
  args: { triggerLabel: 'More info' },
  render: ({ triggerLabel }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">{triggerLabel}</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm">This feature is only available on the Pro plan. Upgrade to unlock access.</p>
      </PopoverContent>
    </Popover>
  ),
};

export const WithActions: Story = {
  args: { triggerLabel: 'Settings' },
  render: ({ triggerLabel }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Notification settings</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm">Email alerts</span>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Push notifications</span>
            <input type="checkbox" />
          </div>
          <div className="pt-2">
            <Button size="sm" className="w-full">Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
