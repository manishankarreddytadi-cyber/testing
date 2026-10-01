// src/modules/attendance/components/EmployeeList.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCheck, faTrash, faPencil, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { addEmployee, updateEmployee, removeEmployee } from '../../../services/attendance.service';

export default function EmployeeList({ employees }) {
  const { orgId, role } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newRow, setNewRow] = useState({ name: '', sno: '' });
  const [pendingEdits, setPendingEdits] = useState({});
  const [saving, setSaving] = useState(false);

  const activeEmployees = employees.filter(e => e.isActive !== false);

  async function handleAddRow(e) {
    if (e) e.preventDefault();
    if (!newRow.name.trim()) return;
    
    await addEmployee(orgId, newRow);
    setNewRow({ name: '', sno: '' });
  }

  function handleEditChange(id, field, val, raw) {
    setPendingEdits(prev => {
      const current = prev[id] || { ...raw };
      return { ...prev, [id]: { ...current, [field]: val } };
    });
  }

  async function saveAllEdits() {
    setSaving(true);
    try {
      const promises = Object.entries(pendingEdits).map(([id, data]) => {
        return updateEmployee(orgId, id, data);
      });
      // Also save the new row if it has content
      if (newRow.name.trim()) {
        promises.push(addEmployee(orgId, newRow));
        setNewRow({ name: '', sno: '' });
      }
      await Promise.all(promises);
      setPendingEdits({});
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  function cancelAllEdits() {
    setPendingEdits({});
    setNewRow({ name: '', sno: '' });
    setIsEditing(false);
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to remove this employee? Their past attendance records will remain visible.')) {
      await removeEmployee(orgId, id);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20 }}>
        {role !== 'Viewer' && (
          <div style={{ display: 'flex', gap: 10 }}>
            {isEditing ? (
              <>
                <button className="btn-primary btn-sm" onClick={saveAllEdits} disabled={saving}>
                  <FontAwesomeIcon icon={faCheck} /> {saving ? 'Saving...' : 'Save Edits'}
                </button>
                <button className="btn-secondary btn-sm" onClick={cancelAllEdits} disabled={saving}>
                  <FontAwesomeIcon icon={faXmark} /> Cancel
                </button>
              </>
            ) : (
              <button className="btn-secondary btn-sm" onClick={() => setIsEditing(true)} title="Edit">
                <FontAwesomeIcon icon={faPencil} />
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: 600, background: 'var(--bg-color)', borderBottom: '2px solid var(--border-dark)' }}>Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, background: 'var(--bg-color)', borderBottom: '2px solid var(--border-dark)' }}>S.No</th>
              {isEditing && <th style={{ padding: '12px 16px', fontWeight: 600, width: 60, background: 'var(--bg-color)', borderBottom: '2px solid var(--border-dark)' }}></th>}
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map(emp => {
              const edited = pendingEdits[emp.id] || emp;
              
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: isEditing ? '4px 8px' : '12px 16px', fontWeight: isEditing ? 400 : 500 }}>
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="excel-input" 
                        value={edited.name} 
                        onChange={e => handleEditChange(emp.id, 'name', e.target.value, emp)}
                        style={{ border: 'none', background: 'var(--bg-primary)' }}
                        disabled={role === 'Viewer'}
                      />
                    ) : (
                      emp.name
                    )}
                  </td>
                  <td style={{ padding: isEditing ? '4px 8px' : '12px 16px', color: isEditing ? 'inherit' : 'var(--text-muted)' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        className="excel-input" 
                        value={edited.sno} 
                        onChange={e => handleEditChange(emp.id, 'sno', e.target.value, emp)}
                        style={{ border: 'none', background: 'var(--bg-primary)' }}
                        disabled={role === 'Viewer'}
                      />
                    ) : (
                      emp.sno || '-'
                    )}
                  </td>
                  {isEditing && (
                    <td style={{ padding: '4px 16px', textAlign: 'right' }}>
                      <button className="btn-secondary btn-sm" onClick={() => handleDelete(emp.id)} style={{ padding: '4px 8px', color: '#e74c3c' }} title="Delete">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            
            {/* The "New Row" */}
            {isEditing && role !== 'Viewer' && (
              <tr style={{ background: 'rgba(37, 99, 235, 0.05)' }}>
                <td style={{ padding: '4px 8px' }}>
                  <input 
                    type="text" 
                    className="excel-input" 
                    placeholder="Type name to add..." 
                    value={newRow.name} 
                    onChange={e => setNewRow({ ...newRow, name: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddRow(); }}
                    style={{ border: 'none', background: 'transparent' }}
                  />
                </td>
                <td style={{ padding: '4px 8px' }}>
                  <input 
                    type="number" 
                    className="excel-input" 
                    placeholder="S.No" 
                    value={newRow.sno} 
                    onChange={e => setNewRow({ ...newRow, sno: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddRow(); }}
                    style={{ border: 'none', background: 'transparent' }}
                  />
                </td>
                <td style={{ padding: '4px 16px', textAlign: 'right' }}>
                  {newRow.name.trim() && (
                    <button className="btn-primary btn-sm" onClick={handleAddRow} style={{ padding: '4px 12px' }}>
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  )}
                </td>
              </tr>
            )}
            
            {!isEditing && activeEmployees.length === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No employees added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Spacer for bottom nav */}
        <div style={{ height: 'calc(80px + env(safe-area-inset-bottom))' }}></div>
      </div>
    </div>
  );
}
