'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ArrowRight, Contact } from 'lucide-react';

interface QuestionnaireAnswers {
  wearingTime?: string;
  dryness?: string;
  priority?: string;
  routine?: string;
  budget?: string;
}

export default function ContactLensQuestionnairePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  useEffect(() => {
    // Verify power is entered
    const finalPower = localStorage.getItem('lenstrack_cl_final_power');
    if (!finalPower) {
      router.push('/questionnaire/contact-lens/power-input-method');
      return;
    }
  }, [router]);

  const questions = [
    {
      id: 'wearingTime',
      question: 'How often do you plan to wear contact lenses?',
      options: [
        { value: 'daily_8plus', label: 'Daily (8+ hours)', icon: '🌅' },
        { value: 'daily_4to6', label: 'Daily (4–6 hours)', icon: '☀️' },
        { value: 'occasional', label: 'Occasional (few times a week)', icon: '📅' },
        { value: 'special_events', label: 'Only for special events', icon: '🎉' },
      ],
    },
    {
      id: 'dryness',
      question: 'Do your eyes feel dry or sensitive?',
      options: [
        { value: 'very_often', label: 'Yes, very often', icon: '😣' },
        { value: 'sometimes', label: 'Sometimes', icon: '😐' },
        { value: 'no', label: 'No', icon: '😊' },
      ],
    },
    {
      id: 'priority',
      question: 'What is most important to you?',
      options: [
        { value: 'comfort', label: 'Maximum comfort', icon: '✨' },
        { value: 'eye_health', label: 'Eye health & oxygen', icon: '💚' },
        { value: 'budget', label: 'Budget friendly', icon: '💰' },
        { value: 'brand', label: 'Best / trusted brand', icon: '⭐' },
      ],
    },
    {
      id: 'routine',
      question: 'Your typical routine?',
      options: [
        { value: 'office', label: 'Office / Computer', icon: '💻' },
        { value: 'outdoor', label: 'Outdoor / Field work', icon: '🌳' },
        { value: 'mixed', label: 'Mixed (indoor + outdoor)', icon: '🔄' },
        { value: 'home', label: 'Mostly at home', icon: '🏠' },
      ],
    },
    {
      id: 'budget',
      question: 'Budget Preference',
      options: [
        { value: 'under_1000', label: 'Under ₹1000', icon: '💵' },
        { value: '1000_2000', label: '₹1000–₹2000', icon: '💴' },
        { value: '2000_3500', label: '₹2000–₹3500', icon: '💶' },
        { value: 'no_limit', label: 'Best lens for comfort (no budget limit)', icon: '💎' },
      ],
    },
  ];

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
    
    // Auto-advance to next question after a short delay
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }, 300);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      router.push('/questionnaire/contact-lens/spectacle-power');
    }
  };

  const handleSubmit = async () => {
    try {
      // Map answers to database benefits using API
      const response = await fetch('/api/contact-lens/map-questionnaire-benefits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Save questionnaire answers with mapped benefits
        localStorage.setItem('lenstrack_cl_questionnaire', JSON.stringify({
          answers,
          benefits: data.data.mappedBenefits, // List of benefit codes
          benefitScores: data.data.benefitScores, // Map of code to points
          benefitDetails: data.data.benefitDetails, // Full details
        }));

        // Navigate to product recommendations
        router.push('/questionnaire/contact-lens');
      } else {
        showToast('error', data.error?.message || 'Failed to process questionnaire');
      }
    } catch (error) {
      console.error('Error mapping questionnaire benefits:', error);
      // Fallback to basic mapping if API fails
      const fallbackBenefits: string[] = [];
      if (answers.wearingTime === 'daily_8plus') fallbackBenefits.push('B02'); // High oxygen
      if (answers.dryness === 'very_often') fallbackBenefits.push('B02'); // High oxygen
      if (answers.priority === 'comfort') fallbackBenefits.push('B01'); // Comfort
      if (answers.priority === 'eye_health') fallbackBenefits.push('B02'); // High oxygen
      if (answers.routine === 'outdoor') fallbackBenefits.push('B03'); // UV protection
      if (answers.routine === 'office') fallbackBenefits.push('B04'); // Digital protection
      
      localStorage.setItem('lenstrack_cl_questionnaire', JSON.stringify({
        answers,
        benefits: fallbackBenefits,
      }));
      
      router.push('/questionnaire/contact-lens');
    }
  };

  const currentQ = questions[currentQuestion];
  const isAnswered = (answers as any)[currentQ.id] !== undefined;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
              <Contact size={24} className="sm:w-8 sm:h-8" />
              Contact Lens Questionnaire
            </h1>
            <p className="text-slate-300">Help us recommend the best contact lenses for you</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">{currentQ.question}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQ.options.map((option) => {
                const isSelected = (answers as any)[currentQ.id] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleAnswer(currentQ.id, option.value)}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{option.icon}</span>
                      <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                        {option.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              {currentQuestion === 0 ? 'Back' : 'Previous'}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isAnswered}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-50"
            >
              {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
              {currentQuestion < questions.length - 1 && <ArrowRight size={18} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
