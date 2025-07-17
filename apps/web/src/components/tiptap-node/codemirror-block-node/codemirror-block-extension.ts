import { Node, mergeAttributes, nodePasteRule } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { CodeMirrorBlockNode } from "./codemirror-block-node"

export interface CodeMirrorBlockOptions {
  /**
   * Default language for syntax highlighting
   */
  defaultLanguage: string
  /**
   * Available languages for selection
   */
  languages: string[]
  /**
   * HTML attributes to add to the node
   */
  HTMLAttributes: Record<string, any>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codeMirrorBlock: {
      /**
       * Insert a CodeMirror code block
       */
      insertCodeMirrorBlock: (options?: { language?: string, code?: string }) => ReturnType
      /**
       * Set CodeMirror block language
       */
      setCodeMirrorBlockLanguage: (language: string) => ReturnType
    }
  }
}

export const CodeMirrorBlock = Node.create<CodeMirrorBlockOptions>({
  name: "codeMirrorBlock",

  addOptions() {
    return {
      defaultLanguage: "javascript",
      languages: ["javascript", "python", "css", "html", "json", "markdown", "plaintext"],
      HTMLAttributes: {},
    }
  },

  content: "",

  marks: "",

  group: "block",

  code: true,

  defining: true,

  isolating: true,

  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
        parseHTML: element => element.getAttribute("data-language"),
        renderHTML: attributes => ({
          "data-language": attributes.language,
        }),
      },
      code: {
        default: "",
        parseHTML: element => element.textContent,
        renderHTML: () => ({}), // Content handled by NodeView
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "pre[data-language]",
        preserveWhitespace: "full",
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            language: element.getAttribute("data-language") || this.options.defaultLanguage,
            code: element.textContent || "",
          }
        },
      },
      {
        tag: "pre",
        preserveWhitespace: "full",
        getAttrs: (node) => {
          const element = node as HTMLElement
          return {
            language: this.options.defaultLanguage,
            code: element.textContent || "",
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-language": node.attrs.language,
      }),
      ["code", {}, node.attrs.code || ""],
    ]
  },

  addCommands() {
    return {
      insertCodeMirrorBlock:
        (options = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              language: options.language || this.options.defaultLanguage,
              code: options.code || "",
            },
          })
        },
      setCodeMirrorBlockLanguage:
        (language: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { language })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-c": () => this.editor.commands.insertCodeMirrorBlock(),
      // Handle arrow keys to enter the CodeMirror block
      "ArrowDown": ({ editor }) => {
        const { selection } = editor.state
        const { $from } = selection
        const nextNode = $from.nodeAfter
        
        // If the next node is a CodeMirror block, enter it
        if (nextNode && nextNode.type.name === this.name) {
          const pos = $from.pos + 1
          editor.commands.setNodeSelection(pos)
          return true
        }
        
        return false
      },
      "ArrowUp": ({ editor }) => {
        const { selection } = editor.state
        const { $from } = selection
        const prevNode = $from.nodeBefore
        
        // If the previous node is a CodeMirror block, enter it
        if (prevNode && prevNode.type.name === this.name) {
          const pos = $from.pos - prevNode.nodeSize
          editor.commands.setNodeSelection(pos)
          return true
        }
        
        return false
      },
      "ArrowRight": ({ editor }) => {
        const { selection } = editor.state
        const { $from } = selection
        const nextNode = $from.nodeAfter
        
        // If the next node is a CodeMirror block, enter it
        if (nextNode && nextNode.type.name === this.name) {
          const pos = $from.pos + 1
          editor.commands.setNodeSelection(pos)
          return true
        }
        
        return false
      },
      "ArrowLeft": ({ editor }) => {
        const { selection } = editor.state
        const { $from } = selection
        const prevNode = $from.nodeBefore
        
        // If the previous node is a CodeMirror block, enter it
        if (prevNode && prevNode.type.name === this.name) {
          const pos = $from.pos - prevNode.nodeSize
          editor.commands.setNodeSelection(pos)
          return true
        }
        
        return false
      }
    }
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: /^```([a-z]*)\n([\s\S]*?)\n```$/gm,
        type: this.type,
        getAttributes: (match) => {
          const [, language, code] = match
          return {
            language: language || this.options.defaultLanguage,
            code: code.trim(),
          }
        },
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeMirrorBlockNode, {
      className: "codemirror-block-node",
    })
  },
})