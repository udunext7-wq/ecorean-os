// 공공데이터포털 — 국토교통부 건축HUB 건축물대장정보 서비스 프록시 (대표 지시 2026-08-27, 2026-08-28 완성)
// 신청: https://www.data.go.kr/data/15134735/openapi.do
// 키는 서버 환경변수 DATA_GO_KR_KEY 에만 두고 브라우저로 노출하지 않는다.
// op=title  표제부 — 한 지번의 전 동(numOfRows 100 상한이라 페이지를 끝까지 수집) + 캐시 우선
// op=floors 층별개요 — 동별 층 구성(용도·구조·면적). 리모델링 물량 산출의 기준.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/core/db/server';
import {
  APPLY_URL,
  HubError,
  detailFrom,
  floorOrder,
  hubAll,
  parseLoc,
  toBuildingRow,
  toFloorRow,
  type BuildingRow,
  type FloorRow,
  type Loc,
} from '@/sites/net/lib/gov-building';

export const dynamic = 'force-dynamic';

const CACHE_TTL_DAYS = 7; // 대장은 자주 바뀌지 않는다. 최신이 필요하면 fresh=1.
const FLOOR_TTL_DAYS = 30; // 층 구성은 증축·용도변경 때만 바뀐다.
const TITLE_MAX_PAGES = 3; // 최대 300동
const FLOOR_MAX_PAGES = 6; // 최대 600층

type CacheRow = BuildingRow & { fetched_at?: string | null };

/** 캐시 행·API 행 모두 같은 모양으로 화면에 내려준다. */
function toResponseRow(r: CacheRow) {
  const { raw, ...rest } = r;
  return { ...rest, ...detailFrom(raw as Record<string, unknown>) };
}

