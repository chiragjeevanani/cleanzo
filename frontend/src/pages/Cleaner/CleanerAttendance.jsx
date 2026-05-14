import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, CheckCircle2, XCircle,
  Clock, ChevronLeft, ChevronRight, Info, CalendarCheck
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const CleanerAttendance = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      setError('');
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const res = await apiClient.get(`/cleaner/attendance?year=${year}&month=${month}`);
        setHistory(res.history || []);
      } catch (err) {
        setError('Failed to load attendance.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const stats = {
    present: history.filter(h => h.status === 'present').length,
    absent: history.filter(h => h.status === 'absent').length,
    leave: history.filter(h => h.status === 'leave').length,
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px 20px 100px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <header className="flex items-center justify-between" style={{ marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>Attendance</h1>
          <p className="text-secondary" style={{ fontSize: 14 }}>Track your daily presence</p>
        </div>
        
        <div className="glass flex items-center gap-12" style={{ padding: '8px 12px', borderRadius: 16 }}>
          <button onClick={prevMonth} className="btn-icon" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="btn-icon" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* Hero Stats Card */}
      <div className="glass" style={{ padding: 24, borderRadius: 28, marginBottom: 32, border: '1px solid var(--border-glass)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-10">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(223,255,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={20} className="text-lime" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Monthly Summary</span>
          </div>
          <span className="text-label text-tertiary" style={{ fontSize: 10 }}>MAY 2026</span>
        </div>

        <div className="grid grid-cols-3 gap-12">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-lime)' }}>{stats.present}</div>
            <div className="text-label" style={{ fontSize: 9, marginTop: 4, color: 'var(--text-tertiary)' }}>PRESENT</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--divider)', borderRight: '1px solid var(--divider)' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--error)' }}>{stats.absent}</div>
            <div className="text-label" style={{ fontSize: 9, marginTop: 4, color: 'var(--text-tertiary)' }}>ABSENT</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-blue)' }}>{stats.leave}</div>
            <div className="text-label" style={{ fontSize: 9, marginTop: 4, color: 'var(--text-tertiary)' }}>LEAVE</div>
          </div>
        </div>
      </div>

      {/* Daily Logs */}
      <div className="flex flex-col gap-16">
        <h3 className="text-label" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em', paddingLeft: 4 }}>DAILY LOG</h3>
        
        <div className="flex flex-col gap-12">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
            const dateStr = date.toISOString().split('T')[0];
            const record = history.find(h => h.date && h.date.startsWith(dateStr));
            
            const isToday = new Date().toDateString() === date.toDateString();
            const status = record?.status || 'pending';

            return (
              <div 
                key={dayNum} 
                className="glass" 
                style={{ 
                  padding: '16px 20px', 
                  borderRadius: 20, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 16,
                  border: isToday ? '1px solid var(--accent-lime)' : '1px solid var(--border-glass)',
                  opacity: date > new Date() ? 0.4 : 1
                }}
              >
                <div style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 14, 
                  background: isToday ? 'var(--accent-lime)' : 'rgba(255,255,255,0.05)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: isToday ? '#000' : 'var(--text-primary)'
                }}>
                  <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>{date.toLocaleDateString('default', { weekday: 'short' })}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, marginTop: 2, lineHeight: 1 }}>{dayNum}</span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize', color: status === 'present' ? 'var(--accent-lime)' : 'var(--text-primary)' }}>
                    {status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : status === 'leave' ? 'On Leave' : 'Pending'}
                  </div>
                  {record?.checkIn && (
                    <div className="text-tertiary flex items-center gap-4" style={{ fontSize: 12, marginTop: 2 }}>
                      <Clock size={10} /> 
                      {new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                <div>
                  {status === 'present' ? (
                    <CheckCircle2 size={22} className="text-lime" />
                  ) : status === 'absent' ? (
                    <XCircle size={22} style={{ color: 'var(--error)' }} />
                  ) : status === 'leave' ? (
                    <CalendarIcon size={22} style={{ color: 'var(--primary-blue)' }} />
                  ) : (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--divider)' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="glass" style={{ marginTop: 32, padding: 20, borderRadius: 24, display: 'flex', gap: 16, border: '1px solid rgba(var(--primary-blue-rgb), 0.2)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(var(--primary-blue-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Info size={20} style={{ color: 'var(--primary-blue)' }} />
        </div>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: 14 }}>Leave Policy</h4>
          <p className="text-secondary" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
            You are eligible for 2 paid leaves per month. Unused leaves do not carry forward. Apply via the profile section.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CleanerAttendance;
