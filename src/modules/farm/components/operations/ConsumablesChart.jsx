// src/modules/farm/components/operations/ConsumablesChart.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faPlus, faTrash, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import { addConsumable, updateConsumable, deleteConsumable } from '../../../../services/farm.service';
import { useAuth } from '../../../../contexts/AuthContext';
import Tag from '../../../../shared/components/Tag';
import EditableCell from '../../../../shared/components/EditableCell';
import { formatDate, canEditPastEntry } from '../../../../utils/dateFormatter';
import { handleExcelKeyDown } from '../../../../utils/keyboardNavigation';

const TODAY = new Date().toISOString().split('T')[0];

export default function ConsumablesChart({ farmId, pondId, cycleId, rows, stockingDate, onAddEntry }) {
  const { orgId, role, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);

  async function addRow() {
    await addConsumable(orgId, farmId, pondId, cycleId, {
      date: TODAY, item: 'New Item', category: 'Other', qty: 0, unit: 'kg', notes: '',
    });
  }

  async function deleteRow(id) {
    await deleteConsumable(orgId, farmId, pondId, cycleId, id);
  }

  async function handleCellCommit(id, field, value) {
    await updateConsumable(orgId, farmId, pondId, cycleId, id, { [field]: value });
  }

  const [isExpanded, setIsExpanded] = useState(false);
  const displayedRows = isExpanded || editing ? rows : rows.slice(0, 5);

  return (
    <div className="excel-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3>Consumables</h3>
          {rows.length > 5 && !editing && (
            <button className="btn-secondary btn-sm" onClick={() => setIsExpanded(!isExpanded)} style={{ padding: '2px 6px', height: 24, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isExpanded ? <><FontAwesomeIcon icon={faCompress} /> Collapse</> : <><FontAwesomeIcon icon={faExpand} /> View All ({rows.length})</>}
            </button>
          )}
        </div>
        <div className="section-actions">
          {role !== 'Viewer' && (
            <>
              <button className={`${editing ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setEditing((e) => !e)}>
                <FontAwesomeIcon icon={editing ? faCheck : faPencil} />
              </button>
              <button className="btn-primary btn-sm" onClick={onAddEntry || addRow}>
                <FontAwesomeIcon icon={faPlus} /> Add Consumable
              </button>
            </>
          )}
        </div>
      </div>
      <div className="table-container">
        <table className="excel-table no-filter-table" onKeyDown={handleExcelKeyDown}>
          <thead>
            <tr>
              <th>Date</th><th>Item</th><th>Category</th>
              <th className="num-col">Quantity</th><th>Unit</th><th>Notes</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => {
              const rowEditable = editing && canEditPastEntry(row.date, role, isAdmin);
              return (
              <tr key={row.id}>
                <td>{formatDate(row.date)}</td>
                <EditableCell value={row.item}     editing={rowEditable} onCommit={(v) => handleCellCommit(row.id, 'item', v)} />
                <td><Tag category={row.category} /></td>
                <EditableCell value={row.qty}      editing={rowEditable} className="editable-cell num-col" onCommit={(v) => handleCellCommit(row.id, 'qty', v)} />
                <EditableCell value={row.unit}     editing={rowEditable} onCommit={(v) => handleCellCommit(row.id, 'unit', v)} />
                <EditableCell value={row.notes}    editing={rowEditable} onCommit={(v) => handleCellCommit(row.id, 'notes', v)} />
                <td style={{ textAlign: 'center' }}>
                  {rowEditable && (
                    <button className="btn-secondary btn-sm" onClick={() => deleteRow(row.id)}>
                      <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                    </button>
                  )}
                </td>
              </tr>
            )})}
            {rows.length > 5 && !isExpanded && !editing && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-main)' }}>
                  <button className="btn-secondary btn-sm" onClick={() => setIsExpanded(true)} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 600 }}>
                    Show {rows.length - 5} more rows...
                  </button>
                </td>
              </tr>
            )}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No consumables recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
