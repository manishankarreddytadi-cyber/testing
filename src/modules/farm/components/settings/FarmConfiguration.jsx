// src/modules/farm/components/settings/FarmConfiguration.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { addPond, updatePond, deletePond, addFarm, updateFarm, deleteFarm } from '../../../../services/farm.service';
import { useAuth } from '../../../../contexts/AuthContext';
import Badge from '../../../../shared/components/Badge';

function InlinePondAdd({ farmId, onCancel, onConfirm }) {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');

  return (
    <tr className="entry-row" style={{ background: '#eff6ff' }}>
      <td>
        <input
          className="excel-input"
          placeholder="Pond name (e.g. Pond 1)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          style={{ border: 'none' }}
        />
      </td>
      <td>
        <input
          type="number"
          className="excel-input"
          placeholder="1.0"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          style={{ border: 'none' }}
        />
      </td>
      <td>-</td>
      <td style={{ textAlign: 'center', display: 'flex', gap: 4 }}>
        <button className="btn-primary btn-sm" onClick={() => onConfirm(name, area)}>
          <FontAwesomeIcon icon={faCheck} />
        </button>
        <button className="btn-secondary btn-sm" onClick={onCancel}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </td>
    </tr>
  );
}

export default function FarmConfiguration({ farms, ponds }) {
  const { orgId, role } = useAuth();
  const [editing, setEditing] = useState(false);

  // Local state for adding
  const [newFarmName, setNewFarmName] = useState('');
  const [addingFarm,  setAddingFarm]  = useState(false);
  const [addingPondTo, setAddingPondTo] = useState(null); // farmId

  // Local state for inline edits
  const [farmEdits, setFarmEdits] = useState({}); // { farmId: name }
  const [pondEdits, setPondEdits] = useState({}); // { pondId: { name, area } }

  async function handleAddFarm() {
    const name = newFarmName.trim();
    if (!name) return;
    setAddingFarm(false);
    setNewFarmName('');
    try {
      await addFarm(orgId, { name });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddPond(farmId, name, areaStr) {
    const n = name.trim();
    if (!n) return;
    setAddingPondTo(null);
    try {
      await addPond(orgId, farmId, { name: n, area: parseFloat(areaStr) || 1.0, status: 'inactive' });
    } catch (err) {
      console.error(err);
    }
  }

  function handleFarmChange(farmId, val) {
    setFarmEdits((prev) => ({ ...prev, [farmId]: val }));
  }

  function handlePondChange(pondId, field, val) {
    setPondEdits((prev) => ({
      ...prev,
      [pondId]: { ...(prev[pondId] || {}), [field]: val },
    }));
  }

  async function handleFarmBlur(farmId, originalName) {
    const newVal = farmEdits[farmId];
    if (newVal !== undefined && newVal.trim() !== originalName) {
      await updateFarm(orgId, farmId, { name: newVal.trim() });
    }
  }

  async function handlePondBlur(farmId, pondId, originalPond) {
    const edits = pondEdits[pondId];
    if (!edits) return;
    
    const payload = {};
    if (edits.name !== undefined && edits.name.trim() !== originalPond.name) {
      payload.name = edits.name.trim();
    }
    if (edits.area !== undefined && parseFloat(edits.area) !== originalPond.area) {
      payload.area = parseFloat(edits.area) || 1.0;
    }
    
    if (Object.keys(payload).length > 0) {
      await updatePond(orgId, farmId, pondId, payload);
    }
  }

  return (
    <div className="excel-section">
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h3>Farm Configuration</h3>
        <div className="section-actions">
          {role !== 'Viewer' && (
            <>
              <button
                className={`${editing ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setEditing(!editing)}
              >
                <FontAwesomeIcon icon={editing ? faCheck : faPencil} />
              </button>
              <button className="btn-primary btn-sm" onClick={() => { setAddingFarm(true); setNewFarmName(''); }}>
                <FontAwesomeIcon icon={faPlus} /> Add Farm
              </button>
            </>
          )}
        </div>
      </div>

      {addingFarm && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '12px 16px', background: 'var(--highlight-bg)',
          border: '1px solid var(--primary)', borderRadius: 4, marginBottom: 16,
        }}>
          <input
            className="excel-input"
            placeholder="Farm name (e.g. Farm A)"
            value={newFarmName}
            onChange={(e) => setNewFarmName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFarm()}
            autoFocus
            style={{ maxWidth: 260 }}
          />
          <button className="btn-primary btn-sm" onClick={handleAddFarm}>
            <FontAwesomeIcon icon={faCheck} /> Save Farm
          </button>
          <button className="btn-secondary btn-sm" onClick={() => setAddingFarm(false)}>
            <FontAwesomeIcon icon={faXmark} /> Cancel
          </button>
        </div>
      )}

      <div className="config-list">
        {farms.length === 0 && !addingFarm && (
          <p className="empty-state" style={{ padding: '24px 0' }}>
            No farms yet. Click <strong>Add Farm</strong> above to get started.
          </p>
        )}

        {/* Sort farms alphabetically */}
        {[...farms].sort((a, b) => a.name.localeCompare(b.name)).map((farm) => {
          // Sort ponds alphabetically
          const farmPonds = [...(ponds[farm.id] || [])].sort((a, b) => a.name.localeCompare(b.name));
          const isAddingPond = addingPondTo === farm.id;

          return (
            <div key={farm.id} className="config-item">
              <div className="config-header">
                {editing ? (
                  <input
                    className="excel-input"
                    value={farmEdits[farm.id] ?? farm.name}
                    onChange={(e) => handleFarmChange(farm.id, e.target.value)}
                    onBlur={() => handleFarmBlur(farm.id, farm.name)}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    style={{ fontWeight: 600, fontSize: 16, maxWidth: 260, border: '1px dashed var(--border-dark)' }}
                  />
                ) : (
                  <h3>{farm.name}</h3>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  {!isAddingPond && (
                    <button className="btn-secondary btn-sm" onClick={() => setAddingPondTo(farm.id)}>
                      <FontAwesomeIcon icon={faPlus} /> Add Pond
                    </button>
                  )}
                  {editing && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={async () => {
                        if (farmPonds.length > 0) {
                          alert(`Cannot delete farm "${farm.name}" because it still has ponds. Delete all ponds first.`);
                          return;
                        }
                        if (window.confirm(`Delete farm "${farm.name}"? This action cannot be undone.`)) {
                          await deleteFarm(orgId, farm.id);
                        }
                      }}
                      title="Delete Farm"
                    >
                      <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                    </button>
                  )}
                </div>
              </div>

              <table className="excel-table sm-table no-filter-table">
                <thead>
                  <tr>
                    <th>Pond Name</th>
                    <th>Area (Ha)</th>
                    <th>Status</th>
                    <th style={{ width: 80, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {isAddingPond && (
                    <InlinePondAdd
                      farmId={farm.id}
                      onConfirm={(name, area) => handleAddPond(farm.id, name, area)}
                      onCancel={() => setAddingPondTo(null)}
                    />
                  )}

                  {farmPonds.length === 0 && !isAddingPond && (
                    <tr>
                      <td colSpan={4} className="empty-state">No ponds added yet.</td>
                    </tr>
                  )}

                  {farmPonds.map((pond) => (
                    <tr key={pond.id}>
                      <td>
                        {editing ? (
                          <input
                            className="excel-input"
                            value={pondEdits[pond.id]?.name ?? pond.name}
                            onChange={(e) => handlePondChange(pond.id, 'name', e.target.value)}
                            onBlur={() => handlePondBlur(farm.id, pond.id, pond)}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            style={{ border: '1px dashed var(--border-color)', background: 'transparent' }}
                          />
                        ) : pond.name}
                      </td>
                      <td>
                        {editing ? (
                          <input
                            type="number"
                            className="excel-input"
                            value={pondEdits[pond.id]?.area ?? pond.area}
                            onChange={(e) => handlePondChange(pond.id, 'area', e.target.value)}
                            onBlur={() => handlePondBlur(farm.id, pond.id, pond)}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            style={{ border: '1px dashed var(--border-color)', background: 'transparent' }}
                          />
                        ) : pond.area}
                      </td>
                      <td>
                        <Badge type={pond.status === 'active' ? 'active' : 'inactive'}>
                          {pond.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {editing && (
                          <button
                            className="btn-secondary btn-sm"
                            onClick={async () => {
                              if (pond.status === 'active') {
                                alert(`Cannot delete "${pond.name}" - it has an active cycle. End the cycle first.`);
                                return;
                              }
                              if (window.confirm(`Delete "${pond.name}"? This action cannot be undone.`)) {
                                await deletePond(orgId, farm.id, pond.id);
                              }
                            }}
                          >
                            <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
