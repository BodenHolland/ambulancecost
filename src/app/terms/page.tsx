'use client';

import React from 'react';
import { Scale } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32">
        <div className="mb-12 border-b border-slate-200 pb-12">
          <div className="text-blue-600 font-black uppercase tracking-widest text-xs md:text-sm mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Legal Documentation
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1]">
            Terms of Service
          </h1>
          <p className="mt-6 text-xl text-slate-600">
            Last Updated: March 12, 2026
          </p>
        </div>
        
        <article className="prose prose-lg prose-slate max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-900">
          <p>
            Welcome to AmbulanceCost.com (the "Site"), owned and operated by <strong>Open Form LLC</strong> ("Company," "we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of our website, and any related services (collectively, the "Services"). By accessing or using our Services, you agree to comply with and be bound by these Terms. If you do not agree to these Terms, please do not use our Services.
          </p>

          <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-2xl my-10">
            <h2 className="text-xl font-bold text-red-900 mb-2">MEDICAL EMERGENCY DISCLAIMER</h2>
            <p className="text-lg text-red-800 m-0">
              <strong>IF YOU ARE EXPERIENCING A MEDICAL EMERGENCY, CALL 911 OR YOUR LOCAL EMERGENCY NUMBER IMMEDIATELY.</strong>
              <br /><br />
              This Site and its Services are provided for informational and educational purposes only. Do NOT use the pricing information, estimates, or any other content on this Site to determine whether or not to seek emergency medical care. The cost of medical care should never deter you from calling 911 when you are in danger.
            </p>
          </div>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">1. Nature of the Service</h2>
          <p>
            AmbulanceCost.com compiles, aggregates, and provides estimates of ground and air ambulance pricing based on the public Centers for Medicare & Medicaid Services (CMS) Fee Schedules, as well as crowdsourced and community-submitted data. All figures presented are <strong>estimates</strong> designed to inform users of the generalized cost of transport. We do not provide exact quotes, guarantees, or precise billing figures. Local billing providers determine their actual "Sticker Pricing," which can be significantly higher than the federal standard.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">2. No Legal, Financial, or Medical Advice</h2>
          <p>
            Nothing contained on this Site should be construed as legal, medical, or financial advice. We do not guarantee the legal accuracy of our summaries of state or federal laws, including the No Surprises Act or California AB 716. You are heavily encouraged to consult with a qualified attorney or certified medical billing advocate prior to undertaking any formal action to dispute a medical bill.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">3. User Submissions and Community Content</h2>
          <p>
            We may allow users to submit unverified rates, documents, zip codes, and comments ("User Content"). By submitting User Content, you grant Open Form LLC a worldwide, non-exclusive, royalty-free, perpetual, and transferable license to use, reproduce, aggregate, display, and distribute that User Content on our Site and related services.
          </p>
          <p>
            By submitting data, you represent and warrant that you have the right to do so and that your submission does not violate any third-party privacy right, contract, or state/federal law. We reserve the right to remove or refuse to display any User Content at our sole discretion, without notice.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">4. Disclaimer of Warranties</h2>
          <p>
            YOUR USE OF THE SITE IS AT YOUR SOLE RISK. The Site is provided on an "AS IS" and "AS AVAILABLE" basis. Open Form LLC expressly disclaims all warranties of any kind, whether express, implied, or statutory, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
          <p>
            We make no warranty that (i) the Site will meet your requirements, (ii) the Site will be uninterrupted, timely, secure, or error-free, (iii) the results that may be obtained from the use of the Site will be absolutely accurate or reliable, or (iv) the quality of any information obtained by you through the Site will meet your expectations. Public fee schedules change constantly, and we are not liable for outdated or incorrect data on the Site.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">5. Limitation of Liability</h2>
          <p>
            YOU EXPRESSLY UNDERSTAND AND AGREE THAT OPEN FORM LLC AND ITS AFFILIATES SHALL NOT BE LIABLE TO YOU FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING, BUT NOT LIMITED TO, DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES (EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES), RESULTING FROM: (i) THE USE OR THE INABILITY TO USE THE SITE; (ii) ACTIONS YOU TAKE BASED ON THE INFORMATION PROVIDED ON THE SITE, INCLUDING DISPUTING MEDICAL DEBT OR AVOIDING MEDICAL CARE; (iii) UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR SUBMISSIONS OR DATA; OR (iv) ANY OTHER MATTER RELATING TO THE SITE.
          </p>
          <p>
            In no event shall our total liability to you for all damages, losses, and causes of action exceed the amount you paid us (if anything) to use our Services in the past twelve (12) months.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">6. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Open Form LLC, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including without limitation reasonable legal and accounting fees, arising out of or in any way connected with your access to or use of the Site, your violation of these Terms, or your violation of any third-party rights.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">7. Governing Law and Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State in which Open Form LLC is registered, without regard to its conflict of law principles. You agree to submit to the personal and exclusive jurisdiction of the state and federal courts located within that State for the resolution of any disputes arising out of these Terms.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. If we make material changes to these Terms, we will notify you by updating the "Last Updated" date at the top of these Terms. Your continued use of the Site after any such changes constitutes your acceptance of the new Terms.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">9. Contact Information</h2>
          <p>
            If you have any questions or concerns regarding these Terms or our Services, please use the secure "Contact Us" button located in the footer portion of this page.
          </p>
        </article>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <span className="text-xs font-mono text-slate-400 tracking-wider">Build v1.4.0</span>
        </div>
      </main>
    </div>
  );
}
