import os from "os"
import path from "path"
import fs from "fs-extra"
import { execa } from "execa"
import { z } from "zod"
import { parse as parseJsonc } from "jsonc-parser"
import { input } from "@inquirer/prompts"

import { initOptionsSchema } from "@/src/commands/init"
import select from "@/src/inquirer/select"
import { colors } from "@/src/utils/colors"
import { getPackageManager } from "@/src/utils/get-package-manager"
import { handleError } from "@/src/utils/handle-error"
import { highlighter } from "@/src/utils/highlighter"
import { logger } from "@/src/utils/logger"
import { spinner } from "@/src/utils/spinner"

const MONOREPO_FRAMEWORK_URL =
  "https://codeload.github.com/shadcn-ui/ui/tar.gz/main"

export const FRAMEWORKS = {
  next: "next",
  vite: "vite",
  "next-monorepo": "next-monorepo",
} as const

type Framework = keyof typeof FRAMEWORKS
type ProjectOptions = Pick<
  z.infer<typeof initOptionsSchema>,
  "cwd" | "srcDir" | "components" | "framework"
>
type CreateNextOptions = {
  version: string
  cwd: string
  packageManager: string
  srcDir: boolean
}
type CreateViteOptions = {
  cwd: string
  packageManager: string
  projectName: string
}
type CreateMonorepoOptions = {
  packageManager: string
}

/**
 * Creates a themed input prompt with consistent styling
 */
const createThemedInput = (message: string, defaultValue: string = "") => {
  return input({
    message: colors.white(message),
    default: defaultValue,
    required: true,
    validate: (value: string) =>
      value.length > 128 ? `Name should be less than 128 characters.` : true,
    theme: {
      prefix: {
        done: colors.cyan("✔"),
        idle: colors.white("?"),
      },
      style: {
        answer: (text: string) => colors.white(text),
      },
    },
  })
}

/**
 * Creates a themed select prompt with consistent styling
 */
const createThemedSelect = async (
  message: string,
  choices: Array<{ name: string; value: string }>
) => {
  const instructions = `\n${colors.gray("  Use arrow-keys ▲▼ / [Return] to submit")}\n`

  return select({
    message: colors.white(message),
    instructions,
    theme: {
      icon: {
        cursor: colors.cyan("❯"),
      },
      style: {
        highlight: (text: string) => colors.cyan(text),
        answer: (text: string) => colors.white(text),
      },
      prefix: {
        done: colors.cyan("✔"),
        idle: colors.white("?"),
      },
      helpMode: "always" as const,
    },
    choices,
  })
}

/**
 * Creates a new project based on the specified framework
 */
export async function createProject(options: ProjectOptions) {
  const normalizedOptions = {
    srcDir: false,
    ...options,
  }

  let framework: Framework =
    normalizedOptions.framework &&
    FRAMEWORKS[normalizedOptions.framework as Framework]
      ? (normalizedOptions.framework as Framework)
      : "next"

  let projectName = "my-app"
  const nextVersion = "latest"

  // Only prompt for framework if not already specified
  if (!normalizedOptions.framework) {
    const frameworkPromptMessage = `The path ${colors.cyan(normalizedOptions.cwd)} does not contain a package.json file.\n  Would you like to start a new project?`

    const selectedFramework = await createThemedSelect(frameworkPromptMessage, [
      { name: "Next.js", value: "next" },
      { name: "Vite + React + TypeScript", value: "vite" },
      // { name: 'Next.js (Monorepo)', value: 'next-monorepo' }
    ])

    framework = selectedFramework as Framework
  }

  // Prompt for project name
  projectName = await createThemedInput(
    "What is your project named?",
    projectName
  )

  // Get the package manager for the project
  const packageManager = await getPackageManager(normalizedOptions.cwd, {
    withFallback: true,
  })

  const projectPath = path.join(normalizedOptions.cwd, projectName)

  // Validate path is writable
  await validateProjectPath(normalizedOptions.cwd, projectName)

  // Create the project based on framework
  if (framework === FRAMEWORKS.next) {
    await createNextProject(projectPath, {
      version: nextVersion,
      cwd: normalizedOptions.cwd,
      packageManager,
      srcDir: !!normalizedOptions.srcDir,
    })
  } else if (framework === FRAMEWORKS.vite) {
    await createViteProject(projectPath, {
      cwd: normalizedOptions.cwd,
      packageManager,
      projectName,
    })
  } else if (framework === FRAMEWORKS["next-monorepo"]) {
    await createMonorepoProject(projectPath, {
      packageManager,
    })
  }

  return {
    projectPath,
    projectName,
    framework,
  }
}

