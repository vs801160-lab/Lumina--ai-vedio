import React from 'react';
import { Shield, FileText, RefreshCcw, ChevronLeft } from 'lucide-react';

interface LegalPageProps {
  onBack: () => void;
  type: 'privacy' | 'terms' | 'refund';
}

const LegalPages: React.FC<LegalPageProps> = ({ onBack, type }) => {
  const content = {
    privacy: {
      title: 'Privacy Policy',
      icon: <Shield className="text-indigo-500" size={32} />,
      sections: [
        {
          heading: 'Data Collection',
          text: 'We collect minimal data necessary to provide our AI video generation services, including your email address and generated content metadata.'
        },
        {
          heading: 'How We Use Data',
          text: 'Your data is used to manage your account, process payments via Razorpay, and improve our AI models. We do not sell your personal information to third parties.'
        },
        {
          heading: 'Cookies',
          text: 'We use essential cookies to maintain your session and preferences. Third-party services like Google Auth and Razorpay may also use cookies.'
        }
      ]
    },
    terms: {
      title: 'Terms of Service',
      icon: <FileText className="text-indigo-500" size={32} />,
      sections: [
        {
          heading: 'Usage Rights',
          text: 'You retain ownership of the videos you generate. However, by using Lumina Studio, you grant us a license to host and display your public creations.'
        },
        {
          heading: 'Prohibited Content',
          text: 'Users are prohibited from generating illegal, harmful, or sexually explicit content. Violation of these terms will result in immediate account termination.'
        },
        {
          heading: 'Service Availability',
          text: 'While we strive for 100% uptime, AI generation services depend on third-party providers (Google Gemini). We are not liable for temporary service interruptions.'
        }
      ]
    },
    refund: {
      title: 'Refund & Cancellation',
      icon: <RefreshCcw className="text-indigo-500" size={32} />,
      sections: [
        {
          heading: 'Credit Purchases',
          text: 'All credit purchases are final. Once credits are added to your account, they cannot be refunded as they are immediately available for use.'
        },
        {
          heading: 'Technical Issues',
          text: 'If a video generation fails due to a system error and credits are deducted, please contact support. We will manually credit back the lost points after verification.'
        },
        {
          heading: 'Cancellation',
          text: 'You can stop using the service at any time. There are no recurring charges unless you explicitly subscribe to a monthly plan.'
        }
      ]
    }
  };

  const active = content[type];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest"
      >
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 md:p-16 shadow-2xl backdrop-blur-3xl">
        <div className="flex items-center gap-6 mb-12">
          <div className="p-5 bg-slate-950 rounded-[2rem] border border-slate-800 shadow-xl">
            {active.icon}
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">{active.title}</h1>
        </div>

        <div className="space-y-12">
          {active.sections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-indigo-400">
                {idx + 1}. {section.heading}
              </h3>
              <p className="text-slate-400 leading-relaxed font-medium">
                {section.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-12 border-t border-slate-800 text-center">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
            Last Updated: February 2024 • Lumina AI Studio Legal Department
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
