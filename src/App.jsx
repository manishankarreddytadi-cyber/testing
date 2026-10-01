// src/App.jsx
// Root component: Auth guard + top-level page routing.
// Uses internal state (not React Router) for page switching —
// keeps the SPA feel of the original prototype without URL changes.
// To switch to URL routing, replace with BrowserRouter + Routes.
import { useState, Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'red' }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useAuth } from './contexts/AuthContext';
import TopNav from './shared/components/TopNav';
import LoginForm from './modules/auth/components/LoginForm';
import Onboarding from './modules/auth/components/Onboarding';
import FarmPage from './modules/farm/pages/FarmPage';
import InventoryPage from './modules/inventory/pages/InventoryPage';
import AttendancePage from './modules/attendance/pages/AttendancePage';
import SettingsPage from './modules/settings/pages/SettingsPage';

function AppContent() {
  const { user, profile, loading, hasPermission, isAdmin, needsOnboarding } = useAuth();
  const [activePage, _setActivePage] = useState(() => localStorage.getItem('aquanubandh_activePage') || 'farm');
  
  function setActivePage(page) {
    localStorage.setItem('aquanubandh_activePage', page);
    _setActivePage(page);
  }

  // While Firebase auth state loads, show nothing (avoids login flicker)
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--text-muted)',
      }}>
        Loading…
      </div>
    );
  }

  // Not authenticated → show login page
  if (!user) return <LoginForm />;

  // Needs to create or join an org
  if (needsOnboarding) return <Onboarding />;

  // Authenticated but waiting for active org profile to load
  if (!profile) return <div style={{padding: 40, textAlign: 'center', color: 'var(--text-muted)'}}>Loading Workspace...</div>;

  // Authenticated and has profile → show main app
  return (
    <div className="app-container">
      <TopNav activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        <div style={{ display: activePage === 'farm' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}>
          <FarmPage />
        </div>
        <div style={{ display: activePage === 'inventory' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}>
          {hasPermission('Inventory') ? <InventoryPage /> : <div style={{padding: 40}}>Access Denied</div>}
        </div>
        <div style={{ display: activePage === 'attendance' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}>
          <AttendancePage />
        </div>
        <div style={{ display: activePage === 'settings' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}>
          {isAdmin ? <SettingsPage /> : <div style={{padding: 40}}>Access Denied</div>}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
