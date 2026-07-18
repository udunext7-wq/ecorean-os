// 상담 신청 접수 (공개) — DB 저장이 1차 원천, 이메일은 알림 채널
// 1) site_inquiries 에 저장 (RLS: public insert / staff select)
// 2) FormSubmit 릴레이로 대표 메일에 알림 (실패해도 접수는 성공 처리 — DB에 남음)
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export const dynamic = 'force-dynamic';

const NOTIFY_EMAIL = 'udunext7@gmail.com';

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

  // 2) 메일 알림 (베스트 에포트)
  let emailSent = false;
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${NOTIFY_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `[에코리안 상담신청] ${name} (${serviceType ?? '유형 미선택'})`,
        _template: 'table',
        성함: name,
        연락처: phone,
        이메일: email ?? '미입력',
        '서비스 유형': serviceType ?? '미선택',
        '공간 규모': areaSize ?? '미선택',
        '문의 내용': message ?? '없음',
        접수경로: 'ecorean.net 상담신청 폼',
      }),
      signal: AbortSignal.timeout(8000),
    });
    emailSent = res.ok;
    if (!res.ok) console.warn('[contact] 메일 릴레이 실패:', res.status, await res.text());
  } catch (e) {
    console.warn('[contact] 메일 릴레이 오류:', (e as Error).message);
  }

  return NextResponse.json({ status: 'received', emailSent });
}
