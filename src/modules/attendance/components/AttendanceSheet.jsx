// src/modules/attendance/components/AttendanceSheet.jsx
import { useState, useEffect, useMemo } from 'react';
import { subscribeAttendanceMonth, updateAttendanceDay } from '../../../services/attendance.service';
import { useAuth } from '../../../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import ExportMonthModal from '../../../shared/components/ExportMonthModal';
import { useExportAttendanceExcel } from '../hooks/useExportAttendanceExcel';

const STATUS_COLORS = {
  'P': '#2ecc71', // Present
  'A': '#e74c3c', // Absent
  'H': '#f39c12', // Half-day
  'L': '#3498db', // Leave
};

export default function AttendanceSheet({ employees }) {
  const { orgId, role } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [records, setRecords] = useState({});
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { exportAttendanceMultiSheet } = useExportAttendanceExcel();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeAttendanceMonth(orgId, monthStr, setRecords);
    return unsub;
  }, [orgId, monthStr]);

  // Combine active employees and any inactive employees that have records this month
  const displayEmployees = useMemo(() => {
    const list = [...employees.filter(e => e.isActive !== false)];

    // Add missing ones from records
    Object.keys(records).forEach(empId => {
      if (!list.find(e => e.id === empId)) {
        list.push({ id: empId, name: records[empId].name || 'Unknown', isActive: false });
      }
    });

    // Sort by name
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, records]);

  function changeMonth(delta) {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
  }

  async function handleStatusChange(empId, empName, day, newStatus) {
    if (role === 'Viewer') return;
    setSaveError('');
    try {
      await updateAttendanceDay(orgId, monthStr, empId, empName, String(day), newStatus);
    } catch (err) {
      console.error(err);
      setSaveError('Failed to save — please try again.');
    }
  }

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="excel-section" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: 15 }}>
        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', justifyContent: 'center' }}>
          <button className="btn-secondary btn-sm" onClick={() => changeMonth(-1)} style={{ padding: '6px 12px' }}>&larr;</button>
          <div style={{ fontWeight: 600, fontSize: 15, textAlign: 'center', whiteSpace: 'nowrap', minWidth: '90px' }}>
            {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
          </div>
          <button className="btn-secondary btn-sm" onClick={() => changeMonth(1)} style={{ padding: '6px 12px' }}>&rarr;</button>
        </div>
        {/* Export & error row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
          {saveError && (
            <div style={{ color: '#e74c3c', fontSize: 12, background: '#fdf2f2', padding: '4px 8px', borderRadius: 4, border: '1px solid #f9d8d8', whiteSpace: 'nowrap' }}>
              {saveError}
            </div>
          )}
          <button className="btn-secondary btn-sm" onClick={() => setIsExportModalOpen(true)} title="Export" style={{ padding: '6px 12px' }}>
            <FontAwesomeIcon icon={faDownload} />
          </button>
        </div>
      </div>

      <ExportMonthModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={(months) => exportAttendanceMultiSheet(orgId, employees, months)}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1000 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 11, padding: '12px 12px', textAlign: 'left', minWidth: 150, borderRight: '1px solid var(--border-color)', borderBottom: '2px solid var(--border-dark)' }}>Employee</th>
              {daysArray.map(day => (
                <th key={day} style={{ padding: '12px 0', minWidth: 48, textAlign: 'center', borderRight: '1px solid var(--border-color)', fontWeight: 600, background: 'var(--bg-color)', borderBottom: '2px solid var(--border-dark)' }}>
                  {day}
                </th>
              ))}
              <th style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--primary)', borderRight: '1px solid var(--border-color)', background: 'var(--bg-color)', borderBottom: '2px solid var(--border-dark)' }}>Present</th>
              <th style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--primary)', borderRight: '1px solid var(--border-color)', background: 'var(--bg-color)', borderBottom: '2px solid var(--border-dark)' }}>Absent</th>
              <th style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--primary)', background: 'var(--bg-color)', borderBottom: '2px solid var(--border-dark)' }}>Half day</th>
            </tr>
          </thead>
          <tbody>
            {displayEmployees.map(emp => {
              const empRecords = records[emp.id]?.days || {};

              let countP = 0;
              let countA = 0;
              let countH = 0;

              Object.values(empRecords).forEach(val => {
                if (val === 'P') countP++;
                if (val === 'A') countA++;
                if (val === 'H') countH++;
              });

              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 5, padding: '12px 12px', borderRight: '1px solid var(--border-color)', fontWeight: 500 }}>
                    {emp.name} {!emp.isActive && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>(Removed)</span>}
                  </td>
                  {daysArray.map(day => {
                    const status = empRecords[String(day)] || '';
                    const color = STATUS_COLORS[status] || 'inherit';

                    return (
                      <td key={day} style={{ padding: 0, borderRight: '1px solid var(--border-color)', textAlign: 'center', position: 'relative' }}>
                        <select
                          className="excel-input"
                          style={{
                            width: '100%', height: '100%', minHeight: 48, border: 'none',
                            textAlign: 'center', appearance: 'none', background: 'transparent',
                            color, fontWeight: status ? 700 : 400, cursor: 'pointer'
                          }}
                          value={status}
                          onChange={(e) => handleStatusChange(emp.id, emp.name, day, e.target.value)}
                          disabled={role === 'Viewer'}
                        >
                          <option value=""></option>
                          <option value="P">P</option>
                          <option value="A">A</option>
                          <option value="H">H</option>
                          <option value="L">L</option>
                        </select>
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid var(--border-color)' }}>
                    {countP}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid var(--border-color)' }}>
                    {countA}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                    {countH}
                  </td>
                </tr>
              );
            })}
            {displayEmployees.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 4} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No employees available.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={daysInMonth + 4} style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ color: STATUS_COLORS['P'], fontWeight: 600, marginRight: 12 }}>P = Present (1)</span>
                <span style={{ color: STATUS_COLORS['A'], fontWeight: 600, marginRight: 12 }}>A = Absent (0)</span>
                <span style={{ color: STATUS_COLORS['H'], fontWeight: 600, marginRight: 12 }}>H = Half Day (0.5)</span>
                <span style={{ color: STATUS_COLORS['L'], fontWeight: 600 }}>L = Leave (0)</span>
              </td>
            </tr>
          </tfoot>
        </table>
        {/* Spacer for bottom nav */}
        <div style={{ height: 'calc(80px + env(safe-area-inset-bottom))' }}></div>
      </div>
    </div>
  );
}
