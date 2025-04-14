import { Config, configSchema } from "@/src/utils/get-config"
import { handleError } from "@/src/utils/handle-error"
import { highlighter } from "@/src/utils/highlighter"
import { logger } from "@/src/utils/logger"
import {
  registryIndexSchema,
  registryItemSchema,
  registryResolvedItemsTreeSchema,
} from "@/src/utils/registry/schema"
import { getAuthToken } from "@/src/utils/auth"
import { getPackageManager } from "@/src/utils/get-package-manager"
import deepmerge from "deepmerge"
import { HttpsProxyAgent } from "https-proxy-agent"
import fetch from "node-fetch"
import { z } from "zod"
import { getProjectInfo } from "@/src/utils/get-project-info"

const REGISTRY_URL = process.env.REGISTRY_URL || "https://template.tiptap.dev"

const agent = process.env.https_proxy
  ? new HttpsProxyAgent(process.env.https_proxy)
  : undefined

export async function getRegistryIndex(config?: Config) {
  try {
    const [result] = await fetchRegistry(["index.json"], config)

    return registryIndexSchema.parse(result)
  } catch (error) {
    logger.error("\n")
    handleError(error)
  }
}

export async function fetchFreeRegistry() {
  try {
    const url = `${REGISTRY_URL}/api/registry/free`
    const response = await fetch(url, {
      agent,
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch from ${highlighter.info(url)}.\n${response.statusText}`
      )
    }

    const result = (await response.json()) as string[]
    return result
  } catch (error) {
    logger.error("\n")
    handleError(error)
  }
}

export async function fetchRegistry(paths: string[], config?: Config) {
  try {
    let authToken = null
    if (config) {
      const packageManager = await getPackageManager(config.resolvedPaths.cwd)
      authToken = await getAuthToken(packageManager, config.resolvedPaths.cwd)
    }

    const results = await Promise.all(
      paths.map(async (path) => {
        const url = getRegistryUrl(path)

        // Setup headers with auth token if available
        const headers: Record<string, string> = {}
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`
        }

        const response = await fetch(url, {
          agent,
          headers,
        })

        if (!response.ok) {
          const errorMessages: { [key: number]: string } = {
            400: "Bad request",
            401: "Unauthorized",
            403: "Forbidden",
            404: "Not found",
            500: "Internal server error",
          }

          if (response.status === 401) {
            throw new Error(
              `You are not authorized to access the component at ${highlighter.info(
                url
              )}.\nPlease run 'tiptap auth login' to authenticate with the registry, or make sure your token is valid.`
            )
          }

          if (response.status === 404) {
            throw new Error(
              `The component at ${highlighter.info(
                url
              )} was not found.\nIt may not exist at the registry. Please make sure it is a valid component.`
            )
          }

          if (response.status === 403) {
            throw new Error(
              `You do not have access to the component at ${highlighter.info(
                url
              )}.\nYour account may not have the required subscription plan for this component.\nPlease upgrade your subscription or use a component available in your current plan.`
            )
          }

          const result = await response.json()
          const message =
            result && typeof result === "object" && "error" in result
              ? result.error
              : response.statusText || errorMessages[response.status]
          throw new Error(
            `Failed to fetch from ${highlighter.info(url)}.\n${message}`
          )
        }

        return response.json()
      })
    )

    return results
  } catch (error) {
    logger.error("\n")
    handleError(error)
    return []
  }
}

export async function registryResolveItemsTree(
  names: z.infer<typeof registryItemSchema>["name"][],
  config: z.infer<typeof configSchema>
) {
  try {
    const index = await getRegistryIndex(config)
    if (!index) {
      return null
    }

    // If we're resolving the index, we want it to go first.
    if (names.includes("index")) {
      names.unshift("index")
    }

    const registryItems = await resolveRegistryItems(names, config)
    const result = await fetchRegistry(registryItems, config)
    const payload = z.array(registryItemSchema).parse(result)

    if (!payload) {
      return null
    }

    const projectInfo = await getProjectInfo(config.resolvedPaths.cwd)
    const framework = projectInfo?.framework.name

    const allDependencies = deepmerge.all(
      payload.map((item) => item.dependencies ?? [])
    )

    const allDevDependencies = deepmerge.all(
      payload.map((item) => item.devDependencies ?? [])
    )

    const filteredDevDependencies = filterDevDependenciesByFramework(
      allDevDependencies,
      framework
    )

    return registryResolvedItemsTreeSchema.parse({
      dependencies: allDependencies,
      devDependencies: filteredDevDependencies,
      files: deepmerge.all(payload.map((item) => item.files ?? [])),
    })
  } catch (error) {
    handleError(error)
    return null
  }
}

