import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Interns from './pages/Interns';
import Teams from './pages/Teams';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';

import Meetings from './pages/Meetings';
import Chat from './pages/Chat';
import Reports from './pages/Reports';


import Roles from './pages/Roles';
import Profile from './pages/Profile';
import Audit from './pages/Audit';
import WorkLog from './pages/WorkLog';
import Notices from './pages/Notices';
import { ForgotPassword, ResetPassword } from './pages/PasswordPages';
import { Loading } from './components/ui';

export default function App() {
  const { user, loading, isAdmin, isIntern } = useApp();
  if (loading) return <Loading full />;
  if (!user) return <Routes><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} /><Route path="/" element={<Home />} /><Route path="*" element={<Login />} /></Routes>;
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        {isAdmin && <Route path="/interns" element={<Interns />} />}
        {!isIntern && <Route path="/teams" element={<Teams />} />}
        <Route path="/projects" element={<Projects />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/worklog" element={<WorkLog />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/chat" element={<Chat />} />
        
        
        {isAdmin && <Route path="/roles" element={<Roles />} />}
        {isAdmin && <Route path="/audit" element={<Audit />} />}
        {isAdmin && <Route path="/notices" element={<Notices />} />}
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
