// Simple in-memory KYC store with JSON file persistence for development.
// For production, replace with a proper database.

import { promises as fs } from 'fs';
import path from 'path';

export type KycStatus = 'not_submitted' | 'pending_review' | 'verified' | 'rejected';

export interface KycRecord {
  id: string; // address or email-based id
  email?: string;
  walletAddress?: string;
  createdAt: number;
  updatedAt: number;
  kycStatus: KycStatus;
  documentPaths: string[]; // server-side storage paths or IPFS CIDs (dev only)
  rejectionReason?: string;
  verifiableCredential?: any; // issued VC JSON
}

const DB_FILE = path.resolve(process.cwd(), '.kyc-db.json');

let loaded = false;
let records = new Map<string, KycRecord>();

async function load() {
  if (loaded) return;
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const arr: KycRecord[] = JSON.parse(data);
    records = new Map(arr.map(r => [r.id, r]));
  } catch {
    // ignore
  }
  loaded = true;
}

async function persist() {
  try {
    const arr = Array.from(records.values());
    await fs.writeFile(DB_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch {
    // ignore in dev
  }
}

export async function getKyc(id: string): Promise<KycRecord | null> {
  await load();
  return records.get(id) || null;
}

export async function upsertKyc(input: Partial<KycRecord> & { id: string }): Promise<KycRecord> {
  await load();
  const existing = records.get(input.id);
  const now = Date.now();
  const next: KycRecord = {
    id: input.id,
    email: input.email ?? existing?.email,
    walletAddress: input.walletAddress ?? existing?.walletAddress,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    kycStatus: (input.kycStatus ?? existing?.kycStatus ?? 'not_submitted') as KycStatus,
    documentPaths: input.documentPaths ?? existing?.documentPaths ?? [],
    rejectionReason: input.rejectionReason ?? existing?.rejectionReason,
    verifiableCredential: input.verifiableCredential ?? existing?.verifiableCredential,
  };
  records.set(next.id, next);
  await persist();
  return next;
}

export async function listPending(): Promise<KycRecord[]> {
  await load();
  return Array.from(records.values()).filter(r => r.kycStatus === 'pending_review');
}


