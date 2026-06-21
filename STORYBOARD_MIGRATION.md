# Storyboard Items Migration

This file contains a Claude Code prompt for migrating an existing Storybook library to support Storyboard's inline list editor.

## What this migration does

Storyboard auto-detects any story `args` field whose value is an array of objects and renders an inline list editor in the inspector — add rows, delete rows, edit each field in place. For this to work, repeating items need to live in `args` rather than being hardcoded in the render function.

## Prompt

Copy and paste this into Claude Code, pointed at your stories directory:

---

Migrate the following Storybook story files to the Storyboard items convention.

For each story that has a `render` function with hardcoded repeating child elements (list items, menu items, radio options, accordion rows, tabs, select options, etc.):

1. Identify the repeating items and their fields. Define a local type for the item shape (e.g. `type Item = { value: string; label: string }`).
2. Extract the items into a `const defaultItems: Item[]` array above the story.
3. Add `items: defaultItems` to the story's `args`.
4. Add `argTypes: { items: { control: { type: 'object' } } }` to the meta or story-level `argTypes`.
5. Replace the hardcoded JSX children with `.map()` over `items` in the render function. Cast `items` to the item type: `(items as Item[]).map(...)`.
6. Keep all other args and behavior unchanged. Only modify the Default story (or the primary one with the most items); leave variant stories (Disabled, WithValue, etc.) as-is.

Do not modify stories that don't have repeating items. Do not modify stories that already use the items convention.

Files to migrate: [paste your story file paths here]

---

## What the result looks like

**Before:**
```tsx
export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger><SelectValue placeholder="Select a fruit" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  ),
};
```

**After:**
```tsx
type SelectItem = { value: string; label: string };

const defaultItems: SelectItem[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

export const Default: Story = {
  args: { placeholder: 'Select a fruit', items: defaultItems },
  argTypes: { items: { control: { type: 'object' } } },
  render: ({ placeholder, items = defaultItems }) => (
    <Select>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {(items as SelectItem[]).map((item) => (
          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};
```

Once migrated, drop the component on the Storyboard canvas → select it → the inspector shows the `items` list with inline add/remove/edit controls.
