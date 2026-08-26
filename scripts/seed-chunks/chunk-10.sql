INSERT INTO floor_plans (complex_name,region_sido,region_gugun,address,area_type,exclusive_area_m2,rooms,baths,source,source_note,image_path,lat,lng)
SELECT v.c1,v.c2,v.c3,v.c4,v.c5,v.c6,v.c7,v.c8,'minicad','실단지 개략 재작도 (참고용·실측 아님)',v.c9,v.c10,v.c11
FROM (VALUES
('이도주공1','제주','제주시','구남로7길 36 (이도이동)','59',59.4,3,1,'/catalog/plans/img/cx-aa69002202-59.svg',33.4927,126.5346),
('제주이도한일베라체','제주','제주시','신설로 55 (이도이동)','84',84.5,3,2,'/catalog/plans/img/cx-aa69073101-84.svg',33.4931,126.5439),
('제주이도한일베라체','제주','제주시','신설로 55 (이도이동)','114',114.8,4,2,'/catalog/plans/img/cx-aa69073101-114.svg',33.4931,126.5439),
('제주이도한일베라체','제주','제주시','신설로 55 (이도이동)','145',145.4,4,2,'/catalog/plans/img/cx-aa69073101-145.svg',33.4931,126.5439),
('건입동 현대아파트','제주','제주시','만덕로3길 26 (건입동)','84',99.6,3,1,'/catalog/plans/img/cx-aa69005001-84.svg',33.5152,126.5323),
('건입동 현대아파트','제주','제주시','만덕로3길 26 (건입동)','145',145.4,4,2,'/catalog/plans/img/cx-aa69005001-145.svg',33.5152,126.5323),
('화북주공1','제주','제주시','동화로1길 11 (화북일동)','84',99.6,3,1,'/catalog/plans/img/cx-aa69006101-84.svg',33.5182,126.5774),
('화북주공2','제주','제주시','동화로1길 39 (화북일동)','59',59.4,3,1,'/catalog/plans/img/cx-aa69006102-59.svg',33.5177,126.5774),
('삼화휴먼시아1단지','제주','제주시','화삼북로2길 12 (화북일동)','59',59,3,1,'/catalog/plans/img/cx-aa69078101-59.svg',33.5157,126.5764)
) AS v(c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11)
LEFT JOIN floor_plans f ON f.image_path = v.c9
WHERE f.id IS NULL;
