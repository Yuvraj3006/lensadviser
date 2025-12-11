# Contact Lens Power Conversion - Updated Logic (V2)

## ✅ Implementation Complete

### Updated Conversion Rules

#### A. Spherical vs Toric Decision
- **If |CYL| < 0.75** → Spherical lens (use Spherical Equivalent if CYL > 0)
- **If |CYL| ≥ 0.75** → Toric lens (keep cylinder, convert sphere only)

#### B. Spherical Equivalent (for non-toric)
- **SE = SPH + (CYL / 2)**
- **CYL_CL = 0**
- **AXIS_CL = null**

**Example:**
- Spec: -3.00 / -0.50 × 180
- SE = -3.00 + (-0.50/2) = -3.25
- CL: -3.25 DS (no cylinder, no axis)

#### C. Vertex Conversion (spectacle → CL)
- **If |SPH| < 4.00 D** → no vertex conversion (CL = spectacle power)
- **If |SPH| ≥ 4.00 D** → use formula: **F_cl = F_s / (1 - 0.012 * F_s)**
- Always round CL sphere to nearest 0.25 D

**Examples:**
1. **-6.00 D sphere**
   - F_cl = -6 / (1 - 0.012 * -6) = -6 / 1.072 ≈ -5.60
   - CL sphere = -5.50 (rounded)

2. **+6.00 D sphere**
   - F_cl = +6 / (1 - 0.012 * +6) = +6 / 0.928 ≈ +6.47
   - CL sphere = +6.50 (rounded)

3. **-3.00 D sphere**
   - |SPH| < 4.00, so no vertex conversion
   - CL sphere = -3.00

#### D. Toric Logic (SPH/CYL/AXIS)
If |CYL| ≥ 0.75 (toric):
1. **Do NOT convert cylinder** (keep CYL same in spectacle and CL)
2. **Vertex-convert sphere only** (if |SPH| ≥ 4.00)
3. **Keep AXIS same** (later snap to nearest product axis)

**Example:**
- Spec: OD: -6.00 / -2.00 × 180
- Steps:
  1. Toric (|−2.00| ≥ 0.75) ✓
  2. Vertex convert sphere: -6 → -5.50
  3. Keep CYL = -2.00
  4. Keep AXIS = 180
- **Output:** OD: -5.50 / -2.00 × 180

#### E. Multifocal (ADD) Logic
1. **Do NOT vertex-convert ADD** – effect is negligible
2. Convert sphere/cyl exactly as above (spherical or toric)
3. Map spectacle ADD to CL ADD discrete values:

**Mapping:**
- **0.75–1.50** → +1.25 (LOW)
- **1.75–2.00** → +1.75 (MEDIUM)
- **2.00–2.25** → +2.25 (MEDIUM)
- **2.50+** → +2.75 (HIGH)

**Example:**
- Spec: OD: -6.00 / -2.00 × 180 ADD +2.00
- Conversion:
  - Sphere: -6 → -5.50 (vertex)
  - Cylinder: -2.00 (keep)
  - Axis: 180 (keep)
  - ADD: +2.00 → +1.75 (MEDIUM)
- **Output:** OD: -5.50 / -2.00 × 180 ADD +1.75 (MEDIUM)

## 📋 Test Cases

### Test Case 1: Spherical Equivalent
**Input:**
- OD: -3.00 / -0.50 × 180

**Expected:**
- SE = -3.00 + (-0.50/2) = -3.25
- CL: -3.25 DS (no vertex, |SPH| < 4.00)

### Test Case 2: Toric with Vertex
**Input:**
- OD: -6.00 / -2.00 × 180

**Expected:**
- Toric: ✓ (|CYL| ≥ 0.75)
- Sphere: -6 → -5.50 (vertex)
- Cylinder: -2.00 (keep)
- Axis: 180 (keep)
- CL: -5.50 / -2.00 × 180

### Test Case 3: High Power Spherical
**Input:**
- OS: -8.00 sphere

**Expected:**
- Sphere: -8 → -7.25 (vertex, |SPH| ≥ 4.00)
- CL: -7.25 DS

### Test Case 4: Multifocal
**Input:**
- OD: -4.50 sphere ADD +2.00

**Expected:**
- Sphere: -4.50 → -4.25 (vertex)
- ADD: +2.00 → +1.75 (MEDIUM)
- CL: -4.25 DS ADD +1.75 (MEDIUM)

### Test Case 5: Low Power (No Vertex)
**Input:**
- OS: -2.00 / -0.25 × 90

**Expected:**
- SE = -2.00 + (-0.25/2) = -2.125 → -2.25
- No vertex (|SPH| < 4.00)
- CL: -2.25 DS

## 🔧 Implementation Details

### Key Functions

1. **`isToric(cyl)`** - Returns true if |CYL| ≥ 0.75
2. **`useSphericalEquivalent(cyl)`** - Returns true if 0 < |CYL| ≤ 0.50
3. **`vertexConvertSphere(sph)`** - Applies vertex formula only if |SPH| ≥ 4.00
4. **`mapMultifocalAdd(add)`** - Maps ADD to discrete values and categories
5. **`convertEyeToContactLens(eye)`** - Main conversion function per eye

### Response Format

```typescript
{
  success: true,
  data: {
    contactLensPower: {
      od: { sphere, cylinder, axis, add },
      os: { sphere, cylinder, axis, add }
    },
    formatted: {
      od: "-5.50 / -2.00 × 180 ADD +1.75 (MEDIUM)",
      os: "-4.25 DS ADD +2.75 (HIGH)"
    },
    conversionDetails: {
      vertexConversionApplied: { od: true, os: true },
      conversionInfo: {
        od: {
          isToric: true,
          usedSphericalEquivalent: false,
          addCategory: "MEDIUM"
        }
      }
    }
  }
}
```

## ✅ Changes Made

1. ✅ Spherical vs Toric decision logic
2. ✅ Spherical Equivalent calculation
3. ✅ Vertex conversion only for |SPH| ≥ 4.00
4. ✅ Toric cylinder/axis preservation
5. ✅ ADD mapping to discrete values and categories
6. ✅ Rounding to nearest 0.25 D

## 📝 Notes

- **Edge Cases Handled:**
  - CYL = 0 or null → Spherical (no SE needed)
  - CYL between 0.50 and 0.75 → Treated as spherical (uses SE)
  - ADD > 3.00 → Maps to highest available (+2.75 HIGH)

- **Product Matching:**
  - After conversion, search CL products by:
    - SPH range
    - CYL range (0 for spherical, toric ranges for cyl)
    - Axis steps (nearest allowed)
    - ADD category/value

---

**Updated:** Today
**Status:** ✅ Complete and Ready for Testing
