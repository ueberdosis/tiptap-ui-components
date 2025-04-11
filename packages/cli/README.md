# Tiptap CLI

A CLI for adding Tiptap components to your project.

## Usage

```bash
npx tiptap-cli [command] [options]
```

## Commands

### `init`

Initialize project and install dependencies.

```bash
npx tiptap-cli init
```

#### `Options`

```bash
Usage: tiptap-cli init [options] [components...]

Arguments

    components                  the components to add

Options

    -t, --framework <framework>     the framework to use (next, vite)
    -c, --cwd <cwd>                 the working directory (defaults to current directory)
    -s, --silent                    mute output
    --src-dir                       use the src directory when creating a new project (specific to next).

```

---

### `add`

Add components to your project.

```bash
npx tiptap-cli add [components]
```

#### `Options`

```bash
Usage: tiptap-cli add [options] [components...]

Arguments

    components          the components to add

Options

    -c, --cwd <cwd>     the working directory (defaults to current directory)
    -p, --path <path>   the path to add the component to
    -s, --silent        mute output
```

---

### `auth login`

Log in to your Tiptap registry account.

```bash
npx tiptap-cli auth login
```

#### `Options`

```bash
Usage: tiptap-cli auth login [options]

Options

    -e, --email <email>         your Tiptap registry email
    -p, --password <password>   your Tiptap registry password
    --write-config              write the auth token to your package manager config
    -c, --cwd <cwd>             the working directory (defaults to current directory)
```

---

### `auth status`

Check your Tiptap registry authentication status.

```bash
npx tiptap-cli auth status
```

#### `Options`

```bash
Usage: tiptap-cli auth status [options]

Options

    -c, --cwd <cwd>          the working directory (defaults to current directory)
```
