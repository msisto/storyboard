import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';

type CardArgs = { title: string; description: string; content: string; action: string };

const meta: Meta<CardArgs> = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<CardArgs>;

export const Default: Story = {
  args: { title: 'Card Title', description: 'Card description goes here.', content: 'Card content with some text.', action: 'Action' },
  render: ({ title, description, content, action }) => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{content}</p>
      </CardContent>
      <CardFooter>
        <Button>{action}</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  args: { content: 'A simple card with just content.' },
  render: ({ content }) => (
    <Card className="w-[300px] p-6">
      <p className="text-sm">{content}</p>
    </Card>
  ),
};

export const WithoutFooter: Story = {
  args: { title: 'No Footer', description: 'This card has no footer.', content: 'Content only, no action buttons.' },
  render: ({ title, description, content }) => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{content}</p>
      </CardContent>
    </Card>
  ),
};
