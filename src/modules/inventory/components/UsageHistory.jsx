// src/modules/inventory/components/UsageHistory.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faXmark, faDownload, faTrash, faChevronDown, faChevronUp, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import ExcelTable from '../../../shared/components/ExcelTable';
import Tag from '../../../shared/components/Tag';
import { useTableFilter } from '../../../shared/hooks/useTableFilter';
import { useExportCSV } from '../hooks/useExportCSV';
import { updateUsage, deleteUsage } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';
import { formatDate, canEditPastEntry } from '../../../utils/dateFormatter';
import { useExportExcel } from '../hooks/useExportExcel';
import ExportMonthModal from '../../../shared/components/ExportMonthModal';

const COLUMNS = [
  { label: 'Date' },
  { label: 'Farm / Pond' },
  { label: 'Category' },
  { label: 'Item Used' },
  { label: 'Qty', numeric: true },
  { label: 'Unit' },
  { label: '', noFilter: true },
];

function UsageTable({ usage, items, categories, title, isExpandedByDefault = true, onExport }) {
  const { orgId, role, isAdmin } = useAuth();
  const { exportCSV } = useExportCSV();
  
  const [editing, setEditing] = useState(false);
  const [pendingEdits, setPendingEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isExpandedByDefault);

  const tableRows = usage.map((u) => [
    u.date, 
    u.pond || '-', 
    categories.find(c => c.id === u.categoryId)?.name || u.category || '-', 
    items.find(i => i.id === u.itemId)?.name || u.item || u.itemName || '-', 
    u.qty, u.unit, u.id,
    u // raw object
  ]);
  const filterState = useTableFilter(tableRows, COLUMNS, `usage_${title.replace(/\s+/g, '')}`);

  function handleEditChange(id, field, val, raw) {
    setPendingEdits(prev => {
      const current = prev[id] || { ...raw };
      return { ...prev, [id]: { ...current, [field]: val } };
    });
  }

  async function saveEdits() {
    setSaving(true);
    try {
      const promises = Object.entries(pendingEdits).map(([id, data]) => {
        const itemObj = items.find(i => i.id === data.itemId) || {};
        const catObj = categories.find(c => c.id === data.categoryId) || {};
        const updatedCategoryName = catObj.name || data.category || (data.type === 'feed' ? 'Feed' : '');
        const updatedItemName = itemObj.name || data.itemName || data.item || '';
        return updateUsage(orgId, id, { ...data, itemName: updatedItemName, category: updatedCategoryName });
      });
      await Promise.all(promises);
      setPendingEdits({});
      setEditing(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save edits');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="excel-section" style={{ marginBottom: 20 }}>
      <div className="section-header">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {title}
        </h3>
        <div className="section-actions">
          {role !== 'Viewer' && (
            <>
              {editing ? (
                <>
                  <button className="btn-primary btn-sm" onClick={saveEdits} disabled={saving}>
                    <FontAwesomeIcon icon={faCheck} /> {saving ? ' Saving…' : ' Save Edits'}
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => { setEditing(false); setPendingEdits({}); }} disabled={saving}>
                    <FontAwesomeIcon icon={faXmark} /> Cancel
                  </button>
                </>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
                  <FontAwesomeIcon icon={faPencil} />
                </button>
              )}
            </>
          )}
          <button className="btn-secondary btn-sm" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Collapse" : "Expand"}>
            <FontAwesomeIcon icon={isExpanded ? faCompress : faExpand} /> {isExpanded ? 'Collapse' : 'View All'}
          </button>
          <button className="btn-secondary btn-sm" onClick={() => setIsExportModalOpen(true)}>
            <FontAwesomeIcon icon={faDownload} /> Export
          </button>
        </div>
      </div>
      
      <ExportMonthModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={onExport}
      />
      
      <ExcelTable columns={COLUMNS} filterable filterState={filterState}>
        <tbody>
            {(isExpanded ? filterState.filteredRows : filterState.filteredRows.slice(0, 10)).map((row) => {
              const raw = row[7];
              const edited = pendingEdits[raw.id] || raw;
              const isEditing = editing && canEditPastEntry(raw.date, role, isAdmin);

              return (
                <tr key={raw.id}>
                  <td>
                    {isEditing ? <input type="date" className="excel-input" value={edited.date} onChange={e => handleEditChange(raw.id, 'date', e.target.value, raw)} style={{ border: 'none' }} /> : formatDate(row[0])}
                  </td>
                  <td>{row[1]}</td>
                  <td>
                    {isEditing ? (
                      <select className="excel-input" value={edited.categoryId} onChange={e => handleEditChange(raw.id, 'categoryId', e.target.value, raw)} style={{ border: 'none' }}>
                        <option value="">Category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : <Tag category={row[2]} />}
                  </td>
                  <td>
                    {isEditing ? (
                      <select className="excel-input" value={edited.itemId} onChange={e => handleEditChange(raw.id, 'itemId', e.target.value, raw)} style={{ border: 'none' }}>
                        <option value="">Item...</option>
                        {items.filter(item => item.categoryId === edited.categoryId).map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
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
                  <td style={{ textAlign: 'center' }}>
                    {editing && (
                      <button className="btn-secondary btn-sm" onClick={() => {
                        if (confirm('Delete this usage record? This will also correctly remove the entry from the pond.')) {
                          deleteUsage(orgId, raw.id);
                        }
                      }} title="Delete Usage Record">
                        <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filterState.filteredRows.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No records found.</td></tr>
            )}
        </tbody>
      </ExcelTable>
    </div>
  );
}

export default function UsageHistory({ usage, items = [], categories = [] }) {
  const feedUsage = usage.filter(u => u.type === 'feed' || (categories.find(c => c.id === u.categoryId)?.isFeedCategory));
  const otherUsage = usage.filter(u => u.type !== 'feed' && !(categories.find(c => c.id === u.categoryId)?.isFeedCategory));

  const { exportUsageMultiSheet } = useExportExcel();

  const handleExport = (months) => {
    exportUsageMultiSheet(usage, items, categories, months);
  };

  return (
    <div>
      <UsageTable usage={feedUsage} items={items} categories={categories} title="Feed Usage" isExpandedByDefault={false} onExport={handleExport} />
      <UsageTable usage={otherUsage} items={items} categories={categories} title="Other Items Usage" isExpandedByDefault={true} onExport={handleExport} />
    </div>
  );
}
