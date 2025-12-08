# Offer Engine Frontend Development Guide

## Overview

Complete frontend implementation for LensTrack Offer Engine V2, supporting YOPO, Combo, Free Lens V2, Percent, Flat, BOG50, Category Discount, Bonus Product, and Dynamic Upsell Engine (DUE).

## Components Created

### 1. **CartContext** (`contexts/CartContext.tsx`)
- Manages cart items with frame + lens combinations
- Auto-calculates offers on add/update
- Provides `totalSavings` and `totalPayable`
- Usage:
```tsx
import { CartProvider, useCart } from '@/contexts/CartContext';

// Wrap your app
<CartProvider>
  <YourApp />
</CartProvider>

// Use in components
const { items, addItem, removeItem, calculateOffers } = useCart();
```

### 2. **OfferEngineResultRenderer** (`components/offer-engine/OfferEngineResultRenderer.tsx`)
- Displays all applied offers with savings
- Formats offer descriptions (YOPO, Free Lens, BOG50, etc.)
- Shows total savings summary
- Usage:
```tsx
import { OfferEngineResultRenderer } from '@/components/offer-engine/OfferEngineResultRenderer';

<OfferEngineResultRenderer 
  result={offerResult} 
  showBreakdown={true} 
/>
```

### 3. **UpsellEngineUI** (`components/offer-engine/UpsellEngineUI.tsx`)
- Dynamic upsell banner with 3 placement options:
  - `top`: Sticky top banner
  - `bottom`: Sticky bottom CTA bar (default)
  - `toast`: Swiggy-style popup
- Shows progress bar and "Shop More" CTA
- Usage:
```tsx
import { UpsellEngineUI } from '@/components/offer-engine/UpsellEngineUI';

{result.upsell && (
  <UpsellEngineUI
    upsell={result.upsell}
    placement="bottom"
    onShopMore={() => router.push('/products')}
    onDismiss={() => {}}
  />
)}
```

### 4. **OfferBreakdownPanel** (`components/offer-engine/OfferBreakdownPanel.tsx`)
- Complete price breakdown with line items
- Shows base prices, discounts, and final payable
- Includes upsell banner if available
- Usage:
```tsx
import { OfferBreakdownPanel } from '@/components/offer-engine/OfferBreakdownPanel';

<OfferBreakdownPanel 
  result={offerResult} 
  showUpsell={true} 
/>
```

### 5. **OfferEngineIntegration** (`components/offer-engine/OfferEngineIntegration.tsx`)
- All-in-one component combining all above
- Easy integration for Lens Advisor and POS
- Usage:
```tsx
import { OfferEngineIntegration } from '@/components/offer-engine/OfferEngineIntegration';

<OfferEngineIntegration
  result={offerResult}
  upsellPlacement="bottom"
  onShopMore={() => {}}
  showBreakdown={true}
  showUpsell={true}
/>
```

## Integration Examples

### Example 1: Lens Advisor Integration

```tsx
'use client';

import { useState, useEffect } from 'react';
import { OfferEngineIntegration } from '@/components/offer-engine/OfferEngineIntegration';
import { OfferCalculationResult } from '@/types/offer-engine';

export function LensAdvisorOfferView() {
  const [offerResult, setOfferResult] = useState<OfferCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateOffers = async (frame: any, lens: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/offers/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame,
          lens,
          organizationId: 'your-org-id',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setOfferResult(data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!offerResult) {
    return <div>Select frame and lens to see offers</div>;
  }

  return (
    <div className="space-y-4">
      <OfferEngineIntegration
        result={offerResult}
        upsellPlacement="bottom"
        onShopMore={() => {
          // Navigate to product browsing
          router.push('/lens-advisor');
        }}
      />
    </div>
  );
}
```

### Example 2: Recommendations Page Integration

