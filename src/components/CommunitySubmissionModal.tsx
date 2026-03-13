import React, { useState } from 'react';
import { X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  state: string;
  onSuccess: (newRate: any) => void;
}

export default function CommunitySubmissionModal({ isOpen, onClose, city, state, onSuccess }: Props) {
  const [fee, setFee] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee || isNaN(Number(fee))) {
      setError('Please enter a valid numeric fee amount.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          state,
          tntFee: Number(fee),
        })
      });
      
      if (!res.ok) throw new Error('Failed to submit rate');
      const data = await res.json();
      onSuccess(data);
      onClose();
      setFee('');
    } catch (err) {
      setError('An error occurred submitting the rate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-900">Report Local TNT Rate</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-900">
            You are anonymously reporting the 'Treatment Without Transport' (TNT) fee for <strong>{city}, {state}</strong>. This helps the community know what to expect.
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              Estimated Fee Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input 
                type="number" 
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="e.g. 150"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 pl-8 pr-4 text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-600 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-colors disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</span>
              ) : "Submit Rate"}
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 pt-2">
            Submitting this updates the community database. It does not constitute verified legal data.
          </p>
        </form>
      </div>
    </div>
  );
}
