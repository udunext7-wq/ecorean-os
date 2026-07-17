// MiniCAD 단가표 API — ECOREAN.PriceTable.v1
// GET  : 승인 단가(v_minicad_price_table) + 설정(minicad_config) → 전사 공유 단가표
// POST : 단가 제안 (staff+, DB의 minicad_propose_price 가 권한 검증) — admin 승인 전까지 미노출
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const [keys, cfg] = await Promise.all([
    supabase.from('v_minicad_price_table').select('price_key, price'),
    supabase
      .from('minicad_config')
      .select('overhead_pct, vat_pct')
      .eq('tenant_id', 'HQ')
      .maybeSingle(),
  ]);
  if (keys.error) return NextResponse.json({ error: keys.error.message }, { status: 500 });

  const items: Record<string, number> = {};
  for (const row of keys.data ?? []) {
    if (typeof row.price === 'number') items[row.price_key] = row.price;
  }
  return NextResponse.json({
    schema: 'ECOREAN.PriceTable.v1',
    source: 'supabase',
    items,
    config: cfg.data
      ? { overheadPct: Number(cfg.data.overhead_pct), vatPct: Number(cfg.data.vat_pct) }
      : undefined,
  });
}

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const priceKey = body?.priceKey;
  const price = body?.price;
  if (
    typeof priceKey !== 'string' ||
    !/^[A-Za-z0-9_.\-]{2,80}$/.test(priceKey) ||
    !Number.isInteger(price) ||
    price < 0
  ) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const { error } = await supabase.rpc('minicad_propose_price', {
    p_key: priceKey,
    p_price: price,
  });
  if (error) {
    const status = error.message.includes('NOT_AUTHORIZED') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ status: 'proposed', priceKey, price });
}
