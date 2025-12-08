// Shared types for Product, Brand, and Lens models

export type RetailProductType = 'FRAME' | 'SUNGLASS' | 'CONTACT_LENS' | 'ACCESSORY';
export type LensType = 'SINGLE_VISION' | 'PROGRESSIVE' | 'BIFOCAL' | 'SPECIALITY';
export type LensIndex = 'INDEX_150' | 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174' | 'INDEX_PC';

// Product Brand
export interface ProductBrand {
  id: string;
  name: string;
  isActive: boolean;
  productTypes: RetailProductType[];
  subBrands?: ProductSubBrand[];
  createdAt?: string;
  updatedAt?: string;
}

// Product Sub-Brand
export interface ProductSubBrand {
  id: string;
  brandId: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Retail Product
export interface RetailProduct {
  id: string;
  type: RetailProductType;
  brandId: string;
  subBrandId?: string | null;
  name?: string | null;
  sku?: string | null;
  mrp: number;
  hsnCode?: string | null;
  isActive: boolean;
  brand?: {
    id: string;
    name: string;
    productTypes?: RetailProductType[];
  };
  subBrand?: {
    id: string;
    name: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

// Lens Brand
export interface LensBrand {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Lens Product
export interface LensProduct {
  id: string;
  itCode: string;
  name: string;
  lensBrandId: string;
  type: LensType;
  index: LensIndex;
  mrp: number;
  offerPrice: number;
  addOnPrice?: number | null;
  sphMin: number;
  sphMax: number;
  cylMax: number;
  addMin?: number | null;
  addMax?: number | null;
  yopoEligible: boolean;
  isActive: boolean;
  lensBrand?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// DTOs for API requests
export interface CreateProductBrandDTO {
  name: string;
  productTypes?: RetailProductType[];
}

export interface UpdateProductBrandDTO {
  name?: string;
  productTypes?: RetailProductType[];
  isActive?: boolean;
}

export interface CreateProductSubBrandDTO {
  name: string;
}

export interface UpdateProductSubBrandDTO {
  name?: string;
  isActive?: boolean;
}

export interface CreateRetailProductDTO {
  type: RetailProductType;
  brandId: string;
  subBrandId?: string | null;
  name?: string | null;
  sku?: string | null;
  mrp: number;
  hsnCode?: string | null;
}

export interface UpdateRetailProductDTO {
  type?: RetailProductType;
  brandId?: string;
  subBrandId?: string | null;
  name?: string | null;
  sku?: string | null;
  mrp?: number;
  hsnCode?: string | null;
  isActive?: boolean;
}

export interface CreateLensBrandDTO {
  name: string;
  description?: string | null;
}

export interface UpdateLensBrandDTO {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateLensProductDTO {
  itCode: string;
  name: string;
  lensBrandId: string;
  type: LensType;
  index: LensIndex;
  mrp: number;
  offerPrice: number;
  addOnPrice?: number | null;
  sphMin: number;
  sphMax: number;
  cylMax: number;
  addMin?: number | null;
  addMax?: number | null;
  yopoEligible?: boolean;
}

export interface UpdateLensProductDTO {
  itCode?: string;
  name?: string;
  lensBrandId?: string;
  type?: LensType;
  index?: LensIndex;
  mrp?: number;
  offerPrice?: number;
  addOnPrice?: number | null;
  sphMin?: number;
  sphMax?: number;
  cylMax?: number;
  addMin?: number | null;
  addMax?: number | null;
  yopoEligible?: boolean;
  isActive?: boolean;
}

