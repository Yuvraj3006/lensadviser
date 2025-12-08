# 🛠️ DETAILED IMPLEMENTATION PLAN
## Step-by-Step Changes Required

---

## PHASE 1: DATABASE SCHEMA UPDATES

### 1.1 Add Order Model to `prisma/schema.prisma`

```prisma
enum SalesMode {
  SELF_SERVICE
  STAFF_ASSISTED
}

enum OrderStatus {
  DRAFT
  CUSTOMER_CONFIRMED
  STORE_ACCEPTED
  PRINTED
  PUSHED_TO_LAB
}

enum StaffRole {
  STORE_MANAGER
  NC
  JR
  OPTOMETRIST
  SALES
}

model Order {
  id                String      @id @default(auto()) @map("_id") @db.ObjectId
  storeId           String      @db.ObjectId
  salesMode         SalesMode
  assistedByStaffId String?     @db.ObjectId
  assistedByName    String?
  customerName      String?
  customerPhone     String?
  frameData         Json        // { brand, subCategory, mrp, frameType, material }
  lensData          Json        // { itCode, name, brandLine, price, index, visionType }
  offerData         Json        // Complete offer calculation result
  finalPrice        Float
  status            OrderStatus @default(DRAFT)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  store Store @relation(fields: [storeId], references: [id])
  staff Staff? @relation(fields: [assistedByStaffId], references: [id])

  @@index([storeId])
  @@index([status])
  @@index([createdAt])
  @@index([assistedByStaffId])
}

model Staff {
  id        String     @id @default(auto()) @map("_id") @db.ObjectId
  storeId   String     @db.ObjectId
  name      String
  phone     String?
  role      StaffRole
  status    String     @default("ACTIVE") // ACTIVE | INACTIVE
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  store Store @relation(fields: [storeId], references: [id])
  orders Order[]

  @@index([storeId])
  @@index([status])
}

// Update Store model
model Store {
  // ... existing fields
  qrCodeUrl String?  // Add this field
  staff    Staff[]  // Add this relation
  orders   Order[]  // Add this relation
}
```

**Action:** Update `prisma/schema.prisma` and run `npx prisma db push`

---

## PHASE 2: ROUTING RESTRUCTURE

### 2.1 Create `/app/start/page.tsx` (Language Selection)

**New File:**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store'; // NEW store

export default function StartPage() {
  const router = useRouter();
  const setLanguage = useSessionStore((state) => state.setLanguage);
  const setStoreId = useSessionStore((state) => state.setStoreId);
  const setSalesMode = useSessionStore((state) => state.setSalesMode);

  // Check for QR code params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeId = params.get('store');
    const qrCode = params.get('qr');
    
    if (storeId) {
      setStoreId(storeId);
      setSalesMode('SELF_SERVICE');
    }
  }, []);

  const handleLanguageSelect = (lang: 'en' | 'hi' | 'hinglish') => {
    setLanguage(lang);
    router.push('/rx');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* WF-01 Layout */}
      <div>
        <h1>Choose Your Language</h1>
        <button onClick={() => handleLanguageSelect('en')}>English</button>
        <button onClick={() => handleLanguageSelect('hi')}>हिंदी</button>
        <button onClick={() => handleLanguageSelect('hinglish')}>Hinglish</button>
      </div>
    </div>
  );
}
```

### 2.2 Create `/app/rx/page.tsx` (Prescription Entry)

**Move from:** `components/lens-advisor/PrescriptionForm.tsx`  
**Action:** Extract component logic into page component

### 2.3 Create `/app/frame/page.tsx` (Frame Entry)

**Move from:** `components/lens-advisor/FrameEntryForm.tsx`  
**Action:** Extract component logic into page component

### 2.4 Create `/app/questions/page.tsx` (Questionnaire)

**Move from:** `components/lens-advisor/QuestionnaireWizard.tsx`  
**Action:** Extract component logic into page component

### 2.5 Create `/app/recommend/page.tsx` (4-Lens Recommendations)

**New Implementation:**
- Must show exactly 4 lenses
- Roles: BEST_MATCH, RECOMMENDED_INDEX, PREMIUM, BUDGET
- "View All Lenses" button opens modal

### 2.6 Create `/app/view-all/page.tsx` (View All Modal)

**New Implementation:**
- Modal/popup overlay
- Sorting dropdown
- Thickness warnings
- Select button

### 2.7 Create `/app/offer-summary/page.tsx` (Offer Summary)

**Move from:** `components/lens-advisor/OfferCalculatorView.tsx`  
**Action:** Extract component logic into page component

### 2.8 Create `/app/checkout/page.tsx` (Checkout)

**New Implementation:**
- Customer details (optional)
- Staff selection (optional for SELF_SERVICE, mandatory for STAFF_ASSISTED)
- Calls `POST /api/order/create`

### 2.9 Create `/app/order-success/page.tsx` (Order Success)

**New Implementation:**
- Shows order ID, summary
- "New Customer" button

---

## PHASE 3: STATE MANAGEMENT

### 3.1 Create `/stores/session-store.ts` (NEW)

```typescript
import { create } from 'zustand';

