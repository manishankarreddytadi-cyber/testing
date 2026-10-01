// src/shared/components/SubTabs.jsx
/**
 * Reusable sub-tab bar.
 * tabs: [{ id: string, label: string }]
 */
export default function SubTabs({ tabs, activeTab, onTabChange, style }) {
  return (
    <div className="tabs-sub" style={style}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-sub${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
