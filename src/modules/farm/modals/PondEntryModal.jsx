// src/modules/farm/modals/PondEntryModal.jsx
// Single-pond version of RecordUsageModal — opens directly in feed, consumable or sampling mode.
// Used from PondDetail so the pond is already known; no type-selection step needed.
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { subscribeItems, subscribeCategories, recordUsage } from '../../../services/inventory.service';
import { addFeedEntry, addConsumable, addSampling } from '../../../services/farm.service';
import { useAuth } from '../../../contexts/AuthContext';
import { useAppContext } from '../../../contexts/AppContext';
import { handleExcelKeyDown } from '../../../utils/keyboardNavigation';

const TODAY = new Date().toISOString().split('T')[0];

// ─── Feed Row ──────────────────────────────────────────────────────────────────
function FeedRows({ rows, setRows, feedSlots, feedItems }) {
  function update(i, field, val) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }
  function calcTotal(i, updatedRow) {
    const t = feedSlots.reduce((s, slot) => s + (parseFloat(updatedRow[slot]) || 0), 0);
    return t;
  }
  function handleSlotChange(i, slot, val) {
    setRows(r => r.map((row, idx) => {
      if (idx !== i) return row;
      const updated = { ...row, [slot]: val };
      updated.total = feedSlots.reduce((s, f) => s + (parseFloat(updated[f]) || 0), 0) || '';
      return updated;
    }));
  }
  function handleTotalChange(i, val) {
    // Manual total — zero out individual slots
    setRows(r => r.map((row, idx) => {
      if (idx !== i) return row;
      const zeroed = { ...row, total: val, manualTotal: true };
      feedSlots.forEach(slot => { zeroed[slot] = 0; });
      return zeroed;
    }));
  }
  function removeRow(i) { setRows(r => r.filter((_, idx) => idx !== i)); }
  function addRow() {
    const lastItemId = localStorage.getItem('aquanubandh_lastFeedItem') || '';
    const base = { date: TODAY, itemId: lastItemId, unit: 'kg', total: '', manualTotal: false };
    feedSlots.forEach(slot => { base[slot] = ''; });
    setRows(r => [...r, { ...base, date: r[r.length - 1]?.date || TODAY }]);
  }

  return (
    <div>
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="excel-table" onKeyDown={handleExcelKeyDown}>
          <thead>
            <tr>
              <th style={{ minWidth: 130 }}>Date</th>
              <th style={{ minWidth: 180 }}>Feed Item *</th>
              <th style={{ minWidth: 70 }}>Unit</th>
              {feedSlots.map(slot => <th key={slot} style={{ minWidth: 80 }} className="num-col">{slot}</th>)}
              <th className="num-col highlight-col" title="Type here to enter total directly">Total (kg) ✎</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="entry-row">
                <td>
                  <input type="date" className="excel-input" value={row.date} max={TODAY}
                    onChange={e => update(i, 'date', e.target.value)} autoFocus={i === 0} />
                </td>
                <td>
                  <select className="excel-input" value={row.itemId}
                    onChange={e => {
                      update(i, 'itemId', e.target.value);
                      localStorage.setItem('aquanubandh_lastFeedItem', e.target.value);
                    }}>
                    <option value="">Select feed item…</option>
                    {feedItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  {feedItems.length === 0 && (
                    <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 2 }}>
                      No feed items in inventory — add them in Inventory → Items first.
                    </div>
                  )}
                </td>
                <td>
                  <select className="excel-input" value={row.unit} onChange={e => update(i, 'unit', e.target.value)}>
                    <option>kg</option><option>bags</option>
                  </select>
                </td>
                {feedSlots.map(slot => (
                  <td key={slot} className="num-col">
                    <input type="number" className="excel-input"
                      style={{ textAlign: 'right', border: 'none', width: '100%', opacity: row.manualTotal ? 0.4 : 1 }}
                      value={row[slot]} placeholder="0"
                      onChange={e => handleSlotChange(i, slot, e.target.value)} />
                  </td>
                ))}
                <td className="num-col highlight-col">
                  <input type="number" className="excel-input"
                    style={{ textAlign: 'right', border: 'none', width: '100%', fontWeight: 600 }}
                    value={row.total} placeholder="or type total"
                    onChange={e => handleTotalChange(i, e.target.value)}
                    title="Type here to skip individual slots" />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-secondary btn-sm" onClick={() => removeRow(i)}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="btn-secondary btn-sm" onClick={addRow}>
          <FontAwesomeIcon icon={faPlus} /> Add Row
        </button>
      </div>
    </div>
  );
}

