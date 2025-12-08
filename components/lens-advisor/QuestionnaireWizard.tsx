'use client';

/**
 * Step 3: Questionnaire Wizard
 * Matches Frontend Specification exactly
 */

import { useState, useEffect } from 'react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import { HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation } from '@tanstack/react-query';

interface Question {
  id: string;
  key: string;
  textEn: string;
  textHi?: string;
  textHiEn?: string;
  isRequired: boolean;
  allowMultiple: boolean;
  questionType?: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'SLIDER';
  options: {
    id: string;
    key: string;
    textEn: string;
    textHi?: string;
    textHiEn?: string;
    icon?: string;
    childQuestions?: Question[];
  }[];
}

export function QuestionnaireWizard() {
  const { showToast } = useToast();
  const setCurrentStep = useLensAdvisorStore((state) => state.setCurrentStep);
  const rx = useLensAdvisorStore((state) => state.rx);
  const frame = useLensAdvisorStore((state) => state.frame);
  const answers = useLensAdvisorStore((state) => state.answers);
  const addAnswer = useLensAdvisorStore((state) => state.addAnswer);
  const removeAnswer = useLensAdvisorStore((state) => state.removeAnswer);
  const setRecommendations = useLensAdvisorStore((state) => state.setRecommendations);
  const customerCategory = useLensAdvisorStore((state) => state.customerCategory);
  
  // Get store code from session store
  const storeCode = useSessionStore((state) => state.storeCode);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [allQuestions, setAllQuestions] = useState<Question[]>([]); // Includes subquestions

  // Determine category - frames are always for eyeglasses
  const category = 'EYEGLASSES';

  // Create session and fetch questions
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['questionnaire-session', category, storeCode],
    queryFn: async () => {
      if (!storeCode) {
        throw new Error('Store code is required. Please verify your store code first.');
      }
      
      const response = await fetch('/api/public/questionnaire/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeCode,
          category,
          customerCategory: customerCategory || null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        return data.data;
      }
      throw new Error(data.error?.message || 'Failed to create session');
    },
    enabled: !sessionId && !!storeCode,
  });

  // Flatten questions including subquestions
  useEffect(() => {
    if (sessionData?.questions) {
      const flattened: Question[] = [];
      sessionData.questions.forEach((q: Question) => {
        flattened.push(q);
        // Add subquestions if any option has them
        q.options.forEach((opt) => {
          if (opt.childQuestions) {
            flattened.push(...opt.childQuestions);
          }
        });
      });
      setAllQuestions(flattened);
      setQuestions(sessionData.questions);
    }
  }, [sessionData]);

  const currentQuestion = allQuestions[currentQuestionIndex];
  const progress = allQuestions.length > 0 ? ((currentQuestionIndex + 1) / allQuestions.length) * 100 : 0;
  const isLastQuestion = currentQuestionIndex === allQuestions.length - 1;

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async ({ questionId, optionIds }: { questionId: string; optionIds: string[] }) => {
      if (!sessionId) throw new Error('No session');
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, optionIds }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
  });

  // Generate recommendations mutation
  const recommendMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session');
      const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}/recommendations`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
  });

  const handleOptionSelect = (optionId: string, optionKey: string) => {
    if (!currentQuestion) return;

    const questionId = currentQuestion.id;
    const current = selectedOptions[questionId] || [];

    if (currentQuestion.allowMultiple || currentQuestion.questionType === 'MULTI_SELECT') {
      // Toggle for multiple selection
      const newSelection = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setSelectedOptions({ ...selectedOptions, [questionId]: newSelection });

      // Update store
      if (newSelection.length > 0) {
        newSelection.forEach((id) => {
          addAnswer({ questionId, optionId: id, optionKey });
        });
      } else {
        removeAnswer(questionId);
      }

      // Handle subquestions: if deselected, remove dependent answers
      if (!newSelection.includes(optionId)) {
        const option = currentQuestion.options.find((o) => o.id === optionId);
        if (option?.childQuestions) {
          option.childQuestions.forEach((subQ) => {
            removeAnswer(subQ.id);
            setSelectedOptions((prev) => {
              const updated = { ...prev };
              delete updated[subQ.id];
              return updated;
            });
          });
        }
      }
    } else {
      // Single selection
      setSelectedOptions({ ...selectedOptions, [questionId]: [optionId] });
      addAnswer({ questionId, optionId, optionKey });
    }
  };

  const handleNext = async () => {
    if (!currentQuestion) return;

    const questionId = currentQuestion.id;
    const selected = selectedOptions[questionId] || [];

    if (currentQuestion.isRequired && selected.length === 0) {
      showToast('error', 'Please select an answer');
      return;
    }

    // Submit answer
    if (selected.length > 0) {
      try {
        await submitAnswerMutation.mutateAsync({ questionId, optionIds: selected });
      } catch (error) {
        showToast('error', 'Failed to save answer');
        return;
      }
    }

    // Check for subquestions to inject
    const selectedOption = currentQuestion.options.find((o) => selected.includes(o.id));
    if (selectedOption?.childQuestions && selectedOption.childQuestions.length > 0) {
      // Inject subquestions after current question
      const currentIndex = allQuestions.findIndex((q) => q.id === currentQuestion.id);
      const newQuestions = [...allQuestions];
      selectedOption.childQuestions.forEach((subQ, idx) => {
        if (!newQuestions.find((q) => q.id === subQ.id)) {
          newQuestions.splice(currentIndex + 1 + idx, 0, subQ);
        }
      });
      setAllQuestions(newQuestions);
    }

    if (isLastQuestion) {
      // Generate recommendations
      try {
        const result = await recommendMutation.mutateAsync();
        setRecommendations(result.recommendations || []);
        setCurrentStep(4);
      } catch (error) {
        showToast('error', 'Failed to generate recommendations');
      }
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Show error if store code is missing
  if (!storeCode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="text-red-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Store Code Required</h2>
            <p className="text-slate-600">Please verify your store code to continue</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            Store code is missing. Please go back and verify your store code first.
          </p>
        </div>
      </div>
    );
  }

  if (sessionLoading || !currentQuestion) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="text-blue-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Questionnaire</h2>
            <p className="text-slate-600">Loading questions...</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const questionType = currentQuestion.questionType || (currentQuestion.allowMultiple ? 'MULTI_SELECT' : 'SINGLE_SELECT');
  const selected = selectedOptions[currentQuestion.id] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="text-blue-600" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Questionnaire</h2>
          <p className="text-slate-600">Question {currentQuestionIndex + 1} of {allQuestions.length}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-6 text-slate-900">
          {currentQuestion.textEn}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id, option.key)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {questionType === 'MULTI_SELECT' ? (
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full border-2 ${
                        isSelected ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-full h-full rounded-full bg-blue-600 scale-50" />
                      )}
                    </div>
                  )}
                  <span className="font-medium text-slate-900">{option.textEn}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft size={18} className="mr-1" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          size="lg"
          loading={submitAnswerMutation.isPending || recommendMutation.isPending}
          disabled={currentQuestion.isRequired && selected.length === 0}
        >
          {isLastQuestion ? 'Finish →' : 'Next →'}
          {!isLastQuestion && <ChevronRight size={18} className="ml-1" />}
        </Button>
      </div>
    </div>
  );
}
