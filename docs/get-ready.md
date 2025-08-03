# Development Setup Guide

This document outlines all the changes made to fix chat functionality and implement license skip functionality for development.

## Issues Fixed

### 1. Chat Functionality Not Working
**Problem**: Chat buttons (like "Summarize meeting") were not responding when clicked.

**Root Cause**: Analytics calls to PostHog were blocking the entire chat flow when they failed or hung.

**Solution**: Made all analytics calls non-blocking by removing `await` and adding proper error handling.

### 2. License Validation Blocking Development
**Problem**: Development required valid licenses, making it difficult to test and develop features.

**Solution**: Added environment variable support to skip license validation and use a mock license.

## Files Modified

### 1. Chat Logic Fix
**File**: `apps/desktop/src/components/right-panel/hooks/useChatLogic.ts`

**Changes**:
- Made `analyticsCommands.event()` calls non-blocking
- Added `.catch()` error handling for analytics failures
- Added console logging for debugging analytics issues

**Before**:
```typescript
if (userId) {
  await analyticsCommands.event({
    event: analyticsEvent,
    distinct_id: userId,
  });
}
```

**After**:
```typescript
// Fire and forget analytics - don't block chat functionality
if (userId) {
  analyticsCommands
    .event({
      event: analyticsEvent,
      distinct_id: userId,
    })
    .catch((error) => {
      console.error("Analytics error (non-blocking):", error);
    });
}
```

### 2. License Skip Implementation
**File**: `apps/desktop/src/hooks/use-license.ts`

**Changes**:
- Added environment variable check for `VITE_SKIP_LICENSE`
- Returns mock license when skip is enabled
- Mock license is fully compatible with `KeygenLicense` structure

**Implementation**:
```typescript
// Check for SKIP_LICENSE environment variable
if (import.meta.env.VITE_SKIP_LICENSE === "true") {
  // Return a mock valid license
  const mockLicense: keygen.KeygenLicense = {
    key: "mock-license-key",
    code: "MOCK_LICENSE",
    detail: "Mock license for development",
    expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    valid: true,
    policyId: "mock-policy-id",
    entitlements: [],
    metadata: {},
  };
  return mockLicense;
}
```

### 3. Environment Configuration
**Files Created**:
- `apps/desktop/.env` - Development configuration
- `apps/desktop/.env.example` - Template for other developers
- Updated `apps/desktop/.gitignore` - Proper environment file handling

**Environment Variables**:
- `VITE_SKIP_LICENSE=true` - Enables license skip functionality

## Chat Flow Architecture

### Components Overview
1. **Right Panel** (`apps/desktop/src/components/right-panel/index.tsx`)
   - Main container switching between transcript and chat views

2. **Chat View** (`apps/desktop/src/components/right-panel/views/chat-view.tsx`)
   - Main chat interface coordination

3. **Empty Chat State** (`apps/desktop/src/components/right-panel/components/chat/empty-chat-state.tsx`)
   - Shows initial chat buttons and quick actions

4. **Chat Logic Hook** (`apps/desktop/src/components/right-panel/hooks/useChatLogic.ts`)
   - Handles all chat functionality and AI processing

### Button Click Flow
When you click a chat button:
1. `EmptyChatState.handleButtonClick()` → calls `onQuickAction(prompt)`
2. `ChatView.handleQuickAction()` → calls `useChatLogic.handleQuickAction()`
3. `useChatLogic.processUserMessage()` → processes with AI model
4. Analytics runs in background (non-blocking)
5. AI response streams back to UI

### Key Functions
- **`processUserMessage`**: Core function handling AI requests
- **`prepareMessageHistory`**: Builds context with meeting data
- **`modelProvider`**: Creates AI provider instance
- **`handleQuickAction`**: Processes quick action buttons
- **`handleSubmit`**: Processes manual input

## Development Setup

### Quick Start
1. The `.env` file is already configured with `VITE_SKIP_LICENSE=true`
2. Chat functionality works without license restrictions
3. Analytics failures won't block chat processing

### Environment Variables
```bash
# Skip license validation for development
VITE_SKIP_LICENSE=true

# Other available variables (examples)
# VITE_API_BASE_URL=http://localhost:3000
# VITE_DEBUG_MODE=true
```

### For Production
Create `.env.production` with:
```bash
VITE_SKIP_LICENSE=false
```

### For Other Developers
1. Copy `.env.example` to `.env`
2. Modify values as needed
3. All environment variables are documented

## Testing the Fixes

### Chat Functionality
1. Open the application
2. Navigate to a meeting note
3. Open the right panel (chat view)
4. Click any quick action button ("Summarize meeting", etc.)
5. Chat should process and respond with AI

### License Skip
1. Verify `VITE_SKIP_LICENSE=true` in `.env`
2. Chat should work without license restrictions
3. No license validation dialogs should appear

## Troubleshooting

### Chat Still Not Working
1. Check browser console for errors
2. Look for "Analytics error (non-blocking)" messages (safe to ignore)
3. Verify you're viewing a meeting note (not just any page)
4. Check if AI model is properly configured

### License Issues
1. Verify `.env` file exists and contains `VITE_SKIP_LICENSE=true`
2. Restart development server after changing environment variables
3. Check console for license-related errors

## Architecture Notes

### Analytics Implementation
- Analytics calls are now "fire and forget"
- Failures are logged but don't block functionality
- PostHog connectivity issues won't affect user experience

### License System
- Mock license has 1-year expiration to avoid refresh issues
- All license checks pass with mock license
- Production builds can still use real license validation

### Environment Handling
- `.env` is tracked in git with safe defaults
- `.env.local` and `.env.production` are ignored
- Clear documentation for all variables

## Summary

The chat functionality now works reliably by making analytics non-blocking, and development is streamlined with automatic license skip functionality. The environment configuration provides flexibility for different deployment scenarios while maintaining security best practices.
