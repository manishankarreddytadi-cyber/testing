// src/modules/inventory/components/Purchases.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faDownload, faPlus, faXmark, faTrash } from '@fortawesome/free-solid-svg-icons';
import ExcelTable from '../../../shared/components/ExcelTable';
import Tag from '../../../shared/components/Tag';
import { useTableFilter } from '../../../shared/hooks/useTableFilter';
import { useExportCSV } from '../hooks/useExportCSV';
import { addPurchase, updatePurchase, deletePurchase } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';
import { formatDate, canEditPastEntry } from '../../../utils/dateFormatter';
import { handleExcelKeyDown } from '../../../utils/keyboardNavigation';

const TODAY = new Date().toISOString().split('T')[0];

const COLUMNS = [
  { label: 'Date', noFilter: false },
  { label: 'Category' },
  { label: 'Item Name' },
  { label: 'Store' },
  { label: 'Qty', numeric: true },
  { label: 'Unit' },
  { label: 'Price/Unit', numeric: true },
  { label: 'Total (₹)', numeric: true, highlight: true },
  { label: '', noFilter: true },
];

function emptyRow(newRows) {
  const lastDate = newRows.length > 0 ? newRows[newRows.length - 1].date : TODAY;
  return { date: lastDate, categoryId: '', itemId: '', storeId: '', qty: '', unit: 'kg', price: '', total: '' };
}

