'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32">
        <div className="mb-12 border-b border-slate-200 pb-12">
          <div className="text-blue-600 font-black uppercase tracking-widest text-xs md:text-sm mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Legal Documentation
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1]">
            Privacy Policy
          </h1>
          <p className="mt-6 text-xl text-slate-600">
            Last Updated: March 12, 2026
          </p>
        </div>
        
        <article className="prose prose-lg prose-slate max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-900">
          <p>
            Welcome to AmbulanceCost.com, operated by <strong>Open Form LLC</strong> ("we," "us," or "our"). We respect your privacy and are committed to protecting any personal information you may share with us. This Privacy Policy outlines how we collect, use, and safeguard data when you interact with our website.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">1. Information We Collect</h2>
          <p>We collect information in the following ways:</p>
          <ul>
            <li>
              <strong>Information You Voluntarily Provide:</strong> If you contact us using the secure form, we will retain your email address and any information you provide in your message to respond to your inquiry. 
            </li>
            <li>
              <strong>Community Submissions:</strong> If you participate in our community rate reporting feature, you may submit data regarding ambulance costs, zip codes, and related details. While we do not require your name or direct contact information for these submissions, the data provided will be stored and may be displayed publicly to help aggregate community-driven cost information.
            </li>
            <li>
              <strong>Automatically Collected Information:</strong> We use cookies, web beacons, and similar tracking technologies to collect standard internet log information and visitor behavior information. This may include your IP address, browser type, operating system, the pages you visit on our site, and the dates and times of your visits.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">2. Cookies and Analytics</h2>
          <p>
            We use third-party analytics and advertising partners to help us understand how users engage with our site and to serve relevant advertisements. These partners may place cookies on your browser to collect non-personally identifiable information about your visits to this and other websites. You may choose to disable cookies through your individual browser options, though doing so may affect your ability to use certain features of the site.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">3. How We Use Your Information</h2>
          <p>The information we collect is used in the following ways:</p>
          <ul>
            <li>To operate and improve AmbulanceCost.com.</li>
            <li>To aggregate local ambulance cost data for public display via community submissions.</li>
            <li>To analyze site traffic and usage patterns.</li>
            <li>To respond to user inquiries and support requests.</li>
            <li>To serve relevant advertising in partnership with third-party networks.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">4. Sharing Your Information</h2>
          <p>
            We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic and usage information not linked to any personal identification information with our business partners, trusted affiliates, and advertisers. We may also release information when its release is appropriate to comply with the law, enforce our site policies, or protect our or others' rights, property, or safety.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">5. Security of Your Data</h2>
          <p>
            We implement reasonable security measures designed to protect the information we collect. However, please be aware that no method of transmission over the internet, or method of electronic storage, is 100% secure. Therefore, we cannot guarantee absolute security.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">6. Third-Party Links</h2>
          <p>
            Our website contains links to other websites (such as government resources or advocacy pages). We are not responsible for the privacy practices or the content of such other websites. We encourage you to read the privacy policies of any third-party websites you visit.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">7. Changes to This Privacy Policy</h2>
          <p>
            Open Form LLC has the discretion to update this Privacy Policy at any time. When we do, we will revise the updated date at the top of this page. We encourage you to frequently check this page for any changes. You acknowledge and agree that it is your responsibility to review this Privacy Policy periodically.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">8. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, the practices of this site, or your dealings with this site, please use the secure "Contact Us" button located in the footer portion of this page.
          </p>
        </article>
      </main>
    </div>
  );
}
