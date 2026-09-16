import { BrowserRouter } from 'react-router-dom'

import { AppRoutes } from './AppRoutes'
import { getRouterBasename } from './routing'

export function AppRouter() {
  return (
    <BrowserRouter basename={getRouterBasename(import.meta.env.BASE_URL)}>
      <AppRoutes />
    </BrowserRouter>
  )
}
