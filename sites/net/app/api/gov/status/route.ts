// 공공데이터포털 연동 상태 — 인증키 설정 여부만 알려준다 (키 값은 절대 노출하지 않음)
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    hasKey: Boolean(process.env.DATA_GO_KR_KEY),
    applyUrl: 'https://www.data.go.kr/data/15134735/openapi.do',
    codeUrl: 'https://www.code.go.kr/stdcode/regCodeL.do',
  });
}
