import type { Meta, StoryObj } from '@storybook/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';

type DropdownArgs = { triggerLabel: string };

const meta: Meta<DropdownArgs> = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<DropdownArgs>;

export const Default: Story = {
  args: { triggerLabel: 'Open Menu' },
  render: ({ triggerLabel }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithCheckboxItems: Story = {
  args: { triggerLabel: 'View Options' },
  render: ({ triggerLabel }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>Show Toolbar</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>Show Status Bar</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>Show Panel</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithSubMenu: Story = {
  args: { triggerLabel: 'More Options' },
  render: ({ triggerLabel }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem>New Tab</DropdownMenuItem>
        <DropdownMenuItem>New Window</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Email</DropdownMenuItem>
            <DropdownMenuItem>Copy Link</DropdownMenuItem>
            <DropdownMenuItem>Message</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
