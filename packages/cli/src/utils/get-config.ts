import path from "path"
import { resolveImport } from "@/src/utils/resolve-import"
import { cosmiconfig } from "cosmiconfig"
import fg from "fast-glob"
import { loadConfig } from "tsconfig-paths"
import { z } from "zod"
import { getProjectInfo } from "./get-project-info"

export const DEFAULT_COMPONENTS = "@/components"
export const DEFAULT_CONTEXTS = "@/contexts"
export const DEFAULT_HOOKS = "@/hooks"
export const DEFAULT_TIPTAP_ICONS = "@/components/tiptap-icons"
export const DEFAULT_LIB = "@/lib"
export const DEFAULT_TIPTAP_EXTENSIONS = "@/components/tiptap-extension"
export const DEFAULT_TIPTAP_NODES = "@/components/tiptap-node"
export const DEFAULT_TIPTAP_UI = "@/components/tiptap-ui"
export const DEFAULT_TIPTAP_UI_PRIMITIVES = "@/components/tiptap-ui-primitive"
export const DEFAULT_STYLES = "@/styles"

const explorer = cosmiconfig("components", {
  searchPlaces: ["components.json"],
})

export const rawConfigSchema = z.object({
  rsc: z.coerce.boolean().default(false),
  tsx: z.coerce.boolean().default(true),
  aliases: z.object({
    components: z.string(),
    contexts: z.string().optional(),
    hooks: z.string().optional(),
    tiptapIcons: z.string().optional(),
    lib: z.string().optional(),
    tiptapExtensions: z.string().optional(),
    tiptapNodes: z.string().optional(),
    tiptapUi: z.string().optional(),
    tiptapUiPrimitives: z.string().optional(),
    styles: z.string().optional(),
  }),
})

export const configSchema = rawConfigSchema.extend({
  resolvedPaths: z.object({
    cwd: z.string(),
    components: z.string(),
    contexts: z.string(),
    hooks: z.string(),
    tiptapIcons: z.string(),
    lib: z.string(),
    tiptapExtensions: z.string(),
    tiptapNodes: z.string(),
    tiptapUi: z.string(),
    tiptapUiPrimitives: z.string(),
    styles: z.string(),
  }),
})

export const workspaceConfigSchema = z.record(configSchema)

export type RawConfig = z.infer<typeof rawConfigSchema>

export type Config = z.infer<typeof configSchema>