function sortByArea<T extends { tot_area: number | null }>(rows: T[]) {
  return [...rows].sort((a, b) => (b.tot_area ?? 0) - (a.tot_area ?? 0));
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const op = sp.get('op') === 'floors' ? 'floors' : 'title';
  const fresh = sp.get('fresh') === '1';

  let loc: Loc;
  try {
    loc = parseLoc(sp);
  } catch (e) {
    if (e instanceof HubError) return NextResponse.json(e.payload, { status: e.status });
    throw e;
  }

  try {
    if (op === 'floors') return await floors(supabase, loc, fresh);
    return await title(supabase, loc, fresh);
  } catch (e) {
    if (e instanceof HubError) return NextResponse.json(e.payload, { status: e.status });
    return NextResponse.json(
      { error: 'FETCH_FAILED', message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}

/** 표제부 — 캐시가 신선하면 그대로, 아니면 API 에서 전 동을 받아 캐시에 적재 */
async function title(
  supabase: ReturnType<typeof createServerSupabase>,
  loc: Loc,
  fresh: boolean,
) {
  // 캐시 조회 컬럼은 명시한다 (fetched_by 같은 내부 값이 화면으로 새지 않도록)
  const CACHE_COLS =
    'sigungu_cd,bjdong_cd,bun,ji,mgm_pk,address,bld_nm,main_purps,strct,plat_area,arch_area,tot_area,grnd_flr_cnt,ugrnd_flr_cnt,use_apr_day,raw,fetched_at';
  if (!fresh) {
    const { data } = await supabase
      .from('gov_building_cache')
      .select(CACHE_COLS)
      .eq('sigungu_cd', loc.sigunguCd)
      .eq('bjdong_cd', loc.bjdongCd)
      .eq('bun', loc.bun)
      .eq('ji', loc.ji);
    const rows = (data ?? []) as CacheRow[];
    const newest = rows.reduce((m, r) => (r.fetched_at && r.fetched_at > m ? r.fetched_at : m), '');
    const ageDays = newest ? (Date.now() - new Date(newest).getTime()) / 86400000 : Infinity;
    // 2026-08-28 이전 버전은 한 지번을 30동까지만 받아 캐시했다. 정확히 30동이면
    // 잘린 캐시일 가능성이 있으므로 API 에서 전 동을 다시 받는다.
    const maybeTruncatedCache = rows.length === 30;
    if (rows.length > 0 && ageDays <= CACHE_TTL_DAYS && !maybeTruncatedCache) {
      const out = sortByArea(rows.map(toResponseRow));
      return NextResponse.json({
        ok: true,
        source: 'cache',
        fetchedAt: newest || null,
        totalCount: out.length,
        returned: out.length,
        truncated: false,
        buildings: out,
        building: out[0],
      });
    }
  }

  const { items, totalCount, truncated } = await hubAll('getBrTitleInfo', loc, TITLE_MAX_PAGES);
  if (items.length === 0) {
    return NextResponse.json(
      {
        error: 'NOT_FOUND',
        message: '해당 지번의 건축물대장을 찾지 못했습니다. 코드·번지를 확인해 주세요. (산 번지는 "산" 선택 필요)',
        applyUrl: APPLY_URL,
      },
      { status: 404 },
    );
  }

  const rows = items.map((it) => toBuildingRow(it, loc));
  // 같은 지번에 같은 mgm_pk 가 두 번 오면 upsert 가 실패하므로 마지막 것만 남긴다.
  const unique = [...new Map(rows.map((r) => [r.mgm_pk, r])).values()];
  // fetched_at 의 기본값 now() 는 INSERT 에만 적용된다. 갱신 때도 시각을 새로 찍어야
  // 캐시 신선도(TTL) 판정이 맞는다.
  const now = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from('gov_building_cache')
    .upsert(
      unique.map((r) => ({ ...r, fetched_at: now })),
      { onConflict: 'sigungu_cd,bjdong_cd,bun,ji,mgm_pk' },
    );

  const out = sortByArea(unique.map(toResponseRow));
  return NextResponse.json({
    ok: true,
    source: 'api',
    fetchedAt: now,
    totalCount,
    returned: out.length,
    truncated,
    cacheError: upsertError?.message ?? null,
    buildings: out,
    building: out[0],
  });
}

type DongFloors = { mgm_pk: string; dong_nm: string | null; bld_nm: string | null; floors: FloorRow[] };

/** 층별개요 — 지번 전체를 받아 동(mgm_pk)별로 묶는다. 층 구성은 거의 바뀌지 않아 캐시를 길게 쓴다. */
async function floors(supabase: ReturnType<typeof createServerSupabase>, loc: Loc, fresh: boolean) {
  if (!fresh) {
    const { data } = await supabase
      .from('gov_building_floor_cache')
      .select('mgm_pk,dong_nm,bld_nm,floors,fetched_at')
      .eq('sigungu_cd', loc.sigunguCd)
      .eq('bjdong_cd', loc.bjdongCd)
      .eq('bun', loc.bun)
      .eq('ji', loc.ji);
    const rows = (data ?? []) as Array<{
      mgm_pk: string;
      dong_nm: string | null;
      bld_nm: string | null;
      floors: FloorRow[];
      fetched_at: string;
    }>;
    const newest = rows.reduce((m, r) => (r.fetched_at > m ? r.fetched_at : m), '');
    const ageDays = newest ? (Date.now() - new Date(newest).getTime()) / 86400000 : Infinity;
    if (rows.length > 0 && ageDays <= FLOOR_TTL_DAYS) {
      const byDong: Record<string, DongFloors> = {};
      let count = 0;
      for (const r of rows) {
        byDong[r.mgm_pk] = { mgm_pk: r.mgm_pk, dong_nm: r.dong_nm, bld_nm: r.bld_nm, floors: r.floors ?? [] };
        count += r.floors?.length ?? 0;
      }
      return NextResponse.json({
        ok: true,
        source: 'cache',
        fetchedAt: newest,
        totalCount: count,
        returned: count,
        truncated: false,
        dongCount: rows.length,
        byDong,
      });
    }
  }

  const { items, totalCount, truncated } = await hubAll('getBrFlrOulnInfo', loc, FLOOR_MAX_PAGES);
  const byDong: Record<string, DongFloors> = {};
  for (const it of items) {
    const f = toFloorRow(it);
    const g = (byDong[f.mgm_pk] ??= { mgm_pk: f.mgm_pk, dong_nm: f.dong_nm, bld_nm: f.bld_nm, floors: [] });
    g.floors.push(f);
  }
  for (const g of Object.values(byDong)) g.floors.sort((a, b) => floorOrder(a) - floorOrder(b));

  const now = new Date().toISOString();
  const { error: cacheError } = await supabase.from('gov_building_floor_cache').upsert(
    Object.values(byDong).map((g) => ({
      sigungu_cd: loc.sigunguCd,
      bjdong_cd: loc.bjdongCd,
      bun: loc.bun,
      ji: loc.ji,
      mgm_pk: g.mgm_pk,
      dong_nm: g.dong_nm,
      bld_nm: g.bld_nm,
      floors: g.floors,
      floor_cnt: g.floors.length,
      area_sum: g.floors.reduce((s, f) => s + (f.area ?? 0), 0),
      fetched_at: now,
    })),
    { onConflict: 'sigungu_cd,bjdong_cd,bun,ji,mgm_pk' },
  );

  return NextResponse.json({
    ok: true,
    source: 'api',
    fetchedAt: now,
    totalCount,
    returned: items.length,
    truncated,
    cacheError: cacheError?.message ?? null,
    dongCount: Object.keys(byDong).length,
    byDong,
  });
}