// ─── Consumable Row ────────────────────────────────────────────────────────────
function ConsumableRows({ rows, setRows, items, categories }) {
  function update(i, field, val) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }
  function handleCategoryChange(i, catId) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, categoryId: catId, itemId: '' } : row));
  }
  function removeRow(i) { setRows(r => r.filter((_, idx) => idx !== i)); }
  function addRow() {
    setRows(r => [...r, {
      date: r[r.length - 1]?.date || TODAY,
      categoryId: '', itemId: '', qty: '', unit: 'kg',
    }]);
  }

  // Exclude "Feed" category from consumables (Feed has its own form)
  const nonFeedCats = categories.filter(c => !c.isFeedCategory && c.name !== 'Feed');

  return (
    <div>
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="excel-table" onKeyDown={handleExcelKeyDown}>
          <thead>
            <tr>
              <th style={{ minWidth: 130 }}>Date</th>
              <th style={{ minWidth: 130 }}>Category *</th>
              <th style={{ minWidth: 180 }}>Item *</th>
              <th style={{ minWidth: 80 }} className="num-col">Qty</th>
              <th style={{ minWidth: 70 }}>Unit</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="entry-row">
                <td>
                  <input type="date" className="excel-input" value={row.date} max={TODAY}
                    onChange={e => update(i, 'date', e.target.value)} autoFocus={i === 0} />
                </td>
                <td>
                  <select className="excel-input" value={row.categoryId}
                    onChange={e => handleCategoryChange(i, e.target.value)}>
                    <option value="">Select category…</option>
                    {nonFeedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="excel-input" value={row.itemId}
                    onChange={e => update(i, 'itemId', e.target.value)}>
                    <option value="">Select item…</option>
                    {items.filter(it => it.categoryId === row.categoryId).map(it => (
                      <option key={it.id} value={it.id}>{it.name}</option>
                    ))}
                  </select>
                </td>
                <td className="num-col">
                  <input type="number" className="excel-input" value={row.qty} placeholder="0"
                    onChange={e => update(i, 'qty', e.target.value)} />
                </td>
                <td>
                  <select className="excel-input" value={row.unit} onChange={e => update(i, 'unit', e.target.value)}>
                    <option>kg</option><option>L</option><option>pcs</option><option>g</option>
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-secondary btn-sm" onClick={() => removeRow(i)}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="btn-secondary btn-sm" onClick={addRow}>
          <FontAwesomeIcon icon={faPlus} /> Add Row
        </button>
      </div>
    </div>
  );
}

