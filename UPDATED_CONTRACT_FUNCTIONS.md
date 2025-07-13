# Updated Contract Functions Documentation

This document outlines all the updated contract functions that have been integrated into the Metrik Frontend hooks.

## 📋 **Staking Functions** (`useStaking.ts`)

### **New Functions Added:**

#### **Core Staking Functions:**
- ✅ `stake(amount, duration)` - Stake METRIK tokens with duration parameter
- ✅ `getTier(user)` - Get user's tier (0-4)
- ✅ `getStakedAmount(user)` - Get total staked amount
- ✅ `getActiveStakes(user)` - Get all active stakes
- ✅ `getStakeUsage(user)` - Get stake usage (total, used, free)

#### **New TypeScript Interfaces:**
```typescript
export interface StakeInfo {
  amount: bigint;
  points: bigint;
  startTime: bigint;
  lastUpdateTime: bigint;
  duration: bigint;
  stakeId: bigint;
  isActive: boolean;
  apy: bigint;
  multiplier: bigint;
}

export interface StakeUsage {
  total: bigint;
  used: bigint;
  free: bigint;
}
```

#### **Usage Example:**
```typescript
const { 
  getTier, 
  getStakedAmount, 
  getActiveStakes, 
  getStakeUsage,
  stake 
} = useStaking();

// Get user tier
const tier = await getTier();

// Get staked amount
const stakedAmount = await getStakedAmount();

// Get active stakes
const activeStakes = await getActiveStakes();

// Get stake usage
const usage = await getStakeUsage();

// Stake with duration
await stake("1000", 30); // 1000 tokens for 30 days
```

---

## 💰 **Lending Pool Functions** (`useLendingPool.ts`)

### **New Functions Added:**

#### **Tranche Deposit Functions:**
- ✅ `depositWithTranche(amount, tranche, lockupDuration)` - Deposit with tranche selection
- ✅ `deposit(amount)` - Default deposit (goes to Junior tranche)
- ✅ `getUserTotalLPDeposits(lp)` - Get total deposits
- ✅ `getUserLPDeposits(lp)` - Get all deposit details
- ✅ `getLPTrancheBreakdown(lp)` - Get Junior vs Senior allocation
- ✅ `isRegisteredLP(lp)` - Check if LP is registered

#### **Borrowing Functions:**
- ✅ `depositInvoiceAndBorrow(tokenId, amount)` - Borrow against invoice
- ✅ `getBorrowingCapacity(user)` - Get LTV percentage
- ✅ `getSafeLendingAmount(user, invoiceAmount)` - Get safe borrow amount
- ✅ `getUserTotalBorrowed(user)` - Get total borrowed amount

#### **Withdrawal Functions:**
- ✅ `withdraw(amount)` - Withdraw LP deposits
- ✅ `withdrawInterest()` - Withdraw earned interest
- ✅ `getLPInterest(lp)` - Get earned interest
- ✅ `getLPActiveDeposits(lp)` - Get active deposits

#### **View Functions:**
- ✅ `getAllRegisteredLPs()` - Get all LPs
- ✅ `getUserActiveLoans(user)` - Get active loans

#### **New TypeScript Interfaces:**
```typescript
export interface LPDeposit {
  amount: bigint;
  depositTime: bigint;
  lastInterestClaimed: bigint;
  withdrawnAmount: bigint;
  depositId: bigint;
  tranche: number; // 0 = Junior, 1 = Senior
  lockupDuration: bigint;
}

export interface LPTrancheBreakdown {
  juniorPrincipal: bigint;
  seniorPrincipal: bigint;
}

export enum Tranche {
  JUNIOR = 0,
  SENIOR = 1,
}
```

#### **Usage Example:**
```typescript
const { 
  depositWithTranche,
  depositInvoiceAndBorrow,
  getBorrowingCapacity,
  getSafeLendingAmount,
  getUserTotalLPDeposits,
  getLPTrancheBreakdown,
  withdrawInterest
} = useLendingPool();

// Deposit with tranche
await depositWithTranche("1000", Tranche.JUNIOR, 30);

// Borrow against invoice
await depositInvoiceAndBorrow("123", "500");

// Get borrowing capacity
const capacity = await getBorrowingCapacity();

// Get safe lending amount
const safeAmount = await getSafeLendingAmount(address, BigInt(1000));

// Get LP deposits
const deposits = await getUserTotalLPDeposits();

// Get tranche breakdown
const breakdown = await getLPTrancheBreakdown();

// Withdraw interest
await withdrawInterest();
```

