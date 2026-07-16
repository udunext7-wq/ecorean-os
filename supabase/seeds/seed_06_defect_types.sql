-- 자동 생성: generate-seeds.mjs — 직접 수정 금지, 원본 JSON 수정 후 재생성
-- 멱등: on conflict do update

insert into public.defect_types (tenant_id,defect_id,category,name,severity,typical_cause,repair_method,repair_cost_min,repair_cost_max,warranty_years,prevention,responsibility,check_timing,source,data_status,origin_dataset)
values
('HQ','DEF-WP-001','방수','욕실 바닥 누수','HIGH','방수층 파손·줄눈 탈락·배관 이음 불량','방수 재시공',500000,2000000,2,'방수 48h 양생 후 24h 물채움 테스트 필수','시공사','준공 직후·3개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-WP-002','방수','벽체 결로·곰팡이','MEDIUM','단열 불량·환기 부족·방습층 누락','단열재 보강·방습 재시공',300000,1500000,2,'발코니 인접 벽 단열 강화. 환기 계획 수립','시공사','3개월·겨울철','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-TIL-001','타일','타일 들뜸·탈락','HIGH','압착 불량·바탕면 불량·동절기 시공','해당 타일 교체',100000,500000,2,'압착 시멘트 100% 도포 확인. 영하 시공 금지','시공사','준공 직후·6개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-TIL-002','타일','줄눈 균열·변색','LOW','에폭시 미사용·수축·오염','줄눈 재시공',50000,300000,1,'욕실 에폭시 줄눈 권장','시공사','6개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-FLR-001','바닥재','강마루 들뜸·소음','MEDIUM','바닥 수평 불량·습기·언더레이 누락','해당 구간 재시공',100000,800000,2,'바닥 수평도 3m당 3mm 이내 확인. 언더레이 전면 시공','시공사','준공 직후·1년','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-FLR-002','바닥재','LVT 수축·이음부 벌어짐','MEDIUM','온도 변화·접착 불량','해당 구간 교체',80000,500000,2,'실내 온도 15℃+ 유지. 접착 방식 준수','시공사','6개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-WLP-001','도배','벽지 들뜸·기포','LOW','퍼티 불량·습도 과다·풀 불량','부분 재시공',50000,300000,1,'퍼티 완전 건조(24h) 후 도배. 습도 60% 이하','시공사','1개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-WLP-002','도배','이음부 벌어짐','LOW','건조 수축·퍼티 불량','이음부 재처리',30000,150000,1,'코너비드 처리. 건조 후 재확인','시공사','3개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-PLB-001','설비','배관 누수','HIGH','이음 불량·동관 핀홀·동결 파손','누수 구간 재시공',300000,2000000,2,'압력 테스트 (1.5배 수압 30분) 필수','시공사','준공 직후·3개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-PLB-002','설비','보일러 소음·불량','MEDIUM','공기 혼입·배관 공기층·필터 막힘','에어 제거·필터 청소',50000,300000,1,'배관 에어 제거 완료 후 인도','보일러 제조사 A/S','1개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-ELE-001','전기','콘센트·스위치 불량','LOW','결선 불량·접지 불량','재결선·교체',30000,100000,2,'절연 저항 측정·전기안전 점검','시공사','준공 직후','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-ELE-002','전기','조명 회로 트립','MEDIUM','과부하·차단기 용량 부족','회로 재분리·차단기 교체',100000,400000,2,'회로별 부하 계산. 분전반 용량 확인','시공사','3개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-WIN-001','창호','창호 결로·단열 불량','MEDIUM','단열재 누락·시공 불량·제품 불량','우레탄 폼 재충전·제품 교체',100000,500000,2,'우레탄 폼 100% 충전 확인. 기밀 테스트','시공사·제조사','겨울철','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-WIN-002','창호','창호 개폐 불량·소음','LOW','수직·수평 틀어짐·경첩 불량','조정·교체',50000,200000,2,'설치 후 개폐 전수 확인','시공사','준공 직후·6개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-FUR-001','가구','주방가구 문짝 처짐','LOW','경첩 불량·하중 초과','경첩 교체·조정',20000,100000,1,'소프트클로징 경첩 적용','가구 제조사 A/S','6개월','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json'),
('HQ','DEF-FUR-002','가구','붙박이장 탈락','HIGH','앵커 불량·벽 강도 부족','재고정·보강',100000,500000,2,'콘크리트 앵커 사용. 하중 계산','시공사','준공 직후','principal_seed','INTERNAL_ESTIMATED','ECOREAN_하자유형DB.json')
on conflict (tenant_id,defect_id) do update set category = excluded.category, name = excluded.name, severity = excluded.severity, typical_cause = excluded.typical_cause, repair_method = excluded.repair_method, repair_cost_min = excluded.repair_cost_min, repair_cost_max = excluded.repair_cost_max, warranty_years = excluded.warranty_years, prevention = excluded.prevention, responsibility = excluded.responsibility, check_timing = excluded.check_timing, source = excluded.source, data_status = excluded.data_status, origin_dataset = excluded.origin_dataset, updated_at = now();

insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)
values ('defect_types', 'ECOREAN_하자유형DB.json', 'a7c8c3ae3bc32bb7d87151d63ac1e2548cbc5ef6086a02c8658fb2a12f0e2eeb', 16)
on conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();