// ─── Sampling Row ─────────────────────────────────────────────────────────────
function SamplingRows({ rows, setRows }) {
  function update(i, field, val) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }
  function removeRow(i) { setRows(r => r.filter((_, idx) => idx !== i)); }
  function addRow() {
    setRows(r => [...r, { date: r[r.length - 1]?.date || TODAY, count: '' }]);
  }

  return (
    <div>
      <div className="table-container">
        <table className="excel-table" onKeyDown={handleExcelKeyDown}>
          <thead>
            <tr>
              <th style={{ minWidth: 150 }}>Date</th>
              <th style={{ minWidth: 160 }} className="num-col">Count (per kg) *</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="entry-row">
                <td>
                  <input type="date" className="excel-input" value={row.date} max={TODAY}
                    onChange={e => update(i, 'date', e.target.value)} autoFocus={i === 0} />
                </td>
                <td className="num-col">
                  <input type="number" className="excel-input" value={row.count} placeholder="0"
                    onChange={e => update(i, 'count', e.target.value)} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-secondary btn-sm" onClick={() => removeRow(i)}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="btn-secondary btn-sm" onClick={addRow}>
          <FontAwesomeIcon icon={faPlus} /> Add Row
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
const TITLES = { feed: 'Record Feed Entry', consumable: 'Record Consumable', sampling: 'Add Sampling' };

export default function PondEntryModal({ mode, farmId, pond, cycleId, onClose }) {
  const { orgId } = useAuth();
  const { feedSlots } = useAppContext();

  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Feed items = inventory items whose category is named "Feed" or flagged isFeedCategory
  const feedItems = items.filter(it => {
    const cat = categories.find(c => c.id === it.categoryId);
    return cat?.isFeedCategory || cat?.name === 'Feed';
  });

  useEffect(() => {
    const unsubItems = subscribeItems(orgId, setItems);
    const unsubCats  = subscribeCategories(orgId, setCategories);
    return () => { unsubItems(); unsubCats(); };
  }, [orgId]);

  // ── Row state per mode ────────────────────────────────────────────────────
  const makeEmptyFeedRow = () => {
    const lastItemId = localStorage.getItem('aquanubandh_lastFeedItem') || '';
    const row = { date: TODAY, itemId: lastItemId, unit: 'kg', total: '', manualTotal: false };
    feedSlots.forEach(s => { row[s] = ''; });
    return row;
  };
  const [feedRows,       setFeedRows]       = useState([makeEmptyFeedRow()]);
  const [consumableRows, setConsumableRows] = useState([{ date: TODAY, categoryId: '', itemId: '', qty: '', unit: 'kg' }]);
  const [samplingRows,   setSamplingRows]   = useState([{ date: TODAY, count: '' }]);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      if (mode === 'feed') {
        for (const row of feedRows) {
          const itemObj = items.find(it => it.id === row.itemId) || {};
          const payload = { date: row.date, item: itemObj.name || '', itemId: row.itemId };
          feedSlots.forEach(slot => { payload[slot] = parseFloat(row[slot]) || 0; });
          // If user typed total directly, distribute it as manualTotal
          payload.manualTotal = row.manualTotal ? (parseFloat(row.total) || null) : null;

          const catObj = categories.find(c => c.id === itemObj.categoryId) || { name: 'Feed' };

          // 1. Deduct from inventory stock
          const usageRefs = await recordUsage(orgId, [{ 
            ...row, 
            type: 'feed', 
            itemName: itemObj.name || '', 
            category: catObj.name,
            qty: parseFloat(row.total) || 0,
            farmId,
            pondId: pond.id,
            cycleId
          }]);
          const usageId = usageRefs[0].id;
          // 2. Write to pond cycle
          await addFeedEntry(orgId, farmId, pond.id, cycleId, { ...payload, usageId });
        }
      } else if (mode === 'consumable') {
        for (const row of consumableRows) {
          if (!row.itemId) continue;
          const itemObj = items.find(it => it.id === row.itemId) || {};
          const catObj  = categories.find(c => c.id === row.categoryId) || {};
          // 1. Deduct from inventory
          const usageRefs = await recordUsage(orgId, [{
            ...row, type: 'other',
            itemName: itemObj.name || '', category: catObj.name || '',
            farmId, pondId: pond.id, cycleId
          }]);
          const usageId = usageRefs[0].id;
          // 2. Write to pond cycle
          await addConsumable(orgId, farmId, pond.id, cycleId, {
            date: row.date,
            category: catObj.name || '',
            categoryId: row.categoryId,
            item: itemObj.name || '',
            itemId: row.itemId,
            usageId,
            qty: parseFloat(row.qty) || 0,
            unit: row.unit
          });
        }
      } else if (mode === 'sampling') {
        for (const row of samplingRows) {
          if (!row.count) continue;
          await addSampling(orgId, farmId, pond.id, cycleId, {
            date: row.date, count: Number(row.count),
          });
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="modal-body-table" style={{ overflowX: 'auto' }}>
        {/* Inventory warning banner for feed/consumable */}
        {mode === 'feed' && feedItems.length === 0 && (
          <div style={{
            padding: '10px 14px', marginBottom: 12,
            background: '#fffbeb', border: '1px solid #fcd34d',
            borderRadius: 5, fontSize: 13, color: '#92400e',
          }}>
            ⚠️ No feed items found in your inventory. Go to <strong>Inventory → Items</strong> and add feed items under a <strong>"Feed"</strong> category before recording feed usage.
          </div>
        )}

        {mode === 'feed' && (
          <FeedRows rows={feedRows} setRows={setFeedRows}
            feedSlots={feedSlots} feedItems={feedItems} />
        )}
        {mode === 'consumable' && (
          <ConsumableRows rows={consumableRows} setRows={setConsumableRows}
            items={items} categories={categories} />
        )}
        {mode === 'sampling' && (
          <SamplingRows rows={samplingRows} setRows={setSamplingRows} />
        )}

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 10 }}>{error}</div>
        )}
      </div>

      <div className="modal-footer space-between">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Pond: <strong>{pond?.name}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving…</> : 'Record'}
          </button>
        </div>
      </div>
    </>
  );
}

export { TITLES };
