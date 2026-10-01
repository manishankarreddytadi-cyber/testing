// src/modules/inventory/pages/InventoryPage.jsx
import { useState } from 'react';
import SubTabs from '../../../shared/components/SubTabs';
import CurrentStock from '../components/CurrentStock';
import Purchases from '../components/Purchases';
import UsageHistory from '../components/UsageHistory';
import MasterLists from '../components/MasterLists';
import { useInventory } from '../hooks/useInventory';

const TABS = [
  { id: 'stock',     label: 'Current Stock' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'usage',     label: 'Usage History' },
  { id: 'items',     label: 'Store, Categories & Items' },
];

export default function InventoryPage() {
  const [activeTab, _setActiveTab] = useState(() => localStorage.getItem('aquanubandh_inventoryTab') || 'stock');
  function setActiveTab(tab) { localStorage.setItem('aquanubandh_inventoryTab', tab); _setActiveTab(tab); }
  const { items, categories, stores, purchases, usage, stock, loading } = useInventory();

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading inventory…</div>;

  return (
    <div className="page">
      <div className="main-panel">
        <div className="page-header">
          <h2>Inventory</h2>
        </div>
        <SubTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div style={{ display: activeTab === 'stock' ? 'block' : 'none' }}>
          <CurrentStock stock={stock} items={items} categories={categories} stores={stores} />
        </div>
        <div style={{ display: activeTab === 'purchases' ? 'block' : 'none' }}>
          <Purchases purchases={purchases} items={items} categories={categories} stores={stores} />
        </div>
        <div style={{ display: activeTab === 'usage' ? 'block' : 'none' }}>
          <UsageHistory usage={usage} items={items} categories={categories} />
        </div>
        <div style={{ display: activeTab === 'items' ? 'block' : 'none' }}>
          <MasterLists items={items} categories={categories} stores={stores} />
        </div>
      </div>
    </div>
  );
}
