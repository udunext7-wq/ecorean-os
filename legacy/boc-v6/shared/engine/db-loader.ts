import type { CostItemDB, CostItem } from './types.ts'

interface RawCostItemsJson {
  costItems: CostItem[]
}

// cost-items-v2.json을 itemId 키의 Map으로 변환
export function loadCostItemDB(raw: RawCostItemsJson): CostItemDB {
  const db: CostItemDB = {}
  for (const item of raw.costItems) {
    db[item.itemId] = item
  }
  return db
}

// 브라우저/Electron 환경에서 JSON 파일을 fetch하여 DB 로드
export async function fetchCostItemDB(url: string): Promise<CostItemDB> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`DB 로드 실패: ${res.status} ${url}`)
  const raw = (await res.json()) as RawCostItemsJson
  return loadCostItemDB(raw)
}
