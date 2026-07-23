// 카카오 "나에게 보내기" 알림 — 상담신청 등 서버 이벤트를 대표 개인 카톡(나와의 채팅)으로 전송
// 토큰 보관: Supabase kakao_notify_tokens (RLS 차단, definer 함수 + REST 키 검증 경유)
// 연동(1회): 관리자 로그인 상태에서 /api/kakao/connect 방문 → 카카오 동의 → 콜백에서 토큰 저장
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const KAUTH = 'https://kauth.kakao.com';
const KAPI = 'https://kapi.kakao.com';

function restKey(): string | null {
  return process.env.KAKAO_REST_API_KEY?.trim() || null;
}

// CSRF 방지용 state — REST 키에서 파생 (URL에 키 원문 노출 방지)
export function kakaoState(): string {
  const key = restKey();
  if (!key) return '';
  return createHash('sha256').update(`ecorean-kakao-v1:${key}`).digest('hex').slice(0, 24);
}

export function kakaoAuthorizeUrl(redirectUri: string): string | null {
  const key = restKey();
  if (!key) return null;
  const q = new URLSearchParams({
    client_id: key,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'talk_message',
    state: kakaoState(),
  });
  return `${KAUTH}/oauth/authorize?${q}`;
}

// definer RPC 전용 클라이언트 (세션/쿠키 불필요)
function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type TokenRow = { access_token: string | null; access_expires_at: string | null; refresh_token: string | null };

async function loadTokens(): Promise<TokenRow | null> {
  const key = restKey();
  if (!key) return null;
  const { data, error } = await sb().rpc('kakao_get_tokens', { p_secret: key });
  if (error) {
    console.warn('[kakao] 토큰 조회 실패:', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as TokenRow) ?? null;
}

async function saveTokens(access: string, expiresInSec: number, refresh?: string | null): Promise<void> {
  const key = restKey();
  if (!key) return;
  const expiresAt = new Date(Date.now() + Math.max(0, expiresInSec - 60) * 1000).toISOString();
  const { error } = await sb().rpc('kakao_save_tokens', {
    p_secret: key,
    p_access: access,
    p_access_expires_at: expiresAt,
    p_refresh: refresh ?? null,
  });
  if (error) console.warn('[kakao] 토큰 저장 실패:', error.message);
}

type KauthTokenRes = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

async function kauthToken(params: Record<string, string>): Promise<KauthTokenRes> {
  const res = await fetch(`${KAUTH}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(8000),
  });
  return (await res.json().catch(() => ({}))) as KauthTokenRes;
}

// 연동 콜백: 인가 코드 → 토큰 교환·저장
export async function kakaoExchangeCode(code: string, redirectUri: string): Promise<{ ok: boolean; detail?: string }> {
  const key = restKey();
  if (!key) return { ok: false, detail: 'KAKAO_REST_API_KEY 미설정' };
  const json = await kauthToken({
    grant_type: 'authorization_code',
    client_id: key,
    redirect_uri: redirectUri,
    code,
  });
  if (!json.access_token) return { ok: false, detail: json.error_description ?? json.error ?? '토큰 교환 실패' };
  await saveTokens(json.access_token, json.expires_in ?? 21600, json.refresh_token ?? null);
  return { ok: true };
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const key = restKey();
  if (!key) return null;
  const json = await kauthToken({
    grant_type: 'refresh_token',
    client_id: key,
    refresh_token: refreshToken,
  });
  if (!json.access_token) {
    console.warn('[kakao] 토큰 갱신 실패:', json.error_description ?? json.error);
    return null;
  }
  // 카카오는 refresh_token 만료 1개월 전부터만 새 refresh_token을 내려준다
  await saveTokens(json.access_token, json.expires_in ?? 21600, json.refresh_token ?? null);
  return json.access_token;
}

async function getAccessToken(): Promise<string | null> {
  const row = await loadTokens();
  if (!row) return null;
  const fresh =
    row.access_token &&
    row.access_expires_at &&
    new Date(row.access_expires_at).getTime() > Date.now();
  if (fresh) return row.access_token;
  if (!row.refresh_token) return null;
  return refreshAccessToken(row.refresh_token);
}

// "나와의 채팅"으로 텍스트 알림 전송 (베스트 에포트 — 실패해도 throw 하지 않음)
export async function kakaoSendToMe(text: string): Promise<boolean> {
  try {
    let token = await getAccessToken();
    if (!token) return false;
    const send = async (t: string) =>
      fetch(`${KAPI}/v2/api/talk/memo/default/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: new URLSearchParams({
          template_object: JSON.stringify({
            object_type: 'text',
            text: text.slice(0, 1000),
            link: { web_url: 'https://ecorean.net', mobile_web_url: 'https://ecorean.net' },
            button_title: '사이트 열기',
          }),
        }),
        signal: AbortSignal.timeout(8000),
      });
    let res = await send(token);
    if (res.status === 401) {
      // access 토큰 무효 — 1회 강제 갱신 후 재시도
      const row = await loadTokens();
      if (!row?.refresh_token) return false;
      token = await refreshAccessToken(row.refresh_token);
      if (!token) return false;
      res = await send(token);
    }
    if (!res.ok) console.warn('[kakao] 발송 실패:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.warn('[kakao] 발송 오류:', (e as Error).message);
    return false;
  }
}
