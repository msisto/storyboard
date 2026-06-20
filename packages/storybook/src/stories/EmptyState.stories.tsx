import type { Meta, StoryObj } from '@storybook/react';
import { FileX, Inbox, SearchX, Users, FolderOpen } from 'lucide-react';
import { Button } from '../components/ui/button';

const meta: Meta = {
  title: 'UI/EmptyState',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

export const NoResults: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center py-12 text-center w-80">
      <SearchX className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">No results found</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Try adjusting your search or filters to find what you're looking for.
      </p>
      <Button variant="outline">Clear filters</Button>
    </div>
  ),
};

export const EmptyInbox: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center py-12 text-center w-80">
      <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">Your inbox is empty</h3>
      <p className="text-sm text-muted-foreground mt-2">
        When you receive messages, they'll appear here.
      </p>
    </div>
  ),
};

export const NoFiles: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center py-12 text-center w-80 border border-dashed rounded-lg">
      <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">No files uploaded</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Drag and drop files here, or click to browse.
      </p>
      <Button>Upload files</Button>
    </div>
  ),
};

export const NoTeamMembers: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center py-12 text-center w-80">
      <Users className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">No team members yet</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Invite your teammates to collaborate on this project.
      </p>
      <Button>Invite members</Button>
    </div>
  ),
};

export const NotFound: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center py-12 text-center w-80">
      <FileX className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">Page not found</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button variant="outline">Go back</Button>
    </div>
  ),
};
