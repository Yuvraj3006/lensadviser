'use client';

/**
 * Questionnaire Builder Page
 * Matches Frontend Specification exactly
 * Layout: Left - Tree view of questions + subquestions | Right - Question editor
 */

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, HelpCircle, List, Network, X, Settings } from 'lucide-react';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { QuestionForm } from '@/components/forms/QuestionForm';

type ProductCategory = 'EYEGLASSES' | 'SUNGLASSES' | 'CONTACT_LENSES' | 'ACCESSORIES';

interface Question {
  id: string;
  key: string;
  textEn: string;
  category: ProductCategory;
  order: number;
  parentQuestionId?: string | null;
  parentAnswerId?: string | null; // Answer option ID (from API)
  parentAnswerKey?: string | null; // Answer option key (legacy)
  childQuestions?: Question[];
  options: Array<{
    id: string;
    key: string;
    textEn: string;
    childQuestions?: Question[];
  }>;
  optionCount?: number;
  answerCount?: number;
  mappingCount?: number;
  isRequired?: boolean;
  allowMultiple?: boolean;
  isActive?: boolean;
}

export default function QuestionnaireBuilderPage() {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]); // All questions for table view
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory>('EYEGLASSES');
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree'); // Toggle between tree and table view
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Feature mapping states
  const [features, setFeatures] = useState<Array<{ id: string; key: string; name: string; category: string }>>([]);
  const [featureMappings, setFeatureMappings] = useState<Array<{ optionKey: string; featureKey: string; weight: number }>>([]);
  const [showFeatureMapping, setShowFeatureMapping] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);
  
  // Drag and drop states
  const [draggedQuestion, setDraggedQuestion] = useState<Question | null>(null);
  const [dragOverOption, setDragOverOption] = useState<{ questionId: string; optionId: string } | null>(null);
  
  // Feature mapping for tree view
  const [expandedOptionMappings, setExpandedOptionMappings] = useState<Set<string>>(new Set()); // questionId-optionId
  const [questionFeatureMappings, setQuestionFeatureMappings] = useState<Map<string, Array<{ optionKey: string; featureKey: string; weight: number }>>>(new Map());

  useEffect(() => {
    fetchQuestions();
    fetchFeatures();
  }, [categoryFilter]);

  useEffect(() => {
    if (selectedQuestion) {
      fetchFeatureMappings(selectedQuestion.id);
    } else {
      setFeatureMappings([]);
    }
  }, [selectedQuestion]);

  const fetchFeatures = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/features?category=${categoryFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch features:', error);
    }
  };

  const fetchFeatureMappings = async (questionId: string) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/questionnaire/questions/${questionId}/feature-mappings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Convert API format to UI format
          const mappings = (data.data || []).map((m: any) => ({
            optionKey: m.optionKey,
            featureKey: m.featureKey,
            weight: m.weight,
          }));
          setFeatureMappings(mappings);
        }
      }
    } catch (error) {
      console.error('Failed to fetch feature mappings:', error);
    }
  };

  const fetchAllFeatureMappings = async (questions: Question[]) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const mappingsMap = new Map<string, Array<{ optionKey: string; featureKey: string; weight: number }>>();
      
      // Fetch mappings for all questions in parallel
      await Promise.all(
        questions.map(async (q) => {
          try {
            const response = await fetch(`/api/admin/questionnaire/questions/${q.id}/feature-mappings`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                const mappings = (data.data || []).map((m: any) => ({
                  optionKey: m.optionKey,
                  featureKey: m.featureKey,
                  weight: m.weight,
                }));
                mappingsMap.set(q.id, mappings);
              }
            }
          } catch (error) {
            console.error(`Failed to fetch mappings for question ${q.id}:`, error);
          }
        })
      );
      
      setQuestionFeatureMappings(mappingsMap);
    } catch (error) {
      console.error('Failed to fetch all feature mappings:', error);
    }
  };

  const saveFeatureMappings = async () => {
    if (!selectedQuestion) return;
    
    setMappingLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/questionnaire/questions/${selectedQuestion.id}/feature-mappings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mappings: featureMappings,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', `Saved ${featureMappings.length} feature mappings`);
        fetchFeatureMappings(selectedQuestion.id);
      } else {
        showToast('error', data.error?.message || 'Failed to save mappings');
      }
    } catch (error) {
      showToast('error', 'An error occurred while saving mappings');
    } finally {
      setMappingLoading(false);
    }
  };

  const addFeatureMapping = (optionKey: string) => {
    setFeatureMappings([
      ...featureMappings,
      {
        optionKey,
        featureKey: features[0]?.key || '',
        weight: 1.0,
      },
    ]);
  };

  const removeFeatureMapping = (index: number) => {
    setFeatureMappings(featureMappings.filter((_, i) => i !== index));
  };

  const updateFeatureMapping = (index: number, field: 'featureKey' | 'weight', value: string | number) => {
    const updated = [...featureMappings];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setFeatureMappings(updated);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, question: Question) => {
    setDraggedQuestion(question);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', question.id);
  };

  const handleDragEnd = () => {
    setDraggedQuestion(null);
    setDragOverOption(null);
  };

  const handleDragOver = (e: React.DragEvent, questionId: string, optionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverOption({ questionId, optionId });
  };

  const handleDragLeave = () => {
    setDragOverOption(null);
  };

  const handleDrop = async (e: React.DragEvent, targetQuestionId: string, targetOptionId: string) => {
    e.preventDefault();
    setDragOverOption(null);

    if (!draggedQuestion) return;

    // Don't allow dropping on itself
    if (draggedQuestion.id === targetQuestionId) {
      showToast('error', 'Cannot drop question on itself');
      return;
    }

    // Don't allow dropping on its own child
    const isChild = (question: Question, targetId: string): boolean => {
      if (question.id === targetId) return true;
      return question.childQuestions?.some(child => isChild(child, targetId)) || false;
    };

    if (isChild(draggedQuestion, targetQuestionId)) {
      showToast('error', 'Cannot drop question on its own child');
      return;
    }

    try {
      const token = localStorage.getItem('lenstrack_token');
      
      // Update the dragged question to set parentAnswerId
      const response = await fetch(`/api/admin/questions/${draggedQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parentAnswerId: targetOptionId, // Set parent to the answer option
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', `Question "${draggedQuestion.textEn}" is now a subquestion of "${targetQuestionId}"`);
        fetchQuestions();
      } else {
        showToast('error', data.error?.message || 'Failed to update question relationship');
      }
    } catch (error) {
      showToast('error', 'An error occurred while updating question relationship');
    } finally {
      setDraggedQuestion(null);
    }
  };

  const handleRemoveParent = async (question: Question) => {
    if (!question.parentAnswerId) return;

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parentAnswerId: null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Question removed from parent');
        fetchQuestions();
      } else {
        showToast('error', data.error?.message || 'Failed to remove parent relationship');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      params.append('category', categoryFilter);

      const response = await fetch(`/api/admin/questions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
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
        const errorMessage = errorData?.error?.message || `Failed to load questions (${response.status})`;
        console.error('[fetchQuestions] API error:', { status: response.status, error: errorData });
        showToast('error', errorMessage);
        return;
      }

      const data = await response.json();
      console.log('[fetchQuestions] Response:', { success: data.success, count: data.data?.length, data: data.data });
      
      if (data.success) {
        // Store all questions for table view
        setAllQuestions(data.data || []);
        
        // Build tree structure
        // parentAnswerId is the answer option ID, not question ID
        const allQuestionsList = data.data || [];
        console.log('[fetchQuestions] Building tree from', allQuestionsList.length, 'questions');
        
        // Root questions are those without parentAnswerId
        const rootQuestions = allQuestionsList.filter((q: Question) => !q.parentAnswerId);
        console.log('[fetchQuestions] Root questions:', rootQuestions.length);
        
        // Build tree: attach child questions to their parent answer options
        const buildTree = (questions: Question[]): Question[] => {
          return questions.map((q) => {
            // Find all questions that have this question's answer options as parent
            const childQuestions = allQuestionsList.filter(
              (cq: Question) => {
                // Check if cq.parentAnswerId matches any of this question's option IDs
                return q.options?.some(opt => opt.id === cq.parentAnswerId);
              }
            );
            
            return {
              ...q,
              childQuestions: buildTree(childQuestions),
            };
          });
        };
        
        const treeQuestions = buildTree(rootQuestions);
        console.log('[fetchQuestions] Tree questions:', treeQuestions.length);
        setQuestions(treeQuestions);
        
        // Fetch feature mappings for all questions
        fetchAllFeatureMappings(allQuestionsList);
      } else {
        // Handle error response
        const errorObj = data.error || {};
        const errorMessage = errorObj.message || errorObj.code || 'Failed to load questions';
        console.error('[fetchQuestions] API returned error:', {
          error: errorObj,
          fullResponse: data,
        });
        showToast('error', errorMessage);
      }
    } catch (error) {
      console.error('[fetchQuestions] Exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load questions';
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleQuestionSelect = async (question: Question) => {
    // Fetch full question details for editing
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSelectedQuestion(data.data);
        if (viewMode === 'table') {
          setIsModalOpen(true);
        }
      } else {
        setSelectedQuestion(question);
        if (viewMode === 'table') {
          setIsModalOpen(true);
        }
      }
    } catch (error) {
      // If fetch fails, use the question from tree
      setSelectedQuestion(question);
      if (viewMode === 'table') {
        setIsModalOpen(true);
      }
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Question deleted successfully');
        if (selectedQuestion?.id === questionId) {
          setSelectedQuestion(null);
        }
        fetchQuestions();
      } else {
        showToast('error', data.error?.message || 'Failed to delete question');
      }
    } catch (error) {
      showToast('error', 'An error occurred while deleting question');
    }
  };

  const renderQuestionTree = (questionList: Question[], level = 0) => {
    return questionList.map((question) => {
      const hasChildren = question.childQuestions && question.childQuestions.length > 0;
      const isExpanded = expandedQuestions.has(question.id);
      const isSelected = selectedQuestion?.id === question.id;
      const isDragging = draggedQuestion?.id === question.id;

      return (
        <div key={question.id} className="select-none">
          {/* Question Row - Draggable */}
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, question)}
            onDragEnd={handleDragEnd}
            onClick={() => handleQuestionSelect(question)}
            className={`flex items-center gap-2 p-2 rounded cursor-move transition-colors group ${
              isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-slate-50'
            } ${
              isDragging ? 'opacity-50' : ''
            }`}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(question.id);
                }}
                className="p-1 hover:bg-slate-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="text-slate-600" />
                ) : (
                  <ChevronRight size={16} className="text-slate-600" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <HelpCircle size={16} className="text-slate-400" />
            <span className="flex-1 text-sm font-medium text-slate-900">
              {question.textEn}
            </span>
            {question.parentAnswerId && (
              <Badge color="purple" size="sm" className="text-xs">
                Sub-Q
              </Badge>
            )}
            <span className="text-xs text-slate-500">Q{question.order}</span>
            {question.parentAnswerId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveParent(question);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-purple-100 rounded text-purple-600 transition-opacity"
                title="Remove from parent"
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(question.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-600 transition-opacity"
              title="Delete question"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Answer Options - Drop Zones */}
          {question.options && question.options.length > 0 && (
            <div className="ml-8 space-y-1 mt-1">
              {question.options.map((option) => {
                const isDragOver = dragOverOption?.questionId === question.id && dragOverOption?.optionId === option.id;
                // Find child questions for this option
                const optionChildren = question.childQuestions?.filter(
                  (cq: any) => cq.parentAnswerId === option.id
                ) || [];
                
                // Get feature mappings for this option
                const optionMappings = questionFeatureMappings.get(question.id)?.filter(
                  m => m.optionKey === option.key
                ) || [];
                const mappingKey = `${question.id}-${option.id}`;
                const isMappingExpanded = expandedOptionMappings.has(mappingKey);
                
                return (
                  <div
                    key={option.id}
                    className="ml-4"
                  >
                    {/* Option Row */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragOver(e, question.id, option.id);
                      }}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, question.id, option.id)}
                      className={`p-2 rounded border-2 border-dashed transition-all ${
                        isDragOver
                          ? 'border-blue-500 bg-blue-50 border-solid'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight size={12} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">{option.textEn}</span>
                        <span className="text-xs text-slate-400 font-mono">({option.key})</span>
                        {optionMappings.length > 0 && (
                          <Badge color="purple" size="sm" className="text-xs">
                            {optionMappings.length} features
                          </Badge>
                        )}
                        {optionChildren.length > 0 && (
                          <Badge color="green" size="sm" className="text-xs">
                            {optionChildren.length} sub-Q
                          </Badge>
                        )}
                        {isDragOver && (
                          <Badge color="blue" size="sm" className="ml-auto">
                            Drop here
                          </Badge>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newExpanded = new Set(expandedOptionMappings);
                            if (newExpanded.has(mappingKey)) {
                              newExpanded.delete(mappingKey);
                            } else {
                              newExpanded.add(mappingKey);
                            }
                            setExpandedOptionMappings(newExpanded);
                          }}
                          className="ml-auto text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          title="Toggle feature mappings"
                        >
                          <Settings size={12} />
                          Features
                        </button>
                      </div>
                      
                      {/* Feature Mappings */}
                      {isMappingExpanded && (
                        <div className="mt-2 ml-4 space-y-2 p-2 bg-slate-50 rounded border border-slate-200">
                          <div className="text-xs font-semibold text-slate-700 mb-2">Feature Mappings:</div>
                          {optionMappings.length > 0 ? (
                            optionMappings.map((mapping, idx) => {
                              const allMappings = questionFeatureMappings.get(question.id) || [];
                              const mappingIndex = allMappings.findIndex(
                                m => m.optionKey === mapping.optionKey && 
                                m.featureKey === mapping.featureKey &&
                                m.weight === mapping.weight
                              );
                              return (
                                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                  <Select
                                    value={mapping.featureKey}
                                    onChange={(e) => {
                                      const updated = new Map(questionFeatureMappings);
                                      const questionMappings = [...(updated.get(question.id) || [])];
                                      if (mappingIndex >= 0) {
                                        questionMappings[mappingIndex] = {
                                          ...questionMappings[mappingIndex],
                                          featureKey: e.target.value,
                                        };
                                        updated.set(question.id, questionMappings);
                                        setQuestionFeatureMappings(updated);
                                      }
                                    }}
                                    options={[
                                      { value: '', label: 'Select Feature' },
                                      ...features.map(f => ({ value: f.key, label: `${f.name} (${f.key})` }))
                                    ]}
                                    className="flex-1 text-xs"
                                  />
                                  <Input
                                    type="number"
                                    value={mapping.weight}
                                    onChange={(e) => {
                                      const updated = new Map(questionFeatureMappings);
                                      const questionMappings = [...(updated.get(question.id) || [])];
                                      if (mappingIndex >= 0) {
                                        questionMappings[mappingIndex] = {
                                          ...questionMappings[mappingIndex],
                                          weight: parseFloat(e.target.value) || 0,
                                        };
                                        updated.set(question.id, questionMappings);
                                        setQuestionFeatureMappings(updated);
                                      }
                                    }}
                                    placeholder="Weight"
                                    className="w-20 text-xs"
                                    min="0"
                                    max="3"
                                    step="0.1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const updated = new Map(questionFeatureMappings);
                                      const questionMappings = [...(updated.get(question.id) || [])];
                                      questionMappings.splice(mappingIndex, 1);
                                      updated.set(question.id, questionMappings);
                                      setQuestionFeatureMappings(updated);
                                    }}
                                    className="text-red-600 hover:text-red-700 p-1"
                                  >
                                    <X size={12} />
                                  </Button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-400 italic">No features mapped</p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updated = new Map(questionFeatureMappings);
                              const questionMappings = [...(updated.get(question.id) || [])];
                              questionMappings.push({
                                optionKey: option.key,
                                featureKey: features[0]?.key || '',
                                weight: 1.0,
                              });
                              updated.set(question.id, questionMappings);
                              setQuestionFeatureMappings(updated);
                            }}
                            className="w-full text-xs"
                          >
                            <Plus size={12} className="mr-1" />
                            Add Feature
                          </Button>
                            <Button
                            size="sm"
                            onClick={async () => {
                              const mappings = questionFeatureMappings.get(question.id) || [];
                              try {
                                const token = localStorage.getItem('lenstrack_token');
                                const response = await fetch(`/api/admin/questionnaire/questions/${question.id}/feature-mappings`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ mappings }),
                                });
                                
                                const data = await response.json();
                                if (data.success) {
                                  showToast('success', `Saved ${mappings.length} feature mappings`);
                                  // Refresh mappings
                                  await fetchAllFeatureMappings(allQuestions);
                                } else {
                                  showToast('error', data.error?.message || 'Failed to save');
                                }
                              } catch (error) {
                                showToast('error', 'Failed to save mappings');
                              }
                            }}
                            className="w-full text-xs"
                          >
                            Save Mappings
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Show child questions under this option */}
                    {optionChildren.length > 0 && (
                      <div className="mt-2 ml-4">
                        {renderQuestionTree(optionChildren, level + 1)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Child Questions (for backward compatibility) */}
          {hasChildren && isExpanded && (
            <div className="ml-4">
              {renderQuestionTree(question.childQuestions || [], level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Questions Management</h1>
          <p className="text-slate-600 mt-1">
            {viewMode === 'tree' 
              ? 'Build questions with subquestions (Tree View)' 
              : 'Manage all questions (Table View)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'tree'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network size={16} />
              Tree View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={16} />
              Table View
            </button>
          </div>
          <Button 
            variant="outline"
            onClick={() => {
              setSelectedQuestion(null);
              fetchQuestions();
            }}
          >
            Refresh
          </Button>
          <Button 
            onClick={() => {
              setSelectedQuestion(null);
              if (viewMode === 'table') {
                setIsModalOpen(true);
              }
            }}
          >
            <Plus size={20} className="mr-2" />
            New Question
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ProductCategory)}
          options={[
            { value: 'EYEGLASSES', label: 'Eyeglasses' },
            { value: 'SUNGLASSES', label: 'Sunglasses' },
            { value: 'CONTACT_LENSES', label: 'Contact Lenses' },
            { value: 'ACCESSORIES', label: 'Accessories' },
          ]}
        />
      </div>

      {viewMode === 'tree' ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Tree View */}
          <div className="lg:col-span-1">
            <Card>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Questions Tree</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newExpanded = new Set(expandedQuestions);
                      if (newExpanded.size === questions.length) {
                        setExpandedQuestions(new Set());
                      } else {
                        const allIds = questions.map(q => q.id);
                        setExpandedQuestions(new Set(allIds));
                      }
                    }}
                  >
                    {expandedQuestions.size === questions.length ? 'Collapse All' : 'Expand All'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  💡 Drag questions onto answer options to create subquestions. This makes the questionnaire flow more accurate.
                </p>
              </div>
              <div className="p-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No questions found for {categoryFilter}
                  </div>
                ) : (
                  renderQuestionTree(questions)
                )}
              </div>
            </Card>
          </div>

          {/* Right: Question Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              {selectedQuestion ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Edit Question</h3>
                    <Button
                      size="sm"
                      variant={showFeatureMapping ? 'primary' : 'outline'}
                      onClick={() => setShowFeatureMapping(!showFeatureMapping)}
                    >
                      <Settings size={16} className="mr-2" />
                      {showFeatureMapping ? 'Hide' : 'Show'} Feature Mapping
                    </Button>
                  </div>
                  <QuestionForm
                    question={selectedQuestion}
                    onSubmit={async (formData) => {
                      try {
                        const token = localStorage.getItem('lenstrack_token');
                        const response = await fetch(`/api/admin/questions/${selectedQuestion.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify(formData),
                        });

                        const data = await response.json();
                        if (data.success) {
                          showToast('success', 'Question updated successfully');
                          setSelectedQuestion(null);
                          fetchQuestions();
                        } else {
                          showToast('error', data.error?.message || 'Failed to update question');
                        }
                      } catch (error) {
                        showToast('error', 'An error occurred while updating question');
                      }
                    }}
                    onCancel={() => setSelectedQuestion(null)}
                    loading={false}
                  />
                  
                  {/* Feature Mapping Section */}
                  {showFeatureMapping && selectedQuestion && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Settings size={20} />
                        Feature Mapping (Question → Options → Features)
                      </h4>
                      <p className="text-sm text-slate-600 mb-4">
                        Map answer options to lens features with weights. This helps the recommendation engine match products to customer answers.
                      </p>

                      <div className="space-y-4">
                        {selectedQuestion.options && selectedQuestion.options.length > 0 ? (
                          selectedQuestion.options.map((option) => {
                            const optionMappings = featureMappings.filter(m => m.optionKey === option.key);
                            return (
                              <div key={option.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="font-medium text-slate-900">{option.textEn}</p>
                                    <p className="text-xs text-slate-500 font-mono">{option.key}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addFeatureMapping(option.key)}
                                  >
                                    <Plus size={14} className="mr-1" />
                                    Add Feature
                                  </Button>
                                </div>

                                {optionMappings.length > 0 ? (
                                  <div className="space-y-2">
                                    {optionMappings.map((mapping, idx) => {
                                      // Find the actual index in featureMappings array
                                      let mappingIndex = -1;
                                      let foundCount = 0;
                                      for (let i = 0; i < featureMappings.length; i++) {
                                        if (featureMappings[i].optionKey === option.key) {
                                          if (foundCount === idx) {
                                            mappingIndex = i;
                                            break;
                                          }
                                          foundCount++;
                                        }
                                      }
                                      
                                      return (
                                        <div key={`${option.key}-${idx}`} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                          <Select
                                            value={mapping.featureKey}
                                            onChange={(e) => {
                                              if (mappingIndex >= 0) {
                                                updateFeatureMapping(mappingIndex, 'featureKey', e.target.value);
                                              }
                                            }}
                                            options={[
                                              { value: '', label: 'Select Feature' },
                                              ...features.map(f => ({ value: f.key, label: `${f.name} (${f.key})` }))
                                            ]}
                                            className="flex-1"
                                          />
                                          <Input
                                            type="number"
                                            value={mapping.weight}
                                            onChange={(e) => {
                                              if (mappingIndex >= 0) {
                                                updateFeatureMapping(mappingIndex, 'weight', parseFloat(e.target.value) || 0);
                                              }
                                            }}
                                            placeholder="Weight"
                                            className="w-24"
                                            min="0"
                                            max="3"
                                            step="0.1"
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              if (mappingIndex >= 0) {
                                                removeFeatureMapping(mappingIndex);
                                              }
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <X size={16} />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-400 italic">No features mapped yet</p>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-500">No options available. Add options to the question first.</p>
                        )}

                        {featureMappings.length > 0 && (
                          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setFeatureMappings([]);
                                if (selectedQuestion) {
                                  fetchFeatureMappings(selectedQuestion.id);
                                }
                              }}
                            >
                              Reset
                            </Button>
                            <Button
                              onClick={saveFeatureMappings}
                              loading={mappingLoading}
                            >
                              Save Feature Mappings
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold mb-4">Create New Question</h3>
                  <QuestionForm
                    question={null}
                    onSubmit={async (formData) => {
                      try {
                        const token = localStorage.getItem('lenstrack_token');
                        const response = await fetch('/api/admin/questions', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify(formData),
                        });

                        const data = await response.json();
                        console.log('[onSubmit] Create response:', data);
                        if (data.success) {
                          showToast('success', 'Question created successfully');
                          setSelectedQuestion(null);
                          // Reset form by clearing it
                          setTimeout(() => {
                            fetchQuestions();
                          }, 500);
                        } else {
                          console.error('[onSubmit] Create failed:', data.error);
                          showToast('error', data.error?.message || 'Failed to create question');
                        }
                      } catch (error) {
                        showToast('error', 'An error occurred while creating question');
                      }
                    }}
                    onCancel={() => setSelectedQuestion(null)}
                    loading={false}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div>
          {/* Table View - Same as Questions Page */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <DataTable
              columns={[
                {
                  key: 'order',
                  header: 'Order',
                  render: (q) => <span className="font-mono text-sm">#{q.order}</span>,
                },
                {
                  key: 'textEn',
                  header: 'Question',
                  render: (q) => (
                    <div>
                      <p className="font-medium">{q.textEn}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">{q.key}</p>
                    </div>
                  ),
                },
                {
                  key: 'category',
                  header: 'Category',
                  render: (q) => {
                    const category = q.category as string;
                    const getColor = () => {
                      if (category === 'EYEGLASSES') return 'blue';
                      if (category === 'SUNGLASSES') return 'yellow';
                      if (category === 'CONTACT_LENSES') return 'cyan';
                      return 'gray';
                    };
                    return (
                      <Badge color={getColor()} size="sm">
                        {category.replace('_', ' ')}
                      </Badge>
                    );
                  },
                },
                {
                  key: 'optionCount',
                  header: 'Options',
                  render: (q) => <span className="text-sm">{q.optionCount ?? q.options?.length ?? 0}</span>,
                },
                {
                  key: 'mappingCount',
                  header: 'Mappings',
                  render: (q) => <span className="text-sm">{q.mappingCount ?? 0}</span>,
                },
                {
                  key: 'answerCount',
                  header: 'Answered',
                  render: (q) => <span className="text-sm font-medium">{q.answerCount ?? 0}</span>,
                },
                {
                  key: 'isRequired',
                  header: 'Required',
                  render: (q) => (
                    <Badge color={q.isRequired ? 'green' : 'gray'} size="sm">
                      {q.isRequired ? 'Yes' : 'No'}
                    </Badge>
                  ),
                },
                {
                  key: 'allowMultiple',
                  header: 'Multi-Select',
                  render: (q) => (
                    <Badge color={q.allowMultiple ? 'blue' : 'gray'} size="sm">
                      {q.allowMultiple ? 'Yes' : 'No'}
                    </Badge>
                  ),
                },
                {
                  key: 'isActive',
                  header: 'Status',
                  render: (q) => (
                    <Badge color={q.isActive ? 'green' : 'red'} size="sm">
                      {q.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (q) => (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuestionSelect(q)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={allQuestions}
              loading={loading}
              emptyMessage="No questions found for this category"
            />
          </div>

          {/* Modal for Table View Edit/Create */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedQuestion(null);
            }}
            title={selectedQuestion ? 'Edit Question' : 'Create New Question'}
            size="lg"
          >
            <QuestionForm
              question={selectedQuestion}
              onSubmit={async (formData) => {
                setSubmitLoading(true);
                try {
                  const token = localStorage.getItem('lenstrack_token');
                  const url = selectedQuestion
                    ? `/api/admin/questions/${selectedQuestion.id}`
                    : '/api/admin/questions';
                  
                  const response = await fetch(url, {
                    method: selectedQuestion ? 'PUT' : 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(formData),
                  });

                  const data = await response.json();
                  console.log('[Modal onSubmit] Response:', data);
                  if (data.success) {
                    showToast('success', `Question ${selectedQuestion ? 'updated' : 'created'} successfully`);
                    setIsModalOpen(false);
                    setSelectedQuestion(null);
                    setTimeout(() => {
                      fetchQuestions();
                    }, 500);
                  } else {
                    console.error('[Modal onSubmit] Failed:', data.error);
                    showToast('error', data.error?.message || 'Operation failed');
                  }
                } catch (error) {
                  showToast('error', 'An error occurred');
                } finally {
                  setSubmitLoading(false);
                }
              }}
              onCancel={() => {
                setIsModalOpen(false);
                setSelectedQuestion(null);
              }}
              loading={submitLoading}
            />
          </Modal>
        </div>
      )}
    </div>
  );
}

