'use client';

import React, { useState } from 'react';
import { Mail, Search, Users, ExternalLink, Loader2, MessageSquareText, Navigation } from 'lucide-react';

interface Representative {
  id: string;
  name: string;
  phone: string;
  url: string;
  photoURL: string;
  party: string;
  state: string;
  reason: string;
  area: string;
}

interface TakeActionProps {
  initialZip?: string;
}

export default function TakeAction({ initialZip = '' }: TakeActionProps) {
  const [zip, setZip] = useState(initialZip);
  const [loading, setLoading] = useState(false);
  const [reps, setReps] = useState<Representative[]>([]);
  const [governor, setGovernor] = useState<Representative | null>(null);
  const [error, setError] = useState('');
  const [citiesData, setCitiesData] = useState<[string, string, string][]>([]);
  const [suggestions, setSuggestions] = useState<[string, string, string][]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = React.useRef<HTMLFormElement>(null);

  // Load cities data for autocomplete
  React.useEffect(() => {
    fetch('/cities.json')
      .then(res => res.json())
      .then(data => setCitiesData(data))
      .catch(err => console.error('Failed to load cities for autocomplete', err));
  }, []);

  // Update zip if initialZip changes
  React.useEffect(() => {
    if (initialZip && initialZip.length >= 5) {
      setZip(initialZip);
      
      // Extract zip if it's in "City, ST (12345)" format
      let zipToSearch = initialZip;
      const match = zipToSearch.match(/\((\d{5})\)$/);
      if (match) {
        zipToSearch = match[1];
      } else {
        zipToSearch = zipToSearch.replace(/\D/g, '').substring(0, 5);
      }
      
      if (zipToSearch.length === 5) {
        findReps(zipToSearch);
      }
    }
  }, [initialZip]);

  // Handle outside click to close suggestions
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const findReps = async (zipOverride?: string) => {
    let zipToSearch = zipOverride || zip;
    
    // Extract zip from "City, State (12345)"
    const match = zipToSearch.match(/\((\d{5})\)$/);
    if (match) {
      zipToSearch = match[1];
    } else {
      zipToSearch = zipToSearch.replace(/\D/g, '').substring(0, 5);
    }

    if (zipToSearch.length < 5) {
      setError('Please enter a valid 5-digit ZIP code or select a city.');
      return;
    }

    setLoading(true);
    setError('');
    setShowSuggestions(false);
    
    try {
      const response = await fetch(`https://api.5calls.org/v1/reps?location=${zipToSearch}`);
      if (!response.ok) throw new Error('Failed to fetch representatives');
      const data = await response.json();
      
      // Filter for State Legislators (Upper/Lower) and Statewide officials
      const legislators = (data.representatives || []).filter(
        (r: Representative) => r.area === 'StateUpper' || r.area === 'StateLower'
      );
      
      const gov = (data.representatives || []).find(
        (r: Representative) => r.area === 'Governor'
      );
      
      setReps(legislators);
      setGovernor(gov || null);

      if (legislators.length === 0 && !gov) {
        setError('No state-level representatives found for this location. You may need to use a more specific address.');
      }
    } catch (err) {
      setError('Error finding representatives. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getInsuranceCommissionerLink = (stateCode: string) => {
    // Map of common state insurance department URLs
    const maps: Record<string, string> = {
      'NY': 'https://www.dfs.ny.gov/consumers/file_a_complaint',
      'CA': 'https://www.insurance.ca.gov/01-consumers/101-help/',
      'PA': 'https://www.insurance.pa.gov/Consumers/Pages/default.aspx',
      'TX': 'https://www.tdi.texas.gov/consumer/index.html',
      'FL': 'https://www.floir.com/Office/SearchableDirectory.aspx',
      'IL': 'https://insurance.illinois.gov/Applications/Complaints/',
    };
    return maps[stateCode] || 'https://content.naic.org/state-insurance-departments';
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
            findReps(cleanZip);
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

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setZip(val);
    setError('');

    if (val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const q = val.toLowerCase().trim();
    const isNum = /^\d/.test(q);
    const filtered = citiesData.filter(cityTuple => {
      if (isNum) return cityTuple[2].startsWith(q);
      const nameFirst = cityTuple[0].toLowerCase();
      const nameFull = `${cityTuple[0]}, ${cityTuple[1]}`.toLowerCase();
      return nameFirst.startsWith(q) || nameFull.includes(q);
    }).slice(0, 8);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleSelectSuggestion = (s: [string, string, string]) => {
    const fullStr = `${s[0]}, ${s[1]} (${s[2]})`;
    setZip(fullStr);
    setSuggestions([]);
    setShowSuggestions(false);
    findReps(fullStr);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    findReps();
  };

  const generateEmail = (rep: Representative) => {
    const subject = encodeURIComponent("I urge you to support State Ambulance Billing Reform");
    const body = encodeURIComponent(`Dear ${rep.area === 'Governor' ? 'Governor' : 'Representative'} ${rep.name},

I urge you to support legislation that ensures all ambulance services, including treatment on scene and transport, are covered like emergency care with predictable copays. 

Currently, ambulance billing falls outside standard emergency care frameworks, leading to unpredictable surprise bills for patients even when transport isn't required. Patients should not face surprise bills regardless of provider. 

Please align ambulance billing with emergency care standards to ensure fair access and financial safety for all residents.

Thank you for your leadership on this consumer protection issue.

Sincerely,
[Your Name]
[Your Address]`);

    window.open(rep.url, '_blank');
  };

  return (
    <div className="mt-20">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight max-w-4xl">
            End <span className="text-blue-400">Surprise</span> Ambulance Bills.
          </h2>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed max-w-3xl">
            Federal reform is slow. State-level mandates are the fastest path to protection.
            Demand that your state representatives close the "billing gap" and treat ambulances like essential emergency care.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="bg-blue-500/20 p-2 rounded-lg text-blue-400 text-base">GAP</span>
                The Billing Loophole
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Most insurance only covers ambulance costs if you are <strong>transported</strong>. 
                If an EMT treats you on-scene but you aren't taken to a hospital (TNT), you often face a $500+ "dry run" bill that insurance refuses to pay.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 text-base">GOAL</span>
                Our Policy Goal
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Mandate that all ambulance services—transport or treatment-only—are covered under emergency care frameworks with <strong>predictable copays</strong>.
              </p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 mb-8" ref={searchContainerRef}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow flex items-center bg-white/10 border border-white/20 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                <div className="pl-4 pr-3 py-4 flex items-center justify-center">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  name="repZipSearch"
                  id="repZipSearch"
                  value={zip}
                  onChange={handleZipChange}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="City, State or Zip Code"
                  className="flex-grow bg-transparent py-4 text-white placeholder:text-slate-500 focus:outline-none text-lg font-bold"
                  autoComplete="off"
                />
                <button 
                  type="button"
                  onClick={useLocation}
                  className="p-4 text-blue-400 hover:bg-white/5 transition-colors border-l border-white/10"
                  title="Use my location"
                >
                  <Navigation className="w-5 h-5" />
                </button>

                {/* Autocomplete Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 text-left">
                    <ul className="py-2">
                      {suggestions.map((s, idx) => (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full px-6 py-4 hover:bg-white/10 text-left flex items-center transition-colors border-b border-white/5 last:border-0"
                          >
                            <span className="text-white font-bold">{s[0]}</span>
                            <span className="text-slate-400 font-medium">, {s[1]}</span>
                            {/^\d/.test(zip) && <span className="text-slate-500 font-mono text-xs ml-2">({s[2]})</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap text-xl"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find Representatives'}
              </button>
            </div>
          </form>

          {error && <p className="text-red-400 font-medium mb-6 text-sm flex items-center gap-2"><span>⚠️</span> {error}</p>}

          {reps.length > 0 && (
            <div className="mt-8 space-y-6">
              {governor && (
                <div className="mb-8">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">State Executive</h4>
                  <div className="bg-blue-600/10 border-2 border-blue-600/30 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:bg-blue-600/20 transition-all">
                    {governor.photoURL ? (
                      <img src={governor.photoURL} alt={governor.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-400/20" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center border-2 border-white/10">
                        <Users className="w-8 h-8 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-grow text-center md:text-left">
                      <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">GOVERNOR</div>
                      <h3 className="text-xl font-bold mb-1">{governor.name}</h3>
                      <p className="text-slate-400 text-sm mb-4">State Executive • {governor.state}</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                         <a 
                           href={governor.url || `https://www.google.com/search?q=${encodeURIComponent(governor.name + ' ' + governor.state + ' Governor Official Website')}`}
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                         >
                           <ExternalLink className="w-4 h-4" /> {governor.url ? 'Contact Governor' : 'Find Governor Website'}
                         </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">State Representatives (Legislature)</h4>
                <div className="grid gap-4">
                  {reps.map((rep) => (
                    <div key={rep.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:bg-white/10 transition-colors">
                      {rep.photoURL ? (
                        <img src={rep.photoURL} alt={rep.name} className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all border-2 border-white/10" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center border-2 border-white/10">
                          <Users className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      
                      <div className="flex-grow text-center md:text-left">
                        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                          {rep.area === 'StateUpper' ? 'State Senate' : 'State Assembly / House'}
                        </div>
                        <h3 className="text-xl font-bold mb-1">{rep.name}</h3>
                        <p className="text-slate-400 text-sm mb-4">{rep.party} • {rep.state}</p>
                        
                        <div className="flex flex-col sm:flex-row flex-wrap justify-center md:justify-start gap-3 mt-4">
                          <a 
                            href={rep.url || `https://www.google.com/search?q=${encodeURIComponent(rep.name + ' ' + rep.state + ' ' + (rep.area === 'StateUpper' ? 'State Senate' : 'State Assembly') + ' Official Website')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600/20 text-blue-300 border border-blue-500/30 px-5 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-all active:scale-95 flex-1 min-w-[140px]"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {rep.url ? 'Office Website' : 'Find Website'}
                          </a>

                          <button 
                            onClick={(e) => {
                              const subject = "I urge you to support State Ambulance Billing Reform";
                              const body = `Dear Representative ${rep.name},

I urge you to support legislation that ensures all ambulance services, including treatment on scene and transport, are covered like emergency care with predictable copays.

Currently, ambulance billing falls outside standard emergency care frameworks, leading to unpredictable surprise bills for patients even when transport isn't required. Patients should not face surprise bills regardless of provider.

Please align ambulance billing with emergency care standards to ensure fair access and financial safety for all residents.

Thank you for your leadership on this consumer protection issue.

Sincerely,
[Your Name]
[Your Address]`;
                              navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
                              
                              // Visual confirmation
                              const btn = e.currentTarget;
                              const originalText = btn.innerHTML;
                              btn.innerHTML = '<span>✅ Copied!</span>';
                              btn.classList.replace('bg-emerald-600', 'bg-emerald-500');
                              
                              setTimeout(() => {
                                btn.innerHTML = originalText;
                                btn.classList.replace('bg-emerald-500', 'bg-emerald-600');
                              }, 2000);
                            }}
                            className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg active:scale-95 flex-1 min-w-[140px]"
                          >
                            <MessageSquareText className="w-4 h-4" />
                            Copy Reform Message
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Insurance Regulation</h4>
                <div className="bg-emerald-600/5 border border-emerald-600/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 group">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl">
                    🏛️
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-xl font-bold mb-2">State Insurance Commissioner</h3>
                    <p className="text-slate-400 text-sm mb-4 leading-relaxed max-w-2xl">
                      The Insurance Commissioner has the power to investigate billing practices and push for administrative mandates on how insurers handle non-transport ambulance calls.
                    </p>
                    <a 
                      href={getInsuranceCommissionerLink(reps[0]?.state || 'NY')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-400 font-bold hover:underline"
                    >
                      Visit State Insurance Dept. Portal <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
