import type { Meta, StoryObj } from '@storybook/react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '../components/ui/sheet';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

type SheetArgs = { side: 'top' | 'bottom' | 'left' | 'right'; triggerLabel: string };

const meta: Meta<SheetArgs> = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<SheetArgs>;

export const Default: Story = {
  args: { side: 'right', triggerLabel: 'Open Sheet' },
  render: ({ side, triggerLabel }) => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sheet-name" className="text-right">Name</Label>
            <input id="sheet-name" defaultValue="Jane Doe" className="col-span-3 h-9 rounded-md border px-3 text-sm" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sheet-username" className="text-right">Username</Label>
            <input id="sheet-username" defaultValue="@jane" className="col-span-3 h-9 rounded-md border px-3 text-sm" />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="submit">Save changes</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const FromLeft: Story = {
  args: { side: 'left', triggerLabel: 'Open Sidebar' },
  render: ({ triggerLabel }) => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Quick access to all sections.</SheetDescription>
        </SheetHeader>
        <nav className="mt-4 flex flex-col gap-2">
          {['Dashboard', 'Projects', 'Team', 'Settings', 'Help'].map((item) => (
            <a key={item} href="#" className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
              {item}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  ),
};

export const FromBottom: Story = {
  args: { side: 'bottom', triggerLabel: 'Open Bottom Sheet' },
  render: ({ triggerLabel }) => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Share document</SheetTitle>
          <SheetDescription>Anyone with the link can view this document.</SheetDescription>
        </SheetHeader>
        <div className="flex items-center gap-2 py-4">
          <input
            readOnly
            value="https://example.com/doc/abc123"
            className="flex-1 h-9 rounded-md border px-3 text-sm bg-muted"
          />
          <Button size="sm">Copy</Button>
        </div>
      </SheetContent>
    </Sheet>
  ),
};
