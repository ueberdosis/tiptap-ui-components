import * as React from "react"
import { useCurrentEditor } from "@tiptap/react"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { VegaLiteIcon } from "@/components/tiptap-icons/vega-lite-icon"

export interface VegaLiteButtonProps {
  text?: string
  disabled?: boolean
  onClick?: () => void
}

export const VegaLiteButton = React.memo(
  ({ text, disabled, onClick }: VegaLiteButtonProps) => {
    const { editor } = useCurrentEditor()

    const handleClick = React.useCallback(() => {
      if (onClick) {
        onClick()
        return
      }

      if (!editor) return

      const defaultSpec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: 400,
        height: 200,
        mark: "bar" as const,
        data: {
          values: [
            { category: "A", value: 28 },
            { category: "B", value: 55 },
            { category: "C", value: 43 },
            { category: "D", value: 91 },
            { category: "E", value: 81 },
            { category: "F", value: 53 },
            { category: "G", value: 19 },
            { category: "H", value: 87 },
          ],
        },
        encoding: {
          x: { field: "category", type: "nominal" as const },
          y: { field: "value", type: "quantitative" as const },
        },
      }

      editor.chain().focus().setVegaLite({ spec: JSON.stringify(defaultSpec, null, 2) }).run()
    }, [editor, onClick])

    return (
      <Button
        data-style="ghost"
        disabled={disabled || !editor}
        onClick={handleClick}
        aria-label="Insert Vega-Lite chart"
      >
        <VegaLiteIcon className="tiptap-button-icon" />
        {text && <span>{text}</span>}
      </Button>
    )
  }
)

VegaLiteButton.displayName = "VegaLiteButton"