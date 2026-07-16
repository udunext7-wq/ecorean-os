-- MiniCAD 마감재 코드표 — 원천: MiniCAD-v5.9-Galaxy/js/data.js
-- (FLOOR_MATERIALS 14 / WALL_MATERIALS 15 / CEILING_MATERIALS 9 = 38)
-- data.js는 MiniCAD 저장소에 있어 ETL(generate-seeds.mjs)의 assets/data 스캔 대상 밖이다.
-- data.js의 코드표가 바뀌면 이 파일을 갱신할 것. 멱등: on conflict do update.

insert into public.minicad_material_codes (tenant_id, surface, code, name, sort_order, origin_dataset) values
('HQ','floor','UNDECIDED','미정',1,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','STRONG','강마루',2,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','WOOD','원목마루',3,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','REINFORCED','강화마루',4,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','LVT','데코타일(LVT)',5,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','PVC','장판(PVC)',6,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','TILE_PORC','포세린타일',7,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','TILE_POLISHED','폴리싱타일',8,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','TILE_BATH','욕실타일(논슬립)',9,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','MARBLE','대리석',10,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','WOOD_TILE','우드타일',11,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','CARPET','카펫타일',12,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','EPOXY','에폭시(차고/창고)',13,'MiniCAD-v5.9/js/data.js'),
('HQ','floor','CONCRETE','노출콘크리트',14,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','UNDECIDED','미정',1,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','WP_COMPOSITE','합지벽지',2,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','WP_SILK','실크벽지',3,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','WP_ECO','친환경벽지(천연)',4,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','WP_DESIGN','디자인벽지',5,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','PAINT_WATER','페인트(수성)',6,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','PAINT_ECO','페인트(친환경)',7,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','PAINT_SPECIAL','특수도장(스타코/벨벳)',8,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','WALL_TILE','욕실벽타일',9,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','KITCHEN_TILE','주방벽타일',10,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','WOOD_PANEL','우드패널',11,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','VENEER','무늬목패널',12,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','CONCRETE','노출콘크리트',13,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','FABRIC','패브릭패널',14,'MiniCAD-v5.9/js/data.js'),
('HQ','wall','METAL','메탈패널',15,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','UNDECIDED','미정',1,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','GYPSUM','석고보드',2,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','TBAR','T-BAR(텍스)',3,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','COFFER','우물천정',4,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','PAINT_WATER','페인트(수성)',5,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','PAINT_ECO','페인트(친환경)',6,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','EXPOSED_CON','노출콘크리트',7,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','WOOD_CEIL','목재패널',8,'MiniCAD-v5.9/js/data.js'),
('HQ','ceiling','STRETCH','스트레치실링',9,'MiniCAD-v5.9/js/data.js')
on conflict (tenant_id, surface, code) do update set
  name = excluded.name, sort_order = excluded.sort_order, updated_at = now();
