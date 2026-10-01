export function handleExcelKeyDown(e) {
  const tagName = e.target.tagName;
  const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName);
  const isContentEditable = e.target.getAttribute('contenteditable') === 'true';

  if (!isField && !isContentEditable) return;

  const currentCell = isContentEditable ? e.target : e.target.closest('td');
  const currentTr = currentCell?.closest('tr');
  const tbody = currentTr?.closest('tbody');

  if (!tbody) return;

  const tds = Array.from(currentTr.children);
  const colIndex = tds.indexOf(currentCell);
  if (colIndex === -1) return;

  const trs = Array.from(tbody.children);
  const rowIndex = trs.indexOf(currentTr);
  if (rowIndex === -1) return;

  // Helpers to check cursor position
  const isAtStart = () => {
    if (tagName === 'SELECT' || e.target.type === 'number') return true;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') return e.target.selectionStart === 0;
    const sel = window.getSelection();
    return sel.rangeCount > 0 && sel.getRangeAt(0).startOffset === 0;
  };
  
  const isAtEnd = () => {
    if (tagName === 'SELECT' || e.target.type === 'number') return true;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') return e.target.selectionStart === e.target.value.length;
    const sel = window.getSelection();
    return sel.rangeCount > 0 && sel.getRangeAt(0).startOffset === e.target.textContent.length;
  };

  let rowDelta = 0;
  let colDelta = 0;

  if (e.key === 'Enter') {
    e.preventDefault();
    rowDelta = e.shiftKey ? -1 : 1;
  } else if (e.key === 'ArrowUp') {
    if (tagName !== 'SELECT') {
      e.preventDefault();
      rowDelta = -1;
    }
  } else if (e.key === 'ArrowDown') {
    if (tagName !== 'SELECT') {
      e.preventDefault();
      rowDelta = 1;
    }
  } else if (e.key === 'ArrowLeft') {
    if (tagName !== 'SELECT' && isAtStart()) colDelta = -1;
  } else if (e.key === 'ArrowRight') {
    if (tagName !== 'SELECT' && isAtEnd()) colDelta = 1;
  }

  if (rowDelta === 0 && colDelta === 0) return;

  // Search for the next focusable cell
  let nextRow = rowIndex + rowDelta;
  let nextCol = colIndex + colDelta;
  let targetNode = null;

  while (nextRow >= 0 && nextRow < trs.length && nextCol >= 0 && nextCol < tds.length) {
    const targetTr = trs[nextRow];
    if (!targetTr) break;
    const targetTd = targetTr.children[nextCol];
    if (!targetTd) break;

    const field = targetTd.querySelector('input, select, textarea');
    const editable = targetTd.getAttribute('contenteditable') === 'true' ? targetTd : targetTd.querySelector('[contenteditable="true"]');
    
    targetNode = field || editable;
    if (targetNode && !targetNode.disabled) {
      break; // Found a valid target
    }

    // Otherwise, keep moving in the same direction
    if (rowDelta !== 0) nextRow += rowDelta;
    if (colDelta !== 0) nextCol += colDelta;
  }

  if (targetNode) {
    e.preventDefault(); // Prevent default scrolling/cursor jumping since we found a target
    targetNode.focus();
    
    setTimeout(() => {
      if (targetNode.tagName === 'INPUT' && targetNode.type !== 'date') {
         targetNode.select();
      } else if (targetNode.getAttribute('contenteditable') === 'true') {
         const range = document.createRange();
         range.selectNodeContents(targetNode);
         const sel = window.getSelection();
         sel.removeAllRanges();
         sel.addRange(range);
      }
    }, 0);
  }
}
