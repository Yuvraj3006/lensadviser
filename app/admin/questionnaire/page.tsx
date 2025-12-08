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
  displayOrder?: number | null; // Add displayOrder field
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
  
  // Drag and drop states
  const [draggedQuestion, setDraggedQuestion] = useState<Question | null>(null);
  const [dragOverOption, setDragOverOption] = useState<{ questionId: string; optionId: string } | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [categoryFilter]);

  // Note: Feature mapping functions removed - using Benefits-based flow instead

  // Drag and Drop handlers - ONLY for reordering main questions (displayOrder)
  const handleDragStart = (e: React.DragEvent, question: Question) => {
    // Only allow dragging main questions (not sub-questions)
    if (question.parentAnswerId) {
      e.preventDefault();
      return;
    }
    setDraggedQuestion(question);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', question.id);
  };

  const handleDragEnd = () => {
    setDraggedQuestion(null);
    setDragOverOption(null);
  };

  const handleDragOver = (e: React.DragEvent, questionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Only allow dropping on main questions (not sub-questions)
    const targetQuestion = allQuestions.find((q) => q.id === questionId);
    if (targetQuestion && !targetQuestion.parentAnswerId) {
      setDragOverOption({ questionId, optionId: '' });
    }
  };

  const handleDragLeave = () => {
    setDragOverOption(null);
  };

  const handleDrop = async (e: React.DragEvent, targetQuestionId: string) => {
    e.preventDefault();
    setDragOverOption(null);

    if (!draggedQuestion) return;

    // Only allow reordering main questions
    if (draggedQuestion.parentAnswerId) {
      showToast('error', 'Cannot reorder sub-questions. Use the answer option settings to manage sub-questions.');
      return;
    }

    const targetQuestion = allQuestions.find((q) => q.id === targetQuestionId);
    if (!targetQuestion || targetQuestion.parentAnswerId) {
      showToast('error', 'Can only reorder main questions');
      return;
    }

    // Don't allow dropping on itself
    if (draggedQuestion.id === targetQuestionId) {
      return;
    }

    try {
      const token = localStorage.getItem('lenstrack_token');
      
      // Get all main questions sorted by displayOrder
      const mainQuestions = allQuestions
        .filter((q) => !q.parentAnswerId)
        .sort((a, b) => (a.displayOrder || a.order || 0) - (b.displayOrder || b.order || 0));
      
      // Find indices
      const draggedIndex = mainQuestions.findIndex((q) => q.id === draggedQuestion.id);
      const targetIndex = mainQuestions.findIndex((q) => q.id === targetQuestionId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      // Calculate new displayOrder
      const newDisplayOrder = targetQuestion.displayOrder || targetQuestion.order || 0;
      
      // Update displayOrder of dragged question
      const response = await fetch(`/api/admin/questions/${draggedQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...draggedQuestion,
          displayOrder: newDisplayOrder,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', `Question order updated`);
        fetchQuestions();
      } else {
        showToast('error', data.error?.message || 'Failed to update question order');
      }
    } catch (error) {
      showToast('error', 'An error occurred while updating question order');
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
        
        // Build tree structure based on triggersSubQuestion + subQuestionId
        const allQuestionsList = data.data || [];
        console.log('[fetchQuestions] Building tree from', allQuestionsList.length, 'questions');
        
        // Root questions are those without parentAnswerId (for backward compatibility)
        // New implementation: sub-questions are linked via AnswerOption.triggersSubQuestion + subQuestionId
        const rootQuestions = allQuestionsList.filter((q: Question) => !q.parentAnswerId);
        console.log('[fetchQuestions] Root questions:', rootQuestions.length);
        
        // Build tree: attach sub-questions to their parent answer options
        const buildTree = (questions: Question[]): Question[] => {
          return questions.map((q) => {
            // Find sub-questions linked via answer options
            const subQuestions: Question[] = [];
            if (q.options && Array.isArray(q.options)) {
              q.options.forEach((opt: any) => {
                if (opt.triggersSubQuestion && opt.subQuestionId) {
                  const subQ = allQuestionsList.find((sq: Question) => sq.id === opt.subQuestionId);
                  if (subQ) {
                    subQuestions.push(subQ);
                  }
                }
              });
            }
            
            // Also check legacy parentAnswerId for backward compatibility
            const legacyChildren = allQuestionsList.filter(
              (cq: Question) => {
                return q.options?.some(opt => opt.id === cq.parentAnswerId);
              }
            );
            
            const allChildren = [...subQuestions, ...legacyChildren.filter((c: Question) => !subQuestions.find(sq => sq.id === c.id))];
            
            return {
              ...q,
              childQuestions: buildTree(allChildren),
            };
          });
        };
        
        const treeQuestions = buildTree(rootQuestions);
        console.log('[fetchQuestions] Tree questions:', treeQuestions.length);
        setQuestions(treeQuestions);
        
        // Note: Feature mappings removed - using Benefits-based flow
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
            draggable={!question.parentAnswerId} // Only allow dragging main questions
            onDragStart={(e) => handleDragStart(e, question)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => !question.parentAnswerId && handleDragOver(e, question.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => !question.parentAnswerId && handleDrop(e, question.id)}
            onClick={() => handleQuestionSelect(question)}
            className={`flex items-center gap-2 p-2 rounded transition-colors group ${
              !question.parentAnswerId ? 'cursor-move' : 'cursor-pointer'
            } ${
              isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-slate-50'
            } ${
              isDragging ? 'opacity-50' : ''
            } ${
              dragOverOption?.questionId === question.id ? 'border-2 border-blue-500 bg-blue-50' : ''
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
              {question.options.map((option: any) => {
                // Find sub-questions linked via triggersSubQuestion + subQuestionId
                const subQuestionId = option.subQuestionId;
                const hasSubQuestion = option.triggersSubQuestion && subQuestionId;
                const subQuestion = hasSubQuestion 
                  ? (allQuestions.find((q: Question) => q.id === subQuestionId) || 
                     questions.find((q: Question) => q.id === subQuestionId))
                  : null;
                
                // Also check legacy parentAnswerId for backward compatibility
                const legacyChildren = question.childQuestions?.filter(
                  (cq: any) => cq.parentAnswerId === option.id
                ) || [];
                
                const allSubQuestions = subQuestion 
                  ? [subQuestion, ...legacyChildren.filter(c => c.id !== subQuestion.id)]
                  : legacyChildren;
                
                return (
                  <div
                    key={option.id}
                    className="ml-4"
                  >
                    {/* Option Row */}
                    <div className="p-2 rounded border border-slate-200 bg-slate-50">
                      <div className="flex items-center gap-2">
                        <ChevronRight size={12} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">{option.textEn}</span>
                        <span className="text-xs text-slate-400 font-mono">({option.key})</span>
                        {hasSubQuestion && (
                          <Badge color="green" size="sm" className="text-xs">
                            → Sub-Q
                          </Badge>
                        )}
                        {legacyChildren.length > 0 && !hasSubQuestion && (
                          <Badge color="purple" size="sm" className="text-xs">
                            {legacyChildren.length} sub-Q (legacy)
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Show sub-question under this option */}
                    {allSubQuestions.length > 0 && (
                      <div className="mt-2 ml-4">
                        {renderQuestionTree(allSubQuestions, level + 1)}
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
                  💡 Drag main questions to reorder them. Use the answer option settings (toggle + dropdown) to create sub-questions.
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
                  
                  {/* Note: Feature mapping removed - using Benefits-based flow instead */}
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
                        console.log('[onSubmit] Response status:', response.status);
                        
                        if (data.success) {
                          showToast('success', 'Question created successfully');
                          setSelectedQuestion(null);
                          // Reset form by clearing it
                          setTimeout(() => {
                            fetchQuestions();
                          }, 500);
                        } else {
                          console.error('[onSubmit] Create failed:', {
                            error: data.error,
                            status: response.status,
                            fullResponse: data,
                          });
                          
                          // Handle different error formats
                          let errorMessage = 'Failed to create question';
                          if (data.error) {
                            if (typeof data.error === 'string') {
                              errorMessage = data.error;
                            } else if (data.error.message) {
                              errorMessage = data.error.message;
                            } else if (data.error.code) {
                              errorMessage = `Error: ${data.error.code}`;
                            } else if (Object.keys(data.error).length > 0) {
                              errorMessage = JSON.stringify(data.error);
                            }
                          } else if (data.message) {
                            errorMessage = data.message;
                          }
                          
                          showToast('error', errorMessage);
                        }
                      } catch (error: any) {
                        console.error('[onSubmit] Exception caught:', error);
                        showToast('error', error?.message || 'An error occurred while creating question');
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

                  // Check if response is ok before parsing
                  if (!response.ok) {
                    let errorText = '';
                    let errorData: any = null;
                    
                    try {
                      errorText = await response.text();
                      console.log('[Modal onSubmit] Error response text:', errorText);
                      
                      if (errorText) {
                        try {
                          errorData = JSON.parse(errorText);
                        } catch (parseError) {
                          console.warn('[Modal onSubmit] Failed to parse error as JSON:', parseError);
                          errorData = { error: { message: errorText || `HTTP ${response.status}: ${response.statusText}` } };
                        }
                      } else {
                        errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
                      }
                    } catch (textError) {
                      console.error('[Modal onSubmit] Failed to read error response:', textError);
                      errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
                    }
                    
                    console.error('[Modal onSubmit] Response not OK:', {
                      status: response.status,
                      statusText: response.statusText,
                      errorText: errorText.substring(0, 500), // Limit to first 500 chars
                      errorData,
                      headers: Object.fromEntries(response.headers.entries()),
                    });
                    
                    const errorMessage = 
                      errorData?.error?.message || 
                      errorData?.error?.code || 
                      errorData?.message || 
                      errorText?.substring(0, 200) ||
                      `Failed to ${selectedQuestion ? 'update' : 'create'} question (${response.status})`;
                    showToast('error', errorMessage);
                    return;
                  }

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
                    console.error('[Modal onSubmit] Failed:', {
                      data,
                      error: data.error,
                      fullResponse: JSON.stringify(data, null, 2),
                    });
                    const errorMessage = data.error?.message || data.message || 'Operation failed';
                    showToast('error', errorMessage);
                  }
                } catch (error: any) {
                  console.error('[Modal onSubmit] Exception:', {
                    error,
                    message: error?.message,
                    stack: error?.stack,
                    name: error?.name,
                  });
                  const errorMessage = error?.message || 'An error occurred while saving the question';
                  showToast('error', errorMessage);
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

