'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

interface NeedsProfile {
  primary_usage?: string;
  screen_time?: string;
  driving_night?: boolean;
  outdoor_frequency?: string;
  backup_need?: boolean;
  lens_complexity?: string;
  sensitivity_flags?: string[];
  recommend_second_eyewear?: boolean;
}

export default function NeedsSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState<NeedsProfile | null>(null);
  const [summaryText, setSummaryText] = useState('');

  useEffect(() => {
    fetchNeedsProfile();
  }, []);

  const fetchNeedsProfile = async () => {
    try {
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      
      const data = await response.json();
      if (data.success && data.data.session) {
        // Fetch needs profile
        const needsProfileResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}/needs-profile`);
        if (needsProfileResponse.ok) {
          const needsData = await needsProfileResponse.json();
          if (needsData.success) {
            setNeedsProfile(needsData.data);
            generateSummary(needsData.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch needs profile:', error);
      // Continue even if needs profile not found
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = (profile: NeedsProfile) => {
    const parts: string[] = [];

    // Screen time
    if (profile.screen_time === 'HIGH') {
      parts.push('comfortable lenses for long screen time');
    } else if (profile.screen_time === 'MEDIUM') {
      parts.push('lenses suitable for moderate screen use');
    }

    // Backup need
    if (profile.backup_need === true || profile.recommend_second_eyewear === true) {
      parts.push('a backup option');
    }

    // Driving
    if (profile.driving_night === true) {
      parts.push('night driving protection');
    }

    // Outdoor
    if (profile.outdoor_frequency === 'HIGH') {
      parts.push('outdoor protection');
    }

    // Lens complexity
    if (profile.lens_complexity === 'ADVANCED' || profile.lens_complexity === 'PREMIUM') {
      parts.push('advanced lens features');
    }

    // Generate summary text
    if (parts.length > 0) {
      const summary = `Based on your usage, we recommend ${parts.join(', ')}.`;
      setSummaryText(summary);
    } else {
      setSummaryText('Based on your answers, we have personalized recommendations for you.');
    }
  };

  const handleContinue = () => {
    router.push(`/questionnaire/${sessionId}/path-choice`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
              <Sparkles className="text-purple-400" size={40} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-6">
            Your Personalized Recommendations
          </h1>

          {/* Summary Card */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-8 mb-8">
            <div className="flex items-start gap-4">
              <CheckCircle className="text-green-400 flex-shrink-0 mt-1" size={24} />
              <div className="text-left">
                <p className="text-lg text-slate-200 leading-relaxed">
                  {summaryText || 'Based on your answers, we have personalized recommendations for you.'}
                </p>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          {needsProfile && (
            <div className="bg-slate-800/30 backdrop-blur rounded-xl border border-slate-700 p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                {needsProfile.screen_time && (
                  <div className="text-slate-300">
                    <span className="font-medium">Screen Time: </span>
                    <span className="capitalize">{needsProfile.screen_time.toLowerCase()}</span>
                  </div>
                )}
                {needsProfile.backup_need && (
                  <div className="text-slate-300">
                    <span className="font-medium">Backup Needed: </span>
                    <span>Yes</span>
                  </div>
                )}
                {needsProfile.lens_complexity && (
                  <div className="text-slate-300">
                    <span className="font-medium">Lens Type: </span>
                    <span className="capitalize">{needsProfile.lens_complexity.toLowerCase()}</span>
                  </div>
                )}
                {needsProfile.driving_night && (
                  <div className="text-slate-300">
                    <span className="font-medium">Night Driving: </span>
                    <span>Yes</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 min-w-[200px]"
          >
            Continue
            <ArrowRight className="ml-2" size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}

