import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPencil, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { usePondDetail } from '../../hooks/usePondDetail';
import { updateCycle } from '../../../../services/farm.service';
import { useAuth } from '../../../../contexts/AuthContext';
import FeedingChart from './FeedingChart';
import ConsumablesChart from './ConsumablesChart';
import SamplingChart from './SamplingChart';
import Modal from '../../../../shared/components/Modal';
import RecordUsageModal from '../../modals/RecordUsageModal';
import PondEntryModal, { TITLES } from '../../modals/PondEntryModal';
import { formatDate } from '../../../../utils/dateFormatter';

const GENETIC_LINES = {
  vannamei: ['Kona Bay (SPF)', 'SIS (Shrimp Improvement Systems)', 'SyAqua (SPR / SPT)', 'CP (Charoen Pokphand)', 'BMK Line', 'Global Gen', 'API (American Penaeid Inc)'],
  monodon:  ['Moana (SPF)', 'RGCA (Rajiv Gandhi Centre for Aquaculture)', 'Vaishnavi (SPF)'],
};

export default function PondDetail({ farmId, pond, onBack }) {
  const { orgId, role } = useAuth();
  const { cycle, feeding, consumables, sampling, loading } = usePondDetail(farmId, pond);
  const cycleId = pond?.activeCycleId;

  const [editingCycle, setEditingCycle] = useState(false);
  const [cycleEdits, setCycleEdits]     = useState({});
  // entryMode: null | 'feed' | 'consumable' | 'sampling'
  const [entryMode, setEntryMode]       = useState(null);

  useEffect(() => {
    if (!editingCycle && cycle) {
      setCycleEdits({
        species:     cycle.species     || 'vannamei',
        stockDate:   cycle.stockDate   || '',
        stockQty:    cycle.stockQty    || '',
        geneticLine: cycle.geneticLine || '',
      });
    }
  }, [editingCycle, cycle]);

  async function handleSaveCycle() {
    try {
      await updateCycle(orgId, farmId, pond.id, cycleId, {
        species:     cycleEdits.species,
        stockDate:   cycleEdits.stockDate,
        stockQty:    Number(cycleEdits.stockQty),
        geneticLine: cycleEdits.geneticLine,
      });
      setEditingCycle(false);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 15 }}>
        <button className="btn-secondary btn-sm" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Farm
        </button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{pond?.name} Overview</h3>
      </div>

      {/* Section A: Stocking Info */}
      <div className="excel-section">
        <div className="section-header">
          <h3>Stocking &amp; Species Information</h3>
          {cycleId && role !== 'Viewer' && (
            <div className="section-actions">
              {editingCycle ? (
                <>
                  <button className="btn-primary btn-sm" onClick={handleSaveCycle}>
                    <FontAwesomeIcon icon={faCheck} /> Save
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditingCycle(false)}>
                    <FontAwesomeIcon icon={faXmark} /> Cancel
                  </button>
                </>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => setEditingCycle(true)} title="Edit Info">
                  <FontAwesomeIcon icon={faPencil} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="table-container">
          <table className="excel-table no-filter-table">
            <thead>
              <tr><th>Species</th><th>Stocking Date</th><th>Stocking Quantity</th><th>Genetic Line</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {editingCycle ? (
                    <select className="excel-input" value={cycleEdits.species}
                      onChange={e => setCycleEdits({ ...cycleEdits, species: e.target.value, geneticLine: '' })}>
                      <option value="vannamei">L. vannamei</option>
                      <option value="monodon">P. monodon</option>
                    </select>
                  ) : cycle?.species || '-'}
                </td>
                <td>
                  {editingCycle ? (
                    <input type="date" className="excel-input" value={cycleEdits.stockDate}
                      onChange={e => setCycleEdits({ ...cycleEdits, stockDate: e.target.value })} />
                  ) : formatDate(cycle?.stockDate) || '-'}
                </td>
                <td>
                  {editingCycle ? (
                    <input type="number" className="excel-input" value={cycleEdits.stockQty}
                      onChange={e => setCycleEdits({ ...cycleEdits, stockQty: e.target.value })} />
                  ) : cycle?.stockQty?.toLocaleString() || '-'}
                </td>
                <td>
                  {editingCycle ? (
                    <select className="excel-input" value={cycleEdits.geneticLine}
                      onChange={e => setCycleEdits({ ...cycleEdits, geneticLine: e.target.value })}>
                      <option value="" disabled>Select Line</option>
                      {(GENETIC_LINES[cycleEdits.species] || []).map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                      {!GENETIC_LINES[cycleEdits.species]?.includes(cycleEdits.geneticLine) && cycleEdits.geneticLine && (
                        <option value={cycleEdits.geneticLine}>{cycleEdits.geneticLine}</option>
                      )}
                    </select>
                  ) : cycle?.geneticLine || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', marginTop: 20 }}>Loading pond data…</p>
      ) : !cycleId ? (
        <p style={{ color: 'var(--text-muted)', marginTop: 20 }}>No active cycle for this pond.</p>
      ) : (
        <>
          {/* Feed — opens RecordUsageModal locked to this pond in feed mode */}
          <FeedingChart
            farmId={farmId} pondId={pond.id} cycleId={cycleId}
            rows={feeding}
            stockingDate={cycle?.stockDate}
            onAddEntry={() => setEntryMode('feed')}
          />

          {/* Consumables — opens RecordUsageModal locked to this pond in other/consumable mode */}
          <ConsumablesChart
            farmId={farmId} pondId={pond.id} cycleId={cycleId}
            rows={consumables}
            stockingDate={cycle?.stockDate}
            onAddEntry={() => setEntryMode('consumable')}
          />

          {/* Sampling — opens PondEntryModal in sampling mode */}
          <SamplingChart
            farmId={farmId} pondId={pond.id} cycleId={cycleId}
            rows={sampling}
            stockingDate={cycle?.stockDate}
            onAddEntry={() => setEntryMode('sampling')}
          />
        </>
      )}

      {/* Feed modal — RecordUsageModal pre-set to feed, locked to this pond */}
      {(entryMode === 'feed' || entryMode === 'consumable') && (
        <Modal
          isOpen={true}
          title={entryMode === 'feed' ? 'Record Feed Entry' : 'Record Consumable Usage'}
          onClose={() => setEntryMode(null)}
          maxWidth={900}
        >
          <RecordUsageModal
            farmId={farmId}
            ponds={[{ ...pond, activeCycleId: cycleId }]}
            initialStep={entryMode === 'feed' ? 'feed' : 'other'}
            onClose={() => setEntryMode(null)}
          />
        </Modal>
      )}

      {/* Sampling modal */}
      {entryMode === 'sampling' && (
        <Modal isOpen={true} title="Add Sampling" onClose={() => setEntryMode(null)}>
          <PondEntryModal
            mode="sampling"
            farmId={farmId}
            pond={pond}
            cycleId={cycleId}
            onClose={() => setEntryMode(null)}
          />
        </Modal>
      )}
    </div>
  );
}
