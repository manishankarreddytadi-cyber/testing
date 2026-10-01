// src/shared/components/FilterPopup.jsx
// Excel-like column filter popup. Positioned absolutely near the clicked header.
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpAZ, faArrowDownZA } from '@fortawesome/free-solid-svg-icons';

export default function FilterPopup({
  visible,
  colIdx,
  rect,
  isDateCol,
  uniqueValues,
  activeFilter,       // Set<string> or null
  activeDateFilter,   // { start, end } or null
  onSort,
  onApply,
  onClear,
  onClose,
}) {
  const popupRef = useRef(null);
  const [checked, setChecked] = useState(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Sync state when popup opens for a new column
  useEffect(() => {
    if (!visible) return;
    if (isDateCol) {
      setDateStart(activeDateFilter?.start ?? '');
      setDateEnd(activeDateFilter?.end ?? '');
    } else {
      const vals = uniqueValues(colIdx);
      if (activeFilter) {
        setChecked(new Set(activeFilter));
        setSelectAll([...activeFilter].length === vals.length);
      } else {
        setChecked(new Set(vals));
        setSelectAll(true);
      }
    }
  }, [visible, colIdx]); // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    function handler(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible, onClose]);

  if (!visible || !rect) return null;

  const vals = uniqueValues(colIdx);

  function toggleAll(checked) {
    setSelectAll(checked);
    setChecked(checked ? new Set(vals) : new Set());
  }

  function toggleOne(val) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      setSelectAll(next.size === vals.length);
      return next;
    });
  }

  function handleApply() {
    if (isDateCol) {
      onApply(colIdx, 'date', { start: dateStart, end: dateEnd });
    } else {
      onApply(colIdx, 'checkbox', checked.size === vals.length ? null : checked);
    }
  }

  function handleClear() {
    if (isDateCol) { setDateStart(''); setDateEnd(''); }
    else { toggleAll(true); }
    onClear(colIdx);
  }

  const style = {
    top:  (rect.bottom + window.scrollY) + 'px',
    left: (rect.left  + window.scrollX) + 'px',
  };

  return (
    <div className="excel-filter-popup" ref={popupRef} style={style}>
      <div className="filter-sort-options">
        <button onClick={() => { onSort(colIdx, 1);  onClose(); }}>
          <FontAwesomeIcon icon={faArrowUpAZ} /> Sort A to Z
        </button>
        <button onClick={() => { onSort(colIdx, -1); onClose(); }}>
          <FontAwesomeIcon icon={faArrowDownZA} /> Sort Z to A
        </button>
      </div>
      <div className="filter-divider" />

      {isDateCol ? (
        <div className="filter-date-range">
          <span>Custom Date Range:</span>
          <input
            type="date" className="excel-input" value={dateStart || ''}
            onChange={(e) => setDateStart(e.target.value)}
            style={{ padding: '2px 4px', height: 24 }}
            autoComplete="off"
            name={`filter-start-${colIdx}`}
          />
          <span style={{ textAlign: 'center', fontSize: 12 }}>to</span>
          <input
            type="date" className="excel-input" value={dateEnd || ''}
            onChange={(e) => setDateEnd(e.target.value)}
            style={{ padding: '2px 4px', height: 24 }}
            autoComplete="off"
            name={`filter-end-${colIdx}`}
          />
        </div>
      ) : (
        <div className="filter-checkboxes">
          <label className="checkbox-label" style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={selectAll} onChange={(e) => toggleAll(e.target.checked)} />
            &nbsp;(Select All)
          </label>
          {vals.map((val) => (
            <label key={val} className="checkbox-label">
              <input type="checkbox" checked={checked.has(val)} onChange={() => toggleOne(val)} />
              &nbsp;{val || '(Blanks)'}
            </label>
          ))}
        </div>
      )}

      <div className="filter-actions">
        <button className="btn-primary btn-sm" onClick={handleApply} style={{ padding: '2px 8px', fontSize: 12 }}>OK</button>
        <button className="btn-secondary btn-sm" onClick={handleClear} style={{ padding: '2px 8px', fontSize: 12 }}>Clear</button>
      </div>
    </div>
  );
}
