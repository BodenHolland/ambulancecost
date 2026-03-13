'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Ambulance, Info, AlertTriangle, ShieldCheck, TrendingUp, DollarSign, Navigation, ChevronRight, ChevronLeft, X, ExternalLink, ShieldAlert, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { calculateEstimate, CalculationResult, LocalityType } from '@/lib/calculator';
import { getLocalTNTData, LocalFeeData } from '@/lib/localData';
import TakeAction from '@/components/TakeAction';
import CommunitySubmissionModal from '@/components/CommunitySubmissionModal';
import InaccuracyReportModal from '@/components/InaccuracyReportModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CommunityRate {
  city: string;
  state: string;
  tntFee: number;
  reportedAt: string;
}

export interface InaccuracyReport {
  city: string;
  reportedAt: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ZipData {
  zip: string;
  city: string;
  state: string;
  type: LocalityType;
  is_protected: number;
  contractor?: string | null;
  locality?: string | null;
  gpci?: number | null;
  rates?: {
    bls_urban: number | null;
    bls_rural: number | null;
    bls_super_rural: number | null;
    als_urban: number | null;
    als_rural: number | null;
    als_super_rural: number | null;
    mileage_urban: number | null;
    mileage_rural: number | null;
    gpci: number;
  } | null;
}

export default function AmbulanceCost() {
  const [zip, setZip] = useState('');
  const [miles, setMiles] = useState(1);
  const [serviceType, setServiceType] = useState<'BLS' | 'ALS'>('BLS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    calc: CalculationResult;
    data: ZipData;
  } | null>(null);

  const [showKeywordWarning, setShowKeywordWarning] = useState(false);
  const [communityRates, setCommunityRates] = useState<CommunityRate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInaccuracyModalOpen, setIsInaccuracyModalOpen] = useState(false);
  const [flaggedCities, setFlaggedCities] = useState<InaccuracyReport[]>([]);

  useEffect(() => {
    fetch('/api/community')
      .then(res => res.json())
      .then(data => setCommunityRates(data))
      .catch(err => console.error('Failed to load community rates', err));

    fetch('/api/inaccuracy')
      .then(res => res.json())
      .then(data => setFlaggedCities(data))
      .catch(err => console.error('Failed to load flagged cities', err));
  }, []);

  const emergencyKeywords = ['help', 'dying', 'emergency', 'heart attack', 'stroke', 'bleeding', 'accident', 'suicide', '911', 'cpr'];

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cleanVal = val.replace(/\D/g, '').substring(0, 5);
    setZip(cleanVal);

