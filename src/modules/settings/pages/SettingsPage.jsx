// src/modules/settings/pages/SettingsPage.jsx
import { useState } from 'react';
import SubTabs from '../../../shared/components/SubTabs';
import ProfileSettings from '../components/ProfileSettings';
import SystemConfiguration from '../components/SystemConfiguration';
import { useSettings } from '../hooks/useSettings';

const TABS = [
  { id: 'profile', label: 'Profile Settings' },
  { id: 'system',  label: 'System Configuration' },
];

export default function SettingsPage() {
  const [activeTab, _setActiveTab] = useState(() => localStorage.getItem('aquanubandh_settingsTab') || 'profile');
  function setActiveTab(tab) { localStorage.setItem('aquanubandh_settingsTab', tab); _setActiveTab(tab); }
  const { profile, config, loading } = useSettings();

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading settings…</div>;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: 'var(--surface)', padding: '20px 32px 0 32px', flexShrink: 0 }} className="settings-header">
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px 0' }}>Settings</h2>
        <SubTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} style={{ marginBottom: 0 }} />
      </div>

      <div className="main-panel" style={{ flex: 1 }}>
        <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
          <ProfileSettings profile={profile} />
        </div>
        <div style={{ display: activeTab === 'system' ? 'block' : 'none' }}>
          <SystemConfiguration config={config} />
        </div>
      </div>
    </div>
  );
}
