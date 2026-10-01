// src/modules/farm/modals/RecordUsageModal.jsx
// Two-step modal: first pick Feed or Other, then show the appropriate table.
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCookieBite, faFlask, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { subscribeItems, subscribeCategories } from '../../../services/inventory.service';
import { handleExcelKeyDown } from '../../../utils/keyboardNavigation';
import { useAuth } from '../../../contexts/AuthContext';
import { writeBatch, doc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAppContext } from '../../../contexts/AppContext';

function getToday() { return new Date().toISOString().split('T')[0]; }

function emptyFeedRow(ponds, feedSlots, forceBlankPond = false) {
  const lastItemId = localStorage.getItem('aquanubandh_lastFeedItem') || '';
  const row = { 
    date: getToday(), 
    pondId: forceBlankPond ? '' : (ponds[0]?.id || ''), 
    pond: forceBlankPond ? '' : (ponds[0]?.name || ''), 
    item: '', 
    itemId: lastItemId, 
    unit: 'kg', 
    total: '', 
    _manualTotal: false 
  };
  feedSlots.forEach(slot => { row[slot] = ''; });
  return row;
}

function emptyOtherRow(ponds, forceBlankPond = false) {
  return { 
    date: getToday(), 
    pondId: forceBlankPond ? '' : (ponds[0]?.id || ''), 
    pond: forceBlankPond ? '' : (ponds[0]?.name || ''), 
    categoryId: '', 
    itemId: '', 
    qty: '', 
    unit: 'kg' 
  };
}

