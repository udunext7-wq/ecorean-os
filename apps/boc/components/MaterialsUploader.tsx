'use client';

// 자재 설정 — 직접 추가 + CSV 일괄 업로드 (미리보기 후 등록)
// 등록은 서버 액션 → materials_upsert_batch(security definer, admin+ 검증) 경유
import { useMemo, useState, useTransition } from 'react';
import { uploadMaterials } from '../actions';

type ParsedRow = {
  name: string;
  brand: string;
  unit: string;
  unit_price: string;
  spec: string;
  notes: string;
};

const CSV_HEADER = '자재명,브랜드,단위,단가,규격,비고';

function parseCsv(text: string): { rows: ParsedRow[]; skipped: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const line of lines) {
    // 헤더 행은 건너뛴다
    if (line.startsWith('자재명') || line.toLowerCase().startsWith('name')) continue;
    const cols = line.split(',').map((c) => c.trim());
    if (!cols[0]) {
      skipped += 1;
      continue;
    }
    rows.push({
      name: cols[0],
      brand: cols[1] ?? '',
      unit: cols[2] ?? '',
      unit_price: (cols[3] ?? '').replace(/[^\d]/g, ''),
      spec: cols[4] ?? '',
      notes: cols.slice(5).join(',') ?? '',
    });
  }
  return { rows, skipped };
}

const inputCls =
  'w-full rounded-md border border-stroke bg-panel px-3 py-2 text-sm text-cream outline-none focus:border-brand-500';

export function MaterialsUploader() {
  const [tab, setTab] = useState<'single' | 'csv'>('single');
  const [csvText, setCsvText] = useState('');
  const [sourceDetail, setSourceDetail] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = useMemo(() => parseCsv(csvText), [csvText]);

  function submitRows(rows: Record<string, string>[]) {
    setResult(null);
    startTransition(async () => {
      const res = await uploadMaterials(rows, sourceDetail || null);
      setResult(
        res.ok
          ? { ok: true, message: `✅ ${res.count}건 등록 완료 — 통합 자재 목록에 반영되었습니다.` }
          : { ok: false, message: `등록 실패: ${res.error}` },
      );
      if (res.ok && tab === 'csv') setCsvText('');
    });
  }

  function onSingleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const row = {
      name: String(fd.get('name') ?? ''),
      brand: String(fd.get('brand') ?? ''),
      unit: String(fd.get('unit') ?? ''),
      unit_price: String(fd.get('unit_price') ?? '').replace(/[^\d]/g, ''),
      spec: String(fd.get('spec') ?? ''),
      notes: String(fd.get('notes') ?? ''),
    };
    if (!row.name.trim()) return;
    submitRows([row]);
    e.currentTarget.reset();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvText(await f.text());
    e.target.value = '';
  }

  const tabBtn = (active: boolean) =>
    `rounded-md px-4 py-2 text-sm font-semibold transition ${
      active ? 'bg-brand-600 text-ink' : 'bg-panel text-muted hover:text-cream'
    }`;

  return (
    <div className="rounded-xl border border-stroke bg-panel2 p-4">
      <div className="mb-4 flex gap-2">
        <button type="button" className={tabBtn(tab === 'single')} onClick={() => setTab('single')}>
          자재 직접 추가
        </button>
        <button type="button" className={tabBtn(tab === 'csv')} onClick={() => setTab('csv')}>
          CSV 일괄 업로드
        </button>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-faint">출처 메모 (선택 — 예: 거래처 단가표명·견적일)</label>
        <input
          className={inputCls}
          value={sourceDetail}
          onChange={(e) => setSourceDetail(e.target.value)}
          placeholder="예: ○○상사 단가표 2026-07"
        />
      </div>

      {tab === 'single' ? (
        <form onSubmit={onSingleSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs text-faint">자재명 *</label>
            <input name="name" required className={inputCls} placeholder="예: 강마루 ○○" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-faint">브랜드</label>
            <input name="brand" className={inputCls} placeholder="예: 신화모젤" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-faint">단위</label>
            <input name="unit" className={inputCls} placeholder="예: box, ㎡, 롤" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-faint">단가(원)</label>
            <input name="unit_price" inputMode="numeric" className={inputCls} placeholder="예: 115000" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-faint">규격</label>
            <input name="spec" className={inputCls} placeholder="예: 7.5T×125×1200, 20PCS/BOX" />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="mb-1 block text-xs text-faint">비고</label>
            <input name="notes" className={inputCls} placeholder="시공비·철거비 등 메모" />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-ink hover:bg-brand-400 disabled:opacity-50"
            >
              {pending ? '등록 중…' : '자재 등록'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <p className="mb-2 text-xs text-muted">
            형식: <code className="rounded bg-panel px-1 py-0.5">{CSV_HEADER}</code> — 첫 줄 헤더는 자동으로
            건너뜁니다. 엑셀에서 CSV로 저장하거나 표를 복사해 붙여넣으세요.
          </p>
          <div className="mb-2 flex items-center gap-3">
            <label className="cursor-pointer rounded-md border border-stroke bg-panel px-3 py-1.5 text-xs text-cream hover:border-brand-500">
              CSV 파일 선택
              <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onFile} />
            </label>
            <span className="text-xs text-faint">또는 아래에 직접 붙여넣기</span>
          </div>
          <textarea
            className={`${inputCls} h-40 font-mono text-xs`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`${CSV_HEADER}\n강그린 와이드,신화모젤,box,115000,7.5T×125×1200,철거 27500`}
          />
          {parsed.rows.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-xs text-muted">
                미리보기 — {parsed.rows.length}건{parsed.skipped ? ` (빈 행 ${parsed.skipped}건 제외)` : ''}
              </p>
              <div className="max-h-56 overflow-auto rounded-md border border-stroke">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-panel">
                    <tr>
                      {['자재명', '브랜드', '단위', '단가', '규격', '비고'].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-faint">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-t border-stroke">
                        <td className="px-2 py-1 text-cream">{r.name}</td>
                        <td className="px-2 py-1 text-muted">{r.brand || '—'}</td>
                        <td className="px-2 py-1 text-muted">{r.unit || '—'}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-muted">
                          {r.unit_price ? Number(r.unit_price).toLocaleString() : '—'}
                        </td>
                        <td className="px-2 py-1 text-muted">{r.spec || '—'}</td>
                        <td className="px-2 py-1 text-muted">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 100 ? (
                <p className="mt-1 text-xs text-faint">…외 {parsed.rows.length - 100}건 (전체 등록됩니다)</p>
              ) : null}
              <button
                type="button"
                disabled={pending || parsed.rows.length > 500}
                onClick={() => submitRows(parsed.rows as unknown as Record<string, string>[])}
                className="mt-3 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-ink hover:bg-brand-400 disabled:opacity-50"
              >
                {pending ? '등록 중…' : `${parsed.rows.length}건 일괄 등록`}
              </button>
              {parsed.rows.length > 500 ? (
                <p className="mt-1 text-xs text-danger">한 번에 최대 500건까지 등록할 수 있습니다.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {result ? (
        <p className={`mt-4 text-sm ${result.ok ? 'text-brand-400' : 'text-danger'}`}>{result.message}</p>
      ) : null}
    </div>
  );
}
