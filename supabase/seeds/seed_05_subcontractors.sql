-- 자동 생성: generate-seeds.mjs — 직접 수정 금지, 원본 JSON 수정 후 재생성
-- 멱등: on conflict do update

insert into public.subcontractors (tenant_id,sub_id,category,name,unit,price_min,price_max,price_typical,source,data_status,origin_dataset,notes)
values
('HQ','SUB-001','양중·운반','사다리차 임차 (8m)','회',150000,250000,180000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','반일 기준. 층수·거리·시간에 따라 변동. 서울 기준'),
('HQ','SUB-002','양중·운반','사다리차 임차 (14m)','회',250000,400000,300000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','10층 이상 고층용. 1일 기준'),
('HQ','SUB-003','양중·운반','인력 운반 (계단 양중)','시간',30000,50000,40000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','인력 2명 기준. 엘리베이터 없는 저층'),
('HQ','SUB-004','양중·운반','1톤 트럭 임차','회',150000,300000,200000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','자재 운반·폐기물 반출. 반일~1일 기준'),
('HQ','SUB-010','석면해체','석면 텍스처 해체 (인증업체)','㎡',80000,150000,110000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','산안법 허가 인증업체. 기관 신고·모니터링 포함. 1990년 이전 건물'),
('HQ','SUB-011','석면해체','석면 조사 (공인기관)','건',300000,800000,500000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','석면 함유 여부 공인 시험기관 조사. 철거 전 필수'),
('HQ','SUB-020','에어컨','에어컨 이설 (분리·재설치)','대',150000,300000,200000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','거주중 공사 시 필수. 냉매관 추가 시 별도'),
('HQ','SUB-021','에어컨','에어컨 냉매관 연장 (m당)','m',30000,60000,45000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','동관+피복+가스 충전 포함'),
('HQ','SUB-022','에어컨','에어컨 배관 슬리브 처리','개',30000,80000,50000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','벽 관통 처리. 방수·단열 포함'),
('HQ','SUB-030','폐기물','혼합 건설폐기물 처리','톤',60000,150000,90000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','허가업체 위탁. 서울 기준. 폐기물 종류·처리장 거리에 따라 변동'),
('HQ','SUB-031','폐기물','석면 폐기물 처리 (별도)','톤',800000,2000000,1200000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','지정폐기물 특수 처리. 반드시 인증업체'),
('HQ','SUB-032','폐기물','폐가구·가전 처리','식',100000,300000,180000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','철거 시 발생 폐가전·가구 처리'),
('HQ','SUB-040','청소','준공청소 (전문업체 외주)','㎡',8000,15000,10000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','33평 기준 약 35~50만원. 자체 시공 시 4,000원/㎡'),
('HQ','SUB-041','청소','창호·유리 청소','EA',20000,50000,30000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','창호 1개소 기준'),
('HQ','SUB-050','가스','도시가스 배관 연결','건',200000,500000,300000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','도시가스 공사업체. 한국가스안전공사 검사 포함'),
('HQ','SUB-051','가스','가스레인지→인덕션 전환','건',100000,250000,150000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','가스 밸브 막음 + 콘센트 추가'),
('HQ','SUB-060','수도','수도미터기 교체','건',100000,200000,150000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','한국수도공사·지자체 신청 필요'),
('HQ','SUB-061','소방','소방시설 점검·교체','건',200000,600000,350000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','소방시설공사업 등록 업체. 감지기·스프링클러'),
('HQ','SUB-070','특수','발코니 확장 허가 대행','건',300000,800000,500000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','행정사·건축사 대행. 지자체별 상이'),
('HQ','SUB-071','특수','인터폰·CCTV 설치','건',200000,500000,300000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','세대 단위 기준'),
('HQ','SUB-072','특수','방화문 설치','EA',500000,1200000,700000,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_외주업체DB.json','자재+시공. 방화인정 제품 필수')
on conflict (tenant_id,sub_id) do update set category = excluded.category, name = excluded.name, unit = excluded.unit, price_min = excluded.price_min, price_max = excluded.price_max, price_typical = excluded.price_typical, source = excluded.source, data_status = excluded.data_status, origin_dataset = excluded.origin_dataset, notes = excluded.notes, updated_at = now();

insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)
values ('subcontractors', 'ECOREAN_외주업체DB.json', '3972a06ad5a33680ab07fdac09601519f2aec1e940a7c65df28a0b1970d7b227', 21)
on conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();
