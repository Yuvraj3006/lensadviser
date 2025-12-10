# LensTrack Codebase Documentation - Complete Index

**Generated from actual codebase analysis - Only documented what exists in code**

---

## Documentation Structure

This documentation is divided into 4 comprehensive parts, each covering different aspects of the LensTrack system:

### [Part 1: System Overview & Architecture](./CODEBASE_DOCUMENTATION_PART_1_SYSTEM_OVERVIEW.md)
- Technology stack
- Project structure
- Application architecture
- Core business concepts
- Key business rules
- Data flow overview
- Authentication & authorization
- State management
- Internationalization
- Key services overview

### [Part 2: Frontend Implementation](./CODEBASE_DOCUMENTATION_PART_2_FRONTEND_IMPLEMENTATION.md)
- Frontend architecture
- State management (Zustand, React Query, LocalStorage)
- Customer questionnaire flow (all pages)
- Admin panel pages
- UI components
- Language support
- Form validation
- API integration patterns
- Navigation flow logic
- Data persistence
- Frontend business logic

### [Part 3: Backend Implementation](./CODEBASE_DOCUMENTATION_PART_3_BACKEND_IMPLEMENTATION.md)
- Backend architecture
- Authentication & authorization
- Public questionnaire APIs
- Recommendation engine
- Benefit recommendation service
- Index recommendation service
- RX validation service
- Offer engine service (complete waterfall logic)
- Contact lens APIs (power conversion, search)
- Order APIs
- Admin APIs
- Business logic services
- Error handling
- Data validation

### [Part 4: Database Schema & Data Flow](./CODEBASE_DOCUMENTATION_PART_4_DATABASE_SCHEMA.md)
- Complete database schema
- All models and enums
- Data relationships
- Data flow diagrams
- Key data relationships
- Data storage patterns
- Index strategy
- Data validation rules
- Data access patterns
- Schema limitations & workarounds

---

## Quick Reference

### Main User Flows

**Customer Questionnaire Flow**:
1. Store Verification → Language → Mode → Lens Type
2. Category-specific flows (Frame, Prescription, Questionnaire)
3. Recommendations → Checkout → Order Success

**Admin Panel Flow**:
1. Login → Dashboard
2. CRUD operations for all master data
3. Question/Benefit/Feature management
4. Offer rule management
5. Order management

### Key Business Rules

1. **Frames & Sunglasses**: NOT SKU products - manual entry only
2. **Staff Selection**: Mandatory for STAFF_ASSISTED mode
3. **Index Rules**: Rimless → INDEX_160+ mandatory
4. **Contact Lens Power**: Validated against product ranges
5. **Offer Waterfall**: COMBO > YOPO > FREE_LENS > PERCENT > FLAT

### Key Services

- **Recommendation Engine**: Benefit-based scoring
- **Offer Engine**: Waterfall priority system
- **Index Recommendation**: Power + frame type based
- **RX Validation**: Prescription validation
- **Contact Lens Power Validation**: Range-based filtering

### Key APIs

**Public**:
- `/api/public/questionnaire/sessions` - Session creation
- `/api/public/questionnaire/sessions/[id]/answer` - Submit answers
- `/api/public/questionnaire/sessions/[id]/recommendations` - Get recommendations
- `/api/contact-lens/search` - CL product search
- `/api/contact-lens/convert-power` - Power conversion

**Admin**:
- `/api/admin/*` - All CRUD operations
- `/api/admin/translate` - Auto-translation
- `/api/admin/benefit-features` - Unified master

**Order**:
- `/api/order/create` - Order creation

**Offer**:
- `/api/offer-engine/calculate` - Offer calculation

---

## Documentation Principles

✅ **Only documented what exists in code**
✅ **No assumptions or extra information**
✅ **Brutal truth - actual implementation only**
✅ **Complete technical details**
✅ **Complete business logic**
✅ **Complete data flows**

---

## How to Use This Documentation

1. **For Vision Accuracy Check**: Compare each part with your vision document
2. **For Gap Analysis**: Identify what's missing vs. what's implemented
3. **For Development**: Use as reference for understanding existing code
4. **For Testing**: Use flows documented to create test cases
5. **For Onboarding**: Complete reference for new developers

---

**All 4 parts are complete and ready for review.**
