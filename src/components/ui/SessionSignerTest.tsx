'use client';

import { useState, useEffect } from 'react';
import { useSessionSigner } from '@/hooks/useSessionSigner';
import { useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

export function SessionSignerTest() {
  const { wallets } = useWallets();
  const { executeSeamlessTransaction, encodeApproval, encodeStake, addSessionSignerToWallet } = useSessionSigner();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('45');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [configStatus, setConfigStatus] = useState<'checking' | 'configured' | 'not-configured'>('checking');

  const privyWallet = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'));
  const address = privyWallet?.address;

  // Check configuration status
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/test-env');
        const data = await response.json();
        
        if (data.hasPrivyAppSecret && data.hasPrivyAppId) {
          setConfigStatus('configured');
        } else {
          setConfigStatus('not-configured');
        }
      } catch (error) {
        setConfigStatus('not-configured');
      }
    };

    checkConfig();
  }, []);

  const testSeamlessStaking = async () => {
    if (!amount || !duration || !address) return;
    
    try {
      setIsLoading(true);
      setResult('Testing seamless staking...');
      
      const stakingContractAddress = CONTRACT_ADDRESSES.STAKING;
      const metrikTokenAddress = CONTRACT_ADDRESSES.METRIK_TOKEN;
      
      console.log('Debug - Contract addresses:', {
        stakingContractAddress,
        metrikTokenAddress,
      });
      
      console.log('Debug - Amount:', amount, 'Duration:', duration);
      console.log('Debug - Parsed amount:', parseFloat(amount));
      
      // Convert amount to BigInt properly
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      console.log('Debug - BigInt amount:', amountInWei);
      console.log('Debug - BigInt duration:', BigInt(duration));
      
      // Encode approval transaction
      const approvalData = encodeApproval(
        metrikTokenAddress,
        stakingContractAddress,
        amountInWei
      );
      
      // Convert duration from DAYS to SECONDS (contract expects seconds)
      const durationInSeconds = BigInt(parseInt(duration) * 24 * 60 * 60);
      
      // Encode staking transaction
      const stakeData = encodeStake(
        amountInWei,
        durationInSeconds
      );
      
      // Execute approval transaction
      setResult('Executing approval transaction...');
      const approvalHash = await executeSeamlessTransaction(
        metrikTokenAddress,
        approvalData,
        0n,
        5115
      );
      
      // Execute staking transaction
      setResult('Executing staking transaction...');
      const stakeHash = await executeSeamlessTransaction(
        stakingContractAddress,
        stakeData,
        0n,
        5115
      );
      
      setResult(`Success! Approval: ${approvalHash}, Stake: ${stakeHash}`);
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Session signer test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testSimpleTransaction = async () => {
    try {
      setIsLoading(true);
      setResult('Testing simple transaction...');
      
      // Simple transaction to test session signer
      const testData = '0x'; // Empty data for testing
      const hash = await executeSeamlessTransaction(
        address!, // Send to self
        testData,
        0n,
        5115
      );
      
      setResult(`Simple transaction successful: ${hash}`);
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Simple transaction test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testSessionSignerConfig = async () => {
    try {
      setIsLoading(true);
      setResult('Testing session signer configuration...');
      
      // Test the API directly with a simple request
      const response = await fetch('/api/session-signer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identityToken: 'test',
          action: 'signTransaction',
          transaction: {
            to: address,
            data: '0x',
            value: '0x0',
            chainId: 5115
          }
        })
      });
      
      const result = await response.json();
      console.log('Session signer test result:', result);
      
      if (result.error) {
        setResult(`Configuration Error: ${result.error}`);
      } else {
        setResult(`Configuration Test: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Session signer config test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testSessionSignerInit = async () => {
    try {
      setIsLoading(true);
      setResult('Testing session signer initialization...');
      
      // Test the new initialization API
      const response = await fetch('/api/test-session-signer');
      const result = await response.json();
      
      console.log('Session signer init test result:', result);
      
      if (result.status === 'initialized') {
        setResult(`✅ Initialized: ${result.error || result.message}`);
      } else if (result.status === 'error') {
        setResult(`❌ Error: ${result.error}`);
      } else {
        setResult(`Status: ${result.status} - ${result.message || result.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Session signer init test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (configStatus) {
      case 'checking':
        return 'Checking configuration...';
      case 'configured':
        return '✅ Environment variables configured';
      case 'not-configured':
        return '❌ Environment variables not configured';
      default:
        return 'Unknown status';
    }
  };

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Signer Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Please connect your Privy wallet to test session signers.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Signer Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>Wallet Address:</strong> {address}</p>
          <p><strong>Configuration Status:</strong> {getStatusMessage()}</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="amount">Amount to Stake</Label>
          <Input
            id="amount"
            type="number"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (days)</Label>
          <Input
            id="duration"
            type="number"
            placeholder="45"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={testSessionSignerInit}
            disabled={isLoading}
            variant="outline"
          >
            Test Init
          </Button>
          
          <Button
            onClick={testSessionSignerConfig}
            disabled={isLoading}
            variant="outline"
          >
            Test Config
          </Button>
          
          <Button
            onClick={testSimpleTransaction}
            disabled={isLoading}
            variant="outline"
          >
            Test Simple Transaction
          </Button>
          
          <Button
            onClick={testSeamlessStaking}
            disabled={isLoading || !amount || !duration}
          >
            Test Seamless Staking
          </Button>
          
          <Button
            onClick={() => address && addSessionSignerToWallet(address)}
            disabled={isLoading || !address}
            variant="outline"
          >
            Add Session Signers
          </Button>
        </div>
        
        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
            <strong>Result:</strong> {result}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-4">
          <p>This test demonstrates server-side transaction signing without user prompts.</p>
          <p>Check the browser console for detailed logs.</p>
          
          {configStatus === 'not-configured' && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <p><strong>⚠️ Setup Required:</strong></p>
              <ul className="list-disc list-inside mt-1">
                <li>✅ Install: <code>npm install @privy-io/server-auth</code></li>
                <li>❌ Add <code>PRIVY_APP_SECRET</code> to your environment variables</li>
                <li>❌ Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to your environment variables</li>
                <li>⚠️ Enable session signers in your Privy dashboard</li>
                <li>⚠️ Add session signers to your wallet using the button above</li>
              </ul>
              <p className="mt-2 text-blue-600">
                <strong>Next:</strong> Add environment variables and restart your dev server
              </p>
            </div>
          )}
          
          {configStatus === 'configured' && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <p><strong>✅ Environment Configured:</strong></p>
              <ul className="list-disc list-inside mt-1">
                <li>✅ Environment variables are set</li>
                <li>⚠️ Enable session signers in your Privy dashboard</li>
                <li>⚠️ Add session signers to your wallet using the button above</li>
              </ul>
              <p className="mt-2 text-blue-600">
                <strong>Next:</strong> Click "Add Session Signers" to enable seamless transactions
              </p>
            </div>
          )}
          
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p><strong>📚 Documentation:</strong></p>
            <ul className="list-disc list-inside mt-1">
              <li><a href="https://docs.privy.io/wallets/using-wallets/session-signers/use-session-signers" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Privy Session Signers Guide</a></li>
              <li><a href="https://docs.privy.io/recipes/wallets/session-signer-use-cases/server-side-access" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Server-side Access Guide</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🧪 Test Fallback Mechanism</h3>
          <p className="text-blue-700 mb-4">
            Since session signers aren't configured, the app will use regular wallet transactions as fallback.
            Try staking some tokens to test this functionality.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-blue-600">
              <strong>Expected behavior:</strong>
            </p>
            <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
              <li>Session signer will fail with "Invalid Privy app ID"</li>
              <li>App will automatically fallback to regular wallet transaction</li>
              <li>You'll see "Using regular wallet transaction..." message</li>
              <li>Wallet will prompt for transaction approval</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-2">✅ To Enable Session Signers</h3>
          <div className="space-y-2">
            <p className="text-sm text-green-700">
              <strong>Follow these steps in your Privy Dashboard:</strong>
            </p>
            <ol className="list-decimal list-inside text-sm text-green-700 space-y-1">
              <li>Go to <a href="https://dashboard.privy.io" target="_blank" rel="noopener noreferrer" className="underline font-medium">dashboard.privy.io</a></li>
              <li>Select your app: <code className="bg-green-100 px-1 rounded">cmd45wlum039ql20myccjcwpv</code></li>
              <li>Navigate to <strong>Configuration → Session Signers</strong></li>
              <li>Enable session signers for your app</li>
              <li>Configure any required policies</li>
              <li>Test again after configuration</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 