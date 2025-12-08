# Product Types Refactor - Implementation Plan

## ✅ Completed

1. ✅ Prisma Schema:
   - Added `RetailProductType` enum (FRAME, SUNGLASS, CONTACT_LENS, ACCESSORY)
   - Created `ProductBrand` model (generic, not frame-specific)
   - Created `ProductSubBrand` model
   - Created `RetailProduct` model
   - Database migration completed

2. ✅ API Endpoints:
   - `GET /api/admin/brands` - List all brands
   - `POST /api/admin/brands` - Create brand
   - `POST /api/admin/brands/:id/subbrands` - Create sub-brand
   - `GET /api/admin/products?type=FRAME` - List products by type
   - `POST /api/admin/products` - Create retail product

## 🔄 In Progress

3. Frontend Refactor:
   - Update Products page with tabs
   - Update brands section to use generic API
   - Add product listing by type
   - Update product creation modal

## 📋 Next Steps

1. Update Products page:
   - Add product type tabs (Frames, Sunglasses, Contact Lenses)
   - Update brands fetch to use `/api/admin/brands`
   - Add products listing section
   - Update product creation modal

2. Update Offer Engine:
   - Use `RetailProduct.type` for YOPO (FRAME only)
   - Use `RetailProduct.type` for Free Sunglass promotions
   - Use `RetailProduct.type` for Contact Lens discounts

