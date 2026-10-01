export function formatDate(dateStr) {
  if (!dateStr) return '';
  // Handle Firestore Timestamp objects
  if (typeof dateStr === 'object' && typeof dateStr.toDate === 'function') {
    dateStr = dateStr.toDate().toISOString().split('T')[0];
  }
  // Handle JS Date objects
  if (dateStr instanceof Date) {
    dateStr = dateStr.toISOString().split('T')[0];
  }
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return String(dateStr);
  const [y, m, d] = parts;
  return `${d}/${m}/${y.slice(-2)}`;
}

export function canEditPastEntry(dateStr, role, isAdmin) {
  if (isAdmin || role === 'Admin') return true;
  if (role === 'Viewer') return false;
  if (role === 'Manager') {
    if (!dateStr) return true;
    
    // Convert current time to a local date at midnight
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Parse the row's date
    const targetDate = new Date(dateStr);
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    
    // Calculate difference in days
    const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));
    
    // Allow today (0), yesterday (1), and future dates (< 0)
    return diffDays <= 1;
  }
  return true;
}
