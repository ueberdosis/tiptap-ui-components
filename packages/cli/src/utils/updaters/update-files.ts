import { existsSync, promises as fs } from "fs"
import path, { basename } from "path"
import { Config } from "@/src/utils/get-config"
import { getProjectInfo, ProjectInfo } from "@/src/utils/get-project-info"
import { highlighter } from "@/src/utils/highlighter"
import { logger } from "@/src/utils/logger"
import {
  RegistryItem,
  registryItemFileSchema,
} from "@/src/utils/registry/schema"
import { spinner } from "@/src/utils/spinner"
import { transform } from "@/src/utils/transformers"
import { transformImport } from "@/src/utils/transformers/transform-import"
import { transformRsc } from "@/src/utils/transformers/transform-rsc"
import { transformEnvVars } from "@/src/utils/transformers/transform-env-vars"
import { z } from "zod"
import { confirm } from "@inquirer/prompts"
import chalk from "chalk"

export async function updateFiles(
  files: RegistryItem["files"],
  config: Config,
  options: {
    overwrite?: boolean
    force?: boolean
    silent?: boolean
    rootSpinner?: ReturnType<typeof spinner>
  }
) {
  if (!files?.length) {
    return {
      filesCreated: [],
      filesUpdated: [],
      filesSkipped: [],
    }
  }
  options = {
    overwrite: false,
    force: false,
    silent: false,
    ...options,
  }
  const filesCreatedSpinner = spinner(`Updating files.`, {
    silent: options.silent,
  })?.start()

  const [projectInfo] = await Promise.all([
    getProjectInfo(config.resolvedPaths.cwd),
  ])

  const filesCreated = []
  const filesUpdated = []
  const filesSkipped = []

  for (const file of files) {
    if (!file.content) {
      continue
    }

    let filePath = resolveFilePath(file, config, {
      isSrcDir: projectInfo?.isSrcDir,
      framework: projectInfo?.framework.name,
      commonRoot: findCommonRoot(
        files.map((f) => f.path),
        file.path
      ),
    })

    if (!filePath) {
      continue
    }

    const fileName = basename(file.path)
    const targetDir = path.dirname(filePath)

    if (!config.tsx) {
      filePath = filePath.replace(/\.tsx?$/, (match) =>
        match === ".tsx" ? ".jsx" : ".js"
      )
    }

    const existingFile = existsSync(filePath)

    // Run our transformers.
    const content = await transform(
      {
        filename: file.path,
        raw: file.content,
        config,
        transformJsx: !config.tsx,
      },
      [transformImport, transformRsc, transformEnvVars]
    )

    if (existingFile) {
      const existingFileContent = await fs.readFile(filePath, "utf-8")
      const [normalizedExisting, normalizedNew] = await Promise.all([
        getNormalizedFileContent(existingFileContent),
        getNormalizedFileContent(content),
      ])
      if (normalizedExisting === normalizedNew) {
        filesSkipped.push(path.relative(config.resolvedPaths.cwd, filePath))
        continue
      }
    }

    if (existingFile && !options.overwrite) {
      filesCreatedSpinner.stop()
      if (options.rootSpinner) {
        options.rootSpinner.stop()
      }

      const overwrite = await confirm({
        message: chalk.white(
          `The file ${highlighter.info(
            fileName
          )} already exists. Would you like to overwrite?`
        ),
        theme: {
          prefix: chalk.hex("#46caff")("?"),
          style: {
            answer: (text: string) => chalk.white(text),
          },
        },
      })

      if (!overwrite) {
        filesSkipped.push(path.relative(config.resolvedPaths.cwd, filePath))
        if (options.rootSpinner) {
          options.rootSpinner.start()
        }
        continue
      }
      filesCreatedSpinner?.start()
      if (options.rootSpinner) {
        options.rootSpinner.start()
      }
    }

    // Create the target directory if it doesn't exist.
    if (!existsSync(targetDir)) {
      await fs.mkdir(targetDir, { recursive: true })
    }

    await fs.writeFile(filePath, content, "utf-8")
    existingFile
      ? filesUpdated.push(path.relative(config.resolvedPaths.cwd, filePath))
      : filesCreated.push(path.relative(config.resolvedPaths.cwd, filePath))
  }

  const hasUpdatedFiles = filesCreated.length || filesUpdated.length
  if (!hasUpdatedFiles && !filesSkipped.length) {
    filesCreatedSpinner?.info("No files updated.")
  }

  if (filesCreated.length) {
    filesCreatedSpinner?.succeed(
      `Created ${filesCreated.length} ${
        filesCreated.length === 1 ? "file" : "files"
      }:`
    )
    if (!options.silent) {
      for (const file of filesCreated) {
        logger.log(`  - ${file}`)
      }
    }
  } else {
    filesCreatedSpinner?.stop()
  }

  if (filesUpdated.length) {
    spinner(
      `Updated ${filesUpdated.length} ${
        filesUpdated.length === 1 ? "file" : "files"
      }:`,
      {
        silent: options.silent,
      }
    )?.info()
    if (!options.silent) {
      for (const file of filesUpdated) {
        logger.log(`  - ${file}`)
      }
    }
  }

  if (filesSkipped.length) {
    spinner(
      `Skipped ${filesSkipped.length} ${
        filesUpdated.length === 1 ? "file" : "files"
      }: (use --overwrite to overwrite)`,
      {
        silent: options.silent,
      }
    )?.info()
    if (!options.silent) {
      for (const file of filesSkipped) {
        logger.log(`  - ${file}`)
      }
    }
  }

  if (!options.silent) {
    logger.break()
  }

  return {
    filesCreated,
    filesUpdated,
    filesSkipped,
  }
}

