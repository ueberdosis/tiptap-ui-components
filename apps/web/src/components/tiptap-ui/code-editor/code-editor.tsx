import * as React from "react"
import { EditorView, keymap, lineNumbers, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine, dropCursor } from "@codemirror/view"
import { EditorState, Extension } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { bracketMatching, foldKeymap, indentOnInput, foldGutter, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { oneDark } from "@codemirror/theme-one-dark"
import "@/components/tiptap-ui/code-editor/code-editor.scss"

export interface CodeEditorProps {
  /**
   * Initial code content
   */
  initialCode?: string
  /**
   * Programming language for syntax highlighting
   */
  language?: "javascript" | "python" | "css" | "html" | "json" | "markdown" | "plaintext"
  /**
   * Theme preference
   */
  theme?: "light" | "dark"
  /**
   * Whether the editor is read-only
   */
  readOnly?: boolean
  /**
   * Callback when code changes
   */
  onChange?: (code: string) => void
  /**
   * Height of the editor
   */
  height?: string
  /**
   * Custom class name
   */
  className?: string
}

const languageMap = {
  javascript: javascript(),
  python: python(),
  css: css(),
  html: html(),
  json: json(),
  markdown: markdown(),
  plaintext: null,
}

// Create a basic setup similar to the deprecated @codemirror/basic-setup
const basicSetup: Extension = [
  lineNumbers(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    indentWithTab
  ]),
  history(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
]

export const CodeEditor = React.forwardRef<HTMLDivElement, CodeEditorProps>(
  (
    {
      initialCode = "",
      language = "javascript",
      theme = "light",
      readOnly = false,
      onChange,
      height = "200px",
      className = "",
    },
    ref
  ) => {
    const editorRef = React.useRef<HTMLDivElement>(null)
    const viewRef = React.useRef<EditorView | null>(null)

    React.useEffect(() => {
      if (!editorRef.current) return

      const languageSupport = languageMap[language]
      const extensions: Extension[] = [
        ...basicSetup,
        ...(languageSupport ? [languageSupport] : []),
        ...(theme === "dark" ? [oneDark] : []),
        ...(readOnly ? [EditorState.readOnly.of(true)] : []),
        ...(onChange ? [EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        })] : [])
      ]

      const state = EditorState.create({
        doc: initialCode,
        extensions,
      })

      const view = new EditorView({
        state,
        parent: editorRef.current,
      })

      viewRef.current = view

      return () => {
        view.destroy()
        viewRef.current = null
      }
    }, [language, theme, readOnly, onChange, initialCode])

    React.useImperativeHandle(ref, () => editorRef.current as HTMLDivElement, [])

    return (
      <div
        className={`code-editor ${className}`.trim()}
        style={{ height }}
        ref={editorRef}
      />
    )
  }
)

CodeEditor.displayName = "CodeEditor"

export default CodeEditor