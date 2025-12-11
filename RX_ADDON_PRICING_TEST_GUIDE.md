# RX Add-On Pricing Feature - Testing Guide

## ✅ Database Setup Complete
- Schema pushed successfully
- `LensPowerAddOnPricing` collection created
- Indexes created

## 🧪 Testing Steps

### 1. Admin Panel - Create Add-On Bands

1. **Navigate to Admin Lens Detail Page**
   - Go to `/admin/lenses/[lensId]` (replace with actual lens ID)
   - Or create a new lens first at `/admin/lenses/new`

2. **Access RX Add-On Pricing Tab**
   - Click on the "RX Add-On Pricing" tab (with DollarSign icon)
   - You should see an empty state or existing bands

3. **Create Test Bands**

   **Band 1: High Power SPH + CYL**
   - SPH Min: `-8.00`
   - SPH Max: `-10.00`
   - CYL Min: `-2.00`
   - CYL Max: `-4.00`
   - ADD Min: (leave empty for ANY)
   - ADD Max: (leave empty for ANY)
   - Extra Charge: `1000`

   **Band 2: Medium Power SPH**
   - SPH Min: `-6.00`
   - SPH Max: `-8.00`
   - CYL Min: `0.00`
   - CYL Max: `-2.00`
   - ADD Min: (leave empty)
   - ADD Max: (leave empty)
   - Extra Charge: `500`

   **Band 3: ADD Range**
   - SPH Min: (leave empty for ANY)
   - SPH Max: (leave empty for ANY)
   - CYL Min: (leave empty for ANY)
   - CYL Max: (leave empty for ANY)
   - ADD Min: `+2.00`
   - ADD Max: `+3.00`
   - Extra Charge: `400`

4. **Test Edit/Delete**
   - Click "Delete" on a band to remove it
   - Edit values in existing bands to verify updates work

### 2. Test Prescription Combinations

#### Test Case 1: High Power Match
**Prescription:**
- Right Eye: SPH -9.00, CYL -3.00
- Left Eye: SPH -8.50, CYL -2.50
- ADD: (none)

**Expected Result:**
- Should match Band 1 (SPH -8 to -10, CYL -2 to -4)
- Extra Charge: ₹1000

#### Test Case 2: Medium Power Match
**Prescription:**
- Right Eye: SPH -7.00, CYL -1.00
- Left Eye: SPH -6.50, CYL -0.50
- ADD: (none)

**Expected Result:**
- Should match Band 2 (SPH -6 to -8, CYL 0 to -2)
- Extra Charge: ₹500

#### Test Case 3: ADD Match
**Prescription:**
- Right Eye: SPH -2.00, CYL -0.50
- Left Eye: SPH -1.50, CYL -0.25
- ADD: +2.50

**Expected Result:**
- Should match Band 3 (ADD +2.00 to +3.00)
- Extra Charge: ₹400

#### Test Case 4: Multiple Matches (Stacking Policy Test)
**Prescription:**
- Right Eye: SPH -9.00, CYL -3.00
- Left Eye: SPH -8.50, CYL -2.50
- ADD: +2.50

**Expected Result (HIGHEST_ONLY policy):**
- Should match Band 1 (₹1000) and Band 3 (₹400)
- Should apply only the highest: ₹1000

**Note:** To test SUM_ALL policy, update `rx-addon-pricing.service.ts` line 30:
```typescript
stackingPolicy: 'SUM_ALL' // Change from 'HIGHEST_ONLY'
```

#### Test Case 5: No Match
**Prescription:**
- Right Eye: SPH -3.00, CYL -0.50
- Left Eye: SPH -2.50, CYL -0.25
- ADD: (none)

**Expected Result:**
- No matching bands
- Extra Charge: ₹0

### 3. Test in Recommendation Flow

1. **Start Questionnaire**
   - Go to `/questionnaire/prescription`
   - Enter one of the test prescriptions above
   - Proceed to frame selection
   - Select a frame
   - Select a lens that has add-on bands configured

