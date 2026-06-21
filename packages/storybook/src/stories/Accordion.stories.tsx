import type { Meta, StoryObj } from '@storybook/react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion';

type AccordionItemType = { value: string; trigger: string; content: string };
type AccordionArgs = { type: 'single' | 'multiple'; collapsible: boolean; items: AccordionItemType[] };

const defaultItems: AccordionItemType[] = [
  { value: 'item-1', trigger: 'Is it accessible?', content: 'Yes. It adheres to the WAI-ARIA design pattern.' },
  { value: 'item-2', trigger: 'Is it styled?', content: 'Yes. It comes with default styles that matches the other components.' },
  { value: 'item-3', trigger: 'Is it animated?', content: "Yes. It's animated by default, but you can disable it if you prefer." },
];

const meta: Meta<AccordionArgs> = {
  title: 'UI/Accordion',
  component: Accordion,
  parameters: { layout: 'centered' },
  argTypes: { items: { control: { type: 'object' } } },
};

export default meta;
type Story = StoryObj<AccordionArgs>;

export const Default: Story = {
  args: { type: 'single', collapsible: true, items: defaultItems },
  render: ({ type, collapsible, items = defaultItems }) => (
    <Accordion type={type} collapsible={collapsible} className="w-full">
      {(items as AccordionItemType[]).map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.trigger}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const MultipleOpen: Story = {
  args: { type: 'multiple', collapsible: true },
  render: () => (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Getting started</AccordionTrigger>
        <AccordionContent>
          Install the package and import the components you need.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Configuration</AccordionTrigger>
        <AccordionContent>
          Configure the accordion by passing props to the root component.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Customization</AccordionTrigger>
        <AccordionContent>
          Use the className prop to apply custom styles to each part.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const PreOpened: Story = {
  args: { type: 'single', collapsible: true },
  render: () => (
    <Accordion type="single" defaultValue="item-2" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Section one</AccordionTrigger>
        <AccordionContent>Content for section one.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Section two (pre-opened)</AccordionTrigger>
        <AccordionContent>This section is open by default.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
