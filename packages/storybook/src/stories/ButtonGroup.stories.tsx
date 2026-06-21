import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '../components/ui/button-group';
import { Button } from '../components/ui/button';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Copy, Scissors, Clipboard } from 'lucide-react';

const meta: Meta = {
  title: 'UI/ButtonGroup',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Previous</Button>
      <Button variant="outline">1</Button>
      <Button variant="outline">2</Button>
      <Button variant="outline">3</Button>
      <Button variant="outline">Next</Button>
    </ButtonGroup>
  ),
};

export const Formatting: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon">
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon">
        <Underline className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  ),
};

export const Alignment: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon">
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon">
        <AlignRight className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  ),
};

export const WithSeparator: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon">
        <Scissors className="h-4 w-4" />
      </Button>
      <ButtonGroupSeparator />
      <Button variant="outline" size="icon">
        <Clipboard className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroupText>https://</ButtonGroupText>
      <Button variant="outline">example.com</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">Top</Button>
      <Button variant="outline">Middle</Button>
      <Button variant="outline">Bottom</Button>
    </ButtonGroup>
  ),
};