export async function getConfig(cwd: string) {
  const res = await explorer.search(cwd)
  let config: RawConfig

  if (!res) {
    const projectInfo = await getProjectInfo(cwd)
    config = rawConfigSchema.parse({
      rsc: projectInfo?.isRSC ?? false,
      tsx: projectInfo?.isTsx ?? true,
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
  } else {
    config = rawConfigSchema.parse(res.config)

    config.aliases = {
      components: config.aliases.components ?? DEFAULT_COMPONENTS,
      contexts: config.aliases.contexts ?? DEFAULT_CONTEXTS,
      hooks: config.aliases.hooks ?? DEFAULT_HOOKS,
      tiptapIcons: config.aliases.tiptapIcons ?? DEFAULT_TIPTAP_ICONS,
      lib: config.aliases.lib ?? DEFAULT_LIB,
      tiptapExtensions:
        config.aliases.tiptapExtensions ?? DEFAULT_TIPTAP_EXTENSIONS,
      tiptapNodes: config.aliases.tiptapNodes ?? DEFAULT_TIPTAP_NODES,
      tiptapUi: config.aliases.tiptapUi ?? DEFAULT_TIPTAP_UI,
      tiptapUiPrimitives:
        config.aliases.tiptapUiPrimitives ?? DEFAULT_TIPTAP_UI_PRIMITIVES,
      styles: config.aliases.styles ?? DEFAULT_STYLES,
    }
  }

  return await resolveConfigPaths(cwd, config)
}

export async function resolveConfigPaths(cwd: string, config: RawConfig) {
  // Read tsconfig.json.
  const tsConfig = await loadConfig(cwd)

  if (tsConfig.resultType === "failed") {
    throw new Error(
      `Failed to load ${config.tsx ? "tsconfig" : "jsconfig"}.json. ${
        tsConfig.message ?? ""
      }`.trim()
    )
  }

  return configSchema.parse({
    ...config,
    resolvedPaths: {
      cwd,
      components: await resolveImport(config.aliases.components, tsConfig),
      contexts: config.aliases.contexts
        ? await resolveImport(config.aliases.contexts, tsConfig)
        : path.resolve(
            (await resolveImport(config.aliases.components, tsConfig)) ?? cwd,
            "..",
            "contexts"
          ),
      hooks: config.aliases.hooks
        ? await resolveImport(config.aliases.hooks, tsConfig)
        : path.resolve(
            (await resolveImport(config.aliases.components, tsConfig)) ?? cwd,
            "..",
            "hooks"
          ),
      tiptapIcons: config.aliases.tiptapIcons
        ? await resolveImport(config.aliases.tiptapIcons, tsConfig)
        : path.resolve(
            (await resolveImport(config.aliases.components, tsConfig)) ?? cwd,
            "tiptap-icons"
          ),
      lib: config.aliases.lib
        ? await resolveImport(config.aliases.lib, tsConfig)
        : path.resolve(
            (await resolveImport(DEFAULT_LIB, tsConfig)) ?? cwd,
            ".."
          ),
      tiptapExtensions: config.aliases.tiptapExtensions
        ? await resolveImport(config.aliases.tiptapExtensions, tsConfig)
        : path.resolve(
            (await resolveImport(config.aliases.components, tsConfig)) ?? cwd,
            "tiptap-extension"
          ),
      tiptapNodes: config.aliases.tiptapNodes
        ? await resolveImport(config.aliases.tiptapNodes, tsConfig)
        : path.resolve(
            (await resolveImport(config.aliases.components, tsConfig)) ?? cwd,
            "tiptap-node"
          ),
      tiptapUi: config.aliases.tiptapUi
        ? await resolveImport(config.aliases.tiptapUi, tsConfig)
        : path.resolve(
            (await resolveImport(config.aliases.components, tsConfig)) ?? cwd,
            "tiptap-ui"
          ),
      tiptapUiPrimitives: config.aliases.tiptapUiPrimitives
        ? await resolveImport(config.aliases.tiptapUiPrimitives, tsConfig)
        : path.resolve(
            (await resolveImport(config.aliases.components, tsConfig)) ?? cwd,
            "tiptap-ui-primitive"
          ),
      styles: config.aliases.styles
        ? await resolveImport(config.aliases.styles, tsConfig)
        : path.resolve(cwd, "styles"),
    },
  })
}

// Note: we can check for -workspace.yaml or "workspace" in package.json.
// Since cwd is not necessarily the root of the project.
// We'll instead check if ui aliases resolve to a different root.
export async function getWorkspaceConfig(config: Config) {
  const resolvedAliases: Record<string, Config> = {}

  for (const key of Object.keys(config.aliases)) {
    if (!isAliasKey(key, config)) {
      continue
    }

    const resolvedPath = config.resolvedPaths[key]
    const packageRoot = await findPackageRoot(
      config.resolvedPaths.cwd,
      resolvedPath
    )

    if (!packageRoot) {
      resolvedAliases[key] = config
      continue
    }

    resolvedAliases[key] = await getConfig(packageRoot)
  }

  const result = workspaceConfigSchema.safeParse(resolvedAliases)
  if (!result.success) {
    return null
  }

  return result.data
}

export async function findPackageRoot(cwd: string, resolvedPath: string) {
  const commonRoot = findCommonRoot(cwd, resolvedPath)
  const relativePath = path.relative(commonRoot, resolvedPath)

  const packageRoots = await fg.glob("**/package.json", {
    cwd: commonRoot,
    deep: 3,
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/public/**"],
  })

  const matchingPackageRoot = packageRoots
    .map((pkgPath) => path.dirname(pkgPath))
    .find((pkgDir) => relativePath.startsWith(pkgDir))

  return matchingPackageRoot ? path.join(commonRoot, matchingPackageRoot) : null
}

function isAliasKey(
  key: string,
  config: Config
): key is keyof Config["aliases"] {
  return Object.keys(config.resolvedPaths).includes(key)
}

export function findCommonRoot(cwd: string, resolvedPath: string) {
  const parts1 = cwd.split(path.sep)
  const parts2 = resolvedPath.split(path.sep)
  const commonParts = []

  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] !== parts2[i]) {
      break
    }
    commonParts.push(parts1[i])
  }

  return commonParts.join(path.sep)
}
