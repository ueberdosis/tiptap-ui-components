import path from "path"
import { addOptionsSchema } from "@/src/commands/add"
import * as ERRORS from "@/src/utils/errors"
import { getConfig } from "@/src/utils/get-config"
import { highlighter } from "@/src/utils/highlighter"
import { logger } from "@/src/utils/logger"
import fs from "fs-extra"
import { z } from "zod"

export async function preFlightAdd(options: z.infer<typeof addOptionsSchema>) {
  const errors: Record<string, boolean> = {}

  if (
    !fs.existsSync(options.cwd) ||
    !fs.existsSync(path.resolve(options.cwd, "package.json"))
  ) {
    errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT] = true
    return {
      errors,
      config: null,
    }
  }

  try {
    const config = await getConfig(options.cwd)

    return {
      errors,
      config: config!,
    }
  } catch (error) {
    console.log("[preFlightAdd] - ", error)

    logger.break()
    logger.error(
      `An invalid ${highlighter.info(
        "components.json"
      )} file was found at ${highlighter.info(
        options.cwd
      )}.\nBefore you can add components, you must create a valid ${highlighter.info(
        "components.json"
      )} file by running the ${highlighter.info("init")} command.`
    )
    logger.error(`Learn more at ${highlighter.info("link-here")}.`)
    logger.break()
    process.exit(0)
  }
}
