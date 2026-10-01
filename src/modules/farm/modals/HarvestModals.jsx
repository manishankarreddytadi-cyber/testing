// src/modules/farm/modals/HarvestModals.jsx
// Shared table modal used for both Partial Harvest and End Cycle (Final Harvest)
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { handleExcelKeyDown } from '../../../utils/keyboardNavigation';

function getToday() { return new Date().toISOString().split('T')[0]; }

function emptyRow(ponds) {
  return { date: getToday(), pondId: ponds[0]?.id || '', pond: ponds[0]?.name || '', harvested: '', price: '' };
}

export function HarvestModal({ title, ponds, onSave, onClose, danger }) {
  const [rows, setRows] = useState([emptyRow(ponds)]);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  function addRow() {
    setRows((r) => {
      const lastRow = r.length > 0 ? r[r.length - 1] : null;
      const date = lastRow ? lastRow.date : getToday();
      const pondId = lastRow ? lastRow.pondId : (ponds[0]?.id || '');
      const pond   = lastRow ? lastRow.pond   : (ponds[0]?.name || '');
      return [...r, { date, pondId, pond, harvested: '', price: '' }];
    });
  }
  function removeRow(i) { setRows((r) => r.filter((_, idx) => idx !== i)); }
  function update(i, field, val) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function handleSave() {
    setSaveError('');
    setLoading(true);
    try { await onSave(rows); onClose(); }
    catch (err) { console.error(err); setSaveError('Failed to save: ' + (err.message || 'Unknown error')); }
    finally { setLoading(false); }
  }

  return (
    <>
      <div className="modal-body-table">
        <table className="excel-table" onKeyDown={handleExcelKeyDown}>
          <thead>
            <tr>
              <th style={{ width: 130 }}>Date</th>
              <th style={{ width: 100 }}>Pond</th>
              <th style={{ width: 150 }}>Harvested (kg)</th>
              <th style={{ width: 150 }}>Price (₹/kg)</th>
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
                <td><input type="number" className="excel-input" value={row.harvested} onChange={(e) => update(i, 'harvested', e.target.value)} placeholder="0" /></td>
                <td><input type="number" className="excel-input" value={row.price}     onChange={(e) => update(i, 'price', e.target.value)}     placeholder="0.00" /></td>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          {saveError && (
            <div style={{ color: '#e74c3c', fontSize: 12, background: '#fdf2f2', padding: '4px 10px', borderRadius: 4, border: '1px solid #f9d8d8' }}>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className={`btn-primary${danger ? ' btn-danger' : ''}`}
              style={danger ? { backgroundColor: '#e74c3c', borderColor: '#e74c3c' } : {}}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving…' : title}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
