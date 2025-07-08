'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { OwnerPlatformFees } from '@/components/dashboard/OwnerPlatformFees';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { keccak256, toUtf8Bytes } from 'ethers';

const CONTRACT_OWNER = process.env.NEXT_PUBLIC_CONTRACT_OWNER?.toLowerCase();

export default function OwnerDashboard() {
  const router = useRouter();
  const { address } = useAccount();
  const { 
    invoices, 
    fetchInvoices,
    verifyInvoice,
    hasVerifierRole,
    isLoading, 
    error 
  } = useInvoiceNFT();

  const [isVerifier, setIsVerifier] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (address) {
      fetchInvoices(address);
      hasVerifierRole(address).then((hasRole) => {
        setIsVerifier(hasRole);
        setIsCheckingRole(false);
      });
    } else {
      setIsCheckingRole(false);
    }
  }, [address, fetchInvoices, hasVerifierRole]);

  const handleGrantRole = async () => {
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
    } catch (err: any) {
      // Show concise error using toast
      let msg = err?.message || 'Error verifying invoice.';
      toast.error(msg);
    }
  };

  // Sort invoices: pending first, then verified
  const sortedInvoices = [...invoices].sort((a, b) => {
    if (a.isVerified === b.isVerified) {
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(); // Newest first
    }
    return a.isVerified ? 1 : -1; // Pending first
  });

  const pendingInvoices = sortedInvoices.filter(invoice => !invoice.isVerified);
  const verifiedInvoices = sortedInvoices.filter(invoice => invoice.isVerified);

  if (isCheckingRole || granting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{granting ? 'Granting Verifier Role...' : 'Checking permissions...'}</p>
        </div>
      </div>
    );
  }

  if (!isVerifier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center w-full max-w-md mx-auto">
          <div className="mb-8">
            {address && (
              <button onClick={handleGrantRole} disabled={granting} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 w-full">
                {granting ? 'Granting...' : 'Get Verifier Role'}
              </button>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
          <p className="text-gray-600 mb-4">You need the Verifier role to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Get Verifier Role button at the top, hidden if already verifier */}
      {address && !isVerifier && (
        <div className="mb-4">
          <button onClick={handleGrantRole} disabled={granting} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 w-full">
            {granting ? 'Granting...' : 'Get Verifier Role'}
          </button>
        </div>
      )}
      {/* Platform Fee Management */}
      <OwnerPlatformFees />
      
      {/* Invoice Verification */}
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Error loading invoices: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Invoice Management Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Invoice Management
            </CardTitle>
            <CardDescription>
              Manage and verify invoices for the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
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

              <TabsContent value="pending" className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : pendingInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No pending invoices to verify!</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              #{invoice.invoiceId}
                            </TableCell>
                            <TableCell>{invoice.creditAmount} USDC</TableCell>
                            <TableCell>{invoice.dueDate.toLocaleDateString()}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {invoice.supplier.slice(0, 6)}...{invoice.supplier.slice(-4)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                Pending
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <a 
                                href={invoice.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${invoice.ipfsHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500"
                              >
                                <FileText className="h-4 w-4" />
                                View
                              </a>
                            </TableCell>
                            <TableCell>
                              {!invoice.isVerified && (
                                <Button
                                  onClick={() => handleVerifyInvoice(invoice.id)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Verify
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="verified" className="mt-6">
                {verifiedInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No verified invoices yet.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Document</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verifiedInvoices.map((invoice) => (
                          <TableRow key={invoice.id} className="bg-green-50">
                            <TableCell className="font-medium">
                              #{invoice.invoiceId}
                            </TableCell>
                            <TableCell>{invoice.creditAmount} USDC</TableCell>
                            <TableCell>{invoice.dueDate.toLocaleDateString()}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {invoice.supplier.slice(0, 6)}...{invoice.supplier.slice(-4)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Verified
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <a 
                                href={invoice.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${invoice.ipfsHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500"
                              >
                                <FileText className="h-4 w-4" />
                                View
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Withdraw button example (show only for contract owner) */}
        {address?.toLowerCase() === CONTRACT_OWNER && (
          <div className="mb-4">
            <Button className="bg-green-700 hover:bg-green-800">Withdraw</Button>
          </div>
        )}
      </div>
    </div>
  );
} 