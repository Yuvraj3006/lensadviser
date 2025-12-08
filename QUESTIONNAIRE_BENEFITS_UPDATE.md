# Questionnaire Benefits-Based Flow Update

## Changes Needed

1. Remove FeatureMapping UI from questionnaire page
2. Keep only Benefits mapping (AnswerBenefit)
3. Add parentAnswerId support in QuestionForm for interconnected questions
4. Recommendation engine already uses Benefits → Features flow

## Implementation Plan

### Step 1: Remove Feature Mapping UI
- Remove feature mapping state variables
- Remove feature mapping functions
- Remove feature mapping UI from tree view
- Remove feature mapping UI from edit view

### Step 2: Add parentAnswerId Support
- Add parentAnswerId field to QuestionForm
- Show parent question selection in form
- Update API to handle parentAnswerId

### Step 3: Update Recommendation Engine
- Already done: Benefits → Features flow implemented
- Engine uses AnswerBenefit → ProductBenefit → FeatureBenefit

