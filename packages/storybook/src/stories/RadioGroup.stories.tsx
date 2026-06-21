import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';

type RadioItemType = { value: string; label: string };
type RadioGroupArgs = { defaultValue: string; items: RadioItemType[] };

const defaultItems: RadioItemType[] = [
  { value: 'option-one', label: 'Option One' },
  { value: 'option-two', label: 'Option Two' },
  { value: 'option-three', label: 'Option Three' },
];

const meta: Meta<RadioGroupArgs> = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  parameters: { layout: 'centered' },
  argTypes: { items: { control: { type: 'object' } } },
};

export default meta;
type Story = StoryObj<RadioGroupArgs>;

export const Default: Story = {
  args: { defaultValue: 'option-one', items: defaultItems },
  render: ({ defaultValue, items = defaultItems }) => (
    <RadioGroup defaultValue={defaultValue}>
      {(items as RadioItemType[]).map((item) => (
        <div key={item.value} className="flex items-center space-x-2">
          <RadioGroupItem value={item.value} id={item.value} />
          <Label htmlFor={item.value}>{item.label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};

export const PlanSelector: Story = {
  args: { defaultValue: 'pro' },
  render: ({ defaultValue }) => (
    <RadioGroup defaultValue={defaultValue} className="gap-3">
      {[
        { value: 'free', label: 'Free', description: 'Up to 3 projects' },
        { value: 'pro', label: 'Pro', description: 'Unlimited projects' },
        { value: 'enterprise', label: 'Enterprise', description: 'Custom solutions' },
      ].map(({ value, label, description }) => (
        <div key={value} className="flex items-start space-x-3">
          <RadioGroupItem value={value} id={value} className="mt-0.5" />
          <div>
            <Label htmlFor={value} className="font-medium">{label}</Label>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      ))}
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  args: { defaultValue: 'enabled' },
  render: () => (
    <RadioGroup defaultValue="enabled">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="enabled" id="enabled" />
        <Label htmlFor="enabled">Enabled</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="disabled-option" id="disabled-option" disabled />
        <Label htmlFor="disabled-option" className="opacity-50">Disabled option</Label>
      </div>
    </RadioGroup>
  ),
};
