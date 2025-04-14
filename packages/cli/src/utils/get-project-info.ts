import path from "path"
import { FRAMEWORKS, Framework } from "@/src/utils/frameworks"
import { getPackageInfo } from "@/src/utils/get-package-info"
import fg from "fast-glob"
import fs from "fs-extra"
import { loadConfig } from "tsconfig-paths"
import {
  Config,
  RawConfig,
  getConfig,
  resolveConfigPaths,
} from "@/src/utils/get-config"

export type ProjectInfo = {
  framework: Framework
  isSrcDir: boolean
  isRSC: boolean
  isTsx: boolean
  aliasPrefix: string | null
}

const PROJECT_SHARED_IGNORE = [
  "**/node_modules/**",
  ".next",
  "public",
  "dist",
  "build",
]

export async function getProjectInfo(cwd: string): Promise<ProjectInfo | null> {
  const [configFiles, isSrcDir, isTsx, aliasPrefix, packageJson] =
    await Promise.all([
      fg.glob(
        "**/{next,vite,astro,app}.config.*|gatsby-config.*|composer.json|react-router.config.*",
        {
          cwd,
          deep: 3,
          ignore: PROJECT_SHARED_IGNORE,
        }
      ),
      fs.pathExists(path.resolve(cwd, "src")),
      isTypeScriptProject(cwd),
      getTsConfigAliasPrefix(cwd),
      getPackageInfo(cwd, false),
    ])

  const isUsingAppDir = await fs.pathExists(
    path.resolve(cwd, `${isSrcDir ? "src/" : ""}app`)
  )

  const type: ProjectInfo = {
    framework: FRAMEWORKS["manual"],
    isSrcDir,
    isRSC: false,
    isTsx,
    aliasPrefix,
  }

  // Next.js.
  if (configFiles.find((file) => file.startsWith("next.config."))?.length) {
    type.framework = isUsingAppDir
      ? FRAMEWORKS["next-app"]
      : FRAMEWORKS["next-pages"]
    type.isRSC = isUsingAppDir
    return type
  }

  // Astro.
  if (configFiles.find((file) => file.startsWith("astro.config."))?.length) {
    type.framework = FRAMEWORKS["astro"]
    return type
  }

  // Gatsby.
  if (configFiles.find((file) => file.startsWith("gatsby-config."))?.length) {
    type.framework = FRAMEWORKS["gatsby"]
    return type
  }

  // Laravel.
  if (configFiles.find((file) => file.startsWith("composer.json"))?.length) {
    type.framework = FRAMEWORKS["laravel"]
    return type
  }

  // Remix.
  if (
    Object.keys(packageJson?.dependencies ?? {}).find((dep) =>
      dep.startsWith("@remix-run/")
    )
  ) {
    type.framework = FRAMEWORKS["remix"]
    return type
  }

  // TanStack Start.
  if (
    configFiles.find((file) => file.startsWith("app.config."))?.length &&
    [
      ...Object.keys(packageJson?.dependencies ?? {}),
      ...Object.keys(packageJson?.devDependencies ?? {}),
    ].find((dep) => dep.startsWith("@tanstack/start"))
  ) {
    type.framework = FRAMEWORKS["tanstack-start"]
    return type
  }

  // React Router.
  if (
    configFiles.find((file) => file.startsWith("react-router.config."))?.length
  ) {
    type.framework = FRAMEWORKS["react-router"]
    return type
  }

  // Vite.
  // Some Remix templates also have a vite.config.* file.
  // We'll assume that it got caught by the Remix check above.
  if (configFiles.find((file) => file.startsWith("vite.config."))?.length) {
    type.framework = FRAMEWORKS["vite"]
    return type
  }

  return type
}

export async function getTsConfigAliasPrefix(cwd: string) {
  const tsConfig = await loadConfig(cwd)

  if (
    tsConfig?.resultType === "failed" ||
    !Object.entries(tsConfig?.paths).length
  ) {
    return null
  }

  // This assume that the first alias is the prefix.
  for (const [alias, paths] of Object.entries(tsConfig.paths)) {
    if (
      paths.includes("./*") ||
      paths.includes("./src/*") ||
      paths.includes("./app/*") ||
      paths.includes("./resources/js/*") // Laravel.
    ) {
      return alias.replace(/\/\*$/, "") ?? null
    }
  }

  // Use the first alias as the prefix.
  return Object.keys(tsConfig?.paths)?.[0].replace(/\/\*$/, "") ?? null
}

export async function isTypeScriptProject(cwd: string) {
  const files = await fg.glob("tsconfig.*", {
    cwd,
    deep: 1,
    ignore: PROJECT_SHARED_IGNORE,
  })

  return files.length > 0
}

export async function getProjectConfig(
  cwd: string,
  defaultProjectInfo: ProjectInfo | null = null
): Promise<Config | null> {
  const [existingConfig, projectInfo] = await Promise.all([
    getConfig(cwd),
    !defaultProjectInfo
      ? getProjectInfo(cwd)
      : Promise.resolve(defaultProjectInfo),
  ])

  if (existingConfig) {
    return existingConfig
  }

  if (!projectInfo) {
    return null
  }

  const config: RawConfig = {
    rsc: projectInfo.isRSC,
    tsx: projectInfo.isTsx,
    aliases: {
      components: `${projectInfo.aliasPrefix}/components`,
      contexts: `${projectInfo.aliasPrefix}/contexts`,
      hooks: `${projectInfo.aliasPrefix}/hooks`,
      tiptapIcons: `${projectInfo.aliasPrefix}/components/tiptap-icons`,
      lib: `${projectInfo.aliasPrefix}/lib`,
      tiptapExtensions: `${projectInfo.aliasPrefix}/components/tiptap-extensions`,
      tiptapNodes: `${projectInfo.aliasPrefix}/components/tiptap-nodes`,
      tiptapUi: `${projectInfo.aliasPrefix}/components/tiptap-ui`,
      tiptapUiPrimitives: `${projectInfo.aliasPrefix}/components/tiptap-ui-primitives`,
      styles: `${projectInfo.aliasPrefix}/styles`,
    },
  }

  return await resolveConfigPaths(cwd, config)
}