/**
 * Validates that the project path is writable and doesn't already exist
 */
async function validateProjectPath(cwd: string, projectName: string) {
  // Check if path is writable
  try {
    await fs.access(cwd, fs.constants.W_OK)
  } catch (error) {
    logger.break()
    logger.error(`The path ${highlighter.info(cwd)} is not writable.`)
    logger.error(
      `It is likely you do not have write permissions for this folder or the path ${highlighter.info(cwd)} does not exist.`
    )
    logger.break()
    process.exit(0)
  }

  // Check if project already exists
  if (fs.existsSync(path.resolve(cwd, projectName, "package.json"))) {
    logger.break()
    logger.error(
      `A project with the name ${highlighter.info(projectName)} already exists.`
    )
    logger.error(`Please choose a different name and try again.`)
    logger.break()
    process.exit(0)
  }
}

/**
 * Creates a new Next.js project
 */
async function createNextProject(
  projectPath: string,
  options: CreateNextOptions
) {
  const createSpinner = spinner(
    "Creating a new Next.js project. This may take a few minutes."
  ).start()

  // Note: pnpm fails here. Fallback to npx with --use-PACKAGE-MANAGER.
  const args = [
    "--tailwind",
    "--eslint",
    "--typescript",
    "--app",
    options.srcDir ? "--src-dir" : "--no-src-dir",
    "--no-import-alias",
    `--use-${options.packageManager}`,
  ]

  // Add turbopack for Next.js 15+ or canary/latest
  if (
    options.version.startsWith("15") ||
    options.version.startsWith("latest") ||
    options.version.startsWith("canary")
  ) {
    args.push("--turbopack")
  }

  try {
    await execa(
      "npx",
      [`create-next-app@${options.version}`, projectPath, "--silent", ...args],
      { cwd: options.cwd }
    )

    createSpinner.stopAndPersist({
      symbol: colors.cyan("✔"),
      text: colors.white(`Creating a new Next.js project.`),
    })
  } catch (error) {
    createSpinner?.fail("Something went wrong creating a new Next.js project.")
    logger.break()
    logger.error(
      `Something went wrong creating a new Next.js project. Please try again.`
    )
    process.exit(0)
  }
}

/**
 * Creates a new Vite + React + TypeScript project
 */
async function createViteProject(
  projectPath: string,
  options: CreateViteOptions
) {
  const createSpinner = spinner(
    `Creating a new Vite + React + TypeScript project. This may take a few minutes.`
  ).start()

  try {
    await execa(
      "npm",
      [
        "create",
        "vite@latest",
        options.projectName,
        "--",
        "--template",
        "react-ts",
      ],
      { cwd: options.cwd }
    )

    // Install dependencies
    await execa(options.packageManager, ["install"], {
      cwd: projectPath,
    })

    await setupViteTsConfig(projectPath)

    createSpinner.stopAndPersist({
      symbol: colors.cyan("✔"),
      text: colors.white(`Creating a new Vite + React + TypeScript project.`),
    })
  } catch (error) {
    createSpinner?.fail("Something went wrong creating a new Vite project.")
    handleError(error)
  }
}

/**
 * Configures TypeScript and path aliases for a Vite project
 */
async function setupViteTsConfig(projectPath: string) {
  try {
    await setupTsConfigPathAliases(projectPath)
    await setupViteConfigPathAliases(projectPath)
  } catch (error) {
    logger.warn(
      "Failed to set up TypeScript path aliases, but project creation succeeded"
    )
  }
}

