// src/modules/farm/components/settings/UsersAccess.jsx
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPencil, faCheck, faPlus, faTrash, faChevronRight,
  faXmark, faPaperPlane, faMagnifyingGlass, faSpinner,
  faEnvelopeOpenText, faBell,
} from '@fortawesome/free-solid-svg-icons';
import {
  subscribeUsers, updateUserPermissions, updateUser, deleteUser,
  subscribeOrganisation,
} from '../../../../services/users.service';
import { subscribeFarms } from '../../../../services/farm.service';
import { subscribeStores } from '../../../../services/inventory.service';
import { useAuth } from '../../../../contexts/AuthContext';
import Badge from '../../../../shared/components/Badge';

const MODULES = ['Inventory', 'Sampling', 'Feeding', 'Consumables', 'History', 'Farm Settings'];

function MultiSelectDropdown({ label, options, selectedIds, onToggle, placeholder = "Select...", disabled }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div style={{ position: 'relative', minWidth: 200 }}>
      <button 
        type="button"
        className="excel-input" 
        disabled={disabled}
        style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? 'transparent' : '#fff', opacity: disabled ? 0.7 : 1 }}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedIds.length === 0 ? placeholder : `${selectedIds.length} selected`}
        </span>
        <FontAwesomeIcon icon={faChevronRight} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.2s', fontSize: 10, opacity: 0.6 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100,
          background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 8, minWidth: '100%', maxHeight: 200, overflowY: 'auto',
          WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain'
        }}>
          {options.length === 0 ? <div style={{ padding: 8, color: 'var(--text-muted)', fontSize: 13 }}>No items available</div> : null}
          {options.map(opt => (
            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', fontSize: 13, borderRadius: 4, transition: '0.1s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
              <input type="checkbox" style={{ marginRight: 8 }} checked={selectedIds.includes(opt.id)} onChange={() => onToggle(opt.id)} />
              {opt.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsersAccess() {
  const { orgId, user, globalUser, reloadProfile, switchOrg } = useAuth();
  const [users, setUsers]             = useState([]);
  const [farms, setFarms]             = useState([]);
  const [stores, setStores]           = useState([]);
  const [orgData, setOrgData]         = useState(null);
  const [editing, setEditing]         = useState(false);
  const [expanded, setExpanded]       = useState({});

  useEffect(() => {
    const unsubUsers  = subscribeUsers(orgId, setUsers);
    const unsubFarms  = subscribeFarms(orgId, setFarms);
    const unsubStores = subscribeStores(orgId, setStores);
    const unsubOrg    = subscribeOrganisation(orgId, setOrgData);
    
    return () => { unsubUsers(); unsubFarms(); unsubStores(); unsubOrg(); };
  }, [orgId]);

  async function togglePermission(u, module) {
    const current = u.modulePermissions?.[module] !== false;
    await updateUserPermissions(orgId, u.id, {
      ...(u.modulePermissions || {}),
      [module]: !current,
    });
  }

  async function toggleFarmAccess(u, farmId) {
    const current = u.farmAccess || [];
    const updated = current.includes(farmId)
      ? current.filter(id => id !== farmId)
      : [...current, farmId];
    await updateUser(orgId, u.id, { farmAccess: updated });
  }

  async function toggleStoreAccess(u, storeId) {
    const current = u.storeAccess || [];
    const updated = current.includes(storeId)
      ? current.filter(id => id !== storeId)
      : [...current, storeId];
    await updateUser(orgId, u.id, { storeAccess: updated });
  }

  return (
    <div className="excel-section">
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h3>Users &amp; Access</h3>
        <div className="section-actions">
          <button className={`${editing ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setEditing((e) => !e)}>
            <FontAwesomeIcon icon={editing ? faCheck : faPencil} /> {editing ? 'Save' : 'Edit'}
          </button>
        </div>
      </div>

      {orgData?.inviteCode && (
        <div style={{
          padding: '16px 20px', background: 'var(--highlight-bg)',
          border: '1px dashed var(--primary)', borderRadius: 6, marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px'
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 14 }}>Organisation Invite Code</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Share this code with your team. They can enter it when joining your organisation.
            </div>
          </div>
          <div style={{ 
            background: '#fff', padding: '8px 24px', 
            borderRadius: 8, border: '1px solid var(--border-color)',
            fontSize: 24, fontWeight: 800, letterSpacing: 4,
            color: 'var(--text-main)', userSelect: 'all',
            flexShrink: 0
          }}>
            {orgData.inviteCode}
          </div>
        </div>
      )}

      {/* ── ACTIVE USERS TABLE ───────────────────────────── */}
      <div className="table-container">
        <table className="excel-table no-filter-table">
          <thead>
            <tr>
              <th style={{ maxWidth: 150 }}>Name</th>
              <th>Email</th>
              <th style={{ minWidth: 120 }}>Role</th>
              <th style={{ minWidth: 140 }}>Module Access</th>
              <th style={{ minWidth: 140 }}>Farm Access</th>
              <th style={{ minWidth: 140 }}>Inventory Access</th>
              <th>Status</th>
              <th style={{ width: 60, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.name}>
                  {u.name}
                </td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="excel-input no-border"
                    disabled={!editing}
                    value={u.role || 'Viewer'}
                    onChange={(e) => updateUser(orgId, u.id, { role: e.target.value })}
                  >
                    <option>Admin</option><option>Manager</option><option>Viewer</option>
                  </select>
                </td>
                <td>
                  <MultiSelectDropdown 
                    options={MODULES.map(m => ({ id: m, name: m }))}
                    selectedIds={MODULES.filter(m => u.modulePermissions?.[m] !== false)}
                    onToggle={(mod) => togglePermission(u, mod)}
                    placeholder="All Modules"
                    disabled={!editing}
                  />
                </td>
                <td>
                  <MultiSelectDropdown 
                    options={farms} 
                    selectedIds={u.farmAccess || []} 
                    onToggle={(farmId) => toggleFarmAccess(u, farmId)} 
                    placeholder="All Farms" 
                    disabled={!editing}
                  />
                </td>
                <td>
                  <MultiSelectDropdown 
                    options={stores} 
                    selectedIds={u.storeAccess || []} 
                    onToggle={(storeId) => toggleStoreAccess(u, storeId)} 
                    placeholder="All Stores" 
                    disabled={!editing}
                  />
                </td>
                <td>
                  <Badge type={u.status === 'active' ? 'active' : 'inactive'}>
                    {u.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {editing && (
                    <button className="btn-secondary btn-sm" onClick={() => deleteUser(orgId, u.id)} title="Remove User">
                      <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No users configured yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>



    </div>
  );
}
