import path from "path"
import { Command } from "commander"
import { z } from "zod"
import select from "@/src/inquirer/select"
import { checkbox, Separator } from "@inquirer/prompts"
import { preFlightAdd } from "@/src/preflights/preflight-add"
import { addComponents } from "@/src/utils/add-components"
import * as ERRORS from "@/src/utils/errors"
import { handleError } from "@/src/utils/handle-error"
import { logger } from "@/src/utils/logger"
import { fetchFreeRegistry, getRegistryIndex } from "@/src/utils/registry"
import { colors } from "@/src/utils/colors"
import type { RegistryItemIndexSchema } from "@/src/utils/registry/schema"
import { toReadableName } from "@/src/utils/common"

export const addOptionsSchema = z.object({
  components: z.array(z.string()).optional(),
  cwd: z.string(),
  path: z.string().optional(),
  silent: z.boolean(),
  overwrite: z.boolean(),
})

type AddOptions = z.infer<typeof addOptionsSchema>

interface CategoryMap {
  templates: RegistryItemIndexSchema
  ui: RegistryItemIndexSchema
  primitives: RegistryItemIndexSchema
  nodes: RegistryItemIndexSchema
}

const PLANS = {
  free: "Free",
  paid: "Paid",
  // Future plans:
  // start: "Start",
  // plus: "Plus",
  // growth: "Growth",
  // enterprise: "Enterprise",
}

const PROMPT_PAGE_SIZE = 1_000 // Large size to avoid help tip

const UI = {
  divider: colors.gray("----------------------------------------------"),
  warning: colors.magenta(
    "  Some components (marked as Paid) require an active subscription!"
  ),
  emptyRegistry: colors.red("  No components or templates found"),
  operationCancelled: colors.red("  Operation cancelled"),
  missingDirectory: colors.red(
    "  Missing directory or empty project. Please create a new project first."
  ),
}

const PROMPT_THEME = {
  icon: {
    cursor: colors.cyan("❯"),
    checked: "●",
  },
  style: {
    highlight: (text: string) => colors.cyan(text),
  },
  prefix: {
    done: colors.cyan("✔"),
    idle: "?",
  },
  helpMode: "always" as const,
}

const CHECKBOX_THEME = {
  ...PROMPT_THEME,
  icon: {
    ...PROMPT_THEME.icon,
    checked: "●",
    cursor: " ",
  },
}

/**
 * Filters templates to only include free ones based on registry data
 */
function filterFreeTemplates(
  templates: RegistryItemIndexSchema,
  freeComponents: string[] | null
): RegistryItemIndexSchema {
  if (!freeComponents) {
    return templates
  }

  return templates.filter((template) => freeComponents.includes(template.name))
}

/**
 * Creates instruction text for prompts
 */
const createInstruction = (text: string): string => {
  return `\n${colors.gray(text)}\n`
}

/**
 * Clears specified number of lines from console
 */
function clearPromptLines(lines: number) {
  for (let i = 0; i < lines; i++) {
    process.stdout.write("\x1B[1A") // Move cursor up
    process.stdout.write("\x1B[2K") // Clear line
  }
}

/**
 * Categorizes registry items by type
 */
const categorizeRegistryItems = (
  registryIndex: RegistryItemIndexSchema
): CategoryMap => {
  return {
    templates: registryIndex.filter(
      (entry) => entry.type === "registry:template"
    ),
    ui: registryIndex.filter((entry) => entry.type === "registry:ui"),
    primitives: registryIndex.filter(
      (entry) => entry.type === "registry:ui-primitive"
    ),
    nodes: registryIndex.filter((entry) => entry.type === "registry:node"),
  }
}

/**
 * Prompts user to select between components and templates
 */
async function promptForInitialSelection(
  categories: CategoryMap,
  showDivider = true
): Promise<"components" | "templates" | null> {
  const message = "What would you like to integrate:"
  const instructions = createInstruction(
    "  Use arrow-keys ▲▼ / [Return] to submit"
  )

  const choices = []
  const isComponentEmpty =
    categories.ui.length === 0 && categories.nodes.length === 0
  const isTemplateEmpty = categories.templates.length === 0

  if (!isTemplateEmpty) {
    choices.push({ name: "Templates", value: "templates" })
  }

  if (!isComponentEmpty) {
    choices.push({ name: "Components", value: "components" })
  }

  if (choices.length === 0) {
    logger.break()
    console.log(UI.emptyRegistry)
    return null
  }

  try {
    if (showDivider) {
      console.log(UI.divider)
    }

    const selection = await select({
      message,
      instructions,
      pageSize: PROMPT_PAGE_SIZE,
      theme: PROMPT_THEME,
      choices,
    })

    if (showDivider) {
      console.log(UI.divider)
    }

    return selection as "templates" | "components"
  } catch (error) {
    clearPromptLines(4)
    console.log(UI.operationCancelled)
    return null
  }
}

/**
 * Creates choices for component menu with appropriate sections
 */
