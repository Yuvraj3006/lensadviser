# Lens Creation Guide - `/admin/lenses/new`

## Overview

The lens creation page is now fully functional with proper save API integration.

## How to Create a Lens

### Step 1: Navigate
Go to: `http://localhost:3000/admin/lenses/new`

### Step 2: Fill Required Fields

**General Tab (Basic Information):**
1. **IT Code*** - Unique identifier (e.g., `DIGI360-ADV-001`)
2. **Name*** - Lens product name (e.g., `Digi360 Advanced Single Vision`)
3. **Brand Line** - Select from dropdown (e.g., `DIGI360_ADVANCED`)
4. **Index** - Lens index (e.g., `1.56`, `1.60`, `1.67`)
5. **Offer Price (₹)*** - Lens price (e.g., `4500`)
6. **YOPO Eligible** - Checkbox (check if eligible for YOPO offers)

### Step 3: Save
Click "Save Lens" button at the top right.

### Step 4: Additional Tabs (Optional - after creation)

Navigate to created lens (`/admin/lenses/[id]`) to edit:
- **Specifications** - Add lens specifications
- **Features** - Map features to the lens
- **Benefits** - Assign benefit scores
- **Answer Boosts** - Configure answer-based scoring

## API Integration

**Create Lens:** `POST /api/admin/products`

**Payload:**
```json
{
  "sku": "DIGI360-ADV-001",
  "itCode": "DIGI360-ADV-001",
  "name": "Digi360 Advanced Single Vision",
  "brandLine": "DIGI360_ADVANCED",
  "subCategory": "1.56",
  "basePrice": 4500,
  "yopoEligible": true,
  "category": "EYEGLASSES",
  "description": "Digi360 Advanced Single Vision - DIGI360_ADVANCED",
  "imageUrl": "/images/lens-placeholder.jpg",
  "isActive": true,
  "organizationId": "..."
}
```

**Update Lens:** `PUT /api/admin/products/[id]`

## Implementation Details

### File: `/app/admin/lenses/[id]/page.tsx`

**Key Functions:**
- `handleSave()` - Saves or creates lens via Products API
- `fetchLens()` - Loads lens details for editing
- `setLens()` - Initializes empty lens for new creation

**State Management:**
- Creates empty lens object when `lensId === 'new'`
- Validates required fields before save
- Shows success/error toasts
- Redirects to `/admin/lenses` after successful save

### Validation Rules:
- ✅ IT Code required
- ✅ Name required
- ✅ Price must be > 0
- ✅ Organization ID must be set

## Example: Creating a Test Lens

```
1. IT Code: DIGI360-TEST-001
2. Name: Digi360 Advanced Test Lens
3. Brand Line: DIGI360_ADVANCED
4. Index: 1.56
5. Offer Price: 4500
6. YOPO Eligible: ✓ (checked)
7. Click "Save Lens"
```

**Expected Result:**
- Success toast: "Lens created successfully"
- Redirect to `/admin/lenses` list page
- New lens appears in table

## Status

✅ Lens creation form fully functional
✅ Save API implemented
✅ Validation working
✅ Proper error handling
✅ Toast notifications
✅ Redirect after save

**Ready for use!**

