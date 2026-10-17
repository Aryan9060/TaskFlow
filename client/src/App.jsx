import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<PlaceholderPage title="My Tasks" phase={5} />} />
        <Route path="assignments" element={<PlaceholderPage title="Assignments" phase={5} />} />
        <Route path="subjects" element={<PlaceholderPage title="Subjects" phase={4} />} />
        <Route path="exams" element={<PlaceholderPage title="Exam Planner" phase={6} />} />
        <Route path="calendar" element={<PlaceholderPage title="Calendar" phase={6} />} />
        <Route path="timer" element={<PlaceholderPage title="Study Timer" phase={7} />} />
        <Route path="analytics" element={<PlaceholderPage title="Analytics & Goals" phase={8} />} />
        <Route path="profile" element={<PlaceholderPage title="Profile" phase={2} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" phase={2} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
