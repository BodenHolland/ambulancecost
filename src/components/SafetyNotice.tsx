'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, X, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SafetyNotice() {
  const [showModal, setShowModal] = useState(false);
  const [hasBanner, setHasBanner] = useState(true);

  useEffect(() => {
    const acknowledged = localStorage.getItem('ambulancecost_safety_ack');
    if (!acknowledged) {
      setShowModal(true);
    }
  }, []);

  const handleContinue = () => {
    localStorage.setItem('ambulancecost_safety_ack', 'true');
    setShowModal(false);
  };

  return (
    <>
      {/* Persistent Banner */}
      {hasBanner && (
        <div className="bg-red-600 text-white py-2 px-4 text-center text-sm font-bold flex items-center justify-center gap-4 relative z-[60]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>IN AN EMERGENCY, CALL 911 IMMEDIATELY.</span>
          </div>
          <button 
            onClick={() => setHasBanner(false)}
            className="hover:bg-white/10 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emergency Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border-4 border-red-50">
            <div className="bg-red-50 p-8 flex items-center gap-4 border-b border-red-100">
              <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-red-900 tracking-tight">Emergency Notice</h2>
                <p className="text-red-600 font-bold text-sm uppercase tracking-widest">Medical Disclaimer</p>
              </div>
            </div>
            
            <div className="p-10 space-y-6">
              <p className="text-slate-900 text-lg font-bold leading-relaxed">
                If you are experiencing a medical or psychiatric emergency, call 911 or go to the nearest emergency department immediately.
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <p className="text-slate-600 text-sm leading-relaxed">
                  This website provides estimated ambulance costs for informational purposes only. It does not provide medical advice and should not be used to decide whether to seek emergency care.
                </p>
              </div>
              <p className="text-slate-900 text-base font-medium italic">
                If you believe someone may need urgent medical help, contact 911 right away.
              </p>
            </div>

            <div className="p-8 bg-slate-50 flex flex-col sm:flex-row gap-4">
              <a 
                href="tel:911" 
                className="flex-1 flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-black text-xl transition-all shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Phone className="w-6 h-6" />
                Call 911
              </a>
              <button 
                onClick={handleContinue}
                className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-800 py-5 rounded-2xl font-black text-xl transition-all hover:bg-slate-100 active:scale-[0.98]"
              >
                Continue to site
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
