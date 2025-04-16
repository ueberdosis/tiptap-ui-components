import { colors } from "@/src/utils/colors"

export const logger = {
  error(...args: unknown[]) {
    console.log(colors.red(args.join(" ")))
  },
  warn(...args: unknown[]) {
    console.log(colors.yellow(args.join(" ")))
  },
  info(...args: unknown[]) {
    console.log(colors.blue(args.join(" ")))
  },
  success(...args: unknown[]) {
    console.log(colors.green(args.join(" ")))
  },
  log(...args: unknown[]) {
    console.log(args.join(" "))
  },
  break() {
    console.log("")
  },
}
