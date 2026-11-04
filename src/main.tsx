import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { requestPersistentStorage } from '@/data/repository'
import { applyDisplaySize } from '@/lib/display-size'
import '@/index.css'

const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

requestPersistentStorage()
// Before the first render, so the UI never shows at the wrong size
applyDisplaySize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
