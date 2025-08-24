import { NextResponse } from 'next/server';
import { listPending, upsertKyc, getKyc } from '@/lib/kycStore';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pending = await listPending();
  return NextResponse.json({ pending });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, reason } = body as { action: 'approve' | 'reject'; id: string; reason?: string };
    if (!action || !id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const normalizedId = String(id).trim().toLowerCase().replace(/^<|>$/g, '');

    if (action === 'reject') {
      const rec = await upsertKyc({ id: normalizedId, kycStatus: 'rejected', rejectionReason: reason || 'Not specified' });
      return NextResponse.json({ success: true, record: rec });
    }

    // Approve: issue a simple VC-like signed JWT (dev-only)
    const rec = await getKyc(normalizedId);
    const wallet = rec?.walletAddress || id;
    const issuer = process.env.ZKYC_ISSUER_DID || 'did:metrik:issuer';
    const secret = new TextEncoder().encode(process.env.ZKYC_ISSUER_SECRET || 'dev-secret-change-me');

    const vcPayload = {
      iss: issuer,
      sub: `did:pkh:eip155:1:${wallet}`,
      iat: Math.floor(Date.now() / 1000),
      metrik: {
        kycVerified: true,
        verifiedBy: 'ProtocolVerifier',
      },
    };

    const jwt = await new SignJWT(vcPayload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(secret);

    const updated = await upsertKyc({ id: normalizedId, kycStatus: 'verified', verifiableCredential: { jwt, payload: vcPayload } });
    return NextResponse.json({ success: true, record: updated });
  } catch (error) {
    console.error('KYC admin error', error);
    return NextResponse.json({ error: 'Admin action failed' }, { status: 500 });
  }
}


