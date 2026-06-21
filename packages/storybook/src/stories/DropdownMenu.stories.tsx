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

type MenuItemType = { label: string; shortcut: string };
type DropdownArgs = { triggerLabel: string; items: MenuItemType[] };

const defaultItems: MenuItemType[] = [
  { label: 'Profile', shortcut: '⇧⌘P' },
  { label: 'Billing', shortcut: '⌘B' },
  { label: 'Settings', shortcut: '⌘S' },
  { label: 'Log out', shortcut: '⇧⌘Q' },
];

const meta: Meta<DropdownArgs> = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
  parameters: { layout: 'centered' },
  argTypes: { items: { control: { type: 'object' } } },
};

export default meta;
type Story = StoryObj<DropdownArgs>;

export const Default: Story = {
  args: { triggerLabel: 'Open Menu', items: defaultItems },
  render: ({ triggerLabel, items = defaultItems }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {(items as MenuItemType[]).map((item) => (
            <DropdownMenuItem key={item.label}>
              {item.label}
              {item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
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
