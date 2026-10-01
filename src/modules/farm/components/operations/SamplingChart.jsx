// src/modules/farm/components/operations/SamplingChart.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faPlus, faTrash, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import { addSampling, updateSampling, deleteSampling } from '../../../../services/farm.service';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSamplingCalc } from '../../hooks/useSamplingCalc';
import { formatDate, canEditPastEntry } from '../../../../utils/dateFormatter';
import { handleExcelKeyDown } from '../../../../utils/keyboardNavigation';

function getToday() { return new Date().toISOString().split('T')[0]; }

export default function SamplingChart({ farmId, pondId, cycleId, rows, stockingDate, onAddEntry }) {
  const { orgId, role, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  // pending: { [rowId]: { date?, count? } } — staged edits before saving
  const [pending, setPending] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);

  const enriched = useSamplingCalc(rows, stockingDate);

  function handleCellChange(rowId, field, val) {
    setPending((p) => ({
      ...p,
      [rowId]: { ...(p[rowId] || {}), [field]: val },
    }));
  }

  function cellValue(row, field) {
    return pending[row.id]?.[field] ?? row[field] ?? '';
  }

  async function toggleEdit() {
    if (editing) {
      // Save all pending edits to Firestore
      const saves = Object.entries(pending).map(([id, data]) =>
        updateSampling(orgId, farmId, pondId, cycleId, id, {
          ...data,
          count: data.count !== undefined ? Number(data.count) : undefined,
        })
      );
      await Promise.all(saves).catch(console.error);
      setPending({});
    }
    setEditing((e) => !e);
  }

  async function addRow() {
    await addSampling(orgId, farmId, pondId, cycleId, { date: getToday(), count: 0 });
  }

  async function deleteRow(id) {
    await deleteSampling(orgId, farmId, pondId, cycleId, id);
  }

  return (
    <div className="excel-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3>Sampling Chart</h3>
          {enriched.length > 5 && !editing && (
            <button className="btn-secondary btn-sm" onClick={() => setIsExpanded(!isExpanded)} style={{ padding: '2px 6px', height: 24, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isExpanded ? <><FontAwesomeIcon icon={faCompress} /> Collapse</> : <><FontAwesomeIcon icon={faExpand} /> View All ({enriched.length})</>}
            </button>
          )}
        </div>
        <div className="section-actions">
          {role !== 'Viewer' && (
            <>
              <button className={`${editing ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={toggleEdit}>
                <FontAwesomeIcon icon={editing ? faCheck : faPencil} />
              </button>
              <button className="btn-primary btn-sm" onClick={onAddEntry || addRow}>
                <FontAwesomeIcon icon={faPlus} /> Add Sampling
              </button>
            </>
          )}
        </div>
      </div>
      <div className="table-container">
        <table className="excel-table no-filter-table" onKeyDown={handleExcelKeyDown}>
          <thead>
            <tr>
              <th>S.No</th><th>Date of Sampling</th>
              <th className="num-col">DOC</th><th className="num-col">Count</th>
              <th className="num-col">Prev ABW</th><th className="num-col">ABW (g)</th>
              <th className="num-col">Growth (g)</th><th className="num-col highlight-col">ADG</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {(isExpanded || editing ? enriched : enriched.slice(0, 5)).map((row) => {
              const rowEditable = editing && canEditPastEntry(row.date, role, isAdmin);
              return (
              <tr key={row.id}>
                <td>{row.sno}</td>
                <td>
                  {rowEditable ? (
                    <input
                      type="date"
                      className="excel-input"
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
                      value={cellValue(row, 'date')}
                      max={getToday()}
                      min={stockingDate || undefined}
                      onChange={(e) => handleCellChange(row.id, 'date', e.target.value)}
                    />
                  ) : formatDate(row.date)}
                </td>
                <td className="num-col">{row.doc}</td>
                <td className="num-col">
                  {rowEditable ? (
                    <input
                      type="number"
                      className="excel-input"
                      style={{ border: 'none', textAlign: 'right', width: '100%' }}
                      value={cellValue(row, 'count')}
                      onChange={(e) => handleCellChange(row.id, 'count', e.target.value)}
                    />
                  ) : row.count}
                </td>
                <td className="num-col">{row.prevAbw?.toFixed(2)}</td>
                <td className="num-col">{row.abw?.toFixed(2)}</td>
                <td className="num-col">{row.growth?.toFixed(2)}</td>
                <td className="num-col highlight-col">{row.adg?.toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>
                  {rowEditable && (
                    <button className="btn-secondary btn-sm" onClick={() => deleteRow(row.id)}>
                      <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                    </button>
                  )}
                </td>
              </tr>
            )})}
            {enriched.length > 5 && !isExpanded && !editing && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-main)' }}>
                  <button className="btn-secondary btn-sm" onClick={() => setIsExpanded(true)} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 600 }}>
                    Show {enriched.length - 5} more rows...
                  </button>
                </td>
              </tr>
            )}
            {enriched.length === 0 && (
              <tr><td colSpan={9} className="empty-state">No sampling records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