```tsx
'use client';

import { OfferBreakdownPanel } from '@/components/offer-engine/OfferBreakdownPanel';
import { UpsellEngineUI } from '@/components/offer-engine/UpsellEngineUI';

export function RecommendationOfferSection({ offerResult }) {
  return (
    <div className="space-y-4">
      {/* Price Breakdown */}
      <OfferBreakdownPanel result={offerResult} />
      
      {/* Upsell Banner */}
      {offerResult.upsell && (
        <UpsellEngineUI
          upsell={offerResult.upsell}
          placement="toast"
          onShopMore={() => {
            // Show more products
          }}
        />
      )}
    </div>
  );
}
```

### Example 3: POS Billing Integration

```tsx
'use client';

import { CartProvider, useCart } from '@/contexts/CartContext';
import { OfferEngineResultRenderer } from '@/components/offer-engine/OfferEngineResultRenderer';

function POSBilling() {
  const { items, totalPayable, totalSavings } = useCart();

  return (
    <div>
      <h2>Cart Summary</h2>
      {items.map(item => (
        <div key={item.id}>
          {item.offerResult && (
            <OfferEngineResultRenderer result={item.offerResult} />
          )}
        </div>
      ))}
      <div>
        <p>Total Savings: ₹{totalSavings}</p>
        <p>Total Payable: ₹{totalPayable}</p>
      </div>
    </div>
  );
}

// Wrap with CartProvider
export default function POSPage() {
  return (
    <CartProvider>
      <POSBilling />
    </CartProvider>
  );
}
```

## Offer Display Rules

### YOPO
- Display: "YOPO Applied: Paying higher value → ₹XXXX"
- Icon: Award icon
- Color: Green badge

### Free Lens (V2)
- Fully free: "Free Lens: BlueXpert FREE (Saved ₹999)"
- Partially free: "DIGI360 Upgrade: Pay difference ₹3300"
- Icon: Gift icon

### BOG50
- Display: "BOG50 Applied: 50% OFF second frame (Saved ₹600)"
- Icon: Tag icon

### Bonus Free Product
- Display: "Bonus Free Product: Frame worth ₹999 FREE"
- Icon: Gift icon

### Category Discount
- Display: "Student Discount: -₹300 (ID verified)"
- Icon: Percent icon

## Upsell Engine Logic

The backend returns upsell data in this format:
```typescript
{
  upsell: {
    type: "BONUS_FREE_PRODUCT",
    message: "Add ₹500 more to unlock FREE Sunglasses worth ₹1499",
    rewardText: "FREE Sunglasses worth ₹1499",
    remaining: 500
  }
}
```

Frontend simply renders this data. No calculation needed.

## Error Handling

Components handle these cases:
- No offers → Shows "Standard Pricing"
- Backend error → Shows "Unable to calculate offer. Try again."
- Invalid cart → Highlights invalid items

## Next Steps

1. **Backend Integration**: Ensure `/api/offers/calculate` returns `upsell` field
2. **Update Recommendations Page**: Replace existing offer display with new components
3. **Update Lens Advisor**: Integrate `OfferEngineIntegration` component
4. **POS Integration**: Use `CartProvider` for billing flow

## Files Created

- ✅ `contexts/CartContext.tsx` - Cart state management
- ✅ `components/offer-engine/OfferEngineResultRenderer.tsx` - Offer display
- ✅ `components/offer-engine/UpsellEngineUI.tsx` - Upsell banners
- ✅ `components/offer-engine/OfferBreakdownPanel.tsx` - Price breakdown
- ✅ `components/offer-engine/OfferEngineIntegration.tsx` - All-in-one component
- ✅ `components/ui/Separator.tsx` - UI utility
- ✅ `types/offer-engine.ts` - Updated with UpsellSuggestion type

## Testing Checklist

- [ ] Cart Context adds/removes items correctly
- [ ] Offers calculate automatically on cart update
- [ ] YOPO displays correctly
- [ ] Free Lens displays correctly
- [ ] BOG50 displays correctly
- [ ] Category discounts display correctly
- [ ] Upsell banner shows when threshold not met
- [ ] Upsell banner hides when threshold met
- [ ] "Shop More" button navigates correctly
- [ ] Price breakdown shows all components
- [ ] Total savings calculated correctly
- [ ] Error states handled gracefully

