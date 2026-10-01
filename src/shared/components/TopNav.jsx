// src/shared/components/TopNav.jsx
import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWater, faMapLocationDot, faBoxesStacked, faGear, faChevronDown, faCheck, faPlus, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/auth.service';

const TABS = [
  { id: 'farm',       label: 'Farm',       icon: faMapLocationDot },
  { id: 'inventory',  label: 'Inventory',  icon: faBoxesStacked   },
  { id: 'attendance', label: 'Attendance', icon: faUsers          },
  { id: 'settings',   label: 'Settings',   icon: faGear           },
];

export default function TopNav({ activePage, onNavigate }) {
  const { user, profile, globalUser, orgId, orgName, switchOrg, hasPermission, isAdmin, setIsCreatingOrg, role } = useAuth();

  const orgs = globalUser?.orgs || [];
  const activeOrg = orgs.find(o => o.id === orgId);

  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!orgMenuOpen) return;
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOrgMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [orgMenuOpen]);

  async function handleSwitchOrg(id) {
    setOrgMenuOpen(false);
    if (id !== orgId) await switchOrg(id);
  }

  return (
    <>
      <header className="top-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 20px)', flex: 1, minWidth: 0 }}>
          <div className="logo" style={{ width: 'auto' }}>
            <img src="/favicon.svg" alt="Aquanubandh Logo" style={{ height: 28, width: 'auto', marginRight: 4 }} />
            Aquanubandh
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setOrgMenuOpen(o => !o)}
                className="org-switcher-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                  background: 'var(--bg-secondary, rgba(255,255,255,0.08))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                  color: 'inherit', fontSize: 14, fontWeight: 600,
                }}
                title="Switch organisation"
              >
                <span className="org-switcher-text" style={{ maxWidth: 'clamp(80px, 25vw, 160px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {orgName || activeOrg?.name || 'Select Organisation'}
                </span>
                <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 10, opacity: 0.7 }} />
              </button>

              {orgMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                  minWidth: 200, background: 'var(--bg-card, #fff)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 1000, overflow: 'hidden',
                }}>
                  <div style={{ padding: '6px 12px 4px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Your Organisations
                  </div>
                  {orgs.map(org => {
                    const orgRole = org.id === orgId ? role : org.role;
                    return (
                    <button
                      key={org.id}
                      onClick={(e) => { e.preventDefault(); handleSwitchOrg(org.id); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '9px 14px',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        color: 'var(--text-primary)', fontSize: 13,
                        background: org.id === orgId ? 'var(--bg-highlight, #f0f7ff)' : 'transparent',
                        fontWeight: org.id === orgId ? 600 : 400,
                      }}
                    >
                      <div>
                        <div>{org.id === orgId && orgName ? orgName : (org.name || 'Unnamed Organisation')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{orgRole}</div>
                      </div>
                      {org.id === orgId && (
                        <FontAwesomeIcon icon={faCheck} style={{ fontSize: 11, color: 'var(--primary, #2563eb)' }} />
                      )}
                    </button>
                  )})}
                  <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', marginTop: 4, paddingTop: 4 }}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setOrgMenuOpen(false);
                        setIsCreatingOrg(true);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '9px 14px', background: 'none',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        color: 'var(--primary, #2563eb)', fontSize: 13, fontWeight: 600,
                      }}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Create New Organisation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="main-tabs">
          {TABS.filter((tab) => {
            if (tab.id === 'inventory') return hasPermission('Inventory');
            if (tab.id === 'settings') return isAdmin;
            return true;
          }).map((tab) => (
            <button
              key={tab.id}
              className={`nav-btn${activePage === tab.id ? ' active' : ''} ${tab.id === 'settings' ? 'settings-btn' : ''}`}
              onClick={() => onNavigate(tab.id)}
            >
              <FontAwesomeIcon icon={tab.icon} />
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Mobile-only settings icon rendered on the right side if they are admin */}
        {isAdmin && (
          <button 
            className={`nav-btn mobile-settings-btn ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => onNavigate('settings')}
            style={{ padding: '0 10px', height: '100%', flexShrink: 0 }}
          >
            <FontAwesomeIcon icon={faGear} style={{ fontSize: 18 }} />
          </button>
        )}
      </header>
      
      {/* Mobile bottom navigation */}
      <nav className="bottom-nav">
        {TABS.filter((tab) => {
          if (tab.id === 'settings') return false; // Handled at the top
          if (tab.id === 'inventory') return hasPermission('Inventory');
          return true;
        }).map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn${activePage === tab.id ? ' active' : ''}`}
            onClick={() => onNavigate(tab.id)}
          >
            <FontAwesomeIcon icon={tab.icon} style={{ fontSize: 16 }} />
            <span style={{ fontSize: 11, marginTop: 4 }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
