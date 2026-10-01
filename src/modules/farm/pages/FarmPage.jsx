// src/modules/farm/pages/FarmPage.jsx
// Top-level Farm page: Operations / Overview / Farm Settings tabs
import { useState, useEffect } from 'react';
import SubTabs from '../../../shared/components/SubTabs';
import PondGrid from '../components/operations/PondGrid';
import CurrentOverview from '../components/overview/CurrentOverview';
import HistoryOverview from '../components/overview/HistoryOverview';
import TimeSettings from '../components/settings/TimeSettings';
import FarmConfiguration from '../components/settings/FarmConfiguration';
import UsersAccess from '../components/settings/UsersAccess';
import { useFarmData } from '../hooks/useFarmData';
import { getFarmHistory } from '../../../services/farm.service';
import { useAuth } from '../../../contexts/AuthContext';

const TOP_TABS = [
  { id: 'operations', label: 'Operations' },
  { id: 'overview',   label: 'Overview' },
  { id: 'settings',   label: 'Farm Settings' },
];

const OVERVIEW_TABS = [
  { id: 'current', label: 'Current' },
  { id: 'history', label: 'History' },
];

const SETTINGS_TABS = [
  { id: 'time',   label: 'Time Settings' },
  { id: 'config', label: 'Farm Configuration' },
  { id: 'users',  label: 'Users & Access' },
];

export default function FarmPage() {
  const { orgId, hasPermission, isAdmin } = useAuth();
  const { farms, ponds, loading } = useFarmData();
  const [topTab, _setTopTab]           = useState(() => localStorage.getItem('aquanubandh_farmTopTab') || 'operations');
  const [settingsTab, _setSettingsTab] = useState(() => localStorage.getItem('aquanubandh_farmSettingsTab') || 'time');
  const [overviewTab, _setOverviewTab] = useState(() => localStorage.getItem('aquanubandh_farmOverviewTab') || 'current');

  function setTopTab(tab) { localStorage.setItem('aquanubandh_farmTopTab', tab); _setTopTab(tab); }
  function setSettingsTab(tab) { localStorage.setItem('aquanubandh_farmSettingsTab', tab); _setSettingsTab(tab); }
  function setOverviewTab(tab) { localStorage.setItem('aquanubandh_farmOverviewTab', tab); _setOverviewTab(tab); }

  // Allow child components to jump to a specific settings sub-tab
  function goToSettings(subTab = 'config') {
    setTopTab('settings');
    setSettingsTab(subTab);
  }
  const [history, setHistory]         = useState([]);
  const [historyFarmKey, setHistoryFarmKey] = useState('');

  // Reload history any time the farm list changes or the history tab is opened
  useEffect(() => {
    const pondCount = Object.values(ponds).reduce((sum, arr) => sum + arr.length, 0);
    const farmKey = farms.map(f => f.id).join(',') + ':' + pondCount;
    if (overviewTab === 'history' && farms.length > 0 && farmKey !== historyFarmKey) {
      setHistoryFarmKey(farmKey);
      Promise.all(farms.map((f) => getFarmHistory(f.orgId || f.id, f.id))).then((results) => {
        setHistory(farms.map((f, i) => ({ ...f, cycles: results[i] })));
      });
    }
  }, [overviewTab, farms, ponds, historyFarmKey]);

  // One-time migration to fix corrupted usage records
  useEffect(() => {
    if (orgId && localStorage.getItem('aquanubandh_migration_done') !== orgId) {
      import('../../../services/migration.service').then(m => {
        m.runMigration(orgId).then(() => {
          localStorage.setItem('aquanubandh_migration_done', orgId);
        });
      });
    }
  }, [orgId]);

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading farms…</div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div className="main-panel" style={{ flex: 1 }}>
          <SubTabs 
            tabs={TOP_TABS.filter(t => t.id !== 'settings' || hasPermission('Farm Settings'))} 
            activeTab={topTab} 
            onTabChange={setTopTab} 
          />

          {/* Operations */}
          <div style={{ display: topTab === 'operations' ? 'block' : 'none' }}>
            <PondGrid farms={farms} ponds={ponds} onGoToSettings={goToSettings} />
          </div>

          {/* Overview */}
          <div style={{ display: topTab === 'overview' ? 'block' : 'none' }}>
            <SubTabs tabs={OVERVIEW_TABS} activeTab={overviewTab} onTabChange={setOverviewTab}
              style={{ borderBottom: 'none', marginBottom: 15 }} />
            
            <div style={{ display: overviewTab === 'current' ? 'block' : 'none' }}>
              <CurrentOverview farms={farms} ponds={ponds} />
            </div>
            <div style={{ display: overviewTab === 'history' ? 'block' : 'none' }}>
              <HistoryOverview historyData={history} />
            </div>
          </div>

          {/* Farm Settings */}
          <div style={{ display: topTab === 'settings' ? 'block' : 'none' }}>
            <SubTabs 
              tabs={SETTINGS_TABS.filter(t => t.id !== 'users' || isAdmin)} 
              activeTab={settingsTab} 
              onTabChange={setSettingsTab}
              style={{ borderBottom: 'none', marginBottom: 15 }} 
            />
            <div style={{ display: settingsTab === 'time' ? 'block' : 'none' }}>
              <TimeSettings />
            </div>
            <div style={{ display: settingsTab === 'config' ? 'block' : 'none' }}>
              <FarmConfiguration farms={farms} ponds={ponds} />
            </div>
            <div style={{ display: settingsTab === 'users' && isAdmin ? 'block' : 'none' }}>
              <UsersAccess />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
