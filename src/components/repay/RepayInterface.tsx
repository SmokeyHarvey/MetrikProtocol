import React, { useState } from 'react';
import { useRepay } from '@/hooks/useRepay';
import { useWallets } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, DollarSign, CreditCard, Clock, AlertTriangle, CheckCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';

export function RepayInterface() {
  const { wallets } = useWallets();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;
  const {
    outstandingLoans,
    repaymentStats,
    usdcBalance,
    isLoading,
    error,
    repay,
    animatedStats,
    animatedUsdcBalance,
    refetch,
  } = useRepay(address);

  const [repayForm, setRepayForm] = useState({
    invoiceId: '',
  });
  const [isRepaying, setIsRepaying] = useState(false);

  // One-click repay handler (backend already supports batch transactions!)
  const handleOneClickRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!repayForm.invoiceId) {
      toast.error('Please select an invoice to repay');
      return;
    }

    try {
      setIsRepaying(true);
      
      // Show user what's happening
      toast.info('🚀 Executing seamless repay: USDC approval + repayment in background!', { autoClose: 3000 });
      
      console.log('🚀 Initiating one-click repay for invoice:', repayForm.invoiceId);
      
      await repay(repayForm.invoiceId);
      
      // Reset form
      setRepayForm({
        invoiceId: '',
      });
      
      toast.success('🎉 SEAMLESS REPAYMENT COMPLETED! Zero wallet prompts required!', { autoClose: 8000 });
    } catch (err) {
      console.error('❌ Seamless repayment failed:', err);
      toast.error('Seamless repayment failed. Please try again.');
    } finally {
      setIsRepaying(false);
    }
  };

  const handleQuickRepay = async (invoiceId: string) => {
    try {
      setIsRepaying(true);
      
      // Show seamless execution message
      toast.info('⚡ Processing seamless repayment...', { autoClose: 3000 });
      
      await repay(invoiceId);
      
      toast.success(`🎉 SEAMLESS REPAYMENT COMPLETED! Invoice ${invoiceId} paid with zero prompts!`, { autoClose: 8000 });
    } catch (err) {
      console.error('❌ Quick repay failed:', err);
      toast.error('Seamless repayment failed. Please try again.');
    } finally {
      setIsRepaying(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getLoanStatusBadge = (loan: { isRepaid: boolean; isLiquidated: boolean; isOverdue: boolean }) => {
    if (loan.isRepaid) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Repaid
        </Badge>
      );
    }
    if (loan.isLiquidated) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Liquidated
        </Badge>
      );
    }
    if (loan.isOverdue) {
      return (
        <Badge variant="destructive">
          <Clock className="w-3 h-3 mr-1" />
          Overdue
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <CreditCard className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  const calculateRepaymentProgress = () => {
    const totalOutstanding = parseFloat(repaymentStats.totalOutstanding);
    const totalRepaid = parseFloat(repaymentStats.totalRepaid);
    const total = totalOutstanding + totalRepaid;
    return total > 0 ? (totalRepaid / total) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading repayment data: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold transition-all duration-800 ease-out">
                ${animatedStats.totalOutstanding}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount to be repaid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USDC Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold transition-all duration-800 ease-out">
                ${animatedUsdcBalance}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for repayment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold transition-all duration-800 ease-out">
                ${animatedStats.totalInterest}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Accrued interest
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
              Loans to repay
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Repayment Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Repayment Progress</CardTitle>
          <CardDescription>
            Your overall repayment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Repaid: ${repaymentStats.totalRepaid}</span>
              <span>Total: ${(parseFloat(repaymentStats.totalOutstanding) + parseFloat(repaymentStats.totalRepaid)).toFixed(2)}</span>
            </div>
            <Progress 
              value={calculateRepaymentProgress()} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {calculateRepaymentProgress().toFixed(1)}% of total loans repaid
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="repay" className="space-y-4">
        <TabsList>
          <TabsTrigger value="repay">Repay Loan</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding Loans</TabsTrigger>
        </TabsList>

        <TabsContent value="repay" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Repay Loan</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-normal">
                  ⚡ Zero-Click Available
                </span>
              </CardTitle>
              <CardDescription>
                Seamlessly repay your outstanding loans with USDC (automatic approval + repayment)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Seamless Repay Benefits Info */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 mb-4">
                <h4 className="text-sm font-semibold text-green-900 mb-2">⚡ Why Use Seamless Repayment?</h4>
                <ul className="text-xs text-green-800 space-y-1">
                  <li>• <strong>Zero-Click:</strong> No wallet confirmations or prompts</li>
                  <li>• <strong>Instant:</strong> Backend handles USDC approval automatically</li>
                  <li>• <strong>Seamless:</strong> Approval + repayment in complete background</li>
                  <li>• <strong>Perfect UX:</strong> Users don't need to understand blockchain complexity</li>
                </ul>
              </div>
              
              {/* Seamless Execution Progress */}
              {isRepaying && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-900">⚡ Seamless Execution in Progress</h4>
                      <p className="text-xs text-amber-800 mt-1">
                        Running USDC approval + repayment in background... No action needed from you!
                      </p>
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-amber-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Step 1: USDC approval transaction submitted</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-amber-700">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span>Step 2: Processing repayment transaction</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleOneClickRepay} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceId">Invoice ID</Label>
                  <Input
                    id="invoiceId"
                    placeholder="1"
                    value={repayForm.invoiceId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepayForm(prev => ({ ...prev, invoiceId: e.target.value }))}
                    required
                    disabled={isRepaying}
                  />
                </div>
                <Button type="submit" disabled={isRepaying} className="w-full font-bold rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-4 shadow focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isRepaying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ⚡ Processing Seamlessly...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      ⚡ SEAMLESS REPAY (Zero-Click)
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Outstanding Loans</CardTitle>
                  <CardDescription>
                    Your loans that need to be repaid
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetch}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {outstandingLoans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? 'Loading outstanding loans...' : 'No outstanding loans found. You&apos;re all caught up!'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Original Amount</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Total Due</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingLoans.map((loan) => (
                      <TableRow key={loan.invoiceId}>
                        <TableCell className="font-mono text-sm">
                          #{loan.invoiceId}
                        </TableCell>
                        <TableCell>${loan.amount}</TableCell>
                        <TableCell>${loan.interestAccrued}</TableCell>
                        <TableCell className="font-semibold">${loan.totalAmount}</TableCell>
                        <TableCell>{formatDate(loan.dueDate)}</TableCell>
                        <TableCell>
                          {getLoanStatusBadge(loan)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickRepay(loan.invoiceId)}
                            disabled={isRepaying || loan.isRepaid}
                            className="font-bold rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-1 px-3 shadow focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isRepaying && !loan.isRepaid ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {loan.isRepaid ? '✅ Repaid' : '⚡ Seamless Repay'}
                          </Button>
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

      {/* USDC Balance Warning */}
      {parseFloat(usdcBalance) < parseFloat(repaymentStats.totalOutstanding) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your USDC balance (${usdcBalance}) is lower than your outstanding balance (${repaymentStats.totalOutstanding}). 
            You may need to acquire more USDC to complete your repayments.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 