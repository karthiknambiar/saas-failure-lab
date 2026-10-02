import { Route, Routes } from 'react-router-dom'

import { ScenarioBrowserPage } from '../features/browse/ScenarioBrowserPage'
import { InvestigationPage } from '../features/investigation/InvestigationPage'
import { HowItWorksPage } from '../pages/HowItWorksPage'
import { LandingPage } from '../pages/LandingPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AppShell } from './AppShell'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="scenarios" element={<ScenarioBrowserPage />} />
        <Route path="scenarios/:scenarioId" element={<InvestigationPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
