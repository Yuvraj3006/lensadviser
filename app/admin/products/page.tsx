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


interface SubBrand {
  id: string;
  name: string;
  isActive: boolean;
}

interface Brand {
  id: string;
  name: string;
  isActive: boolean;
  productTypes: ('FRAME' | 'SUNGLASS' | 'CONTACT_LENS' | 'ACCESSORY')[];
  subBrands: SubBrand[];
}

interface RetailProduct {
  id: string;
  // Note: 
  // - FRAME and SUNGLASS: Manual entry only (not SKU products)
  // - CONTACT_LENS: Use ContactLensProduct model (/admin/contact-lens-products)
  // - ACCESSORY: Only type allowed in RetailProduct
  type: 'FRAME' | 'SUNGLASS' | 'CONTACT_LENS' | 'ACCESSORY';
  brand: {
    id: string;
    name: string;
  };
  subBrand: {
    id: string;
    name: string;
  } | null;
  name: string | null;
  sku: string | null;
  mrp: number;
  hsnCode: string | null;
  isActive: boolean;
}

// NOTE: 
// - FRAME and SUNGLASS: Manual entry only (not SKU products)
// - CONTACT_LENS: Use /admin/contact-lens-products (ContactLensProduct model)
// - ACCESSORY: Only type allowed in RetailProduct
type ProductType = 'ACCESSORY';

