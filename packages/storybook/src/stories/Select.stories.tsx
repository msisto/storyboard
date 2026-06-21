import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

type SelectItemType = { value: string; label: string };
type SelectArgs = { disabled: boolean; placeholder: string; items: SelectItemType[] };

const defaultItems: SelectItemType[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
];

const meta: Meta<SelectArgs> = {
  title: 'UI/Select',
  component: Select,
  parameters: { layout: 'centered' },
  argTypes: {
    disabled: { control: 'boolean', description: 'Disables the select' },
    items: { control: { type: 'object' } },
  },
};

export default meta;
type Story = StoryObj<SelectArgs>;

export const Default: Story = {
  args: { disabled: false, placeholder: 'Select a fruit', items: defaultItems },
  render: ({ disabled, placeholder, items = defaultItems }) => (
    <Select disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(items as SelectItemType[]).map((item) => (
          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};

export const WithValue: Story = {
  render: (args) => (
    <Select defaultValue="banana" {...args}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <Select disabled {...args}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Disabled select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
      </SelectContent>
    </Select>
  ),
};
