/**
 * App routes.
 *
 * Provider order matters:
 *   AuthProvider  → knows who is logged in
 *   StoreSync     → syncs study data with Firestore (needs the user)
 *   BrowserRouter → pages
 */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import StoreSync from './components/StoreSync';
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
import Appreciation from './pages/Appreciation';
import Backup from './pages/Backup';
import WeeklyReport from './pages/WeeklyReport';

export default function App() {
  return (
    <AuthProvider>
      <StoreSync>
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
                <Route path="/flashcards" element={<Flashcards />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/appreciation" element={<Appreciation />} />
                <Route path="/report" element={<WeeklyReport />} />
                <Route path="*" element={<Dashboard />} />

                {/* Teacher & Admin only */}
                <Route element={<ProtectedRoute allowedRoles={['Admin', 'Teacher']} />}>
                  <Route path="/team-notes" element={<TeamNotes />} />
                </Route>

                {/* Admin only */}
                <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                  <Route path="/users" element={<ManageUsers />} />
                  <Route path="/backup" element={<Backup />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </StoreSync>
    </AuthProvider>
  );
}
