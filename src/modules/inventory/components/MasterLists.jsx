// src/modules/inventory/components/MasterLists.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  addItem, updateItem, deleteItem,
  addCategory, updateCategory, deleteCategory,
  addStore, updateStore, deleteStore,
} from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';
import { handleExcelKeyDown } from '../../../utils/keyboardNavigation';

export default function MasterLists({ items, categories, stores }) {
  const { orgId, role } = useAuth();
  const [editing, setEditing] = useState(false);

  // Add-row states
  const [addingItem, setAddingItem]         = useState(false);
  const [newItem, setNewItem]               = useState({ name: '', categoryId: '', unit: 'kg' });
  const [addingStore, setAddingStore]       = useState(false);
  const [newStore, setNewStore]             = useState({ name: '' });
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory]       = useState({ name: '' });

  // Saving guards (prevent double-click)
  const [savingStore, setSavingStore]       = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingItem, setSavingItem]         = useState(false);
  const [saving, setSaving]                 = useState(false);

  // Staged edits (committed together on "Save Edits")
  const [storeEdits, setStoreEdits]         = useState({});
  const [categoryEdits, setCategoryEdits]   = useState({});
  const [itemEdits, setItemEdits]           = useState({});

  async function handleSaveEdits() {
    setSaving(true);
    try {
      const promises = [];
      for (const [id, changes] of Object.entries(storeEdits))
        if (Object.keys(changes).length > 0) promises.push(updateStore(orgId, id, changes));
      for (const [id, changes] of Object.entries(categoryEdits))
        if (Object.keys(changes).length > 0) promises.push(updateCategory(orgId, id, changes));
      for (const [id, changes] of Object.entries(itemEdits))
        if (Object.keys(changes).length > 0) promises.push(updateItem(orgId, id, changes));
      await Promise.all(promises);
      setStoreEdits({}); setCategoryEdits({}); setItemEdits({});
      cancelAdding();
      setEditing(false);
    } catch (e) {
      alert('Failed to save changes: ' + (e.message || 'Unknown error'));
    } finally { setSaving(false); }
  }

  function cancelAdding() {
    setAddingStore(false);    setNewStore({ name: '' });
    setAddingCategory(false); setNewCategory({ name: '' });
    setAddingItem(false);     setNewItem({ name: '', categoryId: '', unit: 'kg' });
  }

  async function confirmAddStore() {
    if (!newStore.name.trim() || savingStore) return;
    setSavingStore(true);
    const toSave = { name: newStore.name.trim() };
    try {
      setAddingStore(false);
      setNewStore({ name: '' });
      await addStore(orgId, toSave);
    } catch (e) {
      setNewStore(toSave);
      setAddingStore(true);
      alert('Failed to save store: ' + e.message);
    } finally { setSavingStore(false); }
  }

  async function confirmAddCategory() {
    if (!newCategory.name.trim() || savingCategory) return;
    setSavingCategory(true);
    const toSave = { name: newCategory.name.trim() };
    try {
      setAddingCategory(false);
      setNewCategory({ name: '' });
      await addCategory(orgId, toSave);
    } catch (e) {
      setNewCategory(toSave);
      setAddingCategory(true);
      alert('Failed to save category: ' + e.message);
    } finally { setSavingCategory(false); }
  }

  // Bug fix: close form AFTER Firestore write confirms, and only if name+category are valid.
  // The ghost-row flicker was caused by closing the form row before onSnapshot fires.
  // We now close the input row immediately but keep the saved data visible via onSnapshot.
  async function confirmAddItem() {
    if (!newItem.name.trim() || !newItem.categoryId || savingItem) return;
    setSavingItem(true);
    const toSave = { ...newItem, name: newItem.name.trim() };
    try {
      // Close the add-row first to avoid ghost row when onSnapshot fires
      setAddingItem(false);
      setNewItem({ name: '', categoryId: '', unit: 'kg' });
      await addItem(orgId, toSave);
    } catch (e) {
      // If write failed, re-open the form with the data
      setNewItem(toSave);
      setAddingItem(true);
      alert('Failed to save item: ' + e.message);
    } finally { setSavingItem(false); }
  }

  return (
    <div className="excel-section">
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h3>Store, Categories &amp; Items</h3>
        {role !== 'Viewer' && (
          <button
            className={`${editing ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => editing ? handleSaveEdits() : setEditing(true)}
            disabled={saving}
          >
            <FontAwesomeIcon icon={editing ? faCheck : faPencil} />
          </button>
        )}
      </div>

      {/* Stack vertically */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── STORES ───────────────────────────────────────────── */}
        <div>
          <div className="section-header" style={{ marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>Stores</h4>
            {editing && !addingStore && (
              <button className="btn-primary btn-sm" onClick={() => setAddingStore(true)}>
                <FontAwesomeIcon icon={faPlus} /> Add
              </button>
            )}
          </div>
          <div className="table-container">
            <table className="excel-table sm-table no-filter-table master-list-table" onKeyDown={handleExcelKeyDown}>
              <thead>
                <tr><th>Store Name</th><th style={{ width: 40 }}></th></tr>
              </thead>
              <tbody>
                {addingStore && (
                  <tr>
                    <td>
                      <input autoFocus className="excel-input"
                        value={newStore.name}
                        onChange={e => setNewStore({ name: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && confirmAddStore()}
                        placeholder="Store name" />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="btn-primary btn-sm" disabled={savingStore} onClick={confirmAddStore}>
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => { setAddingStore(false); setNewStore({ name: '' }); }}>
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {stores.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {editing
                        ? <input className="excel-input" value={storeEdits[row.id]?.name ?? row.name}
                            onChange={e => setStoreEdits(p => ({ ...p, [row.id]: { ...p[row.id], name: e.target.value } }))} />
                        : row.name}
                    </td>
                    <td>
                      {editing && (
                        <button className="btn-secondary btn-sm" onClick={async () => {
                          try { await deleteStore(orgId, row.id); } catch (e) { alert(e.message); }
                        }}>
                          <FontAwesomeIcon icon={faXmark} style={{ color: '#e74c3c' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {stores.length === 0 && !addingStore && (
                  <tr><td colSpan={2} className="empty-state">No stores yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── CATEGORIES ───────────────────────────────────────── */}
        <div>
          <div className="section-header" style={{ marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>Categories</h4>
            {editing && !addingCategory && (
              <button className="btn-primary btn-sm" onClick={() => setAddingCategory(true)}>
                <FontAwesomeIcon icon={faPlus} /> Add
              </button>
            )}
          </div>
          <div className="table-container">
            <table className="excel-table sm-table no-filter-table master-list-table" onKeyDown={handleExcelKeyDown}>
              <thead>
                <tr><th>Category Name</th><th style={{ width: 40 }}></th></tr>
              </thead>
              <tbody>
                {addingCategory && (
                  <tr>
                    <td>
                      <input autoFocus className="excel-input"
                        value={newCategory.name}
                        onChange={e => setNewCategory({ name: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && confirmAddCategory()}
                        placeholder="Category name" />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="btn-primary btn-sm" disabled={savingCategory} onClick={confirmAddCategory}>
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => { setAddingCategory(false); setNewCategory({ name: '' }); }}>
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {categories.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {/* System categories are read-only */}
                      {editing && !row.isSystem
                        ? <input className="excel-input" value={categoryEdits[row.id]?.name ?? row.name}
                            onChange={e => setCategoryEdits(p => ({ ...p, [row.id]: { ...p[row.id], name: e.target.value } }))} />
                        : row.name}
                    </td>
                    <td>
                      {editing && !row.isSystem && (
                        <button className="btn-secondary btn-sm" onClick={async () => {
                          try { await deleteCategory(orgId, row.id); } catch (e) { alert(e.message); }
                        }}>
                          <FontAwesomeIcon icon={faXmark} style={{ color: '#e74c3c' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && !addingCategory && (
                  <tr><td colSpan={2} className="empty-state">No categories yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ITEMS ────────────────────────────────────────────── */}
        <div>
          <div className="section-header" style={{ marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>Items</h4>
            {editing && !addingItem && (
              <button className="btn-primary btn-sm" onClick={() => setAddingItem(true)}>
                <FontAwesomeIcon icon={faPlus} /> Add
              </button>
            )}
          </div>
          <div className="table-container">
            <table className="excel-table sm-table no-filter-table master-list-table" onKeyDown={handleExcelKeyDown}>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {addingItem && (
                  <tr>
                    <td>
                      <input autoFocus className="excel-input"
                        value={newItem.name}
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && confirmAddItem()}
                        placeholder="Item name" />
                    </td>
                    <td>
                      <select className="excel-input" value={newItem.categoryId}
                        onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })}>
                        <option value="">Select category…</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="excel-input" value={newItem.unit}
                        onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="pcs">pcs</option>
                        <option value="bags">bags</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="btn-primary btn-sm" disabled={savingItem} onClick={confirmAddItem}>
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => { setAddingItem(false); setNewItem({ name: '', categoryId: '', unit: 'kg' }); }}>
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {editing
                        ? <input className="excel-input" value={itemEdits[row.id]?.name ?? row.name}
                            onChange={e => setItemEdits(p => ({ ...p, [row.id]: { ...p[row.id], name: e.target.value } }))} />
                        : row.name}
                    </td>
                    <td>
                      {editing
                        ? (
                          <select className="excel-input"
                            value={itemEdits[row.id]?.categoryId ?? row.categoryId ?? ''}
                            onChange={e => setItemEdits(p => ({ ...p, [row.id]: { ...p[row.id], categoryId: e.target.value } }))}>
                            <option value="">None</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        )
                        : (categories.find(c => c.id === row.categoryId)?.name || '-')}
                    </td>
                    <td>
                      {editing
                        ? (
                          <select className="excel-input"
                            value={itemEdits[row.id]?.unit ?? row.unit ?? 'kg'}
                            onChange={e => setItemEdits(p => ({ ...p, [row.id]: { ...p[row.id], unit: e.target.value } }))}>
                            <option value="kg">kg</option>
                            <option value="L">L</option>
                            <option value="pcs">pcs</option>
                            <option value="bags">bags</option>
                          </select>
                        )
                        : row.unit}
                    </td>
                    <td>
                      {editing && (
                        <button className="btn-secondary btn-sm" onClick={async () => {
                          try { await deleteItem(orgId, row.id); } catch (e) { alert(e.message); }
                        }}>
                          <FontAwesomeIcon icon={faXmark} style={{ color: '#e74c3c' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !addingItem && (
                  <tr><td colSpan={4} className="empty-state">No items yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
