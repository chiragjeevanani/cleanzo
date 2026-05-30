import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, CheckCircle2, XCircle,
  Clock, ChevronLeft, ChevronRight, Info, CalendarCheck, Plus, Send, AlertCircle
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const CleanerAttendance = () => {
  const [history, setHistory] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'leaves'
  
  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState('');

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

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await apiClient.get('/cleaner/leave/history');
      setLeaves(res.history || []);
    } catch (err) {
      console.error('Failed to load leaves history:', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentMonth]);

  useEffect(() => {
    fetchLeaves();
  }, []);

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

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveDate) {
      setLeaveError('Please select a date.');
      return;
    }

    const selectedDate = new Date(leaveDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setLeaveError('Cannot apply for leaves on past dates.');
      return;
    }

    setSubmittingLeave(true);
    setLeaveError('');
    setLeaveSuccess('');

    try {
      await apiClient.post('/cleaner/leave', {
        date: leaveDate,
        reason: leaveReason
      });
      setLeaveSuccess('Leave request submitted successfully!');
      setLeaveDate('');
      setLeaveReason('');
      fetchLeaves();
      fetchAttendance(); // Reload attendance in case leave updates current month views
      setTimeout(() => {
        setShowLeaveModal(false);
        setLeaveSuccess('');
      }, 1500);
    } catch (err) {
      setLeaveError(err?.message || 'Failed to submit leave request.');
    } finally {
      setSubmittingLeave(false);
    }
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
        
        {activeTab === 'logs' && (
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
        )}

        {activeTab === 'leaves' && (
          <button 
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-6"
            style={{ 
              background: 'linear-gradient(135deg, var(--bg-accent), #84cc16)', 
              color: 'var(--text-on-accent)',
              border: 'none', 
              borderRadius: 14, 
              padding: '10px 16px', 
              fontWeight: 800, 
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(132, 204, 22, 0.25)'
            }}
          >
            <Plus size={16} /> Apply Leave
          </button>
        )}
      </header>

      {/* Hero Stats Card */}
      <div className="glass" style={{ padding: 24, borderRadius: 28, marginBottom: 32, border: '1px solid var(--border-glass)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-10">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(var(--bg-accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={20} className="text-lime" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Monthly Summary</span>
          </div>
          <span className="text-label text-tertiary" style={{ fontSize: 10 }}>
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-12">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-accent)' }}>{stats.present}</div>
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

      {/* Custom Tabs */}
      <div className="glass flex" style={{ padding: 4, borderRadius: 16, marginBottom: 24, border: '1px solid var(--border-glass)' }}>
        <button 
          onClick={() => setActiveTab('logs')}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'logs' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: activeTab === 'logs' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontWeight: activeTab === 'logs' ? 800 : 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Daily Logs
        </button>
        <button 
          onClick={() => setActiveTab('leaves')}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'leaves' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: activeTab === 'leaves' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontWeight: activeTab === 'leaves' ? 800 : 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Leave Requests
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Daily Logs Tab */}
      {activeTab === 'logs' && (
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
                    border: isToday ? '1px solid var(--bg-accent)' : '1px solid var(--border-glass)',
                    opacity: date > new Date() ? 0.4 : 1
                  }}
                >
                  <div style={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: 14, 
                    background: isToday ? 'var(--bg-accent)' : 'rgba(255,255,255,0.05)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: isToday ? 'var(--text-on-accent)' : 'var(--text-primary)'
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>{date.toLocaleDateString('default', { weekday: 'short' })}</span>
                    <span style={{ fontSize: 16, fontWeight: 900, marginTop: 2, lineHeight: 1 }}>{dayNum}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize', color: status === 'present' ? 'var(--text-accent)' : 'var(--text-primary)' }}>
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
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'leaves' && (
        <div className="flex flex-col gap-16">
          <h3 className="text-label" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em', paddingLeft: 4 }}>APPLIED LEAVES</h3>
          
          {loadingLeaves ? (
            <div className="flex justify-center p-24">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-lime-400"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="glass flex flex-col items-center justify-center p-40" style={{ borderRadius: 24, textAlign: 'center', border: '1px solid var(--border-glass)' }}>
              <CalendarIcon size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
              <h4 style={{ fontWeight: 700, fontSize: 16 }}>No Leave Applied Yet</h4>
              <p className="text-secondary" style={{ fontSize: 13, marginTop: 4, maxWidth: 240 }}>
                You have not submitted any leave requests. Click "Apply Leave" above to request a leave.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {leaves.map((leave) => {
                const dateObj = new Date(leave.date);
                const statusColor = leave.status === 'approved' ? 'var(--text-accent)' : leave.status === 'rejected' ? 'var(--error)' : 'rgba(255,255,255,0.6)';
                const statusBg = leave.status === 'approved' ? 'rgba(132,204,22,0.1)' : leave.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)';
                const statusLabel = leave.status.toUpperCase();

                return (
                  <div key={leave._id} className="glass" style={{ padding: 20, borderRadius: 24, border: '1px solid var(--border-glass)' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>
                          {dateObj.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>
                          {dateObj.toLocaleDateString('default', { weekday: 'long' })}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: 10, 
                        fontWeight: 900, 
                        padding: '4px 10px', 
                        borderRadius: 8, 
                        color: statusColor, 
                        background: statusBg, 
                        letterSpacing: '0.05em' 
                      }}>
                        {statusLabel}
                      </span>
                    </div>

                    {leave.reason && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                        "{leave.reason}"
                      </div>
                    )}

                    {leave.status === 'rejected' && leave.rejectionReason && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: '10px 14px', 
                        borderRadius: 12, 
                        background: 'rgba(239,68,68,0.05)', 
                        border: '1px solid rgba(239,68,68,0.1)', 
                        fontSize: 12, 
                        color: 'var(--error)'
                      }}>
                        <strong style={{ fontWeight: 700 }}>Admin Note: </strong>
                        {leave.rejectionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="glass" style={{ marginTop: 32, padding: 20, borderRadius: 24, display: 'flex', gap: 16, border: '1px solid rgba(var(--primary-blue-rgb), 0.2)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(var(--primary-blue-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Info size={20} style={{ color: 'var(--primary-blue)' }} />
        </div>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: 14 }}>Leave Policy</h4>
          <p className="text-secondary" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
            You are eligible for 2 leaves per month. Unused leaves do not carry forward. Leaves requested on future dates are pending admin approval.
          </p>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 999
        }}>
          <div className="glass-solid animate-scale-in" style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 28,
            padding: 24,
            border: '1px solid var(--border-glass)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <header className="flex justify-between items-center" style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900 }}>Apply for Leave</h3>
              <button 
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveError('');
                  setLeaveSuccess('');
                }} 
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <XCircle size={18} />
              </button>
            </header>

            {leaveError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'var(--error)',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertCircle size={16} />
                <span>{leaveError}</span>
              </div>
            )}

            {leaveSuccess && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(132,204,22,0.1)',
                border: '1px solid rgba(132,204,22,0.2)',
                color: 'var(--text-accent)',
                fontSize: 13,
                marginBottom: 16
              }}>
                {leaveSuccess}
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="flex flex-col gap-16">
              <div className="flex flex-col gap-6">
                <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
                <input 
                  type="date"
                  required
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              <div className="flex flex-col gap-6">
                <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason (Optional)</label>
                <textarea 
                  placeholder="e.g. Personal work, Family event, Not feeling well..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveModal(false);
                    setLeaveError('');
                    setLeaveSuccess('');
                  }}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 16,
                    border: '1px solid var(--border-glass)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  style={{
                    flex: 2,
                    padding: 14,
                    borderRadius: 16,
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--bg-accent), #84cc16)',
                    color: 'var(--text-on-accent)',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: submittingLeave ? 0.7 : 1
                  }}
                >
                  {submittingLeave ? 'Submitting...' : (
                    <>
                      Submit <Send size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanerAttendance;
