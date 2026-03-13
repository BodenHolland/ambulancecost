'use client';

import React, { useState } from 'react';
import { Mail, Search, Users, ExternalLink, Loader2, MessageSquareText } from 'lucide-react';

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
  const [error, setError] = useState('');

  // Update zip if initialZip changes
  React.useEffect(() => {
    if (initialZip && initialZip.length === 5) {
      setZip(initialZip);
    }
  }, [initialZip]);

  const findReps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.length < 5) {
      setError('Please enter a valid 5-digit ZIP code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`https://api.5calls.org/v1/reps?location=${zip}`);
      if (!response.ok) throw new Error('Failed to fetch representatives');
      const data = await response.json();
      
      // Filter for US House and Senate
      const relevantReps = (data.representatives || []).filter(
        (r: Representative) => r.area === 'US House' || r.area === 'US Senate'
      );
      
      setReps(relevantReps);
      if (relevantReps.length === 0) {
        setError('No federal representatives found for this ZIP code.');
      }
    } catch (err) {
      setError('Error finding representatives. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const generateEmail = (rep: Representative) => {
    const subject = encodeURIComponent("Demand EMS be added as a federal Essential Service");
    const body = encodeURIComponent(`Dear Representative ${rep.name},

I am writing to you today as a constituent to demand that Emergency Medical Services (EMS) be formally recognized as an ESSENTIAL federal service.

Currently, unlike police and fire services, EMS is not classified as an essential service in many parts of the country. This leads to massive billing disparities, lack of consistent federal funding, and "surprise" bills that can bankrupt families.

As my representative, I urge you to support legislation that mandates EMS as a basic, essential public service and provides the necessary federal oversight to stop predatory ground ambulance billing.

Thank you for your time and for representing the health and financial safety of our community.

Sincerely,
[Your Name]
[Your Address]`);

    // Many reps don't have public emails, so we open their contact page if email is unknown
    // Actually, 5Calls doesn't give emails regularly. House.gov usually doesn't either.
    // Instead, we provide the text to copy and the link to their contact page.
    window.open(rep.url, '_blank');
    
    // Attempt mailto if it exists (hypothetically, but 5Calls doesn't provide it)
    // For now, we'll just open the URL and maybe provide a "Copy Message" functionality.
  };

  return (
    <div className="mt-20">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-full text-blue-300 text-sm font-bold mb-6 backdrop-blur-sm border border-blue-500/30">
            <Users className="w-4 h-4" />
            <span>Advocacy & Change</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight max-w-4xl">
            EMS is <span className="text-blue-400">Not</span> a Federal Essential Service.
          </h2>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed max-w-3xl">
            In many states, EMS is considered "optional." This is why you get $3,000 bills for a 5-mile ride. 
            Help us change the law. Contact your representative today.
          </p>

          <form onSubmit={findReps} className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="Enter ZIP code..."
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg font-bold"
                />
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
            <div className="grid gap-4 mt-8">
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
                     <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">{rep.area}</div>
                     <h3 className="text-xl font-bold mb-1">{rep.name}</h3>
                     <p className="text-slate-400 text-sm mb-4">{rep.party} • {rep.state}</p>
                     
                     <div className="flex flex-col sm:flex-row flex-wrap justify-center md:justify-start gap-3 mt-4">
                       <a 
                         href={rep.url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-lg active:scale-95 flex-1 min-w-[140px]"
                       >
                         <ExternalLink className="w-4 h-4" />
                         Contact Form
                       </a>

                       <button 
                         onClick={() => {
                           const subject = ("Demand EMS be added as a federal Essential Service");
                           const body = (`Dear Representative ${rep.name},

I am writing to you today as a constituent to demand that Emergency Medical Services (EMS) be formally recognized as an ESSENTIAL federal service.

Currently, unlike police and fire services, EMS is not classified as an essential service in many parts of the country. This leads to massive billing disparities, lack of consistent federal funding, and "surprise" bills that can bankrupt families.

As my representative, I urge you to support legislation that mandates EMS as a basic, essential public service and provides the necessary federal oversight to stop predatory ground ambulance billing.

Thank you for your time and for representing the health and financial safety of our community.

Sincerely,
[Your Name]
[Your Address]`);
                           navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
                           alert('Message copied! Now click "Contact Form" and paste it, or use the text for your call.');
                         }}
                         className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg active:scale-95 flex-1 min-w-[140px]"
                       >
                         <MessageSquareText className="w-4 h-4" />
                         Copy Email Text
                       </button>

                       <a 
                         href={`tel:${rep.phone}`}
                         className="bg-white/10 text-white border border-white/20 px-5 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-all flex-1 min-w-[140px]"
                       >
                         <span>📞</span>
                         Call Office
                       </a>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
