// 주소 → 법정동코드 변환 (2026-08-28)
// 건축물대장 API 는 "시군구코드 5 + 법정동코드 5 + 번 + 지" 로만 조회된다.
// 대표·직원이 코드를 외울 이유가 없으므로 주소 한 줄을 코드로 바꿔주는 계층을 둔다.
// 공급자 우선순위: ① 행정안전부 도로명주소 검색 API(JUSO_KEY) ② 카카오 로컬(KAKAO_REST_API_KEY)
// 둘 다 무료이고, 카카오 키는 이미 알림 연동에 쓰던 키를 그대로 재사용한다.
import 'server-only';

export const JUSO_APPLY_URL = 'https://business.juso.go.kr/addrlink/openApi/apiExprn.do';
export const KAKAO_APPLY_URL = 'https://developers.kakao.com/console/app';

export type AddrHit = {
  jibun: string; // 지번 주소
  road: string | null; // 도로명 주소
  bldNm: string | null; // 건물명
  sigunguCd: string;
  bjdongCd: string;
  bun: string; // 본번 (0채움 없음 — 화면 표시용, 조회 시 서버가 4자리로 맞춘다)
  ji: string; // 부번
  platGbCd: '0' | '1'; // 0 대지 · 1 산
};

export type AddrProvider = 'JUSO' | 'KAKAO';

export function addressProvider(): AddrProvider | null {
  if (process.env.JUSO_KEY?.trim()) return 'JUSO';
  if (process.env.KAKAO_REST_API_KEY?.trim()) return 'KAKAO';
  return null;
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

/** 행정안전부 도로명주소 검색 API — admCd(10자리) = 시군구(5) + 법정동(5) */
async function searchJuso(key: string, q: string, limit: number): Promise<AddrHit[]> {
  const url =
    'https://business.juso.go.kr/addrlink/addrLinkApi.do?' +
    new URLSearchParams({
      confmKey: key,
      currentPage: '1',
      countPerPage: String(limit),
      keyword: q,
      resultType: 'json',
    }).toString();
  const res = await fetch(url, { cache: 'no-store' });
  const json = (await res.json()) as {
    results?: {
      common?: { errorCode?: string; errorMessage?: string };
      juso?: Array<Record<string, string>> | null;
    };
  };
  const code = json.results?.common?.errorCode;
  if (code && code !== '0') {
    throw new Error(`도로명주소 API: ${json.results?.common?.errorMessage ?? code}`);
  }
  return (json.results?.juso ?? []).map((j) => {
    const adm = digits(j.admCd).padStart(10, '0');
    return {
      jibun: j.jibunAddr ?? '',
      road: j.roadAddr || null,
      bldNm: j.bdNm?.trim() || null,
      sigunguCd: adm.slice(0, 5),
      bjdongCd: adm.slice(5, 10),
      bun: digits(j.lnbrMnnm) || '0',
      ji: digits(j.lnbrSlno) || '0',
      platGbCd: j.mtYn === '1' ? '1' : '0',
    };
  });
}

/** 카카오 로컬 주소 검색 — address.b_code(10자리) = 법정동코드 */
async function searchKakao(key: string, q: string, limit: number): Promise<AddrHit[]> {
  const url =
    'https://dapi.kakao.com/v2/local/search/address.json?' +
    new URLSearchParams({ query: q, size: String(limit) }).toString();
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, cache: 'no-store' });
  if (res.status === 401 || res.status === 403) {
    // 알림용 REST 키라도 로컬(주소) API 는 카카오 개발자센터에서 별도로 열어야 하는 경우가 있다.
    throw new Error(
      '카카오 로컬(주소) API 권한이 없습니다. 카카오 개발자센터 → 내 앱 → 카카오맵(로컬) 활성화, 또는 도로명주소 API 키(JUSO_KEY)를 등록해 주세요.',
    );
  }
  if (!res.ok) throw new Error(`카카오 로컬 API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    documents?: Array<{
      address_name?: string;
      address?: {
        address_name?: string;
        b_code?: string;
        main_address_no?: string;
        sub_address_no?: string;
        mountain_yn?: string;
      } | null;
      road_address?: { address_name?: string; building_name?: string } | null;
    }>;
  };
  return (json.documents ?? [])
    .filter((d) => d.address?.b_code)
    .map((d) => {
      const b = digits(d.address?.b_code).padStart(10, '0');
      return {
        jibun: d.address?.address_name ?? d.address_name ?? '',
        road: d.road_address?.address_name || null,
        bldNm: d.road_address?.building_name?.trim() || null,
        sigunguCd: b.slice(0, 5),
        bjdongCd: b.slice(5, 10),
        bun: digits(d.address?.main_address_no) || '0',
        ji: digits(d.address?.sub_address_no) || '0',
        platGbCd: d.address?.mountain_yn === 'Y' ? '1' : '0',
      } as AddrHit;
    });
}

/** 주소 문자열 → 조회 파라미터 후보. 공급자 미설정이면 null 을 돌려준다. */
export async function searchAddress(q: string, limit = 10): Promise<{ provider: AddrProvider; hits: AddrHit[] } | null> {
  const provider = addressProvider();
  if (!provider) return null;
  const hits =
    provider === 'JUSO'
      ? await searchJuso(process.env.JUSO_KEY!.trim(), q, limit)
      : await searchKakao(process.env.KAKAO_REST_API_KEY!.trim(), q, limit);
  // 본번이 없는 결과(동 단위만 매칭)는 대장 조회에 쓸 수 없다.
  return { provider, hits: hits.filter((h) => h.bun && h.bun !== '0') };
}
