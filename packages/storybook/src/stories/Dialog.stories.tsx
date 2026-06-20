import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

type DialogArgs = { title: string; description: string; triggerLabel: string };

const meta: Meta<DialogArgs> = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<DialogArgs>;

export const Default: Story = {
  args: {
    title: 'Edit Profile',
    description: 'Make changes to your profile here. Click save when you\'re done.',
    triggerLabel: 'Open Dialog',
  },
  render: ({ title, description, triggerLabel }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right text-sm font-medium">Name</label>
            <input id="name" defaultValue="Jane Doe" className="col-span-3 h-9 rounded-md border px-3 text-sm" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="username" className="text-right text-sm font-medium">Username</label>
            <input id="username" defaultValue="@jane" className="col-span-3 h-9 rounded-md border px-3 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Confirmation: Story = {
  args: {
    title: 'Are you absolutely sure?',
    description: 'This action cannot be undone. This will permanently delete your account.',
    triggerLabel: 'Delete Account',
  },
  render: ({ title, description, triggerLabel }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive">Yes, delete account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const InfoOnly: Story = {
  args: {
    title: 'Release Notes',
    description: 'What\'s new in this version.',
    triggerLabel: 'View Release Notes',
  },
  render: ({ title, description, triggerLabel }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ul className="list-disc pl-5 text-sm space-y-1 py-2">
          <li>Improved performance across all pages</li>
          <li>Fixed a bug with dark mode toggling</li>
          <li>Added new dashboard widgets</li>
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
