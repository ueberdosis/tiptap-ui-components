# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Tiptap UI Components is a MIT-licensed library of modular React components, templates, and primitives for building rich text editor UIs on top of the headless Tiptap framework. This is a monorepo containing both a component library (web demo) and a CLI tool for component installation.

## Development Commands

### Primary Commands
- `pnpm dev` - Start all development servers (web app + CLI)
- `pnpm build` - Build all packages using Turbo
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier

### Package-Specific Commands
- `pnpm web:dev` - Start only web app development server
- `pnpm @tiptap/cli` - Run CLI tool in development mode
- `pnpm pub:beta` - Publish CLI as beta version
- `pnpm pub:release` - Publish CLI as release version

### CLI Package Commands (in packages/cli/)
- `pnpm typecheck` - TypeScript type checking
- `pnpm start:dev` - Run CLI with development registry
- `pnpm start:prod` - Run CLI with production registry

### Web Package Commands (in apps/web/)
- `pnpm dev` - Start Vite development server
- `pnpm build` - Build with TypeScript compilation + Vite build
- `pnpm preview` - Preview production build
- `pnpm lint` - ESLint TypeScript files

## Architecture

### Monorepo Structure
- **Package Manager**: pnpm with workspaces
- **Build System**: Turbo for orchestration
- **Main Packages**:
  - `apps/web/` - React demo application showcasing components
  - `packages/cli/` - Command-line tool for component installation

### Component Organization

Components are organized into distinct categories under `apps/web/src/components/`:

1. **Templates** (`tiptap-templates/`)
   - Complete editor implementations
   - Example: `simple-editor` - full-featured editor with toolbar

2. **UI Components** (`tiptap-ui/`)
   - Editor-specific UI controls
   - Examples: `blockquote-button`, `color-highlight-popover`, `link-popover`

3. **UI Primitives** (`tiptap-ui-primitive/`)
   - Reusable base components
   - Examples: `button`, `dropdown-menu`, `popover`, `toolbar`

4. **Node Components** (`tiptap-node/`)
   - Tiptap node implementations with styling
   - Examples: `code-block-node`, `image-node`, `list-node`

5. **Extensions** (`tiptap-extension/`)
   - Custom Tiptap extensions
   - Examples: `link-extension`, `selection-extension`

6. **Icons** (`tiptap-icons/`)
   - SVG icon components for editor UI

7. **Hooks** (`hooks/`)
   - Reusable React hooks for editor functionality

### Technology Stack

#### Web App
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite with React plugin
- **Styling**: SCSS with modules and shared variables
- **Editor**: Tiptap 2.22.3 with various extensions
- **UI**: @floating-ui/react for positioning

#### CLI Tool
- **Runtime**: Node.js with ES modules
- **Build**: tsup for TypeScript compilation
- **Framework**: Commander.js for CLI interface
- **Validation**: Zod for schema validation
- **Utilities**: Chalk, Ora, Inquirer

### Key Development Patterns

#### Component Structure
- Each component includes TypeScript implementation and SCSS module
- Index files for clean imports
- Compound components for complex UI elements

#### Styling System
- SCSS variables in `src/styles/_variables.scss`
- Shared animations in `src/styles/_keyframe-animations.scss`
- Component-scoped SCSS modules
- Vite automatically imports shared styles via `additionalData`

#### TypeScript Configuration
- Strict mode enabled
- Path aliases: `@/*` maps to `./src/*`
- ESNext target with bundler module resolution

#### CLI Architecture
- Registry-based component distribution
- Schema validation for component metadata
- Framework detection and transformation
- File transformation utilities for imports/JSX

## Key Files and Directories

### Configuration Files
- `turbo.json` - Monorepo build configuration
- `pnpm-workspace.yaml` - Workspace definitions
- `apps/web/vite.config.ts` - Web app build configuration
- `packages/cli/tsup.config.ts` - CLI build configuration

### Component Development
- `apps/web/src/components/` - All component implementations
- `apps/web/src/hooks/` - Reusable React hooks
- `apps/web/src/lib/` - Utility functions
- `apps/web/src/styles/` - Shared SCSS variables and animations

### CLI Development
- `packages/cli/src/commands/` - CLI command implementations
- `packages/cli/src/utils/` - Shared utilities and registry logic
- `packages/cli/src/transformers/` - Code transformation utilities

## Development Workflow

1. **Setup**: Run `pnpm install` to install all dependencies
2. **Development**: Use `pnpm dev` to start both web app and CLI in development mode
3. **Component Development**: Components are developed in the web app with real-time preview
4. **CLI Testing**: Use `pnpm @tiptap/cli` to test CLI commands with development registry
5. **Building**: Use `pnpm build` to build all packages with Turbo caching

## Important Notes

- Components are designed with minimal, neutral styling for easy customization
- All components are MIT licensed and freely available
- CLI tool supports component installation with automatic dependency resolution
- Web app uses Vite for fast development with HMR
- SCSS compilation includes automatic import of shared variables
- TypeScript strict mode is enabled throughout the project