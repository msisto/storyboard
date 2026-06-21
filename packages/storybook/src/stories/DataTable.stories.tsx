import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

const meta: Meta = {
  title: 'UI/DataTable',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

// ── Sample data ──────────────────────────────────────────────────────────────

type Payment = {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  email: string;
};

const payments: Payment[] = [
  { id: 'INV-001', amount: 316, status: 'success', email: 'alice@example.com' },
  { id: 'INV-002', amount: 242, status: 'pending', email: 'bob@example.com' },
  { id: 'INV-003', amount: 837, status: 'processing', email: 'carol@example.com' },
  { id: 'INV-004', amount: 874, status: 'success', email: 'dan@example.com' },
  { id: 'INV-005', amount: 721, status: 'failed', email: 'eve@example.com' },
  { id: 'INV-006', amount: 125, status: 'pending', email: 'frank@example.com' },
  { id: 'INV-007', amount: 450, status: 'success', email: 'grace@example.com' },
  { id: 'INV-008', amount: 90, status: 'processing', email: 'hank@example.com' },
];

const statusVariant: Record<Payment['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  pending: 'secondary',
  processing: 'outline',
  failed: 'destructive',
};

// ── Default story ─────────────────────────────────────────────────────────────

const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'id',
    header: 'Invoice',
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('id')}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue<Payment['status']>('status');
      return <Badge variant={statusVariant[status]}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 text-left font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Amount
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      return <span className="font-mono">${amount.toFixed(2)}</span>;
    },
  },
];

function BasicDataTable() {
  const table = useReactTable({
    data: payments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-[600px]">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <BasicDataTable />,
};

// ── Sortable + filterable + paginated ─────────────────────────────────────────

function FullDataTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data: payments,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  });

  return (
    <div className="w-[600px] space-y-4">
      <Input
        placeholder="Filter..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const WithSortingAndPagination: Story = {
  render: () => <FullDataTable />,
};
