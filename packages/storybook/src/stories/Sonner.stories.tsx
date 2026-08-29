import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { Button } from '../components/ui/button';

const meta: Meta = {
  title: 'UI/Sonner',
  component: Toaster,
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <>
      <Button variant="outline" onClick={() => toast('Event has been created.')}>
        Show Toast
      </Button>
      <Toaster />
    </>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <>
      <Button
        variant="outline"
        onClick={() =>
          toast('Event has been created', {
            description: 'Sunday, December 03, 2023 at 9:00 AM',
          })
        }
      >
        Show Toast
      </Button>
      <Toaster />
    </>
  ),
};

export const Success: Story = {
  render: () => (
    <>
      <Button
        variant="outline"
        onClick={() => toast.success('File uploaded successfully')}
      >
        Success Toast
      </Button>
      <Toaster />
    </>
  ),
};

export const Error: Story = {
  render: () => (
    <>
      <Button
        variant="outline"
        onClick={() => toast.error('Something went wrong')}
      >
        Error Toast
      </Button>
      <Toaster />
    </>
  ),
};

export const WithAction: Story = {
  render: () => (
    <>
      <Button
        variant="outline"
        onClick={() =>
          toast('File deleted', {
            action: {
              label: 'Undo',
              onClick: () => toast('File restored'),
            },
          })
        }
      >
        Delete with Undo
      </Button>
      <Toaster />
    </>
  ),
};