interface SessionState {
  language: 'en' | 'hi' | 'hinglish' | null;
  storeId: string | null;
  salesMode: 'SELF_SERVICE' | 'STAFF_ASSISTED' | null;
  staffId: string | null;
  staffList: Staff[];
  
  setLanguage: (lang: 'en' | 'hi' | 'hinglish') => void;
  setStoreId: (id: string) => void;
  setSalesMode: (mode: 'SELF_SERVICE' | 'STAFF_ASSISTED') => void;
  setStaffId: (id: string | null) => void;
  setStaffList: (list: Staff[]) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  language: null,
  storeId: null,
  salesMode: null,
  staffId: null,
  staffList: [],
  
  setLanguage: (lang) => set({ language: lang }),
  setStoreId: (id) => set({ storeId: id }),
  setSalesMode: (mode) => set({ salesMode: mode }),
  setStaffId: (id) => set({ staffId: id }),
  setStaffList: (list) => set({ staffList: list }),
  reset: () => set({
    language: null,
    storeId: null,
    salesMode: null,
    staffId: null,
    staffList: [],
  }),
}));
```

### 3.2 Update `/stores/lens-advisor-store.ts`

**Add missing fields:**
- No changes needed (already has rx, frame, answers, etc.)

---

## PHASE 4: API ENDPOINTS

### 4.1 Create `/app/api/order/create/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const createOrderSchema = z.object({
  storeId: z.string(),
  salesMode: z.enum(['SELF_SERVICE', 'STAFF_ASSISTED']),
  assistedByStaffId: z.string().nullable().optional(),
  assistedByName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  frameData: z.any(),
  lensData: z.any(),
  offerData: z.any(),
  finalPrice: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const order = await prisma.order.create({
      data: {
        storeId: validated.storeId,
        salesMode: validated.salesMode,
        assistedByStaffId: validated.assistedByStaffId || null,
        assistedByName: validated.assistedByName || null,
        customerName: validated.customerName || null,
        customerPhone: validated.customerPhone || null,
        frameData: validated.frameData,
        lensData: validated.lensData,
        offerData: validated.offerData,
        finalPrice: validated.finalPrice,
        status: 'DRAFT',
      },
    });

    return Response.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 4.2 Create `/app/api/order/confirm/route.ts`

```typescript
// Updates order status to CUSTOMER_CONFIRMED
```

### 4.3 Create `/app/api/order/store-accept/route.ts`

```typescript
// Updates order status to STORE_ACCEPTED
```

### 4.4 Create `/app/api/order/print/route.ts`

```typescript
// Updates order status to PRINTED
```

### 4.5 Create `/app/api/order/push-to-lab/route.ts`

```typescript
// Updates order status to PUSHED_TO_LAB
```

### 4.6 Create `/app/api/store/[id]/staff/route.ts`

```typescript
// GET /api/store/{id}/staff
// Returns list of active staff for a store
```

---

## PHASE 5: RECOMMENDATION ENGINE UPDATES

### 5.1 Update Recommendation Logic to Always Return 4 Lenses

**File:** `services/benefit-recommendation.service.ts` or wherever recommendations are generated

**Required Logic:**
```typescript
function selectFourLenses(products: ScoredProduct[], recommendedIndex: string): LensOption[] {
  // 1. Best Match (highest score)
  const bestMatch = products[0];
  
  // 2. Recommended Index (matches recommendedIndex)
  const recommendedIndexLens = products.find(p => p.lensIndex === recommendedIndex) || products[1];
  
  // 3. Premium Upgrade (score > 100% or highest premium option)
  const premium = products.find(p => p.matchPercent > 100) || products[2];
  
  // 4. Budget (lowest safe option)
  const budget = products[products.length - 1];
  
  return [
    { ...bestMatch, roleTag: 'BEST_MATCH' },
    { ...recommendedIndexLens, roleTag: 'RECOMMENDED_INDEX' },
    { ...premium, roleTag: 'PREMIUM' },
    { ...budget, roleTag: 'BUDGET' },
  ];
}
```

---

## PHASE 6: UI COMPONENTS

### 6.1 Create `/components/lens-advisor/ViewAllLensModal.tsx`

```typescript
interface ViewAllLensModalProps {
  open: boolean;
  onClose: () => void;
  lenses: LensOption[];
  onSelect: (lens: LensOption) => void;
  recommendedIndex: string;
}

export function ViewAllLensModal({ open, onClose, lenses, onSelect, recommendedIndex }: ViewAllLensModalProps) {
  const [sortBy, setSortBy] = useState<'PRICE_HIGH' | 'PRICE_LOW' | 'MATCH_HIGH' | 'INDEX_THIN');
  
  // Sorting logic
  // Thickness warnings
  // Select handler
  
  return (
    <Modal open={open} onClose={onClose}>
      {/* WF-06 Layout */}
    </Modal>
  );
}
```

### 6.2 Create `/components/checkout/CheckoutForm.tsx`

```typescript
interface CheckoutFormProps {
  salesMode: 'SELF_SERVICE' | 'STAFF_ASSISTED';
  storeId: string;
  staffList: Staff[];
  defaultStaffId?: string;
}

export function CheckoutForm({ salesMode, storeId, staffList, defaultStaffId }: CheckoutFormProps) {
  // Customer details (optional)
  // Staff selection (optional/mandatory based on salesMode)
  // Submit handler calls POST /api/order/create
}
```

### 6.3 Create `/components/order/OrderSuccess.tsx`

```typescript
interface OrderSuccessProps {
  orderId: string;
  storeName: string;
  frameData: any;
  lensData: any;
  finalPrice: number;
}

export function OrderSuccess({ orderId, storeName, frameData, lensData, finalPrice }: OrderSuccessProps) {
  // WF-10 Layout
}
```

---

## PHASE 7: LANGUAGE SYSTEM (i18n)

### 7.1 Create `/lib/i18n.ts`

```typescript
const translations = {
  en: {
    BEST_MATCH: 'Best Match',
    CHECKOUT: 'Checkout',
    // ... all UI strings
  },
  hi: {
    BEST_MATCH: 'सबसे बेहतर विकल्प',
    // ... Hindi translations
  },
  hinglish: {
    BEST_MATCH: 'Best Match (सबसे सही)',
    // ... Hinglish translations
  },
};

export function t(key: string, lang: 'en' | 'hi' | 'hinglish' = 'en'): string {
  return translations[lang][key] || translations.en[key] || key;
}
```

### 7.2 Update All Components to Use `t()`

**Action:** Replace all hardcoded strings with `t()` calls

---

## PHASE 8: QR CODE INTEGRATION

### 8.1 Add QR Code Generation

**File:** `/app/api/store/[id]/qr/route.ts` (or similar)

```typescript
// Generate QR code URL for store
// Returns: { qrCodeUrl: 'https://...' }
```

### 8.2 Update Store Verification to Handle QR

**File:** `/app/questionnaire/page.tsx` or `/app/start/page.tsx`

```typescript
// Check for QR code in URL
// Auto-populate store context
```

---

## PHASE 9: POS DASHBOARD

### 9.1 Create `/app/pos/orders/page.tsx`

```typescript
// Shows list of orders
// Filter by status
// Actions: View, Print, Push to Lab
// WF-11 Layout
```

---

## 📋 FILE CHANGES CHECKLIST

### **New Files to Create:**
- [ ] `app/start/page.tsx`
- [ ] `app/rx/page.tsx`
- [ ] `app/frame/page.tsx`
- [ ] `app/questions/page.tsx`
- [ ] `app/recommend/page.tsx`
- [ ] `app/view-all/page.tsx`
- [ ] `app/offer-summary/page.tsx`
- [ ] `app/checkout/page.tsx`
- [ ] `app/order-success/page.tsx`
- [ ] `app/pos/orders/page.tsx`
- [ ] `stores/session-store.ts`
- [ ] `lib/i18n.ts`
- [ ] `components/lens-advisor/ViewAllLensModal.tsx`
- [ ] `components/checkout/CheckoutForm.tsx`
- [ ] `components/order/OrderSuccess.tsx`
- [ ] `app/api/order/create/route.ts`
- [ ] `app/api/order/confirm/route.ts`
- [ ] `app/api/order/store-accept/route.ts`
- [ ] `app/api/order/print/route.ts`
- [ ] `app/api/order/push-to-lab/route.ts`
- [ ] `app/api/store/[id]/staff/route.ts`

### **Files to Update:**
- [ ] `prisma/schema.prisma` (add Order, Staff models, enums)
- [ ] `stores/lens-advisor-store.ts` (verify all fields)
- [ ] `services/benefit-recommendation.service.ts` (4-lens logic)
- [ ] All component files (add i18n)

### **Files to Deprecate/Migrate:**
- [ ] `app/questionnaire/page.tsx` (migrate to `/start`)
- [ ] `app/questionnaire/[sessionId]/page.tsx` (migrate to `/questions`)
- [ ] `app/questionnaire/[sessionId]/recommendations/page.tsx` (migrate to `/recommend`)

---

## 🎯 PRIORITY ORDER

1. **Database Schema** (Foundation)
2. **Session Store** (State management)
3. **Routing Structure** (Page organization)
4. **4-Lens Logic** (Core feature)
5. **Order System** (Critical functionality)
6. **Language System** (UX enhancement)
7. **QR Integration** (Convenience)
8. **POS Dashboard** (Staff tool)

---

**END OF IMPLEMENTATION PLAN**

