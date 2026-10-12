import { Route, Routes } from 'react-router-dom'

import { ScenarioBrowserPage } from '../features/browse/ScenarioBrowserPage'
import { DailyIncidentPage } from '../features/daily/DailyIncidentPage'
import { ScenarioInspectorPage } from '../features/developer/ScenarioInspectorPage'
import { ScoringSimulatorPage } from '../features/developer/ScoringSimulatorPage'
import { InvestigationPage } from '../features/investigation/InvestigationPage'
import { ProgressRoute } from '../features/progress/ProgressPage'
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
        <Route path="daily" element={<DailyIncidentPage />} />
        <Route path="progress" element={<ProgressRoute />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route
          path="developer/inspector/:scenarioId"
          element={<ScenarioInspectorPage />}
        />
        <Route
          path="developer/scoring/:scenarioId"
          element={<ScoringSimulatorPage />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
