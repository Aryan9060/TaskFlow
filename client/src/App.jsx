import { Routes, Route } from 'react-router-dom'
import GuestRoute from './components/GuestRoute.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Profile from './pages/Profile.jsx'
import Subjects from './pages/Subjects.jsx'
import Tasks from './pages/Tasks.jsx'
import Assignments from './pages/Assignments.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public-only: logged-in users are bounced to the dashboard */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Private: everything inside the app shell requires a session */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="exams" element={<PlaceholderPage title="Exam Planner" phase={6} />} />
          <Route path="calendar" element={<PlaceholderPage title="Calendar" phase={6} />} />
          <Route path="timer" element={<PlaceholderPage title="Study Timer" phase={7} />} />
          <Route path="analytics" element={<PlaceholderPage title="Analytics & Goals" phase={8} />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<PlaceholderPage title="Settings" phase={9} />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
