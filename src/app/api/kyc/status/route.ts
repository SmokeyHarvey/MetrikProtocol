import { NextResponse } from 'next/server';
import { getKyc } from '@/lib/kycStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = (searchParams.get('address') || '').trim().toLowerCase();
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  const id = (address || email).replace(/^<|>$/g, '');
  if (!id) return NextResponse.json({ kycStatus: 'not_submitted' });
  const record = await getKyc(id);
  return NextResponse.json({ kycStatus: record?.kycStatus || 'not_submitted', record: record || null });
}


