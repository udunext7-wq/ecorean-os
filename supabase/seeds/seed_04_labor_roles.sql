-- 자동 생성: generate-seeds.mjs — 직접 수정 금지, 원본 JSON 수정 후 재생성
-- 멱등: on conflict do update

insert into public.labor_roles (tenant_id,role_id,role_name,grade,daily_rate_official,daily_rate_ecorean,hourly_rate,productivity,regional_factor,source,source_detail,source_date,data_status,origin_dataset,notes)
values
('HQ','LC-001','건축목공','일반',277894,null,null,'{"LGS벽체":12,"석고보드벽":15,"석고보드천장":12,"목대골조":10}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','LGS 스터드·러너, 석고보드, 목대작업 포함. 정밀목공(수납장 제작 등)은 1.2 계수 적용'),
('HQ','LC-002','플로어링마루시공공','일반',253241,null,null,'{"강마루":25,"LVT":30,"원목마루":18}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','강마루·LVT·원목마루 시공. 2025년 상반기 신규 직종 추가'),
('HQ','LC-003','타일공','일반',284337,null,null,'{"욕실타일(300mm)":8,"바닥타일(600mm)":10,"대형슬랩(1200mm이상)":5}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','수입 대형 슬랩은 레벨링 작업 포함으로 ×1.3 가산'),
('HQ','LC-004','줄눈공','일반',202696,null,null,'{"일반줄눈":40,"에폭시줄눈":25}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','타일공이 겸하는 경우 별도 계상 불필요'),
('HQ','LC-005','내선전공','일반',268915,null,null,'{"전기배선(m/일)":80,"콘센트스위치(EA/일)":12,"다운라이트(EA/일)":15}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','인테리어용 내선공사 기준. 분전반 교체 시 +반일 추가'),
('HQ','LC-006','배관공(수도)','일반',250572,null,null,'{"배관(m/일)":15,"수전설치(EA/일)":4,"위생도기(EA/일)":2}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','급배수 배관. 갈바나이즈관 교체 시 철거공 별도 계상'),
('HQ','LC-007','위생공','일반',219040,null,null,'{"위생도기세트(EA/일)":1.5}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','도기류(변기·세면기·욕조) 설치 전담'),
('HQ','LC-008','기계설비공','일반',237652,null,null,'{"보일러설치(EA/일)":0.5,"분배기설치(EA/일)":2}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','보일러·분배기·바닥난방 배관'),
('HQ','LC-009','도배공','일반',222618,null,null,'{"합지도배":60,"실크도배":45,"광폭실크":35}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','초배 포함 기준. 초배 별도 계상 시 도배공 ×0.8'),
('HQ','LC-010','도장공','일반',253409,null,null,'{"퍼티":50,"프라이머":70,"수성페인트2회":40}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','퍼티·프라이머·페인트 별도 계상'),
('HQ','LC-011','방수공','일반',220722,null,null,'{"우레탄방수2회":20,"발코니방수":25}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','48h 양생 후 다음 공정. 방수는 CONDITIONAL 적용'),
('HQ','LC-012','미장공','일반',272354,null,null,'{"시멘트미장":25,"셀프레벨링":40}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','바닥 미장 24h 양생 후 타일공 투입'),
('HQ','LC-013','창호공','일반',248350,null,null,'{"시스템창호(EA/일)":2,"일반창호(EA/일)":3}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','우레탄 코킹 포함. 방충망 별도'),
('HQ','LC-014','내장공','일반',252249,null,null,'{"인테리어필름(㎡/일)":25,"몰딩(m/일)":60}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','필름 시공·몰딩·수장공사 담당'),
('HQ','LC-015','철거공','일반',264828,null,null,'{"바닥재철거":40,"타일철거":20,"도배제거":60,"목공해체":15}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','2025년 상반기 신규 직종 추가. 폐기물 반출 별도'),
('HQ','LC-016','코킹공','일반',206732,null,null,'{"실리콘코킹(m/일)":80}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','창호·욕실·주방 실리콘 처리'),
('HQ','LC-017','보통인부','조공',169804,null,null,'{}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','보양·잡역·폐기물 정리 등 보조작업'),
('HQ','LC-018','작업반장','반장',213033,null,null,'{}'::jsonb,'{"서울강남":1.15,"서울기타":1.05,"경기":1,"지방광역":0.92,"지방기타":0.85}'::jsonb,'principal_seed','대한건설협회 2025년 상반기 시중노임단가','2025-01-01','OFFICIAL','ECOREAN_인건비DB_2025공식.json','팀 단위 작업 시 반장 1명 별도 계상')
on conflict (tenant_id,role_id) do update set role_name = excluded.role_name, grade = excluded.grade, daily_rate_official = excluded.daily_rate_official, daily_rate_ecorean = excluded.daily_rate_ecorean, hourly_rate = excluded.hourly_rate, productivity = excluded.productivity, regional_factor = excluded.regional_factor, source = excluded.source, source_detail = excluded.source_detail, source_date = excluded.source_date, data_status = excluded.data_status, origin_dataset = excluded.origin_dataset, notes = excluded.notes, updated_at = now();

-- ── seeds-legacy 누락 직종 보충 ──

insert into public.labor_roles (tenant_id,role_id,role_name,grade,daily_rate_official,daily_rate_ecorean,hourly_rate,productivity,regional_factor,source,source_detail,source_date,data_status,origin_dataset,notes)
values
('HQ','LBR_특별인부','특별인부','일반',220000,null,27500,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_콘크리트','콘크리트공','일반',230000,null,28750,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_형틀목공','형틀목공','일반',270000,null,33750,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_철근공','철근공','일반',260000,null,32500,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_용접공','용접공','일반',290000,null,36250,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_유리공','유리공','일반',230000,null,28750,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_조적공','조적공','일반',240000,null,30000,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_견출공','견출공','일반',220000,null,27500,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_석공','석공','일반',260000,null,32500,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_온돌공','온돌공','일반',230000,null,28750,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 기타'),
('HQ','LBR_CRP','목공','일반',250000,null,31250,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 목공'),
('HQ','LBR_PLB','배관공','일반',280000,null,35000,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 배관'),
('HQ','LBR_MEP','설비공','일반',270000,null,33750,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 설비'),
('HQ','LBR_ELE','전공','일반',270000,null,33750,'{}'::jsonb,'{}'::jsonb,'principal_seed','KCA (2026-H1)',null,'OFFICIAL','seeds-legacy/labor-22.json','분류: 전기')
on conflict (tenant_id,role_id) do update set role_name = excluded.role_name, grade = excluded.grade, daily_rate_official = excluded.daily_rate_official, daily_rate_ecorean = excluded.daily_rate_ecorean, hourly_rate = excluded.hourly_rate, productivity = excluded.productivity, regional_factor = excluded.regional_factor, source = excluded.source, source_detail = excluded.source_detail, source_date = excluded.source_date, data_status = excluded.data_status, origin_dataset = excluded.origin_dataset, notes = excluded.notes, updated_at = now();

insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)
values ('labor_roles:official', 'ECOREAN_인건비DB_2025공식.json', 'efef95882ce4888199d88464b9f796bd3b650178c93dcea16abd2db34c25bc3f', 18)
on conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();
insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)
values ('labor_roles:legacy', 'seeds-legacy/labor-22.json', '3b3449cc2b7805ed99a34ace64c0626c5db0ae33b9888e4822b121affd2a9152', 14)
on conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();
