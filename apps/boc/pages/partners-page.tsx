// 시공거래처(협력업체) — 한 창 (대표 지시 2026-08-28)
//
// 설계 원칙: "저장은 한 곳, 표시는 한 창".
//   왼쪽 = 거래처 목록 / 오른쪽 = 선택한 거래처의 탭.
//   기본정보·계약·단가 탭만 쓰기이고, 스케줄·거래이력 탭은 기존 work_* 테이블을
//   거래처 기준으로 읽어오기만 한다. 여기에 사본을 저장하면 5번째 사일로가 된다.
//
// 이 화면이 메우는 구멍: 그전까지 거래처는 발주서 vendor_name, 계산서 counterparty,
//   공사일보 workers 에 각각 문자열로만 존재했고 공정표에는 업체 칸조차 없었다.
import Link from 'next/link';
import { createServerSupabase } from '@/core/db/server';
import type {
  PartnerRow,
  PartnerOverviewRow,
  PartnerContractRow,
  PartnerPriceRow,
  PartnerScheduleRow,
  ProcessGroupRow,
} from '@/core/db/types';
import { PageHeader, Card, Badge, Table, THead, Th, Td, Button } from '@/core/ui';
import { formatKRW } from '@/shared/utils/format';
import { SearchForm } from '../components/SearchForm';
import { PartnerBasicForm, PartnerContractForm, PartnerPriceForm } from '../components/PartnerForms';
import { decidePartnerPrice } from '../actions';

export interface PartnersSearchParams {
  q?: string;
  kind?: string;
  tg?: string;
  sel?: string;
  tab?: string;
}

const TABS = [
  { key: 'info', label: '기본정보' },
  { key: 'contract', label: '계약' },
  { key: 'price', label: '단가' },
  { key: 'schedule', label: '스케줄' },
  { key: 'history', label: '거래이력' },
] as const;

const STATUS_BADGE: Record<string, { label: string; tone: 'ok' | 'warn' | 'neutral' }> = {
  ACTIVE: { label: '거래중', tone: 'ok' },
  SUSPENDED: { label: '일시중지', tone: 'warn' },
  TERMINATED: { label: '거래종료', tone: 'neutral' },
};

const CONTRACT_BADGE: Record<string, { label: string; tone: 'ok' | 'warn' | 'neutral' }> = {
  DRAFT: { label: '작성중', tone: 'warn' },
  ACTIVE: { label: '유효', tone: 'ok' },
  EXPIRED: { label: '만료', tone: 'neutral' },
  TERMINATED: { label: '해지', tone: 'neutral' },
};

