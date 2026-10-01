// src/modules/inventory/components/CurrentStock.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import ExcelTable from '../../../shared/components/ExcelTable';
import Tag from '../../../shared/components/Tag';
import { useTableFilter } from '../../../shared/hooks/useTableFilter';
import { useExportCSV } from '../hooks/useExportCSV';
import { useModal } from '../../../shared/hooks/useModal';
import Modal from '../../../shared/components/Modal';
import SpillageModal from '../modals/SpillageModal';

// Format yyyy-mm-dd → dd-mm-yyyy, passthrough anything else
function formatDate(raw) {
  if (!raw) return '-';
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return raw;
}

const COLUMNS = [
  { label: '', noFilter: true, width: 40 },
  { label: 'Last Purchase' },
  { label: 'Item Name' },
  { label: 'Category' },
  { label: 'Store' },
  { label: 'Qty in Stock', numeric: true, highlight: true },
  { label: 'Unit' },
  { label: 'Price / Unit', numeric: true },
];

export default function CurrentStock({ stock, items = [], categories = [], stores = [] }) {
  const [expanded, setExpanded] = useState({});
  const spillageModal = useModal();

  function toggle(id) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  const tableRows = stock.map((s) => {
    const activeLots = s.activeLots || [];
    let priceDisplay = 0;
    if (activeLots.length === 1) priceDisplay = activeLots[0].price;
    else if (activeLots.length > 1) priceDisplay = 'Multiple Lots';

    return [
      '',                                                              // [0] expander
      formatDate(s.lastPurchase),                                     // [1] date — first
      items.find(i => i.id === s.itemId)?.name || s.itemName || '-', // [2] item name
      categories.find(c => c.id === s.categoryId)?.name || s.category || '-', // [3] category
      stores.find(store => store.id === s.storeId)?.name || s.store || '-',   // [4] store
      s.qty,                                                          // [5] qty
      s.unit,                                                         // [6] unit
      priceDisplay,                                                   // [7] price
      s,                                                              // [8] original obj
    ];
  });

  const filterState = useTableFilter(tableRows, COLUMNS);
  const { exportCSV } = useExportCSV();

  function handleExport() {
    exportCSV(
      COLUMNS.slice(1).map((c) => c.label),
      filterState.filteredRows.map(r => r.slice(1, 8)),
      'current_stock.csv'
    );
  }

  return (
    <div className="excel-section">
      <div className="section-header" style={{ justifyContent: 'flex-end', marginBottom: 10 }}>
        <div className="section-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary btn-danger btn-sm" onClick={spillageModal.open}>
            Record Spillage
          </button>
          <button className="btn-secondary btn-sm" onClick={handleExport}>
            <FontAwesomeIcon icon={faDownload} /> Export
          </button>
        </div>
      </div>

      <ExcelTable columns={COLUMNS} filterable filterState={filterState}>
        <tbody>
          {filterState.filteredRows.map((row, i) => {
            const s = row[8];
            const hasMultipleLots = s.activeLots && s.activeLots.length > 1;
            const isOpen = expanded[s.id];

            return (
              <React.Fragment key={i}>
                <tr
                  onClick={() => hasMultipleLots && toggle(s.id)}
                  style={{ cursor: hasMultipleLots ? 'pointer' : 'default', backgroundColor: isOpen ? '#f9fafb' : 'transparent' }}
                >
                  <td style={{ textAlign: 'center' }}>
                    {hasMultipleLots && (
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        className={`expand-icon${isOpen ? ' open' : ''}`}
                      />
                    )}
                  </td>
                  <td>{row[1]}</td>
                  <td style={{ fontWeight: hasMultipleLots ? 'bold' : 'normal' }}>{row[2]}</td>
                  <td><Tag category={row[3]} /></td>
                  <td>{row[4]}</td>
                  <td className="num-col highlight-col" style={{ fontWeight: 'bold' }}>{row[5]}</td>
                  <td>{row[6]}</td>
                  <td className="num-col">{row[7]}</td>
                </tr>

                {isOpen && s.activeLots.map((lot, idx) => (
                  <tr key={`${s.id}-lot-${idx}`} style={{ backgroundColor: '#fff' }}>
                    <td></td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(lot.date)}</td>
                    <td style={{ paddingLeft: 30, color: 'var(--text-muted)' }}>Lot {idx + 1}</td>
                    <td></td>
                    <td></td>
                    <td className="num-col highlight-col">{lot.qty}</td>
                    <td>{s.unit}</td>
                    <td className="num-col">₹{lot.price}</td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
          {filterState.filteredRows.length === 0 && (
            <tr><td colSpan={8} className="empty-state">No stock data. Add purchases first.</td></tr>
          )}
        </tbody>
      </ExcelTable>

      <Modal isOpen={spillageModal.isOpen} onClose={spillageModal.close} title="Record Spillage / Loss" maxWidth={850}>
        <SpillageModal onClose={spillageModal.close} />
      </Modal>
    </div>
  );
}
