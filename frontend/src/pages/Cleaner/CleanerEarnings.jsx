import { useState, useEffect } from 'react';
import { 
  IndianRupee, TrendingUp, Calendar, AlertCircle, 
  ArrowRight, ShieldCheck, Download 
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const CleanerEarnings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await apiClient.get('/cleaner/earnings');
        setData(res);
      } catch (err) {
        console.error('Failed to fetch earnings');
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 pb-24 space-y-6">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Earnings</h1>
          <p className="text-gray-500 font-medium">Current Month Payout</p>
        </div>
        <div className="w-12 h-12 bg-lime-100 rounded-2xl flex items-center justify-center text-lime-700">
          <TrendingUp size={24} />
        </div>
      </header>

      {/* Main Earnings Card */}
      <div className="bg-black rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-lime-200/20">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <IndianRupee size={120} />
        </div>
        <div className="relative z-10">
          <span className="text-lime-400 text-sm font-bold tracking-widest uppercase mb-2 block">Total Earned</span>
          <div className="flex items-end gap-2 mb-8">
            <span className="text-5xl font-black italic">₹{data?.totalEarnings?.toLocaleString()}</span>
            <span className="text-gray-400 font-bold mb-1">.00</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl">
              <span className="text-[10px] uppercase font-black text-gray-400 block mb-1">Present Days</span>
              <span className="text-xl font-bold">{data?.presentDays} Days</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl">
              <span className="text-[10px] uppercase font-black text-gray-400 block mb-1">Daily Rate</span>
              <span className="text-xl font-bold">₹{data?.dailyRate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-gray-900 ml-1">Payment Breakdown</h3>
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 space-y-4">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                <Calendar size={18} />
              </div>
              <span className="font-bold text-gray-700">Standard Service</span>
            </div>
            <span className="font-bold text-gray-900">₹{data?.totalEarnings}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-gray-50">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <AlertCircle size={18} />
              </div>
              <span className="font-bold">Bonus / Incentives</span>
            </div>
            <span className="font-bold text-gray-400">₹0</span>
          </div>
          <div className="pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
            <span className="text-sm font-black uppercase text-gray-400">Net Payable</span>
            <span className="text-2xl font-black text-lime-600">₹{data?.totalEarnings}</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-lime-50 rounded-3xl p-6 flex gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-lime-600 flex-shrink-0 shadow-sm">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h4 className="font-bold text-gray-900">Secure Payout</h4>
          <p className="text-sm text-gray-600 leading-relaxed">Payments are processed on the 1st of every month directly to your registered bank account.</p>
        </div>
      </div>

      <button className="w-full py-5 bg-gray-100 text-gray-900 rounded-3xl font-black flex items-center justify-center gap-2">
        <Download size={20} /> Download Statement
      </button>
    </div>
  );
};

export default CleanerEarnings;
