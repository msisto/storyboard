import type { Meta, StoryObj } from '@storybook/react';
import { Terminal, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
      description: 'Visual style variant',
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Alert {...args} className="w-[400px]">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
  args: { variant: 'default' },
};

export const Destructive: Story = {
  render: (args) => (
    <Alert {...args} className="w-[400px]">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
  args: { variant: 'destructive' },
};
