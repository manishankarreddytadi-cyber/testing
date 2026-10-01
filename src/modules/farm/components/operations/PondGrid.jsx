// src/modules/farm/components/operations/PondGrid.jsx
// Shows farm selector, action buttons toolbar, pond cards, drill-down, and empty-state CTAs.
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightArrowLeft, faPlus, faFish, faCircleStop } from '@fortawesome/free-solid-svg-icons';
import PondCard from './PondCard';
import PondDetail from './PondDetail';
import Modal from '../../../../shared/components/Modal';
import StartCycleModal from '../../modals/StartCycleModal';
import { HarvestModal } from '../../modals/HarvestModals';
import AddSamplingModal from '../../modals/AddSamplingModal';
import RecordUsageModal from '../../modals/RecordUsageModal';
import { addPartialHarvest, endCycle } from '../../../../services/farm.service';
import { useAuth } from '../../../../contexts/AuthContext';
import { useModal } from '../../../../shared/hooks/useModal';

export default function PondGrid({ farms, ponds, onGoToSettings }) {
  const { orgId, hasPermission, role, isAdmin, switchOrg } = useAuth();
  const [selectedFarmIdx, setSelectedFarmIdx] = useState(0);
  const [activePond, setActivePond] = useState(null);
  const [startCyclePond, setStartCyclePond] = useState(null);

  const startCycleModal   = useModal();
  const usageModal        = useModal();
  const samplingModal     = useModal();
  const partialModal      = useModal();
  const endCycleModal     = useModal();

  const farm      = farms[selectedFarmIdx] || farms[0];
  const farmId    = farm?.id;
  const farmPonds = farmId ? (ponds[farmId] || []) : [];
  const hasActivePonds = farmPonds.some(p => p.status === 'active');

  // Automatically sync the global org context to match the selected farm
  useEffect(() => {
    if (farm && farm.orgId && farm.orgId !== orgId) {
      switchOrg(farm.orgId);
    }
  }, [farm, orgId, switchOrg]);

  const [overview, setOverview] = useState({});
  useEffect(() => {
    if (!orgId || farms.length === 0) return;
    import('../../../../services/farm.service').then(({ getFeedingOverview }) => {
      getFeedingOverview(orgId, farms, ponds).then(setOverview).catch(console.error);
    });
  }, [orgId, farms, ponds]);

  return (
    <>
      {activePond && (
        <div style={{ display: 'block' }}>
          <PondDetail
            farmId={farmId}
            pond={activePond}
            onBack={() => setActivePond(null)}
          />
        </div>
      )}
      
      <div style={{ display: activePond ? 'none' : 'block' }}>
        {/* Toolbar — only show action buttons if there are active ponds */}
        <div className="operations-toolbar">
          <select
            className="farm-selector excel-input"
            value={selectedFarmIdx}
            onChange={(e) => setSelectedFarmIdx(Number(e.target.value))}
          >
            {farms.map((f, i) => <option key={f.id} value={i}>{f.name}</option>)}
          </select>

          {hasActivePonds && role !== 'Viewer' && (hasPermission('Feeding') || hasPermission('Consumables')) && (
            <button className="btn-secondary" onClick={usageModal.open}>
              <FontAwesomeIcon icon={faArrowRightArrowLeft} /> Record Usage
            </button>
          )}
          {hasActivePonds && role !== 'Viewer' && hasPermission('Sampling') && (
            <button className="btn-secondary" onClick={samplingModal.open}>
              <FontAwesomeIcon icon={faPlus} /> Add Sampling
            </button>
          )}
          {hasActivePonds && role !== 'Viewer' && (
            <button className="btn-secondary" onClick={partialModal.open}>
              <FontAwesomeIcon icon={faFish} /> Partial Harvest
            </button>
          )}
          {hasActivePonds && role !== 'Viewer' && (
            <button className="btn-primary btn-danger" onClick={endCycleModal.open}>
              <FontAwesomeIcon icon={faCircleStop} /> End Cycle
            </button>
          )}
        </div>

        {/* No farms at all */}
        {farms.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'var(--surface)', border: '1px dashed var(--border-dark)',
            borderRadius: 8,
          }}>
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No farms yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              Set up your first farm and ponds to start tracking operations.
            </p>
            {isAdmin && (
              <button className="btn-primary" onClick={() => onGoToSettings('config')}>
                <FontAwesomeIcon icon={faPlus} /> Create Your First Farm
              </button>
            )}
          </div>
        ) : (
          <div className="pond-grid">
            {farmPonds.map((pond) => {
              let doc = null;
              if (pond.activeCycleStockDate) {
                const start = new Date(pond.activeCycleStockDate);
                const now = new Date();
                doc = Math.floor((now - start) / (1000 * 60 * 60 * 24));
              }
              const po = overview[pond.id];
              const TODAY = new Date().toISOString().split('T')[0];
              const pondWithStats = {
                ...pond,
                doc,
                todayFeed: po?.dates?.[TODAY]?.total || 0,
                totalFeed: po?.cumulativeTotal || 0,
              };
              return (
                <PondCard
                  key={pond.id}
                  pond={pondWithStats}
                  onClick={setActivePond}
                  onStartCycle={(p) => { setStartCyclePond(p); startCycleModal.open(); }}
                />
              );
            })}
            {/* No ponds in this farm */}
            {farmPonds.length === 0 && (
              <div style={{
                gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px',
                background: 'var(--surface)', border: '1px dashed var(--border-dark)',
                borderRadius: 8,
              }}>
                <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No ponds in {farm?.name}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                  Add ponds to this farm to start managing cycles.
                </p>
                {isAdmin && (
                  <button className="btn-primary" onClick={() => onGoToSettings('config')}>
                    <FontAwesomeIcon icon={faPlus} /> Create Your First Pond
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <Modal isOpen={startCycleModal.isOpen} onClose={startCycleModal.close} title="Start Cycle" maxWidth={600}>
          {startCyclePond && (
            <StartCycleModal farmId={farmId} pond={startCyclePond} onClose={startCycleModal.close} />
          )}
        </Modal>

        <Modal isOpen={usageModal.isOpen} onClose={usageModal.close}
          title={usageModal.isOpen ? 'Record Usage' : ''}
          maxWidth={850}>
          <RecordUsageModal farmId={farmId} ponds={farmPonds.filter((p) => p.status === 'active')} onClose={usageModal.close} />
        </Modal>

        <Modal isOpen={samplingModal.isOpen} onClose={samplingModal.close} title="Add Sampling" maxWidth={600}>
          <AddSamplingModal
            farmId={farmId} pondId={null} cycleId={null}
            ponds={farmPonds.filter((p) => p.status === 'active')} onClose={samplingModal.close}
          />
        </Modal>

        <Modal isOpen={partialModal.isOpen} onClose={partialModal.close} title="Partial Harvest" maxWidth={800}>
          <HarvestModal
            title="Save"
            ponds={farmPonds.filter((p) => p.status === 'active')}
            onSave={async (rows) => {
              for (const row of rows) {
                const pond = farmPonds.find((p) => p.id === row.pondId);
                if (pond?.activeCycleId)
                  await addPartialHarvest(orgId, farmId, pond.id, pond.activeCycleId, row);
              }
            }}
            onClose={partialModal.close}
          />
        </Modal>

        <Modal isOpen={endCycleModal.isOpen} onClose={endCycleModal.close} title="Final Harvest (End Cycle)" maxWidth={800}>
          <HarvestModal
            title="End Cycle"
            ponds={farmPonds.filter((p) => p.status === 'active')}
            danger
            onSave={async (rows) => {
              for (const row of rows) {
                const pond = farmPonds.find((p) => p.id === row.pondId);
                if (pond?.activeCycleId)
                  await endCycle(orgId, farmId, pond.id, pond.activeCycleId, [row]);
              }
            }}
            onClose={endCycleModal.close}
          />
        </Modal>
      </div>
    </>
  );
}
