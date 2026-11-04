# 5x5

Vite + React + TypeScript PWA.

- Routing: TanStack Router (file-based, `src/routes`)
- Styling: Tailwind CSS v4 + shadcn/ui (`pnpm dlx shadcn@latest add <component>`)
- PWA: vite-plugin-pwa (icons generated from `public/favicon.svg`)
- Deploy: Vercel

## Scripts

```sh
pnpm dev            # dev server
pnpm build          # type-check + production build
pnpm preview        # serve the build
pnpm test           # vitest
pnpm lint           # oxlint
pnpm format         # prettier
```
