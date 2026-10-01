import * as XLSX from 'xlsx';
import { getAttendanceMonths } from '../../../services/attendance.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function useExportAttendanceExcel() {
  const exportAttendanceMultiSheet = async (orgId, employees, selectedMonths) => {
    if (!orgId || !selectedMonths || selectedMonths.length === 0) return;

    // Convert "MM-YYYY" back to "YYYY-MM" to match DB
    const monthStrs = selectedMonths.map(m => {
      const [mm, yyyy] = m.split('-');
      return `${yyyy}-${mm}`;
    });

    const monthData = await getAttendanceMonths(orgId, monthStrs);
    const wb = XLSX.utils.book_new();

    monthData.forEach(({ monthStr, records }) => {
      const [year, month] = monthStr.split('-');
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      // Combine active employees and any inactive employees that have records this month
      const list = [...employees.filter(e => e.isActive !== false)];
      Object.keys(records).forEach(empId => {
        if (!list.find(e => e.id === empId)) {
          list.push({ id: empId, name: records[empId].name || 'Unknown', isActive: false });
        }
      });
      list.sort((a, b) => {
        const snoA = parseInt(a.sno, 10);
        const snoB = parseInt(b.sno, 10);
        const numA = isNaN(snoA) ? 999999 : snoA;
        const numB = isNaN(snoB) ? 999999 : snoB;
        if (numA !== numB) return numA - numB;
        return (a.name || '').localeCompare(b.name || '');
      });

      const wsData = [];
      const headerRow = ['Employee', ...daysArray.map(String), 'Present', 'Absent', 'Half day'];
      wsData.push(headerRow);

      list.forEach(emp => {
        const empRecords = records[emp.id]?.days || {};
        let countP = 0;
        let countA = 0;
        let countH = 0;

        Object.values(empRecords).forEach(val => {
          if (val === 'P') countP++;
          if (val === 'A') countA++;
          if (val === 'H') countH++;
        });

        const row = [emp.name];
        daysArray.forEach(day => {
          row.push(empRecords[String(day)] || '');
        });
        row.push(countP, countA, countH);
        wsData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const shortMonthStr = `${month}-${year}`; // Keep sheet name short
      XLSX.utils.book_append_sheet(wb, ws, shortMonthStr.substring(0, 31));
    });

    if (monthData.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['No data']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Empty');
    }

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    const filename = `Attendance_Report_${dateStr}.xlsx`;

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
          dialogTitle: 'Save or Share Attendance Report',
        });
      } catch (e) {
        console.error("Native export failed:", e);
      }
    } else {
      XLSX.writeFile(wb, filename);
    }
  };

  return { exportAttendanceMultiSheet };
}
