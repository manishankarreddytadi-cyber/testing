// src/shared/components/Tag.jsx
// Maps category string to a visual tag
const TAG_CLASSES = {
  Feed: 'tag-feed',
  Mineral: 'tag-mineral',
  Medicine: 'tag-medicine',
  Chemical: 'tag-chemical',
  Other: 'tag-other',
};

export default function Tag({ category }) {
  const cls = TAG_CLASSES[category] || 'tag-other';
  return <span className={`tag ${cls}`}>{category}</span>;
}
