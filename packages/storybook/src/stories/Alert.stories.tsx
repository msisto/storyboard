import type { Meta, StoryObj } from '@storybook/react';
import { Terminal, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

type AlertArgs = { variant: 'default' | 'destructive'; title: string; description: string };

const meta: Meta<AlertArgs> = {
  title: 'UI/Alert',
  component: Alert,
  parameters: { layout: 'centered' },
  argTypes: { variant: { control: 'select', options: ['default', 'destructive'] } },
};

export default meta;
type Story = StoryObj<AlertArgs>;

export const Default: Story = {
  args: { variant: 'default', title: 'Heads up!', description: 'You can add components to your app using the cli.' },
  render: ({ variant, title, description }) => (
    <Alert variant={variant} className="w-[400px]">
      <Terminal className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  args: { variant: 'destructive', title: 'Error', description: 'Your session has expired. Please log in again.' },
  render: ({ variant, title, description }) => (
    <Alert variant={variant} className="w-[400px]">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  ),
};
