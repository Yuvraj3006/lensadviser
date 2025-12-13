# Responsive Design Update Plan

## Completed:
1. ✅ Sidebar - Mobile hamburger menu, responsive width
2. ✅ Admin Layout - Responsive padding, mobile menu button
3. ✅ Modal - Already responsive
4. ✅ DataTable - Already has overflow-x-auto
5. ✅ Admin Dashboard - Header responsive

## Common Patterns to Update:
1. Page Headers: `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`
2. Headings: `text-3xl` → `text-2xl sm:text-3xl`
3. Padding: `p-8` → `p-4 sm:p-6 lg:p-8`
4. Grids: Already using responsive classes
5. Buttons in headers: Add `w-full sm:w-auto` for mobile

## Pages to Update (65 total):
- Admin pages: 30
- Questionnaire pages: 28  
- Other pages: 7

## Strategy:
- Update common patterns first
- Then batch update pages
- Test on mobile, tablet, desktop
