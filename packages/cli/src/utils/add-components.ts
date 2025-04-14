import path from "path"
import {
  configSchema,
  findCommonRoot,
  findPackageRoot,
  getWorkspaceConfig,
  workspaceConfigSchema,
  type Config,
} from "@/src/utils/get-config"
import { handleError } from "@/src/utils/handle-error"
import { logger } from "@/src/utils/logger"
import {
  fetchRegistry,
  getRegistryParentMap,
  getRegistryTypeAliasMap,
  registryResolveItemsTree,
  resolveRegistryItems,
} from "@/src/utils/registry"
import { registryItemSchema } from "@/src/utils/registry/schema"
import { spinner } from "@/src/utils/spinner"
import { updateDependencies } from "@/src/utils/updaters/update-dependencies"
import { updateFiles } from "@/src/utils/updaters/update-files"
import { z } from "zod"
import { colors } from "@/src/utils/colors"
import { updateDevDependencies } from "@/src/utils/updaters/update-dev-dependencies"

export async function addComponents(
  components: string[],
  config: Config,
  options: {
    overwrite?: boolean
    silent?: boolean
    isNewProject?: boolean
  }
) {
  options = {
    overwrite: false,
    silent: false,
    isNewProject: false,
    ...options,
  }

  const workspaceConfig = await getWorkspaceConfig(config)

  if (
    workspaceConfig &&
    workspaceConfig.tiptapUi &&
    workspaceConfig.tiptapUi.resolvedPaths.cwd !== config.resolvedPaths.cwd
  ) {
    return await addWorkspaceComponents(components, config, workspaceConfig, {
      ...options,
    })
  }

  return await addProjectComponents(components, config, options)
}

async function addProjectComponents(
  components: string[],
  config: z.infer<typeof configSchema>,
  options: {
    overwrite?: boolean
    silent?: boolean
    isNewProject?: boolean
  }
) {
  const registrySpinner = spinner(`Checking registry.`, {
    silent: options.silent,
  }).start()
  const tree = await registryResolveItemsTree(components, config)
  if (!tree) {
    registrySpinner?.fail()
    return handleError(new Error("Failed to fetch components from registry."))
  }

  registrySpinner.stopAndPersist({
    symbol: colors.cyan("✔"),
  })

  await updateDependencies(tree.dependencies, config, {
    silent: options.silent,
  })

  await updateDevDependencies(tree.devDependencies, config, {
    silent: options.silent,
  })

  return await updateFiles(tree.files, config, {
    overwrite: options.overwrite,
    silent: options.silent,
  })
}

async function addWorkspaceComponents(
  components: string[],
  config: z.infer<typeof configSchema>,
  workspaceConfig: z.infer<typeof workspaceConfigSchema>,
  options: {
    overwrite?: boolean
    silent?: boolean
    isNewProject?: boolean
  }
) {
  const registrySpinner = spinner(`Checking registry.`, {
    silent: options.silent,
  }).start()
  const registryItems = await resolveRegistryItems(components, config)
  const result = await fetchRegistry(registryItems, config)

  const payload = z.array(registryItemSchema).parse(result)
  if (!payload.length) {
    registrySpinner?.fail()
    return handleError(new Error("Failed to fetch components from registry."))
  }
  registrySpinner.stopAndPersist({
    symbol: colors.cyan("✔"),
  })

  const registryParentMap = getRegistryParentMap(payload)
  const registryTypeAliasMap = getRegistryTypeAliasMap()

  const filesCreated: string[] = []
  const filesUpdated: string[] = []
  const filesSkipped: string[] = []

  const rootSpinner = spinner(`Installing components.`)?.start()

  for (const component of payload) {
    const alias = registryTypeAliasMap.get(component.type)
    const registryParent = registryParentMap.get(component.name)

    // We don't support this type of component.
    if (!alias) {
      continue
    }

    // A good start is ui for now.
    const targetConfig =
      component.type === "registry:ui" || registryParent?.type === "registry:ui"
        ? workspaceConfig.tiptapUi || config
        : config

    if (!targetConfig.resolvedPaths.tiptapUi) {
      continue
    }

    const workspaceRoot = findCommonRoot(
      config.resolvedPaths.cwd,
      targetConfig.resolvedPaths.tiptapUi
    )
    const packageRoot =
      (await findPackageRoot(workspaceRoot, targetConfig.resolvedPaths.cwd)) ??
      targetConfig.resolvedPaths.cwd

    // 3. Update dependencies.
    await updateDependencies(component.dependencies || [], targetConfig, {
      silent: true,
    })

    // 4. Update files.
    const files = await updateFiles(component.files || [], targetConfig, {
      overwrite: options.overwrite,
      silent: true,
      rootSpinner,
    })

    filesCreated.push(
      ...files.filesCreated.map((file) =>
        path.relative(workspaceRoot, path.join(packageRoot, file))
      )
    )
    filesUpdated.push(
      ...files.filesUpdated.map((file) =>
        path.relative(workspaceRoot, path.join(packageRoot, file))
      )
    )
    filesSkipped.push(
      ...files.filesSkipped.map((file) =>
        path.relative(workspaceRoot, path.join(packageRoot, file))
      )
    )
  }

  rootSpinner.stopAndPersist({
    symbol: colors.cyan("✔"),
  })

  // Sort files.
  filesCreated.sort()
  filesUpdated.sort()
  filesSkipped.sort()

  const hasUpdatedFiles = filesCreated.length || filesUpdated.length
  if (!hasUpdatedFiles && !filesSkipped.length) {
    spinner(`No files updated.`, {
      silent: options.silent,
    })?.info()
  }

  if (filesCreated.length) {
    spinner(
      `Created ${filesCreated.length} ${
        filesCreated.length === 1 ? "file" : "files"
      }:`,
      {
        silent: options.silent,
      }
    )?.stopAndPersist({
      symbol: colors.cyan("✔"),
    })
    for (const file of filesCreated) {
      logger.log(`  - ${file}`)
    }
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
    for (const file of filesUpdated) {
      logger.log(`  - ${file}`)
    }
  }

  if (filesSkipped.length) {
    spinner(
      `Skipped ${filesSkipped.length} ${
        filesSkipped.length === 1 ? "file" : "files"
      }: (use --overwrite to overwrite)`,
      {
        silent: options.silent,
      }
    )?.info()
    for (const file of filesSkipped) {
      logger.log(`  - ${file}`)
    }
  }

  return {
    filesCreated,
    filesUpdated,
    filesSkipped,
  }
}
