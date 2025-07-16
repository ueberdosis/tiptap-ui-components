import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { VegaLiteNode } from "./vega-lite-node"

export interface VegaLiteOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    vegaLite: {
      setVegaLite: (options: { spec: string }) => ReturnType
    }
  }
}

export const VegaLiteExtension = Node.create<VegaLiteOptions>({
  name: "vegaLite",

  group: "block",

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      spec: {
        default: "",
        parseHTML: (element) => element.textContent,
        renderHTML: (attributes) => {
          if (!attributes.spec) {
            return {}
          }
          return {
            "data-spec": attributes.spec,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='vega-lite']",
        getAttrs: (element) => ({
          spec: (element as HTMLElement).getAttribute("data-spec") || "",
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          "data-type": "vega-lite",
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
    ]
  },

  addCommands() {
    return {
      setVegaLite:
        ({ spec }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { spec },
          })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(VegaLiteNode)
  },
})