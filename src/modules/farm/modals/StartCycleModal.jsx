// src/modules/farm/modals/StartCycleModal.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { startCycle } from '../../../services/farm.service';
import { useAuth } from '../../../contexts/AuthContext';

const GENETIC_LINES = {
  vannamei: ['Kona Bay (SPF)', 'SIS (Shrimp Improvement Systems)', 'SyAqua (SPR / SPT)', 'CP (Charoen Pokphand)', 'BMK Line', 'Global Gen', 'API (American Penaeid Inc)'],
  monodon:  ['Moana (SPF)', 'RGCA (Rajiv Gandhi Centre for Aquaculture)', 'Vaishnavi (SPF)'],
};

export default function StartCycleModal({ farmId, pond, onClose, onSuccess }) {
  const { orgId } = useAuth();
  const [species,      setSpecies]      = useState('vannamei');
  const [stockDate,    setStockDate]    = useState('');
  const [stockQty,     setStockQty]     = useState('');
  const [geneticLine,  setGeneticLine]  = useState('');
  const [customLine,   setCustomLine]   = useState('');
  const [loading,      setLoading]      = useState(false);

  const lines = GENETIC_LINES[species] || [];

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    startCycle(orgId, farmId, pond.id, {
      species,
      stockDate,
      stockQty: Number(stockQty),
      geneticLine: geneticLine === 'other' ? customLine : geneticLine,
    }).then(() => {
      onSuccess?.();
      onClose();
    }).catch((err) => {
      console.error(err);
      alert('Failed to start cycle: ' + (err.message || 'Unknown error'));
    }).finally(() => setLoading(false));
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 5, color: 'var(--text-muted)' }}>Pond</label>
            <input className="excel-input" value={pond?.name || ''} disabled />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 5, color: 'var(--text-muted)' }}>Species</label>
            <select className="excel-input" value={species} onChange={(e) => { setSpecies(e.target.value); setGeneticLine(''); }}>
              <option value="vannamei">L. vannamei</option>
              <option value="monodon">P. monodon</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 5, color: 'var(--text-muted)' }}>Stocking Date</label>
            <input type="date" className="excel-input" value={stockDate} onChange={(e) => setStockDate(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 5, color: 'var(--text-muted)' }}>Stocking Quantity</label>
            <input type="number" className="excel-input" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="e.g. 500000" required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 5, color: 'var(--text-muted)' }}>Genetic Line (Strain)</label>
            <select
              className="excel-input"
              value={geneticLine}
              onChange={(e) => setGeneticLine(e.target.value)}
              style={{ marginBottom: geneticLine === 'other' ? 10 : 0 }}
            >
              <option value="" disabled>Select Genetic Line</option>
              {lines.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="other">Add your own</option>
            </select>
            {geneticLine === 'other' && (
              <input
                type="text"
                className="excel-input"
                value={customLine}
                onChange={(e) => setCustomLine(e.target.value)}
                placeholder="Enter custom genetic line"
                style={{ marginTop: 10 }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          <FontAwesomeIcon icon={faPlus} /> {loading ? 'Starting…' : 'Start Cycle'}
        </button>
      </div>
    </form>
  );
}