async function resolveRegistryDependencies(
  url: string,
  config: Config
): Promise<string[]> {
  const visited = new Set<string>()
  const payload: string[] = []

  async function resolveDependencies(itemUrl: string) {
    const url = getRegistryUrl(
      isUrl(itemUrl) ? itemUrl : `components/${itemUrl}.json`
    )

    if (visited.has(url)) {
      return
    }

    visited.add(url)

    try {
      const [result] = await fetchRegistry([url], config)
      const item = registryItemSchema.parse(result)
      payload.push(url)

      if (item.registryDependencies) {
        for (const dependency of item.registryDependencies) {
          await resolveDependencies(dependency)
        }
      }
    } catch (error) {
      console.error(
        `Error fetching or parsing registry item at ${itemUrl}:`,
        error
      )
    }
  }

  await resolveDependencies(url)
  return Array.from(new Set(payload))
}

// TODO: We're double-fetching here. Use a cache.
export async function resolveRegistryItems(names: string[], config: Config) {
  const registryDependencies: string[] = []
  for (const name of names) {
    const itemRegistryDependencies = await resolveRegistryDependencies(
      name,
      config
    )
    registryDependencies.push(...itemRegistryDependencies)
  }

  return Array.from(new Set(registryDependencies))
}

function getRegistryUrl(path: string) {
  if (isUrl(path)) {
    const url = new URL(path)
    return url.toString()
  }

  if (!REGISTRY_URL) {
    throw new Error("No registry URL found")
  }

  // Keep the index.json path as is (public)
  if (path === "index.json") {
    return `${REGISTRY_URL}/r/${path}`
  }

  // Only redirect component paths to the API
  if (path.startsWith("components/")) {
    const componentName = path.replace("components/", "").replace(".json", "")
    return `${REGISTRY_URL}/api/registry/components/${componentName}`
  }

  return `${REGISTRY_URL}/${path}`
}

function isUrl(path: string) {
  try {
    new URL(path)
    return true
  } catch (error) {
    return false
  }
}

export function getRegistryTypeAliasMap() {
  return new Map<string, string>([
    ["registry:ui", "tiptapUi"],
    ["registry:ui-primitive", "tiptapUiPrimitives"],
    ["registry:extension", "tiptapExtensions"],
    ["registry:node", "tiptapNodes"],
    ["registry:context", "contexts"],
    ["registry:hook", "hooks"],
    ["registry:lib", "lib"],
    ["registry:context", "components"],
    ["registry:template", "tiptapTemplates"],
    ["registry:component", "components"],
    ["registry:icon", "titpapIcons"],
    ["registry:style", "styles"],
  ])
}

// Track a dependency and its parent.
export function getRegistryParentMap(
  registryItems: z.infer<typeof registryItemSchema>[]
) {
  const map = new Map<string, z.infer<typeof registryItemSchema>>()

  registryItems.forEach((item) => {
    if (!item.registryDependencies) {
      return
    }

    item.registryDependencies.forEach((dependency) => {
      map.set(dependency, item)
    })
  })

  return map
}

/**
 * Filter development dependencies based on framework requirements
 * @param devDependencies Array of development dependencies
 * @param framework Framework name
 * @returns Filtered array of development dependencies
 */
function filterDevDependenciesByFramework(
  devDependencies: unknown,
  framework: string | undefined
): string[] {
  // Ensure we have a proper string array
  const depsArray = Array.isArray(devDependencies) ? devDependencies : []

  if (!depsArray.length) {
    return []
  }

  const stringDeps = depsArray.map((dep) => String(dep))

  const hasSass = stringDeps.includes("sass")
  const hasSassEmbedded = stringDeps.includes("sass-embedded")

  if (hasSass && hasSassEmbedded) {
    let filteredDeps = [...stringDeps]

    if (framework) {
      if (framework === "vite") {
        // Vite prefers sass-embedded
        filteredDeps = filteredDeps.filter((dep) => dep !== "sass")
      } else if (framework === "next-app" || framework === "next-pages") {
        // Next.js prefers sass
        filteredDeps = filteredDeps.filter((dep) => dep !== "sass-embedded")
      }
    }

    return filteredDeps
  }

  return stringDeps
}
