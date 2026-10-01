// src/shared/components/Badge.jsx
export default function Badge({ type = 'active', children }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}
