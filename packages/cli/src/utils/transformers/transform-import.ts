import { Config } from "@/src/utils/get-config"
import { Transformer } from "@/src/utils/transformers"

export const transformImport: Transformer = async ({ sourceFile, config }) => {
  const importDeclarations = sourceFile.getImportDeclarations()

  for (const importDeclaration of importDeclarations) {
    const moduleSpecifier = updateImportAliases(
      importDeclaration.getModuleSpecifierValue(),
      config
    )

    if (moduleSpecifier) {
      importDeclaration.setModuleSpecifier(moduleSpecifier)
    }
  }

  return sourceFile
}

function updateImportAliases(moduleSpecifier: string, config: Config): string {
  // Remove "/registry/" from the module specifier
  if (!moduleSpecifier.startsWith("@/registry/")) {
    // We fix the alias and return.
    const alias = config.aliases.components.split("/")[0]
    return moduleSpecifier.replace(/^@\//, `${alias}/`)
  }

  // Handle template imports specifically to preserve the template structure
  if (
    moduleSpecifier.match(
      /@\/registry\/tiptap-templates\/([^/]+)\/components\//
    )
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/tiptap-templates\/([^/]+)\/components\//,
      `${config.aliases.components}/tiptap-templates/$1/`
    )
  }

  // Handle template imports without the components part
  if (
    moduleSpecifier.match(
      /@\/registry\/tiptap-templates\/([^/]+)\/(?!components\/)/
    )
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/tiptap-templates\/([^/]+)\//,
      `${config.aliases.components}/tiptap-templates/$1/`
    )
  }

  if (
    config.aliases.components &&
    moduleSpecifier.match(/@\/registry\/components/)
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/components/,
      config.aliases.components
    )
  }

  if (
    config.aliases.contexts &&
    moduleSpecifier.match(/@\/registry\/contexts/)
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/contexts/,
      config.aliases.contexts
    )
  }

  if (
    config.aliases.tiptapExtensions &&
    moduleSpecifier.match(/@\/registry\/tiptap-extension/)
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/tiptap-extension/,
      config.aliases.tiptapExtensions
    )
  }

  if (config.aliases.hooks && moduleSpecifier.match(/@\/registry\/hooks/)) {
    return moduleSpecifier.replace(/@\/registry\/hooks/, config.aliases.hooks)
  }

  if (
    config.aliases.tiptapIcons &&
    moduleSpecifier.match(/@\/registry\/tiptap-icons/)
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/tiptap-icons/,
      config.aliases.tiptapIcons
    )
  }

  if (config.aliases.lib && moduleSpecifier.match(/@\/registry\/lib/)) {
    return moduleSpecifier.replace(/@\/registry\/lib/, config.aliases.lib)
  }

  if (
    config.aliases.tiptapNodes &&
    moduleSpecifier.match(/@\/registry\/tiptap-node/)
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/tiptap-node/,
      config.aliases.tiptapNodes
    )
  }

  if (
    config.aliases.tiptapUiPrimitives &&
    moduleSpecifier.match(/@\/registry\/tiptap-ui-primitive/)
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/tiptap-ui-primitive/,
      config.aliases.tiptapUiPrimitives
    )
  }

  if (
    config.aliases.tiptapUi &&
    moduleSpecifier.match(/@\/registry\/tiptap-ui/)
  ) {
    return moduleSpecifier.replace(
      /@\/registry\/tiptap-ui/,
      config.aliases.tiptapUi
    )
  }

  if (config.aliases.styles && moduleSpecifier.match(/@\/registry\/styles/)) {
    return moduleSpecifier.replace(/@\/registry\/styles/, config.aliases.styles)
  }

  // Default case - preserve all other imports
  return moduleSpecifier.replace(
    /^@\/registry\/[^/]+(?:\/.*\/)?/,
    config.aliases.components + "/"
  )
}
