// / — 공개 랜딩. "업무시스템" 클릭 → 로그인 (로그인 상태면 미들웨어가 /boc 로 보냄)
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <p className="text-3xl font-bold tracking-tight text-brand-700">ECOREAN</p>
        <p className="mt-2 text-sm text-slate-500">에코리안 내부 운영 시스템 — ecorean.net</p>
      </div>

      <Link
        href="/login"
        className="rounded-xl bg-brand-600 px-10 py-4 text-lg font-semibold text-white shadow-md transition-colors hover:bg-brand-700"
      >
        업무시스템
      </Link>

      <div className="text-center text-sm text-slate-500">
        <p>
          직원 계정이 없으신가요?{' '}
          <Link href="/signup" className="font-medium text-brand-600 hover:underline">
            회원가입
          </Link>
          {' · '}
          <Link href="/request-role" className="font-medium text-brand-600 hover:underline">
            승급 신청
          </Link>
        </p>
        <p className="mt-2">
          고객이신가요?{' '}
          <a href="https://ecorean.kr" className="font-medium text-brand-600 hover:underline">
            ecorean.kr 고객 홈페이지
          </a>
        </p>
      </div>
    </main>
  );
}
