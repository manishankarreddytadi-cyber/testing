import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faDownload } from '@fortawesome/free-solid-svg-icons';

export default function ExportMonthModal({ isOpen, onClose, onExport }) {
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const toggleMonth = (val) => {
    if (selectedMonths.includes(val)) {
      setSelectedMonths(selectedMonths.filter(m => m !== val));
    } else {
      setSelectedMonths([...selectedMonths, val]);
    }
  };

  const handleExport = () => {
    onExport(selectedMonths);
    setSelectedMonths([]);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="modal-content" style={{
        background: '#fff', borderRadius: 8, padding: 24, width: 400, maxWidth: '90%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Select Months to Export</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
          Select one or more months. If a single month is chosen, it exports to a single tab. Multiple months will create chronological tabs.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Select Year</label>
          <select 
            className="excel-input" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: '100%' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          {monthNames.map((name, i) => {
            const val = `${String(i + 1).padStart(2, '0')}-${selectedYear}`;
            return (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedMonths.includes(val)}
                  onChange={() => toggleMonth(val)}
                />
                {name} {selectedYear}
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleExport} disabled={selectedMonths.length === 0}>
            <FontAwesomeIcon icon={faDownload} /> Download Excel
          </button>
        </div>
      </div>
    </div>
  );
}
