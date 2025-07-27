# Privy Session Signer Setup Guide

## Overview
Session signers allow your app to execute transactions on behalf of users without requiring wallet approval prompts. This creates a seamless web2-like experience.

## Prerequisites
- ✅ `@privy-io/server-auth` package installed
- ✅ `PRIVY_APP_SECRET` environment variable configured
- ✅ `NEXT_PUBLIC_PRIVY_APP_ID` environment variable configured

## Step 1: Configure Session Signers in Privy Dashboard

1. Go to your [Privy Dashboard](https://console.privy.io/)
2. Navigate to your app settings
3. Find the "Session Signers" section
4. **Enable session signers** for your app
5. Configure the signing key (this will be used to authorize server-side requests)

## Step 2: Add Session Signers to User Wallets

Users must explicitly grant permission for session signers. This happens in two ways:

### Option A: Programmatic Addition
```typescript
// In your React component
const { addSessionSignerToWallet } = useSessionSigner();

// Add session signer to a specific wallet
await addSessionSignerToWallet(walletAddress);
```

### Option B: Manual Addition
Users can add session signers through the Privy wallet interface.

## Step 3: Verify Session Signer Configuration

### Check Environment Variables
```bash
# Verify these are set in your .env file
PRIVY_APP_SECRET=your_app_secret_here
NEXT_PUBLIC_PRIVY_APP_ID=your_app_id_here
```

### Test API Route
Visit `/api/test-env` to verify environment variables are loaded correctly.

### Test Session Signer Functionality
Use the SessionSignerTest component to verify everything is working.

## Step 4: Use Session Signers

Once configured, you can use session signers to execute transactions:

```typescript
const { executeSeamlessTransaction } = useSessionSigner();

// Execute a transaction without user prompts
const hash = await executeSeamlessTransaction(
  contractAddress,
  encodedData,
  value,
  chainId
);
```

## Troubleshooting

### Error: "Session signers not configured"
- Verify `@privy-io/server-auth` is installed
- Check `PRIVY_APP_SECRET` is set in environment variables
- Restart your development server

### Error: "No session signer wallets found"
- Enable session signers in your Privy dashboard
- Add session signers to user wallets using the test component
- Verify the user has granted permission

### Error: "Authentication required"
- Ensure the user is properly authenticated with Privy
- Check that the identity token is valid

## Important Notes

1. **Security**: Session signers give your app significant control over user wallets. Use responsibly.
2. **User Consent**: Users must explicitly grant permission for session signers.
3. **Dashboard Configuration**: Session signers must be enabled in the Privy dashboard before they can be used.
4. **Environment Variables**: The development server must be restarted after adding environment variables.

## References
- [Privy Session Signers Documentation](https://docs.privy.io/wallets/using-wallets/session-signers/use-session-signers)
- [Server-side Access Guide](https://docs.privy.io/recipes/wallets/session-signer-use-cases/server-side-access) 