export default function ProductsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ProductType>('ACCESSORY');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isSubBrandModalOpen, setIsSubBrandModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [editingSubBrandId, setEditingSubBrandId] = useState<string | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  
  // Brand form
  const [brandFormData, setBrandFormData] = useState({
    name: '',
    productTypes: [] as ProductType[],
  });
  
  // Sub-brand form
  const [subBrandFormData, setSubBrandFormData] = useState({
    name: '',
  });

  // Product form
  const [productFormData, setProductFormData] = useState({
    type: 'ACCESSORY' as ProductType,
    brandId: '',
    subBrandId: '',
    name: '',
    sku: '',
    mrp: 0,
    hsnCode: '',
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    fetchProducts(activeTab);
  }, [activeTab]);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login to continue');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/brands', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error - Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          rawText: errorText,
          textLength: errorText?.length || 0,
        });
        
        let errorData: any = {};
        if (errorText && errorText.trim() !== '') {
          try {
            errorData = JSON.parse(errorText);
          } catch (parseError) {
            console.error('Failed to parse error response as JSON:', parseError);
            errorData = { 
              error: { 
                message: errorText || `HTTP ${response.status}: ${response.statusText}` 
              } 
            };
          }
        } else {
          errorData = { 
            error: { 
              message: `HTTP ${response.status}: ${response.statusText || 'Unknown error'}` 
            } 
          };
        }
        
        console.error('API Error Response (parsed):', errorData);
        console.error('Full error object:', JSON.stringify(errorData, null, 2));
        
        // Extract error message with details if available
        let errorMessage = errorData?.error?.message || errorData?.message || `Failed to load brands (${response.status})`;
        if (errorData?.error?.details) {
          console.error('Error details:', errorData.error.details);
          if (errorData.error.details.message) {
            errorMessage += `: ${errorData.error.details.message}`;
          }
        }
        
        showToast('error', errorMessage);
        if (response.status === 401) {
          window.location.href = '/login';
        }
        return;
      }

      // Parse JSON response
      let data;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          console.error('Empty response from API');
          showToast('error', 'Empty response from server');
          return;
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        showToast('error', 'Invalid response from server');
        return;
      }

      if (data.success) {
        setBrands(data.data || []);
      } else {
        const errorMessage = data.error?.message || data.message || 'Failed to load brands';
        console.error('API returned error:', {
          success: data.success,
          error: data.error,
          message: data.message,
          fullData: data,
        });
        showToast('error', errorMessage);
        if (response.status === 401) {
          window.location.href = '/login';
        }
      }
    } catch (error: any) {
      console.error('Failed to load brands - Exception:', error);
      showToast('error', error?.message || 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (type: ProductType) => {
    setProductsLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login to continue');
        setProductsLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/products?type=${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error - Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          rawText: errorText,
          textLength: errorText?.length || 0,
        });
        
        let errorData: any = {};
        if (errorText && errorText.trim() !== '') {
          try {
            errorData = JSON.parse(errorText);
          } catch (parseError) {
            console.error('Failed to parse error response as JSON:', parseError);
            errorData = { 
              error: { 
                message: errorText || `HTTP ${response.status}: ${response.statusText}` 
              } 
            };
          }
        } else {
          errorData = { 
            error: { 
              message: `HTTP ${response.status}: ${response.statusText || 'Unknown error'}` 
            } 
          };
        }
        
        console.error('API Error Response (parsed):', errorData);
        console.error('Full error object:', JSON.stringify(errorData, null, 2));
        
        // Extract error message with details if available
        let errorMessage = errorData?.error?.message || errorData?.message || `Failed to load products (${response.status})`;
        if (errorData?.error?.details) {
          console.error('Error details:', errorData.error.details);
          if (errorData.error.details.message) {
            errorMessage += `: ${errorData.error.details.message}`;
          }
        }
        
        showToast('error', errorMessage);
        if (response.status === 401) {
          window.location.href = '/login';
        }
        return;
      }

      // Parse JSON response
      let data;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          console.error('Empty response from API');
          showToast('error', 'Empty response from server');
          return;
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        showToast('error', 'Invalid response from server');
        return;
      }

      if (data.success) {
        setProducts(data.data || []);
      } else {
        const errorMessage = data.error?.message || data.message || 'Failed to load products';
        console.error('API returned error:', {
          success: data.success,
          error: data.error,
          message: data.message,
          fullData: data,
        });
        showToast('error', errorMessage);
        if (response.status === 401) {
          window.location.href = '/login';
        }
      }
    } catch (error: any) {
      console.error('Failed to load products - Exception:', error);
      showToast('error', error?.message || 'Network error. Please check your connection.');
    } finally {
      setProductsLoading(false);
    }
  };


  const handleCreateBrand = () => {
    setBrandFormData({ name: '', productTypes: [] });
    setIsBrandModalOpen(true);
  };

  const handleCreateProduct = () => {
    setProductFormData({
      type: activeTab,
      brandId: '',
      subBrandId: '',
      name: '',
      sku: '',
      mrp: 0,
      hsnCode: '',
    });
    setIsProductModalOpen(true);
  };

  const handleSubmitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate brand name before sending
      const trimmedBrandName = brandFormData.name?.trim() || '';
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

      const requestBody = { 
        name: trimmedBrandName,
        productTypes: brandFormData.productTypes,
      };
      console.log('Sending brand creation request:', JSON.stringify(requestBody, null, 2));
      console.log('Current brandFormData state:', JSON.stringify(brandFormData, null, 2));
      
      const response = await fetch('/api/admin/brands', {
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
        setBrandFormData({ name: '', productTypes: [] });
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
      name: '',
    });
    setIsSubBrandModalOpen(true);
  };

  const handleSubmitSubBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/brands/${selectedBrand.id}/subbrands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: subBrandFormData.name,
        }),
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
      name: subBrand.name,
    });
    setIsSubBrandModalOpen(true);
  };

  const handleUpdateSubBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand || !editingSubBrandId) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      // Note: Update endpoint needs to be created
      const response = await fetch(
        `/api/admin/brands/${selectedBrand.id}/subbrands/${editingSubBrandId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: subBrandFormData.name,
          }),
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
      // Note: Delete endpoint needs to be created
      const response = await fetch(`/api/admin/brands/${brandId}`, {
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
      // Note: Delete endpoint needs to be created
      const response = await fetch(
        `/api/admin/brands/${brandId}/subbrands/${subBrandId}`,
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
    brand.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: productFormData.type,
          brandId: productFormData.brandId,
          subBrandId: productFormData.subBrandId || null,
          name: productFormData.name || null,
          sku: productFormData.sku || null,
          mrp: productFormData.mrp,
          hsnCode: productFormData.hsnCode || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Product created successfully');
        setIsProductModalOpen(false);
        fetchProducts(activeTab);
      } else {
        showToast('error', data.error?.message || 'Failed to create product');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getProductTypeLabel = (type: ProductType) => {
    return 'Accessories';
  };

  const getAddButtonLabel = () => {
    return 'Add Accessory';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Products</h1>
        <p className="text-slate-600">Manage products, brands, and sub-brands</p>
      </div>

      {/* Product Type Tabs */}
      {/* NOTE: FRAME and SUNGLASS tabs removed - only manual entry in customer flow per specification */}
      <div className="mb-6">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 inline-flex">
          {(['ACCESSORY'] as ProductType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === type
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {getProductTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Brands & Sub-Brands */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Brands & Sub-Brands</h2>
              <Button size="sm" icon={<Plus size={14} />} onClick={handleCreateBrand}>
                Add Brand
              </Button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <Input
                placeholder="Search brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>

            {/* Brands List */}
            <div>
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
                      {brand.name}
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
                      brand.subBrands.map((subBrand) => (
                        <div
                          key={subBrand.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <Badge color="green" size="sm">
                            {subBrand.name}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Right: Products List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {getProductTypeLabel(activeTab)}
              </h2>
              <Button size="sm" icon={<Plus size={14} />} onClick={handleCreateProduct}>
                {getAddButtonLabel()}
              </Button>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<Tag size={48} />}
                title={`No ${getProductTypeLabel(activeTab).toLowerCase()} found`}
                description={`Create your first ${getProductTypeLabel(activeTab).toLowerCase().slice(0, -1)} to get started`}
                action={{
                  label: getAddButtonLabel(),
                  onClick: handleCreateProduct,
                }}
              />
            ) : (
              <div className="divide-y divide-slate-200">
                {products.map((product) => (
                  <div key={product.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">
                            {product.name || 'Unnamed Product'}
                          </span>
                          {product.sku && (
                            <Badge color="gray" size="sm" variant="soft">
                              {product.sku}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          {product.brand && <span>{product.brand.name}</span>}
                          {product.subBrand && (
                            <>
                              {product.brand && <span>•</span>}
                              <span>{product.subBrand.name}</span>
                            </>
                          )}
                          {(product.brand || product.subBrand) && <span>•</span>}
                          <span className="font-medium text-slate-900">₹{product.mrp.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={product.isActive ? 'green' : 'red'} size="sm">
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
            placeholder="e.g., LensTrack, RayBan, Bausch & Lomb"
            value={brandFormData.name}
            onChange={(e) => {
              setBrandFormData({ ...brandFormData, name: e.target.value });
            }}
            required
            maxLength={100}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Types *
            </label>
            <div className="space-y-2">
              {(['FRAME', 'SUNGLASS', 'CONTACT_LENS', 'ACCESSORY'] as ProductType[]).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandFormData.productTypes.includes(type)}
                    onChange={() => {
                      const types = brandFormData.productTypes.includes(type)
                        ? brandFormData.productTypes.filter((t) => t !== type)
                        : [...brandFormData.productTypes, type];
                      setBrandFormData({ ...brandFormData, productTypes: types });
                    }}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
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
            placeholder="e.g., ESSENTIAL, ADVANCED, PREMIUM, Classic, Premium"
            value={subBrandFormData.name}
            onChange={(e) => setSubBrandFormData({ ...subBrandFormData, name: e.target.value })}
            required
            disabled={!!editingSubBrandId}
          />
        </form>
      </Modal>

      {/* Create Product Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={getAddButtonLabel()}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitProduct}
              loading={submitting}
            >
              Create
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Brand <span className="text-red-500">*</span>
            </label>
            <Select
              value={productFormData.brandId}
              onChange={(e) => {
                setProductFormData({
                  ...productFormData,
                  brandId: e.target.value,
                  subBrandId: '', // Reset sub-brand when brand changes
                });
              }}
              options={[
                { value: '', label: 'Select Brand' },
                ...brands
                  .filter(b => b.productTypes.includes(activeTab))
                  .map(b => ({ value: b.id, label: b.name })),
              ]}
              required
            />
          </div>

          {productFormData.brandId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Sub-Brand (Optional)
              </label>
              <Select
                value={productFormData.subBrandId}
                onChange={(e) => setProductFormData({ ...productFormData, subBrandId: e.target.value })}
                options={[
                  { value: '', label: 'No Sub-Brand' },
                  ...(brands.find(b => b.id === productFormData.brandId)?.subBrands || []).map(sb => ({
                    value: sb.id,
                    label: sb.name,
                  })),
                ]}
              />
            </div>
          )}

          <Input
            label="Product Name / Model (Optional)"
            placeholder="e.g., Wayfarer 5121"
            value={productFormData.name}
            onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
          />

          <Input
            label="SKU (Optional)"
            placeholder="e.g., RB-5121-BLK"
            value={productFormData.sku}
            onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
          />

          <Input
            label="MRP"
            type="number"
            placeholder="0.00"
            value={productFormData.mrp || ''}
            onChange={(e) => setProductFormData({ ...productFormData, mrp: parseFloat(e.target.value) || 0 })}
            required
            min="0"
            step="0.01"
          />

          <Input
            label="HSN Code (Optional)"
            placeholder="e.g., 9001"
            value={productFormData.hsnCode}
            onChange={(e) => setProductFormData({ ...productFormData, hsnCode: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
