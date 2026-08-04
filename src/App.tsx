/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyLog from './pages/DailyLog';
import StudyPlan from './pages/StudyPlan';
import Syllabus from './pages/Syllabus';
import StudyNotes from './pages/StudyNotes';
import Revisions from './pages/Revisions';
import TeamNotes from './pages/TeamNotes';
import Flashcards from './pages/Flashcards';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Timetable from './pages/Timetable';
import ManageUsers from './pages/ManageUsers';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/daily-log" element={<DailyLog />} />
              <Route path="/plan" element={<StudyPlan />} />
              <Route path="/syllabus" element={<Syllabus />} />
              <Route path="/notes" element={<StudyNotes />} />
              <Route path="/revisions" element={<Revisions />} />
              <Route path="/team-notes" element={<TeamNotes />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/users" element={<ManageUsers />} />
              <Route path="*" element={<Dashboard />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
