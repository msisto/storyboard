import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from '../components/ui/slider';

const meta = {
  title: 'UI/Slider',
  component: Slider,
  parameters: { layout: 'centered' },
  argTypes: {
    defaultValue: { control: false },
    min: { control: { type: 'number' } },
    max: { control: { type: 'number' } },
    step: { control: { type: 'number' } },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: [50], min: 0, max: 100, step: 1, className: 'w-full' },
};

export const WithLabel: Story = {
  args: { defaultValue: [33] },
  render: ({ defaultValue }) => (
    <div className="w-full space-y-4">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Volume</span>
        <span className="text-muted-foreground">{defaultValue?.[0]}%</span>
      </div>
      <Slider defaultValue={defaultValue} min={0} max={100} step={1} />
    </div>
  ),
};

export const Range: Story = {
  args: { defaultValue: [25, 75] },
  render: ({ defaultValue }) => (
    <div className="w-full space-y-4">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Price Range</span>
        <span className="text-muted-foreground">${defaultValue?.[0]} – ${defaultValue?.[1]}</span>
      </div>
      <Slider defaultValue={defaultValue} min={0} max={100} step={5} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { defaultValue: [40], disabled: true, className: 'w-full' },
};