---

## 📄 **Invoice Functions** (`useInvoiceNFT.ts`)

### **New Functions Added:**

#### **Invoice Management:**
- ✅ `mintInvoiceNFT(supplier, uniqueId, amount, dueDate, metadata)` - Create invoice with metadata
- ✅ `verifyInvoice(tokenId)` - Verify invoice
- ✅ `getInvoiceDetails(tokenId)` - Get invoice details

#### **New TypeScript Interfaces:**
```typescript
export interface InvoiceDetails {
  invoiceId: string;
  supplier: Address;
  buyer: Address;
  creditAmount: bigint;
  dueDate: bigint;
  ipfsHash: string;
  isVerified: boolean;
  metadata?: string; // Additional metadata field
}
```

#### **Usage Example:**
```typescript
const { 
  mintInvoiceNFT,
  verifyInvoice,
  getInvoiceDetails 
} = useInvoiceNFT();

// Mint invoice with metadata
await mintInvoiceNFT(
  supplierAddress,
  "INV-001",
  "1000",
  new Date("2024-12-31"),
  "ipfs://QmMetadataHash"
);

// Verify invoice
await verifyInvoice("123");

// Get invoice details
const details = await getInvoiceDetails("123");
```

---

## 💳 **Borrowing Functions** (`useBorrow.ts`)

### **Updated Functions:**

#### **Enhanced Borrowing:**
- ✅ `depositInvoiceAndBorrow(tokenId, amount)` - Updated to use new function
- ✅ `getBorrowingCapacity(user)` - Get LTV percentage
- ✅ `getSafeLendingAmount(user, invoiceAmount)` - Get safe borrow amount

#### **Usage Example:**
```typescript
const { 
  borrow,
  getBorrowingCapacity,
  getSafeLendingAmount,
  borrowingCapacity,
  safeLendingAmount
} = useBorrow();

// Borrow against invoice
await borrow("123", "500");

// Get borrowing capacity
const capacity = await getBorrowingCapacity();

// Get safe lending amount
const safeAmount = await getSafeLendingAmount(address, BigInt(1000));
```

---

## ⚡ **Liquidation Functions** (`useLiquidation.ts`)

### **New Hook Created:**

#### **Liquidation Management:**
- ✅ `liquidate(tokenId, supplierId)` - Liquidate defaulted loan
- ✅ `slashStakedTokens(user)` - Slash staked tokens

#### **Usage Example:**
```typescript
const { 
  liquidate,
  slashStakedTokens 
} = useLiquidation();

// Liquidate defaulted loan
await liquidate("123", "456");

// Slash staked tokens
await slashStakedTokens(userAddress);
```

---

## 🔍 **View Functions Summary**

### **For Suppliers:**
- ✅ `getUserLoanDetails(user, tokenId)` - Get loan details
- ✅ `getUserLoans(user)` - Get all user loans

### **For LPs:**
- ✅ `getAllRegisteredLPs()` - Get all LPs
- ✅ `getUserActiveLoans(user)` - Get active loans

---

## 📊 **State Management Updates**

### **New State Variables Added:**

#### **Staking Hook:**
- `activeStakes: StakeInfo[]`
- `stakeUsage: StakeUsage | null`
- `totalStakedAmount: string`

#### **Lending Pool Hook:**
- `userTotalDeposits: string`
- `userDeposits: LPDeposit[]`
- `trancheBreakdown: LPTrancheBreakdown | null`
- `isRegisteredLP: boolean`
- `lpInterest: string`
- `activeDeposits: LPDeposit[]`
- `borrowingCapacity: string`
- `userActiveLoans: bigint[]`
- `allRegisteredLPs: Address[]`

#### **Borrow Hook:**
- `borrowingCapacity: string`
- `safeLendingAmount: string`

---

## 🚀 **Next Steps for UI Integration**

1. **Update Components** to use the new functions and state
2. **Add Tranche Selection UI** for deposit functionality
3. **Implement Invoice Metadata** in invoice creation forms
4. **Add Liquidation Interface** for admin/owner functions
5. **Update Dashboard** to show new metrics and data
6. **Add Error Handling** for new function calls
7. **Implement Real-time Updates** for new state variables

---

## 📝 **Migration Notes**

- All functions now use proper TypeScript interfaces
- Error handling has been standardized across all hooks
- New functions follow the same patterns as existing ones
- State management has been enhanced with new data structures
- All functions are properly typed and documented

This update provides a comprehensive foundation for the new contract functionality while maintaining backward compatibility with existing features. 