// src/modules/farm/modals/AddSamplingModal.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { addSampling } from '../../../services/farm.service';
import { handleExcelKeyDown } from '../../../utils/keyboardNavigation';
import { useAuth } from '../../../contexts/AuthContext';

function getToday() { return new Date().toISOString().split('T')[0]; }

export default function AddSamplingModal({ farmId, ponds, onClose }) {
  const { orgId } = useAuth();
  const [rows, setRows] = useState([{ date: getToday(), pondId: ponds[0]?.id || '', pond: ponds[0]?.name || '', count: '' }]);
  const [loading, setLoading] = useState(false);

  function addRow() {
    setRows((r) => {
      const lastRow = r.length > 0 ? r[r.length - 1] : null;
      const date   = lastRow ? lastRow.date   : TODAY;
      const pondId = lastRow ? lastRow.pondId : (ponds[0]?.id   || '');
      const pond   = lastRow ? lastRow.pond   : (ponds[0]?.name || '');
      return [...r, { date, pondId, pond, count: '' }];
    });
  }
  function removeRow(i) { setRows((r) => r.filter((_, idx) => idx !== i)); }
  function update(i, field, val) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function handleSave() {
    setLoading(true);
    try {
      for (const row of rows) {
        if (row.count) {
          const pond = ponds.find(p => p.id === row.pondId);
          if (pond && pond.activeCycleId) {
            await addSampling(orgId, farmId, pond.id, pond.activeCycleId, {
              date: row.date, count: Number(row.count)
            });
          }
        }
      }
      onClose();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <>
      <div className="modal-body-table">
        <table className="excel-table" onKeyDown={handleExcelKeyDown}>
          <thead>
            <tr>
              <th style={{ width: 150 }}>Date</th>
              <th style={{ width: 150 }}>Pond</th>
              <th style={{ width: 150 }}>Count (per kg)</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="entry-row">
                <td><input type="date" className="excel-input" value={row.date} onChange={(e) => update(i, 'date', e.target.value)} /></td>
                <td>
                  <select className="excel-input" value={row.pondId} onChange={(e) => {
                    const p = ponds.find(p => p.id === e.target.value);
                    update(i, 'pondId', e.target.value);
                    update(i, 'pond', p?.name || '');
                  }}>
                    {ponds.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td><input type="number" className="excel-input" value={row.count} onChange={(e) => update(i, 'count', e.target.value)} placeholder="0" /></td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-secondary btn-sm" onClick={() => removeRow(i)}><FontAwesomeIcon icon={faXmark} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="modal-footer space-between">
        <button className="btn-secondary btn-sm" onClick={addRow}><FontAwesomeIcon icon={faPlus} /> Add Row</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>
  );
}
