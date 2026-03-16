'use client';

import React from 'react';
import Link from 'next/link';
import { Ambulance, ShieldAlert } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <main className="max-w-3xl mx-auto px-6 pt-20 pb-32">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 mb-12 tracking-tight text-balance">
          About <span className="text-blue-600">AmbulanceCost.com</span>
        </h1>
        
        <div className="space-y-8 text-xl text-slate-600 leading-relaxed">
          <p>
            When you call 911, you rarely have a choice about which ambulance arrives or where it takes you. Yet many patients still receive significant bills after an ambulance transport. These costs can include copays, coinsurance, deductibles, and sometimes large out of network charges.
          </p>
          <p>
            Ground ambulance billing sits in an unusual position within the healthcare system. Unlike most other emergency care, ground ambulance services were largely excluded from the federal No Surprises Act, and the rules governing coverage and billing vary widely depending on the provider, insurance plan, and location.
          </p>
          <p>
            As a result, the cost of an ambulance ride can be difficult for patients to understand ahead of time.
          </p>
          <p>
            AmbulanceCost.com was created to make ambulance pricing information easier to find. The cost of emergency transport varies depending on where you live, which service responds, and how the transport is billed. In many cases, that information is not easily accessible until after a bill arrives.
          </p>
          <p>
            Some people report hesitating to call an ambulance because they are concerned about potential costs. When uncertainty about billing exists, it can create confusion for patients and families trying to make decisions during stressful situations.
          </p>
          <p>
            Our goal with this project is transparency. By making estimated ambulance costs easier to see and compare, we hope to make this information more accessible to the public and support more informed discussions about how emergency medical services are funded.
          </p>

          <div className="pt-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">The Policy Gap</h2>
            <div className="space-y-6">
              <p>
                Emergency medical transport occupies a unique place in the healthcare system. If you go to an emergency room, federal law generally requires insurance plans to treat that care as in network emergency care, even if the hospital itself is outside your network.
              </p>
              <p>
                Ground ambulances are one of the few major emergency services that were not included in those protections. Because patients cannot choose which ambulance responds to a 911 call, many experts believe emergency transport should be treated similarly to other emergency medical care.
              </p>
              <p>
                One proposed solution is to extend federal surprise billing protections so that all 911 ambulance transports are treated as in network emergency services, meaning patients would only pay their normal emergency copay, coinsurance, or deductible.
              </p>
            </div>
          </div>
          
          <div className="bg-amber-50 border-l-4 border-amber-500 p-8 rounded-r-2xl my-12 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
              Important Notice
            </h3>
            <p className="text-lg text-slate-700 leading-relaxed">
              Nothing on this site should be used to decide whether to seek emergency medical care. <strong>If you believe you or someone else may be experiencing a medical emergency, call 911 immediately.</strong>
            </p>
          </div>

          <p>
            Emergency medical services are an essential part of the healthcare system. Improving public understanding of how these services are funded and billed may help support more informed conversations about policy and access to emergency care.
          </p>
        </div>
      </main>
    </div>
  );
}
