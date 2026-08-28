// 국토교통부 건축HUB 건축물대장정보 서비스 공통 클라이언트 (2026-08-28)
// 서비스: https://www.data.go.kr/data/15134735/openapi.do  (표제부·층별개요·총괄표제부 동일 신청)
// 키(DATA_GO_KR_KEY)는 서버에서만 읽고 절대 브라우저로 내보내지 않는다.
// 한 지번에 여러 동(아파트 단지)이 있고 numOfRows 상한이 100 이므로 페이지를 끝까지 모은다.
import 'server-only';

const HUB = 'https://apis.data.go.kr/1613000/BldRgstHubService';
const MAX_ROWS = 100; // 공공데이터포털 상한 (초과 요청해도 100으로 잘림)

export const APPLY_URL = 'https://www.data.go.kr/data/15134735/openapi.do';
export const MY_KEY_URL = 'https://www.data.go.kr/iim/api/selectAPIAcountView.do';
export const CODE_URL = 'https://www.code.go.kr/stdcode/regCodeL.do';

export type HubOp = 'getBrTitleInfo' | 'getBrFlrOulnInfo' | 'getBrRecapTitleInfo';
export type Item = Record<string, string | number>;
export type Loc = { sigunguCd: string; bjdongCd: string; bun: string; ji: string; platGbCd: string };

/** 라우트에서 그대로 응답으로 바꿔 쓸 수 있는 실패 객체를 들고 다니는 오류 */
export class HubError extends Error {
  status: number;
  payload: Record<string, unknown>;
  constructor(status: number, payload: Record<string, unknown>) {
    super(String(payload.message ?? payload.error ?? 'HUB_ERROR'));
    this.status = status;
    this.payload = payload;
  }
}

export function govKey(): string | null {
  return process.env.DATA_GO_KR_KEY?.trim() || null;
}

export function requireKey(): string {
  const key = govKey();
  if (!key) {
    throw new HubError(503, {
      error: 'NO_API_KEY',
      message:
        '공공데이터포털 인증키가 설정되지 않았습니다. 활용신청 후 발급 키를 DATA_GO_KR_KEY 환경변수로 등록해 주세요.',
      applyUrl: APPLY_URL,
    });
  }
  return key;
}

/** 번·지는 4자리 0채움이 필수 (12 → 0012) */
export function pad4(v: string | null | undefined, fallback = '0'): string {
  const digits = (v ?? '').replace(/\D/g, '') || fallback;
  return digits.slice(-4).padStart(4, '0');
}

/** 요청 쿼리 → 지번 위치. 잘못된 입력은 HubError 로 던진다. */
export function parseLoc(sp: URLSearchParams): Loc {
  const sigunguCd = (sp.get('sigunguCd') ?? '').replace(/\D/g, '');
  const bjdongCd = (sp.get('bjdongCd') ?? '').replace(/\D/g, '');
  const bunRaw = (sp.get('bun') ?? '').replace(/\D/g, '');
  const platGbCd = sp.get('platGbCd') === '1' ? '1' : '0'; // 0 대지 · 1 산
  if (sigunguCd.length !== 5 || bjdongCd.length !== 5 || !bunRaw) {
    throw new HubError(400, {
      error: 'BAD_REQUEST',
      message: '시군구코드 5자리·법정동코드 5자리·번지가 필요합니다.',
      codeUrl: CODE_URL,
    });
  }
  return { sigunguCd, bjdongCd, bun: pad4(bunRaw), ji: pad4(sp.get('ji'), '0'), platGbCd };
}

function hubUrl(op: HubOp, key: string, loc: Loc, pageNo: number, rows: number): string {
  const q = new URLSearchParams({
    serviceKey: key,
    sigunguCd: loc.sigunguCd,
    bjdongCd: loc.bjdongCd,
    platGbCd: loc.platGbCd,
    bun: loc.bun,
    ji: loc.ji,
    numOfRows: String(rows),
    pageNo: String(pageNo),
    _type: 'json',
  });
  return `${HUB}/${op}?${q.toString()}`;
}

/** 한 페이지 호출 — 포털 공통 오류를 사용자 언어로 변환한다. */
async function hubPage(op: HubOp, loc: Loc, pageNo: number, rows: number) {
  const key = requireKey();
  let text: string;
  try {
    const res = await fetch(hubUrl(op, key, loc, pageNo, rows), { cache: 'no-store' });
    text = await res.text();
  } catch (e) {
    throw new HubError(502, {
      error: 'FETCH_FAILED',
      message: e instanceof Error ? e.message : String(e),
    });
  }
  if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
    throw new HubError(503, {
      error: 'NOT_APPLIED',
      message: '이 인증키로 건축물대장 API 활용신청이 되어 있지 않습니다.',
      applyUrl: APPLY_URL,
    });
  }
  if (text.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS')) {
    throw new HubError(503, {
      error: 'QUOTA',
      message:
        '오늘 공공데이터포털 호출 한도를 초과했습니다. 내일 다시 조회하거나 활용신청에서 한도 증액을 요청하세요.',
      applyUrl: APPLY_URL,
    });
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HubError(502, { error: 'UPSTREAM_ERROR', message: text.slice(0, 400) });
  }
  const body = (json as { response?: { body?: { items?: { item?: unknown }; totalCount?: number } } })?.response?.body;
  const raw = body?.items?.item;
  const items: Item[] = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Item[];
  return { items, totalCount: Number(body?.totalCount ?? items.length) };
}

