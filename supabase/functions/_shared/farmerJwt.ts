// Custom JWT for farmer portal (Supabase auth not used for farmers)
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('FARMER_JWT_SECRET');
  if (!secret || secret.length < 32) {
    throw new Error('FARMER_JWT_SECRET is not configured or is too short (min 32 chars)');
  }
  const enc = new TextEncoder().encode(secret);
  return await crypto.subtle.importKey('raw', enc, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signFarmerJwt(payload: { farmer_id: string; phone: string }) {
  const key = await getKey();
  return await create(
    { alg: 'HS256', typ: 'JWT' },
    { ...payload, exp: getNumericDate(60 * 60 * 24) },
    key,
  );
}

export async function verifyFarmerJwt(token: string): Promise<{ farmer_id: string; phone: string } | null> {
  try {
    const key = await getKey();
    const payload = await verify(token, key) as any;
    if (!payload?.farmer_id) return null;
    return { farmer_id: payload.farmer_id, phone: payload.phone };
  } catch {
    return null;
  }
}