function FeedTable({ rows, ponds, feedSlots, update, updateRow, removeRow, items, categories, fetchedSlots }) {
  function handleSlotChange(i, slot, val) {
    const current = rows[i];
    const merged = { ...current, [slot]: val };
    
    // Only sum the NEW slots for the deduction total
    const existing = fetchedSlots[i] || {};
    let newlyAddedTotal = 0;
    feedSlots.forEach(s => { 
      if (existing[s] !== undefined && existing[s] !== '') return; // Skip existing slots
      newlyAddedTotal += (parseFloat(merged[s]) || 0);
    });
    
    updateRow(i, { [slot]: val, total: newlyAddedTotal || '', _manualTotal: false });
  }

  function handleTotalChange(i, val) {
    const zeroed = { total: val, _manualTotal: true };
    feedSlots.forEach(s => { 
      // Clear out any new slots if they switch to manual total
      const existing = fetchedSlots[i] || {};
      if (existing[s] === undefined || existing[s] === '') {
        zeroed[s] = 0; 
      }
    });
    updateRow(i, zeroed);
  }

  return (
    <table className="excel-table" onKeyDown={handleExcelKeyDown}>
      <thead>
        <tr>
          <th style={{ width: 120 }}>Date</th><th style={{ width: 90 }}>Pond</th>
          <th style={{ width: 160 }}>Feed Item</th><th style={{ width: 60 }}>Unit</th>
          {feedSlots.map(slot => <th key={slot} style={{ width: 80 }}>{slot}</th>)}
          <th style={{ width: 80 }} className="highlight-col" title="Newly added total to be deducted from inventory">
            New Qty ✎
          </th>
          <th style={{ width: 40 }}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const existing = fetchedSlots[i] || {};
          return (
            <tr key={i} className="entry-row">
              <td><input type="date" className="excel-input" value={row.date} max={getToday()} onChange={(e) => update(i, 'date', e.target.value)} /></td>
              <td>
                <select className="excel-input" value={row.pondId} onChange={(e) => {
                  const p = ponds.find(p => p.id === e.target.value);
                  update(i, 'pondId', e.target.value);
                  update(i, 'pond', p?.name || '');
                }}>
                  <option value="">Select Pond...</option>
                  {ponds.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </td>
              <td>
                <select className="excel-input" value={row.itemId} onChange={(e) => {
                  update(i, 'itemId', e.target.value);
                  localStorage.setItem('aquanubandh_lastFeedItem', e.target.value);
                }}>
                  <option value="">Select Item...</option>
                  {items.filter(item => categories.find(c => c.id === item.categoryId)?.isFeedCategory).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <select className="excel-input" value={row.unit} onChange={(e) => update(i, 'unit', e.target.value)}>
                  <option>kg</option><option>bags</option>
                </select>
              </td>
              {feedSlots.map(slot => {
                const isExisting = existing[slot] !== undefined && existing[slot] !== '';
                return (
                  <td key={slot}>
                    <input
                      type="number" className="excel-input" value={row[slot]}
                      onChange={(e) => handleSlotChange(i, slot, e.target.value)}
                      placeholder="0"
                      disabled={isExisting}
                      style={{ 
                        opacity: row._manualTotal ? 0.4 : 1,
                        background: isExisting ? 'var(--bg-color)' : 'transparent',
                        color: isExisting ? 'var(--text-muted)' : 'inherit'
                      }}
                      title={isExisting ? 'Already recorded earlier today' : undefined}
                    />
                  </td>
                );
              })}
              <td className="highlight-col">
                <input
                  type="number" className="excel-input"
                  value={row.total}
                  onChange={(e) => handleTotalChange(i, e.target.value)}
                  placeholder="0"
                  style={{ fontWeight: 600, background: row._manualTotal ? 'var(--highlight-bg)' : 'transparent', border: 'none' }}
                />
              </td>
              <td style={{ textAlign: 'center' }}>
                <button className="btn-secondary btn-sm" onClick={() => removeRow(i)}><FontAwesomeIcon icon={faXmark} /></button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function OtherTable({ rows, ponds, update, removeRow, items, categories }) {
  const nonFeedCategories = categories.filter(c => !c.isFeedCategory);
  function handleCategoryChange(i, val) {
    update(i, 'categoryId', val);
    update(i, 'itemId', ''); // Reset item when category changes
  }
  return (
    <table className="excel-table" onKeyDown={handleExcelKeyDown}>
      <thead>
        <tr>
          <th style={{ width: 120 }}>Date</th><th style={{ width: 90 }}>Pond</th>
          <th style={{ width: 110 }}>Category</th><th style={{ width: 180 }}>Item Used</th>
          <th style={{ width: 70 }}>Qty</th><th style={{ width: 70 }}>Unit</th>
          <th style={{ width: 40 }}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="entry-row">
            <td><input type="date" className="excel-input" value={row.date} max={getToday()} onChange={(e) => update(i, 'date', e.target.value)} /></td>
            <td>
              <select className="excel-input" value={row.pondId} onChange={(e) => {
                const p = ponds.find(p => p.id === e.target.value);
                update(i, 'pondId', e.target.value);
                update(i, 'pond', p?.name || '');
              }}>
                <option value="">Select Pond...</option>
                {ponds.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </td>
            <td>
              <select className="excel-input" value={row.categoryId} onChange={(e) => handleCategoryChange(i, e.target.value)}>
                <option value="">Select...</option>
                {nonFeedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </td>
            <td>
              <select className="excel-input" value={row.itemId} onChange={(e) => update(i, 'itemId', e.target.value)}>
                <option value="">Select Item...</option>
                {items.filter(item => item.categoryId === row.categoryId).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </td>
            <td><input type="number" className="excel-input" value={row.qty}  onChange={(e) => update(i, 'qty',  e.target.value)} placeholder="0" /></td>
            <td><select className="excel-input" value={row.unit} onChange={(e) => update(i, 'unit', e.target.value)}><option>kg</option><option>L</option><option>pcs</option></select></td>
            <td style={{ textAlign: 'center' }}><button className="btn-secondary btn-sm" onClick={() => removeRow(i)}><FontAwesomeIcon icon={faXmark} /></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function RecordUsageModal({ farmId, ponds, onClose, initialStep }) {
  const { orgId } = useAuth();
  const { feedSlots } = useAppContext();
  
  const [step, setStep] = useState(initialStep || 'type');
  const [rows, setRows] = useState(() => {
    if (initialStep === 'feed')  return [emptyFeedRow(ponds, feedSlots, true)];
    if (initialStep === 'other') return [emptyOtherRow(ponds, true)];
    return [];
  });
  const [fetchedSlots, setFetchedSlots] = useState({});
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const unsubItems = subscribeItems(orgId, setItems);
    const unsubCategories = subscribeCategories(orgId, setCategories);
    return () => { unsubItems(); unsubCategories(); };
  }, [orgId]);

  // Fetch existing feed for a row when its date or pond changes
  useEffect(() => {
    if (step !== 'feed') return;
    rows.forEach(async (row, i) => {
      if (!row.date || !row.pondId) return;
      
      const p = ponds.find(x => x.id === row.pondId);
      if (!p || !p.activeCycleId) return;

      try {
        const q = query(
          collection(db, 'organizations', orgId, 'farms', farmId, 'ponds', row.pondId, 'cycles', p.activeCycleId, 'feeding'),
          where('date', '==', row.date)
        );
        const snap = await getDocs(q);
        const existingSlots = {};
        snap.docs.forEach(d => {
          const data = d.data();
          feedSlots.forEach(s => {
            if (data[s] !== undefined && data[s] !== '') existingSlots[s] = data[s];
          });
        });

        // If the fetched slots are different, update state
        setFetchedSlots(prev => {
          const current = prev[i] || {};
          let changed = false;
          for (const s of feedSlots) {
            if (current[s] !== existingSlots[s]) changed = true;
          }
          if (!changed) return prev;
          
          return { ...prev, [i]: existingSlots };
        });

      } catch (err) {
        console.error("Failed to fetch existing feed", err);
      }
    });
  }, [rows.map(r => `${r.date}-${r.pondId}`).join(','), step, orgId, farmId, ponds, feedSlots]);

  // When fetched slots change, pre-fill them into the row
  useEffect(() => {
    if (step !== 'feed') return;
    setRows(currentRows => {
      let madeChange = false;
      const newRows = currentRows.map((row, i) => {
        const existing = fetchedSlots[i] || {};
        const updatedRow = { ...row };
        let rowChanged = false;
        for (const s of feedSlots) {
          if (existing[s] !== undefined && row[s] !== existing[s]) {
            updatedRow[s] = existing[s];
            rowChanged = true;
            madeChange = true;
          }
        }
        return rowChanged ? updatedRow : row;
      });
      return madeChange ? newRows : currentRows;
    });
  }, [fetchedSlots, feedSlots, step]);


  function startFeed()  { setStep('feed');  setRows([emptyFeedRow(ponds, feedSlots, true)]); }
  function startOther() { setStep('other'); setRows([emptyOtherRow(ponds, true)]); }

  function addRow() {
    setRows((r) => {
      const lastRow = r.length > 0 ? r[r.length - 1] : null;
      const date = lastRow ? lastRow.date : getToday();
      
      if (step === 'feed') {
        const newFeed = emptyFeedRow(ponds, feedSlots, true); // true = force blank pond
        const lastItemId = lastRow ? lastRow.itemId : (localStorage.getItem('aquanubandh_lastFeedItem') || '');
        return [...r, { ...newFeed, date, itemId: lastItemId }];
      } else {
        const newOther = emptyOtherRow(ponds, true);
        const lastCategoryId = lastRow ? lastRow.categoryId : '';
        const lastItemId = lastRow ? lastRow.itemId : '';
        return [...r, { ...newOther, date, categoryId: lastCategoryId, itemId: lastItemId }];
      }
    });
  }
  
  function removeRow(i) { 
    setRows((r) => r.filter((_, idx) => idx !== i)); 
    setFetchedSlots((prev) => {
      const next = { ...prev };
      delete next[i];
      return next;
    });
  }
  
  function update(i, field, val) { setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row)); }
  function updateRow(i, fields) { setRows((r) => r.map((row, idx) => idx === i ? { ...row, ...fields } : row)); }

  async function handleSave() {
    // 1. Filter out completely empty/0 rows before validation
    const validRows = rows.filter(r => {
      const qty = step === 'feed' ? parseFloat(r.total) : parseFloat(r.qty);
      return qty > 0;
    });

    if (validRows.length === 0) {
      onClose(); // Nothing valid to save, just close
      return;
    }

    // 2. Validate Items, Categories, and Ponds
    if (validRows.some(r => !r.pondId)) {
      alert("Please select a Pond for all entered rows.");
      return;
    }
    if (validRows.some(r => !r.itemId)) {
      alert("Please select an Item for all entered rows.");
      return;
    }
    if (step === 'other' && validRows.some(r => !r.categoryId)) {
      alert("Please select a Category for all entered rows.");
      return;
    }

    setLoading(true);
    try {
      // 3. Stock warning logic
      const skipWarning = localStorage.getItem('aquanubandh_skip_stock_warning') === 'true';
      if (!skipWarning) {
        const { getCurrentStock } = await import('../../../services/inventory.service');
        const currentStockList = await getCurrentStock(orgId);
        
        const usageTotals = {};
        validRows.forEach(r => {
          const qty = step === 'feed' ? parseFloat(r.total) || 0 : parseFloat(r.qty) || 0;
          usageTotals[r.itemId] = (usageTotals[r.itemId] || 0) + qty;
        });
        
        let willGoNegative = false;
        for (const itemId in usageTotals) {
           const stockItem = currentStockList.find(s => s.itemId === itemId);
           const currentQty = stockItem ? stockItem.qty : 0;
           if (currentQty - usageTotals[itemId] < 0) {
             willGoNegative = true;
             break;
           }
        }
        
        if (willGoNegative) {
          const proceed = window.confirm("Recording this usage will cause your inventory stock to drop below 0.\n\nDo you want to proceed?");
          if (!proceed) {
            setLoading(false);
            return;
          }
          const hideFuture = window.confirm("Would you like to hide this negative stock warning in the future?");
          if (hideFuture) {
            localStorage.setItem('aquanubandh_skip_stock_warning', 'true');
          }
        }
      }

      const enrichedRows = validRows.map(r => {
        const itemObj = items.find(i => i.id === r.itemId) || {};
        const resolvedCategoryId = step === 'feed' ? itemObj.categoryId : r.categoryId;
        const catObj = categories.find(c => c.id === resolvedCategoryId) || {};
        return {
          ...r,
          categoryId: resolvedCategoryId || '',
          itemName: itemObj.name || '',
          category: catObj.name || '',
        };
      });

      const batch = writeBatch(db);

      for (let i = 0; i < enrichedRows.length; i++) {
        const row = enrichedRows[i];
        const p = ponds.find(pond => pond.id === row.pondId);
        if (!p || !p.activeCycleId) continue; 
        
        // A) Create inventory_usage document
        const usageRef = doc(collection(db, 'organizations', orgId, 'inventory_usage'));
        const usageData = {
          ...row, 
          type: step,
          farmId,
          cycleId: p.activeCycleId,
          qty: step === 'feed' ? parseFloat(row.total) || 0 : parseFloat(row.qty) || 0,
          recordedAt: serverTimestamp()
        };
        batch.set(usageRef, usageData);

        // B) Create/Update pond subcollection document using the DATE as the document ID
        // This ensures "one pond, one day, one entry"
        const collName = step === 'feed' ? 'feeding' : 'consumables';
        const pondRef = doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', p.id, 'cycles', p.activeCycleId, collName, row.date);
        
        if (step === 'feed') {
          const feedPayload = {
            date: row.date, 
            item: row.itemName, 
            itemId: row.itemId,
            usageId: usageRef.id, // Keeps reference to the most recent usage ID
            manualTotal: row._manualTotal ? parseFloat(row.total) || 0 : null,
            recordedAt: serverTimestamp()
          };
          feedSlots.forEach(slot => { 
            const val = parseFloat(row[slot]);
            if (!isNaN(val)) feedPayload[slot] = val; 
          });
          // Merge is true so it adds new slots alongside old ones
          batch.set(pondRef, feedPayload, { merge: true });
        } else {
          // Consumables typically just add multiple rows per day
          const consumableRef = doc(collection(db, 'organizations', orgId, 'farms', farmId, 'ponds', p.id, 'cycles', p.activeCycleId, collName));
          const consumablePayload = {
            date: row.date,
            category: row.category,
            categoryId: row.categoryId,
            item: row.itemName,
            itemId: row.itemId,
            usageId: usageRef.id,
            qty: parseFloat(row.qty) || 0,
            unit: row.unit,
            recordedAt: serverTimestamp()
          };
          batch.set(consumableRef, consumablePayload);
        }
      }

      await batch.commit();
      onClose();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (step === 'type') {
    return (
      <>
        <div className="usage-type-buttons">
          <button className="btn-primary usage-type-btn" onClick={startFeed}>
            <FontAwesomeIcon icon={faCookieBite} style={{ fontSize: 24 }} />
            Feed
          </button>
          <button className="btn-secondary usage-type-btn" onClick={startOther}>
            <FontAwesomeIcon icon={faFlask} style={{ fontSize: 24 }} />
            Other Items
          </button>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-body-table" style={{ overflowX: 'auto' }}>
        {step === 'feed'
          ? <FeedTable  rows={rows} ponds={ponds} feedSlots={feedSlots} update={update} updateRow={updateRow} removeRow={removeRow} items={items} categories={categories} fetchedSlots={fetchedSlots} />
          : <OtherTable rows={rows} ponds={ponds} update={update} removeRow={removeRow} items={items} categories={categories} />
        }
      </div>
      <div className="modal-footer space-between">
        <button className="btn-secondary btn-sm" onClick={addRow}><FontAwesomeIcon icon={faPlus} /> Add Row</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Recording…' : 'Record'}</button>
        </div>
      </div>
    </>
  );
}
