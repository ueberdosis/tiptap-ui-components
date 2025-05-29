import * as React from "react"
import { isNodeSelection, type Editor } from "@tiptap/react"
import type { Node } from "@tiptap/pm/model"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { BlockQuoteIcon } from "@/components/tiptap-icons/block-quote-icon"

// --- Lib ---
import { isNodeInSchema, findNodePosition } from "@/lib/tiptap-utils"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface BlockquoteButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * The TipTap editor instance.
   */
  editor?: Editor | null
  /**
   * The node to apply blockquote transformation to
   */
  node?: Node | null
  /**
   * The position of the node in the document
   */
  nodePos?: number | null
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
  /**
   * Whether the button should hide when the node is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
}

export function canToggleBlockquote(editor: Editor | null): boolean {
  if (!editor) return false

  try {
    return editor.can().toggleWrap("blockquote")
  } catch {
    return false
  }
}

export function isBlockquoteActive(
  editor: Editor | null,
  node?: Node | null
): boolean {
  if (!editor) return false

  if (node !== undefined && node !== null) {
    return false
  }

  return editor.isActive("blockquote")
}

export function toggleBlockquote(
  editor: Editor | null,
  node?: Node | null,
  nodePos?: number | null
): boolean {
  if (!editor) return false

  let chain = editor.chain().focus()

  if (node || nodePos !== undefined) {
    let pos: number | null = null

    if (nodePos !== undefined && nodePos !== null && nodePos >= 0) {
      pos = nodePos
    } else if (node) {
      const foundPos = findNodePosition({ editor, node })
      pos = foundPos?.pos ?? null
    }

    if (pos === null) return false

    chain = chain.setNodeSelection(pos)
  }

  chain = chain.clearNodes()

  return chain.toggleWrap("blockquote").run()
}

export function shouldShowBlockquoteButton(params: {
  editor: Editor | null
  hideWhenUnavailable: boolean
  nodeInSchema: boolean
  canToggle: boolean
}): boolean {
  const { editor, hideWhenUnavailable, nodeInSchema, canToggle } = params

  if (!nodeInSchema || !editor) {
    return false
  }

  if (hideWhenUnavailable) {
    if (isNodeSelection(editor.state.selection) || !canToggle) {
      return false
    }
  }

  return Boolean(editor?.isEditable)
}

export function useBlockquoteState(
  editor: Editor | null,
  node?: Node | null,
  hideWhenUnavailable: boolean = false
) {
  const nodeInSchema = isNodeInSchema("blockquote", editor)
  const [show, setShow] = React.useState(false)

  const canToggle = canToggleBlockquote(editor)
  const isActive = isBlockquoteActive(editor, node)

  React.useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      if (node !== undefined && node !== null) {
        setShow(true)
        return
      }

      setShow(
        shouldShowBlockquoteButton({
          editor,
          hideWhenUnavailable,
          nodeInSchema,
          canToggle,
        })
      )
    }

    handleSelectionUpdate()

    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [canToggle, editor, hideWhenUnavailable, node, nodeInSchema])

  const shortcutKey = "Ctrl-Shift-b"
  const label = "Blockquote"

  return {
    nodeInSchema,
    canToggle,
    isActive,
    show,
    shortcutKey,
    label,
  }
}

export const BlockquoteButton = React.forwardRef<
  HTMLButtonElement,
  BlockquoteButtonProps
>(
  (
    {
      editor: providedEditor,
      node,
      nodePos,
      text,
      hideWhenUnavailable = false,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const editor = useTiptapEditor(providedEditor)

    const { isActive, show, shortcutKey, label } = useBlockquoteState(
      editor,
      node,
      hideWhenUnavailable
    )

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)

        if (!e.defaultPrevented) {
          toggleBlockquote(editor, node, nodePos)
        }
      },
      [editor, node, nodePos, onClick]
    )

    if (!show || !editor || !editor.isEditable) {
      return null
    }

    return (
      <Button
        type="button"
        data-style="ghost"
        data-active-state={isActive ? "on" : "off"}
        role="button"
        tabIndex={-1}
        aria-label="Blockquote"
        aria-pressed={isActive}
        tooltip={label}
        shortcutKeys={shortcutKey}
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children || (
          <>
            <BlockQuoteIcon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
          </>
        )}
      </Button>
    )
  }
)

BlockquoteButton.displayName = "BlockquoteButton"

export default BlockquoteButton