/** 현재 필터를 유지한 채 링크를 만든다 */
function hrefWith(sp: PartnersSearchParams, patch: Partial<PartnersSearchParams>): string {
  const merged = { ...sp, ...patch };
  const qs = new URLSearchParams();
  (['q', 'kind', 'tg', 'sel', 'tab'] as const).forEach((k) => {
    const v = merged[k];
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `/boc/partners?${s}` : '/boc/partners';
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: PartnersSearchParams;
}) {
  const sp = searchParams ?? {};
  const q = (sp.q ?? '').trim();
  const kind = (sp.kind ?? '').trim();
  const tg = (sp.tg ?? '').trim();
  const sel = (sp.sel ?? '').trim();
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as string) : 'info';

  const supabase = createServerSupabase();

  // 공정군 = 작업내용의 축 (정적 목록 대신 DB 참조 — 통찰 #3)
  const groupsRes = await supabase
    .from('process_groups')
    .select('id, tenant_id, code, name, color')
    .order('code');
  const groups = (groupsRes.data ?? []) as ProcessGroupRow[];
  const groupName = new Map(groups.map((g) => [g.code, g.name]));

  // 목록 — v_partner_overview 가 기존 work_* 를 집계해준다
  let listQuery = supabase
    .from('v_partner_overview')
    .select('*')
    .order('status')
    .order('name')
    .limit(300);
  if (q) {
    listQuery = listQuery.or(
      `name.ilike.%${q}%,partner_code.ilike.%${q}%,rep_name.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }
  if (kind) listQuery = listQuery.contains('kinds', [kind]);
  if (tg) listQuery = listQuery.contains('trade_groups', [tg]);

  const listRes = await listQuery;
  const list = (listRes.data ?? []) as PartnerOverviewRow[];

  // 선택된 거래처의 상세 — 탭에 필요한 것만 병렬로
  let partner: PartnerRow | null = null;
  let contracts: PartnerContractRow[] = [];
  let prices: PartnerPriceRow[] = [];
  let schedule: PartnerScheduleRow[] = [];
  let pos: { id: string; po_no: string | null; order_date: string | null; total_amount: number | null; status: string | null }[] = [];
  let invoices: { id: string; invoice_type: string | null; issue_date: string | null; total_amount: number | null; item_desc: string | null }[] = [];
  let costItems: { id: string; code: string | null; name: string; unit: string | null }[] = [];

  if (sel) {
    const [pRes, cRes, prRes, sRes, poRes, ivRes, ciRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', sel).maybeSingle(),
      supabase.from('partner_contracts').select('*').eq('partner_id', sel).order('start_date', { ascending: false }),
      supabase.from('partner_prices').select('*').eq('partner_id', sel).order('is_approved').order('item_name'),
      supabase
        .from('work_schedule_items')
        .select('id, site_id, process_name, process_code, start_date, end_date, progress, work_sites(name)')
        .eq('partner_id', sel)
        .order('start_date', { ascending: true })
        .limit(200),
      supabase
        .from('work_purchase_orders')
        .select('id, po_no, order_date, total_amount, status')
        .eq('partner_id', sel)
        .order('order_date', { ascending: false })
        .limit(100),
      supabase
        .from('work_invoices')
        .select('id, invoice_type, issue_date, total_amount, item_desc')
        .eq('partner_id', sel)
        .order('issue_date', { ascending: false })
        .limit(100),
      supabase.from('cost_items').select('id, code, name, unit').order('code').limit(1000),
    ]);
    partner = (pRes.data as PartnerRow | null) ?? null;
    contracts = (cRes.data ?? []) as PartnerContractRow[];
    prices = (prRes.data ?? []) as PartnerPriceRow[];
    schedule = (sRes.data ?? []) as unknown as PartnerScheduleRow[];
    pos = (poRes.data ?? []) as typeof pos;
    invoices = (ivRes.data ?? []) as typeof invoices;
    costItems = (ciRes.data ?? []) as typeof costItems;
  }

  const overview = list.find((r) => r.partner_id === sel) ?? null;

  return (
    <div>
      <PageHeader
        title="시공거래처"
        description="시공·자재·장비·운반 한 명부. 스케줄·거래이력 탭은 기존 발주·계산서·공정표를 거래처 기준으로 읽어오는 것이며 사본을 저장하지 않습니다."
        actions={
          <Link href={hrefWith(sp, { sel: undefined, tab: 'info' })}>
            <Button>+ 새 거래처</Button>
          </Link>
        }
      />

      {/* 필터 */}
      <div className="mb-4 space-y-2">
        <SearchForm action="/boc/partners" placeholder="상호·코드·대표자·연락처 검색" defaultValue={q} />
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-faint">구분</span>
          <Link href={hrefWith(sp, { kind: undefined })} className={chip(!kind)}>전체</Link>
          {['시공', '자재', '장비', '운반'].map((k) => (
            <Link key={k} href={hrefWith(sp, { kind: k })} className={chip(kind === k)}>{k}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-faint">공정군</span>
          <Link href={hrefWith(sp, { tg: undefined })} className={chip(!tg)}>전체</Link>
          {groups.map((g) => (
            <Link key={g.code} href={hrefWith(sp, { tg: g.code })} className={chip(tg === g.code)}>
              {g.name}
            </Link>
          ))}
        </div>
      </div>

      {listRes.error ? (
        <p className="text-sm text-danger">조회 오류: {listRes.error.message}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* ── 좌: 거래처 목록 ── */}
        <div className="space-y-2">
          <p className="text-xs text-faint">{list.length.toLocaleString('ko-KR')}개 업체</p>
          <div className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
            {list.map((r) => {
              const active = r.partner_id === sel;
              const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.ACTIVE;
              return (
                <Link
                  key={r.partner_id}
                  href={hrefWith(sp, { sel: r.partner_id, tab })}
                  className={`block rounded-lg border p-3 transition-colors ${
                    active
                      ? 'border-brand-500 bg-panel2'
                      : 'border-stroke bg-panel hover:bg-panel2'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-cream">{r.name}</span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-faint">{r.partner_code}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(r.kinds ?? []).map((k) => (
                      <span key={k} className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] text-brand-500">
                        {k}
                      </span>
                    ))}
                    {(r.trade_groups ?? []).slice(0, 4).map((c) => (
                      <span key={c} className="rounded bg-panel2 px-1.5 py-0.5 text-[10px] text-muted">
                        {groupName.get(c) ?? c}
                      </span>
                    ))}
                    {(r.trade_groups ?? []).length > 4 ? (
                      <span className="text-[10px] text-faint">+{r.trade_groups.length - 4}</span>
                    ) : null}
                  </div>
                  {r.pending_prices > 0 ? (
                    <p className="mt-1 text-[11px] text-warn">미승인 단가 {r.pending_prices}건</p>
                  ) : null}
                </Link>
              );
            })}
            {list.length === 0 ? (
              <Card>
                <p className="text-sm text-faint">
                  {q || kind || tg ? '조건에 맞는 거래처가 없습니다' : '등록된 거래처가 없습니다'}
                </p>
              </Card>
            ) : null}
          </div>
        </div>

        {/* ── 우: 선택한 거래처 ── */}
        <div>
          {/* 탭 */}
          {sel && partner ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-cream">{partner.name}</h2>
                  <p className="font-mono text-xs text-faint">
                    {partner.partner_code}
                    {partner.biz_reg_no ? ` · ${partner.biz_reg_no}` : ''}
                  </p>
                </div>
                {overview ? (
                  <div className="flex gap-4 text-right text-xs">
                    <div>
                      <p className="text-faint">발주 누계</p>
                      <p className="tabular-nums text-cream">{formatKRW(overview.po_amount)}</p>
                    </div>
                    <div>
                      <p className="text-faint">계산서 누계</p>
                      <p className="tabular-nums text-cream">{formatKRW(overview.invoice_amount)}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mb-4 flex flex-wrap gap-1.5 border-b border-stroke pb-2">
                {TABS.map((t) => (
                  <Link
                    key={t.key}
                    href={hrefWith(sp, { sel, tab: t.key })}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      tab === t.key
                        ? 'bg-brand-600 font-semibold text-ink'
                        : 'text-muted hover:bg-panel2 hover:text-cream'
                    }`}
                  >
                    {t.label}
                    {t.key === 'price' && overview && overview.pending_prices > 0
                      ? ` (${overview.pending_prices})`
                      : ''}
                  </Link>
                ))}
              </div>

              {tab === 'info' ? (
                <Card>
                  <PartnerBasicForm partner={partner} groups={groups} />
                </Card>
              ) : null}

              {tab === 'contract' ? (
                <div className="space-y-4">
                  {contracts.length > 0 ? (
                    <Table>
                      <THead>
                        <tr>
                          <Th>계약명</Th>
                          <Th>기간</Th>
                          <Th>지급</Th>
                          <Th>하자보증</Th>
                          <Th>안전서류 만료</Th>
                          <Th>상태</Th>
                        </tr>
                      </THead>
                      <tbody className="divide-y divide-stroke">
                        {contracts.map((c) => {
                          const b = CONTRACT_BADGE[c.status] ?? CONTRACT_BADGE.DRAFT;
                          const expiring =
                            c.safety_docs_expire_at !== null &&
                            c.safety_docs_expire_at <= new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
                          return (
                            <tr key={c.id} className="hover:bg-panel2">
                              <Td className="font-medium text-cream">{c.title}</Td>
                              <Td className="whitespace-nowrap text-xs">
                                {c.start_date ?? '—'} ~ {c.end_date ?? '—'}
                              </Td>
                              <Td className="text-xs">
                                {c.payment_cycle ?? '—'}
                                {c.payment_day ? ` · ${c.payment_day}일` : ''}
                              </Td>
                              <Td className="text-xs">{c.warranty_months ? `${c.warranty_months}개월` : '—'}</Td>
                              <Td className="text-xs">
                                {c.safety_docs_expire_at ? (
                                  expiring ? (
                                    <Badge tone="danger">{c.safety_docs_expire_at}</Badge>
                                  ) : (
                                    c.safety_docs_expire_at
                                  )
                                ) : (
                                  '—'
                                )}
                              </Td>
                              <Td>
                                <Badge tone={b.tone}>{b.label}</Badge>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-sm text-faint">등록된 계약이 없습니다.</p>
                  )}
                  <Card>
                    <p className="mb-3 text-sm font-semibold text-cream">계약 추가</p>
                    <PartnerContractForm partnerId={sel} />
                  </Card>
                </div>
              ) : null}

              {tab === 'price' ? (
                <div className="space-y-4">
                  {prices.length > 0 ? (
                    <Table>
                      <THead>
                        <tr>
                          <Th>공정군</Th>
                          <Th>품목</Th>
                          <Th>단위</Th>
                          <Th className="text-right">계약단가</Th>
                          <Th className="text-right">표준(등록시점)</Th>
                          <Th>적용기간</Th>
                          <Th>승인</Th>
                        </tr>
                      </THead>
                      <tbody className="divide-y divide-stroke">
                        {prices.map((r) => (
                          <tr key={r.id} className="hover:bg-panel2">
                            <Td className="text-xs">
                              {r.trade_group ? (groupName.get(r.trade_group) ?? r.trade_group) : '—'}
                            </Td>
                            <Td className="font-medium text-cream">{r.item_name}</Td>
                            <Td className="text-xs">{r.unit ?? '—'}</Td>
                            <Td className="text-right tabular-nums">{formatKRW(r.contract_price)}</Td>
                            <Td className="text-right tabular-nums text-muted">
                              {formatKRW(r.std_price_snapshot)}
                            </Td>
                            <Td className="whitespace-nowrap text-xs">
                              {r.effective_from} ~ {r.effective_to ?? '—'}
                            </Td>
                            <Td>
                              {r.is_approved ? (
                                <Badge tone="ok">승인</Badge>
                              ) : (
                                <div className="flex gap-1.5">
                                  <Badge tone="warn">미승인</Badge>
                                  <form action={decidePartnerPrice}>
                                    <input type="hidden" name="price_id" value={r.id} />
                                    <input type="hidden" name="partner_id" value={sel} />
                                    <input type="hidden" name="decision" value="approve" />
                                    <Button type="submit" className="px-2 py-0.5 text-[11px]">
                                      승인
                                    </Button>
                                  </form>
                                </div>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-sm text-faint">등록된 단가가 없습니다.</p>
                  )}
                  <Card>
                    <p className="mb-1 text-sm font-semibold text-cream">단가 추가</p>
                    <p className="mb-3 text-xs text-faint">
                      표준 단가표를 고르면 그 시점 표준값이 함께 기록되고, 계약단가를 넣으면 이 업체에는
                      계약단가가 우선 적용됩니다.
                      {costItems.length === 0
                        ? ' (현재 cost_items 가 비어 있어 표준 참조 목록이 없습니다 — 직접 입력으로 등록됩니다)'
                        : ''}
                    </p>
                    <PartnerPriceForm partnerId={sel} groups={groups} costItems={costItems} />
                  </Card>
                </div>
              ) : null}

              {tab === 'schedule' ? (
                <div className="space-y-3">
                  <p className="text-xs text-faint">
                    공정표(work_schedule_items)에서 이 업체가 배정된 공정을 읽어옵니다. 배정은 공정표
                    화면에서 하고, 여기서는 저장하지 않습니다.
                  </p>
                  {schedule.length > 0 ? (
                    <Table>
                      <THead>
                        <tr>
                          <Th>현장</Th>
                          <Th>공정</Th>
                          <Th>시작</Th>
                          <Th>종료</Th>
                          <Th className="text-right">진행률</Th>
                        </tr>
                      </THead>
                      <tbody className="divide-y divide-stroke">
                        {schedule.map((s) => (
                          <tr key={s.id} className="hover:bg-panel2">
                            <Td>{s.work_sites?.name ?? '—'}</Td>
                            <Td className="font-medium text-cream">{s.process_name ?? '—'}</Td>
                            <Td className="whitespace-nowrap text-xs">{s.start_date ?? '—'}</Td>
                            <Td className="whitespace-nowrap text-xs">{s.end_date ?? '—'}</Td>
                            <Td className="text-right tabular-nums">
                              {s.progress === null ? '—' : `${s.progress}%`}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-sm text-faint">
                      배정된 공정이 없습니다. 공정표에서 이 업체를 배정하면 여기에 나타납니다.
                    </p>
                  )}
                </div>
              ) : null}

              {tab === 'history' ? (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-cream">발주</p>
                    {pos.length > 0 ? (
                      <Table>
                        <THead>
                          <tr>
                            <Th>발주번호</Th>
                            <Th>발주일</Th>
                            <Th className="text-right">금액</Th>
                            <Th>상태</Th>
                          </tr>
                        </THead>
                        <tbody className="divide-y divide-stroke">
                          {pos.map((r) => (
                            <tr key={r.id} className="hover:bg-panel2">
                              <Td className="font-mono text-xs">{r.po_no ?? '—'}</Td>
                              <Td className="whitespace-nowrap text-xs">{r.order_date ?? '—'}</Td>
                              <Td className="text-right tabular-nums">{formatKRW(r.total_amount)}</Td>
                              <Td className="text-xs">{r.status ?? '—'}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <p className="text-sm text-faint">발주 이력이 없습니다.</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-cream">계산서</p>
                    {invoices.length > 0 ? (
                      <Table>
                        <THead>
                          <tr>
                            <Th>발행일</Th>
                            <Th>구분</Th>
                            <Th>품목</Th>
                            <Th className="text-right">금액</Th>
                          </tr>
                        </THead>
                        <tbody className="divide-y divide-stroke">
                          {invoices.map((r) => (
                            <tr key={r.id} className="hover:bg-panel2">
                              <Td className="whitespace-nowrap text-xs">{r.issue_date ?? '—'}</Td>
                              <Td className="text-xs">{r.invoice_type ?? '—'}</Td>
                              <Td>{r.item_desc ?? '—'}</Td>
                              <Td className="text-right tabular-nums">{formatKRW(r.total_amount)}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <p className="text-sm text-faint">계산서 이력이 없습니다.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <Card>
              <p className="mb-1 text-sm font-semibold text-cream">
                {sel ? '거래처를 찾을 수 없습니다' : '새 거래처 등록'}
              </p>
              <p className="mb-4 text-xs text-faint">
                왼쪽 목록에서 업체를 고르면 계약·단가·스케줄·거래이력이 이 자리에 열립니다.
              </p>
              <PartnerBasicForm partner={null} groups={groups} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean): string {
  return `rounded-full px-2.5 py-1 ${
    active ? 'bg-brand-600 font-semibold text-ink' : 'bg-panel text-muted hover:bg-panel2'
  }`;
}
