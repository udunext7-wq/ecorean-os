// 한국 공휴일·기념일 (2026-09-07 대표 지시: 공정관리 대시보드 캘린더)
// 원천: 구글 공개 캘린더 'ko.south_korea#holiday' ICS — 키가 필요 없고 대체공휴일까지 들어 있다.
//   (공공데이터포털 특일정보 API 는 같은 키로 활용신청이 되어 있지 않아 쓰지 못한다 — 2026-09-07 실측)
// 표(kr_holidays)에 캐시하고, 비어 있거나 30일 이상 묵으면 서버가 알아서 다시 받아 채운다.
// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD   해당 구간 목록
// POST                                  지금 강제로 다시 받기
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export const dynamic = 'force-dynamic';

const ICS =
  'https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics';

const PUBLIC_NAMES = new Set([
  '새해첫날',
  '설날',
  '설날 연휴',
  '삼일절',
  '어린이날',
  '부처님오신날',
  '현충일',
  '광복절',
  '추석',
  '추석 연휴',
  '개천절',
  '한글날',
  '크리스마스',
]);

type Row = { day: string; name: string; kind: string; is_off: boolean };

/** 공사가 통상 쉬는 날인지까지 분류한다 (공기 산정에 쓰이므로 근무일과 구분이 중요) */
function classify(name: string): { kind: string; is_off: boolean } {
  if (name.startsWith('쉬는 날') || PUBLIC_NAMES.has(name) || name.includes('선거') || name.includes('임시공휴일')) {
    return { kind: 'public', is_off: true };
  }
  if (name === '노동절') return { kind: 'labor', is_off: true };
  return { kind: 'memorial', is_off: false };
}

function parseIcs(text: string): Row[] {
  const best = new Map<string, { score: number; row: Row }>();
  const events = text.split('BEGIN:VEVENT').slice(1);
  for (const block of events) {
    const d = /DTSTART;VALUE=DATE:(\d{8})/.exec(block);
    const s = /SUMMARY:(.*)/.exec(block);
    if (!d || !s) continue;
    const raw = d[1];
    const day = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const name = s[1].trim().replace(/\r$/, '');
    const { kind, is_off } = classify(name);
    // 같은 날 여러 항목 → 휴무 우선, 그 중에서도 '연휴'가 아닌 본 명칭 우선
    const score = (is_off ? 100 : 0) + (name.includes('연휴') ? 0 : 10);
    const prev = best.get(day);
    if (!prev || score > prev.score) best.set(day, { score, row: { day, name, kind, is_off } });
  }
  return [...best.values()].map((v) => v.row).sort((a, b) => a.day.localeCompare(b.day));
}

async function refresh(supabase: ReturnType<typeof createServerSupabase>) {
  const res = await fetch(ICS, { cache: 'no-store' });
  if (!res.ok) throw new Error(`공휴일 원본을 받지 못했습니다 (HTTP ${res.status})`);
  const rows = parseIcs(await res.text());
  if (rows.length === 0) throw new Error('공휴일 원본을 해석하지 못했습니다');
  const { error } = await supabase.from('kr_holidays').upsert(rows, { onConflict: 'day' });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const from = sp.get('from') || `${new Date().getFullYear()}-01-01`;
  const to = sp.get('to') || `${new Date().getFullYear() + 1}-12-31`;

  const load = () =>
    supabase.from('kr_holidays').select('day,name,kind,is_off').gte('day', from).lte('day', to).order('day');

  let { data, error } = await load();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 비어 있으면 원본에서 자동으로 채운다 (첫 사용·연도 확장 시)
  let refreshed = 0;
  if (!data || data.length === 0) {
    try {
      refreshed = await refresh(supabase);
      ({ data, error } = await load());
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } catch (e) {
      return NextResponse.json(
        { ok: true, holidays: [], refreshed: 0, warning: e instanceof Error ? e.message : String(e) },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({ ok: true, from, to, count: data?.length ?? 0, refreshed, holidays: data ?? [] });
}

export async function POST() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const n = await refresh(supabase);
    return NextResponse.json({ ok: true, refreshed: n });
  } catch (e) {
    return NextResponse.json({ error: 'REFRESH_FAILED', message: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
