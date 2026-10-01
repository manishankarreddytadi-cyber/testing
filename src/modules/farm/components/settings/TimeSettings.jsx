// src/modules/farm/components/settings/TimeSettings.jsx
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from '../../../../contexts/AppContext';
import { updateFeedSlots } from '../../../../services/farm.service';
import { useAuth } from '../../../../contexts/AuthContext';

export default function TimeSettings() {
  const { orgId, role } = useAuth();
  const { feedSlots } = useAppContext();
  const [editing, setEditing]  = useState(false);
  const [slots, setSlots]      = useState(feedSlots);

  // Sync slots with context when context updates from Firestore
  useEffect(() => {
    if (!editing) setSlots(feedSlots);
  }, [feedSlots, editing]);

  async function saveSlots() {
    setEditing(false); // Optimistically close UI
    try {
      await updateFeedSlots(orgId, slots);
    } catch (err) {
      console.error(err);
    }
  }

  function addSlot() { setSlots((s) => [...s, 'New Slot']); }
  function removeSlot(i) {
    if (window.confirm('Are you sure you want to delete this slot?\n\nWARNING: If you have already recorded feed data under this slot in any active or past cycle, deleting it will hide that data from the feeding charts. Consider renaming it instead.')) {
      setSlots((s) => s.filter((_, idx) => idx !== i));
    }
  }
  function updateSlot(i, val) { setSlots((s) => s.map((v, idx) => idx === i ? val : v)); }

  return (
    <div className="excel-section">
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h3>Time Settings (Feed Entry Slots)</h3>
        <div className="section-actions">
          {role !== 'Viewer' && (
            <button className={`${editing ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={editing ? saveSlots : () => setEditing(true)}>
              <FontAwesomeIcon icon={editing ? faCheck : faPencil} />
            </button>
          )}
          {editing && (
            <button className="btn-primary btn-sm" onClick={addSlot}>+ Add Slot</button>
          )}
        </div>
      </div>
      <div className="table-container">
        {editing && (
          <div style={{ padding: '10px 15px', background: '#fff3cd', border: '1px solid #ffe69c', borderRadius: 4, marginBottom: 15, fontSize: 13, color: '#664d03' }}>
            <strong>⚠️ Warning:</strong> Do not delete time slots if you have already recorded data in them, as the data will be hidden from your charts. Simply rename the slot instead.
          </div>
        )}
        <table className="excel-table no-filter-table">
          <thead><tr><th>Slot Name</th><th style={{ width: 80, textAlign: 'center' }}></th></tr></thead>
          <tbody>
            {slots.map((slot, i) => (
              <tr key={i}>
                <td>
                  {editing
                    ? <input className="excel-input" value={slot} onChange={(e) => updateSlot(i, e.target.value)} style={{ border: 'none' }} />
                    : slot}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {editing && (
                    <button className="btn-secondary btn-sm" onClick={() => removeSlot(i)}>
                      <FontAwesomeIcon icon={faTrash} style={{ color: '#e74c3c' }} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
