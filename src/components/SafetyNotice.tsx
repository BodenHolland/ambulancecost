'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, X, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SafetyNotice() {
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasBanner, setHasBanner] = useState(true);

  useEffect(() => {
    setMounted(true);
    const acknowledged = localStorage.getItem('ambulancecost_safety_ack');
    if (!acknowledged) {
      setShowModal(true);
    }
  }, []);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [showModal]);

  const handleContinue = () => {
    localStorage.setItem('ambulancecost_safety_ack', 'true');
    setShowModal(false);
  };

  if (!mounted) return null;

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl max-w-lg w-full border-4 border-red-50 max-h-[90dvh] overflow-y-auto flex flex-col relative animate-in zoom-in-95 duration-300">
            <div className="bg-red-50 p-4 sm:p-6 flex items-center gap-3 sm:gap-4 border-b border-red-100 flex-shrink-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white shadow-lg shadow-red-600/20 flex-shrink-0">
                <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-red-900 tracking-tight">Emergency Notice</h2>
                <p className="text-red-600 font-bold text-xs sm:text-sm uppercase tracking-widest">Medical Disclaimer</p>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4 flex-shrink-0">
              <p className="text-slate-900 text-base sm:text-lg font-bold leading-relaxed">
                If you are experiencing a medical or psychiatric emergency, call 911 or go to the nearest emergency department immediately.
              </p>
              <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200">
                <p className="text-slate-600 text-sm leading-relaxed">
                  This website provides estimated ambulance costs for informational purposes only. It does not provide medical advice and should not be used to decide whether to seek emergency care.
                </p>
              </div>
              <p className="text-slate-900 text-sm sm:text-base font-medium italic">
                If you believe someone may need urgent medical help, contact 911 right away.
              </p>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 flex flex-col sm:flex-row gap-3 sm:gap-4 flex-shrink-0">
              <a 
                href="tel:911" 
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 sm:py-4 rounded-xl font-black text-lg sm:text-xl transition-all shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                Call 911
              </a>
              <button 
                onClick={handleContinue}
                className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-800 py-3 sm:py-4 rounded-xl font-black text-lg sm:text-xl transition-all hover:bg-slate-100 active:scale-[0.98]"
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
