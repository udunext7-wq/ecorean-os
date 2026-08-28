// 거래처 입력 폼 — 서버 컴포넌트 + server action (클라이언트 JS 불필요)
// 쓰기는 전부 actions.ts → DB security definer 함수 경유 (헌법 3조).
import { Input, Button, Card } from '@/core/ui';
import type {
  PartnerRow,
  PartnerContractRow,
  ProcessGroupRow,
  PartnerPriceRow,
} from '@/core/db/types';
import { PARTNER_KINDS } from '@/core/db/types';
import { savePartner, savePartnerContract, savePartnerPrice } from '../actions';

const LABEL = 'mb-1 block text-xs font-medium text-muted';
const FIELD = 'flex flex-col';
const SELECT =
  'rounded-md border border-stroke bg-ink px-3 py-2 text-sm text-cream focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
const TEXTAREA = `${SELECT} min-h-20`;

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${FIELD} ${className}`}>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

/** 기본정보 — 신원 + 겸업 구분 + 작업내용(공정군) */
export function PartnerBasicForm({
  partner,
  groups,
}: {
  partner: PartnerRow | null;
  groups: ProcessGroupRow[];
}) {
  const p = partner;
  return (
    <form action={savePartner} className="space-y-4">
      {p ? <input type="hidden" name="id" value={p.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="상호 *">
          <Input name="name" defaultValue={p?.name ?? ''} required placeholder="○○설비" />
        </Field>
        <Field label="대표자">
          <Input name="rep_name" defaultValue={p?.rep_name ?? ''} />
        </Field>
        <Field label="사업자등록번호">
          <Input
            name="biz_reg_no"
            defaultValue={p?.biz_reg_no ?? ''}
            placeholder="숫자만 (무등록 인력팀은 비워두세요)"
          />
        </Field>
        <Field label="연락처">
          <Input name="phone" defaultValue={p?.phone ?? ''} />
        </Field>
        <Field label="이메일">
          <Input name="email" type="email" defaultValue={p?.email ?? ''} />
        </Field>
        <Field label="우편번호">
          <Input name="zipcode" defaultValue={p?.zipcode ?? ''} />
        </Field>
        <Field label="주소" className="sm:col-span-2">
          <Input name="address" defaultValue={p?.address ?? ''} />
        </Field>
      </div>

      {/* 대표 결정 1 — 한 명부. 한 업체가 시공+자재를 겸할 수 있으므로 다중 선택 */}
      <Card>
        <p className="text-sm font-semibold text-cream">거래 구분 (겸업 가능)</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {PARTNER_KINDS.map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-sm text-cream/90">
              <input
                type="checkbox"
                name="kinds"
                value={k}
                defaultChecked={p?.kinds?.includes(k) ?? false}
                className="accent-brand-500"
              />
              {k}
            </label>
          ))}
        </div>
      </Card>

      {/* 작업내용 = 공정군 C01~C16. 22 시공섹션(공간 축)이 아니다. */}
      <Card>
        <p className="text-sm font-semibold text-cream">
          작업내용 — 공정군{' '}
          <span className="font-normal text-faint">
            (견적 공정 → 가능 업체 자동 후보가 여기서 나온다)
          </span>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {groups.map((g) => (
            <label key={g.code} className="flex items-center gap-1.5 text-sm text-cream/90">
              <input
                type="checkbox"
                name="trade_groups"
                value={g.code}
                defaultChecked={p?.trade_groups?.includes(g.code) ?? false}
                className="accent-brand-500"
              />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: g.color ?? '#AAAAAA' }}
              />
              {g.name}
            </label>
          ))}
          {groups.length === 0 ? (
            <p className="col-span-full text-xs text-faint">
              공정군이 비어 있습니다 (process_groups 미적재)
            </p>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="계좌 은행">
          <Input name="bank_name" defaultValue={p?.bank_name ?? ''} />
        </Field>
        <Field label="계좌번호">
          <Input name="bank_account" defaultValue={p?.bank_account ?? ''} />
        </Field>
        <Field label="예금주">
          <Input name="bank_holder" defaultValue={p?.bank_holder ?? ''} />
        </Field>
        <Field label="등급">
          <select name="grade" defaultValue={p?.grade ?? ''} className={SELECT}>
            <option value="">—</option>
            {['A', 'B', 'C', 'D'].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="거래상태">
          <select name="status" defaultValue={p?.status ?? 'ACTIVE'} className={SELECT}>
            <option value="ACTIVE">거래중</option>
            <option value="SUSPENDED">일시중지</option>
            <option value="TERMINATED">거래종료</option>
          </select>
        </Field>
      </div>

      <Field label="메모">
        <textarea name="memo" defaultValue={p?.memo ?? ''} className={TEXTAREA} />
      </Field>

      <Button type="submit">{p ? '수정 저장' : '거래처 등록'}</Button>
    </form>
  );
}

/** 계약사항 — 기간 조건. 발주(건별)와 분리된 이유를 화면에도 적어둔다. */
export function PartnerContractForm({
  partnerId,
  contract,
}: {
  partnerId: string;
  contract?: PartnerContractRow | null;
}) {
  const c = contract ?? null;
  return (
    <form action={savePartnerContract} className="space-y-4">
      <input type="hidden" name="partner_id" value={partnerId} />
      {c ? <input type="hidden" name="id" value={c.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="계약명 *">
          <Input name="title" defaultValue={c?.title ?? ''} required placeholder="2026년 연간 단가계약" />
        </Field>
        <Field label="계약번호">
          <Input name="contract_no" defaultValue={c?.contract_no ?? ''} />
        </Field>
        <Field label="계약 시작일">
          <Input name="start_date" type="date" defaultValue={c?.start_date ?? ''} />
        </Field>
        <Field label="계약 종료일">
          <Input name="end_date" type="date" defaultValue={c?.end_date ?? ''} />
        </Field>
      </div>

      <Card>
        <p className="text-sm font-semibold text-cream">지급조건</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <Field label="지급주기">
            <select name="payment_cycle" defaultValue={c?.payment_cycle ?? ''} className={SELECT}>
              <option value="">—</option>
              <option value="MONTHLY">월정산</option>
              <option value="PER_ORDER">발주 건별</option>
              <option value="MILESTONE">기성 단계별</option>
            </select>
          </Field>
          <Field label="마감일">
            <Input name="payment_closing_day" type="number" min={1} max={31} defaultValue={c?.payment_closing_day ?? ''} />
          </Field>
          <Field label="결제일">
            <Input name="payment_day" type="number" min={1} max={31} defaultValue={c?.payment_day ?? ''} />
          </Field>
          <Field label="유보율 (%)">
            <Input name="retention_rate" type="number" step="0.01" min={0} max={100} defaultValue={c?.retention_rate ?? ''} />
          </Field>
          <Field label="지급조건 상세" className="sm:col-span-2">
            <Input name="payment_terms" defaultValue={c?.payment_terms ?? ''} placeholder="기성 70% / 준공 30%" />
          </Field>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-cream">보증 · 서류</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <Field label="하자보증 (개월)">
            <Input name="warranty_months" type="number" min={0} defaultValue={c?.warranty_months ?? ''} />
          </Field>
          <Field label="안전서류 만료일">
            <Input name="safety_docs_expire_at" type="date" defaultValue={c?.safety_docs_expire_at ?? ''} />
          </Field>
          <Field label="4대보험 만료일">
            <Input name="insurance_expire_at" type="date" defaultValue={c?.insurance_expire_at ?? ''} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-cream/90">
            <input
              type="checkbox"
              name="insurance_4major"
              defaultChecked={c?.insurance_4major ?? false}
              className="accent-brand-500"
            />
            4대보험 가입
          </label>
          <Field label="계약상태">
            <select name="status" defaultValue={c?.status ?? 'DRAFT'} className={SELECT}>
              <option value="DRAFT">작성중</option>
              <option value="ACTIVE">유효</option>
              <option value="EXPIRED">만료</option>
              <option value="TERMINATED">해지</option>
            </select>
          </Field>
        </div>
      </Card>

      <Field label="메모">
        <textarea name="memo" defaultValue={c?.memo ?? ''} className={TEXTAREA} />
      </Field>

      <Button type="submit">{c ? '계약 수정' : '계약 추가'}</Button>
    </form>
  );
}

/**
 * 업체별 단가 — 대표 결정 2("둘 다").
 * 표준 단가표(cost_items)를 고르면 그 시점 표준값이 스냅샷으로 남고,
 * 계약단가를 넣으면 그 업체에는 계약단가가 우선한다.
 * 저장은 항상 '미승인' — 승인은 admin+ 만.
 */
export function PartnerPriceForm({
  partnerId,
  groups,
  costItems,
  price,
}: {
  partnerId: string;
  groups: ProcessGroupRow[];
  costItems: { id: string; code: string | null; name: string; unit: string | null }[];
  price?: PartnerPriceRow | null;
}) {
  const r = price ?? null;
  return (
    <form action={savePartnerPrice} className="space-y-3">
      <input type="hidden" name="partner_id" value={partnerId} />
      {r ? <input type="hidden" name="id" value={r.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="표준 단가표 참조 (선택)">
          <select name="cost_item_id" defaultValue={r?.cost_item_id ?? ''} className={SELECT}>
            <option value="">직접 입력 (표준 미참조)</option>
            {costItems.map((ci) => (
              <option key={ci.id} value={ci.id}>
                {ci.code ? `[${ci.code}] ` : ''}
                {ci.name}
                {ci.unit ? ` (${ci.unit})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="공정군">
          <select name="trade_group" defaultValue={r?.trade_group ?? ''} className={SELECT}>
            <option value="">—</option>
            {groups.map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="품목명 *">
          <Input name="item_name" defaultValue={r?.item_name ?? ''} required />
        </Field>
        <Field label="단위">
          <Input name="unit" defaultValue={r?.unit ?? ''} placeholder="㎡ / 개 / 식" />
        </Field>
        <Field label="계약단가 (원)">
          <Input
            name="contract_price"
            inputMode="numeric"
            defaultValue={r?.contract_price ?? ''}
            placeholder="비우면 표준단가를 따른다"
          />
        </Field>
        <Field label="적용 시작일">
          <Input name="effective_from" type="date" defaultValue={r?.effective_from ?? ''} />
        </Field>
        <Field label="적용 종료일">
          <Input name="effective_to" type="date" defaultValue={r?.effective_to ?? ''} />
        </Field>
        <Field label="비고">
          <Input name="notes" defaultValue={r?.notes ?? ''} />
        </Field>
      </div>

      <p className="text-xs text-faint">
        저장하면 <b>미승인</b> 상태로 들어갑니다. 관리자(admin) 승인 전에는 견적에 쓰이지 않습니다 —
        헌법 9조.
      </p>
      <Button type="submit">{r ? '단가 수정 (승인 초기화)' : '단가 제안'}</Button>
    </form>
  );
}
