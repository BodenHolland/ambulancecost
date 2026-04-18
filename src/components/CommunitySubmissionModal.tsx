import React, { useState } from 'react';
import { X, Loader2, AlertTriangle, ShieldCheck, Ambulance, Stethoscope } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  state: string;
  onSuccess: (newRate: any) => void;
  defaultType?: 'tnt' | 'transport';
}

export default function CommunitySubmissionModal({ isOpen, onClose, city, state, onSuccess, defaultType = 'tnt' }: Props) {
  const [type, setType] = useState<'tnt' | 'transport'>(defaultType);
  const [tntFee, setTntFee] = useState('');
  const [blsFee, setBlsFee] = useState('');
  const [alsFee, setAlsFee] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lock body scroll when modal is active
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      setType(defaultType); // Reset type to default when opened
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = { city, state, type };
    
    if (type === 'tnt') {
      if (!tntFee || isNaN(Number(tntFee))) {
        setError('Please enter a valid numeric fee amount.');
        return;
      }
      payload.tntFee = Number(tntFee);
    } else {
      if (!blsFee || isNaN(Number(blsFee)) || !alsFee || isNaN(Number(alsFee))) {
        setError('Please enter valid numeric fees for both BLS and ALS.');
        return;
      }
      payload.blsFee = Number(blsFee);
      payload.alsFee = Number(alsFee);
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to submit rate');
      const data = await res.json();
      onSuccess(data);
      onClose();
      // Reset fields
      setTntFee('');
      setBlsFee('');
      setAlsFee('');
    } catch (err) {
      setError('An error occurred submitting the rate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Submit Local Rates</h2>
            <p className="text-sm text-slate-500 font-medium">For {city}, {state}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm border border-slate-200">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Type Selector */}
          <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setType('tnt')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                type === 'tnt' 
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Treatment (TNT)
            </button>
            <button
              type="button"
              onClick={() => setType('transport')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                type === 'transport' 
                ? "bg-white text-sky-600 shadow-sm ring-1 ring-slate-200" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Ambulance className="w-4 h-4" />
              Transport Fees
            </button>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-[13px] leading-relaxed text-slate-600 font-medium font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-500 inline-block mr-2 mb-0.5" />
            Your submission is anonymous and helps map the real cost of emergency services. Please verify these against an official bill or city fee schedule.
          </div>
          
          <div className="space-y-6">
            {type === 'tnt' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Treatment Without Transport Fee
                </label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-blue-600 transition-colors">$</span>
                  <input 
                    type="number" 
                    value={tntFee}
                    onChange={(e) => setTntFee(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] py-4 pl-10 pr-6 text-xl font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    BLS Base Rate
                  </label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-sky-600 transition-colors">$</span>
                    <input 
                      type="number" 
                      value={blsFee}
                      onChange={(e) => setBlsFee(e.target.value)}
                      placeholder="e.g. 1800"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] py-4 pl-10 pr-6 text-xl font-black text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    ALS Base Rate
                  </label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-sky-600 transition-colors">$</span>
                    <input 
                      type="number" 
                      value={alsFee}
                      onChange={(e) => setAlsFee(e.target.value)}
                      placeholder="e.g. 2400"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] py-4 pl-10 pr-6 text-xl font-black text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 rounded-2xl border border-red-100">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-600 text-[13px] font-bold">{error}</p>
            </div>
          )}
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-black py-5 rounded-[20px] transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 shadow-lg flex justify-center items-center gap-3 ${
                type === 'tnt' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-sky-600 hover:bg-sky-700 shadow-sky-200'
              }`}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : "Submit Rates"}
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 font-medium px-4 leading-relaxed">
            Submitting this data updates the community crowd-sourced database. It does not constitute legal or billing advice.
          </p>
        </form>
      </div>
    </div>
  );
}
