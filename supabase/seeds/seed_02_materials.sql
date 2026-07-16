-- 자동 생성: generate-seeds.mjs — 직접 수정 금지, 원본 JSON 수정 후 재생성
-- 멱등: on conflict do update

insert into public.materials (tenant_id,mat_id,name,unit,unit_price,coverage_per_unit,process_code,brand,spec,lead_days,source,source_detail,data_status,origin_dataset)
values
('HQ','MAT-WP-001','우레탄 방수재 (1액형)','kg',4500,1,'WTP_BT','NEEDS_RESEARCH','18kg 통 기준 약 81,000원',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-WP-002','아크릴 방수재','kg',3800,1.2,'WTP_WL','NEEDS_RESEARCH','욕실 벽 방습용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-MSN-001','시멘트 (보통포틀랜드)','포',8500,null,'MSN_FL','쌍용·한일·아세아','40kg/포 기준. ㎡당 약 0.5포 소요',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-MSN-002','모래 (세척사)','㎥',80000,null,'MSN_FL','현지조달','바닥 미장용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-MSN-003','셀프레벨링 컴파운드','포',25000,5,'MSN_SL','MAPEI·신한건재','25kg/포. ㎡당 약 5kg 소요 (4mm 두께)',2,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-TIL-001','압착 시멘트 (줄눈용)','포',12000,10,'TILE_BT','MAPEI·단양산업','25kg/포. ㎡당 약 2.5kg',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-TIL-002','줄눈재 (시멘트계)','kg',3500,8,'TILE_GRF','MAPEI','2.5mm 줄눈 기준. ㎡당 약 0.5kg',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-TIL-003','에폭시 줄눈재','세트',18000,5,'TILE_GRF','MAPEI·키젤','2kg 세트 기준. ㎡당 약 0.4kg',2,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-TIL-004','타일 이격재 (스페이서)','개',50,20,'TILE_BT','범용','3mm 스페이서 기준',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-GYP-001','석고보드 9.5mm','장',9000,3.2,'GYP_WL','KCC·라파즈한라','1220×2440mm 기준 (3.2㎡/장)',2,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-GYP-002','석고보드 12.5mm (내수)','장',12000,3.2,'GYP_WL','KCC','욕실 인접부 내수용',2,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-GYP-003','LGS 스터드 60×38','본',2800,null,'LGS_WL','범용','3m 기준. 300mm 간격 시공',2,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-GYP-004','LGS 러너 60×25','본',2200,null,'LGS_WL','범용','3m 기준',2,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-WLP-001','초배지 (부직포)','롤',18000,30,'WLP_UB','한국부직포·동신','100m 롤 기준. ㎡당 약 3.3m',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-WLP-002','풀 (전분계)','포',8000,50,'WLP_UB','범용','20kg/포',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-WLP-003','도배 코너비드','본',2500,null,'WLP_PP','범용','3m 기준. 모서리 처리용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-PNT-001','석고 퍼티','포',15000,20,'PNT_PT','삼화·KCC','20kg/포. ㎡당 약 1kg',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-PNT-002','프라이머','L',5000,8,'PNT_PR','삼화·KCC','㎡당 약 0.12L',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-PNT-003','수성페인트 (내부용)','L',6000,6,'PNT_WB','삼화·KCC·노루','1회도장 ㎡당 약 0.17L. 2회 기준 0.34L',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-FLR-001','강마루 언더레이','㎡',2000,1,'FLR_WB','범용','흡음·단열·충격 완화',3,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-FLR-002','접착제 (바닥재용)','kg',4000,4,'FLR_LVT','범용','LVT 직접 접착 시공용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-FLR-003','걸레받이 몰딩 (PVC)','m',2800,1,'FLR_SK','범용','60mm 높이 기준',2,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-WIN-001','우레탄 폼 (창호용)','개',8000,null,'WIN_SYS','범용','750ml 캔. 창호 1EA당 약 1~2캔',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-WIN-002','실리콘 코킹 (투명)','개',4500,null,'WIN_SYS','범용','300ml 카트리지. 창호 마감용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-ELE-001','CD관 (28mm)','m',800,1,'ELE_RG','범용','전선 보호관',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-ELE-002','전선 (HIV 2.5㎟)','m',400,1,'ELE_RG','LS전선·대한전선','분기회로용 기준',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-ELE-003','전선 (HIV 1.5㎟)','m',280,1,'ELE_RG','LS전선','조명회로용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-PLB-001','PB관 (15mm)','m',2200,1,'PLB_RG','범용','급수관용. 이음쇠 별도',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-PLB-002','PB관 이음쇠 세트','세트',15000,null,'PLB_RG','범용','엘보·티 혼합 세트',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-PLB-003','PVC 배수관 (50mm)','m',3500,1,'PLB_RG','범용','욕실 배수용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-PRE-001','PE 필름 (0.05mm)','㎡',300,1,'PRE_BY','범용','바닥 보양용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-PRE-002','골판지 (5T)','장',1800,1,'PRE_BY','범용','1200×2400mm. 바닥 충격 완화',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-PRE-003','마스킹 테이프','개',2500,null,'PRE_BY','3M·범용','50mm 기준. 보양·분리용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json'),
('HQ','MAT-WS-001','폐기물 처리비 (혼합 건설폐기물)','톤',90000,null,'PRE_WS','허가업체 위탁','서울 기준. 지역·종류에 따라 60,000~150,000원/톤 편차',0,'principal_seed','2025년 시장조사 기준 (업체 공급가)','MARKET_RESEARCH','ECOREAN_자재DB.json'),
('HQ','MAT-WS-002','톤백 마대','개',8000,null,'PRE_WS','범용','1톤 기준. 철거재 담기용',1,'principal_seed','2025년 시장조사 기준 (업체 공급가)','INTERNAL_ESTIMATED','ECOREAN_자재DB.json')
on conflict (tenant_id,mat_id) do update set name = excluded.name, unit = excluded.unit, unit_price = excluded.unit_price, coverage_per_unit = excluded.coverage_per_unit, process_code = excluded.process_code, brand = excluded.brand, spec = excluded.spec, lead_days = excluded.lead_days, source = excluded.source, source_detail = excluded.source_detail, data_status = excluded.data_status, origin_dataset = excluded.origin_dataset, updated_at = now();

insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)
values ('materials', 'ECOREAN_자재DB.json', 'fd578cbdc3d9410de31d6adbe5a56e034de883f94f20461a72cf9910690df7d2', 35)
on conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();
