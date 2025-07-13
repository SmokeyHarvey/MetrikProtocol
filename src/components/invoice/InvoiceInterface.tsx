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

export function InvoiceInterface() {
  const { 
    invoices, 
    isLoading, 
    error, 
    createInvoice,
    verifyInvoice,
    getInvoiceDetails,
    fetchInvoices,
  } = useInvoiceNFT();
  
  // Get address from the hook or use a default
  const address = '0x0'; // This should be passed from parent or get from context

  const [newInvoice, setNewInvoice] = useState({
    supplier: '',
    uniqueId: '',
    amount: '',
    dueDate: '',
    metadata: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
        supplier: '',
        uniqueId: '',
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
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
                ${invoices ? invoices.reduce((sum, inv) => sum + parseFloat(inv.creditAmount), 0).toFixed(2) : '0.00'}
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
                      onChange={(e) => setNewInvoice({ ...newInvoice, supplier: e.target.value })}
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
                      onChange={(e) => setNewInvoice({ ...newInvoice, uniqueId: e.target.value })}
                      placeholder="INV-001"
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
                  <Label htmlFor="metadata">Metadata (IPFS Hash)</Label>
                  <Textarea
                    id="metadata"
                    value={newInvoice.metadata}
                    onChange={(e) => setNewInvoice({ ...newInvoice, metadata: e.target.value })}
                    placeholder="ipfs://QmYourMetadataHash or JSON metadata"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional: IPFS hash or JSON metadata for the invoice
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
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : invoices && invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.id}
                        </TableCell>
                        <TableCell>{invoice.invoiceId}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {invoice.supplier.slice(0, 6)}...{invoice.supplier.slice(-4)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {invoice.buyer.slice(0, 6)}...{invoice.buyer.slice(-4)}
                        </TableCell>
                        <TableCell>${invoice.creditAmount}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.isVerified)}</TableCell>
                        <TableCell>
                          {!invoice.isVerified && (
                            <Button
                              size="sm"
                              onClick={() => handleVerifyInvoice(invoice.id)}
                              disabled={isVerifying}
                            >
                              {isVerifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Verify'
                              )}
                            </Button>
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