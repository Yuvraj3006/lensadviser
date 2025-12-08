'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Search, Edit2, Trash2, Tag, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Select } from '@/components/ui/Select';

interface OfferRule {
  id: string;
  code: string;
  name: string;
}

interface SubBrand {
  id: string;
  subBrandName: string;
  offerRuleIds: string[];
  isActive: boolean;
}

interface Brand {
  id: string;
  brandName: string;
  isActive: boolean;
  subBrands: SubBrand[];
}

export default function ProductsPage() {
  const { showToast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [offerRules, setOfferRules] = useState<OfferRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isSubBrandModalOpen, setIsSubBrandModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [editingSubBrandId, setEditingSubBrandId] = useState<string | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  
  // Brand form
  const [brandFormData, setBrandFormData] = useState({
    brandName: '',
  });
  
  // Sub-brand form
  const [subBrandFormData, setSubBrandFormData] = useState({
    subBrandName: '',
    offerRuleIds: [] as string[],
  });

  useEffect(() => {
    fetchBrands();
    fetchOfferRules();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/frame-brands', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setBrands(data.data);
      }
    } catch (error) {
      console.error('Failed to load brands');
      showToast('error', 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferRules = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const sessionRes = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sessionData = await sessionRes.json();
      
      if (sessionData.success && sessionData.data?.organizationId) {
        const response = await fetch(
          `/api/admin/offers/rules?organizationId=${sessionData.data.organizationId}&isActive=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (data.success) {
          setOfferRules(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load offer rules');
    }
  };

  const handleCreateBrand = () => {
    setBrandFormData({ brandName: '' });
    setIsBrandModalOpen(true);
  };

  const handleSubmitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate brand name before sending
      const trimmedBrandName = brandFormData.brandName?.trim() || '';
      if (!trimmedBrandName) {
        showToast('error', 'Brand name is required');
        setSubmitting(false);
        return;
      }

      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login again');
        setSubmitting(false);
        return;
      }

      const requestBody = { brandName: trimmedBrandName };
      console.log('Sending brand creation request:', JSON.stringify(requestBody, null, 2));
      console.log('Current brandFormData state:', JSON.stringify(brandFormData, null, 2));
      
      const response = await fetch('/api/admin/frame-brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      console.log('Raw response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType,
        responseTextLength: responseText.length,
        responseTextPreview: responseText.substring(0, 200)
      });
      
      try {
        if (contentType && contentType.includes('application/json')) {
          if (responseText && responseText.trim()) {
            data = JSON.parse(responseText);
          } else {
            console.warn('Empty JSON response body');
            data = {};
          }
        } else {
          console.error('Non-JSON response:', { status: response.status, contentType, text: responseText });
          showToast('error', `Server error: ${response.status} ${response.statusText || 'Unknown error'}`);
          setSubmitting(false);
          return;
        }
      } catch (parseError: any) {
        console.error('Failed to parse response:', parseError, 'Response text:', responseText);
        showToast('error', `Failed to parse server response: ${response.status}. ${parseError?.message || ''}`);
        setSubmitting(false);
        return;
      }
      
      console.log('Brand creation response:', JSON.stringify({ 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        contentType,
        data,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        hasSuccess: data && 'success' in data,
        hasError: data && 'error' in data,
        errorObject: data?.error
      }, null, 2));

      if (!response.ok) {
        // Handle HTTP error status
        let errorMessage = `Server error: ${response.status}`;
        
        if (data) {
          if (data.error && data.error.message) {
            errorMessage = data.error.message;
          } else if (data.message) {
            errorMessage = data.message;
          } else if (data.error && data.error.code) {
            errorMessage = `Error: ${data.error.code}`;
          }
        }
        
        // Special handling for common status codes
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (response.status === 409) {
          errorMessage = data?.error?.message || 'This brand already exists.';
        }
        
        console.error('Brand creation failed:', JSON.stringify({ 
          status: response.status, 
          statusText: response.statusText,
          data,
          errorMessage,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseText: responseText.substring(0, 500)
        }, null, 2));
        showToast('error', errorMessage);
        setSubmitting(false);
        return;
      }

      if (data.success) {
        showToast('success', 'Brand created successfully');
        setIsBrandModalOpen(false);
        setBrandFormData({ brandName: '' });
        fetchBrands();
      } else {
        const errorMessage = 
          data.error?.message || 
          data.message || 
          data.error?.code ||
          'Failed to create brand';
        console.error('Brand creation error:', { status: response.status, data });
        showToast('error', errorMessage);
      }
    } catch (error: any) {
      console.error('Brand creation exception:', error);
      showToast('error', error?.message || 'Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setEditingSubBrandId(null);
    setSubBrandFormData({
      subBrandName: '',
      offerRuleIds: [],
    });
    setIsSubBrandModalOpen(true);
  };

  const handleSubmitSubBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/frame-brands/${selectedBrand.id}/sub-brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subBrandFormData),
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Sub-brand created successfully');
        setIsSubBrandModalOpen(false);
        setSelectedBrand(null);
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to create sub-brand');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubBrand = async (brandId: string, subBrand: SubBrand) => {
    setSelectedBrand(brands.find(b => b.id === brandId) || null);
    setEditingSubBrandId(subBrand.id);
    setSubBrandFormData({
      subBrandName: subBrand.subBrandName,
      offerRuleIds: subBrand.offerRuleIds,
    });
    setIsSubBrandModalOpen(true);
  };

  const handleUpdateSubBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand || !editingSubBrandId) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(
        `/api/admin/frame-brands/${selectedBrand.id}/sub-brands/${editingSubBrandId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(subBrandFormData),
        }
      );

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Sub-brand updated successfully');
        setIsSubBrandModalOpen(false);
        setSelectedBrand(null);
        setEditingSubBrandId(null);
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to update sub-brand');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/frame-brands/${brandId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Brand deleted successfully');
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to delete brand');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const handleDeleteSubBrand = async (brandId: string, subBrandId: string) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(
        `/api/admin/frame-brands/${brandId}/sub-brands/${subBrandId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Sub-brand deleted successfully');
        fetchBrands();
      } else {
        showToast('error', data.error?.message || 'Failed to delete sub-brand');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const toggleBrand = (brandId: string) => {
    const newExpanded = new Set(expandedBrands);
    if (newExpanded.has(brandId)) {
      newExpanded.delete(brandId);
    } else {
      newExpanded.add(brandId);
    }
    setExpandedBrands(newExpanded);
  };

  const filteredBrands = brands.filter((brand) =>
    brand.brandName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Frame Brands & Sub-Brands</h1>
          <p className="text-slate-600 mt-1">Manage frame brands, sub-brands, and their offer mappings</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleCreateBrand}>
          Add Brand
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>

      {/* Brands List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : filteredBrands.length === 0 ? (
          <EmptyState
            icon={<Tag size={48} />}
            title="No brands found"
            description="Create your first brand to get started"
            action={{
              label: 'Add Brand',
              onClick: handleCreateBrand,
            }}
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredBrands.map((brand) => (
              <div key={brand.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleBrand(brand.id)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {expandedBrands.has(brand.id) ? (
                        <ChevronDown size={20} />
                      ) : (
                        <ChevronRight size={20} />
                      )}
                    </button>
                    <Badge color="blue" size="md">
                      {brand.brandName}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      {brand.subBrands.length} sub-brand{brand.subBrands.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Plus size={14} />}
                      onClick={() => handleAddSubBrand(brand)}
                    >
                      Add Sub-Brand
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => handleDeleteBrand(brand.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {expandedBrands.has(brand.id) && (
                  <div className="mt-4 ml-8 space-y-2">
                    {brand.subBrands.length === 0 ? (
                      <p className="text-sm text-slate-500">No sub-brands yet. Add one to get started.</p>
                    ) : (
                      brand.subBrands.map((subBrand) => {
                        const mappedOffers = offerRules.filter(or =>
                          subBrand.offerRuleIds.includes(or.id)
                        );
                        return (
                          <div
                            key={subBrand.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge color="green" size="sm">
                                  {subBrand.subBrandName}
                                </Badge>
                                {mappedOffers.length > 0 && (
                                  <span className="text-xs text-slate-500">
                                    {mappedOffers.length} offer{mappedOffers.length !== 1 ? 's' : ''} mapped
                                  </span>
                                )}
                              </div>
                              {mappedOffers.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {mappedOffers.map((offer) => (
                                    <Badge key={offer.id} color="purple" size="sm" variant="soft">
                                      {offer.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<Edit2 size={14} />}
                                onClick={() => handleEditSubBrand(brand.id, subBrand)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<Trash2 size={14} />}
                                onClick={() => handleDeleteSubBrand(brand.id, subBrand.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Brand Modal */}
      <Modal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title="Create Brand"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsBrandModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="brand-form" loading={submitting}>
              Create
            </Button>
          </>
        }
      >
        <form id="brand-form" onSubmit={handleSubmitBrand} className="space-y-4">
          <Input
            label="Brand Name"
            placeholder="e.g., LensTrack, RayBan"
            value={brandFormData.brandName}
            onChange={(e) => {
              console.log('Input onChange:', e.target.value);
              setBrandFormData({ brandName: e.target.value });
            }}
            required
            maxLength={100}
          />
          <p className="text-xs text-slate-500">
            Enter a unique brand name. This will be used to organize frame sub-brands.
          </p>
        </form>
      </Modal>

      {/* Create/Edit Sub-Brand Modal */}
      <Modal
        isOpen={isSubBrandModalOpen}
        onClose={() => {
          setIsSubBrandModalOpen(false);
          setSelectedBrand(null);
          setEditingSubBrandId(null);
        }}
        title={editingSubBrandId ? 'Edit Sub-Brand' : 'Add Sub-Brand'}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubBrandModalOpen(false);
                setSelectedBrand(null);
                setEditingSubBrandId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingSubBrandId ? handleUpdateSubBrand : handleSubmitSubBrand}
              loading={submitting}
            >
              {editingSubBrandId ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form
          onSubmit={editingSubBrandId ? handleUpdateSubBrand : handleSubmitSubBrand}
          className="space-y-4"
        >
          <Input
            label="Sub-Brand Name"
            placeholder="e.g., ESSENTIAL, ADVANCED, PREMIUM"
            value={subBrandFormData.subBrandName}
            onChange={(e) => setSubBrandFormData({ ...subBrandFormData, subBrandName: e.target.value })}
            required
            disabled={!!editingSubBrandId}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Map Offers {subBrandFormData.offerRuleIds.length > 0 && `(${subBrandFormData.offerRuleIds.length} selected)`}
            </label>
            
            {offerRules.length === 0 ? (
              <p className="text-sm text-slate-500 p-3 border border-slate-200 rounded-lg bg-slate-50">
                No offers available. Create offers first.
              </p>
            ) : (
              <>
                <Select
                  label="Select Offers"
                  placeholder={offerRules.filter(o => !subBrandFormData.offerRuleIds.includes(o.id)).length === 0 
                    ? "All offers selected" 
                    : "Choose offers to map..."}
                  options={offerRules
                    .filter(offer => !subBrandFormData.offerRuleIds.includes(offer.id))
                    .map(offer => ({
                      value: offer.id,
                      label: `${offer.name} (${offer.code})`
                    }))}
                  value=""
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId && !subBrandFormData.offerRuleIds.includes(selectedId)) {
                      setSubBrandFormData({
                        ...subBrandFormData,
                        offerRuleIds: [...subBrandFormData.offerRuleIds, selectedId],
                      });
                      // Reset select
                      e.target.value = '';
                    }
                  }}
                  disabled={offerRules.filter(o => !subBrandFormData.offerRuleIds.includes(o.id)).length === 0}
                />
                
                {subBrandFormData.offerRuleIds.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-600 font-medium">Selected Offers:</p>
                    <div className="flex flex-wrap gap-2">
                      {subBrandFormData.offerRuleIds.map((offerId) => {
                        const offer = offerRules.find(o => o.id === offerId);
                        if (!offer) return null;
                        return (
                          <Badge
                            key={offerId}
                            color="blue"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            {offer.name}
                            <button
                              type="button"
                              onClick={() => {
                                setSubBrandFormData({
                                  ...subBrandFormData,
                                  offerRuleIds: subBrandFormData.offerRuleIds.filter(id => id !== offerId),
                                });
                              }}
                              className="ml-1 hover:text-red-600"
                            >
                              <X size={12} />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
