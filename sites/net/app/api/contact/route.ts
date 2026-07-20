// 상담 신청 접수 (공개) — DB 저장이 1차 원천, 이메일은 알림 채널
// 1) site_inquiries 에 저장 (RLS: public insert / staff select)
// 2) Resend 로 대표 메일에 알림 (실패해도 접수는 성공 처리 — DB에 남음)
//    도메인(ecorean.net) 인증 전에는 from=onboarding@resend.dev / to=계정 소유자만 가능
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export const dynamic = 'force-dynamic';

const NOTIFY_EMAIL = 'udunext7@gmail.com';
const FROM = process.env.CONTACT_FROM ?? 'ECOREAN 상담신청 <onboarding@resend.dev>';

function esc(s: string | null): string {
  return (s ?? '—').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s.length > 0 ? s : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = clean(body?.name, 60);
  const phone = clean(body?.phone, 40);
  const email = clean(body?.email, 120);
  const serviceType = clean(body?.service_type, 60);
  const areaSize = clean(body?.area_size, 60);
  const message = clean(body?.message, 2000);

  if (!name || !phone) {
    return NextResponse.json({ error: 'NAME_PHONE_REQUIRED' }, { status: 400 });
  }

  // 1) DB 저장 (원천)
  const supabase = createServerSupabase();
  const { error } = await supabase.from('site_inquiries').insert({
    name,
    phone,
    email,
    service_type: serviceType,
    area_size: areaSize,
    message,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2) 메일 알림 (Resend, 베스트 에포트)
  let emailSent = false;
  try {
    const rows: [string, string | null][] = [
      ['성함', name],
      ['연락처', phone],
      ['이메일', email],
      ['서비스 유형', serviceType],
      ['공간 규모', areaSize],
      ['문의 내용', message],
    ];
    const html =
      `<h2 style="margin:0 0 12px">에코리안 상담 신청</h2>` +
      `<table style="border-collapse:collapse;font-size:14px">` +
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 14px 6px 0;color:#888;white-space:nowrap">${k}</td>` +
            `<td style="padding:6px 0">${esc(v)}</td></tr>`,
        )
        .join('') +
      `</table><p style="color:#999;font-size:12px;margin-top:16px">접수 경로: ecorean.net 상담신청 폼 · 접수 내역은 DB(site_inquiries)에도 저장됩니다</p>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY_EMAIL],
        reply_to: email ?? undefined,
        subject: `[에코리안 상담신청] ${name} (${serviceType ?? '유형 미선택'})`,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    emailSent = res.ok;
    if (!res.ok) console.warn('[contact] Resend 발송 실패:', res.status, await res.text());
  } catch (e) {
    console.warn('[contact] Resend 발송 오류:', (e as Error).message);
  }

  return NextResponse.json({ status: 'received', emailSent });
}
