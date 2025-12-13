'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface Question {
  id: string;
  key: string;
  textEn: string;
  textHi?: string;
  textHiEn?: string;
  isRequired: boolean;
  allowMultiple: boolean;
  options: {
    id: string;
    key: string;
    textEn: string;
    textHi?: string;
    textHiEn?: string;
    icon?: string;
    triggersSubQuestion?: boolean;
    subQuestionId?: string;
  }[];
}

interface Session {
  id: string;
  customerName?: string;
  category: string;
  status: string;
}

export default function QuestionnaireSessionPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');

  useEffect(() => {
    // Get language preference
    const savedLanguage = localStorage.getItem('lenstrack_language') || 'en';
    setLanguage(savedLanguage as 'en' | 'hi' | 'hinglish');
    
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  // Helper function to get text based on language
  const getText = (textEn: string, textHi?: string, textHiEn?: string): string => {
    if (language === 'hi' && textHi) return textHi;
    if (language === 'hinglish' && textHiEn) return textHiEn;
    return textEn;
  };

  const fetchSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setSession(data.data.session);
        setQuestions(data.data.questions);
      } else {
        showToast('error', 'Session not found');
        router.push('/questionnaire');
      }
    } catch (error) {
      showToast('error', 'Failed to load session');
      router.push('/questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleOptionSelect = (optionId: string) => {
    const questionId = currentQuestion.id;
    
    if (currentQuestion.allowMultiple) {
      // Toggle for multiple selection
      setAnswers((prev) => {
        const current = prev[questionId] || [];
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      });
    } else {
      // Single selection
      setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
    }
  };

  const handleNext = async () => {
    const questionId = currentQuestion.id;
    const selectedAnswers = answers[questionId] || [];

    if (currentQuestion.isRequired && selectedAnswers.length === 0) {
      showToast('error', 'Please select an answer');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          optionIds: selectedAnswers,
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
        }
        const errorMessage = errorData?.error?.message || `Failed to submit answer (${response.status})`;
        console.error('[handleNext] API error:', { status: response.status, error: errorData });
        showToast('error', errorMessage);
        return;
      }

      const data = await response.json();

      if (data.success) {
        if (data.data?.completed || isLastQuestion) {
          // Track questionnaire completed
          import('@/services/analytics.service').then(({ analyticsService }) => {
            analyticsService.questionnaireCompleted(sessionId);
          });
          
          // All questions done - redirect to needs summary first, then path choice
          router.push(`/questionnaire/${sessionId}/needs-summary`);
        } else {
          // Move to next question
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      } else {
        const errorObj = data.error || {};
        const errorMessage = errorObj.message || errorObj.code || 'Failed to submit answer';
        console.error('[handleNext] API returned error:', { error: errorObj, fullResponse: data });
        showToast('error', errorMessage);
      }
    } catch (error) {
      console.error('[handleNext] Exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showToast('error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Questions Available</h2>
          <p className="text-slate-400 mb-6">
            There are no active questions for this category.
          </p>
          <Button onClick={() => router.push('/questionnaire')}>
            Back to Categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-blue-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Customer Info */}
        {session?.customerName && (
          <div className="mb-6 text-center">
            <p className="text-slate-400 text-sm">
              Hi, {session.customerName}! 👋
            </p>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 mb-6">
          {/* Question Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {getText(currentQuestion.textEn, currentQuestion.textHi, currentQuestion.textHiEn)}
            </h2>
            {currentQuestion.allowMultiple && (
              <p className="text-blue-400 text-xs mt-2">
                {language === 'hi' ? 'ℹ️ आप कई विकल्प चुन सकते हैं' : 
                 language === 'hinglish' ? 'ℹ️ Aap multiple options select kar sakte hain' :
                 'ℹ️ You can select multiple options'}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = (answers[currentQuestion.id] || []).includes(option.id);
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {option.icon && (
                      <div className="text-3xl flex-shrink-0">{option.icon}</div>
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {getText(option.textEn, option.textHi, option.textHiEn)}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="text-blue-500 flex-shrink-0" size={24} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex-1"
          >
            <ChevronLeft size={18} className="mr-2" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            loading={submitting}
            className="flex-1"
            disabled={
              currentQuestion.isRequired && 
              !(answers[currentQuestion.id]?.length > 0)
            }
          >
            {isLastQuestion ? 'Get Recommendations' : 'Next'}
            {!isLastQuestion && <ChevronRight size={18} className="ml-2" />}
          </Button>
        </div>

        {/* Exit Link */}
        <div className="text-center mt-8">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
                router.push('/questionnaire');
              }
            }}
            className="text-xs text-slate-600 hover:text-slate-400"
          >
            Exit Questionnaire
          </button>
        </div>
      </div>
    </div>
  );
}