/** totalCount 까지 페이지를 이어 받는다 (maxPages 로 호출량 상한). */
export async function hubAll(op: HubOp, loc: Loc, maxPages = 3) {
  const first = await hubPage(op, loc, 1, MAX_ROWS);
  const items = [...first.items];
  const pages = Math.min(maxPages, Math.max(1, Math.ceil(first.totalCount / MAX_ROWS)));
  for (let p = 2; p <= pages; p += 1) {
    const next = await hubPage(op, loc, p, MAX_ROWS);
    items.push(...next.items);
    if (next.items.length === 0) break;
  }
  return { items, totalCount: first.totalCount, pages, truncated: items.length < first.totalCount };
}

export const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : null;
};
const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
  return s.length ? s : null;
};

/** 캐시 테이블 컬럼과 1:1 로 맞춘 행 (upsert 대상) */
export type BuildingRow = {
  sigungu_cd: string;
  bjdong_cd: string;
  bun: string;
  ji: string;
  mgm_pk: string;
  address: string | null;
  bld_nm: string | null;
  main_purps: string | null;
  strct: string | null;
  plat_area: number | null;
  arch_area: number | null;
  tot_area: number | null;
  grnd_flr_cnt: number | null;
  ugrnd_flr_cnt: number | null;
  use_apr_day: string | null;
  raw: Record<string, unknown>;
};

export function toBuildingRow(it: Item, loc: Loc): BuildingRow {
  return {
    sigungu_cd: loc.sigunguCd,
    bjdong_cd: loc.bjdongCd,
    bun: loc.bun,
    ji: loc.ji,
    mgm_pk: String(it.mgmBldrgstPk ?? '0'),
    address: [it.platPlc, it.newPlatPlc].filter(Boolean).join(' / ') || null,
    bld_nm: str(it.bldNm),
    main_purps: str(it.mainPurpsCdNm),
    strct: str(it.strctCdNm),
    plat_area: num(it.platArea),
    arch_area: num(it.archArea),
    tot_area: num(it.totArea),
    grnd_flr_cnt: num(it.grndFlrCnt),
    ugrnd_flr_cnt: num(it.ugrndFlrCnt),
    use_apr_day: str(it.useAprDay),
    raw: it as unknown as Record<string, unknown>,
  };
}

/** 표제부 raw 에서 견적·공정에 실제로 쓰는 값만 뽑아낸다 (캐시 행에도 동일 적용) */
export function detailFrom(raw: Record<string, unknown> | null | undefined) {
  const r = (raw ?? {}) as Item;
  const parking =
    (num(r.indrMechUtcnt) ?? 0) +
    (num(r.oudrMechUtcnt) ?? 0) +
    (num(r.indrAutoUtcnt) ?? 0) +
    (num(r.oudrAutoUtcnt) ?? 0);
  return {
    dong_nm: str(r.dongNm),
    regstr_gb: str(r.regstrGbCdNm), // 일반 / 집합
    regstr_kind: str(r.regstrKindCdNm), // 표제부 / 총괄표제부
    main_atch: str(r.mainAtchGbCdNm), // 주건축물 / 부속건축물
    etc_purps: str(r.etcPurps),
    roof: str(r.roofCdNm),
    hhld_cnt: num(r.hhldCnt), // 세대
    fmly_cnt: num(r.fmlyCnt), // 가구
    ho_cnt: num(r.hoCnt), // 호
    heit: num(r.heit),
    bc_rat: num(r.bcRat),
    vl_rat: num(r.vlRat),
    tot_dong_area: num(r.totDongTotArea),
    elvt_cnt: (num(r.rideUseElvtCnt) ?? 0) + (num(r.emgenUseElvtCnt) ?? 0) || null,
    parking_cnt: parking || null,
    engr_grade: str(r.engrGrade),
    quake_applied: String(r.rserthqkDsgnApplyYn ?? '') === '1',
    quake_ablty: str(r.rserthqkAblty),
    pms_day: str(r.pmsDay), // 허가일
    stcns_day: str(r.stcnsDay), // 착공일
    new_plat_plc: str(r.newPlatPlc),
    plat_plc: str(r.platPlc),
  };
}

export type FloorRow = {
  mgm_pk: string;
  dong_nm: string | null;
  bld_nm: string | null;
  gb: string | null; // 지상 / 지하 / 옥탑
  flr_no: number | null;
  flr_nm: string | null;
  purps: string | null;
  etc_purps: string | null;
  strct: string | null;
  area: number | null;
};

export function toFloorRow(it: Item): FloorRow {
  return {
    mgm_pk: String(it.mgmBldrgstPk ?? '0'),
    dong_nm: str(it.dongNm),
    bld_nm: str(it.bldNm),
    gb: str(it.flrGbCdNm),
    flr_no: num(it.flrNo),
    flr_nm: str(it.flrNoNm),
    purps: str(it.mainPurpsCdNm),
    etc_purps: str(it.etcPurps),
    strct: str(it.strctCdNm),
    area: num(it.area),
  };
}

/** 층 정렬: 지하는 깊을수록 아래, 지상은 낮은 층부터, 옥탑은 맨 위 */
export function floorOrder(f: FloorRow): number {
  const n = f.flr_no ?? 0;
  if (f.gb === '지하') return -n;
  if (f.gb === '옥탑') return 1000 + n;
  return n;
}
