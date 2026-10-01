// src/modules/farm/components/overview/HistoryOverview.jsx
// 4-level nested history tree: Farm → Pond → Cycle → Harvests
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faWater, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { formatDate } from '../../../../utils/dateFormatter';

export default function HistoryOverview({ historyData }) {
  const [openFarms,  setOpenFarms]  = useState({});
  const [openPonds,  setOpenPonds]  = useState({});
  const [openCycles, setOpenCycles] = useState({});

  function toggle(map, setMap, key) {
    setMap((p) => ({ ...p, [key]: !p[key] }));
  }

  if (!historyData || historyData.length === 0) {
    return <p className="empty-state">No historical data yet.</p>;
  }

  return (
    <div className="table-container">
      <table className="excel-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}></th>
            <th>Entity / Event</th>
            <th>Date</th>
            <th>Harvested (kg)</th>
            <th>Price (₹/kg)</th>
          </tr>
        </thead>
        <tbody>
          {historyData.map((farm) => [
            /* Level 1: Farm */
            <tr key={`f-${farm.id}`} style={{ cursor: 'pointer', backgroundColor: '#f1f4f8' }}
              onClick={() => toggle(openFarms, setOpenFarms, farm.id)}>
              <td style={{ textAlign: 'center' }}>
                <FontAwesomeIcon icon={faChevronRight} className={`expand-icon${openFarms[farm.id] ? ' open' : ''}`} />
              </td>
              <td colSpan={4} style={{ fontWeight: 'bold' }}>{farm.name}</td>
            </tr>,

            ...farm.cycles?.flatMap((pond) => [
              /* Level 2: Pond */
              openFarms[farm.id] && (
                <tr key={`p-${pond.id}`} style={{ cursor: 'pointer', backgroundColor: '#f9fbfd' }}
                  onClick={() => toggle(openPonds, setOpenPonds, pond.id)}>
                  <td style={{ textAlign: 'center' }}>
                    <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: 10 }}
                      className={`expand-icon${openPonds[pond.id] ? ' open' : ''}`} />
                  </td>
                  <td colSpan={4} style={{ paddingLeft: 20, fontWeight: 500 }}>
                    <FontAwesomeIcon icon={faWater} style={{ color: 'var(--primary)', marginRight: 8 }} />
                    {pond.name}
                  </td>
                </tr>
              ),

              /* Level 3: Cycle */
              ...(pond.cycles || []).flatMap((cycle) => [
                openFarms[farm.id] && openPonds[pond.id] && (
                  <tr key={`c-${cycle.id}`} style={{ cursor: 'pointer', backgroundColor: '#fff' }}
                    onClick={() => toggle(openCycles, setOpenCycles, cycle.id)}>
                    <td style={{ textAlign: 'center' }}>
                      <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: 20 }}
                        className={`expand-icon${openCycles[cycle.id] ? ' open' : ''}`} />
                    </td>
                    <td style={{ paddingLeft: 40, fontWeight: 500 }}>
                      <FontAwesomeIcon icon={faCalendarDays} style={{ color: '#27ae60', marginRight: 8 }} />
                      Start Date: {formatDate(cycle.stockDate) || '-'}
                    </td>
                    <td>-</td><td>-</td><td>-</td>
                  </tr>
                ),

                /* Level 4: Harvests */
                ...(cycle.harvests || []).map((h) =>
                  openFarms[farm.id] && openPonds[pond.id] && openCycles[cycle.id] && (
                    <tr key={`h-${h.id}`} style={{ backgroundColor: '#fff' }}>
                      <td></td>
                      <td style={{ paddingLeft: 60, color: '#555' }}>
                        {h.type === 'final' ? 'Final Harvest' : 'Partial Harvest'}
                      </td>
                      <td>{formatDate(h.date)}</td>
                      <td>{h.harvested}</td>
                      <td>₹{h.price}</td>
                    </tr>
                  )
                ),
              ]),
            ]) || [],
          ])}
        </tbody>
      </table>
    </div>
  );
}
