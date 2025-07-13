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

export function BorrowInterface() {
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
    refetch,
    getUserLoansRaw,
    getLoanByIdRaw,
  } = useBorrow();

  // Get invoices from useInvoiceNFT
  const { invoices } = useInvoiceNFT();

  const [borrowForm, setBorrowForm] = useState({
    invoiceId: '',
    amount: '',
  });
  const [isBorrowing, setIsBorrowing] = useState(false);

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!borrowForm.invoiceId || !borrowForm.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsBorrowing(true);
      await borrow(borrowForm.invoiceId, borrowForm.amount);
      
      // Reset form
      setBorrowForm({
        invoiceId: '',
        amount: '',
      });
      
      toast.success('Borrow successful!');
    } catch (err) {
      console.error('Error borrowing:', err);
      toast.error('Failed to borrow');
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
        const ids = await getUserLoansRaw(address);
        console.log('DEBUG getUserLoansRaw result:', ids);
        for (const id of ids as bigint[]) {
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

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading borrow data: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                ${borrowingCapacity}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum borrow capacity
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
                ${safeLendingAmount}
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
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Utilization Rate</span>
              <span>{calculateBorrowUtilization().toFixed(1)}%</span>
            </div>
            <Progress value={calculateBorrowUtilization()} className="w-full" />
            <p className="text-xs text-muted-foreground">
              {userLoans.filter(loan => loan.status === 'active').reduce((sum, loan) => sum + Number(loan.amount), 0)} / {borrowingCapacity} USDC borrowed
            </p>
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
                      disabled={isBorrowing}
                      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="" disabled>Select an invoice</option>
                      {invoices && invoices.length > 0 && invoices.map(inv => (
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
    </div>
  );
} 