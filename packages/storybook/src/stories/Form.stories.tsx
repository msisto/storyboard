import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const meta: Meta = {
  title: 'UI/Form',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

const profileSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
});

export const Default: Story = {
  render: () => {
    const form = useForm({
      resolver: zodResolver(profileSchema),
      defaultValues: { username: '', email: '' },
    });

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => {})} className="space-y-6 w-80">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="shadcn" {...field} />
                </FormControl>
                <FormDescription>Your public display name.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </form>
      </Form>
    );
  },
};

const notifySchema = z.object({
  type: z.enum(['all', 'mentions', 'none']),
  mobile: z.boolean().default(false),
});

export const WithSelect: Story = {
  render: () => {
    const form = useForm({
      resolver: zodResolver(notifySchema),
      defaultValues: { type: 'all' as const, mobile: false },
    });

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => {})} className="space-y-6 w-80">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notify me about…</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select notification type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All new messages</SelectItem>
                    <SelectItem value="mentions">Direct messages and mentions</SelectItem>
                    <SelectItem value="none">Nothing</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Use different settings for mobile</FormLabel>
                  <FormDescription>
                    You can manage your notifications in the settings page.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <Button type="submit">Update notifications</Button>
        </form>
      </Form>
    );
  },
};
