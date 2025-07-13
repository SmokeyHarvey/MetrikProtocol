import { NextRequest } from 'next/server';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import invoiceNFTArtifact from '@/lib/contracts/abis/InvoiceNFT.json';

console.log('DEBUG: Node.js version:', process.version);

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
console.log('DEBUG grant-role API: RPC_URL =', RPC_URL);
const PRIVATE_KEY_OWNER = process.env.PRIVATE_KEY_OWNER!;
const INVOICE_NFT_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_NFT_ADDRESS!;

export async function POST(request: NextRequest) {
  const { role, address } = await request.json();
  if (!role || !address) {
    return new Response(JSON.stringify({ error: 'Missing role or address' }), { status: 400 });
  }

  try {
    // Direct fetch test
    console.log('DEBUG: Testing direct fetch to RPC_URL...');
    const fetchRes = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    const fetchData = await fetchRes.text();
    console.log('DEBUG: fetch direct result:', fetchData);

    console.log('DEBUG: Creating provider...');
    const provider = new JsonRpcProvider(RPC_URL, 5115);
    console.log('DEBUG: Provider created. Getting block number...');
    const block = await provider.getBlockNumber();
    console.log('DEBUG: Block number from provider:', block);

    console.log('DEBUG: Creating wallet...');
    const wallet = new Wallet(PRIVATE_KEY_OWNER);
    const signer = wallet.connect(provider);
    console.log('DEBUG: Wallet created. Address:', await signer.getAddress());

    console.log('DEBUG: Creating contract...');
    const contract = new Contract(INVOICE_NFT_ADDRESS, invoiceNFTArtifact.abi, signer);
    console.log('DEBUG: Contract created. Address:', contract.target);

    console.log('DEBUG: Sending grantRole transaction...');
    const tx = await contract.grantRole(role, address);
    await tx.wait();
    console.log('DEBUG: grantRole transaction sent. Tx hash:', tx.hash);
    return new Response(JSON.stringify({ success: true, txHash: tx.hash }), { status: 200 });
  } catch (err: unknown) {
    console.error('DEBUG: Error in grant-role API:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
} 