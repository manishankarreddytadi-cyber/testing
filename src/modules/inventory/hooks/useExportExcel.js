import * as XLSX from 'xlsx';
import { formatDate } from '../../../utils/dateFormatter';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function useExportExcel() {
  const exportUsageMultiSheet = async (usage, items, categories, months) => {
    const wb = XLSX.utils.book_new();

    // months are like "01-2026"
    // usage dates are like "2026-01-28"
    // if months are selected, filter usage
    let filteredUsage = usage;
    if (months && months.length > 0) {
      filteredUsage = usage.filter(u => {
        if (!u.date) return false;
        const [yyyy, mm] = u.date.split('-');
        return months.includes(`${mm}-${yyyy}`);
      });
    }

    // Group usage by Pond
    const ponds = {}; // { [pondName]: { feed: [], other: [] } }
    filteredUsage.forEach(u => {
      const pondName = u.pond || 'Unknown Pond';
      if (!ponds[pondName]) ponds[pondName] = { feed: [], other: [] };
      
      const isFeed = u.type === 'feed' || (categories.find(c => c.id === u.categoryId)?.isFeedCategory);
      
      const row = {
        Date: formatDate(u.date),
        'Farm / Pond': pondName,
        Category: categories.find(c => c.id === u.categoryId)?.name || u.category || '-',
        'Item Used': items.find(i => i.id === u.itemId)?.name || u.item || u.itemName || '-',
        Qty: u.qty,
        Unit: u.unit,
      };

      if (isFeed) {
        ponds[pondName].feed.push(row);
      } else {
        ponds[pondName].other.push(row);
      }
    });

    Object.keys(ponds).forEach(pondName => {
      const feedData = ponds[pondName].feed;
      const otherData = ponds[pondName].other;

      const wsData = [];
      wsData.push(['FEED USAGE']);
      wsData.push(['Date', 'Farm / Pond', 'Category', 'Item Used', 'Qty', 'Unit']);
      feedData.forEach(r => wsData.push([r.Date, r['Farm / Pond'], r.Category, r['Item Used'], r.Qty, r.Unit]));
      
      wsData.push([]);
      wsData.push(['OTHER ITEMS USAGE']);
      wsData.push(['Date', 'Farm / Pond', 'Category', 'Item Used', 'Qty', 'Unit']);
      otherData.forEach(r => wsData.push([r.Date, r['Farm / Pond'], r.Category, r['Item Used'], r.Qty, r.Unit]));

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{wch: 12}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 10}, {wch: 10}];

      XLSX.utils.book_append_sheet(wb, ws, pondName.substring(0, 31));
    });

    if (Object.keys(ponds).length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['No data available for selected months']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Empty');
    }

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    const filename = `Usage_Report_${dateStr}.xlsx`;

    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        });
        await Share.share({
          title: `Export ${filename}`,
          url: result.uri,
          dialogTitle: 'Save or Share Excel',
        });
      } catch (e) {
        console.error("Native export failed:", e);
      }
    } else {
      XLSX.writeFile(wb, filename);
    }
  };

  return { exportUsageMultiSheet };
}
