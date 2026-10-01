// src/shared/components/EditableCell.jsx
// A <td> that is read-only by default and becomes contentEditable when `editing` is true.
// Calls onCommit(value) on blur. Bridges the prototype's contentEditable pattern into React.
import { useRef, useEffect } from 'react';

export default function EditableCell({
  as: Tag = 'td',
  value,
  editing,
  onCommit,
  className = 'editable-cell',
  style,
  ...rest
}) {
  const ref = useRef(null);

  // Sync external value into DOM when not focused and not editing
  useEffect(() => {
    if (ref.current && !editing) {
      ref.current.textContent = value ?? '';
    }
  }, [value, editing]);

  function handleBlur() {
    if (onCommit) onCommit(ref.current.textContent.trim());
  }

  return (
    <Tag
      ref={ref}
      className={className}
      contentEditable={editing ? 'true' : 'false'}
      suppressContentEditableWarning
      onBlur={handleBlur}
      style={style}
      {...rest}
    >
      {value}
    </Tag>
  );
}
