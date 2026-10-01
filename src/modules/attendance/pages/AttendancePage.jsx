// src/modules/attendance/pages/AttendancePage.jsx
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { subscribeEmployees } from '../../../services/attendance.service';
import { useAuth } from '../../../contexts/AuthContext';
import EmployeeList from '../components/EmployeeList';
import AttendanceSheet from '../components/AttendanceSheet';
import SubTabs from '../../../shared/components/SubTabs';

export default function AttendancePage() {
  const { orgId } = useAuth();
  const [activeTab, _setActiveTab] = useState(() => localStorage.getItem('aquanubandh_attendanceTab') || 'sheet');
  function setActiveTab(tab) { localStorage.setItem('aquanubandh_attendanceTab', tab); _setActiveTab(tab); }
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeEmployees(orgId, (data) => {
      setEmployees(data);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  const TABS = [
    { id: 'sheet', label: 'Attendance Sheet' },
    { id: 'employees', label: 'Manage Employees' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Header + tabs — fixed height */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2>Attendance</h2>
        </div>
        <SubTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Content area — fills remaining height and constrains children */}
      <div style={{ flex: 1, minHeight: 0, padding: '0 24px', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', padding: 30 }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: activeTab === 'sheet' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}>
              <AttendanceSheet employees={employees} />
            </div>
            <div style={{ display: activeTab === 'employees' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}>
              <EmployeeList employees={employees} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
