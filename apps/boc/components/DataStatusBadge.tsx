// 데이터 상태 뱃지 — 헌법 9조: 미확정 값은 숨기지 않고 '조사필요'로 드러낸다
import { Badge, type BadgeTone } from '@/core/ui';
import {
  ATTENTION_STATUSES,
  DATA_STATUS_LABEL,
  type DataStatus,
} from '@/shared/constants/data-status';

function toneOf(status: DataStatus): BadgeTone {
  if (status === 'VERIFIED' || status === 'OFFICIAL' || status === 'INTERNAL_VALIDATED') return 'ok';
  if (ATTENTION_STATUSES.includes(status)) return 'warn';
  return 'neutral';
}

export function DataStatusBadge({ status }: { status: DataStatus }) {
  return <Badge tone={toneOf(status)}>{DATA_STATUS_LABEL[status] ?? status}</Badge>;
}
