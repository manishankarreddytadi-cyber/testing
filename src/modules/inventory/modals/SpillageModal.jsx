import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faXmark, faTrash } from '@fortawesome/free-solid-svg-icons';
import { subscribeItems, subscribeCategories, recordUsage } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';

const TODAY = new Date().toISOString().split('T')[0];

function emptyRow() {
  return { date: TODAY, categoryId: '', itemId: '', qty: '', unit: 'kg', reason: '' };
}

export default function SpillageModal({ onClose }) {
  const { orgId } = useAuth();
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const unsubItems = subscribeItems(orgId, setItems);
    const unsubCategories = subscribeCategories(orgId, setCategories);
    return () => { unsubItems(); unsubCategories(); };
  }, [orgId]);

  function addRow() { setRows(r => [...r, emptyRow()]); }
  function removeRow(i) { setRows(r => r.filter((_, idx) => idx !== i)); }
  function update(i, field, val) { setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row)); }

  async function handleSave() {
    if (rows.some(r => !r.itemId)) {
      alert("Please select an item for all rows before saving.");
      return;
    }
    setLoading(true);
    try {
      const enrichedRows = rows.map(r => {
        const itemObj = items.find(i => i.id === r.itemId) || {};
        const catObj = categories.find(c => c.id === r.categoryId) || {};
        return {
          ...r,
          itemName: itemObj.name || '',
          category: catObj.name || '',
          type: 'spillage',
          pondId: '',
          pond: 'Spillage/Loss',
          qty: parseFloat(r.qty) || 0
        };
      });
      await recordUsage(orgId, enrichedRows);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="modal-body-table" style={{ overflowX: 'auto', padding: 20 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 15 }}>
          Record lost, spoiled, or spilled inventory. This deducts from your stock but will not be added to any pond's usage chart.
        </p>
        <table className="excel-table">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Date</th>
              <th style={{ width: 140 }}>Category</th>
              <th style={{ width: 180 }}>Item</th>
              <th style={{ width: 90 }}>Qty</th>
              <th style={{ width: 80 }}>Unit</th>
              <th style={{ width: 160 }}>Reason</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td><input type="date" className="excel-input" value={row.date} onChange={e => update(i, 'date', e.target.value)} /></td>
                <td>
                  <select className="excel-input" value={row.categoryId} onChange={e => { update(i, 'categoryId', e.target.value); update(i, 'itemId', ''); }}>
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="excel-input" value={row.itemId} onChange={e => update(i, 'itemId', e.target.value)}>
                    <option value="">Select Item...</option>
                    {items.filter(item => item.categoryId === row.categoryId).map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </td>
                <td><input type="number" className="excel-input" value={row.qty} onChange={e => update(i, 'qty', e.target.value)} placeholder="0" /></td>
                <td><select className="excel-input" value={row.unit} onChange={e => update(i, 'unit', e.target.value)}><option>kg</option><option>L</option><option>pcs</option></select></td>
                <td><input type="text" className="excel-input" value={row.reason} onChange={e => update(i, 'reason', e.target.value)} placeholder="e.g. Broken bag" /></td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-secondary btn-sm" onClick={() => removeRow(i)}><FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} /></button>
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
          <button className="btn-primary btn-danger" onClick={handleSave} disabled={loading}>{loading ? 'Recording...' : 'Record Loss'}</button>
        </div>
      </div>
    </>
  );
}
