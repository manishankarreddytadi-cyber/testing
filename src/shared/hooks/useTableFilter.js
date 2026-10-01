// src/shared/hooks/useTableFilter.js
// Encapsulates all sort + filter logic ported from the prototype's script.js.
// Used by ExcelTable. Returns filtered/sorted rows and popup control state.
import { useState, useCallback, useMemo } from 'react';

export function useTableFilter(rows, columns, tableId = null) {
  const [colFilters, setColFilters]     = useState({}); // { colIdx: Set<string> }
  const [dateFilters, setDateFilters]   = useState(() => {
    if (tableId) {
      try {
        const saved = localStorage.getItem(`aquanubandh_dates_${tableId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load date filters', e);
      }
    }
    return {};
  }); // { colIdx: { start, end } }
  const [sortConfig, setSortConfig]     = useState({ colIdx: -1, dir: 1 });
  const [popupState, setPopupState]     = useState({ visible: false, colIdx: -1, rect: null });

  const openPopup = useCallback((colIdx, rect) => {
    setPopupState({ visible: true, colIdx, rect });
  }, []);
  const closePopup = useCallback(() => {
    setPopupState((s) => ({ ...s, visible: false }));
  }, []);

  const applyFilter = useCallback((colIdx, type, value) => {
    if (type === 'checkbox') {
      setColFilters((prev) => {
        const next = { ...prev };
        if (!value || value.size === 0) delete next[colIdx];
        else next[colIdx] = value;
        return next;
      });
    } else if (type === 'date') {
      setDateFilters((prev) => {
        const next = { ...prev };
        if (!value?.start && !value?.end) delete next[colIdx];
        else next[colIdx] = value;
        if (tableId) localStorage.setItem(`aquanubandh_dates_${tableId}`, JSON.stringify(next));
        return next;
      });
    }
    closePopup();
  }, [closePopup, tableId]);

  const clearFilter = useCallback((colIdx) => {
    setColFilters((prev) => { const n = { ...prev }; delete n[colIdx]; return n; });
    setDateFilters((prev) => { 
      const n = { ...prev }; 
      delete n[colIdx]; 
      if (tableId) localStorage.setItem(`aquanubandh_dates_${tableId}`, JSON.stringify(n));
      return n; 
    });
    closePopup();
  }, [closePopup, tableId]);

  const setSort = useCallback((colIdx) => {
    setSortConfig((prev) =>
      prev.colIdx === colIdx
        ? { colIdx, dir: prev.dir * -1 }
        : { colIdx, dir: 1 }
    );
    closePopup();
  }, [closePopup]);

  const uniqueValues = useCallback((colIdx) => {
    const vals = new Set();
    rows.forEach((row) => {
      const cell = Array.isArray(row) ? row[colIdx] : Object.values(row)[colIdx];
      if (cell !== undefined) vals.add(String(cell ?? ''));
    });
    return [...vals].sort();
  }, [rows]);

  const activeFilters = useMemo(() => ({
    cols: colFilters,
    dates: dateFilters,
    sort: sortConfig,
  }), [colFilters, dateFilters, sortConfig]);

  // Apply filters and sort to produce visible rows
  const filteredRows = useMemo(() => {
    let result = [...rows];

    // Checkbox filters
    Object.entries(colFilters).forEach(([ci, allowed]) => {
      const idx = Number(ci);
      result = result.filter((row) => {
        const cell = Array.isArray(row) ? row[idx] : Object.values(row)[idx];
        return allowed.has(String(cell ?? ''));
      });
    });

    // Date range filters
    Object.entries(dateFilters).forEach(([ci, range]) => {
      const idx = Number(ci);
      result = result.filter((row) => {
        const cell = Array.isArray(row) ? row[idx] : Object.values(row)[idx];
        const d = new Date(cell);
        if (isNaN(d)) return true;
        if (range.start && d < new Date(range.start)) return false;
        if (range.end   && d > new Date(range.end))   return false;
        return true;
      });
    });

    // Sort
    if (sortConfig.colIdx >= 0) {
      const idx = sortConfig.colIdx;
      result.sort((a, b) => {
        const aV = String(Array.isArray(a) ? a[idx] : Object.values(a)[idx] ?? '');
        const bV = String(Array.isArray(b) ? b[idx] : Object.values(b)[idx] ?? '');
        const aNum = parseFloat(aV.replace(/[^0-9.-]/g, ''));
        const bNum = parseFloat(bV.replace(/[^0-9.-]/g, ''));
        const isNum = !isNaN(aNum) && !isNaN(bNum);
        const cmp = isNum ? aNum - bNum : aV.localeCompare(bV);
        return cmp * sortConfig.dir;
      });
    }

    return result;
  }, [rows, colFilters, dateFilters, sortConfig]);

  return {
    filteredRows,
    activeFilters,
    popupState,
    openPopup,
    closePopup,
    applyFilter,
    clearFilter,
    setSort,
    uniqueValues,
  };
}
