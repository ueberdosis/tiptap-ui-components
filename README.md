# Tiptap UI Components

This repository contains a collection of UI Components, templates, and primitives designed specifically for integration with Tiptap, a headless and modular rich text editor.

It also includes a CLI tool to quickly install any component from the UI Components library.

UI Components and Templates help you create a rich text editor from scratch by providing prebuilt and customizable UI elements.


## Getting Started

### Installation

Use the Tiptap CLI to quickly scaffold your editor setup:

```bash
npx tiptap-cli init
```

Or add individual components directly:

```bash
npx tiptap-cli add [component-name]
```

## Available Components

### Templates

Templates provide fully working editor setups, including all essential components and features:

Simple Editor (Open Source):
- Responsive, supports dark/light modes
- Rich text formatting, image upload, link editing
- MIT licensed, fully customizable


### Open Source Components

The components and templates available in this public repository are MIT licensed and freely available:

#### UI Components:
- Heading button/dropdown
- Highlight popover
- Image upload button
- Link popover
- List button/dropdown
- Mark button
- Node button
- Text align button
- Undo redo button

#### Node Components:
- Code block node
- Image node/upload node
- List node
- Paragraph node

#### Primitives:
- Avatar, Badge, Button
- Dropdown menu, Popover, Separator
- Spacer, Toolbar, Tooltip

## Customization
All UI components and primitives have minimal, neutral styling, designed to blend into your application's theme without complicated overrides. Customize directly by editing the source code.
