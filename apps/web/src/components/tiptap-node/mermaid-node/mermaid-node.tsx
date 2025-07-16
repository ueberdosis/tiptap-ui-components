import * as React from "react"
import { NodeViewContent, NodeViewWrapper, ReactNodeViewProps } from "@tiptap/react"
import mermaid from "mermaid"

import "./mermaid-node.scss"

export const MermaidNode: React.FC<ReactNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [code, setCode] = React.useState((node.attrs.code as string) || "")
  const [error, setError] = React.useState<string | null>(null)
  const diagramRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      fontFamily: "inherit",
    })
  }, [])

  React.useEffect(() => {
    if (!isEditing && code && diagramRef.current) {
      renderDiagram()
    }
  }, [code, isEditing])

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(code.length, code.length)
    }
  }, [isEditing])

  const renderDiagram = async () => {
    if (!diagramRef.current || !code.trim()) return

    try {
      setError(null)
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const { svg } = await mermaid.render(id, code)
      diagramRef.current.innerHTML = svg
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render diagram")
      diagramRef.current.innerHTML = `<div class="mermaid-error">Error: ${error}</div>`
    }
  }

  const handleSave = () => {
    updateAttributes({ code })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setCode((node.attrs.code as string) || "")
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

  const defaultCode = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Fix it]
    D --> B`

  return (
    <NodeViewWrapper
      className={`mermaid-node ${selected ? "selected" : ""} ${
        isEditing ? "editing" : ""
      }`}
    >
      {isEditing ? (
        <div className="mermaid-editor">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Mermaid diagram code here..."
            className="mermaid-textarea"
            rows={8}
          />
          <div className="mermaid-actions">
            <button onClick={handleSave} className="mermaid-btn mermaid-btn-primary">
              Save (Ctrl+Enter)
            </button>
            <button onClick={handleCancel} className="mermaid-btn mermaid-btn-secondary">
              Cancel (Esc)
            </button>
          </div>
          {error && <div className="mermaid-error">{error}</div>}
        </div>
      ) : (
        <div className="mermaid-display" onDoubleClick={handleDoubleClick}>
          {code ? (
            <div ref={diagramRef} className="mermaid-diagram" />
          ) : (
            <div className="mermaid-placeholder">
              <p>Double-click to add a Mermaid diagram</p>
              <pre className="mermaid-example">{defaultCode}</pre>
            </div>
          )}
        </div>
      )}
      <NodeViewContent />
    </NodeViewWrapper>
  )
}