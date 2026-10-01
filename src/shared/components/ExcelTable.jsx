// src/shared/components/ExcelTable.jsx
// Table shell with optional column filter icons and sort support.
// Pass `filterable` to get filter icons on non-excluded columns.
// Children should be <tbody> rows.
import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faArrowUpAZ, faArrowDownZA } from '@fortawesome/free-solid-svg-icons';
import FilterPopup from './FilterPopup';
import { handleExcelKeyDown } from '../../utils/keyboardNavigation';

export default function ExcelTable({
  columns,          // [{ label, numeric?, highlight?, noFilter?, width? }]
  children,         // <tbody> rows
  filterable,       // enable filter icons on filterable columns
  filterState,      // from useTableFilter hook
  className = '',
  containerStyle = {},
  id,
}) {
  const theadRef = useRef(null);

  function handleHeaderClick(colIdx, col) {
    if (!filterable || col.noFilter) return;
    const th = theadRef.current?.children[0]?.children[colIdx];
    if (!th) return;
    const rect = th.getBoundingClientRect();
    filterState.openPopup(colIdx, rect);
  }

  const isDateCol = (col) =>
    col.label?.toLowerCase().includes('date');

  return (
    <>
      <div className="table-container" id={id} style={containerStyle}>
        <table className={`excel-table ${className}`} onKeyDown={handleExcelKeyDown}>
          <thead ref={theadRef}>
            <tr>
              {columns.map((col, i) => {
                const hasActiveFilter =
                  filterState?.activeFilters?.cols?.[i] ||
                  filterState?.activeFilters?.dates?.[i];
                const sortIdx = filterState?.activeFilters?.sort?.colIdx;
                const sortDir = filterState?.activeFilters?.sort?.dir;
                return (
                  <th
                    key={i}
                    className={[
                      col.numeric   ? 'num-col'       : '',
                      col.highlight ? 'highlight-col' : '',
                      filterable && !col.noFilter ? 'sortable' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ width: col.width }}
                    onClick={() => handleHeaderClick(i, col)}
                  >
                    {col.label}
                    {filterable && !col.noFilter && (
                      <FontAwesomeIcon
                        icon={
                          sortIdx === i
                            ? sortDir === 1 ? faArrowUpAZ : faArrowDownZA
                            : faFilter
                        }
                        className={`th-filter-icon${hasActiveFilter || sortIdx === i ? ' active' : ''}`}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          {children}
        </table>
      </div>

      {filterable && filterState && (
        <FilterPopup
          visible={filterState.popupState.visible}
          colIdx={filterState.popupState.colIdx}
          rect={filterState.popupState.rect}
          isDateCol={isDateCol(columns[filterState.popupState.colIdx] ?? {})}
          uniqueValues={filterState.uniqueValues}
          activeFilter={filterState.activeFilters.cols[filterState.popupState.colIdx]}
          activeDateFilter={filterState.activeFilters.dates[filterState.popupState.colIdx]}
          onSort={(ci, dir) => filterState.setSort(ci, dir)}
          onApply={filterState.applyFilter}
          onClear={filterState.clearFilter}
          onClose={filterState.closePopup}
        />
      )}
    </>
  );
}
