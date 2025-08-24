'use client';

import React, { useState, useEffect } from 'react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { useStaking } from '@/hooks/useStaking';
import { useRepay } from '@/hooks/useRepay';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { useBorrow } from '@/hooks/useBorrow';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  FileText, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useKyc } from '@/hooks/useKyc';

export default function SupplierDashboard() {
  const { wallets } = useWallets();
  const { status: kycStatus } = useKyc();
  const { user } = usePrivy();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;

  // Hooks for data
  const { stakedAmount, currentTier, metrikBalance } = useStaking(address as `0x${string}`);
  const { outstandingLoans, repaymentStats } = useRepay(address as `0x${string}`);
  const { userInvoices, fetchInvoices, fetchAllUserInvoices } = useInvoiceNFT(address as `0x${string}`);
  const { userLoans, activeLoans, borrowStats } = useBorrow(address as `0x${string}`);
  
  // Token balances
  const { getFormattedBalance } = useTokenBalance();

  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (address) {
        try {
          await Promise.all([
            fetchAllUserInvoices(address as `0x${string}`), // Use the new function to include burned invoices
            // The useStaking hook automatically fetches data on mount
          ]);
          // Simulate loading time for better UX
          setTimeout(() => setIsLoading(false), 1000);
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();
  }, [address, fetchAllUserInvoices]);

  // Calculate dashboard stats
  const totalInvoices = userInvoices?.length || 0;
  const activeInvoices = userInvoices?.filter(inv => !inv.isBurned).length || 0;
  const burnedInvoices = userInvoices?.filter(inv => inv.isBurned).length || 0;
  const verifiedInvoices = userInvoices?.filter(inv => inv.isVerified).length || 0;
  const totalBorrowed = activeLoans?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0;
  const totalRepaid = borrowStats?.totalRepaid || 0;
  const stakingTier = currentTier || 0;
  const stakingTierName = ['None', 'Diamond', 'Gold', 'Silver', 'Bronze'][stakingTier] || 'Unknown';
  
  // Debug logging for staking and balances
  console.log('🔍 Dashboard debug:', {
    stakedAmount,
    currentTier,
    stakingTier,
    address,
    metrikBalance
  });

  // Fetch real recent activity from blockchain events
  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!address) return;
      
      try {
        const activity = [];
        
        // Fetch recent staking events
        if (stakedAmount && parseFloat(stakedAmount) > 0) {
          activity.push({
            id: 'stake-1',
            type: 'stake',
            description: `Staked ${stakedAmount} METRIK tokens`,
            amount: `${stakedAmount} METRIK`,
            date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Approximate
            status: 'completed'
          });
        }
        
        // Fetch recent invoice events
        if (userInvoices && userInvoices.length > 0) {
          userInvoices.forEach((invoice) => {
            activity.push({
              id: `invoice-${invoice.id}`,
              type: 'invoice',
              description: `Created Invoice #${invoice.invoiceId}`,
              amount: `$${(Number(invoice.creditAmount) / 1e6).toFixed(2)}`,
              date: invoice.dueDate,
              status: invoice.isVerified ? 'verified' : 'pending'
            });
          });
        }
        
        // Fetch recent borrowing events
        if (userLoans && userLoans.length > 0) {
          userLoans.forEach((loan) => {
            activity.push({
              id: `borrow-${loan.invoiceId}`,
              type: 'borrow',
              description: `Borrowed $${loan.amount} against Invoice #${loan.invoiceId}`,
              amount: `$${loan.amount}`,
              date: loan.dueDate,
              status: loan.status
            });
          });
        }
        
        // Sort by date (most recent first)
        activity.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        // Take only the most recent 5 activities
        setRecentActivity(activity.slice(0, 5));
        
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        setRecentActivity([]);
      }
    };
    
    fetchRecentActivity();
  }, [address, stakedAmount, userInvoices, userLoans]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'borrow': return <CreditCard className="w-4 h-4" />;
      case 'invoice': return <FileText className="w-4 h-4" />;
      case 'stake': return <Shield className="w-4 h-4" />;
      case 'repay': return <CheckCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'borrow': return 'text-blue-600 bg-blue-100';
      case 'invoice': return 'text-green-600 bg-green-100';
      case 'stake': return 'text-purple-600 bg-purple-100';
      case 'repay': return 'text-emerald-600 bg-emerald-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#f67205] to-[#f48124] via-[#f67205] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.email?.address || 'Supplier'}!
            </h1>
            <p className="text-blue-100">Manage your invoices, borrowing, and staking all in one place</p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-white/20 text-white">
              {stakingTierName} Tier
            </Badge>
            <p className="text-sm text-blue-100 mt-1">Address: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          </div>
        </div>
      </div>

      {/* KYC status card with step guidance */}
      {kycStatus !== 'verified' ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-amber-900 font-semibold">Getting started</div>
              <div className="text-amber-800 text-sm mt-1">
                {kycStatus === 'not_submitted' && 'Step 1: Submit your KYC to unlock staking, invoicing, borrow and repay.'}
                {kycStatus === 'pending_review' && 'Your KYC is under review. You can browse the dashboard while we verify.'}
                {kycStatus === 'rejected' && 'Your KYC was rejected. Please resubmit your documents.'}
              </div>
              <ol className="mt-3 ml-4 list-decimal text-sm text-amber-900 space-y-1">
                <li>Open the KYC modal and upload business documents</li>
                <li>We review and approve (usually a few minutes)</li>
                <li>Once verified, proceed to Stake → Invoice → Borrow → Repay</li>
              </ol>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-amber-700">Status</div>
              <div className="text-sm capitalize">{kycStatus.replace('_',' ')}</div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-kyc-modal'))}
                className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs hover:bg-indigo-700"
              >
                Open KYC modal
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-800">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <span className="font-medium">Verified</span>
          <span className="text-sm">You can now Stake → create Invoices → Borrow → Repay. Tooltips will guide you.</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/supplier/staking">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-purple-600" />
                Staking
              </CardTitle>
              <CardDescription>Manage your METRIK tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stakedAmount} METRIK
              </div>
              <p className="text-sm text-muted-foreground">Staked amount</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/supplier/invoice">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-green-600" />
                Create Invoice
              </CardTitle>
              <CardDescription>Mint new invoice NFTs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activeInvoices}
              </div>
              <p className="text-sm text-muted-foreground">Active invoices</p>
              {burnedInvoices > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {burnedInvoices} completed • {totalInvoices} total
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/supplier/borrow">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Borrow
              </CardTitle>
              <CardDescription>Borrow against invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground">Total borrowed</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/supplier/repay">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-emerald-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Repay
              </CardTitle>
              <CardDescription>Repay outstanding loans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {outstandingLoans.length}
              </div>
              <p className="text-sm text-muted-foreground">Active loans</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">METRIK Balance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getFormattedBalance('metrik')} METRIK
            </div>
            <p className="text-xs text-muted-foreground">
              Available for staking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USDC Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getFormattedBalance('usdc')} USDC
            </div>
            <p className="text-xs text-muted-foreground">
              Available for repayment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(Number(repaymentStats.totalOutstanding) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount to be repaid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Invoices</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {verifiedInvoices}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {totalInvoices} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borrow Interest Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              8%
            </div>
            <p className="text-xs text-muted-foreground">
              Annual interest rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repaid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRepaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Historical repayments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="loans">Loan History</TabsTrigger>
          <TabsTrigger value="invoices">Invoice Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Repayment Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Repayment Progress</CardTitle>
                <CardDescription>Your overall repayment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Repaid: ${totalRepaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span>Total: ${(totalBorrowed + totalRepaid).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <Progress 
                    value={totalBorrowed + totalRepaid > 0 ? (totalRepaid / (totalBorrowed + totalRepaid)) * 100 : 0} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {totalBorrowed + totalRepaid > 0 ? ((totalRepaid / (totalBorrowed + totalRepaid)) * 100).toFixed(1) : 0}% of total loans repaid
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Staking Tier Table */}
            <Card>
              <CardHeader>
                <CardTitle>Staking Tier System</CardTitle>
                <CardDescription>METRIK staking tiers and points system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead>Min Stake</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className={stakingTier === 1 ? 'bg-purple-50' : ''}>
                        <TableCell className="font-medium">Bronze</TableCell>
                        <TableCell>1,000 METRIK</TableCell>
                      </TableRow>
                      <TableRow className={stakingTier === 2 ? 'bg-yellow-50' : ''}>
                        <TableCell className="font-medium">Silver</TableCell>
                        <TableCell>2,500 METRIK</TableCell>
                      </TableRow>
                      <TableRow className={stakingTier === 3 ? 'bg-orange-50' : ''}>
                        <TableCell className="font-medium">Gold</TableCell>
                        <TableCell>5,000 METRIK</TableCell>
                      </TableRow>
                      <TableRow className={stakingTier === 4 ? 'bg-indigo-50' : ''}>
                        <TableCell className="font-medium">Diamond</TableCell>
                        <TableCell>10,000 METRIK</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Points System:</strong> Earn 1 point per METRIK staked. 
                    <br />
                    <strong>Duration Bonus:</strong> Staking for 180+ days gives 2x points multiplier.
                    <br />
                    <strong>Your Current Tier:</strong> {stakingTierName}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* APY Rates Table */}
            <Card>
              <CardHeader>
                <CardTitle>APY Rates by Duration</CardTitle>
                <CardDescription>Annual Percentage Yield based on staking duration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Duration</TableHead>
                        <TableHead>APY Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>45 days</TableCell>
                        <TableCell>1% APY</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>90 days</TableCell>
                        <TableCell>3% APY</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>180 days</TableCell>
                        <TableCell>5% APY</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>365 days</TableCell>
                        <TableCell>8% APY</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Duration Multipliers Table */}
            <Card>
              <CardHeader>
                <CardTitle>Duration Multipliers</CardTitle>
                <CardDescription>Points calculation based on staking duration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Duration</TableHead>
                        <TableHead>Multiplier</TableHead>
                        <TableHead>Points Formula</TableHead>
                        <TableHead>Example</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>45 days</TableCell>
                        <TableCell>1.0x</TableCell>
                        <TableCell>amount × 10 ÷ 10</TableCell>
                        <TableCell>1000 METRIK = 1000 points</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>90 days</TableCell>
                        <TableCell>1.3x</TableCell>
                        <TableCell>amount × 13 ÷ 10</TableCell>
                        <TableCell>1000 METRIK = 1300 points</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>180 days</TableCell>
                        <TableCell>1.5x</TableCell>
                        <TableCell>amount × 15 ÷ 10</TableCell>
                        <TableCell>1000 METRIK = 1500 points</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>365 days</TableCell>
                        <TableCell>2.0x</TableCell>
                        <TableCell>amount × 20 ÷ 10</TableCell>
                        <TableCell>1000 METRIK = 2000 points</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest transactions and actions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading recent activity...</p>
                  </div>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.date.toLocaleDateString()} • {activity.amount}
                        </p>
                      </div>
                      <Badge variant={activity.status === 'completed' || activity.status === 'verified' ? 'default' : activity.status === 'pending' ? 'secondary' : 'destructive'}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <Activity className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-gray-600 font-medium">No recent activity</p>
                  <p className="text-sm text-gray-500 mt-1">Your transactions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan History</CardTitle>
              <CardDescription>All your borrowing and repayment history</CardDescription>
            </CardHeader>
            <CardContent>
              {userLoans && userLoans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userLoans.map((loan) => (
                      <TableRow key={loan.invoiceId}>
                        <TableCell className="font-mono">#{loan.invoiceId}</TableCell>
                        <TableCell>${loan.amount}</TableCell>
                        <TableCell>${loan.interestAccrued}</TableCell>
                        <TableCell>{loan.dueDate.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={loan.status === 'active' ? 'default' : loan.status === 'repaid' ? 'secondary' : 'destructive'}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {loan.status === 'active' ? (
                            <Link href="/dashboard/supplier/repay">
                              <Button size="sm" variant="outline">
                                Repay
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {loan.status === 'repaid' ? 'Completed' : 'Liquidated'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">No loan history found</p>
                  <p className="text-sm">Your borrowing and repayment history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status</CardTitle>
              <CardDescription>All your created invoices and their verification status</CardDescription>
            </CardHeader>
            <CardContent>
              {userInvoices && userInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userInvoices.map((invoice) => (
                      <TableRow key={invoice.invoiceId}>
                        <TableCell className="font-mono">#{invoice.invoiceId}</TableCell>
                        <TableCell>${(Number(invoice.creditAmount) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Badge variant={invoice.isVerified ? 'default' : 'secondary'}>
                              {invoice.isVerified ? 'Verified' : 'Pending'}
                            </Badge>
                            {invoice.isBurned && (
                              <Badge variant="destructive">
                                {invoice.burnReason === 'repayment' ? 'Repaid' : 'Burned'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{invoice.dueDate.toLocaleDateString()}</TableCell>
                        <TableCell>
                          {invoice.isBurned ? (
                            <span className="text-sm text-muted-foreground">
                              {invoice.burnReason === 'repayment' ? 'Loan completed' : 'Invoice burned'}
                              {invoice.burnTime && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {invoice.burnTime.toLocaleDateString()}
                                </div>
                              )}
                            </span>
                          ) : invoice.isVerified ? (
                            <Link href="/dashboard/supplier/borrow">
                              <Button size="sm" variant="outline">
                                Borrow
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">Waiting for verification</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices found. <Link href="/dashboard/supplier/invoice" className="text-blue-600 hover:underline">Create your first invoice</Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 