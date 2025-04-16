import { Command } from "commander"
import { execa } from "execa"
import { z } from "zod"
import { confirm, input, password as passwordPrompt } from "@inquirer/prompts"
import { authenticateUser, checkAuthStatus } from "@/src/utils/auth"
import { colors } from "@/src/utils/colors"
import { handleError } from "@/src/utils/handle-error"
import { logger } from "@/src/utils/logger"
import { getPackageManager } from "@/src/utils/get-package-manager"

export const authOptionsSchema = z.object({
  cwd: z.string(),
  email: z.string().optional(),
  password: z.string().optional(),
  writeConfig: z.boolean().optional(),
})

type AuthOptions = z.infer<typeof authOptionsSchema>
type PackageManager = "npm" | "yarn" | "pnpm" | "bun"

/**
 * Creates a themed input prompt with consistent styling
 */
const createThemedInput = (
  message: string,
  options: {
    required?: boolean
    validate?: (value: string) => boolean | string
  } = {}
) => {
  return input({
    message,
    required: options.required ?? true,
    validate:
      options.validate ??
      ((value: string) => (value ? true : "This field is required")),
    theme: {
      prefix: {
        done: colors.cyan("✓"),
        idle: "?",
      },
    },
  })
}

/**
 * Creates a themed password prompt with consistent styling
 */
const createThemedPassword = (
  message: string,
  options: {
    validate?: (value: string) => boolean | string
  } = {}
) => {
  return passwordPrompt({
    message,
    validate:
      options.validate ??
      ((value: string) => (value ? true : "This field is required")),
    mask: "*",
    theme: {
      prefix: {
        done: colors.cyan("✓"),
        idle: "?",
      },
    },
  })
}

/**
 * Creates a themed confirmation prompt with consistent styling
 */
const createThemedConfirm = (message: string, defaultValue: boolean = true) => {
  return confirm({
    message,
    default: defaultValue,
    theme: {
      prefix: {
        done: colors.cyan("✓"),
        idle: "?",
      },
    },
  })
}

/**
 * Get the appropriate configuration file name based on package manager
 */
function getConfigFileName(packageManager: PackageManager): string {
  switch (packageManager) {
    case "npm":
      return ".npmrc (via npm config)"
    case "yarn":
      return ".yarnrc.yml or .npmrc (depending on Yarn version)"
    case "pnpm":
    case "bun":
      return ".npmrc"
    default:
      return "configuration file"
  }
}

/**
 * Display appropriate token configuration instructions for each package manager
 */
async function displayTokenInstructions(
  packageManager: PackageManager,
  token: string,
  cwd: string
) {
  logger.info(
    "To use this token manually, add it to your package manager configuration:"
  )

  if (packageManager === "npm") {
    logger.info(
      `npm config set @tiptap-pro:registry https://registry.tiptap.dev/`
    )
    logger.info(`npm config set //registry.tiptap.dev/:_authToken ${token}`)
  } else if (packageManager === "yarn") {
    const isYarnV1 = await checkYarnVersion(cwd)

    if (isYarnV1) {
      logger.info(
        `yarn config set @tiptap-pro:registry https://registry.tiptap.dev/`
      )
      logger.info(`yarn config set //registry.tiptap.dev/:_authToken ${token}`)
    } else {
      logger.info(
        `Add to .yarnrc.yml:\nnpmScopes:\n  tiptap-pro:\n    npmRegistryServer: "https://registry.tiptap.dev/"\n    npmAuthToken: "${token}"`
      )
    }
  } else if (packageManager === "pnpm" || packageManager === "bun") {
    logger.info(
      `Add to .npmrc:\n@tiptap-pro:registry=https://registry.tiptap.dev/\n//registry.tiptap.dev/:_authToken=${token}`
    )
  }
}

/**
 * Check if the project is using Yarn v1
 */
async function checkYarnVersion(cwd: string): Promise<boolean> {
  try {
    const yarnVersionOutput = await execa("yarn", ["--version"], { cwd })
    return yarnVersionOutput.stdout.startsWith("1.")
  } catch (error) {
    // If yarn command fails, default to false
    return false
  }
}

/**
 * Handle the login process with interactive prompts if needed
 */
async function handleLogin(options: AuthOptions) {
  let { email, password, writeConfig } = options
  const { cwd } = options

  // Interactive prompts if necessary values aren't provided
  if (!email) {
    email = await createThemedInput("Email:", {
      validate: (value: string) => (value ? true : "Please enter your email"),
    })
  }

  if (!password) {
    password = await createThemedPassword("Password:", {
      validate: (value: string) =>
        value ? true : "Please enter your password",
    })
  }

  // User cancelled the prompt
  if (!email || !password) {
    logger.error("Authentication cancelled")
    process.exit(0)
  }

  const packageManager = await getPackageManager(cwd)

  // Prompt for writeConfig if not explicitly set via command line
  if (writeConfig === undefined) {
    const configFileName = getConfigFileName(packageManager)

    writeConfig = await createThemedConfirm(
      `Would you like to save the auth token to your ${configFileName}?`
    )

    // User cancelled the prompt
    if (writeConfig === undefined) {
      logger.error("Authentication cancelled")
      process.exit(0)
    }
  }

  const result = await authenticateUser({
    email,
    password,
    packageManager,
    writeConfig: writeConfig ?? false,
    cwd,
  })

  if (result.success) {
    logger.success("Successfully logged in to Tiptap registry")

    if (writeConfig) {
      logger.info(
        `Token saved for package manager: ${colors.blue(packageManager)}`
      )
    } else if (result.token) {
      logger.info(`\nToken: ${colors.blue(result.token)}`)
      await displayTokenInstructions(packageManager, result.token, cwd)
    }
  } else {
    logger.error("Authentication failed: " + result.error)
  }
}

/**
 * Handle checking authentication status
 */
async function handleStatusCheck(cwd: string) {
  const packageManager = await getPackageManager(cwd)
  const status = await checkAuthStatus(packageManager, cwd)

  if (status.authenticated) {
    logger.success(
      `Authenticated as ${colors.blue(status.user ?? "unknown user")}`
    )
    logger.info(`Account type: ${colors.blue(status.plan || "Free")}`)
    logger.info(`Token expires: ${colors.blue(status.expires || "Never")}`)
  } else {
    logger.info("Not authenticated with Tiptap registry")
    logger.info("Run `tiptap auth login` to authenticate")
  }
}

// Command definitions
export const login = new Command()
  .command("login")
  .description("log in to your Tiptap registry account")
  .option("-e, --email <email>", "your Tiptap registry email")
  .option("-p, --password <password>", "your Tiptap registry password")
  .option(
    "--write-config",
    "write the auth token to your package manager config",
    undefined
  )
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd()
  )
  .action(async (options) => {
    try {
      const opts = authOptionsSchema.parse(options)
      await handleLogin(opts)
    } catch (error) {
      handleError(error)
    }
  })

export const status = new Command()
  .command("status")
  .description("check your Tiptap registry authentication status")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd()
  )
  .action(async (options) => {
    try {
      const opts = authOptionsSchema.parse(options)
      await handleStatusCheck(opts.cwd)
    } catch (error) {
      handleError(error)
    }
  })
