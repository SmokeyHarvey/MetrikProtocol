import { NextResponse } from 'next/server';
import { upsertKyc } from '@/lib/kycStore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const address = (formData.get('address') as string | null)?.toLowerCase() || undefined;
    const email = (formData.get('email') as string | null) || undefined;
    const fileNames: string[] = [];
    const companyName = (formData.get('companyName') as string | null) || undefined;
    const documentUrls = JSON.parse((formData.get('documentUrls') as string | null) || '[]');
    const imageUrls = JSON.parse((formData.get('imageUrls') as string | null) || '[]');

    // In dev, we just record the filenames; replace with private object storage in prod.
    for (const [key, value] of formData.entries()) {
      if (key === 'file' && value instanceof File) {
        fileNames.push(value.name);
      }
    }

    if (!address && !email) {
      return NextResponse.json({ error: 'Missing address or email' }, { status: 400 });
    }

    const id = address || email!;
    const record = await upsertKyc({
      id,
      email,
      walletAddress: address,
      companyName,
      documentPaths: fileNames,
      documentUrls,
      imageUrls,
      kycStatus: 'pending_review',
      rejectionReason: undefined,
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('KYC submit error', error);
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 });
  }
}


