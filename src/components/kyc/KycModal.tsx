'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePrivy, useWallets } from '@privy-io/react-auth';

export default function KycModal() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets.find(w => w.walletClientType === 'privy' || (w.meta && w.meta.id === 'io.privy.wallet'))?.address;
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [docs, setDocs] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-kyc-modal', handler as any);
    return () => window.removeEventListener('open-kyc-modal', handler as any);
  }, []);

  if (!open) return null;

  const canSubmit = authenticated && (address || user?.email?.address) && companyName && (docs.length + images.length) > 0;

  const close = () => setOpen(false);

  const uploadToSupabase = async (folder: string, files: File[]) => {
    const urls: string[] = [];
    for (const file of files) {
      const key = `${folder}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('kyc').upload(key, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('kyc').getPublicUrl(key);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const folder = companyName.replace(/\s+/g, '-').toLowerCase();
      const documentUrls = await uploadToSupabase(folder, docs);
      const imageUrls = await uploadToSupabase(`${folder}/images`, images);

      const form = new FormData();
      if (address) form.set('address', address);
      if (!address && user?.email?.address) form.set('email', user.email.address);
      form.set('companyName', companyName);
      form.set('documentUrls', JSON.stringify(documentUrls));
      form.set('imageUrls', JSON.stringify(imageUrls));

      const res = await fetch('/api/kyc/submit', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Submit failed');
      alert('KYC submitted. We are reviewing your documents. You will gain access once verified.');
      setOpen(false);
    } catch (e) {
      console.error('KYC submit error', e);
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">KYC Verification</h2>
          <button onClick={close} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Business / Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Acme Inc" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Documents (PDF/JPG/PNG)</label>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocs(Array.from(e.target.files || []))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Captured Images (optional)</label>
            <input type="file" multiple accept="image/*" onChange={(e) => setImages(Array.from(e.target.files || []))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={close} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={submit} disabled={!canSubmit || submitting} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit for review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


