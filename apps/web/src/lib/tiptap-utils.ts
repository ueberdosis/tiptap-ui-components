import type { Attrs, Node as TiptapNode } from "@tiptap/pm/model"
import { NodeSelection, TextSelection } from "@tiptap/pm/state"
import type { Editor } from "@tiptap/react"

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const MAC_SYMBOLS: Record<string, string> = {
  ctrl: "⌘",
  alt: "⌥",
  shift: "⇧",
} as const

/**
 * Determines if the current platform is macOS
 * @returns boolean indicating if the current platform is Mac
 */
export function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  )
}

/**
 * Formats a shortcut key based on the platform (Mac or non-Mac)
 * @param key - The key to format
 * @param isMac - Boolean indicating if the platform is Mac
 * @returns A properly formatted shortcut key for the current platform
 */
export const formatShortcutKey = (key: string, isMac: boolean) => {
  if (isMac) {
    const lowerKey = key.toLowerCase()
    return MAC_SYMBOLS[lowerKey] || key.toUpperCase()
  }
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * Parses a shortcut key string into an array of formatted key symbols
 * @param shortcutKeys - A string of shortcut keys
 * @param delimiter - The delimiter to split keys by (default: "-")
 * @returns An array of formatted shortcut key symbols
 */
export const parseShortcutKeys = (
  shortcutKeys: string | undefined,
  delimiter: string = "-"
) => {
  if (!shortcutKeys) return []

  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac()))
}

/**
 * Checks if a mark exists in the editor schema
 * @param markName - The name of the mark to check
 * @param editor - The editor instance
 * @returns boolean indicating if the mark exists in the schema
 */
export const isMarkInSchema = (
  markName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) return false
  return editor.schema.spec.marks.get(markName) !== undefined
}

/**
 * Checks if a node exists in the editor schema
 * @param nodeName - The name of the node to check
 * @param editor - The editor instance
 * @returns boolean indicating if the node exists in the schema
 */
export const isNodeInSchema = (
  nodeName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) return false
  return editor.schema.spec.nodes.get(nodeName) !== undefined
}

/**
 * Gets the active attributes of a specific mark in the current editor selection.
 *
 * @param editor - The Tiptap editor instance.
 * @param markName - The name of the mark to look for (e.g., "highlight", "link").
 * @returns The attributes of the active mark, or `null` if the mark is not active.
 */
export function getActiveMarkAttrs(
  editor: Editor | null,
  markName: string
): Attrs | null {
  if (!editor) return null
  const { state } = editor
  const marks = state.storedMarks || state.selection.$from.marks()
  const mark = marks.find((mark) => mark.type.name === markName)

  return mark?.attrs ?? null
}

/**
 * Checks if a node is empty
 */
export function isEmptyNode(node?: TiptapNode | null): boolean {
  return !!node && node.content.size === 0
}

/**
 * Utility function to conditionally join class names into a single string.
 * Filters out falsey values like false, undefined, null, and empty strings.
 *
 * @param classes - List of class name strings or falsey values.
 * @returns A single space-separated string of valid class names.
 */
export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ")
}

/**
 * Finds the position and instance of a node in the document
 * @param props Object containing editor, node (optional), and nodePos (optional)
 * @param props.editor The TipTap editor instance
 * @param props.node The node to find (optional if nodePos is provided)
 * @param props.nodePos The position of the node to find (optional if node is provided)
 * @returns An object with the position and node, or null if not found
 */
export function findNodePosition(props: {
  editor: Editor | null
  node?: TiptapNode | null
  nodePos?: number | null
}): { pos: number; node: TiptapNode } | null {
  const { editor, node, nodePos } = props

  if (!editor || !editor.state?.doc) return null

  // Zero is valid position
  const hasValidNode = node !== undefined && node !== null
  const hasValidPos = nodePos !== undefined && nodePos !== null && nodePos >= 0

  if (!hasValidNode && !hasValidPos) {
    return null
  }

  // Otherwise search for the node in the document
  let foundPos = -1
  let foundNode: TiptapNode | null = null

  editor.state.doc.descendants((currentNode, pos) => {
    // TODO: Needed?
    // if (currentNode.type && currentNode.type.name === node!.type.name) {
    if (currentNode === node) {
      foundPos = pos
      foundNode = currentNode
      return false
    }
    return true
  })

  if (hasValidPos) {
    try {
      const nodeAtPos = editor.state.doc.nodeAt(nodePos!)
      if (nodeAtPos) {
        return { pos: nodePos!, node: nodeAtPos }
      }
    } catch (error) {
      console.error("Error checking node at position:", error)
      return null
    }
  }

  return foundPos !== -1 && foundNode !== null
    ? { pos: foundPos, node: foundNode }
    : null
}

/**
 * Gets the currently selected DOM element in the editor
 * @param editor The TipTap editor instance
 * @returns The selected DOM element or null if no selection is present
 */
export function getSelectedDOMElement(editor: Editor): HTMLElement | null {
  const { state, view } = editor
  const { selection } = state

  if (selection instanceof NodeSelection) {
    return view.nodeDOM(selection.from) as HTMLElement
  }

  if (selection instanceof TextSelection) {
    const { node } = view.domAtPos(selection.from)
    return node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : (node as HTMLElement)
  }

  return null
}

/**
 * Finds the position of a node in the editor selection
 * @param params Object containing editor, node (optional), and nodePos (optional)
 * @returns The position of the node in the selection or null if not found
 */
export function findSelectionPosition(params: {
  editor: Editor
  node?: TiptapNode | null
  nodePos?: number | null
}): number | null {
  const { editor, node, nodePos } = params

  if (nodePos != null && nodePos >= 0) return nodePos

  if (node) {
    const found = findNodePosition({ editor, node })
    if (found) return found.pos
  }

  const { selection } = editor.state
  if (!selection.empty) return null

  const resolvedPos = selection.$anchor
  const nodeDepth = 1
  const selectedNode = resolvedPos.node(nodeDepth)

  return selectedNode ? resolvedPos.before(nodeDepth) : null
}

/**
 * Handles image upload with progress tracking and abort capability
 * @param file The file to upload
 * @param onProgress Optional callback for tracking upload progress
 * @param abortSignal Optional AbortSignal for cancelling the upload
 * @returns Promise resolving to the URL of the uploaded image
 */
export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  // Validate file
  if (!file) {
    throw new Error("No file provided")
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
    )
  }

  // For demo/testing: Simulate upload progress
  for (let progress = 0; progress <= 100; progress += 10) {
    if (abortSignal?.aborted) {
      throw new Error("Upload cancelled")
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
    onProgress?.({ progress })
  }

  return "/images/placeholder-image.png"

  // Uncomment for production use:
  // return convertFileToBase64(file, abortSignal);
}

/**
 * Converts a File to base64 string
 * @param file The file to convert
 * @param abortSignal Optional AbortSignal for cancelling the conversion
 * @returns Promise resolving to the base64 representation of the file
 */
export const convertFileToBase64 = (
  file: File,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (!file) {
    return Promise.reject(new Error("No file provided"))
  }

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

    reader.onerror = (error) =>
      reject(new Error(`File reading error: ${error}`))
    reader.readAsDataURL(file)
  })
}
