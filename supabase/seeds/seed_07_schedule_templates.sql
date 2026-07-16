-- 자동 생성: generate-seeds.mjs — 직접 수정 금지, 원본 JSON 수정 후 재생성
-- 멱등: on conflict do update

insert into public.schedule_templates (tenant_id,process_code,process_name,default_start_day,default_duration,predecessors,successors,critical_path,worker_role,min_workers,curring_hours,lead_time_days,source,data_status,origin_dataset,notes)
values
('HQ','PRE_BY','보양',1,1,'{}',array['PRE_DM_F','PRE_DM_T','PRE_DM_W']::text[],true,'보통인부',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','착공 첫날 전 공간 보양 완료'),
('HQ','PRE_DM_F','바닥재 철거',2,2,array['PRE_BY']::text[],array['MSN_FL']::text[],true,'철거공',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','PRE_DM_T','타일 철거',2,2,array['PRE_BY']::text[],array['WTP_BT']::text[],true,'철거공',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','PRE_DM_W','도배 제거',2,1,array['PRE_BY']::text[],array['GYP_WL']::text[],false,'도배공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','PRE_WS','폐기물 반출',4,1,array['PRE_DM_F','PRE_DM_T']::text[],'{}',false,'보통인부',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','폐기물 차량 예약 필요 (1주 전)'),
('HQ','PLB_RG','급배수 배관',3,3,array['PRE_DM_T']::text[],array['MSN_FL','WTP_BT']::text[],true,'배관공(수도)',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','배관 완료 후 방수 선행 필수'),
('HQ','ELE_RG','전기 배선',3,3,array['PRE_DM_W']::text[],array['GYP_WL','ELE_PNL']::text[],true,'내선전공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','배선 완료 후 석고보드 덮기'),
('HQ','WTP_BT','욕실 방수',5,2,array['PLB_RG']::text[],array['TILE_BT']::text[],true,'방수공',1,48,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','방수 후 48시간 양생 필수. 누수 테스트 후 타일 진행'),
('HQ','GYP_WL','석고보드 벽',5,2,array['ELE_RG']::text[],array['PNT_PT']::text[],false,'건축목공',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','GYP_CL','석고보드 천장',7,2,array['GYP_WL']::text[],array['PNT_PT']::text[],false,'건축목공',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','LGS_WL','LGS 경량벽체',5,3,array['ELE_RG']::text[],array['GYP_WL']::text[],false,'건축목공',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','MSN_FL','바닥 미장',7,2,array['PLB_RG','PRE_DM_F']::text[],array['FLR_WB']::text[],true,'미장공',1,24,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','미장 24시간 양생 후 바닥재 시공'),
('HQ','MSN_SL','셀프레벨링',9,1,array['MSN_FL']::text[],array['FLR_WB']::text[],false,'미장공',1,12,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','TILE_BT','욕실 바닥타일',8,3,array['WTP_BT']::text[],array['TILE_GRF']::text[],true,'타일공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','TILE_BW','욕실 벽타일',8,3,array['WTP_BT']::text[],array['TILE_GRW']::text[],true,'타일공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','TILE_GRF','줄눈(바닥)',11,1,array['TILE_BT']::text[],array['BAT_FIX']::text[],false,'줄눈공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','줄눈재 경화 12h 후 도기 설치'),
('HQ','TILE_GRW','줄눈(벽)',11,1,array['TILE_BW']::text[],array['BAT_FIX']::text[],false,'줄눈공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','WIN_SYS','시스템창호 설치',10,2,array['GYP_CL']::text[],array['PNT_PT']::text[],false,'창호공',2,null,21,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','리드타임 21일 필수 → 착공 전 발주'),
('HQ','PNT_PT','퍼티',12,2,array['GYP_WL','GYP_CL','WIN_SYS']::text[],array['PNT_PR']::text[],true,'도장공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','PNT_PR','프라이머',14,1,array['PNT_PT']::text[],array['WLP_UB','PNT_WB']::text[],true,'도장공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','WLP_UB','초배',15,1,array['PNT_PR']::text[],array['WLP_PP']::text[],true,'도배공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','WLP_PP','도배',16,2,array['WLP_UB']::text[],array['FLR_WB']::text[],true,'도배공',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','도배 완료 후 바닥재 시공. 역순 불가'),
('HQ','FLR_WB','강마루 시공',18,2,array['WLP_PP','MSN_FL']::text[],array['FLR_SK']::text[],true,'플로어링마루시공공',1,null,5,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','바닥재 현장 반입 후 24h 이상 적치'),
('HQ','FLR_SK','걸레받이 몰딩',20,1,array['FLR_WB']::text[],array['ELE_OUT']::text[],false,'내장공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','ELE_OUT','콘센트·스위치',20,1,array['GYP_WL']::text[],array['ELE_DL']::text[],false,'내선전공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','ELE_DL','다운라이트',21,1,array['ELE_OUT']::text[],array['CLN_FN']::text[],false,'내선전공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','BAT_FIX','욕실 도기 설치',12,1,array['TILE_GRF','TILE_GRW']::text[],array['BAT_EXH']::text[],false,'위생공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','BAT_EXH','환풍기',13,1,array['BAT_FIX']::text[],array['BAT_DOOR']::text[],false,'내선전공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','BAT_DOOR','욕실 도어',14,1,array['BAT_EXH']::text[],'{}',false,'창호공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','BAT_CEIL','욕실 천장(루버)',13,1,array['TILE_BW']::text[],array['BAT_EXH']::text[],false,'건축목공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','FUR_KIT','주방가구 설치',20,2,array['TILE_KT','PLB_KIT']::text[],array['FUR_TOP']::text[],false,'건축목공',2,null,25,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','리드타임 25일 → 착공 전 즉시 발주'),
('HQ','FUR_TOP','주방 상판',22,1,array['FUR_KIT']::text[],array['PLB_WF']::text[],false,'건축목공',2,null,10,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','FUR_WRD','붙박이장',20,2,array['WLP_PP']::text[],'{}',false,'건축목공',2,null,18,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','리드타임 18일 → 착공 전 발주'),
('HQ','PLB_WF','수전 설치',23,1,array['FUR_TOP']::text[],array['CLN_FN']::text[],false,'위생공',1,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json',null),
('HQ','CLN_FN','준공청소',24,1,array['FUR_KIT','FLR_SK','ELE_DL','BAT_DOOR']::text[],'{}',true,'보통인부',2,null,null,'principal_seed','INTERNAL_ESTIMATED','ECOREAN_공정일정템플릿.json','입주 전 최종 청소. 고객 검수 동행')
on conflict (tenant_id,process_code) do update set process_name = excluded.process_name, default_start_day = excluded.default_start_day, default_duration = excluded.default_duration, predecessors = excluded.predecessors, successors = excluded.successors, critical_path = excluded.critical_path, worker_role = excluded.worker_role, min_workers = excluded.min_workers, curring_hours = excluded.curring_hours, lead_time_days = excluded.lead_time_days, source = excluded.source, data_status = excluded.data_status, origin_dataset = excluded.origin_dataset, notes = excluded.notes, updated_at = now();

insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)
values ('schedule_templates', 'ECOREAN_공정일정템플릿.json', '1b8d007696a14b48faa254295c8d61c371040a081e8e4b39b35ff4a42b5570fc', 35)
on conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();
