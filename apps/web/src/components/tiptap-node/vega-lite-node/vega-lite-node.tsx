import * as React from "react"
import { NodeViewContent, NodeViewWrapper, ReactNodeViewProps } from "@tiptap/react"
import { VegaLite } from "react-vega"

import "./vega-lite-node.scss"

export const VegaLiteNode: React.FC<ReactNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [spec, setSpec] = React.useState((node.attrs.spec as string) || "")
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(spec.length, spec.length)
    }
  }, [isEditing])

  const handleSave = () => {
    try {
      // Validate JSON
      JSON.parse(spec)
      setError(null)
      updateAttributes({ spec })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  const handleCancel = () => {
    setSpec((node.attrs.spec as string) || "")
    setError(null)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel()
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

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

  const parsedSpec = React.useMemo(() => {
    if (!spec) return null
    try {
      return JSON.parse(spec)
    } catch {
      return null
    }
  }, [spec])

  return (
    <NodeViewWrapper
      className={`vega-lite-node ${selected ? "selected" : ""} ${
        isEditing ? "editing" : ""
      }`}
    >
      {isEditing ? (
        <div className="vega-lite-editor">
          <textarea
            ref={textareaRef}
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Vega-Lite specification (JSON)..."
            className="vega-lite-textarea"
            rows={12}
          />
          <div className="vega-lite-actions">
            <button onClick={handleSave} className="vega-lite-btn vega-lite-btn-primary">
              Save (Ctrl+Enter)
            </button>
            <button onClick={handleCancel} className="vega-lite-btn vega-lite-btn-secondary">
              Cancel (Esc)
            </button>
          </div>
          {error && <div className="vega-lite-error">{error}</div>}
        </div>
      ) : (
        <div className="vega-lite-display" onDoubleClick={handleDoubleClick}>
          {parsedSpec ? (
            <div className="vega-lite-chart">
              <VegaLite
                spec={parsedSpec}
                actions={false}
              />
            </div>
          ) : spec ? (
            <div className="vega-lite-error">
              Invalid Vega-Lite specification. Please check your JSON.
            </div>
          ) : (
            <div className="vega-lite-placeholder">
              <p>Double-click to add a Vega-Lite visualization</p>
              <div className="vega-lite-example">
                <VegaLite
                  spec={defaultSpec}
                  actions={false}
                />
              </div>
            </div>
          )}
          {error && <div className="vega-lite-error">{error}</div>}
        </div>
      )}
      <NodeViewContent />
    </NodeViewWrapper>
  )
}