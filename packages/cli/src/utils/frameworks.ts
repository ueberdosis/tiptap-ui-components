export const FRAMEWORKS = {
  "next-app": {
    name: "next-app",
    label: "Next.js",
    links: {
      installation: "https://example.com/docs/installation/next",
    },
  },
  "next-pages": {
    name: "next-pages",
    label: "Next.js",
    links: {
      installation: "https://example.com/docs/installation/next",
    },
  },
  remix: {
    name: "remix",
    label: "Remix",
    links: {
      installation: "https://example.com/docs/installation/remix",
    },
  },
  "react-router": {
    name: "react-router",
    label: "React Router",
    links: {
      installation: "https://example.com/docs/installation/react-router",
    },
  },
  vite: {
    name: "vite",
    label: "Vite",
    links: {
      installation: "https://example.com/docs/installation/vite",
    },
  },
  astro: {
    name: "astro",
    label: "Astro",
    links: {
      installation: "https://example.com/docs/installation/astro",
    },
  },
  laravel: {
    name: "laravel",
    label: "Laravel",
    links: {
      installation: "https://example.com/docs/installation/laravel",
    },
  },
  "tanstack-start": {
    name: "tanstack-start",
    label: "TanStack Start",
    links: {
      installation: "https://example.com/docs/installation/tanstack",
    },
  },
  gatsby: {
    name: "gatsby",
    label: "Gatsby",
    links: {
      installation: "https://example.com/docs/installation/gatsby",
    },
  },
  manual: {
    name: "manual",
    label: "Manual",
    links: {
      installation: "https://example.com/docs/installation/manual",
    },
  },
} as const

export type Framework = (typeof FRAMEWORKS)[keyof typeof FRAMEWORKS]
