// src/modules/farm/components/overview/CurrentOverview.jsx
// Expandable farm → pond → date feeding overview table
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faWater, faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from '../../../../contexts/AppContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { getFeedingOverview } from '../../../../services/farm.service';
import { formatDate } from '../../../../utils/dateFormatter';

export default function CurrentOverview({ farms, ponds }) {
  const { orgId } = useAuth();
  const { feedSlots } = useAppContext();
  const [openFarms, setOpenFarms] = useState({});
  const [openPonds, setOpenPonds] = useState({});
  const [overview, setOverview] = useState({});

  // Stable keys prevent re-fetching on every Firestore snapshot reference change
  const farmKey = farms.map(f => f.id).join(',');
  const pondKey = JSON.stringify(Object.fromEntries(
    farms.map(f => [f.id, (ponds[f.id] || []).map(p => p.id)])
  ));

  useEffect(() => {
    if (!orgId || farms.length === 0) return;
    getFeedingOverview(orgId, farms, ponds).then(setOverview).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, farmKey, pondKey]);

  function toggleFarm(id) { setOpenFarms((p) => ({ ...p, [id]: !p[id] })); }
  function togglePond(id) { setOpenPonds((p) => ({ ...p, [id]: !p[id] })); }

  return (
    <div className="table-container">
      <table className="excel-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}></th>
            <th>Farm / Pond / Date</th>
            {feedSlots.map(slot => <th key={slot}>{slot} (kg)</th>)}
            <th className="highlight-col">Daily Total (kg)</th>
            <th className="highlight-col">Cumulative Total (kg)</th>
          </tr>
        </thead>
        <tbody>
          {farms.map((farm) => {
            const farmPonds = ponds[farm.id] || [];
            const isFarmOpen = openFarms[farm.id];
            
            // Calculate farm totals
            const farmSlots = {};
            let farmCumulativeTotal = 0;
            farmPonds.forEach(p => {
              const po = overview[p.id];
              if (po) {
                farmCumulativeTotal += po.cumulativeTotal || 0;
                Object.keys(po.cumulativeSlots || {}).forEach(k => {
                  farmSlots[k] = (farmSlots[k] || 0) + po.cumulativeSlots[k];
                });
              }
            });

            return [
              <tr
                key={farm.id}
                style={{ cursor: 'pointer', backgroundColor: '#f1f4f8' }}
                onClick={() => toggleFarm(farm.id)}
              >
                <td style={{ textAlign: 'center' }}>
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className={`expand-icon${isFarmOpen ? ' open' : ''}`}
                  />
                </td>
                <td style={{ fontWeight: 'bold' }}>{farm.name}</td>
                {feedSlots.map(slot => <td key={slot} style={{ fontWeight: 'bold' }}>{farmSlots[slot] || '-'}</td>)}
                <td className="highlight-col" style={{ fontWeight: 'bold' }}>-</td>
                <td className="highlight-col" style={{ fontWeight: 'bold' }}>{farmCumulativeTotal || '-'}</td>
              </tr>,
              ...farmPonds.flatMap((pond) => {
                if (!isFarmOpen) return [];
                const po = overview[pond.id] || { cumulativeSlots: {}, cumulativeTotal: 0, dates: {} };
                const isPondOpen = openPonds[pond.id];
                
                return [
                  <tr 
                    key={`p-${pond.id}`} 
                    style={{ cursor: 'pointer', backgroundColor: '#f9fbfd' }}
                    onClick={() => togglePond(pond.id)}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <FontAwesomeIcon 
                        icon={faChevronRight} 
                        style={{ marginLeft: 10 }}
                        className={`expand-icon${isPondOpen ? ' open' : ''}`} 
                      />
                    </td>
                    <td style={{ paddingLeft: 20, fontWeight: 500 }}>
                      <FontAwesomeIcon icon={faWater} style={{ color: 'var(--primary)', marginRight: 8 }} />
                      {pond.name}
                    </td>
                    {feedSlots.map(slot => <td key={slot} style={{ fontWeight: 500 }}>{po.cumulativeSlots[slot] || '-'}</td>)}
                    <td className="highlight-col" style={{ fontWeight: 500 }}>-</td>
                    <td className="highlight-col" style={{ fontWeight: 500 }}>{po.cumulativeTotal || '-'}</td>
                  </tr>,
                  ...(isPondOpen ? Object.keys(po.dates).sort((a,b) => b.localeCompare(a)).map(date => {
                    const dayData = po.dates[date];
                    return (
                      <tr key={`d-${pond.id}-${date}`} style={{ backgroundColor: '#fff' }}>
                        <td></td>
                        <td style={{ paddingLeft: 50, color: '#555' }}>
                          <FontAwesomeIcon icon={faCalendarDay} style={{ marginRight: 8, color: '#999' }} />
                          {formatDate(date)}
                        </td>
                        {feedSlots.map(slot => (
                          <td key={slot}>{dayData.slots[slot] || '-'}</td>
                        ))}
                        <td className="highlight-col">{dayData.total || '-'}</td>
                        <td className="highlight-col">-</td>
                      </tr>
                    );
                  }) : [])
                ];
              }),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