export default function Purchases({ purchases, items = [], categories = [], stores = [] }) {
  const { orgId, role, isAdmin } = useAuth();
  const { exportCSV } = useExportCSV();

  const [addingMode, setAddingMode] = useState(false);
  const [editingMode, setEditingMode] = useState(false);
  const [newRows, setNewRows] = useState([]);
  const [pendingEdits, setPendingEdits] = useState({}); // { [id]: { field: val } }
  const [saving, setSaving] = useState(false);

  const tableRows = purchases.map((p) => [
    p.date,
    categories.find(c => c.id === p.categoryId)?.name || p.category || '-',
    items.find(i => i.id === p.itemId)?.name || p.itemName || '-',
    stores.find(s => s.id === p.storeId)?.name || p.store || '-',
    p.qty, p.unit, p.price,
    (parseFloat(p.qty) * parseFloat(p.price) || 0).toFixed(2),
    p.id,
    p, // raw object for editing
  ]);
  const filterState = useTableFilter(tableRows, COLUMNS, 'purchases');

  function addEntryRow() {
    setNewRows(r => [...r, emptyRow(r)]);
  }
  function removeEntry(i) { setNewRows(r => r.filter((_, idx) => idx !== i)); }
  function updateEntry(i, field, val) {
    setNewRows(r => r.map((row, idx) => {
      if (idx !== i) return row;
      const newRow = { ...row, [field]: val };
      if (field === 'price') newRow.total = (parseFloat(newRow.qty) && parseFloat(val)) ? (parseFloat(newRow.qty) * parseFloat(val)).toFixed(2) : '';
      else if (field === 'total') newRow.price = (parseFloat(newRow.qty) && parseFloat(val)) ? (parseFloat(val) / parseFloat(newRow.qty)).toFixed(2) : '';
      else if (field === 'qty') newRow.total = (parseFloat(val) && parseFloat(newRow.price)) ? (parseFloat(val) * parseFloat(newRow.price)).toFixed(2) : '';
      return newRow;
    }));
  }
  function handleCategoryChange(i, val) {
    setNewRows(r => r.map((row, idx) => idx === i ? { ...row, categoryId: val, itemId: '' } : row));
  }

  function handleEditChange(id, field, val, raw) {
    setPendingEdits(prev => {
      const current = prev[id] || { ...raw };
      const next = { ...current, [field]: val };
      if (field === 'price') next.total = (parseFloat(next.qty) && parseFloat(val)) ? (parseFloat(next.qty) * parseFloat(val)).toFixed(2) : '';
      else if (field === 'total') next.price = (parseFloat(next.qty) && parseFloat(val)) ? (parseFloat(val) / parseFloat(next.qty)).toFixed(2) : '';
      else if (field === 'qty') next.total = (parseFloat(val) && parseFloat(next.price)) ? (parseFloat(val) * parseFloat(next.price)).toFixed(2) : '';
      return { ...prev, [id]: next };
    });
  }

  function openAddMode() { setAddingMode(true); setNewRows([emptyRow([])]); }
  function cancelAdd() { setAddingMode(false); setNewRows([]); }

  async function saveEntries() {
    if (!newRows.length) { setAddingMode(false); return; }
    setSaving(true);
    const backupRows = [...newRows];
    try {
      const enrichedRows = newRows.filter(r => r.itemId).map(r => {
        const itemObj  = items.find(i => i.id === r.itemId)  || {};
        const catObj   = categories.find(c => c.id === r.categoryId) || {};
        const storeObj = stores.find(s => s.id === r.storeId) || {};
        return { ...r, itemName: itemObj.name || '', category: catObj.name || '', store: storeObj.name || '' };
      });
      setNewRows([]);
      setAddingMode(false);
      if (enrichedRows.length > 0) await addPurchase(orgId, enrichedRows);
    } catch (e) {
      console.error(e);
      setNewRows(backupRows);
      setAddingMode(true);
      alert('Failed to save purchase');
    } finally { setSaving(false); }
  }

  async function saveEdits() {
    setSaving(true);
    try {
      const promises = Object.entries(pendingEdits).map(([id, data]) => {
        const itemObj  = items.find(i => i.id === data.itemId)  || {};
        const catObj   = categories.find(c => c.id === data.categoryId) || {};
        const storeObj = stores.find(s => s.id === data.storeId) || {};
        return updatePurchase(orgId, id, { ...data, itemName: itemObj.name || '', category: catObj.name || '', store: storeObj.name || '' });
      });
      await Promise.all(promises);
      setPendingEdits({});
      setEditingMode(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save edits');
    } finally { setSaving(false); }
  }

  const isViewer = role === 'Viewer';

  return (
    <div className="excel-section">
      <div className="section-header" style={{ justifyContent: 'flex-end', marginBottom: 10 }}>
        <div className="section-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!isViewer && (
            <>
              {!addingMode && !editingMode && (
                <>
                  <button className="btn-primary btn-sm" onClick={openAddMode}>
                    <FontAwesomeIcon icon={faPlus} /> Add Purchase
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditingMode(true)} title="Edit">
                    <FontAwesomeIcon icon={faPencil} />
                  </button>
                </>
              )}
              {addingMode && (
                <>
                  <button className="btn-primary btn-sm" onClick={saveEntries} disabled={saving}>
                    <FontAwesomeIcon icon={faCheck} /> {saving ? ' Saving…' : ' Save'}
                  </button>
                  <button className="btn-secondary btn-sm" onClick={cancelAdd} disabled={saving}>
                    <FontAwesomeIcon icon={faXmark} /> Cancel
                  </button>
                </>
              )}
              {editingMode && (
                <>
                  <button className="btn-primary btn-sm" onClick={saveEdits} disabled={saving}>
                    <FontAwesomeIcon icon={faCheck} /> {saving ? ' Saving…' : ' Save Edits'}
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => { setEditingMode(false); setPendingEdits({}); }} disabled={saving}>
                    <FontAwesomeIcon icon={faXmark} /> Cancel
                  </button>
                </>
              )}
            </>
          )}

          <button className="btn-secondary btn-sm"
            onClick={() => exportCSV(
              COLUMNS.slice(0, -1).map(c => c.label),
              filterState.filteredRows.map(r => r.slice(0, -1)),
              'purchases.csv'
            )}>
            <FontAwesomeIcon icon={faDownload} /> Export
          </button>
        </div>
      </div>

      {addingMode && (
        <div style={{ marginBottom: 12 }}>
          <div className="table-container">
            <table className="excel-table" onKeyDown={handleExcelKeyDown}>
              <thead>
                <tr>
                  <th style={{ minWidth: 120 }}>Date</th>
                  <th style={{ minWidth: 120 }}>Category</th>
                  <th style={{ minWidth: 160 }}>Item</th>
                  <th style={{ minWidth: 120 }}>Store</th>
                  <th style={{ minWidth: 80 }}>Qty</th>
                  <th style={{ minWidth: 70 }}>Unit</th>
                  <th style={{ minWidth: 90 }}>Price/Unit</th>
                  <th style={{ minWidth: 90 }}>Total</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {newRows.map((row, i) => (
                  <tr key={i} className="entry-row">
                    <td><input type="date" className="excel-input" value={row.date} onChange={e => updateEntry(i, 'date', e.target.value)} /></td>
                    <td>
                      <select className="excel-input" value={row.categoryId} onChange={e => handleCategoryChange(i, e.target.value)}>
                        <option value="">Category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="excel-input" value={row.itemId} onChange={e => updateEntry(i, 'itemId', e.target.value)}>
                        <option value="">Item...</option>
                        {items.filter(item => item.categoryId === row.categoryId).map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select className="excel-input" value={row.storeId} onChange={e => updateEntry(i, 'storeId', e.target.value)}>
                        <option value="">Store...</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td><input type="number" className="excel-input" value={row.qty} onChange={e => updateEntry(i, 'qty', e.target.value)} placeholder="Qty" /></td>
                    <td>
                      <select className="excel-input" value={row.unit} onChange={e => updateEntry(i, 'unit', e.target.value)}>
                        <option>kg</option><option>L</option><option>pcs</option><option>bags</option>
                      </select>
                    </td>
                    <td><input type="number" className="excel-input" value={row.price} onChange={e => updateEntry(i, 'price', e.target.value)} placeholder="0.00" /></td>
                    <td>
                      <input type="number" className="excel-input highlight-col" value={row.total || ''} onChange={e => updateEntry(i, 'total', e.target.value)} placeholder="0.00" style={{ fontWeight: 600, color: 'var(--primary)' }} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-secondary btn-sm" onClick={() => removeEntry(i)}>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={addEntryRow}>
            <FontAwesomeIcon icon={faPlus} /> Add Row
          </button>
        </div>
      )}

      <ExcelTable columns={COLUMNS} filterable filterState={filterState}>
        <tbody>
          {filterState.filteredRows.map((row, i) => {
            const raw = row[9];
            const edited = pendingEdits[raw.id] || raw;
            const isEditing = editingMode && canEditPastEntry(raw.date, role, isAdmin);
            
            return (
              <tr key={raw.id}>
                <td>
                  {isEditing ? <input type="date" className="excel-input" value={edited.date} onChange={e => handleEditChange(raw.id, 'date', e.target.value, raw)} style={{ border: 'none' }} /> : formatDate(row[0])}
                </td>
                <td>
                  {isEditing ? (
                    <select className="excel-input" value={edited.categoryId} onChange={e => handleEditChange(raw.id, 'categoryId', e.target.value, raw)} style={{ border: 'none' }}>
                      <option value="">Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : <Tag category={row[1]} />}
                </td>
                <td>
                  {isEditing ? (
                    <select className="excel-input" value={edited.itemId} onChange={e => handleEditChange(raw.id, 'itemId', e.target.value, raw)} style={{ border: 'none' }}>
                      <option value="">Item...</option>
                      {items.filter(item => item.categoryId === edited.categoryId).map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  ) : row[2]}
                </td>
                <td>
                  {isEditing ? (
                    <select className="excel-input" value={edited.storeId} onChange={e => handleEditChange(raw.id, 'storeId', e.target.value, raw)} style={{ border: 'none' }}>
                      <option value="">Store...</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : row[3]}
                </td>
                <td className="num-col">
                  {isEditing ? <input type="number" className="excel-input" value={edited.qty} onChange={e => handleEditChange(raw.id, 'qty', e.target.value, raw)} style={{ border: 'none', textAlign: 'right' }} /> : row[4]}
                </td>
                <td>
                  {isEditing ? (
                    <select className="excel-input" value={edited.unit} onChange={e => handleEditChange(raw.id, 'unit', e.target.value, raw)} style={{ border: 'none' }}>
                      <option>kg</option><option>L</option><option>pcs</option><option>bags</option>
                    </select>
                  ) : row[5]}
                </td>
                <td className="num-col">
                  {isEditing ? <input type="number" className="excel-input" value={edited.price} onChange={e => handleEditChange(raw.id, 'price', e.target.value, raw)} style={{ border: 'none', textAlign: 'right' }} /> : row[6]}
                </td>
                <td className="num-col highlight-col">
                  {isEditing ? <input type="number" className="excel-input" value={edited.total || ''} onChange={e => handleEditChange(raw.id, 'total', e.target.value, raw)} style={{ border: 'none', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }} /> : row[7]}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {editingMode && (
                    <button className="btn-secondary btn-sm" onClick={() => deletePurchase(orgId, raw.id)}>
                      <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {filterState.filteredRows.length === 0 && !addingMode && (
            <tr><td colSpan={9} className="empty-state">No purchases recorded yet.</td></tr>
          )}
        </tbody>
      </ExcelTable>
    </div>
  );
}
