// src/modules/farm/components/operations/PondCard.jsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import Badge from '../../../../shared/components/Badge';

import { useAuth } from '../../../../contexts/AuthContext';

export default function PondCard({ pond, onClick, onStartCycle }) {
  const { role } = useAuth();
  const isActive = pond.status === 'active';

  if (!isActive) {
    return (
      <div className="pond-card inactive">
        <div className="pond-card-header">
          <h3>{pond.name}</h3>
          <Badge type="inactive">Empty</Badge>
        </div>
        <div className="pond-actions">
          {role !== 'Viewer' ? (
            <button
              className="btn-primary"
              onClick={(e) => { e.stopPropagation(); onStartCycle(pond); }}
            >
              <FontAwesomeIcon icon={faPlus} /> Start Cycle
            </button>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active cycle</span>
          )}
        </div>
      </div>
    );
  }

  const doc       = pond.doc       != null ? `${pond.doc} Days` : 'N/A';
  const todayFeed = pond.todayFeed  != null ? `${pond.todayFeed} kg` : 'N/A';
  const totalFeed = pond.totalFeed  != null ? `${pond.totalFeed} kg` : 'N/A';

  return (
    <div className="pond-card" onClick={() => onClick(pond)}>
      <div className="pond-card-header">
        <h3>{pond.name}</h3>
        <Badge type="active">Active</Badge>
      </div>
      <div className="pond-stats">
        <div className="stat"><label>DOC</label>        <span>{doc}</span></div>
        <div className="stat"><label>Today's Feed</label><span>{todayFeed}</span></div>
        <div className="stat"><label>Total Feed</label>  <span>{totalFeed}</span></div>
      </div>
    </div>
  );
}
