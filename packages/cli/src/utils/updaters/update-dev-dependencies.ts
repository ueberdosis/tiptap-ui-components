import { Config } from "@/src/utils/get-config"
import { getPackageManager } from "@/src/utils/get-package-manager"
import { RegistryItem } from "@/src/utils/registry/schema"
import { spinner } from "@/src/utils/spinner"
import { execa } from "execa"
import { colors } from "@/src/utils/colors"

/**
 * Installs development dependencies for a component
 *
 * @param devDependencies List of development dependencies to install
 * @param config Configuration object with project paths
 * @param options Additional options
 */
export async function updateDevDependencies(
  devDependencies: RegistryItem["devDependencies"],
  config: Config,
  options: {
    silent?: boolean
  }
) {
  devDependencies = Array.from(new Set(devDependencies))
  if (!devDependencies?.length) {
    return
  }

  options = {
    silent: false,
    ...options,
  }

  const devDependenciesSpinner = spinner(
    `Installing development dependencies.`,
    {
      silent: options.silent,
    }
  )?.start()
  const packageManager = await getPackageManager(config.resolvedPaths.cwd)

  devDependenciesSpinner?.start()

  // Different package managers have different flags for dev dependencies
  const devFlag = packageManager === "npm" ? "--save-dev" : "-D"

  await execa(
    packageManager,
    [packageManager === "npm" ? "install" : "add", devFlag, ...devDependencies],
    {
      cwd: config.resolvedPaths.cwd,
    }
  )

  devDependenciesSpinner?.stopAndPersist({
    symbol: colors.cyan("✔"),
  })
}
