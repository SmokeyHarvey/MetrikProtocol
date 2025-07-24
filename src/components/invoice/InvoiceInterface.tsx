import React, { useState } from 'react';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, FileText, DollarSign, CheckCircle, XCircle, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { generateEIP681URI } from '@/utils/eip681';
import { useAccount } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';

export function InvoiceInterface() {
  const { wallets } = useWallets();
  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;
  const { 
    invoices, 
    isLoading, 
    error, 
    createInvoice,
    verifyInvoice,
    getInvoiceDetails,
    fetchInvoices,
    userInvoices
  } = useInvoiceNFT(address);

  // Helper to generate a unique invoice ID
  function generateInvoiceId(addr?: string) {
    if (!addr) return '';
    const short = addr.slice(-6);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `INV-${short}-${rand}`;
  }

  // Initialize form with automated fields
  React.useEffect(() => {
    if (address) {
      setNewInvoice((prev) => ({
        ...prev,
        supplier: address,
        uniqueId: generateInvoiceId(address),
      }));
    }
  }, [address]);

  const [newInvoice, setNewInvoice] = useState({
    supplier: '',
    uniqueId: '',
    amount: '',
    dueDate: '',
    metadata: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newInvoice.supplier || !newInvoice.uniqueId || !newInvoice.amount || !newInvoice.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      await createInvoice(
        newInvoice.supplier as `0x${string}`,
        newInvoice.uniqueId,
        newInvoice.amount,
        new Date(newInvoice.dueDate),
        newInvoice.metadata || 'ipfs://placeholder' // Use metadata if provided
      );
      
      // Reset form
      setNewInvoice({
        supplier: address || '',
        uniqueId: generateInvoiceId(address),
        amount: '',
        dueDate: '',
        metadata: '',
      });
      
      toast.success('Invoice NFT minted successfully!');
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast.error('Failed to create invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const handleVerifyInvoice = async (tokenId: string) => {
    try {
      setIsVerifying(true);
      await verifyInvoice(tokenId);
      toast.success('Invoice verified successfully!');
      // Refresh invoices
      if (address) {
        await fetchInvoices(address);
      }
    } catch (err) {
      console.error('Error verifying invoice:', err);
      toast.error('Failed to verify invoice');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusBadge = (isVerified: boolean) => {
    return isVerified ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Verified
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        <XCircle className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading invoices: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {invoices ? invoices.length : 0}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              All time invoices created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                ${invoices ? invoices.reduce((sum, inv) => sum + (Number(inv.creditAmount) / 1e18), 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined invoice value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Invoices</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {invoices ? invoices.filter(inv => inv.isVerified).length : 0}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {invoices ? invoices.filter(inv => !inv.isVerified).length : 0}
              </div>
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">Create Invoice NFT</TabsTrigger>
          <TabsTrigger value="all-invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="your-invoices">Your Invoices</TabsTrigger>
        </TabsList>

        {/* Create Invoice Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Invoice NFT</CardTitle>
              <CardDescription>
                Mint a new invoice NFT with metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier">Supplier Address</Label>
                    <Input
                      id="supplier"
                      type="text"
                      value={newInvoice.supplier}
                      readOnly
                      placeholder="0x..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="uniqueId">Unique Invoice ID</Label>
                    <Input
                      id="uniqueId"
                      type="text"
                      value={newInvoice.uniqueId}
                      readOnly
                      placeholder="Auto-generated"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount (USDC)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newInvoice.amount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                      placeholder="1000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="invoiceFile">Invoice Document (PDF/JPG/PNG)</Label>
                  <Input
                    id="invoiceFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      setUploadError(null);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const response = await fetch('/api/upload-to-ipfs', {
                          method: 'POST',
                          body: formData,
                        });
                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Failed to upload to IPFS');
                        }
                        const data = await response.json();
                        setNewInvoice((prev) => ({ ...prev, metadata: data.ipfsHash }));
                      } catch (err: any) {
                        setUploadError(err.message || 'Failed to upload');
                        setNewInvoice((prev) => ({ ...prev, metadata: '' }));
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                  {uploading && <div className="text-xs text-blue-600 mt-1">Uploading...</div>}
                  {uploadError && <div className="text-xs text-red-600 mt-1">{uploadError}</div>}
                </div>
                <div>
                  <Label htmlFor="metadata">Metadata (IPFS Hash)</Label>
                  <Textarea
                    id="metadata"
                    value={newInvoice.metadata}
                    readOnly
                    placeholder="Auto-filled after upload"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be auto-filled after uploading your invoice document.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Invoice NFT...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Invoice NFT
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Invoices Tab */}
        <TabsContent value="all-invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>
                View and manage all invoice NFTs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices && invoices.length > 0 ? (
                    invoices.map((invoice) => {
                      // Constants for EIP-681
                      const USDC_ADDRESS = '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // Mainnet USDC, replace as needed
                      const CHAIN_ID = 1; // Mainnet, replace as needed
                      const eip681 = generateEIP681URI({
                        tokenAddress: USDC_ADDRESS,
                        recipient: invoice.supplier,
                        amount: invoice.creditAmount,
                        decimals: 6,
                        chainId: CHAIN_ID,
                      });
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.invoiceId}</TableCell>
                          <TableCell>{invoice.supplier}</TableCell>
                          <TableCell>{(Number(invoice.creditAmount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</TableCell>
                          <TableCell>{invoice.dueDate ? new Date(Number(invoice.dueDate) * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(invoice.isVerified)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-2">
                              <a href={eip681} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Pay with Wallet</a>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Your Invoices Tab */}
        <TabsContent value="your-invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Invoices</CardTitle>
              <CardDescription>
                View and manage invoices you have created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userInvoices && userInvoices.length > 0 ? (
                    userInvoices.map((invoice) => {
                      // Constants for EIP-681
                      const USDC_ADDRESS = '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // Mainnet USDC, replace as needed
                      const CHAIN_ID = 1; // Mainnet, replace as needed
                      const eip681 = generateEIP681URI({
                        tokenAddress: USDC_ADDRESS,
                        recipient: invoice.supplier,
                        amount: invoice.creditAmount,
                        decimals: 6,
                        chainId: CHAIN_ID,
                      });
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.invoiceId}</TableCell>
                          <TableCell>{invoice.supplier}</TableCell>
                          <TableCell>{(Number(invoice.creditAmount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</TableCell>
                          <TableCell>{invoice.dueDate ? new Date(Number(invoice.dueDate) * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(invoice.isVerified)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-2">
                              <a href={eip681} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Pay with Wallet</a>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 