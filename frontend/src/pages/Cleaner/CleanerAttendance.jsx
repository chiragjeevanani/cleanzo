import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckCircle2, XCircle, 
  Clock, ChevronLeft, ChevronRight, Info
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const CleanerAttendance = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await apiClient.get('/cleaner/attendance');
        setHistory(res.history);
      } catch (err) {
        console.error('Failed to fetch attendance');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  // Helper to get days in month
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  
  const stats = {
    present: history.filter(h => h.status === 'present').length,
    absent: history.filter(h => h.status === 'absent').length,
    leave: history.filter(h => h.status === 'leave').length,
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 pb-24 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Attendance</h1>
          <p className="text-gray-500 font-medium">Monthly History</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-2xl">
          <button className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <span className="px-2 font-black text-sm uppercase">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-3xl p-5 text-center">
          <span className="text-2xl font-black text-green-600 block">{stats.present}</span>
          <span className="text-[10px] uppercase font-black text-green-800 tracking-wider">Present</span>
        </div>
        <div className="bg-red-50 rounded-3xl p-5 text-center">
          <span className="text-2xl font-black text-red-600 block">{stats.absent}</span>
          <span className="text-[10px] uppercase font-black text-red-800 tracking-wider">Absent</span>
        </div>
        <div className="bg-blue-50 rounded-3xl p-5 text-center">
          <span className="text-2xl font-black text-blue-600 block">{stats.leave}</span>
          <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider">Leave</span>
        </div>
      </div>

      {/* Daily List */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-gray-900 ml-1">Daily Log</h3>
        <div className="space-y-3">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum).toISOString().split('T')[0];
            const record = history.find(h => h.date.startsWith(dateStr));
            
            const isToday = new Date().getDate() === dayNum && new Date().getMonth() === currentMonth.getMonth();

            return (
              <div 
                key={dayNum}
                className={`p-4 rounded-3xl flex items-center justify-between border ${isToday ? 'border-lime-400 bg-lime-50/30' : 'border-gray-50 bg-white'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${isToday ? 'bg-lime-500 text-black' : 'bg-gray-50 text-gray-400'}`}>
                    <span className="text-xs uppercase leading-none">
                      {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum).toLocaleDateString('default', { weekday: 'short' })}
                    </span>
                    <span className="text-lg leading-none mt-1">{dayNum}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {record?.status === 'present' ? 'Worked' : record?.status === 'leave' ? 'On Leave' : record?.status === 'absent' ? 'Absent' : 'Pending'}
                    </h4>
                    {record?.checkIn && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={10} /> {new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
                
                {record?.status === 'present' ? (
                  <CheckCircle2 className="text-green-500" size={24} />
                ) : record?.status === 'leave' ? (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <CalendarIcon size={16} />
                  </div>
                ) : record?.status === 'absent' ? (
                  <XCircle className="text-red-400" size={24} />
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-100 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-900 rounded-[2rem] p-6 text-white flex gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-lime-400 flex-shrink-0">
          <Info size={24} />
        </div>
        <div>
          <h4 className="font-bold">Leave Policy</h4>
          <p className="text-sm text-gray-400 leading-relaxed">You are eligible for 2 paid leaves per month. Unused leaves do not carry forward.</p>
        </div>
      </div>
    </div>
  );
};

export default CleanerAttendance;