/**
 * Sets up TypeScript configuration files with path aliases
 */
async function setupTsConfigPathAliases(projectPath: string) {
  const addAliasToTsConfig = async (tsconfigFile: string) => {
    const tsconfigPath = path.join(projectPath, tsconfigFile)
    if (!(await fs.pathExists(tsconfigPath))) return

    const jsonContent = await fs.readFile(tsconfigPath, "utf-8")
    const jsonObj = parseJsonc(jsonContent)

    jsonObj.compilerOptions = {
      ...jsonObj.compilerOptions,
      baseUrl: ".",
      paths: {
        ...(jsonObj.compilerOptions?.paths || {}),
        "@/*": ["./src/*"],
      },
    }

    const updatedJson = JSON.stringify(jsonObj, null, 2)
    await fs.writeFile(tsconfigPath, updatedJson)
  }

  await addAliasToTsConfig("tsconfig.json")
  await addAliasToTsConfig("tsconfig.app.json")
}

/**
 * Sets up Vite configuration with path aliases
 */
async function setupViteConfigPathAliases(projectPath: string) {
  const viteConfigPath = path.join(projectPath, "vite.config.ts")
  const viteConfigContent = await fs.readFile(viteConfigPath, "utf-8")

  const updatedViteConfig = viteConfigContent
    .replace(
      "import { defineConfig } from 'vite'",
      "import { defineConfig } from 'vite'\nimport path from 'path'"
    )
    .replace(
      "plugins: [react()]",
      `plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }`
    )

  await fs.writeFile(viteConfigPath, updatedViteConfig)
}

/**
 * Creates a new Next.js monorepo project
 */
async function createMonorepoProject(
  projectPath: string,
  options: CreateMonorepoOptions
) {
  const createSpinner = spinner(
    `Creating a new Next.js monorepo. This may take a few minutes.`
  ).start()

  try {
    await downloadAndExtractFramework(projectPath)

    // Run install
    await execa(options.packageManager, ["install"], {
      cwd: projectPath,
    })

    // Initialize git repository
    await initializeGitRepository(projectPath)

    createSpinner?.succeed("Creating a new Next.js monorepo.")
  } catch (error) {
    createSpinner?.fail("Something went wrong creating a new Next.js monorepo.")
    handleError(error)
  }
}

/**
 * Downloads and extracts the monorepo framework
 */
async function downloadAndExtractFramework(projectPath: string) {
  // Create temporary directory
  const frameworkPath = path.join(os.tmpdir(), `tiptap-framework-${Date.now()}`)
  await fs.ensureDir(frameworkPath)

  // Download framework
  const response = await fetch(MONOREPO_FRAMEWORK_URL)
  if (!response.ok) {
    throw new Error(`Failed to download framework: ${response.statusText}`)
  }

  // Write the tar file
  const tarPath = path.resolve(frameworkPath, "framework.tar.gz")
  await fs.writeFile(tarPath, Buffer.from(await response.arrayBuffer()))

  // Extract framework
  await execa("tar", [
    "-xzf",
    tarPath,
    "-C",
    frameworkPath,
    "--strip-components=2",
    "ui-main/templates/monorepo-next",
  ])

  // Move to project path and cleanup
  const extractedPath = path.resolve(frameworkPath, "monorepo-next")
  await fs.move(extractedPath, projectPath)
  await fs.remove(frameworkPath)
}

/**
 * Initializes a git repository in the project directory
 */
async function initializeGitRepository(projectPath: string) {
  const cwd = process.cwd()

  try {
    await execa("git", ["--version"], { cwd: projectPath })
    await execa("git", ["init"], { cwd: projectPath })
    await execa("git", ["add", "-A"], { cwd: projectPath })
    await execa("git", ["commit", "-m", "Initial commit"], {
      cwd: projectPath,
    })
    await execa("cd", [cwd])
  } catch (error) {
    logger.warn(
      "Failed to initialize git repository, but project creation succeeded"
    )
  }
}
