import * as React from "react"
import { isNodeSelection, type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { CodeBlockIcon } from "@/components/tiptap-icons/code-block-icon"

// --- Lib ---
import { isNodeInSchema } from "@/lib/tiptap-utils"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface CodeMirrorBlockButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * The TipTap editor instance.
   */
  editor?: Editor | null
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

export function canInsertCodeMirrorBlock(editor: Editor | null): boolean {
  if (!editor) return false

  try {
    return editor.can().insertContent({ type: "codeMirrorBlock" })
  } catch {
    return false
  }
}

export function isCodeMirrorBlockActive(editor: Editor | null): boolean {
  if (!editor) return false
  return editor.isActive("codeMirrorBlock")
}

export function insertCodeMirrorBlock(editor: Editor | null): boolean {
  if (!editor) return false
  return editor.chain().focus().insertCodeMirrorBlock().run()
}

export function isCodeMirrorBlockButtonDisabled(
  editor: Editor | null,
  canInsert: boolean,
  userDisabled: boolean = false
): boolean {
  if (!editor) return true
  if (userDisabled) return true
  if (!canInsert) return true
  return false
}

export function shouldShowCodeMirrorBlockButton(params: {
  editor: Editor | null
  hideWhenUnavailable: boolean
  nodeInSchema: boolean
  canInsert: boolean
}): boolean {
  const { editor, hideWhenUnavailable, nodeInSchema, canInsert } = params

  if (!nodeInSchema || !editor) {
    return false
  }

  if (hideWhenUnavailable) {
    if (isNodeSelection(editor.state.selection) || !canInsert) {
      return false
    }
  }

  return Boolean(editor?.isEditable)
}

export function useCodeMirrorBlockState(
  editor: Editor | null,
  disabled: boolean = false,
  hideWhenUnavailable: boolean = false
) {
  const nodeInSchema = isNodeInSchema("codeMirrorBlock", editor)

  const canInsert = canInsertCodeMirrorBlock(editor)
  const isDisabled = isCodeMirrorBlockButtonDisabled(editor, canInsert, disabled)
  const isActive = isCodeMirrorBlockActive(editor)

  const shouldShow = React.useMemo(
    () =>
      shouldShowCodeMirrorBlockButton({
        editor,
        hideWhenUnavailable,
        nodeInSchema,
        canInsert,
      }),
    [editor, hideWhenUnavailable, nodeInSchema, canInsert]
  )

  const handleInsert = React.useCallback(() => {
    if (!isDisabled && editor) {
      return insertCodeMirrorBlock(editor)
    }
    return false
  }, [editor, isDisabled])

  const shortcutKey = "Ctrl-Alt-c"
  const label = "CodeMirror Block"

  return {
    nodeInSchema,
    canInsert,
    isDisabled,
    isActive,
    shouldShow,
    handleInsert,
    shortcutKey,
    label,
  }
}

export const CodeMirrorBlockButton = React.forwardRef<
  HTMLButtonElement,
  CodeMirrorBlockButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      hideWhenUnavailable = false,
      className = "",
      disabled,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const editor = useTiptapEditor(providedEditor)

    const {
      isDisabled,
      isActive,
      shouldShow,
      handleInsert,
      shortcutKey,
      label,
    } = useCodeMirrorBlockState(editor, disabled, hideWhenUnavailable)

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)

        if (!e.defaultPrevented && !isDisabled) {
          handleInsert()
        }
      },
      [onClick, isDisabled, handleInsert]
    )

    if (!shouldShow || !editor || !editor.isEditable) {
      return null
    }

    return (
      <Button
        type="button"
        className={className.trim()}
        disabled={isDisabled}
        data-style="ghost"
        data-active-state={isActive ? "on" : "off"}
        data-disabled={isDisabled}
        role="button"
        tabIndex={-1}
        aria-label="codeMirrorBlock"
        aria-pressed={isActive}
        tooltip={label}
        shortcutKeys={shortcutKey}
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children || (
          <>
            <CodeBlockIcon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
          </>
        )}
      </Button>
    )
  }
)

CodeMirrorBlockButton.displayName = "CodeMirrorBlockButton"

export default CodeMirrorBlockButton