    // Detect keywords even if zip input is mainly numbers, 
    // but users might try to type help in it
    if (emergencyKeywords.some(kw => val.toLowerCase().includes(kw))) {
      setShowKeywordWarning(true);
    } else {
      setShowKeywordWarning(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!zip || zip.length < 5) {
      if (!showKeywordWarning) setError('Please enter a valid 5-digit zip code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lookup?zip=${zip}`);
      if (!response.ok) {
        // Fallback for demo if zip not in db
        const fallback: ZipData = {
          zip,
          city: 'Unknown',
          state: 'Unknown',
          type: 'urban',
          is_protected: 0,
          rates: null
        };
        const calc = calculateEstimate(serviceType, miles, 'urban', null);
        setResult({ calc, data: fallback });
        if (response.status === 404) {
          setError('Zip code not in 2026 database. Showing urban estimates.');
        } else {
          throw new Error('Search failed');
        }
      } else {
        const data: ZipData = await response.json();
        const calc = calculateEstimate(serviceType, miles, data.type, data.rates || null);
        setResult({ calc, data });
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportInaccuracy = async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/inaccuracy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: result.data.city })
      });
      if (res.ok) {
        const newReport = await res.json();
        setFlaggedCities(prev => [...prev.filter(f => f.city.toLowerCase() !== newReport.city.toLowerCase()), newReport]);
      }
    } catch (err) {
      console.error('Failed to report inaccuracy', err);
    }
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode using OSM (free, no key needed for small use)
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const postcode = data.address.postcode;
          if (postcode) {
            setZip(postcode.substring(0, 5));
            // Trigger search automatically after getting zip
            // Note: setZip is async, so we use the postcode directly
            const lookupRes = await fetch(`/api/lookup?zip=${postcode.substring(0, 5)}`);
            if (lookupRes.ok) {
              const zipData: ZipData = await lookupRes.json();
              const calc = calculateEstimate(serviceType, miles, zipData.type, zipData.rates || null);
              setResult({ calc, data: zipData });
            }
          }
        } catch (err) {
          setError('Failed to resolve your location to a Zip Code.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Unable to retrieve your location.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {!result ? (
        <header className="bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 text-white pt-20 pb-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Ambulance<span className="text-blue-400">Cost</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto mb-12 text-balance">
              Nationwide ambulance fee transparency. Know the Medicare rate, spot the sticker price, and check your state protections.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="pl-6 pr-3 py-5 flex items-center justify-center">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Enter Zip Code (e.g. 94107)"
                  className="flex-1 py-5 bg-transparent outline-none text-slate-800 font-black placeholder:text-slate-400 placeholder:font-bold text-xl"
                  value={zip}
                  onChange={handleZipChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  onClick={useLocation}
                  className="p-5 text-blue-600 hover:bg-slate-50 transition-colors border-l border-slate-100"
                  title="Use my location"
                >
                  <Navigation className="w-6 h-6" />
                </button>
              </div>
              <button 
                onClick={() => handleSearch()}
                disabled={loading}
                className="py-5 w-full sm:w-[220px] flex justify-center items-center bg-blue-600 hover:bg-blue-500 border border-white/20 text-white font-black text-xl rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 active:scale-[0.98] whitespace-nowrap"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Calculating</span>
                  </div>
                ) : 'Calculate'}
              </button>
            </div>
            
            {showKeywordWarning && (
              <div className="max-w-2xl mx-auto mt-4 bg-red-600 text-white p-4 rounded-xl flex items-center gap-3 animate-bounce">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="font-bold text-sm">EMERGENCY DETECTED: If you need immediate medical help, call 911 now. This tool is for estimation only.</p>
                <a href="tel:911" className="ml-auto bg-white text-red-600 px-4 py-1 rounded-lg font-black text-xs uppercase">CALL 911</a>
              </div>
            )}
            
            {error && <p className="mt-4 text-red-300 font-medium flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4"/> {error}</p>}
          </div>
        </header>
      ) : (
        <header className="bg-white border-b border-slate-200 pt-24 pb-8 px-6 shadow-sm relative z-30">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <button 
                onClick={() => setResult(null)} 
                className="text-slate-400 hover:text-blue-600 font-bold text-xs tracking-wide transition-colors flex items-center gap-1 mb-3 group uppercase"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> New Search
              </button>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 tracking-tight break-words">
                {result.data.city}, {result.data.state}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-slate-500 font-mono text-sm bg-slate-100 px-2 py-1 rounded">ZIP: {result.data.zip}</span>
                <span className="text-slate-400 text-sm italic">CMS Locality: {result.data.type}</span>
              </div>
            </div>

          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn("max-w-5xl mx-auto px-4 relative z-20", !result ? "-mt-16" : "mt-12")}>
        {!result ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: 'Locality Based', desc: 'Rates adjust automatically based on CMS Urban, Rural, and Super-Rural designations.' },
              { icon: ShieldCheck, title: 'Consumer Protection', desc: 'Information on ground ambulance surprise billing laws in 22+ protected states.' },
              { icon: TrendingUp, title: 'Market Analysis', desc: 'Compare government-set Medicare rates with typical private provider sticker prices.' }
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* THING NUMBER ONE: Is Arrival Free? */}
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border-4 border-blue-600 overflow-hidden relative">
              <div className="bg-blue-600 text-white px-6 md:px-8 py-5 md:py-6 flex items-center justify-between">
                <div>
                  <p className="text-xl md:text-3xl font-black">Treatment Without Transport Fees</p>
                </div>
              </div>
              
              <div className="p-6 md:p-8">
                {(() => {
                  const matchLocal = result ? getLocalTNTData(result.data.city) : null;
                  const matchCommunity = result ? communityRates.find(r => r.city.toLowerCase() === result.data.city.toLowerCase()) : null;

                  if (matchLocal) {
                    return (
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                            Reported Local Rate: {result?.data.city}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl md:text-5xl font-black text-emerald-600">
                              {typeof matchLocal.tntFee === 'number' ? `$${matchLocal.tntFee}` : matchLocal.tntFee}
                            </span>
                            <span className="text-emerald-900/40 font-black text-xs uppercase tracking-tighter">TNT Fee</span>
                          </div>
                          <p className="text-slate-500 text-sm font-medium leading-relaxed w-full">
                            Commonly referred to as "Treatment No Transport" (TNT) fees, these occur when paramedics provide medical care but do not take you to a hospital.
                            <Link href="/resources/treatment-without-transport-explained" className="ml-2 text-blue-600 font-bold hover:underline inline-flex items-center gap-1 group/link">
                              Is this covered? <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                          </p>
                          <div className="text-slate-500 text-sm font-medium leading-relaxed w-full border-t border-slate-100 pt-3 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex flex-wrap gap-2 items-center">
                                <span>{matchLocal.description}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium italic">Resource last updated on March 12, 2026</span>
                            </div>
                            <button 
                              onClick={() => setIsInaccuracyModalOpen(true)}
                              className="text-[10px] text-slate-400 font-bold bg-slate-100/50 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors whitespace-nowrap"
                            >
                              Report Inaccurate Data
                            </button>
                          </div>
                          {flaggedCities.find(f => f.city.toLowerCase() === result.data.city.toLowerCase()) && (
                            <div className="mt-3 flex items-center gap-1.5 text-slate-400">
                              <AlertTriangle className="w-3 h-3" />
                              <p className="text-[10px] font-medium italic">
                                This data was flagged for review for accuracy on {flaggedCities.find(f => f.city.toLowerCase() === result.data.city.toLowerCase())?.reportedAt} by another user.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (matchCommunity) {
                    return (
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                            Reported User Rate: {result?.data.city}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl md:text-5xl font-black text-slate-800">
                              ${matchCommunity.tntFee}
                            </span>
                            <span className="text-slate-400 font-black text-xs uppercase tracking-tighter">TNT Fee</span>
                          </div>
                          <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Commonly referred to as "Treatment No Transport" (TNT) fees, these occur when paramedics provide medical care but do not transport you.
                            <Link href="/resources/treatment-without-transport-explained" className="ml-2 text-blue-600 font-bold hover:underline inline-flex items-center gap-1 group/link">
                              Is this covered? <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                          </p>
                          <div className="border-t border-amber-200/40 p-4 mt-4 bg-amber-50 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <p className="text-amber-800/80 text-xs italic">
                              <strong>Warning:</strong> This fee was reported by a community member on <strong>{matchCommunity.reportedAt}</strong> and has not been vetted by our team.
                            </p>
                             <button 
                              onClick={() => setIsInaccuracyModalOpen(true)}
                              className="text-[10px] text-slate-400 font-bold bg-slate-100/50 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors whitespace-nowrap"
                            >
                              Update / Flag Rate
                            </button>
                          </div>
                          {flaggedCities.find(f => f.city.toLowerCase() === result.data.city.toLowerCase()) && (
                            <div className="mt-3 flex items-center gap-1.5 text-slate-400">
                              <AlertTriangle className="w-3 h-3" />
                              <p className="text-[10px] font-medium italic">
                                This data was flagged for review for accuracy on {flaggedCities.find(f => f.city.toLowerCase() === result.data.city.toLowerCase())?.reportedAt} by another user.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="w-8 h-8" />
                      </div>
                      <div className="space-y-1 w-full">
                        <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                           Data Unavailable for {result?.data.city || 'Zip'}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-300 uppercase italic">Rate Information Unavailable</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                          Commonly referred to as "Treatment No Transport" (TNT) fees, these occur when paramedics provide medical care but do not transport you. Most municipalities charge between $150–$600.
                          <Link href="/resources/treatment-without-transport-explained" className="ml-2 text-blue-600 font-bold hover:underline inline-flex items-center gap-1 group/link">
                            Is this covered? <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                          </Link>
                        </p>
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                          <p className="text-blue-900/80 text-sm leading-relaxed font-medium text-center sm:text-left flex-1">
                            We are crowd-sourcing a national database. <strong>If you know the local policy or have recently been billed</strong>, please support this effort by submitting your rate.
                          </p>
                          <button 
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 text-white font-black text-sm px-6 py-3 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap w-full sm:w-auto"
                          >
                            Submit Local Rate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Transport Selection Tiles */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Select Transport Level</h3>
                <Link href="/resources/bls-vs-als-differences" className="text-blue-600 font-bold text-sm hover:text-blue-800 transition-colors inline-flex items-center gap-1 group">
                  Learn more about the difference <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <button 
                  onClick={() => setServiceType('BLS')}
                  className={cn(
                    "relative p-6 pt-10 rounded-[2rem] text-left transition-all group overflow-hidden border-2",
                    serviceType === 'BLS' 
                      ? "bg-white border-blue-600 shadow-xl shadow-blue-600/10" 
                      : "bg-slate-50 border-transparent hover:bg-slate-100/80 hover:border-slate-200"
                  )}
                >
                  {serviceType === 'BLS' && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1.5 rounded-bl-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-sm">
                      Selected
                    </div>
                  )}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 mt-1",
                      serviceType === 'BLS' ? "bg-blue-100 text-blue-600" : "bg-white text-slate-400 shadow-sm"
                    )}>
                      <Ambulance className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 mb-1">Basic Care (BLS)</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">Standard EMT-staffed transport for non-life-threatening medical needs.</p>
                    </div>
                  </div>
                  

                </button>

                <button 
                  onClick={() => setServiceType('ALS')}
                  className={cn(
                    "relative p-6 pt-10 rounded-[2rem] text-left transition-all group overflow-hidden border-2",
                    serviceType === 'ALS' 
                      ? "bg-white border-indigo-600 shadow-xl shadow-indigo-600/10" 
                      : "bg-slate-50 border-transparent hover:bg-slate-100/80 hover:border-slate-200"
                  )}
                >
                  {serviceType === 'ALS' && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1.5 rounded-bl-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-sm">
                      Selected
                    </div>
                  )}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 mt-1",
                      serviceType === 'ALS' ? "bg-indigo-100 text-indigo-600" : "bg-white text-slate-400 shadow-sm"
                    )}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 mb-1">Paramedic (ALS)</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">Advanced medical intervention staffed by Paramedics for critical needs.</p>
                    </div>
                  </div>


                </button>
              </div>
            </div>

            {/* Price Cards (The Market vs Medicare ones) */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Estimated Market Rate Card */}
              <div 
                className="text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-white/5" 
                style={{ backgroundColor: '#111827' }}
              >
                {/* Subtle Glow Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-amber-500/10 transition-colors duration-700" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div 
                      className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500" 
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                    >
                      <TrendingUp className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#F59E0B' }} />
                    </div>
                    <div>
                      <h2 
                        className="font-bold text-[10px] uppercase tracking-[0.3em] mb-1" 
                        style={{ color: '#9CA3AF' }}
                      >
                        Market Average
                      </h2>
                      <p className="text-white font-black text-xl md:text-2xl italic tracking-tight">Estimated Market Rate</p>
                    </div>
                  </div>

                  <div className="mb-8 text-center sm:text-left">
                    <div className="flex items-baseline justify-center sm:justify-start gap-1">
                      <span 
                        className="font-black text-5xl md:text-7xl lg:text-8xl tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                        style={{ color: '#F59E0B' }}
                      >
                        ${(calculateEstimate(serviceType, 0, result.data.type, result.data.rates || null).baseRate * 3).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="font-black text-sm md:text-base opacity-40 uppercase tracking-widest ml-1" style={{ color: '#9CA3AF' }}>Est.</span>
                    </div>
                    <p className="font-bold text-[11px] mt-2 uppercase tracking-[0.1em] italic" style={{ color: '#9CA3AF' }}>Market Base Rate Estimate</p>
                  </div>

                  <p 
                    className="text-xs md:text-sm leading-relaxed mb-10 pl-5 border-l-2 border-amber-500/20" 
                    style={{ color: '#9CA3AF' }}
                  >
                    This is the average price private ambulance companies and municipal departments charge for this service in your region. While Medicare sets a "floor," the Market Rate reflects the actual bill you are likely to receive before insurance adjustments. We calculate this by aggregating state-wide billing data and commercial insurance "allowed amounts" for 2026.
                  </p>

                  <div className="space-y-4 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div 
                      className="flex justify-between items-center p-6 rounded-3xl transition-all hover:bg-white/5 border border-white/5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    >
                      <div>
                        <span 
                          className="font-black text-[10px] uppercase tracking-widest block mb-1" 
                          style={{ color: '#F59E0B' }}
                        >
                          + Per Mile Transported
                        </span>
                        <p className="text-[10px] font-medium uppercase opacity-50" style={{ color: '#9CA3AF' }}>Additional {result.data.type} loaded mile rate</p>
                      </div>
                      <div className="text-right">
                        <span 
                          className="font-black text-2xl md:text-4xl block leading-none" 
                          style={{ color: '#F59E0B' }}
                        >
                          ${(calculateEstimate(serviceType, 1, result.data.type, result.data.rates || null).mileageRate * 3).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medicare Benchmark Card */}
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl border-4 border-blue-50 relative overflow-hidden group">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-100 rounded-[1.25rem] flex items-center justify-center">
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">Standard Calculation</h2>
                    <p className="text-slate-900 font-black text-xl md:text-2xl italic">Medicare Benchmark</p>
                  </div>
                </div>
                
                <div className="mb-10 text-center sm:text-left">
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-slate-900 font-black text-5xl md:text-6xl lg:text-7xl tracking-tighter">
                      ${Math.floor(calculateEstimate(serviceType, 0, result.data.type, result.data.rates || null).baseRate).toLocaleString()}
                    </span>
                    <span className="text-slate-400 font-black text-xl md:text-2xl">.{(calculateEstimate(serviceType, 0, result.data.type, result.data.rates || null).baseRate % 1).toFixed(2).substring(2)}</span>
                  </div>
                  <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-wide">Official Schedule Base Rate</p>
                </div>

                <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-10 border-l-2 border-blue-500/30 pl-4">
                  This is the "official" rate established by the federal government for your specific zip code in 2026. Medicare uses this baseline to reimburse providers for medically necessary transport. While private companies often charge more, this figure serves as the industry standard for what the service is actually valued at by federal auditors.
                </p>

                <div className="space-y-4 border-t border-slate-100 pt-8">
                  <div className="flex justify-between items-center bg-blue-50 p-5 rounded-[1.5rem] border border-blue-100">
                    <div>
                      <span className="text-blue-700 font-black text-[10px] uppercase tracking-widest block mb-1">+ Per Mile Transported</span>
                      <p className="text-blue-900/60 font-medium text-[10px] uppercase">Additional {result.data.type} loaded mile rate</p>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <span className="text-blue-600 font-black text-2xl md:text-3xl block leading-none">${calculateEstimate(serviceType, 1, result.data.type, result.data.rates || null).mileageRate.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Tiles Row */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* State Protection */}
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden flex flex-col justify-center">
                <div className="flex flex-col xl:flex-row gap-6 items-center text-center xl:text-left">
                  <div className={cn(
                    "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center flex-shrink-0 relative",
                    result.data.is_protected ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}>
                    <ShieldCheck className="w-8 h-8 md:w-10 md:h-10" />
                    {result.data.is_protected && <span className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 mb-2">
                      <h3 className="text-slate-900 font-black text-xl">Surprise Billing Protection</h3>
                    </div>
                    <div className="flex justify-center xl:justify-start mb-3">
                      {result.data.is_protected ? (
                        <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">SURPRISE BILLING PROTECTED</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">LIMITED PROTECTION</span>
                      )}
                    </div>
                    {result.data.is_protected ? (
                      <p className="text-slate-600 leading-relaxed text-sm">
                        Good news! <strong>{result.data.state}</strong> has active ground ambulance surprise billing protections. 
                        In most cases, your cost-sharing is limited to in-network services.
                      </p>
                    ) : (
                      <p className="text-slate-600 leading-relaxed text-sm">
                        Currently, <strong>{result.data.state}</strong> has fewer ground ambulance protections. 
                        Federal "No Surprises Act" only applies to Air ambulances.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Insurance Coverage Link */}
              <Link href="/resources/does-insurance-cover-ambulance" className="group block h-full">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-indigo-100 relative overflow-hidden flex flex-col justify-center h-full transition-all hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-300">
                  <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
                    <FileText className="w-48 h-48" />
                  </div>
                  
                  <div className="flex flex-col xl:flex-row gap-6 items-center text-center xl:text-left relative z-10">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white text-indigo-600 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                       <FileText className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 mb-4">
                        <h3 className="text-slate-900 font-black text-xl group-hover:text-indigo-700 transition-colors">
                          Will insurance pay for this?
                        </h3>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-sm mb-4">
                        Learn about the strict "Medical Necessity" rules that determine if Medicare or private limits will actually cover your bill.
                      </p>
                      
                      <div className="text-indigo-600 font-bold text-sm inline-flex items-center gap-1 uppercase tracking-wide">
                        Read Article <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
            
            {/* Combined Disclaimer */}
            <div className="px-6 py-5 md:px-8 md:py-6 bg-amber-50 border border-amber-200 rounded-[2.5rem] flex items-start gap-4 shadow-sm mt-8">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <p className="text-sm md:text-base text-amber-800/90 leading-relaxed font-medium">
                <strong className="text-amber-900 mr-2">Disclaimer:</strong>
                These estimates are for educational purposes only. Actual bills vary by insurance, provider, location, and services rendered. This tool does not provide legal, financial, or medical advice—always prioritize clinical safety over cost.
              </p>
            </div>
          </div>
        )}
      </main>

      <div className="max-w-5xl mx-auto px-4 mt-8 md:mt-12">
        <TakeAction initialZip={zip} />
      </div>


      <CommunitySubmissionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        city={result?.data.city || ''}
        state={result?.data.state || ''}
        onSuccess={(newRate) => setCommunityRates(prev => [...prev.filter(r => r.city.toLowerCase() !== newRate.city.toLowerCase()), newRate])}
      />

      <InaccuracyReportModal
        isOpen={isInaccuracyModalOpen}
        onClose={() => setIsInaccuracyModalOpen(false)}
        city={result?.data.city || ''}
        onReport={handleReportInaccuracy}
      />
    </div>
  );
}
