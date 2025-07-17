import * as React from "react"
import { type Editor } from "@tiptap/react"

// --- Components ---
import { CodeEditor } from "@/components/tiptap-ui/code-editor"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { CodeBlockIcon } from "@/components/tiptap-icons/code-block-icon"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/tiptap-ui-primitive/popover"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/tiptap-ui-primitive/dropdown-menu"
import "@/components/tiptap-ui/code-editor-button/code-editor-button.scss"

export interface CodeEditorButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * The TipTap editor instance.
   */
  editor?: Editor | null
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
  /**
   * Default programming language
   */
  defaultLanguage?: "javascript" | "python" | "css" | "html" | "json" | "markdown" | "plaintext"
  /**
   * Editor height
   */
  editorHeight?: string
  /**
   * Whether to show the language selector
   */
  showLanguageSelector?: boolean
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

export const CodeEditorButton = React.forwardRef<
  HTMLButtonElement,
  CodeEditorButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      defaultLanguage = "javascript",
      editorHeight = "300px",
      showLanguageSelector = true,
      className = "",
      disabled,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const editor = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedLanguage, setSelectedLanguage] = React.useState(defaultLanguage)
    const [code, setCode] = React.useState("")

    const handleInsertCode = React.useCallback(() => {
      if (!editor) return

      const codeBlock = `\`\`\`${selectedLanguage}\n${code}\n\`\`\``
      
      editor
        .chain()
        .focus()
        .insertContent(codeBlock)
        .run()

      setIsOpen(false)
      setCode("")
    }, [editor, selectedLanguage, code])

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)

        if (!e.defaultPrevented && !disabled) {
          setIsOpen(true)
        }
      },
      [onClick, disabled]
    )

    if (!editor || !editor.isEditable) {
      return null
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            className={className.trim()}
            disabled={disabled}
            data-style="ghost"
            data-disabled={disabled}
            role="button"
            tabIndex={-1}
            aria-label="Insert code with editor"
            tooltip="Code Editor"
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
        </PopoverTrigger>
        <PopoverContent className="code-editor-popover">
          <div className="code-editor-header">
            <h4>Code Editor</h4>
            {showLanguageSelector && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button data-style="ghost">
                    {languages.find(l => l.value === selectedLanguage)?.label || "Select language"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {languages.map(({ value, label }) => (
                    <DropdownMenuItem
                      key={value}
                      onSelect={() => setSelectedLanguage(value)}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <CodeEditor
            initialCode={code}
            language={selectedLanguage}
            theme="light"
            height={editorHeight}
            onChange={setCode}
            className="code-editor-popover-editor"
          />
          <div className="code-editor-actions">
            <Button
              type="button"
              data-style="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-style="primary"
              onClick={handleInsertCode}
              disabled={!code.trim()}
            >
              Insert Code
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

CodeEditorButton.displayName = "CodeEditorButton"

export default CodeEditorButton