import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

type TabsArgs = { defaultValue: string };

const meta: Meta<TabsArgs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<TabsArgs>;

export const Default: Story = {
  args: { defaultValue: 'account' },
  render: ({ defaultValue }) => (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tabs-name">Name</Label>
            <input id="tabs-name" defaultValue="Jane Doe" className="w-full h-9 rounded-md border px-3 text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tabs-username">Username</Label>
            <input id="tabs-username" defaultValue="@jane" className="w-full h-9 rounded-md border px-3 text-sm" />
          </div>
          <Button className="w-full">Save changes</Button>
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <input id="current-password" type="password" className="w-full h-9 rounded-md border px-3 text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <input id="new-password" type="password" className="w-full h-9 rounded-md border px-3 text-sm" />
          </div>
          <Button className="w-full">Update password</Button>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const ThreeTabs: Story = {
  args: { defaultValue: 'music' },
  render: ({ defaultValue }) => (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="music">Music</TabsTrigger>
        <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
        <TabsTrigger value="live">Live</TabsTrigger>
      </TabsList>
      <TabsContent value="music">
        <p className="py-4 text-sm text-muted-foreground">Listen to your favorite music here.</p>
      </TabsContent>
      <TabsContent value="podcasts">
        <p className="py-4 text-sm text-muted-foreground">Browse and subscribe to podcasts.</p>
      </TabsContent>
      <TabsContent value="live">
        <p className="py-4 text-sm text-muted-foreground">Tune into live broadcasts.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabled: Story = {
  args: { defaultValue: 'overview' },
  render: ({ defaultValue }) => (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="py-4 text-sm text-muted-foreground">Overview content goes here.</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p className="py-4 text-sm text-muted-foreground">Analytics data goes here.</p>
      </TabsContent>
    </Tabs>
  ),
};
