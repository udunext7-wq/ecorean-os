-- 자동 생성: generate-seeds.mjs — 직접 수정 금지, 원본 JSON 수정 후 재생성
-- 멱등: on conflict do update

insert into public.brands (tenant_id,brand_id,category,brand,product,unit,supply_price,retail_price,grade,lead_days,attrs,source,source_detail,data_status,origin_dataset)
values
('HQ','FLR-001','flooring','동화마루','강마루 포레 (HB급)','㎡',19000,32000,'HB',3,'{"thickness":"7mm","feature":"무늬목 표면"}'::jsonb,'principal_seed','동화마루 단가표 공개 (2025.10)','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','FLR-002','flooring','동화마루','강마루 오리진 (WB급)','㎡',22000,36000,'WB',3,'{"thickness":"7mm","feature":"HB마크·친환경"}'::jsonb,'principal_seed','동화마루 단가표 공개 (2025.10)','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','FLR-003','flooring','동화마루','강마루 스퀘어 (타일형)','㎡',28000,48000,'WB',5,'{"thickness":"7mm","feature":"600×600 정사각형·인기"}'::jsonb,'principal_seed','동화마루 단가표 공개 (2025.10)','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','FLR-004','flooring','LG하우시스','지아마루 HB','㎡',20000,34000,'HB',3,'{"thickness":"7mm","feature":"오크·월넛 패턴"}'::jsonb,'principal_seed','LG하우시스 시공업체 공급가 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','FLR-005','flooring','LG하우시스','지아마루 WB (광폭)','㎡',25000,42000,'WB',5,'{"thickness":"7.5mm","feature":"친환경·HB마크"}'::jsonb,'principal_seed','LG하우시스 시공업체 공급가 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','FLR-006','flooring','KCC','숲 강마루 HB','㎡',18000,30000,'HB',3,'{"thickness":"7mm","feature":"가성비"}'::jsonb,'principal_seed','KCC 시공업체 공급가 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','FLR-010','flooring','LG하우시스','LVT 지아플로어','㎡',13000,22000,'표준',2,'{"thickness":"3mm","feature":"방수·애완동물용"}'::jsonb,'principal_seed','LG하우시스 제품 가격 기준','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','FLR-011','flooring','동화마루','LVT 듀오 오리진','㎡',15000,25000,'고급',2,'{"thickness":"4mm","feature":"방수·내구성"}'::jsonb,'principal_seed','동화마루 단가표 공개 (2025.10)','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','WP-001','wallpaper','LG하우시스','합지벽지 (LX Z:IN)','m',700,1200,'합지',null,'{"feature":"22년 1위 브랜드·친환경","rollWidth":0.53,"rollLength":12.5,"sqmPerRoll":6.6}'::jsonb,'principal_seed','온라인 가격비교·인테리어 단가표','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','WP-002','wallpaper','LG하우시스','실크벽지 (LX Z:IN)','m',1200,2200,'실크',null,'{"feature":"비닐 코팅·청소 용이","rollWidth":0.53,"rollLength":12.5,"sqmPerRoll":6.6}'::jsonb,'principal_seed','온라인 가격비교·인테리어 단가표','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','WP-003','wallpaper','LG하우시스','광폭실크 (LX Z:IN 디아망)','m',2000,3800,'광폭실크',null,'{"feature":"프리미엄·1.06m 광폭","rollWidth":1.06,"rollLength":25,"sqmPerRoll":26.5}'::jsonb,'principal_seed','온라인 가격비교','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','WP-004','wallpaper','KCC','합지벽지 (홈씨씨)','m',600,1000,'합지',null,'{"feature":"균형 잡힌 품질·가격","rollWidth":0.53,"rollLength":12.5,"sqmPerRoll":6.6}'::jsonb,'principal_seed','시장조사','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','WP-005','wallpaper','KCC','실크벽지 (홈씨씨)','m',1100,2000,'실크',null,'{"feature":"내구성·변색 적음","rollWidth":0.53,"rollLength":12.5,"sqmPerRoll":6.6}'::jsonb,'principal_seed','시장조사','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','WP-006','wallpaper','개나리벽지','합지벽지','m',450,800,'합지',null,'{"feature":"가성비·셀프도배","rollWidth":0.53,"rollLength":12.5,"sqmPerRoll":6.6}'::jsonb,'principal_seed','시장조사','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','WIN-001','windows','KCC','홈씨씨 PVC 복층유리 (1.2×1.5m)','EA',280000,420000,'복층',21,'{"feature":"13년 품질보증·단열성"}'::jsonb,'principal_seed','시공플러스 공개 단가 (2025)','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','WIN-002','windows','KCC','홈씨씨 PVC 삼중유리 (1.2×1.5m)','EA',380000,580000,'삼중',21,'{"feature":"고단열·방음"}'::jsonb,'principal_seed','시공플러스 공개 단가 (2025)','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','WIN-003','windows','LG하우시스','수퍼세이브 복층유리','EA',290000,450000,'복층',21,'{"feature":"에너지절감"}'::jsonb,'principal_seed','LG하우시스 시공업체 공급가 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','WIN-004','windows','LG하우시스','수퍼세이브 삼중+로이','EA',450000,700000,'삼중+로이',28,'{"feature":"최고 단열·방음"}'::jsonb,'principal_seed','LG하우시스 시공업체 공급가 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','WIN-005','windows','영림','PVC 시스템창호 복층','EA',260000,400000,'복층',18,'{"feature":"국내 인기 브랜드"}'::jsonb,'principal_seed','영림 공식 사이트 참고','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','KIT-001','kitchen','한샘','인생키친 표준 (20평형 ㅡ자)','식',3500000,5500000,'표준',25,'{"feature":"싱크볼·수전·후드 포함·무료시공"}'::jsonb,'principal_seed','한샘몰·이벤트 기준가 400만원+ (2025)','MARKET_RESEARCH','ECOREAN_브랜드DB.json'),
('HQ','KIT-002','kitchen','한샘','인생키친 고급 (30평형 ㄱ자)','식',5500000,8500000,'고급',25,'{"feature":"소프트클로징·빌트인 포함"}'::jsonb,'principal_seed','한샘 가격대 기준 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','KIT-003','kitchen','한샘','키친바흐 프리미엄','식',10000000,18000000,'프리미엄',35,'{"feature":"수입자재·맞춤설계"}'::jsonb,'principal_seed','한샘 키친바흐 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','KIT-004','kitchen','현대리바트','리바트 시스템키친 표준','식',3800000,6000000,'표준',25,'{"feature":"현대그룹 계열"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','KIT-005','kitchen','에넥스','에넥스 시스템키친 고급','식',4500000,7000000,'고급',25,'{"feature":"자체공장·AS 우수"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','BAT-001','bathroom','대림바스','욕실 세트 (변기+세면기+수전) 표준','세트',350000,600000,'표준',5,'{"feature":"국내 1위 위생도기"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','BAT-002','bathroom','이누스바스','욕실 세트 표준','세트',380000,650000,'표준',5,'{"feature":"LG하우시스 계열"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','BAT-003','bathroom','로얄앤컴퍼니','욕실 세트 고급','세트',700000,1200000,'고급',7,'{"feature":"프리미엄 국산"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','BAT-004','bathroom','GROHE','수전 세트 (프리미엄 수입)','세트',800000,1500000,'프리미엄',14,'{"feature":"독일 수입·내구성"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','BAT-005','bathroom','American Standard','욕실 세트 프리미엄','세트',1200000,2200000,'프리미엄',14,'{"feature":"미국 브랜드·고급"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','TIL-001','tile','디자인 세라믹','도기질 욕실타일 300×300 국산','㎡',15000,25000,'표준',3,'{"feature":"기본 도기질·내수성"}'::jsonb,'principal_seed','자재상 시장 조사','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','TIL-002','tile','수입 포세린','포세린 타일 600×600 (스페인/이탈리아)','㎡',35000,65000,'고급',18,'{"feature":"고강도·낮은 흡수율·유행"}'::jsonb,'principal_seed','자재 수입상 공급가 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','TIL-003','tile','수입 대형슬랩','대형 슬랩 타일 1200×2400 (수입)','㎡',80000,150000,'프리미엄',25,'{"feature":"이음새 최소·고급"}'::jsonb,'principal_seed','자재 수입상 공급가 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','TOP-001','countherTop','국산 인조대리석','인조대리석 상판 (삼성·LG 계열)','m',150000,250000,'표준',7,'{"feature":"가성비·다양한 색상"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','TOP-002','countherTop','세라믹 상판','세라믹 싱크탑 (수입)','m',250000,420000,'고급',10,'{"feature":"내열·내스크래치"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json'),
('HQ','TOP-003','countherTop','쿼츠·석영석','쿼츠 상판 (수입)','m',300000,520000,'프리미엄',10,'{"feature":"강도·위생·고급"}'::jsonb,'principal_seed','시장 가격대 추정','INTERNAL_ESTIMATED','ECOREAN_브랜드DB.json')
on conflict (tenant_id,brand_id) do update set category = excluded.category, brand = excluded.brand, product = excluded.product, unit = excluded.unit, supply_price = excluded.supply_price, retail_price = excluded.retail_price, grade = excluded.grade, lead_days = excluded.lead_days, attrs = excluded.attrs, source = excluded.source, source_detail = excluded.source_detail, data_status = excluded.data_status, origin_dataset = excluded.origin_dataset, updated_at = now();

insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)
values ('brands', 'ECOREAN_브랜드DB.json', 'ba7c771effec7ceb52f2b2e625d49742b3ce7db2435b12f7d74fc5d6b94b2cb8', 35)
on conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();
