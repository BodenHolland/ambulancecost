import React from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  onReport: () => void;
}

export default function InaccuracyReportModal({ isOpen, onClose, city, onReport }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Notify of Inaccuracy</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <p className="text-slate-600 leading-relaxed font-medium">
              We strive for 100% accuracy in our database. If you believe the Treatment Without Transport (TNT) data for <strong className="text-slate-900">{city}</strong> is incorrect, please notify us.
            </p>
            
            <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
              <p className="text-rose-900/80 text-sm leading-relaxed font-medium">
                Our team will manually review and verify the official fee schedule for this municipality.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <button
              onClick={() => {
                onReport();
                onClose();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex justify-center items-center gap-2 group"
            >
              <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Notify our team
            </button>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              No personal data is collected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