async function createComponentChoices(
  categories: CategoryMap,
  freeComponents: string[] | null
): Promise<Array<{ name: string; value: string } | Separator>> {
  const choices: Array<{ name: string; value: string } | Separator> = []

  if (!freeComponents) {
    return choices
  }

  const addCategorySection = (
    items: RegistryItemIndexSchema,
    title: string
  ) => {
    const freeItems = items.filter((item) => freeComponents.includes(item.name))

    if (freeItems.length > 0) {
      choices.push(new Separator(colors.gray(`  ${title}`)))

      freeItems.forEach((item) => {
        const planLabel = PLANS[item.plan || "free"]
        choices.push({
          name: `${toReadableName(item.name)} (${planLabel})`,
          value: item.name,
        })
      })

      choices.push(new Separator(" "))
    }
  }

  addCategorySection(categories.ui, "UI COMPONENTS")
  addCategorySection(categories.nodes, "NODE COMPONENTS")
  addCategorySection(categories.primitives, "PRIMITIVES")

  return choices
}

/**
 * Shows menu for selecting components
 */
async function componentMenu(
  categories: CategoryMap,
  freeComponents: string[] | null
): Promise<string[]> {
  const instructions = createInstruction(
    `${UI.warning}\n  [Space] to select / [A] to toggle all / [I] to invert / [Return] to submit`
  )

  const choices = await createComponentChoices(categories, freeComponents)

  if (choices.length === 0) {
    return []
  }

  try {
    const selectedComponents = await checkbox({
      message: "Select the components you want to add:",
      instructions,
      required: true,
      pageSize: 20,
      choices,
      theme: CHECKBOX_THEME,
    })

    console.log("")
    return selectedComponents
  } catch (error) {
    clearPromptLines(25) // 20 for menu + 5 for console
    console.log(UI.operationCancelled)
    return []
  }
}

/**
 * Shows menu for selecting templates
 */
async function templateMenu(
  templates: RegistryItemIndexSchema
): Promise<string[]> {
  try {
    const instructions = createInstruction(
      `${UI.warning}\n  [Space] to select / [A] to toggle all / [I] to invert / [Return] to submit`
    )

    const choices = templates.map((template) => {
      const planLabel = PLANS[template.plan || "free"]
      const description = template.description
        ? ` - ${template.description}`
        : ""

      return {
        name: `${toReadableName(template.name)}${description} (${planLabel})`,
        value: template.name,
      }
    })

    return await checkbox({
      message: "Select the templates you want to add:",
      instructions,
      required: true,
      pageSize: 20,
      choices,
      theme: CHECKBOX_THEME,
    })
  } catch (error) {
    clearPromptLines(25) // Adjust for more lines in the checkbox menu
    console.log(UI.operationCancelled)
    return []
  }
}

/**
 * Main function to prompt for registry components
 */
export async function promptForRegistryComponents(
  options: AddOptions,
  showDivider = true
): Promise<string[]> {
  if (options.components?.length) {
    return options.components
  }

  const registryIndex = await getRegistryIndex()

  if (!registryIndex) {
    logger.break()
    handleError(new Error("[prompts] - Failed to fetch registry index."))
    return []
  }

  // Filter out hidden components from the registry
  const visibleRegistryItems = registryIndex.filter(Boolean)
  const categories = categorizeRegistryItems(visibleRegistryItems)

  const selection = await promptForInitialSelection(categories, showDivider)

  if (!selection) {
    return []
  }

  const freeComponents = await fetchFreeRegistry()

  if (!freeComponents) {
    logger.break()
    handleError(new Error("[prompts] - Failed to fetch free components."))
    return []
  }

  switch (selection) {
    case "components":
      return (await componentMenu(categories, freeComponents)) || []
    case "templates": {
      const filteredTemplates = filterFreeTemplates(
        categories.templates,
        freeComponents
      )
      const templateResults = await templateMenu(filteredTemplates)
      return templateResults || []
    }
    default:
      return []
  }
}

export const add = new Command()
  .name("add")
  .description("add Tiptap components and templates to your project")
  .argument("[components...]", "the components to add")
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd()
  )
  .option("-p, --path <path>", "the path to add the component to.")
  .option("-s, --silent", "mute output.", false)
  .action(async (components, opts) => {
    try {
      const options = addOptionsSchema.parse({
        components,
        cwd: path.resolve(opts.cwd),
        ...opts,
      })

      if (!options.components?.length) {
        options.components = await promptForRegistryComponents(options)
      }

      // No components selected
      if (!options.components?.length) {
        return
      }

      const { errors, config } = await preFlightAdd(options)

      if (errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT]) {
        logger.warn(`\n${UI.missingDirectory}`)
        process.exit(0)
      }

      if (!config) {
        throw new Error(`Failed to read config at ${colors.blue(options.cwd)}.`)
      }

      await addComponents(options.components, config, options)
    } catch (error) {
      logger.break()
      handleError(error)
    }
  })
