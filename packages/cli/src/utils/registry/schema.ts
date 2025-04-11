import { z } from "zod"

export const registryItemTypeSchema = z.enum([
  "registry:context",
  "registry:extension",
  "registry:hook",
  "registry:icon",
  "registry:lib",
  "registry:node",
  "registry:template",
  "registry:ui-primitive",
  "registry:ui",
  "registry:page",
  "registry:component",
  "registry:style",
  "registry:asset",
])

// TODO: next release
// export const planSchema = z
//   .enum(["free", "start", "plus", "growth", "enterprise"])
//   .default("free")

export const planSchema = z.enum(["free", "paid"]).default("free")

export const registryItemFileSchema = z.object({
  path: z.string(),
  content: z.string().optional(),
  type: registryItemTypeSchema,
  target: z.string().optional(),
})

export const registryItemSchema = z.object({
  name: z.string(),
  type: registryItemTypeSchema,
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  devDependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z.array(registryItemFileSchema).optional(),
  meta: z.record(z.string(), z.any()).optional(),
  plan: planSchema.optional(),
  hidden: z.boolean().default(true),
})

export const registrySchema = z.array(registryItemSchema)

export type Registry = z.infer<typeof registrySchema>

export const registryIndexSchema = z.array(
  registryItemSchema.extend({
    files: z.array(z.union([z.string(), registryItemFileSchema])).optional(),
  })
)

export const registryResolvedItemsTreeSchema = registryItemSchema.pick({
  dependencies: true,
  devDependencies: true,
  files: true,
})

export type RegistryItem = z.infer<typeof registryItemSchema>
export type RegistryItemIndexSchema = z.infer<typeof registryIndexSchema>
