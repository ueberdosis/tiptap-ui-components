import path from "path"
import { addOptionsSchema } from "@/src/commands/add"
import * as ERRORS from "@/src/utils/errors"
import { getConfig } from "@/src/utils/get-config"
import { logger } from "@/src/utils/logger"
import fs from "fs-extra"
import { z } from "zod"
import { colors } from "@/src/utils/colors"

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
      `An invalid ${colors.blue(
        "components.json"
      )} file was found at ${colors.blue(
        options.cwd
      )}.\nBefore you can add components, you must create a valid ${colors.blue(
        "components.json"
      )} file by running the ${colors.blue("init")} command.`
    )
    logger.error(`Learn more at ${colors.blue("link-here")}.`)
    logger.break()
    process.exit(0)
  }
}
