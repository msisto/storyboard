import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Calendar } from '../components/ui/calendar';

const meta: Meta = {
  title: 'UI/Calendar',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    );
  },
};

export const DateRange: Story = {
  render: () => {
    const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
    return (
      <Calendar
        mode="range"
        selected={range as any}
        onSelect={setRange as any}
        numberOfMonths={2}
        className="rounded-md border"
      />
    );
  },
};

export const Multiple: Story = {
  render: () => {
    const [dates, setDates] = useState<Date[] | undefined>([]);
    return (
      <Calendar
        mode="multiple"
        selected={dates}
        onSelect={setDates}
        className="rounded-md border"
      />
    );
  },
};
