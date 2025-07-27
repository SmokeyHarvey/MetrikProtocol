# Session Signers Setup Guide

## Current Status
The session signer implementation is ready but requires additional setup to work properly. Currently, you're seeing "Failed to sign transaction" because the required dependencies and configuration are not complete.

## Step-by-Step Setup

### 1. Install Required Package
```bash
npm install @privy-io/server-auth
```

### 2. Configure Environment Variables
Add to your `.env.local` file:
```env
# Your existing Privy app ID
NEXT_PUBLIC_PRIVY_APP_ID=cmd45wlum039ql20myccjcwpv

# NEW: Your Privy app secret (get this from Privy dashboard)
PRIVY_APP_SECRET=your_privy_app_secret_here
```

### 3. Get Your Privy App Secret
1. Go to [Privy Dashboard](https://console.privy.io/)
2. Select your app
3. Go to "Settings" → "API Keys"
4. Copy your "App Secret" (not the App ID)

### 4. Enable Session Signers in Privy Dashboard
1. In your Privy Dashboard, go to "Wallets" → "Session Signers"
2. Enable session signers for your app
3. Configure the signing key for server-side transactions
4. Save the configuration

### 5. Test the Implementation
After completing the setup:
1. Restart your development server
2. Go to the staking page
3. Try the "Session Signer Test" component
4. Check browser console for detailed logs

## Debugging

### Check if Package is Installed
```bash
npm list @privy-io/server-auth
```

### Check Environment Variables
The app will log warnings if:
- `@privy-io/server-auth` is not installed
- `PRIVY_APP_SECRET` is not configured

### Common Issues

1. **"Session signers not available"**
   - Install `@privy-io/server-auth`
   - Configure `PRIVY_APP_SECRET`

2. **"No session signer wallets found"**
   - Enable session signers in Privy dashboard
   - Ensure user has embedded wallet with session signers

3. **"Identity token required"**
   - User not properly authenticated
   - Check Privy authentication flow

## Expected Behavior

### Before Setup
- Session signer test will show error about missing package
- Clear error messages in console

### After Setup
- Seamless transactions without wallet prompts
- Server-side transaction signing
- No approval popups for suppliers

## Fallback Implementation

The current implementation includes a fallback that:
- Provides clear error messages when dependencies are missing
- Guides you through the setup process
- Won't break the app if session signers aren't configured

## Next Steps

1. Install the package: `npm install @privy-io/server-auth`
2. Get your app secret from Privy dashboard
3. Add `PRIVY_APP_SECRET` to your environment variables
4. Enable session signers in Privy dashboard
5. Test the implementation

Once complete, suppliers will have a truly seamless web2-like experience with no wallet prompts or approval popups! 