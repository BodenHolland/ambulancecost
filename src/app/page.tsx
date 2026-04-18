'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Ambulance, Info, AlertTriangle, ShieldCheck, TrendingUp, DollarSign, Navigation, ChevronRight, ChevronLeft, X, ExternalLink, ShieldAlert, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { calculateEstimate, CalculationResult, LocalityType } from '@/lib/calculator';
import { getLocalTNTData, LocalFeeData } from '@/lib/localData';
import TakeAction from '@/components/TakeAction';
import CommunitySubmissionModal from '@/components/CommunitySubmissionModal';
import InaccuracyReportModal from '@/components/InaccuracyReportModal';
import ResourceOverlay from '@/components/ResourceOverlay';
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
  verified_tnt?: {
    city: string;
    state: string;
    tnt_fee: number;
    description: string;
    source_url: string;
    source_label?: string;
    is_verified: number;
    last_updated: string;
  } | null;
  verified_market?: {
    zip_prefix: string;
    city: string;
    bls_base: number | null;
    als_base: number | null;
    mileage: number | null;
    source_url: string;
    source_label?: string;
    notes?: string | null;
    verified_date: string;
    estimate_type?: string;
    match_level?: string | null;
  } | null;
  entity_info?: {
    id: string;
    name: string;
    estimate_type?: string;
    match_level?: string | null;
    source_label?: string | null;
    effective_date?: string | null;
    notes?: string | null;
    last_verified?: string | null;
  } | null;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    calc: CalculationResult;
    data: ZipData;
  } | null>(null);

  const [citiesData, setCitiesData] = useState<[string, string, string][]>([]);
  const [suggestions, setSuggestions] = useState<[string, string, string][]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [showKeywordWarning, setShowKeywordWarning] = useState(false);
  const [communityRates, setCommunityRates] = useState<CommunityRate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionType, setSubmissionType] = useState<'tnt' | 'transport'>('tnt');
  const [isInaccuracyModalOpen, setIsInaccuracyModalOpen] = useState(false);
  const [flaggedCities, setFlaggedCities] = useState<InaccuracyReport[]>([]);
  const [activeResource, setActiveResource] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/community')
      .then(res => res.json())
      .then(data => setCommunityRates(data))
      .catch(err => console.error('Failed to load community rates', err));

    fetch('/api/inaccuracy')
      .then(res => res.json())
      .then(data => setFlaggedCities(data))
      .catch(err => console.error('Failed to load flagged cities', err));

    fetch('/cities.json')
      .then(res => res.json())
      .then(data => setCitiesData(data))
      .catch(err => console.error('Failed to load cities data', err));
  }, []);

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cities we have verified data for and want to show at the top of search suggestions
const PRIORITY_CITIES = [
  'San Antonio, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Diego, CA',
  'Dallas, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Charlotte, NC',
  'Indianapolis, IN',
  'Miami, FL',
  'Las Vegas, NV',
  'San Bernardino, CA',
  'Chicago, IL',
  'New York, NY',
  'Houston, TX',
  'Los Angeles, CA'
];

