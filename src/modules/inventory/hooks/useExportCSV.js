// src/modules/inventory/hooks/useExportCSV.js
// CSV export utility — matches the "Export Current View" feature from the prototype.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
export function useExportCSV() {
  async function exportCSV(headers, rows, filename) {
    const csvLines = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
    ];
    const csvString = csvLines.join('\n');

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: filename,
          data: csvString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: `Export ${filename}`,
          url: result.uri,
          dialogTitle: 'Save or Share CSV',
        });
      } catch (e) {
        console.error("Native export failed:", e);
      }
    } else {
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  }

  return { exportCSV };
}
