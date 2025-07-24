# Session Signers Implementation for Seamless Transactions

## Overview

Based on the [Privy Session Signers documentation](https://docs.privy.io/wallets/using-wallets/session-signers/use-session-signers), this implementation provides a truly seamless web2-like experience for suppliers by using server-side transaction signing instead of client-side wallet prompts.

## Key Components

### 1. Server-Side Privy Client (`src/lib/privy-server.ts`)
- Handles server-side transaction signing using Privy's session signers
- Manages user wallets with delegated signing capabilities
- Provides batch transaction support

### 2. API Route (`src/app/api/session-signer/route.ts`)
- Exposes server-side signing functionality to the frontend
- Handles both single and batch transactions
- Validates identity tokens and transaction data

### 3. React Hook (`src/hooks/useSessionSigner.ts`)
- Provides seamless transaction execution interface
- Handles token approvals and complex transactions
- Includes helper functions for common transaction types

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install @privy-io/server-auth
```

### Step 2: Environment Variables
Add to your `.env.local`:
```
PRIVY_APP_SECRET=your_privy_app_secret_here
NEXT_PUBLIC_PRIVY_APP_ID=cmd45wlum039ql20myccjcwpv
```

### Step 3: Configure Session Signers in Privy Dashboard
1. Go to your Privy Dashboard
2. Navigate to "Wallets" → "Session Signers"
3. Enable session signers for your app
4. Configure the signing key for server-side transactions

### Step 4: Update Privy Configuration
The current configuration in `src/app/layout.tsx` already supports session signers:
```typescript
embeddedWallets: {
  createOnLogin: 'users-without-wallets',
},
```

## How It Works

### Traditional Flow (Current)
1. User clicks "Stake"
2. Wallet prompts for approval
3. User approves transaction
4. Transaction executes

### Session Signers Flow (New)
1. User clicks "Stake"
2. Frontend sends transaction request to API
3. Server signs transaction using session signer
4. Transaction executes without user prompts

## Benefits

1. **True Web2 Experience**: No wallet popups or approval prompts
2. **Batch Transactions**: Multiple operations in single request
3. **Better UX**: Seamless, instant transactions
4. **Security**: Server-side signing with proper authentication

## Usage Examples

### Single Transaction
```typescript
const { executeSeamlessTransaction } = useSessionSigner();

await executeSeamlessTransaction(
  contractAddress,
  encodedData,
  0n, // value
  5115 // chainId
);
```

### Batch Transactions
```typescript
const { executeSeamlessBatchTransactions } = useSessionSigner();

await executeSeamlessBatchTransactions([
  { to: contract1, data: data1 },
  { to: contract2, data: data2 },
], 5115);
```

## Security Considerations

1. **Identity Token Validation**: All requests require valid Privy identity tokens
2. **Server-Side Signing**: Private keys never leave the server
3. **Rate Limiting**: Implement rate limiting on API routes
4. **Error Handling**: Comprehensive error handling and logging

## Migration Strategy

1. **Phase 1**: Implement session signers alongside existing flow
2. **Phase 2**: Gradually migrate supplier flows to session signers
3. **Phase 3**: Remove client-side transaction prompts for suppliers

## Testing

### Prerequisites
- Valid Privy app with session signers enabled
- Environment variables configured
- Test contracts deployed

### Test Cases
1. Single transaction signing
2. Batch transaction signing
3. Error handling (invalid tokens, failed transactions)
4. User authentication flow

## Troubleshooting

### Common Issues
1. **"No session signer wallets found"**: User hasn't enabled session signers
2. **"Identity token required"**: User not properly authenticated
3. **Transaction failures**: Check contract addresses and chain configuration

### Debug Steps
1. Check browser console for client-side errors
2. Check server logs for API errors
3. Verify Privy dashboard configuration
4. Validate environment variables

## Next Steps

1. Install `@privy-io/server-auth` package
2. Configure environment variables
3. Enable session signers in Privy dashboard
4. Test with small transactions
5. Gradually roll out to all supplier flows

## References

- [Privy Session Signers Documentation](https://docs.privy.io/wallets/using-wallets/session-signers/use-session-signers)
- [Privy Server Auth Documentation](https://docs.privy.io/server-auth)
- [Privy Dashboard Configuration](https://console.privy.io/) 