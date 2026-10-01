// src/modules/farm/hooks/useSamplingCalc.js
// Pure computation hook — no Firebase, no DOM.
// Computes DOC, prevABW, ABW, growth, and ADG for each sampling row.

export function useSamplingCalc(rows, stockingDateStr) {
  if (!rows || rows.length === 0) return [];

  // Parse stocking date (supports DD/MM/YYYY and ISO)
  let stockingDate;
  const parts = (stockingDateStr || '').split('/');
  if (parts.length === 3) {
    stockingDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else {
    stockingDate = new Date(stockingDateStr || '');
  }
  if (isNaN(stockingDate)) stockingDate = new Date();

  let previousAbw  = 0;
  let previousDate = stockingDate;

  return rows.map((row, index) => {
    const dateStr = row.date || '';
    const count   = parseFloat(row.count) || 0;

    let abw = 0, growth = 0, adg = 0, doc = 0;
    const prevAbwSnapshot = previousAbw; // capture BEFORE any update this iteration

    if (dateStr && count > 0) {
      const currentDate = new Date(dateStr);
      doc    = Math.max(0, Math.floor((currentDate - stockingDate) / 86400000));
      abw    = 1000 / count;
      growth = abw - previousAbw;
      const daysSinceLast = Math.max(1, Math.floor((currentDate - previousDate) / 86400000));
      adg    = growth / daysSinceLast;
      previousAbw  = abw;
      previousDate = currentDate;
    }

    return {
      ...row,
      sno:     index + 1,
      doc,
      prevAbw: prevAbwSnapshot,
      abw:     abw ? parseFloat(abw.toFixed(2))    : 0,
      growth:  growth ? parseFloat(growth.toFixed(2)) : 0,
      adg:     adg ? parseFloat(adg.toFixed(2))    : 0,
    };
  });
}
