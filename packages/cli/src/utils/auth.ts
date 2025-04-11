import fs from "fs-extra"
import path from "path"
import os from "os"
import { execa } from "execa"
import fetch from "node-fetch"
import { HttpsProxyAgent } from "https-proxy-agent"
import { logger } from "@/src/utils/logger"
import { spinner } from "@/src/utils/spinner"
import yaml from "yaml"

const REGISTRY_URL = process.env.REGISTRY_URL || "https://template.tiptap.dev"
const AUTH_API_URL = `${REGISTRY_URL}/api/auth`
const TIPTAP_REGISTRY = "https://registry.tiptap.dev/"
const AUTH_TOKEN_KEY = "//registry.tiptap.dev/:_authToken"
const SCOPE_REGISTRY_KEY = "@tiptap-pro:registry"

type PackageManager = "npm" | "yarn" | "pnpm" | "bun"
type AuthResult = {
  success: boolean
  token?: string
  error?: string
}
type AuthStatus = {
  authenticated: boolean
  user?: string
  plan?: string
  expires?: string
  token?: string
}

const httpAgent = process.env.https_proxy
  ? new HttpsProxyAgent(process.env.https_proxy)
  : undefined

/**
 * Authenticate a user with the Tiptap registry
 */
export async function authenticateUser({
  email,
  password,
  packageManager,
  writeConfig = true,
  cwd,
}: {
  email?: string
  password?: string
  packageManager: PackageManager
  writeConfig?: boolean
  cwd: string
}): Promise<AuthResult> {
  const loginSpinner = spinner(
    "Authenticating with Tiptap registry..."
  )?.start()

  try {
    if (!email || !password) {
      loginSpinner?.fail("Authentication failed")
      return { success: false, error: "Invalid credentials" }
    }

    const token = await requestAuthToken(email, password)

    if (writeConfig) {
      const success = await saveAuthToken(token, packageManager, cwd)
      if (!success) {
        loginSpinner?.fail("Failed to save authentication token")
        return { success: false, error: "Could not save authentication token" }
      }
    }

    loginSpinner?.succeed("Authentication successful")
    return { success: true, token }
  } catch (error) {
    loginSpinner?.fail("Authentication failed")
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during authentication",
    }
  }
}

/**
 * Request an authentication token from the API
 */
async function requestAuthToken(
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    agent: httpAgent,
  })

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }

  const data = (await response.json()) as { token: string }
  return data.token
}

/**
 * Check if user is authenticated with Tiptap registry
 */
export async function checkAuthStatus(
  packageManager: PackageManager,
  cwd: string
): Promise<AuthStatus> {
  try {
    const token = await getAuthToken(packageManager, cwd)

    if (!token) {
      return { authenticated: false }
    }

    const response = await fetch(`${AUTH_API_URL}/verify`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      agent: httpAgent,
    })

    if (!response.ok) {
      return { authenticated: false }
    }

    const data = (await response.json()) as {
      email?: string
      username?: string
      plan?: string
      expires?: string
    }

    return {
      authenticated: true,
      user: data.email || data.username,
      plan: data.plan,
      expires: data.expires,
      token,
    }
  } catch (error) {
    logger.error(
      `Auth status check error: ${error instanceof Error ? error.message : "Unknown error"}`
    )
    return { authenticated: false }
  }
}

/**
 * Save authentication token to package manager config
 */
async function saveAuthToken(
  token: string,
  packageManager: PackageManager,
  cwd: string
): Promise<boolean> {
  try {
    switch (packageManager) {
      case "npm":
        await saveNpmToken(token, cwd)
        break
      case "yarn":
        await saveYarnToken(token, cwd)
        break
      case "pnpm":
      case "bun":
        await saveToNpmrc(path.join(cwd, ".npmrc"), token)
        break
    }
    return true
  } catch (error) {
    logger.error(
      `Error saving auth token: ${error instanceof Error ? error.message : "Unknown error"}`
    )
    return false
  }
}

/**
 * Save token for npm
 */
async function saveNpmToken(token: string, cwd: string): Promise<void> {
  await execa("npm", ["config", "set", SCOPE_REGISTRY_KEY, TIPTAP_REGISTRY], {
    cwd,
  })
  await execa("npm", ["config", "set", AUTH_TOKEN_KEY, token], { cwd })
}

/**
 * Save token for yarn (handles v1 and v2+)
 */
async function saveYarnToken(token: string, cwd: string): Promise<void> {
  try {
    const { stdout: yarnVersion } = await execa("yarn", ["--version"], { cwd })
    const isYarnV1 = yarnVersion.startsWith("1.")

    if (isYarnV1) {
      // For Yarn 1.x
      await execa(
        "yarn",
        ["config", "set", SCOPE_REGISTRY_KEY, TIPTAP_REGISTRY],
        { cwd }
      )
      await execa("yarn", ["config", "set", AUTH_TOKEN_KEY, token], { cwd })
    } else {
      // For Yarn 2+ (Berry)
      await saveYarnBerryToken(token, cwd)
    }
  } catch (error) {
    // Fallback to .npmrc for yarn
    await saveToNpmrc(path.join(cwd, ".npmrc"), token)
  }
}

/**
 * Save token for Yarn Berry (v2+)
 */
