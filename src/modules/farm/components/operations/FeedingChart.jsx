// src/modules/farm/components/operations/FeedingChart.jsx
import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faPlus, faTrash, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import { addFeedEntry, updateFeedEntry, deleteFeedEntry } from '../../../../services/farm.service';
import { useAuth } from '../../../../contexts/AuthContext';
import { useAppContext } from '../../../../contexts/AppContext';

import { formatDate, canEditPastEntry } from '../../../../utils/dateFormatter';
import { handleExcelKeyDown } from '../../../../utils/keyboardNavigation';

function getToday() { return new Date().toISOString().split('T')[0]; }

export default function FeedingChart({ farmId, pondId, cycleId, rows, stockingDate, onAddEntry }) {
  const { orgId, role, isAdmin } = useAuth();
  const { feedSlots } = useAppContext();
  const [editing, setEditing]     = useState(false);
  const [pending, setPending]     = useState({}); // { [rowId]: { [slot]: val, manualTotal?: val } }
  // Track which rows are in "manual total" mode (user typed directly into Total)
  const [manualTotalRows, setManualTotalRows] = useState({});
  const newRowRef = useRef(null); // ref to the date cell of the latest added row

  // ── Save / Cancel ─────────────────────────────────────────────────────────

  async function handleSave() {
    const saves = Object.entries(pending).map(([id, data]) =>
      updateFeedEntry(orgId, farmId, pondId, cycleId, id, data).catch(console.error)
    );
    await Promise.all(saves);
    setPending({});
    setManualTotalRows({});
    setEditing(false);
  }

  function handleCancel() {
    setPending({});
    setManualTotalRows({});
    setEditing(false);
  }

  // ── Cell helpers ──────────────────────────────────────────────────────────

  function handleCellChange(rowId, field, val) {
    // Typing into a slot clears manual total mode for that row
    if (field !== 'manualTotal') {
      setManualTotalRows(m => ({ ...m, [rowId]: false }));
    }
    setPending(p => ({
      ...p,
      [rowId]: { ...(p[rowId] || {}), [field]: val },
    }));
  }

  function handleManualTotalChange(rowId, val) {
    // Mark this row as manual-total mode; clear slot values from pending
    setManualTotalRows(m => ({ ...m, [rowId]: true }));
    setPending(p => {
      const cleared = {};
      feedSlots.forEach(slot => { cleared[slot] = 0; });
      return {
        ...p,
        [rowId]: { ...cleared, manualTotal: val },
      };
    });
  }

  function cellValue(row, field) {
    return pending[row.id]?.[field] ?? row[field] ?? 0;
  }

  /** Returns the total to DISPLAY. Prefers manualTotal if that mode is active. */
  function getDisplayTotal(row) {
    const isManual = manualTotalRows[row.id] ?? (row.manualTotal != null && feedSlots.every(s => !row[s]));
    if (isManual) {
      return pending[row.id]?.manualTotal ?? row.manualTotal ?? 0;
    }
    return feedSlots.reduce((sum, f) => sum + (parseFloat(cellValue(row, f)) || 0), 0);
  }

  function isManualMode(row) {
    if (manualTotalRows[row.id] === true) return true;
    if (manualTotalRows[row.id] === false) return false;
    // Derive from stored data: if manualTotal is set and all slots are 0/empty, treat as manual
    return row.manualTotal != null && feedSlots.every(s => !(row[s]));
  }

  // ── Add Row ───────────────────────────────────────────────────────────────

  async function addRow() {
    const entry = { date: getToday(), manualTotal: null };
    feedSlots.forEach(slot => { entry[slot] = 0; });
    await addFeedEntry(orgId, farmId, pondId, cycleId, entry);
    // Auto-enter edit mode so the new row's inputs are immediately usable
    setEditing(true);
  }

  async function deleteRow(id) {
    await deleteFeedEntry(orgId, farmId, pondId, cycleId, id);
  }

  const [isExpanded, setIsExpanded] = useState(false);

  // ── Render ────────────────────────────────────────────────────────────────
  const displayedRows = isExpanded || editing ? rows : rows.slice(0, 5);

  return (
    <div className="excel-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3>Feeding Chart</h3>
          {rows.length > 5 && !editing && (
            <button className="btn-secondary btn-sm" onClick={() => setIsExpanded(!isExpanded)} style={{ padding: '2px 6px', height: 24, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isExpanded ? <><FontAwesomeIcon icon={faCompress} /> Collapse</> : <><FontAwesomeIcon icon={faExpand} /> View All ({rows.length})</>}
            </button>
          )}
        </div>
        <div className="section-actions">
          {role !== 'Viewer' && (
            <>
              {editing ? (
                <>
                  <button className="btn-primary btn-sm" onClick={handleSave}>
                    <FontAwesomeIcon icon={faCheck} /> Save List
                  </button>
                  <button className="btn-secondary btn-sm" onClick={handleCancel}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => setEditing(true)} title="Edit List">
                  <FontAwesomeIcon icon={faPencil} />
                </button>
              )}
              <button className="btn-primary btn-sm" onClick={onAddEntry || addRow}>
                <FontAwesomeIcon icon={faPlus} /> Add Feed
              </button>
            </>
          )}
        </div>
      </div>
      <div className="table-container">
        <table className="excel-table no-filter-table" onKeyDown={handleExcelKeyDown}>
          <thead>
            <tr>
              <th>Date</th>
              {feedSlots.map(slot => (
                <th key={slot} className="num-col">{slot} (kg)</th>
              ))}
              {/* Total column header hint */}
              <th className="num-col highlight-col" title="Type here to enter total directly, or fill individual slots above">
                Total (kg) ✎
              </th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row, idx) => {
              const manual = isManualMode(row);
              const rowEditable = editing && canEditPastEntry(row.date, role, isAdmin);
              return (
                <tr key={row.id} ref={idx === displayedRows.length - 1 ? newRowRef : null}>
                  {/* Date */}
                  <td>
                    {rowEditable ? (
                      <input
                        type="date"
                        className="excel-input"
                        style={{ border: 'none', width: '100%' }}
                        value={cellValue(row, 'date') || row.date}
                        max={getToday()}
                        min={stockingDate || undefined}
                        onChange={(e) => handleCellChange(row.id, 'date', e.target.value)}
                        // Auto-focus the most recently added row's date cell
                        autoFocus={idx === displayedRows.length - 1 && editing}
                      />
                    ) : formatDate(row.date)}
                  </td>

                  {/* Per-slot cells */}
                  {feedSlots.map((f) => (
                    <td key={f} className="num-col">
                      {rowEditable ? (
                        <input
                          type="number"
                          className="excel-input"
                          style={{
                            border: 'none', textAlign: 'right', width: '100%',
                            // Dim slot inputs when manual total mode is active
                            opacity: manual ? 0.4 : 1,
                          }}
                          value={cellValue(row, f)}
                          onChange={(e) => handleCellChange(row.id, f, e.target.value)}
                          placeholder="0"
                        />
                      ) : (
                        <span style={{ opacity: manual ? 0.4 : 1 }}>
                          {cellValue(row, f) || '-'}
                        </span>
                      )}
                    </td>
                  ))}

                  {/* Total — always editable regardless of edit mode */}
                  <td className="num-col highlight-col">
                    {rowEditable ? (
                      <input
                        type="number"
                        className="excel-input"
                        style={{
                          border: 'none', textAlign: 'right', width: '100%',
                          fontWeight: 600,
                          background: manual ? 'var(--highlight-bg)' : 'transparent',
                        }}
                        value={getDisplayTotal(row)}
                        onChange={(e) => handleManualTotalChange(row.id, e.target.value)}
                        placeholder="or type total"
                        title="Type here to bypass individual slots and enter total directly"
                      />
                    ) : (
                      <strong>{getDisplayTotal(row) || '-'}</strong>
                    )}
                  </td>

                  {/* Delete */}
                  <td style={{ textAlign: 'center' }}>
                    {rowEditable && (
                      <button className="btn-secondary btn-sm" onClick={() => deleteRow(row.id)}>
                        <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length > 5 && !isExpanded && !editing && (
              <tr>
                <td colSpan={feedSlots.length + 3} style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-main)' }}>
                  <button className="btn-secondary btn-sm" onClick={() => setIsExpanded(true)} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 600 }}>
                    Show {rows.length - 5} more rows...
                  </button>
                </td>
              </tr>
            )}
            {rows.length === 0 && (
              <tr>
                <td colSpan={feedSlots.length + 3} className="empty-state">
                  No feeding records yet. Click <strong>Add Feed</strong> to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
