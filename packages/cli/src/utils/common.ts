/**
 * Converts kebab-case or snake_case to Title Case
 */
export function toReadableName(input: string): string {
  return input
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
