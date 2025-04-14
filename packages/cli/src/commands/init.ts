import path from "path"
import { Command } from "commander"
import { confirm } from "@inquirer/prompts"
import { z } from "zod"

import { preFlightInit } from "@/src/preflights/preflight-init"
import { promptForRegistryComponents } from "@/src/commands/add"
import { FRAMEWORKS, createProject } from "@/src/utils/create-project"
import * as ERRORS from "@/src/utils/errors"
import { colors } from "@/src/utils/colors"
import { handleError } from "@/src/utils/handle-error"
import { highlighter } from "@/src/utils/highlighter"
import { logger } from "@/src/utils/logger"
import { addComponents } from "@/src/utils/add-components"
import { getProjectConfig, getProjectInfo } from "@/src/utils/get-project-info"
import {
  DEFAULT_COMPONENTS,
  DEFAULT_CONTEXTS,
  DEFAULT_HOOKS,
  DEFAULT_TIPTAP_ICONS,
  DEFAULT_LIB,
  DEFAULT_STYLES,
  DEFAULT_TIPTAP_EXTENSIONS,
  DEFAULT_TIPTAP_NODES,
  DEFAULT_TIPTAP_UI,
  DEFAULT_TIPTAP_UI_PRIMITIVES,
  getConfig,
  rawConfigSchema,
  resolveConfigPaths,
  type Config,
} from "@/src/utils/get-config"

export const initOptionsSchema = z.object({
  cwd: z.string(),
  components: z.array(z.string()).optional(),
  silent: z.boolean(),
  isNewProject: z.boolean(),
  srcDir: z.boolean().optional(),
  framework: z
    .string()
    .optional()
    .refine((val) => !val || FRAMEWORKS[val as keyof typeof FRAMEWORKS], {
      message: "Invalid framework. Please use 'next' or 'vite'.",
    }),
})

type InitOptions = z.infer<typeof initOptionsSchema> & {
  skipPreflight?: boolean
}

/**
 * Creates a themed confirmation prompt with consistent styling
 */
const createThemedConfirm = (message: string, defaultValue: boolean = true) => {
  return confirm({
    message: colors.white(message),
    default: defaultValue,
    theme: {
      prefix: {
        done: colors.cyan("✔"),
        idle: colors.white("?"),
      },
      style: {
        answer: (text: string) => colors.white(text),
        message: (text: string) => colors.white(text),
      },
    },
  })
}

/**
 * Initialize the CLI command
 */
export const init = new Command()
  .name("init")
  .description("initialize your project and install dependencies")
  .argument("[components...]", "the components to add")
  .option("-f, --framework <framework>", "the framework to use. (next, vite)")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd()
  )
  .option("-s, --silent", "mute output.", false)
  .option(
    "--src-dir",
    "use the src directory when creating a new project (specific to next).",
    false
  )
  .action(async (components, opts) => {
    try {
      const options = initOptionsSchema.parse({
        cwd: path.resolve(opts.cwd),
        isNewProject: false,
        components,
        ...opts,
      })
      await runInit(options)
      logger.log(
        `${highlighter.success("Success!")} Project initialization completed.`
      )
      logger.break()
    } catch (error) {
      logger.break()
      handleError(error)
    }
  })

/**
 * Main initialization function
 */
export async function runInit(options: InitOptions) {
  const { cwd, skipPreflight, components, silent } = options
  let projectInfo
  let newProjectFramework
  let updatedOptions = { ...options }

  // Handle preflight checks and possible project creation
  if (!skipPreflight) {
    const preflight = await preFlightInit(options)
    const isMissingDirOrEmptyProject =
      preflight.errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT]

    if (isMissingDirOrEmptyProject) {
      const { projectPath, framework } = await createProject(options)
      if (!projectPath) {
        process.exit(0)
      }

      updatedOptions = {
        ...updatedOptions,
        cwd: projectPath,
        isNewProject: true,
      }
      newProjectFramework = framework
    }
    projectInfo = preflight.projectInfo
  } else {
    projectInfo = await getProjectInfo(cwd)
  }

  // Handle monorepo special case
  if (newProjectFramework === "next-monorepo") {
    const monorepoWebPath = path.resolve(updatedOptions.cwd, "apps/web")
    return await getConfig(monorepoWebPath)
  }

  // Get or create configuration
  const projectConfig = await getProjectConfig(updatedOptions.cwd, projectInfo)
  const config = projectConfig
    ? await promptForMinimalConfig(projectConfig)
    : await promptForConfig(await getConfig(updatedOptions.cwd))

  // Handle component selection if none specified
  let selectedComponents = components || []
  if (!selectedComponents.length) {
    const shouldAddComponents = await createThemedConfirm(
      "Would you like to add a template or UI components to your project?"
    )

    if (!shouldAddComponents) {
      logger.info("")
      process.exit(0)
    }

    selectedComponents = await promptForRegistryComponents(updatedOptions)

    // Exit if still no components selected
    if (!selectedComponents.length) {
      logger.info("")
      process.exit(0)
    }
  }

  // Add components
  const fullConfig = await resolveConfigPaths(updatedOptions.cwd, config)
  await addComponents(selectedComponents, fullConfig, {
    // Init will always overwrite files.
    overwrite: true,
    silent,
    isNewProject:
      updatedOptions.isNewProject || projectInfo?.framework.name === "next-app",
  })

  return fullConfig
}

/**
 * Prompt for full configuration
 */
async function promptForConfig(defaultConfig: Config | null = null) {
  logger.info("")

  const tsx = await createThemedConfirm(
    `Would you like to use ${colors.cyan("TypeScript")} (recommended)?`,
    defaultConfig?.tsx ?? true
  )

  const rsc = await createThemedConfirm(
    `Are you using ${colors.cyan("React Server Components")}?`,
    defaultConfig?.rsc ?? true
  )

  return rawConfigSchema.parse({
    rsc,
    tsx,
    aliases: {
      components: DEFAULT_COMPONENTS,
      contexts: DEFAULT_CONTEXTS,
      hooks: DEFAULT_HOOKS,
      tiptapIcons: DEFAULT_TIPTAP_ICONS,
      lib: DEFAULT_LIB,
      tiptapExtensions: DEFAULT_TIPTAP_EXTENSIONS,
      tiptapNodes: DEFAULT_TIPTAP_NODES,
      tiptapUi: DEFAULT_TIPTAP_UI,
      tiptapUiPrimitives: DEFAULT_TIPTAP_UI_PRIMITIVES,
      styles: DEFAULT_STYLES,
    },
  })
}

/**
 * Prompt for minimal configuration from existing config
 */
async function promptForMinimalConfig(defaultConfig: Config) {
  return rawConfigSchema.parse({
    rsc: defaultConfig?.rsc,
    tsx: defaultConfig?.tsx,
    aliases: defaultConfig?.aliases,
  })
}