export function resolveFileTargetDirectory(
  file: z.infer<typeof registryItemFileSchema>,
  config: Config,
  override?: string
) {
  if (override) {
    return override
  }

  if (file.type === "registry:ui") {
    return config.resolvedPaths.tiptapUi
  }

  if (file.type === "registry:ui-primitive") {
    return config.resolvedPaths.tiptapUiPrimitives
  }

  if (file.type === "registry:extension") {
    return config.resolvedPaths.tiptapExtensions
  }

  if (file.type === "registry:node") {
    return config.resolvedPaths.tiptapNodes
  }

  if (file.type === "registry:icon") {
    return config.resolvedPaths.tiptapIcons
  }

  if (file.type === "registry:hook") {
    return config.resolvedPaths.hooks
  }

  if (file.type === "registry:lib") {
    return config.resolvedPaths.lib
  }

  if (file.type === "registry:context") {
    return config.resolvedPaths.contexts
  }

  if (file.type === "registry:template" || file.type === "registry:component") {
    return config.resolvedPaths.components
  }

  if (file.type === "registry:style") {
    return config.resolvedPaths.styles
  }

  return config.resolvedPaths.components
}

export function findCommonRoot(paths: string[], needle: string): string {
  // Remove leading slashes for consistent handling
  const normalizedPaths = paths.map((p) => p.replace(/^\//, ""))
  const normalizedNeedle = needle.replace(/^\//, "")

  // Get the directory path of the needle by removing the file name
  const needleDir = normalizedNeedle.split("/").slice(0, -1).join("/")

  // If needle is at root level, return empty string
  if (!needleDir) {
    return ""
  }

  // Split the needle directory into segments
  const needleSegments = needleDir.split("/")

  // Start from the full path and work backwards
  for (let i = needleSegments.length; i > 0; i--) {
    const testPath = needleSegments.slice(0, i).join("/")
    // Check if this is a common root by verifying if any other paths start with it
    const hasRelatedPaths = normalizedPaths.some(
      (path) => path !== normalizedNeedle && path.startsWith(testPath + "/")
    )
    if (hasRelatedPaths) {
      return "/" + testPath // Add leading slash back for the result
    }
  }

  // If no common root found with other files, return the parent directory of the needle
  return "/" + needleDir // Add leading slash back for the result
}

export async function getNormalizedFileContent(content: string) {
  return content.replace(/\r\n/g, "\n").trim()
}

export function resolvePageTarget(
  target: string,
  framework?: ProjectInfo["framework"]["name"]
) {
  if (!framework) {
    return ""
  }

  if (framework === "next-app") {
    return target
  }

  if (framework === "next-pages") {
    let result = target.replace(/^app\//, "pages/")
    result = result.replace(/\/page(\.[jt]sx?)$/, "$1")

    return result
  }

  if (framework === "react-router") {
    let result = target.replace(/^app\//, "app/routes/")
    result = result.replace(/\/page(\.[jt]sx?)$/, "$1")

    return result
  }

  if (framework === "laravel") {
    let result = target.replace(/^app\//, "resources/js/pages/")
    result = result.replace(/\/page(\.[jt]sx?)$/, "$1")

    return result
  }

  return ""
}

export function resolveNestedFilePath(
  filePath: string,
  targetDir: string
): string {
  // Normalize paths by removing leading/trailing slashes
  const normalizedFilePath = filePath.replace(/^\/|\/$/g, "")
  const normalizedTargetDir = targetDir.replace(/^\/|\/$/g, "")

  // Split paths into segments
  const fileSegments = normalizedFilePath.split("/")
  const targetSegments = normalizedTargetDir.split("/")

  // Find the last matching segment from targetDir in filePath
  const lastTargetSegment = targetSegments[targetSegments.length - 1]
  const commonDirIndex = fileSegments.findIndex(
    (segment) => segment === lastTargetSegment
  )

  if (commonDirIndex === -1) {
    // Return just the filename if no common directory is found
    return fileSegments[fileSegments.length - 1]
  }

  // Return everything after the common directory
  return fileSegments.slice(commonDirIndex + 1).join("/")
}

export function resolveFilePath(
  file: z.infer<typeof registryItemFileSchema>,
  config: Config,
  options: {
    isSrcDir?: boolean
    commonRoot?: string
    framework?: ProjectInfo["framework"]["name"]
  }
) {
  // if (file.type === "registry:asset") {
  //   if (file.target) {
  //     // replace assets/ and public/ with the public directory
  //     const targetDir = file.target.replace(/^assets\//, "")
  //     const targetDirPublic = targetDir.replace(/^public\//, "")
  //     const targetDirPublicPath = path.join(
  //       config.resolvedPaths.cwd,
  //       "public",
  //       targetDirPublic
  //     )

  //     return targetDirPublicPath
  //   }
  // }

  // Special handling for template files without targets
  if (
    !file.target &&
    file.path.includes("tiptap-templates/") &&
    file.type !== "registry:page"
  ) {
    const match = file.path.match(/tiptap-templates\/([^/]+)\/(.*)/)
    if (match) {
      const [, templateName, relativePath] = match

      // If it's a component file in the components directory, adjust the path
      if (relativePath.startsWith("components/")) {
        const finalPath = relativePath.replace("components/", "")
        return path.join(
          config.resolvedPaths.components,
          "tiptap-templates",
          templateName,
          finalPath
        )
      }

      // For data and other files
      return path.join(
        config.resolvedPaths.components,
        "tiptap-templates",
        templateName,
        relativePath
      )
    }
  }

  // Special handling for data files with targets in templates
  if (
    file.target &&
    file.path.includes("tiptap-templates/") &&
    file.target.includes("/data/")
  ) {
    const templateMatch = file.path.match(/tiptap-templates\/([^/]+)\//)
    if (templateMatch) {
      const templateName = templateMatch[1]
      const dataPath = file.target.split("/data/")[1]
      return path.join(
        config.resolvedPaths.components,
        "tiptap-templates",
        templateName,
        "data",
        dataPath
      )
    }
  }

  // Original logic for files with explicit targets
  if (file.target) {
    if (file.target.startsWith("~/")) {
      return path.join(config.resolvedPaths.cwd, file.target.replace("~/", ""))
    }

    let target = file.target

    if (file.type === "registry:page") {
      target = resolvePageTarget(target, options.framework)
      if (!target) {
        return ""
      }
    }

    return options.isSrcDir
      ? path.join(config.resolvedPaths.cwd, "src", target.replace("src/", ""))
      : path.join(config.resolvedPaths.cwd, target.replace("src/", ""))
  }

  // Original logic for non-template files
  const targetDir = resolveFileTargetDirectory(file, config)
  const relativePath = resolveNestedFilePath(file.path, targetDir)
  return path.join(targetDir, relativePath)
}
