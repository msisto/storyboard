import type { Meta, StoryObj } from '@storybook/react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';

type PaginationArgs = { currentPage: number; totalPages: number };

const meta: Meta<PaginationArgs> = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<PaginationArgs>;

export const Default: Story = {
  args: { currentPage: 3, totalPages: 10 },
  render: ({ currentPage }) => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive={currentPage === 1}>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive={currentPage === 2}>2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive={currentPage === 3}>3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">10</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

export const FirstPage: Story = {
  args: { currentPage: 1, totalPages: 5 },
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" aria-disabled="true" className="pointer-events-none opacity-50" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">4</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">5</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

export const LastPage: Story = {
  args: { currentPage: 5, totalPages: 5 },
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">4</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>5</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" aria-disabled="true" className="pointer-events-none opacity-50" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
