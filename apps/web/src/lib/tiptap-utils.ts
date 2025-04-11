import { Selection } from "@tiptap/pm/state"
import {
  JSONContent,
  Editor,
  isTextSelection,
  isNodeSelection,
  posToDOMRect,
} from "@tiptap/react"

export const COLLAB_DOC_PREFIX =
  import.meta.env.NEXT_PUBLIC_COLLAB_DOC_PREFIX || ""
export const TIPTAP_COLLAB_APP_ID =
  import.meta.env.NEXT_PUBLIC_TIPTAP_COLLAB_APP_ID || ""
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export type OverflowPosition = "none" | "top" | "bottom" | "both"

/**
 * Utility function to get URL parameters
 */
export const getUrlParam = (param: string): string | null => {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  return params.get(param)
}

/**
 * Checks if a mark exists in the editor schema
 *
 * @param markName - The name of the mark to check
 * @param editor - The editor instance
 */
export const isMarkInSchema = (markName: string, editor: Editor | null) =>
  editor?.schema.spec.marks.get(markName) !== undefined

/**
 * Checks if a node exists in the editor schema
 *
 * @param nodeName - The name of the node to check
 * @param editor - The editor instance
 */
export const isNodeInSchema = (nodeName: string, editor: Editor | null) =>
  editor?.schema.spec.nodes.get(nodeName) !== undefined

/**
 * Removes empty paragraph nodes from content
 *
 * @param content - The JSON content to clean
 */
export const removeEmptyParagraphs = (content: JSONContent) => ({
  ...content,
  content: content.content?.filter(
    (node) =>
      node.type !== "paragraph" ||
      node.content?.some((child) => child.text?.trim() || child.type !== "text")
  ),
})

/**
 * Determines how a target element overflows relative to a container element
 *
 * @param targetElement - The element being checked for overflow
 * @param containerElement - The container element that might be overflowed
 */
export function getElementOverflowPosition(
  targetElement: Element,
  containerElement: HTMLElement
): OverflowPosition {
  const targetBounds = targetElement.getBoundingClientRect()
  const containerBounds = containerElement.getBoundingClientRect()

  const isOverflowingTop = targetBounds.top < containerBounds.top
  const isOverflowingBottom = targetBounds.bottom > containerBounds.bottom

  if (isOverflowingTop && isOverflowingBottom) return "both"
  if (isOverflowingTop) return "top"
  if (isOverflowingBottom) return "bottom"
  return "none"
}

/**
 * Checks if the current selection is valid for a given editor
 *
 * @param editor - The editor instance
 * @param selection - The current selection
 * @param excludedNodeTypes - An array of node types to exclude from the selection check
 */
export const isSelectionValid = (
  editor: Editor | null,
  selection?: Selection,
  excludedNodeTypes: string[] = ["imageUpload"]
): boolean => {
  if (!editor) return false
  if (!selection) selection = editor.state.selection

  const { state } = editor
  const { doc } = state
  const { empty, from, to } = selection

  const isEmptyTextBlock =
    !doc.textBetween(from, to).length && isTextSelection(selection)
  const isCodeBlock =
    selection.$from.parent.type.spec.code ||
    (isNodeSelection(selection) && selection.node.type.spec.code)
  const isExcludedNode =
    isNodeSelection(selection) &&
    excludedNodeTypes.includes(selection.node.type.name)

  return !empty && !isEmptyTextBlock && !isCodeBlock && !isExcludedNode
}

/**
 * Gets the bounding rect of the current selection in the editor.
 *
 * @param editor - The editor instance
 */
export const getSelectionBoundingRect = (editor: Editor): DOMRect | null => {
  const { state } = editor.view
  const { selection } = state
  const { ranges } = selection

  const from = Math.min(...ranges.map((range) => range.$from.pos))
  const to = Math.max(...ranges.map((range) => range.$to.pos))

  if (isNodeSelection(selection)) {
    const node = editor.view.nodeDOM(from) as HTMLElement
    if (node) {
      return node.getBoundingClientRect()
    }
  }

  return posToDOMRect(editor.view, from, to)
}

/**
 * Generates a deterministic avatar URL from a user name
 */
export const getAvatar = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }

  const randomFraction = (Math.abs(hash) % 1000000) / 1000000
  const id = 1 + Math.floor(randomFraction * 20)

  const idString = id.toString().padStart(2, "0")

  return `/avatars/memoji_${idString}.png`
}

/**
 * Handles image upload with progress tracking and abort capability
 */
export const handleImageUpload = async (
  _file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  // Simulate upload progress
  for (let progress = 0; progress <= 100; progress += 10) {
    if (abortSignal?.aborted) {
      throw new Error("Upload cancelled")
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
    onProgress?.({ progress })
  }

  return "/images/placeholder-image.png"

  // Uncomment to use actual file conversion:
  // return convertFileToBase64(file, abortSignal)
}

/**
 * Converts a File to base64 string
 */
export const convertFileToBase64 = (
  file: File,
  abortSignal?: AbortSignal
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    const abortHandler = () => {
      reader.abort()
      reject(new Error("Upload cancelled"))
    }

    if (abortSignal) {
      abortSignal.addEventListener("abort", abortHandler)
    }

    reader.onloadend = () => {
      if (abortSignal) {
        abortSignal.removeEventListener("abort", abortHandler)
      }

      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to convert File to base64"))
      }
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Fetch collaboration token from the API
 */
export const fetchCollabToken = async (): Promise<string | null> => {
  try {
    const response = await fetch(`/api/collaboration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.status}`)
    }

    const data = await response.json()
    return data.token
  } catch (error) {
    console.error("Failed to fetch collaboration token:", error)
    return null
  }
}
