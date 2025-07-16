import * as React from "react"
import { useCurrentEditor } from "@tiptap/react"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { MermaidIcon } from "@/components/tiptap-icons/mermaid-icon"

export interface MermaidButtonProps {
  text?: string
  disabled?: boolean
  onClick?: () => void
}

export const MermaidButton = React.memo(
  ({ text, disabled, onClick }: MermaidButtonProps) => {
    const { editor } = useCurrentEditor()

    const handleClick = React.useCallback(() => {
      if (onClick) {
        onClick()
        return
      }

      if (!editor) return

      const defaultCode = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Fix it]
    D --> B`

      editor.chain().focus().setMermaid({ code: defaultCode }).run()
    }, [editor, onClick])

    return (
      <Button
        data-style="ghost"
        disabled={disabled || !editor}
        onClick={handleClick}
        aria-label="Insert Mermaid diagram"
      >
        <MermaidIcon className="tiptap-button-icon" />
        {text && <span>{text}</span>}
      </Button>
    )
  }
)

MermaidButton.displayName = "MermaidButton"