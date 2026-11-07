import React from 'react';
import { useAuth } from './context/AuthContext';
import { AuthGateway } from './components/auth/AuthGateway';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { DonorDashboard } from './components/dashboards/DonorDashboard';
import { UserDashboard } from './components/dashboards/UserDashboard';
import { Loader2 } from 'lucide-react';

export function App() {
  const { currentUser, isLoading } = useAuth();

  // Loading Session Spinner
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-muted)' }}
      >
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
          Initializing AI-Blood-Donor Platform...
        </span>
      </div>
    );
  }

  // Unauthenticated Landing: Split Auth Gateway
  if (!currentUser) {
    return <AuthGateway />;
  }

  // Authenticated Role Dashboards (Strictly role-locked, no portal switcher)
  if (currentUser.role === 'admin') {
    return <AdminDashboard />;
  }

  if (currentUser.role === 'donor') {
    return <DonorDashboard />;
  }

  if (currentUser.role === 'user') {
    return <UserDashboard />;
  }

  // Fallback to Admin Dashboard
  return <AdminDashboard />;
}

export default App;
