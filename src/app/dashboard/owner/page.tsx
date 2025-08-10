'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { useStaking } from '@/hooks/useStaking';
import { OwnerPlatformFees } from '@/components/dashboard/OwnerPlatformFees';
import { VerifierStakingInterface } from '@/components/contracts/VerifierStakingInterface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, FileText, Shield, Coins } from 'lucide-react';
import { toast } from 'react-toastify';
import { keccak256, toUtf8Bytes } from 'ethers';

const CONTRACT_OWNER = process.env.NEXT_PUBLIC_CONTRACT_OWNER?.toLowerCase();

export default function OwnerDashboard() {
  const { address } = useAccount();
  const { 
    invoices, 
    fetchInvoices,
    verifyInvoice,
    hasVerifierRole,
    isLoading, 
    error 
  } = useInvoiceNFT();

  const { stakedAmount, currentTier } = useStaking(address);

  const [isVerifier, setIsVerifier] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [granting, setGranting] = useState(false);
  const [hasStakedTokens, setHasStakedTokens] = useState(false);

  useEffect(() => {
    if (address && hasStakedTokens) {
      fetchInvoices(address);
      hasVerifierRole(address).then((hasRole) => {
        setIsVerifier(hasRole);
        setIsCheckingRole(false);
      });
    } else {
      setIsCheckingRole(false);
    }
  }, [address, fetchInvoices, hasVerifierRole, hasStakedTokens]);

  // Check if user has staked tokens
  useEffect(() => {
    if (stakedAmount && parseFloat(stakedAmount) > 0) {
      setHasStakedTokens(true);
    } else {
      setHasStakedTokens(false);
    }
  }, [stakedAmount]);

  const handleGrantRole = async () => {
    if (!hasStakedTokens) {
      toast.error('You must stake METRIK tokens before becoming a verifier');
      return;
    }

    setGranting(true);
    try {
      const VERIFIER_ROLE = keccak256(toUtf8Bytes("VERIFIER_ROLE"));
      const res = await fetch('/api/grant-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: VERIFIER_ROLE, address }),
      });
      const data = await res.json();
      if (data.success) {
        // Wait for role to propagate
        if (!address) throw new Error('No address found');
        let hasRole = false;
        for (let i = 0; i < 10; i++) {
          hasRole = await hasVerifierRole(address);
          if (hasRole) break;
          await new Promise(r => setTimeout(r, 1000));
        }
        setIsVerifier(true);
        toast.success('Verifier role granted!');
      } else {
        toast.error('Error: ' + data.error);
      }
    } finally {
      setGranting(false);
    }
  };

  const handleVerifyInvoice = async (tokenId: string) => {
    try {
      if (!isVerifier) {
        throw new Error('Only verifiers can verify invoices');
      }
      await verifyInvoice(tokenId);
      // No need to manually refresh, hook will do it
    } catch (err: unknown) {
      // Show concise error using toast
      const msg = (err as Error)?.message || 'Error verifying invoice.';
      toast.error(msg);
    }
  };

  // Sort invoices: pending first, then verified
  const sortedInvoices = [...invoices].sort((a, b) => {
    if (a.isVerified === b.isVerified) {
      return new Date(Number(b.dueDate) * 1000).getTime() - new Date(Number(a.dueDate) * 1000).getTime(); // Newest first
    }
    return a.isVerified ? 1 : -1; // Pending first
  });

  const pendingInvoices = sortedInvoices.filter(invoice => !invoice.isVerified);
  const verifiedInvoices = sortedInvoices.filter(invoice => invoice.isVerified);

  // Show staking interface if user hasn't staked tokens
  if (!hasStakedTokens) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Verifier Requirements
            </CardTitle>
            <CardDescription>
              To become a verifier, you must first stake METRIK tokens. This ensures verifiers have skin in the game and are incentivized to act honestly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Coins className="h-4 w-4" />
                <AlertDescription>
                  <strong>Staking Requirement:</strong> You need to stake METRIK tokens before you can become a verifier. 
                  This helps maintain the integrity of the verification process.
                </AlertDescription>
              </Alert>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Current Status:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Staked Amount:</span>
                    <span className="font-mono">{stakedAmount || '0'} METRIK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Tier:</span>
                    <Badge variant={currentTier >= 3 ? "default" : "secondary"}>
                      {currentTier === 0 ? 'None' : 
                       currentTier === 1 ? 'Bronze' :
                       currentTier === 2 ? 'Silver' :
                       currentTier === 3 ? 'Gold' : 'Diamond'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stake METRIK Tokens</CardTitle>
            <CardDescription>
              Use the interface below to stake your METRIK tokens. Once you have staked tokens, you can apply to become a verifier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerifierStakingInterface />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show role granting interface if user has staked but isn't a verifier yet
  if (!isVerifier) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Ready to Become a Verifier
            </CardTitle>
            <CardDescription>
              Great! You have staked METRIK tokens. You can now apply to become a verifier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Staking Requirement Met:</strong> You have successfully staked {stakedAmount} METRIK tokens.
                </AlertDescription>
              </Alert>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Current Status:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Staked Amount:</span>
                    <span className="font-mono text-green-700">{stakedAmount} METRIK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Tier:</span>
                    <Badge variant="default" className="bg-green-600">
                      {currentTier === 1 ? 'Bronze' :
                       currentTier === 2 ? 'Silver' :
                       currentTier === 3 ? 'Gold' : 'Diamond'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleGrantRole} 
                  disabled={granting} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {granting ? 'Granting Verifier Role...' : 'Become a Verifier'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the main verifier dashboard
  return (
    <div className="space-y-6">
      {/* Platform Fee Management */}
      <OwnerPlatformFees />
      
      {/* Invoice Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Verification
          </CardTitle>
          <CardDescription>
            Review and verify pending invoices. Only verified invoices can be used as collateral for borrowing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading invoices...</p>
            </div>
          ) : error ? (
            <Alert>
              <AlertDescription>Error loading invoices: {error.message}</AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending ({pendingInvoices.length})
                </TabsTrigger>
                <TabsTrigger value="verified" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Verified ({verifiedInvoices.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pending invoices to verify.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                                              {pendingInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono text-sm">
                              {invoice.invoiceId}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {invoice.supplier.slice(0, 8)}...{invoice.supplier.slice(-4)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {invoice.buyer.slice(0, 8)}...{invoice.buyer.slice(-4)}
                            </TableCell>
                            <TableCell>${Number(invoice.creditAmount) / 1e6}</TableCell>
                            <TableCell>
                              {new Date(Number(invoice.dueDate) * 1000).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">Pending</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => handleVerifyInvoice(invoice.id)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Verify
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="verified" className="space-y-4">
                {verifiedInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No verified invoices yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {verifiedInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">
                            {invoice.invoiceId}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {invoice.supplier.slice(0, 8)}...{invoice.supplier.slice(-4)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {invoice.buyer.slice(0, 8)}...{invoice.buyer.slice(-4)}
                          </TableCell>
                          <TableCell>${Number(invoice.creditAmount) / 1e6}</TableCell>
                          <TableCell>
                            {new Date(Number(invoice.dueDate) * 1000).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">
                              Verified
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Withdraw button example (show only for contract owner) */}
      {address?.toLowerCase() === CONTRACT_OWNER && (
        <div className="mb-4">
          <Button className="bg-green-700 hover:bg-green-800">Withdraw</Button>
        </div>
      )}
    </div>
  );
} 