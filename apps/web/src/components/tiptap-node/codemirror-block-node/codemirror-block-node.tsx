import * as React from "react"
import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
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
import { Button } from "@/components/tiptap-ui-primitive/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/tiptap-ui-primitive/dropdown-menu"
import "@/components/tiptap-node/codemirror-block-node/codemirror-block-node.scss"

const languageMap = {
  javascript: javascript(),
  python: python(),
  css: css(),
  html: html(),
  json: json(),
  markdown: markdown(),
  plaintext: null,
}

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "plaintext", label: "Plain Text" },
] as const

// Create a basic setup for inline editing
const createBasicSetup = (isInline = true): Extension => [
  lineNumbers(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  ...(isInline ? [] : [rectangularSelection(), crosshairCursor()]),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    indentWithTab,
    // Custom keymap to handle Enter key
    {
      key: "Enter",
      run: () => {
        // Allow normal line breaks within the code block
        return false
      }
    },
    {
      key: "Escape",
      run: (view) => {
        // Focus back to the main editor
        view.dom.blur()
        return true
      }
    }
  ]),
  history(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
]

export function CodeMirrorBlockNode({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const viewRef = React.useRef<EditorView | null>(null)
  const [isDarkTheme, setIsDarkTheme] = React.useState(false)
  const isUpdatingRef = React.useRef(false)
  const initialCodeRef = React.useRef(node.attrs.code || "")

  // Detect dark theme
  React.useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkTheme(isDark)
    }
    
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  // Focus handler to automatically focus CodeMirror when selected
  React.useEffect(() => {
    if (selected && viewRef.current) {
      viewRef.current.focus()
    }
  }, [selected])

  // Initialize CodeMirror
  React.useEffect(() => {
    if (!editorRef.current) return

    const languageSupport = languageMap[node.attrs.language as keyof typeof languageMap]
    const extensions: Extension[] = [
      createBasicSetup(true),
      ...(languageSupport ? [languageSupport] : []),
      ...(isDarkTheme ? [oneDark] : []),
      // Prevent certain events from bubbling to Tiptap
      EditorView.domEventHandlers({
        blur: (event) => {
          // Don't let blur events bubble up to Tiptap
          event.stopPropagation()
          return false
        },
        focus: (event) => {
          // Don't let focus events bubble up to Tiptap
          event.stopPropagation()
          return false
        },
        mousedown: (event) => {
          // Don't let mousedown events bubble up to Tiptap
          event.stopPropagation()
          return false
        }
      }),
      // Handle arrow keys to exit the block
      keymap.of([
        {
          key: "ArrowUp",
          run: (view) => {
            const { selection } = view.state
            const line = view.state.doc.lineAt(selection.main.head)
            const { head } = selection.main
            const lineStart = line.from
            
            // If at the first line and at the beginning of the line, exit to Tiptap
            if (line.number === 1 && head === lineStart) {
              if (editor && getPos) {
                const pos = getPos()
                editor.commands.setTextSelection(pos)
                editor.commands.focus()
              }
              return true
            }
            return false // Let CodeMirror handle it normally
          }
        },
        {
          key: "ArrowDown",
          run: (view) => {
            const { selection } = view.state
            const line = view.state.doc.lineAt(selection.main.head)
            const { head } = selection.main
            const lineEnd = line.to
            const lastLine = view.state.doc.lines
            
            // If at the last line and at the end of the line, exit to Tiptap
            if (line.number === lastLine && head === lineEnd) {
              if (editor && getPos) {
                const pos = getPos()
                editor.commands.setTextSelection(pos + node.nodeSize)
                editor.commands.focus()
              }
              return true
            }
            return false // Let CodeMirror handle it normally
          }
        },
        {
          key: "ArrowLeft",
          run: (view) => {
            const { selection } = view.state
            const { head } = selection.main
            
            // If at the very beginning of the document, exit to Tiptap
            if (head === 0) {
              if (editor && getPos) {
                const pos = getPos()
                editor.commands.setTextSelection(pos)
                editor.commands.focus()
              }
              return true
            }
            return false // Let CodeMirror handle it normally
          }
        },
        {
          key: "ArrowRight",
          run: (view) => {
            const { selection } = view.state
            const { head } = selection.main
            const docLength = view.state.doc.length
            
            // If at the very end of the document, exit to Tiptap
            if (head === docLength) {
              if (editor && getPos) {
                const pos = getPos()
                editor.commands.setTextSelection(pos + node.nodeSize)
                editor.commands.focus()
              }
              return true
            }
            return false // Let CodeMirror handle it normally
          }
        }
      ])
    ]

    const state = EditorState.create({
      doc: initialCodeRef.current,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
      dispatch: (tr) => {
        view.update([tr])
        if (tr.docChanged) {
          const newCode = tr.state.doc.toString()
          if (!isUpdatingRef.current) {
            isUpdatingRef.current = true
            requestAnimationFrame(() => {
              updateAttributes({ code: newCode })
              isUpdatingRef.current = false
            })
          }
        }
      }
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [node.attrs.language, updateAttributes, isDarkTheme, editor, getPos, node.nodeSize])

  const handleLanguageChange = (newLanguage: string) => {
    updateAttributes({ language: newLanguage })
  }

  return (
    <NodeViewWrapper className={`codemirror-block-wrapper ${selected ? 'selected' : ''}`}>
      <div className="codemirror-block-header">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button data-style="ghost" className="language-selector">
              {languages.find(l => l.value === node.attrs.language)?.label || "Select language"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {languages.map(({ value, label }) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => handleLanguageChange(value)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div 
        ref={editorRef} 
        className="codemirror-editor"
        data-language={node.attrs.language}
      />
    </NodeViewWrapper>
  )
}