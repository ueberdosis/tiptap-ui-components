import { Transformer } from "@/src/utils/transformers"
import { getProjectInfo } from "@/src/utils/get-project-info"

export const transformEnvVars: Transformer = async ({ sourceFile, config }) => {
  // First check if this is a Vite project
  const projectInfo = await getProjectInfo(config.resolvedPaths.cwd)

  if (projectInfo?.framework.name === "vite") {
    // Replace process.env with import.meta.env
    // This is a simple replacement method - for more complex cases you might
    // want to use ts-morph's API to modify specific nodes
    let fileContent = sourceFile.getFullText()

    // Replace process.env.NEXT_PUBLIC_X with import.meta.env.VITE_X
    fileContent = fileContent.replace(
      /process\.env\.NEXT_PUBLIC_([A-Za-z0-9_]+)/g,
      "import.meta.env.VITE_$1"
    )

    // Replace other process.env.X with import.meta.env.X
    fileContent = fileContent.replace(
      /process\.env\.([A-Za-z0-9_]+)/g,
      "import.meta.env.$1"
    )

    // Update the source file content
    sourceFile.replaceWithText(fileContent)
  }

  return sourceFile
}
