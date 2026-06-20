import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '../components/ui/progress';

const meta = {
  title: 'UI/Progress',
  component: Progress,
  parameters: { layout: 'centered' },
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progress value from 0 to 100',
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 60, className: 'w-80' },
};

export const Empty: Story = {
  args: { value: 0, className: 'w-80' },
};

export const Complete: Story = {
  args: { value: 100, className: 'w-80' },
};

export const WithLabel: Story = {
  args: { value: 45 },
  render: ({ value }) => (
    <div className="w-80 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Uploading...</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  ),
};
