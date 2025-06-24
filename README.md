# Tiptap UI Components

Tiptap UI Components is a library of modular, MIT-licensed [React components](https://tiptap.dev/docs/ui-components/components/overview), [templates](https://tiptap.dev/docs/ui-components/templates/simple-editor), and [primitives](https://tiptap.dev/docs/ui-components/primitives) that help you build rich text editor UIs faster, on top of the headless [Tiptap](https://tiptap.dev) framework.

This repo also includes a [CLI tool](https://tiptap.dev/docs/ui-components/getting-started/cli) to scaffold your editor setup or install individual components with zero config.

Use the components as-is, customize them to match your design system, or drop them into an existing Tiptap setup. They're optional, composable, and built for dev speed.

## Getting Started

Start with the [UI Components docs](https://tiptap.dev/docs/ui-components/getting-started/overview) to browse demos, setup guides, and usage patterns.

### Installation

Install with the Tiptap CLI to scaffold your setup:

```bash
npx @tiptap/cli init
```

Or install a single component:

```bash
npx @tiptap/cli add [component-name]
```

## Available Components

### Templates

Fully working editor setups, ready to clone and customize:

[Simple Editor](https://tiptap.dev/docs/ui-components/templates/simple-editor) (MIT Licensed):

- Responsive layout
- Light/Dark mode support
- Rich text formatting, image upload, link editing
- Fully customizable

### Components

The [components](https://tiptap.dev/docs/ui-components/components/overview) available in this public repository are MIT licensed and freely available:

#### UI Components

- Blockquote button
- Code block button
- Color highlight button / popover
- Heading button / dropdown
- Image upload button
- Link popover
- List button / dropdown
- Mark button
- Text align button
- Undo redo button

#### Node Components

- Code block
- Image
- Image upload
- List
- Paragraph

#### Primitives

- Avatar, Badge, Button
- Dropdown menu, Popover, Separator
- Spacer, Toolbar, Tooltip

## Customization

All components are designed with minimal, neutral styling to blend into your existing design system.

No themes or complex overrides required. Edit the source directly to match your brand or component system.

---

Want to contribute, suggest a component, or report a bug? [Open an issue](https://github.com/ueberdosis/tiptap-ui-components/issues) or join the discussion in [Discord](https://tiptap.dev/discord).