const emergencyKeywords = ['help', 'dying', 'emergency', 'heart attack', 'stroke', 'bleeding', 'accident', 'suicide', '911', 'cpr'];

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setZip(val);

    if (emergencyKeywords.some(kw => val.toLowerCase().includes(kw))) {
      setShowKeywordWarning(true);
    } else {
      setShowKeywordWarning(false);
    }

    if (val.trim() === '') {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    const q = val.toLowerCase().trim();
    const isNum = /^\d/.test(q);
    
    // Filter and Deduplicate by City+State
    const seen = new Set<string>();
    const filtered: [string, string, string][] = [];
    
    for (const cityTuple of citiesData) {
      const cityName = cityTuple[0];
      const stateCode = cityTuple[1];
      const zipCode = cityTuple[2];
      const cityStateKey = `${cityName}, ${stateCode}`;

      let matches = false;
      if (isNum) {
        matches = zipCode.startsWith(q);
      } else {
        const nameFirst = cityName.toLowerCase();
        const nameFull = cityStateKey.toLowerCase();
        matches = nameFirst.startsWith(q) || nameFull.includes(q);
      }

      if (matches) {
        // If it's a number search, we show all zips that match prefix
        // If it's a name search, we deduplicate so San Antonio, TX only shows once
        if (isNum) {
          filtered.push(cityTuple);
        } else if (!seen.has(cityStateKey)) {
          filtered.push(cityTuple);
          seen.add(cityStateKey);
        }
      }
      
      // Stop early if we have enough raw matches to sort through, 
      // but keep enough to find priority ones (e.g., first 100 matches)
      if (filtered.length >= 100) break;
    }

    // Sort: Priority cities first, then alphabetical
    const sorted = filtered.sort((a, b) => {
      const aKey = `${a[0]}, ${a[1]}`;
      const bKey = `${b[0]}, ${b[1]}`;
      const aPriority = PRIORITY_CITIES.includes(aKey);
      const bPriority = PRIORITY_CITIES.includes(bKey);
      
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
      return aKey.localeCompare(bKey);
    }).slice(0, 8);

    setSuggestions(sorted);
    setShowSuggestions(sorted.length > 0);
  };

  const handleSelectSuggestion = (cityTuple: [string, string, string]) => {
    const selectedZip = cityTuple[2];
    setZip(`${cityTuple[0]}, ${cityTuple[1]} (${selectedZip})`);
    setShowSuggestions(false);
    handleSearch(undefined, selectedZip);
  };

  const handleSearch = async (e?: React.FormEvent, zipOverride?: string) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    
    let zipToSearch = zipOverride || zip;
    const match = zipToSearch.match(/\((\d{5})\)$/);
    if (match) {
      zipToSearch = match[1];
    } else {
      zipToSearch = zipToSearch.replace(/\D/g, '').substring(0, 5);
    }

    if (!zipToSearch || zipToSearch.length < 5) {
      if (suggestions.length > 0) {
        zipToSearch = suggestions[0][2];
        setZip(`${suggestions[0][0]}, ${suggestions[0][1]} (${zipToSearch})`);
      } else {
        if (!showKeywordWarning) setError('Please enter a valid 5-digit zip code or city name.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lookup?zip=${zipToSearch}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Zip code not in 2026 database. Showing urban estimates.');
        } else {
          setError('Could not connect to database. Showing limited information.');
        }
      } else {
        const data: ZipData = await response.json();
        const calc = calculateEstimate('BLS', miles, data.type, data.rates || null, data.verified_market || null);
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
            const cleanZip = postcode.substring(0, 5);
            setZip(cleanZip);
            // Trigger search automatically after getting zip
            handleSearch(undefined, cleanZip);
          } else {
            setError('Failed to resolve your location to a Zip Code.');
            setLoading(false);
          }
        } catch (err) {
          setError('Failed to resolve your location to a Zip Code.');
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
          
          <div className="max-w-4xl mx-auto text-center relative z-30">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Ambulance<span className="text-blue-400">Cost</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto mb-12 text-balance">
              Nationwide ambulance fee transparency. Know the Medicare rate, spot the sticker price, and check your state protections.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4" ref={searchContainerRef}>
              <div className="flex-1 relative flex items-center bg-white rounded-2xl shadow-2xl">
                <div className="pl-6 pr-3 py-5 flex items-center justify-center">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  name="ambulanceZipSearch"
                  id="ambulanceZipSearch"
                  placeholder="City, State or Zip Code"
                  className="flex-1 py-5 bg-transparent outline-none text-slate-800 font-black placeholder:text-slate-400 placeholder:font-bold text-base sm:text-lg md:text-xl"
                  value={zip}
                  onChange={handleZipChange}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoComplete="off"
                />
                <button 
                  onClick={useLocation}
                  className="p-5 text-blue-600 hover:bg-slate-50 transition-colors border-l border-slate-100 rounded-r-2xl"
                  title="Use my location"
                >
                  <Navigation className="w-6 h-6" />
                </button>
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 text-left">
                    <ul className="py-2">
                      {suggestions.map((s, idx) => (
                        <li key={idx}>
                          <button
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-6 py-3 hover:bg-blue-50 focus:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                          >
                            <span className="text-slate-800 font-bold">{s[0]}</span>
                            <span className="text-slate-500 font-medium">, {s[1]}</span>
                            {/^\d/.test(zip) && <span className="text-slate-400 font-mono text-xs ml-2">({s[2]})</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button 
                onClick={() => handleSearch()}
                disabled={loading}
                className="py-5 w-full sm:w-[220px] flex justify-center items-center bg-blue-600 hover:bg-blue-500 border border-white/20 text-white font-black text-lg sm:text-xl rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 active:scale-[0.98] whitespace-nowrap"
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
              { icon: MapPin, title: 'Local Pricing', desc: 'See specific rates for your area based on federal guidelines for urban and rural zones.' },
              { icon: ShieldCheck, title: 'Know Your Rights', desc: 'Stay informed with the latest updates on surprise billing laws and protections in your state.' },
              { icon: TrendingUp, title: 'Price Comparison', desc: 'Understand the gap between standard Medicare rates and what private providers typically bill.' }
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
          <>
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
                  const verifiedTnt = result.data.verified_tnt;
                  const matchLocal = !verifiedTnt ? getLocalTNTData(result.data.city) : null;
                  const matchCommunity = !verifiedTnt && !matchLocal && Array.isArray(communityRates) ? communityRates.find(r => r.city.toLowerCase() === result.data.city.toLowerCase()) : null;

                  if (verifiedTnt) {
                    return (
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest mb-1">
                              Reported Local Rate: {result?.data.city}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl md:text-5xl font-black text-emerald-600">
                              ${verifiedTnt.tnt_fee}
                            </span>
                             <span className="text-emerald-900/40 font-black text-xs uppercase tracking-tighter">Reported TNT Fee</span>
                          </div>
                          <p className="text-slate-500 text-sm font-medium leading-relaxed w-full">
                            {verifiedTnt.description}
                            <button onClick={() => setActiveResource('treatment-without-transport-explained')} className="ml-2 text-blue-600 font-bold hover:underline inline-flex items-center gap-1 group/link text-left">
                              Is this covered? <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                            </button>
                          </p>
                          <div className="text-slate-500 text-sm font-medium leading-relaxed w-full border-t border-slate-100 pt-3 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex flex-wrap gap-2 items-center">
                                 <span>Official rate reported for this locality.</span>
                                {verifiedTnt.source_url && (
                                  <a href={verifiedTnt.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                                    {verifiedTnt.source_label || 'Source'} <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium italic">Resource last updated on {verifiedTnt.last_updated}</span>
                            </div>
                            <button 
                              onClick={() => setIsInaccuracyModalOpen(true)}
                              className="text-[10px] text-slate-400 font-bold bg-slate-100/50 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors whitespace-nowrap"
                            >
                              Report Inaccurate Data
                            </button>
                          </div>
                        </div>
                    );
                  }

                  if (matchLocal) {
                    return (
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest mb-1">
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
                            <button onClick={() => setActiveResource('treatment-without-transport-explained')} className="ml-2 text-blue-600 font-bold hover:underline inline-flex items-center gap-1 group/link text-left">
                              Is this covered? <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                            </button>
                          </p>
                          <div className="text-slate-500 text-sm font-medium leading-relaxed w-full border-t border-slate-100 pt-3 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex flex-wrap gap-2 items-center">
                                <span>{matchLocal.description}</span>
                                {matchLocal.sourceUrl && (
                                  <a href={matchLocal.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                                    Source <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
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
                          {Array.isArray(flaggedCities) && flaggedCities.find(f => f.city.toLowerCase() === result.data.city.toLowerCase()) && (
                            <div className="mt-3 flex items-center gap-1.5 text-slate-400">
                              <AlertTriangle className="w-3 h-3" />
                              <p className="text-[10px] font-medium italic">
                                This data was flagged for review for accuracy on {flaggedCities.find(f => f.city.toLowerCase() === result.data.city.toLowerCase())?.reportedAt} by another user.
                              </p>
                            </div>
                          )}
                        </div>
                    );
                  }

                  if (matchCommunity) {
                    return (
                        <div className="space-y-1 w-full">
                          <div className="flex items-center justify-between w-full mb-1">
                            <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                              Reported User Rate: {result?.data.city}
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl md:text-5xl font-black text-slate-800">
                              ${matchCommunity.tntFee}
                            </span>
                            <span className="text-slate-400 font-black text-xs uppercase tracking-tighter">TNT Fee</span>
                          </div>
                          <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Commonly referred to as "Treatment No Transport" (TNT) fees, these occur when paramedics provide medical care but do not transport you.
                            <button onClick={() => setActiveResource('treatment-without-transport-explained')} className="ml-2 text-blue-600 font-bold hover:underline inline-flex items-center gap-1 group/link text-left">
                              Is this covered? <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                            </button>
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
                          {Array.isArray(flaggedCities) && flaggedCities.find(f => f.city.toLowerCase() === result.data.city.toLowerCase()) && (
                            <div className="mt-3 flex items-center gap-1.5 text-slate-400">
                              <AlertTriangle className="w-3 h-3" />
                              <p className="text-[10px] font-medium italic">
                                This data was flagged for review for accuracy on {flaggedCities.find(f => f.city.toLowerCase() === result.data.city.toLowerCase())?.reportedAt} by another user.
                              </p>
                            </div>
                          )}
                        </div>
                    );
                  }

                  return (
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                           Data Unavailable for {result?.data.city || 'Zip'}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-300 uppercase italic">Rate Information Unavailable</span>
                      </div>
                      <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        Commonly referred to as "Treatment No Transport" (TNT) fees, these occur when paramedics provide medical care but do not transport you. Most municipalities charge between $150–$600.
                        <button onClick={() => setActiveResource('treatment-without-transport-explained')} className="ml-2 text-blue-600 font-bold hover:underline inline-flex items-center gap-1 group/link text-left">
                          Is this covered? <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                        </button>
                      </p>
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <p className="text-blue-900/80 text-sm leading-relaxed font-medium text-center sm:text-left flex-1">
                          We are crowd-sourcing a national database to fill gaps in federal records. <strong>If you know the local policy or have recently been billed</strong>, please support this effort by submitting your rate. <button onClick={() => setActiveResource('where-we-get-data')} className="underline font-bold hover:text-blue-700 transition-colors">Learn how we source our data.</button>
                        </p>
                        <button 
                          onClick={() => {
                            setSubmissionType('tnt');
                            setIsModalOpen(true);
                          }}
                          className="bg-blue-600 text-white font-black text-sm px-6 py-3 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap w-full sm:w-auto"
                        >
                          Submit Local Rate
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>



            {/* Price Cards (The Market vs Medicare ones) */}
            <div className="space-y-8">
              {/* Estimated Transport Fees Card */}
              <div 
                className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border-4 border-sky-600 overflow-hidden relative"
              >
                <div className="bg-sky-600 text-white px-6 md:px-8 py-4 md:py-5 flex items-center justify-between">
                  <div>
                    <p className="text-xl md:text-2xl font-black">
                      {result.data.verified_market ? 'Reported Transport Fees' : 'Estimated Transport Fees'}
                    </p>
                  </div>
                  {result.data.verified_market?.source_url ? (
                    <a href={result.data.verified_market.source_url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-sky-100 font-bold flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl text-[10px] transition-colors border border-white/20">
                      {result.data.verified_market.source_label || 'Source'} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button onClick={() => setActiveResource('where-we-get-data')} className="text-white hover:text-sky-100 font-bold flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl text-[10px] transition-colors border border-white/20">
                      Methodology <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="p-6 md:p-8">
                  <div className="mb-8 text-center sm:text-left">
                    <div className="flex items-baseline justify-center sm:justify-start gap-1">
                      <span 
                        className="font-black text-4xl md:text-5xl lg:text-7xl tracking-tighter text-slate-900" 
                      >
                        ${Math.round(result.data.verified_market?.bls_base || (calculateEstimate('BLS', 0, result.data.type, result.data.rates || null).baseRate * 3)).toLocaleString()}
                        <span className="mx-2 opacity-30 text-3xl">—</span>
                        ${Math.round(result.data.verified_market?.als_base || (calculateEstimate('ALS', 0, result.data.type, result.data.rates || null).baseRate * 3)).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-bold text-[11px] mt-2 uppercase tracking-[0.1em] italic flex items-center gap-2 justify-center sm:justify-start text-slate-400">
                       Estimated Price Range (BLS - ALS)
                       <button onClick={() => setActiveResource('bls-vs-als-differences')} className="text-blue-400 hover:text-blue-600 transition-colors">
                         <Info className="w-3.5 h-3.5" />
                       </button>
                    </p>
                  </div>

                  <p 
                    className="text-xs md:text-sm leading-relaxed mb-10 pl-5 border-l-2 border-slate-200 text-slate-500" 
                  >
                    {result.data.verified_market
                       ? `This rate reflects the official municipal billing schedule reported for ${result.data.city} on ${result.data.verified_market.verified_date}.`
                       : 'No specific rate data has been reported for this area — this is an estimate based on approximately 3× the Medicare reimbursement rate. The actual amount you are billed may vary by provider.'}
                  </p>

                  <div className="space-y-4 pt-8 border-t border-slate-100">
                    <div 
                      className="flex justify-between items-center p-6 rounded-3xl transition-all bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <span 
                          className="font-black text-[10px] uppercase tracking-widest block mb-1 text-slate-900"
                        >
                          + Per Mile Transported
                        </span>
                        <p className="text-[10px] font-medium uppercase text-slate-400">Additional loaded mile rate</p>
                      </div>
                      <div className="text-right">
                        <span 
                          className="font-black text-2xl md:text-3xl block leading-none text-slate-900"
                        >
                          ${Math.round(result.data.verified_market?.mileage || (calculateEstimate('BLS', 1, result.data.type, result.data.rates || null).mileageRate * 3))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                    <div className="flex flex-col gap-0.5">
                      {result.data.verified_market?.verified_date && (
                        <span className="text-[10px] text-slate-400 font-medium italic">Last updated: {result.data.verified_market.verified_date}</span>
                      )}
                      {result.data.entity_info?.effective_date && (
                        <span className="text-[10px] text-slate-400 font-medium italic">Effective: {result.data.entity_info.effective_date}</span>
                      )}
                    </div>
                    {result.data.verified_market ? (
                      <button 
                        onClick={() => setIsInaccuracyModalOpen(true)}
                        className="text-[10px] text-slate-400 font-bold bg-slate-100/50 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors whitespace-nowrap"
                      >
                        Report Inaccurate Data
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setSubmissionType('transport');
                          setIsModalOpen(true);
                        }}
                        className="text-[10px] text-sky-700 font-bold bg-sky-50 px-3 py-1.5 rounded-full hover:bg-sky-100 transition-colors whitespace-nowrap border border-sky-200"
                      >
                        Submit Verified Rates
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Medicare Benchmark Rate Card */}
              <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border-4 border-indigo-700 overflow-hidden relative">
                <div className="bg-indigo-700 text-white px-6 md:px-8 py-5 md:py-6 flex items-center justify-between">
                  <div>
                    <p className="text-xl md:text-3xl font-black">Medicare Benchmark Rates</p>
                  </div>
                </div>
                
                <div className="p-6 md:p-8">
                  <div className="mb-10 text-center sm:text-left">
                    <div className="flex items-baseline justify-center sm:justify-start gap-1">
                      <span className="text-slate-900 font-black text-4xl md:text-5xl lg:text-7xl tracking-tighter">
                        ${Math.floor(calculateEstimate('BLS', 0, result.data.type, result.data.rates || null).baseRate).toLocaleString()}
                        <span className="mx-2 opacity-20 text-3xl">—</span>
                        ${Math.floor(calculateEstimate('ALS', 0, result.data.type, result.data.rates || null).baseRate).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-indigo-400 font-bold text-[11px] mt-2 uppercase tracking-widest flex items-center gap-2 justify-center sm:justify-start">
                      Official Schedule Range (BLS - ALS)
                      <button onClick={() => setActiveResource('bls-vs-als-differences')} className="text-indigo-500 hover:text-indigo-600 transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </p>
                  </div>

                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-10 border-l-2 border-indigo-600/20 pl-4">
                    This is the "official" rate established by the federal government for your specific zip code in 2026. Medicare uses this baseline to reimburse providers for medically necessary transport. While private companies often charge more, this figure serves as the industry standard for what the service is actually valued at by federal auditors.
                  </p>

                  <div className="space-y-4 border-t border-slate-100 pt-8">
                    <div className="flex justify-between items-center bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                      <div>
                        <span className="text-indigo-700 font-black text-[10px] uppercase tracking-widest block mb-1">+ Per Mile Transported</span>
                        <p className="text-indigo-900/40 font-medium text-[10px] uppercase">Additional loaded mile rate</p>
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <span className="text-indigo-700 font-black text-2xl md:text-3xl block leading-none">${calculateEstimate('BLS', 1, result.data.type, result.data.rates || null).mileageRate.toFixed(2)}</span>
                      </div>
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
              <button onClick={() => setActiveResource('does-insurance-cover-ambulance')} className="group block h-full text-left">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-indigo-100 relative overflow-hidden flex flex-col justify-center h-full transition-all hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-300">

                  
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
              </button>
            </div>
            
            {/* Combined Disclaimer */}
            <div className="px-6 py-5 md:px-8 md:py-6 bg-amber-50 border border-amber-200 rounded-[2.5rem] flex items-start gap-4 shadow-sm mt-8">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <p className="text-sm md:text-base text-amber-800/90 leading-relaxed font-medium">
                <strong className="text-amber-900 mr-2">Disclaimer:</strong>
                Estimated ambulance costs are based on publicly available fee schedules and regional averages. Actual charges may vary depending on the ambulance provider, service level, mileage, medical treatment provided, and insurance coverage. Providers in the same area may charge different rates for similar services. For details about coverage and out-of-pocket costs, contact your insurance provider.
              </p>
            </div>
            </div>
          </>
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
        defaultType={submissionType}
      />

      <InaccuracyReportModal
        isOpen={isInaccuracyModalOpen}
        onClose={() => setIsInaccuracyModalOpen(false)}
        city={result?.data.city || ''}
        onReport={handleReportInaccuracy}
      />

      <ResourceOverlay 
        slug={activeResource || ''} 
        isOpen={!!activeResource} 
        onClose={() => setActiveResource(null)} 
      />
    </div>
  );
}
