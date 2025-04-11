import path from "path"
import { initOptionsSchema } from "@/src/commands/init"
import * as ERRORS from "@/src/utils/errors"
import { getProjectInfo } from "@/src/utils/get-project-info"
import { highlighter } from "@/src/utils/highlighter"
import { logger } from "@/src/utils/logger"
import { spinner } from "@/src/utils/spinner"
import fs from "fs-extra"
import { z } from "zod"

export async function preFlightInit(
  options: z.infer<typeof initOptionsSchema>
) {
  const errors: Record<string, boolean> = {}

  // Ensure target directory exists.
  // Check for empty project. We assume if no package.json exists, the project is empty.
  if (
    !fs.existsSync(options.cwd) ||
    !fs.existsSync(path.resolve(options.cwd, "package.json"))
  ) {
    errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT] = true
    return {
      errors,
      projectInfo: null,
    }
  }

  const frameworkSpinner = spinner(`Verifying framework.`, {
    silent: options.silent,
  }).start()
  const projectInfo = await getProjectInfo(options.cwd)
  if (!projectInfo || projectInfo?.framework.name === "manual") {
    errors[ERRORS.UNSUPPORTED_FRAMEWORK] = true
    frameworkSpinner?.fail()
    logger.break()
    if (projectInfo?.framework.links.installation) {
      logger.error(
        `We could not detect a supported framework at ${highlighter.info(
          options.cwd
        )}.\n` +
          `Visit ${highlighter.info(
            projectInfo?.framework.links.installation
          )} to manually configure your project.\nOnce configured, you can use the cli to add components.`
      )
    }
    logger.break()
    process.exit(0)
  }
  frameworkSpinner?.succeed(
    `Verifying framework. Found ${highlighter.info(
      projectInfo.framework.label
    )}.`
  )

  const tsConfigSpinner = spinner(`Validating import alias.`, {
    silent: options.silent,
  }).start()
  if (!projectInfo?.aliasPrefix) {
    errors[ERRORS.IMPORT_ALIAS_MISSING] = true
    tsConfigSpinner?.fail()
  } else {
    tsConfigSpinner?.succeed()
  }

  if (Object.keys(errors).length > 0) {
    if (errors[ERRORS.IMPORT_ALIAS_MISSING]) {
      logger.break()
      logger.error(`No import alias found in your tsconfig.json file.`)
      if (projectInfo?.framework.links.installation) {
        logger.error(
          `Visit ${highlighter.info(
            projectInfo?.framework.links.installation
          )} to learn how to set an import alias.`
        )
      }
    }

    logger.break()
    process.exit(0)
  }

  return {
    errors,
    projectInfo,
  }
}
