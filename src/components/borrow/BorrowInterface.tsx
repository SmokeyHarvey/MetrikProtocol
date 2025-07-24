import React, { useState } from 'react';
import { useBorrow } from '@/hooks/useBorrow';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, DollarSign, TrendingUp, Clock, AlertTriangle, CheckCircle, Shield, Target } from 'lucide-react';
import { toast } from 'react-toastify';
import { useWallets } from '@privy-io/react-auth';
import { usePublicClient, useWalletClient } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { useSendTransaction } from '@privy-io/react-auth';

// Debug: confirm component is rendering
console.log('BorrowInterface rendered');

// Define the Invoice type for prop typing (move outside the component)
type Invoice = {
  id: string | number;
  invoiceId: string;
  supplier: string;
  isVerified: boolean;
  creditAmount?: string | number;
  amount?: string | number;
  dueDate?: string | number;
};

export function BorrowInterface({ invoices }: { invoices: Invoice[] }) {
  const { wallets } = useWallets();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { sendTransaction } = useSendTransaction();
  const {
    userLoans,
    borrowStats,
    isLoading,
    error,
    borrow,
    animatedStats,
    // New functions and state from updated hook
    getBorrowingCapacity,
    borrowingCapacity,
    safeLendingAmount,
    refetch,
    getUserLoansRaw,
    getLoanByIdRaw,
    getMaxBorrowAmount,
  } = useBorrow(address);

  const [borrowForm, setBorrowForm] = useState({
    invoiceId: '',
    amount: '',
  });
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  // Add state to track selected invoice for detail card
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedMaxBorrow, setSelectedMaxBorrow] = useState<string>('');

  // Calculate true borrowing capacity and utilization
  const activeLoanInvoiceIds = React.useMemo(() =>
    userLoans
      .filter(loan => loan.status === 'active')
      .map(loan => loan.invoiceId),
    [userLoans]
  );

  const totalBorrowingCapacity = React.useMemo(() => {
    if (!invoices || !borrowingCapacity) return 0;
    
    const capacity = invoices
      .filter(inv => inv.isVerified && !activeLoanInvoiceIds.includes(String(inv.id)))
      .reduce((total, inv) => {
        const creditAmount = BigInt(inv.creditAmount || 0);
        const ltv = BigInt(borrowingCapacity);
        const maxBorrowForItem = (creditAmount * ltv) / 10000n;
        return total + maxBorrowForItem;
      }, 0n);

    return Number(capacity / 10n**18n); // Convert from 18 decimals to float
  }, [invoices, borrowingCapacity, activeLoanInvoiceIds]);

  const activeBorrowed = React.useMemo(() =>
    userLoans
      .filter(loan => loan.status === 'active')
      .reduce((sum, loan) => sum + Number(loan.amount), 0),
    [userLoans]
  );

  const utilizationRate = totalBorrowingCapacity > 0 ? (activeBorrowed / totalBorrowingCapacity) * 100 : 0;
  
  const safeLendingMarkerPosition = totalBorrowingCapacity > 0
    ? Math.min((Number(safeLendingAmount) / totalBorrowingCapacity) * 100, 100)
    : 0;

  // Effect to check if invoices are loading or error
  React.useEffect(() => {
    if (!invoices) {
      setInvoicesLoading(true);
      setInvoicesError(null);
    } else if (invoices.length === 0) {
      setInvoicesLoading(false);
      setInvoicesError('No invoices found for this wallet.');
    } else {
      setInvoicesLoading(false);
      setInvoicesError(null);
    }
    // Defensive: if invoicesError is set, stop borrowing
    if (invoicesError) setIsBorrowing(false);
  }, [invoices, invoicesError]);

  // Fetch max borrow amount when invoice detail card is opened
  React.useEffect(() => {
    if (selectedInvoiceId) {
      getMaxBorrowAmount(selectedInvoiceId).then(val => setSelectedMaxBorrow(val));
    } else {
      setSelectedMaxBorrow('');
    }
  }, [selectedInvoiceId, getMaxBorrowAmount]);

  const handleBorrow = async (e: React.FormEvent) => {
    console.log('handleBorrow called');
    e.preventDefault();

    if (!privyWallet || !address) {
      console.error('Privy wallet not connected or address not available:', { privyWallet, address });
      toast.error('Privy wallet not connected.');
      return;
    }
    
    if (!borrowForm.invoiceId || !borrowForm.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    // Debug log for borrow arguments from UI
    console.log('BorrowInterface handleBorrow:', {
      invoiceId: borrowForm.invoiceId,
      amount: borrowForm.amount
    });

    // Pre-borrow checks
    try {
      const tokenId = borrowForm.invoiceId;
      const invoice = invoices.find(inv => String(inv.id) === String(tokenId));
      if (!invoice) {
        toast.error('Invoice not found');
        return;
      }
      // Check approval
      const invoiceNFTAddress = process.env.NEXT_PUBLIC_INVOICE_NFT_ADDRESS;
      const lendingPoolAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_LENDINGPOOL;
      if (!invoiceNFTAddress || !lendingPoolAddress) {
        toast.error('Contract addresses not set');
        return;
      }
      if (!publicClient) {
        toast.error('Public client not available');
        return;
      }
      const approved = await publicClient.readContract({
        address: invoiceNFTAddress as `0x${string}`,
        abi: [
          {
            "inputs": [
              { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
            ],
            "name": "getApproved",
            "outputs": [
              { "internalType": "address", "name": "", "type": "address" }
            ],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'getApproved',
        args: [BigInt(tokenId)]
      });
      if (approved.toLowerCase() !== lendingPoolAddress.toLowerCase()) {
        // Not approved: send approve transaction
        toast.info('Approving invoice NFT for LendingPool contract...');
        setIsBorrowing(true);
        const approveAbi = [
          {
            "inputs": [
              { "internalType": "address", "name": "to", "type": "address" },
              { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
            ],
            "name": "approve",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ];
        if (privyWallet && privyWallet.walletClientType === 'privy') {
          // Use Privy sendTransaction
          const data = encodeFunctionData({
            abi: approveAbi,
            functionName: 'approve',
            args: [lendingPoolAddress as `0x${string}`, BigInt(tokenId)]
          });
          const { hash } = await sendTransaction({
            to: invoiceNFTAddress as `0x${string}`,
            data,
            value: 0n,
            chainId: publicClient?.chain.id,
          });
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash });
          }
          toast.success('Invoice NFT approved with Privy! Proceeding to borrow...');
        } else if (walletClient) {
          // Use Wagmi walletClient
          const approveTx = await walletClient.writeContract({
            address: invoiceNFTAddress as `0x${string}`,
            abi: approveAbi,
            functionName: 'approve',
            args: [lendingPoolAddress as `0x${string}`, BigInt(tokenId)]
          });
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
          }
          toast.success('Invoice NFT approved! Proceeding to borrow...');
        } else {
          toast.error('No wallet client available for approval');
          setIsBorrowing(false);
          return;
        }
      }
      // Check max borrow
      const maxBorrow = await getBorrowingCapacity();
      if (Number(borrowForm.amount) > Number(maxBorrow)) {
        toast.error(`Borrow amount exceeds max allowed (${maxBorrow} USDC)`);
        setIsBorrowing(false);
        return;
      }
      // Log all relevant state
      console.log('Borrow pre-check:', {
        tokenId,
        borrowAmount: borrowForm.amount,
        invoice,
        isVerified: invoice.isVerified,
        dueDate: 'dueDate' in invoice ? (invoice as any).dueDate : undefined,
        now: Date.now() / 1000,
        maxBorrow,
        approved,
        poolLiquidity: 'Check pool balance if needed'
      });
    } catch (preCheckErr) {
      console.error('Pre-borrow check failed:', preCheckErr);
      toast.error('Pre-borrow check failed. See console for details.');
      setIsBorrowing(false);
      return;
    }

    try {
      setIsBorrowing(true);
      const result = await borrow(borrowForm.invoiceId, borrowForm.amount);
      setBorrowForm({ invoiceId: '', amount: '' });
      toast.success('Borrow successful!');
    } catch (err: any) {
      toast.error(err?.message || 'Borrow failed');
    } finally {
      setIsBorrowing(false);
    }
  };

  // Debug: Call getUserLoansRaw directly
  const handleDebugGetUserLoans = async () => {
    if (typeof window !== 'undefined' && getUserLoansRaw) {
      const address = (window as any).ethereum?.selectedAddress;
      if (!address) {
        console.log('No address found in window.ethereum.selectedAddress');
        return;
      }
      try {
        const result = await getUserLoansRaw(address);
        console.log('DEBUG getUserLoansRaw result:', result);
      } catch (err) {
        console.error('DEBUG getUserLoansRaw error:', err);
      }
    }
  };

  // Debug: Call getLoanByIdRaw for each loan ID from getUserLoansRaw
  const handleDebugGetLoanByIdRaw = async () => {
    if (typeof window !== 'undefined' && getUserLoansRaw && getLoanByIdRaw) {
      const address = (window as any).ethereum?.selectedAddress;
      if (!address) {
        console.log('No address found in window.ethereum.selectedAddress');
        return;
      }
      try {
        const ids = await getUserLoansRaw(address) as bigint[];
        console.log('DEBUG getUserLoansRaw result:', ids);
        for (const id of ids) {
          await getLoanByIdRaw(id);
        }
      } catch (err) {
        console.error('DEBUG getLoanByIdRaw error:', err);
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getLoanStatusBadge = (loan: { status: string }) => {
    if (loan.status === 'repaid') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Repaid
        </Badge>
      );
    }
    if (loan.status === 'liquidated') {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Liquidated
        </Badge>
      );
    }
    if (loan.status === 'overdue') {
      return (
        <Badge variant="destructive">
          <Clock className="w-3 h-3 mr-1" />
          Overdue
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <TrendingUp className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  const calculateBorrowUtilization = () => {
    // Use only active loans for utilization
    const activeBorrowed = userLoans
      .filter(loan => loan.status === 'active')
      .reduce((sum, loan) => sum + Number(loan.amount), 0);
    const maxBorrow = parseFloat(borrowingCapacity) || 1000;
    return maxBorrow > 0 ? (activeBorrowed / maxBorrow) * 100 : 0;
  };

  // Add handler for table borrow button
  const handleTableBorrowClick = (invoiceId: string) => {
    setBorrowForm({ invoiceId, amount: '' });
    setSelectedInvoiceId(invoiceId);
  };

  // Add handler to close invoice detail card
  const handleCloseInvoiceDetail = () => {
    setSelectedInvoiceId(null);
    setBorrowForm({ invoiceId: '', amount: '' });
  };

  return (
    <div className="space-y-6">
      {/* Loading/Error State for Invoices */}
      {invoicesLoading && (
        <div className="text-center py-4 text-blue-600">Loading invoices...</div>
      )}
      {invoicesError && (
        <Alert variant="destructive">
          <AlertDescription>
            {invoicesError}
          </AlertDescription>
        </Alert>
      )}
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading borrow data: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Defensive Error Banner for Missing Address/Contract */}
      {invoicesError && (
        <Alert variant="destructive">
          <AlertDescription>
            {invoicesError}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Borrowed Card (already correct) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold transition-all duration-800 ease-out">
                ${animatedStats.totalBorrowed}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current borrowed amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borrowing Capacity</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold transition-all duration-800 ease-out">
                ${totalBorrowingCapacity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total available credit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Safe Lending Amount</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold transition-all duration-800 ease-out">
                ${safeLendingAmount ? Number(safeLendingAmount).toLocaleString() : '0'}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This is the system-wide safe lending amount available for all users (USDC).
            </p>
          </CardContent>
        </Card>
        {/* Active Loans Card (already correct) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold transition-all duration-800 ease-out">
                {animatedStats.activeLoans}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current active loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Borrow Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Borrow Utilization</CardTitle>
          <CardDescription>
            Your current borrowing utilization rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-medium">Utilization Rate</span>
              <span className="font-bold text-lg">{utilizationRate.toFixed(1)}%</span>
            </div>
            <div className="relative h-8 flex items-center" style={{ minHeight: 32 }}>
              {/* Progress Bar Background */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-3 bg-gray-200 rounded-full w-full z-0" />
              {/* Progress Bar Foreground */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-3 bg-indigo-500 rounded-full z-10 transition-all"
                style={{ width: `${Math.min(utilizationRate, 100)}%` }}
              />
              {/* Safe Limit Marker */}
              <div
                className="absolute flex flex-col items-center z-20"
                style={{ left: `calc(${safeLendingMarkerPosition}% - 1px)` }}
                title={`System Safe Lending Limit: $${Number(safeLendingAmount).toLocaleString()}`}
              >
                <div className="mb-1 text-xs text-yellow-600 font-semibold whitespace-nowrap bg-white px-1 rounded shadow border border-yellow-300">Safe Limit</div>
                <div className="w-0 h-4 border-l-2 border-dashed border-yellow-500" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{activeBorrowed.toLocaleString()} USDC borrowed</span>
              <span>{totalBorrowingCapacity.toLocaleString()} USDC capacity</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Borrow Positions & History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Active Borrow Positions */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Active Borrow Positions</CardTitle>
            <CardDescription>Your currently open loans</CardDescription>
          </CardHeader>
          <CardContent>
            {userLoans.filter(loan => loan.status === 'active').length === 0 ? (
              <div className="text-muted-foreground text-center py-4">No active borrow positions.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLoans.filter(loan => loan.status === 'active').map((loan) => (
                    <TableRow key={loan.invoiceId}>
                      <TableCell>#{loan.invoiceId}</TableCell>
                      <TableCell>${loan.amount}</TableCell>
                      <TableCell>${loan.interestAccrued}</TableCell>
                      <TableCell>{formatDate(loan.dueDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* Borrow History */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Borrow History</CardTitle>
            <CardDescription>All your past borrow actions</CardDescription>
          </CardHeader>
          <CardContent>
            {userLoans.length === 0 ? (
              <div className="text-muted-foreground text-center py-4">No borrow history found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Borrowed On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLoans.map((loan) => (
                    <TableRow key={loan.invoiceId}>
                      <TableCell>#{loan.invoiceId}</TableCell>
                      <TableCell>${loan.amount}</TableCell>
                      <TableCell>{getLoanStatusBadge(loan)}</TableCell>
                      <TableCell>{formatDate(loan.borrowTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="borrow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="borrow">Borrow</TabsTrigger>
          <TabsTrigger value="my-loans">My Loans</TabsTrigger>
        </TabsList>

        <TabsContent value="borrow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Borrow Against Invoice</CardTitle>
              <CardDescription>
                Borrow USDC against your verified invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBorrow} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceId">Invoice ID</Label>
                    <select
                      id="invoiceId"
                      value={borrowForm.invoiceId}
                      onChange={e => setBorrowForm(prev => ({ ...prev, invoiceId: e.target.value }))}
                      required
                      disabled={isBorrowing || invoicesLoading || Boolean(invoicesError) || !invoices || invoices.length === 0}
                      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="" disabled>Select an invoice</option>
                      {invoices && invoices.length > 0 && invoices.map((inv: Invoice) => (
                        <option key={inv.id} value={inv.id}>
                          #{inv.id} — {inv.invoiceId}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select the numeric token ID (e.g. 1, 2, 3) of your verified invoice. The label shows both the token ID and the human-readable invoice ID.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Borrow Amount (USDC)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="500"
                      value={borrowForm.amount}
                      onChange={(e) => setBorrowForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      disabled={isBorrowing}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isBorrowing} className="w-full font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isBorrowing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Borrow...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Borrow USDC
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-loans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Loans</CardTitle>
                  <CardDescription>
                    Your current and past loans
                  </CardDescription>
                </div>
                {isLoading && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Updating...
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {userLoans && userLoans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? 'Loading your loans...' : 'No loans found. Borrow against your invoices above.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Borrowed Amount</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Days Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userLoans.map((loan) => (
                      <TableRow key={loan.invoiceId}>
                        <TableCell className="font-mono text-sm">
                          #{loan.invoiceId}
                        </TableCell>
                        <TableCell>${loan.amount}</TableCell>
                        <TableCell>${loan.interestAccrued}</TableCell>
                        <TableCell>{formatDate(loan.dueDate)}</TableCell>
                        <TableCell>
                          {getLoanStatusBadge(loan)}
                        </TableCell>
                        <TableCell>
                          {loan.dueDate > new Date() ? (
                            <span className="text-sm">
                              {Math.ceil((loan.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                            </span>
                          ) : (
                            <span className="text-sm text-red-600">Overdue</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Table of invoices with Borrow button (second option) */}
      <Card>
        <CardHeader>
          <CardTitle>Borrow Against Invoice</CardTitle>
          <CardDescription>
            Select a verified invoice and borrow USDC against it. The platform will automatically handle NFT approval if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>INVOICE ID</TableHead>
                <TableHead>AMOUNT</TableHead>
                <TableHead>DUE DATE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.filter(inv => inv.isVerified).map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.invoiceId}</TableCell>
                  <TableCell>{inv.creditAmount != null ? (Number(inv.creditAmount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : inv.amount != null ? inv.amount : 'N/A'} USDC</TableCell>
                  <TableCell>{inv.dueDate != null ? new Date(Number(inv.dueDate) * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="default">Verified</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="default"
                      onClick={() => handleTableBorrowClick(String(inv.id))}
                      disabled={isBorrowing}
                    >
                      Borrow
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Detail Card (shown when a table borrow button is clicked) */}
      {selectedInvoiceId && (() => {
        const invoice = invoices.find(inv => String(inv.id) === selectedInvoiceId);
        const isLoanActive = activeLoanInvoiceIds.includes(selectedInvoiceId);

        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="relative w-full max-w-full mx-auto bg-white border border-gray-200 shadow-2xl rounded-xl p-8">
              <button
                className="absolute top-4 left-4 text-gray-400 hover:text-indigo-600 focus:outline-none"
                onClick={handleCloseInvoiceDetail}
                disabled={isBorrowing}
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h4 className="text-xl font-semibold text-gray-800 mb-4 text-center">Invoice Details</h4>
              
              {!invoice ? <div>Invoice not found.</div> : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500">Invoice ID</div>
                      <div className="font-mono text-sm">{invoice.invoiceId}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Credit Amount</div>
                      <div className="text-sm">{invoice.creditAmount != null ? (Number(invoice.creditAmount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : invoice.amount != null ? invoice.amount : 'N/A'} USDC</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Due Date</div>
                      <div className="text-sm">{invoice.dueDate != null ? new Date(Number(invoice.dueDate) * 1000).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Max Borrow Amount</div>
                      <div className="text-lg font-bold text-indigo-700">
                        {isLoanActive 
                          ? '$0.00' 
                          : selectedMaxBorrow 
                            ? `${Number(selectedMaxBorrow).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC` 
                            : 'Loading...'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Borrow form */}
                  <form onSubmit={handleBorrow} className="flex flex-col sm:flex-row gap-2 items-end mb-2">
                    <input
                      type="number"
                      className="block w-full max-w-xl rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 text-black"
                      placeholder={isLoanActive ? "Loan already active" : "Enter amount"}
                      min="0"
                      value={borrowForm.amount}
                      onChange={e => setBorrowForm(prev => ({ ...prev, amount: e.target.value }))}
                      disabled={isBorrowing || isLoanActive}
                    />
                    <Button
                      type="submit"
                      disabled={isBorrowing || !borrowForm.amount || isLoanActive}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isBorrowing ? 'Processing...' : (isLoanActive ? 'Loan Active' : 'Borrow')}
                    </Button>
                  </form>
                  {isLoanActive && <p className="text-xs text-center text-yellow-600 mt-2">This invoice has an active loan and cannot be borrowed against again.</p>}
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
} 