async function saveYarnBerryToken(token: string, cwd: string): Promise<void> {
  const yarnrcPath = path.join(cwd, ".yarnrc.yml")
  let yamlObj: Record<string, unknown> = {}

  // Read existing config if it exists
  if (fs.existsSync(yarnrcPath)) {
    const yarnrcContent = await fs.readFile(yarnrcPath, "utf8")
    try {
      yamlObj = yaml.parse(yarnrcContent) || {}
    } catch (e) {
      // If parsing fails, start with empty object
    }
  }

  // Ensure the structure exists
  if (!yamlObj.npmScopes) {
    yamlObj.npmScopes = {}
  }

  // Set or update the tiptap-pro scope
  ;(yamlObj.npmScopes as Record<string, unknown>)["tiptap-pro"] = {
    npmRegistryServer: TIPTAP_REGISTRY,
    npmAuthToken: token,
  }

  // Write back to file
  await fs.writeFile(yarnrcPath, yaml.stringify(yamlObj))
}

/**
 * Update .npmrc file with token
 */
async function saveToNpmrc(npmrcPath: string, token: string): Promise<void> {
  let npmrcContent = ""

  // Read existing file if it exists
  if (fs.existsSync(npmrcPath)) {
    npmrcContent = await fs.readFile(npmrcPath, "utf8")
  }

  // Parse .npmrc content
  const { lines, processedKeys } = parseNpmrc(npmrcContent, token)

  // Add missing keys
  if (!processedKeys.has(SCOPE_REGISTRY_KEY)) {
    lines.push(`${SCOPE_REGISTRY_KEY}=${TIPTAP_REGISTRY}`)
  }

  if (!processedKeys.has(AUTH_TOKEN_KEY)) {
    lines.push(`${AUTH_TOKEN_KEY}=${token}`)
  }

  // Ensure file ends with a newline
  if (lines.length > 0 && lines[lines.length - 1] !== "") {
    lines.push("")
  }

  // Write the updated content back to the file
  await fs.writeFile(npmrcPath, lines.join("\n"))
}

/**
 * Parse .npmrc content
 */
function parseNpmrc(
  npmrcContent: string,
  token: string
): {
  lines: string[]
  processedKeys: Set<string>
} {
  const lines: string[] = []
  const processedKeys = new Set<string>()

  // Split content into lines
  const contentLines = npmrcContent.split("\n")

  // Process each line
  for (const line of contentLines) {
    const trimmedLine = line.trim()

    // Skip empty lines or add them as-is
    if (!trimmedLine) {
      lines.push(line)
      continue
    }

    // Preserve comments
    if (trimmedLine.startsWith("#")) {
      lines.push(line)
      continue
    }

    // Process key-value pairs
    const index = line.indexOf("=")
    if (index !== -1) {
      const key = line.substring(0, index).trim()

      // Update specific keys
      if (key === SCOPE_REGISTRY_KEY) {
        lines.push(`${SCOPE_REGISTRY_KEY}=${TIPTAP_REGISTRY}`)
        processedKeys.add(key)
      } else if (key === AUTH_TOKEN_KEY) {
        lines.push(`${AUTH_TOKEN_KEY}=${token}`)
        processedKeys.add(key)
      } else {
        // Keep other keys unchanged
        lines.push(line)
      }
    } else {
      // Keep lines that aren't key-value pairs
      lines.push(line)
    }
  }

  return { lines, processedKeys }
}

/**
 * Get auth token from package manager config
 */
export async function getAuthToken(
  packageManager: PackageManager,
  cwd: string
): Promise<string | null> {
  try {
    // First check project .npmrc
    const projectToken = await checkProjectNpmrc(cwd)
    if (projectToken) {
      return projectToken
    }

    // Then check package manager specific methods
    if (packageManager === "npm") {
      return await getNpmAuthToken(cwd)
    }

    // For other package managers, check global .npmrc
    return await checkGlobalNpmrc()
  } catch (error) {
    // logger.error(
    //   `Error getting auth token: ${error instanceof Error ? error.message : 'Unknown error'}`
    // )
    return null
  }
}

/**
 * Check project .npmrc for auth token
 */
async function checkProjectNpmrc(cwd: string): Promise<string | null> {
  const projectNpmrcPath = path.join(cwd, ".npmrc")
  if (fs.existsSync(projectNpmrcPath)) {
    const content = await fs.readFile(projectNpmrcPath, "utf8")
    return extractAuthToken(content)
  }
  return null
}

/**
 * Get npm auth token using npm config command
 */
async function getNpmAuthToken(cwd: string): Promise<string | null> {
  const { stdout } = await execa("npm", ["config", "get", AUTH_TOKEN_KEY], {
    cwd,
  })

  return stdout && stdout !== "undefined" ? stdout.trim() : null
}

/**
 * Check global .npmrc file for auth token
 */
async function checkGlobalNpmrc(): Promise<string | null> {
  const globalNpmrcPath = path.join(os.homedir(), ".npmrc")

  if (fs.existsSync(globalNpmrcPath)) {
    const content = await fs.readFile(globalNpmrcPath, "utf8")
    return extractAuthToken(content)
  }

  return null
}

/**
 * Extract auth token from config string
 */
export function extractAuthToken(configString: string): string | null {
  // Split into lines and filter for registry.tiptap.dev
  const lines = configString
    .split("\n")
    .filter((line) => line.startsWith("//registry.tiptap.dev/:_authToken="))

  if (lines.length === 0) {
    return null
  }

  // Extract the token after the "=" sign
  const token = lines[0].split("=")[1]?.trim()
  return token || null
}