2. **Check Recommendations Page**
   - Navigate to `/questionnaire/[sessionId]/recommendations`
   - Select the lens with add-on pricing
   - Check price breakdown - should show RX add-on charges

3. **Check Offer Summary**
   - Navigate to `/questionnaire/[sessionId]/offer-summary/[productId]`
   - Verify RX add-on charges are displayed in price breakdown

### 4. Test Order Creation & Slip

1. **Create Order**
   - Complete checkout flow
   - Create order with prescription that matches add-on bands

2. **Verify Order Slip**
   - Go to `/questionnaire/[sessionId]/order-success/[orderId]`
   - Check receipt/order slip
   - Should display:
     ```
     Lens Price: ₹1299
     High Power Add-On: +₹1000  (or matching band label)
     -----------------------------------
     Subtotal: ₹2299
     ```
   - RX add-on charges should appear BEFORE subtotal
   - Charges should NOT be discounted

### 5. Verify Non-Discountable Behavior

1. **Apply Discounts**
   - Use a coupon code
   - Apply category discount
   - Verify RX add-on charges remain unchanged

2. **Check Final Price**
   - Discounts should apply to: Base Price + Tint + Mirror
   - RX add-on charges added AFTER discounts
   - Formula: `finalPayable = (basePrice + tint + mirror - discounts) + rxAddOn`

## 🔍 Verification Checklist

- [ ] Admin panel tab appears and loads correctly
- [ ] Can create new add-on bands
- [ ] Can edit existing bands
- [ ] Can delete bands
- [ ] Prescription matching works correctly
- [ ] Stacking policy (HIGHEST_ONLY) works
- [ ] RX add-on charges appear in price breakdown
- [ ] Charges are non-discountable
- [ ] Order slip displays breakdown correctly
- [ ] Order data includes `rxAddOnBreakdown` and `totalRxAddOn`

## 🐛 Common Issues & Solutions

### Issue: Tab not appearing
**Solution:** Check if lens is saved first (new lenses need to be saved before adding bands)

### Issue: Bands not matching
**Solution:** 
- Verify prescription data is being passed correctly
- Check worse eye calculation (should use highest absolute SPH/CYL)
- Verify band ranges are correct (null = ANY)

### Issue: Charges not showing in order slip
**Solution:**
- Check if `rxAddOnBreakdown` is included in `lensData` when creating order
- Verify order slip template reads from `order.lensData.rxAddOnBreakdown`

### Issue: Charges being discounted
**Solution:**
- Verify offer engine adds RX add-on AFTER discount calculation
- Check that `totalRxAddOn` is added to `finalPayable` separately

## 📊 Business Confirmation Required

**Stacking Policy Decision:**
- **Option A: HIGHEST_ONLY** (Currently implemented)
  - If multiple bands match, apply only the highest charge
  - Example: Band 1 (₹1000) + Band 3 (₹400) = ₹1000 only
  
- **Option B: SUM_ALL**
  - If multiple bands match, sum all charges
  - Example: Band 1 (₹1000) + Band 3 (₹400) = ₹1400

**To change policy:**
1. Update `services/rx-addon-pricing.service.ts` line 30
2. Change `'HIGHEST_ONLY'` to `'SUM_ALL'`
3. Test with multiple matching bands

## 📝 Test Data Examples

### Lens Product Setup
- Create a lens product (e.g., "Premium BlueXpert 1.60")
- Add the test bands above
- Use this lens in testing

### Prescription Test Data
```json
{
  "rSph": -9.00,
  "rCyl": -3.00,
  "lSph": -8.50,
  "lCyl": -2.50,
  "add": null
}
```

## ✅ Success Criteria

1. ✅ Admin can create/edit/delete add-on bands
2. ✅ Matching logic works for all test cases
3. ✅ Charges appear in price breakdown
4. ✅ Charges are non-discountable
5. ✅ Order slip displays correctly
6. ✅ Order data includes complete breakdown

---

**Last Updated:** After implementation completion
**Status:** Ready for Testing
