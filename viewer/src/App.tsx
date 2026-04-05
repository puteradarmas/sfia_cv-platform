/**
 * App — Root component with React Router.
 *
 * Routes:
 *  /              → redirects to /upload
 *  /upload        → CV Upload & Skill Validation
 *  /personnel     → Browse & Edit Personnel Records
 *  /opportunities → Upload & Match Opportunities
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/shared/AppLayout'
import UploadPage from './pages/UploadPage'
import PersonnelPage from './pages/PersonnelPage'
import OpportunitiesPage from './pages/OpportunitiesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="personnel" element={<PersonnelPage />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
