import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { MermaidNode } from "./mermaid-node"

export interface MermaidOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (options: { code: string }) => ReturnType
    }
  }
}

export const MermaidExtension = Node.create<MermaidOptions>({
  name: "mermaid",

  group: "block",

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      code: {
        default: "",
        parseHTML: (element) => element.textContent,
        renderHTML: (attributes) => {
          if (!attributes.code) {
            return {}
          }
          return {
            "data-code": attributes.code,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='mermaid']",
        getAttrs: (element) => ({
          code: (element as HTMLElement).getAttribute("data-code") || "",
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          "data-type": "mermaid",
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
    ]
  },

  addCommands() {
    return {
      setMermaid:
        ({ code }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { code },
          })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNode)
  },
})