# ✅ Questionnaire Flow Updated
## Language Selection Added as Step 2

**Date:** Flow Updated  
**Status:** Language Selection (LA-01) now appears after Customer Details

---

## 🔄 UPDATED FLOW

### **Questionnaire Flow Steps:**

1. **Store Verification** → `/questionnaire`
   - Enter store code
   - Verify store
   - Secret key support: `?key=LENSTRACK2025`

2. **Customer Details** → `/questionnaire/customer-details`
   - Name (required)
   - Phone (required)
   - Email (optional)
   - Customer Category (optional)

3. **Language Selection** → `/questionnaire/language` ⭐ **NEW STEP 2**
   - Choose language: English / हिंदी (Hindi) / Hinglish
   - Matches WF-01 wireframe exactly
   - On selection → navigates to Prescription

4. **Prescription Entry** → `/questionnaire/prescription`
   - Right Eye (OD): SPH, CYL, Axis, ADD
   - Left Eye (OS): SPH, CYL, Axis, ADD
   - Vision Type (auto-detected)
   - Index recommendation box
   - Help link

5. **Frame Details** → `/questionnaire/frame`
   - Frame Brand
   - Sub-Category
   - MRP
   - Frame Type
   - Material

6. **Questionnaire** → `/questionnaire/[sessionId]`
   - Answer questions
   - Progress tracking

7. **Recommendations** → `/questionnaire/[sessionId]/recommendations`
   - Product recommendations
   - Offer calculation

---

## 📁 FILES CREATED/UPDATED

### **New File:**
- ✅ `app/questionnaire/language/page.tsx` - Language Selection page (LA-01)

### **Updated Files:**
- ✅ `app/questionnaire/customer-details/page.tsx` - Now navigates to `/questionnaire/language`
- ✅ `app/questionnaire/prescription/page.tsx` - Checks for language, redirects if not set, back button goes to language

---

## ✅ FLOW VERIFICATION

**Correct Flow:**
1. `/questionnaire` → Store verification
2. `/questionnaire/customer-details` → Customer info
3. `/questionnaire/language` → **Language Selection (LA-01)** ⭐
4. `/questionnaire/prescription` → Prescription entry
5. `/questionnaire/frame` → Frame details
6. `/questionnaire/[sessionId]` → Questions
7. `/questionnaire/[sessionId]/recommendations` → Recommendations

---

## 🎯 LANGUAGE SELECTION PAGE (LA-01)

**Location:** `/questionnaire/language`

**Features:**
- ✅ Lenstrack wordmark at top center
- ✅ Title: "Choose Your Language" / "अपनी भाषा चुनें"
- ✅ 3 large buttons (full width, 56px height, rounded 12px):
  - English
  - हिंदी (Hindi)
  - Hinglish
- ✅ Footer: "Powered by LensTrack Retail Intelligence"
- ✅ On tap → saves language in context → navigates to `/questionnaire/prescription`

**Matches:** WF-01 wireframe exactly

---

## 🔒 PROTECTION

- ✅ Prescription page checks for language
- ✅ If language not selected → redirects to `/questionnaire/language`
- ✅ Language persists in session store
- ✅ Back button from prescription goes to language page

---

**END OF FLOW UPDATE**

