# 📊 SPECIFICATION vs CODEBASE ANALYSIS (हिंदी)
## पूरी लाइन-बाई-लाइन तुलना रिपोर्ट

---

## 🎯 मुख्य सारांश

### ✅ **क्या पहले से Implemented है:**
1. ✅ Basic Lens Advisor wizard flow (5 steps)
2. ✅ Offer Engine backend (YOPO, Combo, Free Lens, etc.)
3. ✅ Store verification system
4. ✅ Questionnaire system with adaptive questions
5. ✅ Product recommendation engine
6. ✅ Admin panels for managing products, offers, stores

### ❌ **क्या Missing है या Update चाहिए:**
1. ❌ **Language Selection** - `/start` route नहीं है language picker के साथ
2. ❌ **Proper Routing Structure** - Routes spec से match नहीं कर रहे (missing `/rx`, `/frame`, `/questions`, `/recommend`, `/offer-summary`, `/checkout`, `/order-success`)
3. ❌ **Order System** - Prisma schema में Order model नहीं है
4. ❌ **Staff Model** - अलग Staff model नहीं है (User use कर रहे हैं)
5. ❌ **Sales Mode** - SELF_SERVICE vs STAFF_ASSISTED distinction नहीं है
6. ❌ **4-Lens Recommendation Display** - अभी सभी recommendations दिख रहे हैं, exactly 4 specific roles के साथ नहीं
7. ❌ **View All Lenses Modal** - Spec के अनुसार implement नहीं है
8. ❌ **Order Lifecycle** - Order status tracking नहीं है (DRAFT → CUSTOMER_CONFIRMED → STORE_ACCEPTED → PRINTED → PUSHED_TO_LAB)
9. ❌ **QR Code Integration** - QR-based store initialization नहीं है
10. ❌ **POS Dashboard** - POS-specific order management नहीं है

---

## 📋 मुख्य बदलाव (Key Changes)

### 1. **Database Schema में Add करना होगा:**

```prisma
// Order Model
model Order {
  id                String      @id
  storeId           String
  salesMode         SalesMode   // SELF_SERVICE | STAFF_ASSISTED
  assistedByStaffId String?
  assistedByName    String?
  customerName      String?
  customerPhone     String?
  frameData         Json
  lensData          Json
  offerData         Json
  finalPrice        Float
  status            OrderStatus  // DRAFT → CUSTOMER_CONFIRMED → STORE_ACCEPTED → PRINTED → PUSHED_TO_LAB
}

// Staff Model
model Staff {
  id        String
  storeId   String
  name      String
  phone     String?
  role      StaffRole  // STORE_MANAGER | NC | JR | OPTOMETRIST | SALES
  status    String     // ACTIVE | INACTIVE
}

// Store में Add करना होगा
model Store {
  qrCodeUrl String?  // NEW field
}
```

### 2. **Routes बदलने होंगे:**

**Current Routes:**
- `/questionnaire` → Store verification
- `/questionnaire/[sessionId]` → Questions
- `/lens-advisor` → Complete wizard

**Required Routes (Spec के अनुसार):**
- `/start` → Language selection
- `/rx` → Prescription entry
- `/frame` → Frame details
- `/questions` → Adaptive questionnaire
- `/recommend` → 4 lens recommendations
- `/view-all` → Full lens list modal
- `/offer-summary` → Price breakdown
- `/checkout` → Customer + staff (optional/mandatory)
- `/order-success` → Confirmation screen

### 3. **4-Lens Recommendation Logic:**

अभी सभी lenses दिख रहे हैं, लेकिन spec के अनुसार exactly 4 lenses होने चाहिए:
1. **Best Match Lens** (highest match%)
2. **Recommended Index Lens** (power-based index recommendation)
3. **Premium Upgrade Lens** (above 100% match)
4. **Budget Walkout Prevention Lens** (lowest safe option)

### 4. **Language System:**

- Language selection screen (`/start`)
- i18n system (English, Hindi, Hinglish)
- सभी UI text को translate करना होगा

### 5. **Order System:**

- Order creation API (`POST /api/order/create`)
- Order status lifecycle management
- Checkout page (self-service + POS modes)
- Order success page

### 6. **Staff System:**

- Staff model create करना होगा
- Staff APIs (`GET /api/store/{id}/staff`)
- Checkout में staff selection (optional/mandatory based on mode)

### 7. **QR Code Integration:**

- Store QR code generation
- QR scanning से store auto-populate
- Sales mode auto-set (SELF_SERVICE)

---

## 🔧 Implementation Priority

### **Phase 1: Core Structure (Week 1)**
1. Database schema updates (Order, Staff models)
2. Routing restructure (सभी new routes)
3. Language system implementation
4. Session context (store, salesMode, language)

### **Phase 2: Lens Advisor Flow (Week 2)**
5. Language selection page
6. Separate route pages (rx, frame, questions)
7. 4-lens recommendation logic
8. View All Lenses modal

### **Phase 3: Order System (Week 3)**
9. Order creation APIs
10. Checkout page (self-service + POS modes)
11. Order success page
12. Order lifecycle management

### **Phase 4: Staff & POS (Week 4)**
13. Staff model/APIs
14. QR code integration
15. POS dashboard
16. Sales mode handling

---

## ✅ Verification Checklist

- [ ] Language selection implemented
- [ ] सभी routes spec से match करते हैं
- [ ] Order model created
- [ ] Staff model created
- [ ] 4-lens recommendation हमेशा shows करता है
- [ ] View All Lenses modal works
- [ ] Checkout page दोनों modes support करता है
- [ ] Order APIs implemented
- [ ] Order lifecycle works
- [ ] QR code integration works
- [ ] POS dashboard exists
- [ ] Sales mode handling works
- [ ] i18n system works
- [ ] सभी UI components wireframes से match करते हैं

---

## 📊 File Changes Summary

### **नए Files बनाने होंगे:**
- `app/start/page.tsx` (Language selection)
- `app/rx/page.tsx` (Prescription)
- `app/frame/page.tsx` (Frame entry)
- `app/questions/page.tsx` (Questionnaire)
- `app/recommend/page.tsx` (4-lens recommendations)
- `app/view-all/page.tsx` (View all modal)
- `app/offer-summary/page.tsx` (Offer summary)
- `app/checkout/page.tsx` (Checkout)
- `app/order-success/page.tsx` (Order success)
- `stores/session-store.ts` (Session state)
- `lib/i18n.ts` (i18n system)
- `app/api/order/*` (Order APIs)
- `app/api/store/[id]/staff/route.ts` (Staff API)

### **Update करने होंगे:**
- `prisma/schema.prisma` (Order, Staff models add करना)
- `services/benefit-recommendation.service.ts` (4-lens logic)
- सभी components (i18n add करना)

---

**END OF ANALYSIS (हिंदी)**

