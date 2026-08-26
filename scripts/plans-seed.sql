INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '헬리오시티', '서울', '송파구', '송파대로 345 (가락동)', '84A', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-helio-84.svg', 37.4972, 127.1233
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-helio-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '헬리오시티', '서울', '송파구', '송파대로 345 (가락동)', '59A', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-helio-59.svg', 37.4972, 127.1233
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-helio-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '파크리오', '서울', '송파구', '올림픽로 435 (신천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-parkrio-84.svg', 37.5203, 127.1078
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-parkrio-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '잠실엘스', '서울', '송파구', '올림픽로 99 (잠실동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-els-84.svg', 37.5118, 127.0887
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-els-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '리센츠', '서울', '송파구', '올림픽로 135 (잠실동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-ricenz-84.svg', 37.5145, 127.0922
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-ricenz-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '올림픽파크포레온', '서울', '강동구', '양재대로 1025 (둔촌동)', '84A', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-foreon-84.svg', 37.5273, 127.136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-foreon-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '올림픽파크포레온', '서울', '강동구', '양재대로 1025 (둔촌동)', '59A', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-foreon-59.svg', 37.5273, 127.136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-foreon-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '고덕그라시움', '서울', '강동구', '고덕로 333 (고덕동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-gracium-84.svg', 37.559, 127.1553
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-gracium-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '마포래미안푸르지오', '서울', '마포구', '마포대로 195 (아현동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-mapo-rp-84.svg', 37.5535, 126.9557
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-mapo-rp-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이', '서울', '종로구', '송월길 99 (홍파동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-ghg-xi-84.svg', 37.5713, 126.9636
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-ghg-xi-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '반포자이', '서울', '서초구', '신반포로 270 (반포동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-banpo-xi-84.svg', 37.504, 127.0183
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-banpo-xi-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '아크로리버파크', '서울', '서초구', '신반포로15길 19 (반포동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-acro-rp-84.svg', 37.5166, 127.0009
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-acro-rp-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '은마아파트', '서울', '강남구', '삼성로 212 (대치동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-eunma-84.svg', 37.4994, 127.0614
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-eunma-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '목동신시가지7단지', '서울', '양천구', '목동동로 100 (목동)', '66', 65.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-mokdong7-66.svg', 37.5263, 126.8709
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-mokdong7-66.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '위례자연앤래미안e편한세상', '경기', '성남시 수정구', '위례광장로 (창곡동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-wirye-84.svg', 37.4772, 127.143
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-wirye-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '광교중흥S클래스', '경기', '수원시 영통구', '광교중앙로 (원천동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-gwanggyo-84.svg', 37.2857, 127.0589
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-gwanggyo-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동탄역시범한화꿈에그린', '경기', '화성시', '동탄순환대로 (청계동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-dongtan-84.svg', 37.2038, 127.1005
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-dongtan-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '킨텍스원시티', '경기', '고양시 일산서구', '킨텍스로 (대화동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-kintex-84.svg', 37.666, 126.7449
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-kintex-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '산성역포레스티아', '경기', '성남시 수정구', '산성대로 (신흥동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-foresia-84.svg', 37.4553, 127.1521
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-foresia-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '분당파크뷰', '경기', '성남시 분당구', '백현로 (정자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-parkview-84.svg', 37.3653, 127.1094
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-parkview-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송도더샵퍼스트파크', '인천', '연수구', '송도과학로 (송도동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-songdo-84.svg', 37.3925, 126.6588
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-songdo-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼익비치', '부산', '수영구', '광남로 (남천동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-samik-84.svg', 35.1367, 129.1106
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-samik-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '해운대두산위브더제니스', '부산', '해운대구', '마린시티2로 (우동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-zenith-84.svg', 35.1565, 129.145
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-zenith-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '래미안장전', '부산', '금정구', '금정로 (장전동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-jangjeon-84.svg', 35.2305, 129.085
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-jangjeon-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '범어SK뷰', '대구', '수성구', '동대구로 (범어동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-beomeo-84.svg', 35.859, 128.625
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-beomeo-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수성롯데캐슬더퍼스트', '대구', '수성구', '수성로 (수성동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-suseong-84.svg', 35.841, 128.618
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-suseong-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '크로바아파트', '대전', '서구', '둔산로 (둔산동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-crova-84.svg', 36.351, 127.378
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-crova-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '죽동푸르지오', '대전', '유성구', '죽동로 (죽동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-jukdong-84.svg', 36.376, 127.331
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-jukdong-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '봉선동포스코더샵', '광주', '남구', '봉선로 (봉선동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-bongseon-84.svg', 35.121, 126.912
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-bongseon-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '문수로2차아이파크', '울산', '남구', '문수로 (신정동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-munsu-84.svg', 35.53, 129.307
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-munsu-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새롬동캐슬앤파밀리에', '세종', '세종시', '새롬중앙로 (새롬동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-saerom-84.svg', 36.477, 127.254
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-saerom-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '불당지웰더샵', '충남', '천안시 서북구', '불당25로 (불당동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-buldang-84.svg', 36.8, 127.105
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-buldang-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '복대지웰시티', '충북', '청주시 흥덕구', '대농로 (복대동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-jiwell-84.svg', 36.628, 127.426
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-jiwell-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '에코시티더샵', '전북', '전주시 덕진구', '세병로 (송천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-ecocity-84.svg', 35.868, 127.112
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-ecocity-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용지더샵레이크파크', '경남', '창원시 성산구', '중앙대로 (용지동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-yongji-84.svg', 35.228, 128.682
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-yongji-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '노형2차아이파크', '제주', '제주시', '노형로 (노형동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-nohyeong-84.svg', 33.486, 126.48
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-nohyeong-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '래미안대치팰리스', '서울', '강남구', '대치동', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-daechi-rp-84.svg', 37.4991, 127.057
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-daechi-rp-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '도곡렉슬', '서울', '강남구', '도곡동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-dogok-84.svg', 37.491, 127.048
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-dogok-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '래미안퍼스티지', '서울', '서초구', '반포동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-firstige-84.svg', 37.509, 127.008
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-firstige-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '잠실트리지움', '서울', '송파구', '잠실동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-trizium-84.svg', 37.51, 127.083
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-trizium-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '레이크팰리스', '서울', '송파구', '잠실동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-lakepal-84.svg', 37.508, 127.096
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-lakepal-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '왕십리텐즈힐', '서울', '성동구', '하왕십리동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-tenzhill-84.svg', 37.564, 127.029
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-tenzhill-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '마곡엠밸리7단지', '서울', '강서구', '마곡동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-magok7-84.svg', 37.567, 126.827
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-magok7-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신길래미안에스티움', '서울', '영등포구', '신길동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-estium-84.svg', 37.508, 126.913
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-estium-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '아크로리버하임', '서울', '동작구', '흑석동', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-riverheim-84.svg', 37.507, 126.963
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-riverheim-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌한가람', '서울', '용산구', '이촌동', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-hangaram-84.svg', 37.521, 126.972
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-hangaram-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '상계주공7단지', '서울', '노원구', '상계동', '66', 65.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-sanggye7-66.svg', 37.656, 127.063
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-sanggye7-66.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '길음뉴타운래미안', '서울', '성북구', '길음동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-gileum-84.svg', 37.603, 127.025
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-gileum-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'DMC파크뷰자이', '서울', '은평구', '수색동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-dmc-xi-84.svg', 37.58, 126.895
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-dmc-xi-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '판교원마을푸르지오', '경기', '성남시 분당구', '판교동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-pangyo-84.svg', 37.388, 127.085
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-pangyo-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '광명역파크자이', '경기', '광명시', '일직동', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-gmxi-84.svg', 37.416, 126.884
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-gmxi-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '다산자연앤e편한세상', '경기', '남양주시', '다산동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-dasan-84.svg', 37.618, 127.155
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-dasan-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '별내아이파크', '경기', '남양주시', '별내동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-byeollae-84.svg', 37.644, 127.113
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-byeollae-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '배곧한라비발디', '경기', '시흥시', '배곧동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-baegot-84.svg', 37.368, 126.726
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-baegot-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '평촌더샵센트럴시티', '경기', '안양시 동안구', '호계동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-pyeongchon-84.svg', 37.389, 126.956
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-pyeongchon-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '산본래미안하이어스', '경기', '군포시', '산본동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-sanbon-84.svg', 37.362, 126.93
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-sanbon-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원SK스카이뷰', '경기', '수원시 장안구', '정자동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-suwon-sk-84.svg', 37.306, 126.997
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-suwon-sk-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '일산위시티자이', '경기', '고양시 일산동구', '식사동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-wisity-84.svg', 37.679, 126.795
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-wisity-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '김포한강반도유보라', '경기', '김포시', '장기동', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-gimpo-59.svg', 37.644, 126.67
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-gimpo-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '위례중앙푸르지오', '경기', '하남시', '학암동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-wirye-jp-84.svg', 37.484, 127.149
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-wirye-jp-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '미사강변센트럴자이', '경기', '하남시', '망월동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-misa-xi-84.svg', 37.563, 127.189
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-misa-xi-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동탄역더샵센트럴시티', '경기', '화성시', '오산동', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-dongtan2-84.svg', 37.2, 127.093
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-dongtan2-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청라제일풍경채', '인천', '서구', '청라동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-cheongna-84.svg', 37.534, 126.652
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-cheongna-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '부평래미안', '인천', '부평구', '부평동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-bupyeong-84.svg', 37.507, 126.722
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-bupyeong-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화명롯데캐슬카이저', '부산', '북구', '화명동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-hwamyeong-84.svg', 35.234, 129.012
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-hwamyeong-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '광안쌍용예가디오션', '부산', '수영구', '광안동', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-gwangan-84.svg', 35.156, 129.113
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-gwangan-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '월배아이파크', '대구', '달서구', '진천동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-wolbae-84.svg', 35.818, 128.523
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-wolbae-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '트리풀시티', '대전', '유성구', '상대동', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-trifull-84.svg', 36.348, 127.341
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-trifull-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수완진아리채', '광주', '광산구', '수완동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-suwan-84.svg', 35.191, 126.825
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-suwan-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송정금강펜테리움', '울산', '북구', '송정동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-songjeong-84.svg', 35.598, 129.356
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-songjeong-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '도램마을10단지', '세종', '세종시', '도담동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-doram-84.svg', 36.51, 127.262
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-doram-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '온의롯데캐슬스카이클래스', '강원', '춘천시', '온의동', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-onui-84.svg', 37.868, 127.72
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-onui-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '포항자이', '경북', '포항시 북구', '장성동', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-pohang-84.svg', 36.073, 129.382
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-pohang-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '광화문스페이스본 아파트', '서울', '종로구', '사직로8길 4 (신문로2가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11005401-84.svg', 37.5745, 126.9688
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11005401-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '광화문스페이스본 아파트', '서울', '종로구', '사직로8길 4 (신문로2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11005401-114.svg', 37.5745, 126.9688
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11005401-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '광화문스페이스본 아파트', '서울', '종로구', '사직로8길 4 (신문로2가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11005401-145.svg', 37.5745, 126.9688
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11005401-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '명륜아남1차', '서울', '종로구', '창경궁로 265 (명륜2가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11052201-84.svg', 37.5861, 126.9993
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11052201-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신두산', '서울', '종로구', '지봉로5길 7 (창신동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11054101-59.svg', 37.5741, 127.0138
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11054101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신두산', '서울', '종로구', '지봉로5길 7 (창신동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11054101-84.svg', 37.5741, 127.0138
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11054101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신두산', '서울', '종로구', '지봉로5길 7 (창신동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11054101-114.svg', 37.5741, 127.0138
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11054101-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신쌍용1단지', '서울', '종로구', '동망산길 19 (창신동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11054301-59.svg', 37.58, 127.0142
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11054301-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신쌍용1단지', '서울', '종로구', '동망산길 19 (창신동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11054301-84.svg', 37.58, 127.0142
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11054301-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신쌍용1단지', '서울', '종로구', '동망산길 19 (창신동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11054301-114.svg', 37.58, 127.0142
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11054301-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신쌍용아파트2단지', '서울', '종로구', '낙산길 198 (창신동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11077101-59.svg', 37.5811, 127.0115
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11077101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신쌍용아파트2단지', '서울', '종로구', '낙산길 198 (창신동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11077101-84.svg', 37.5811, 127.0115
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11077101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창신쌍용아파트2단지', '서울', '종로구', '낙산길 198 (창신동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11077101-114.svg', 37.5811, 127.0115
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11077101-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '종로센트레빌', '서울', '종로구', '동망산길 47 (숭인동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11087602-59.svg', 37.5801, 127.0154
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11087602-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '종로센트레빌', '서울', '종로구', '동망산길 47 (숭인동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11087602-84.svg', 37.5801, 127.0154
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11087602-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '종로센트레빌', '서울', '종로구', '동망산길 47 (숭인동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11087602-114.svg', 37.5801, 127.0154
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11087602-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이3단지', '서울', '종로구', '경교장길 35 (평동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027105-59.svg', 37.5688, 126.9649
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027105-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이3단지', '서울', '종로구', '경교장길 35 (평동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027105-84.svg', 37.5688, 126.9649
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027105-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이3단지', '서울', '종로구', '경교장길 35 (평동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027105-114.svg', 37.5688, 126.9649
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027105-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이2단지 아파트', '서울', '종로구', '송월길 99 (홍파동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027118-59.svg', 37.5696, 126.9634
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027118-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이2단지 아파트', '서울', '종로구', '송월길 99 (홍파동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027118-84.svg', 37.5696, 126.9634
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027118-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이2단지 아파트', '서울', '종로구', '송월길 99 (홍파동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027118-114.svg', 37.5696, 126.9634
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027118-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이2단지 아파트', '서울', '종로구', '송월길 99 (홍파동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027118-145.svg', 37.5696, 126.9634
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027118-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경희궁자이1단지(임대아파트)', '서울', '종로구', '송월길 130 (행촌동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026946-59.svg', 37.5706, 126.9653
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026946-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '무악현대임대아파트', '서울', '종로구', '통일로 246-11 (무악동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11008001-59.svg', 37.5748, 126.9594
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11008001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인왕산아이파크', '서울', '종로구', '통일로18길 9 (무악동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11081302-59.svg', 37.5761, 126.9589
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11081302-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인왕산아이파크', '서울', '종로구', '통일로18길 9 (무악동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11081302-84.svg', 37.5761, 126.9589
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11081302-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인왕산아이파크', '서울', '종로구', '통일로18길 9 (무악동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11081302-114.svg', 37.5761, 126.9589
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11081302-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인왕산아이파크', '서울', '종로구', '통일로18길 9 (무악동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11081302-145.svg', 37.5761, 126.9589
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11081302-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '무악현대아파트', '서울', '종로구', '통일로 246-20 (무악동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11081503-59.svg', 37.5747, 126.9586
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11081503-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '무악현대아파트', '서울', '종로구', '통일로 246-20 (무악동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11081503-84.svg', 37.5747, 126.9586
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11081503-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '무악현대아파트', '서울', '종로구', '통일로 246-20 (무악동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa11081503-114.svg', 37.5747, 126.9586
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa11081503-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산롯데캐슬아이리스', '서울', '중구', '소공로 35 (회현동1가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10088102-59.svg', 37.5575, 126.9836
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10088102-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산롯데캐슬아이리스', '서울', '중구', '소공로 35 (회현동1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10088102-114.svg', 37.5575, 126.9836
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10088102-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산롯데캐슬아이리스', '서울', '중구', '소공로 35 (회현동1가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10088102-145.svg', 37.5575, 126.9836
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10088102-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '세운푸르지오헤리시티', '서울', '중구', '마른내로 79 (인현동2가)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023352-59.svg', 37.5644, 126.9982
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023352-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트세운센트럴2단지', '서울', '중구', '을지로15길 32 (입정동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023343-59.svg', 37.5653, 126.9935
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023343-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트세운센트럴1단지', '서울', '중구', '을지로15길 31 (입정동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023356-59.svg', 37.5661, 126.9935
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023356-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당 파인힐 하나유보라', '서울', '중구', '왕십리로 407 (신당동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025456-59.svg', 37.5649, 127.0249
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025456-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당푸르지오', '서울', '중구', '다산로36길 110 (신당동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045001-59.svg', 37.5623, 127.0166
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당푸르지오', '서울', '중구', '다산로36길 110 (신당동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045001-84.svg', 37.5623, 127.0166
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당푸르지오', '서울', '중구', '다산로36길 110 (신당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045001-114.svg', 37.5623, 127.0166
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당푸르지오', '서울', '중구', '다산로36길 110 (신당동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045001-145.svg', 37.5623, 127.0166
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청구e편한세상(분양)', '서울', '중구', '청구로 64 (신당동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045002-59.svg', 37.5605, 127.0121
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청구e편한세상(분양)', '서울', '중구', '청구로 64 (신당동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045002-84.svg', 37.5605, 127.0121
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청구e편한세상(분양)', '서울', '중구', '청구로 64 (신당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045002-114.svg', 37.5605, 127.0121
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청구e편한세상(분양)', '서울', '중구', '청구로 64 (신당동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045002-145.svg', 37.5605, 127.0121
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045002-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당남산타운임대', '서울', '중구', '다산로 32 (신당동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045301-59.svg', 37.5631, 127.0159
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045301-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당남산타운(분양)', '서울', '중구', '다산로 32 (신당동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045302-59.svg', 37.5631, 127.0159
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045302-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당남산타운(분양)', '서울', '중구', '다산로 32 (신당동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045302-84.svg', 37.5631, 127.0159
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045302-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당남산타운(분양)', '서울', '중구', '다산로 32 (신당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045302-114.svg', 37.5631, 127.0159
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045302-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당삼성임대', '서울', '중구', '청구로1길 23 (신당동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045401-59.svg', 37.5585, 127.0184
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045401-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '약수하이츠아파트(임대)', '서울', '중구', '동호로10길 30 (신당동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045402-59.svg', 37.5548, 127.0124
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045402-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당삼성(분양)', '서울', '중구', '청구로1길 23 (신당동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045403-59.svg', 37.5585, 127.0184
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045403-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당삼성(분양)', '서울', '중구', '청구로1길 23 (신당동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045403-84.svg', 37.5585, 127.0184
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045403-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당삼성(분양)', '서울', '중구', '청구로1길 23 (신당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045403-114.svg', 37.5585, 127.0184
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045403-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당약수하이츠', '서울', '중구', '동호로10길 30 (신당동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045404-59.svg', 37.5548, 127.0124
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045404-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당약수하이츠', '서울', '중구', '동호로10길 30 (신당동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045404-84.svg', 37.5548, 127.0124
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045404-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당약수하이츠', '서울', '중구', '동호로10길 30 (신당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045404-114.svg', 37.5548, 127.0124
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045404-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당현대', '서울', '중구', '다산로36길 109 (신당동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045601-84.svg', 37.56, 127.0216
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045601-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당현대', '서울', '중구', '다산로36길 109 (신당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045601-114.svg', 37.56, 127.0216
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045601-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신당현대', '서울', '중구', '다산로36길 109 (신당동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10045601-145.svg', 37.56, 127.0216
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10045601-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '래미안신당하이베르', '서울', '중구', '퇴계로90길 74 (신당동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10078901-59.svg', 37.561, 127.021
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10078901-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '래미안신당하이베르', '서울', '중구', '퇴계로90길 74 (신당동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10078901-84.svg', 37.561, 127.021
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10078901-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '래미안신당하이베르', '서울', '중구', '퇴계로90길 74 (신당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10078901-114.svg', 37.561, 127.021
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10078901-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'SH황학롯데캐슬베네치아', '서울', '중구', '청계천로 400 (황학동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10044001-59.svg', 37.5576, 126.9689
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10044001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '롯데캐슬베네치아', '서울', '중구', '청계천로 400 (황학동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10044002-59.svg', 37.5576, 126.9689
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10044002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '롯데캐슬베네치아', '서울', '중구', '청계천로 400 (황학동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10044002-84.svg', 37.5576, 126.9689
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10044002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '롯데캐슬베네치아', '서울', '중구', '청계천로 400 (황학동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10044002-114.svg', 37.5576, 126.9689
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10044002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중림삼성래미안아파트', '서울', '중구', '중림로4길 41 (중림동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10085902-59.svg', 37.5581, 126.9642
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10085902-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중림삼성사이버빌리지', '서울', '중구', '중림로 10 (중림동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10085903-59.svg', 37.5591, 126.9654
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10085903-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중림삼성사이버빌리지', '서울', '중구', '중림로 10 (중림동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10085903-84.svg', 37.5591, 126.9654
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10085903-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중림삼성사이버빌리지', '서울', '중구', '중림로 10 (중림동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10085903-114.svg', 37.5591, 126.9654
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10085903-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서울역센트럴자이아파트', '서울', '중구', '만리재로 175 (만리동2가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026881-59.svg', 37.5534, 126.9631
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026881-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서울역센트럴자이아파트', '서울', '중구', '만리재로 175 (만리동2가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026881-84.svg', 37.5534, 126.9631
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026881-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서울역센트럴자이아파트', '서울', '중구', '만리재로 175 (만리동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026881-114.svg', 37.5534, 126.9631
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026881-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산원효루미니', '서울', '용산구', '원효로1가', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023798-59.svg', 37.5397, 126.967
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023798-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산더프라임', '서울', '용산구', '원효로90길 11 (원효로1가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14070302-59.svg', 37.5404, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14070302-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산더프라임', '서울', '용산구', '원효로90길 11 (원효로1가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14070302-84.svg', 37.5404, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14070302-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산더프라임', '서울', '용산구', '원효로90길 11 (원효로1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14070302-114.svg', 37.5404, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14070302-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산더프라임', '서울', '용산구', '원효로90길 11 (원효로1가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14070302-145.svg', 37.5404, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14070302-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '리버힐삼성아파트', '서울', '용산구', '효창원로 17 (산천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14004002-59.svg', 37.5344, 126.9502
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14004002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '리버힐삼성아파트', '서울', '용산구', '효창원로 17 (산천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14004002-84.svg', 37.5344, 126.9502
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14004002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '리버힐삼성아파트', '서울', '용산구', '효창원로 17 (산천동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14004002-114.svg', 37.5344, 126.9502
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14004002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '산천리버힐제2', '서울', '용산구', '효창원로13길 7 (산천동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14076401-59.svg', 37.5358, 126.9521
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14076401-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원효산호', '서울', '용산구', '원효로 66 (원효로4가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14085002-59.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14085002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원효산호', '서울', '용산구', '원효로 66 (원효로4가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14085002-84.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14085002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원효산호', '서울', '용산구', '원효로 66 (원효로4가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14085002-114.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14085002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원효로강변삼성스위트', '서울', '용산구', '원효로 40 (원효로4가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14085101-59.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14085101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원효로강변삼성스위트', '서울', '용산구', '원효로 40 (원효로4가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14085101-84.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14085101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산데시앙포레아파트', '서울', '용산구', '효창원로 227 (효창동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023858-59.svg', 37.5367, 126.9576
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023858-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산데시앙포레아파트', '서울', '용산구', '효창원로 227 (효창동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023858-84.svg', 37.5367, 126.9576
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023858-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산롯데캐슬센터포레아파트', '서울', '용산구', '백범로 313 (효창동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025533-59.svg', 37.5393, 126.9629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025533-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산롯데캐슬센터포레아파트', '서울', '용산구', '백범로 313 (효창동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025533-84.svg', 37.5393, 126.9629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025533-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산롯데캐슬센터포레아파트', '서울', '용산구', '백범로 313 (효창동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025533-114.svg', 37.5393, 126.9629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025533-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효창파크푸르지오', '서울', '용산구', '백범로 260 (효창동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14074101-59.svg', 37.5389, 126.9628
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14074101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효창파크푸르지오', '서울', '용산구', '백범로 260 (효창동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14074101-84.svg', 37.5389, 126.9628
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14074101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효창파크푸르지오', '서울', '용산구', '백범로 260 (효창동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14074101-114.svg', 37.5389, 126.9628
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14074101-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '도원삼성제2', '서울', '용산구', '새창로8길 7 (도원동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14007001-59.svg', 37.5373, 126.9524
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14007001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '도원삼성래미안', '서울', '용산구', '새창로 70 (도원동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14007002-59.svg', 37.5383, 126.9558
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14007002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '도원삼성래미안', '서울', '용산구', '새창로 70 (도원동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14007002-84.svg', 37.5383, 126.9558
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14007002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '도원삼성래미안', '서울', '용산구', '새창로 70 (도원동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14007002-114.svg', 37.5383, 126.9558
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14007002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산e편한세상', '서울', '용산구', '원효로 216 (신계동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14009001-59.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14009001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산e편한세상', '서울', '용산구', '원효로 216 (신계동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14009001-84.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14009001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산e편한세상', '서울', '용산구', '원효로 216 (신계동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14009001-114.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14009001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산e편한세상', '서울', '용산구', '원효로 216 (신계동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14009001-145.svg', 37.5343, 126.9492
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14009001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산파크자이', '서울', '용산구', '한강대로 205 (한강로1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14075201-114.svg', 37.5366, 126.9727
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14075201-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산파크자이', '서울', '용산구', '한강대로 205 (한강로1가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14075201-145.svg', 37.5366, 126.9727
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14075201-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산 베르디움 프렌즈', '서울', '용산구', '백범로99길 40 (한강로2가)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024333-59.svg', 37.5359, 126.9715
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024333-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '파크타워', '서울', '용산구', '서빙고로 67 (용산동5가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14002501-84.svg', 37.5232, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14002501-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '파크타워', '서울', '용산구', '서빙고로 67 (용산동5가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14002501-114.svg', 37.5232, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14002501-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '파크타워', '서울', '용산구', '서빙고로 67 (용산동5가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14002501-145.svg', 37.5232, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14002501-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산센트럴파크', '서울', '용산구', '서빙고로 17 (한강로3가)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024691-59.svg', 37.5269, 126.9666
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024691-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산센트럴파크', '서울', '용산구', '서빙고로 17 (한강로3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024691-114.svg', 37.5269, 126.9666
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024691-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산센트럴파크', '서울', '용산구', '서빙고로 17 (한강로3가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024691-145.svg', 37.5269, 126.9666
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024691-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산시티파크1단지', '서울', '용산구', '서빙고로 35 (한강로3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14001303-114.svg', 37.5232, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14001303-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '용산시티파크1단지', '서울', '용산구', '서빙고로 35 (한강로3가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14001303-145.svg', 37.5232, 126.9697
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14001303-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '래미안첼리투스', '서울', '용산구', '이촌로 300 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027908-114.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027908-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌동부센트레빌', '서울', '용산구', '이촌로 174 (이촌동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003004-59.svg', 37.5285, 126.9543
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌동부센트레빌', '서울', '용산구', '이촌로 174 (이촌동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003004-84.svg', 37.5285, 126.9543
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌동부센트레빌', '서울', '용산구', '이촌로 174 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003004-114.svg', 37.5285, 126.9543
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003004-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌동아그린아파트', '서울', '용산구', '이촌로 100-8 (이촌동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003006-59.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003006-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌동아그린아파트', '서울', '용산구', '이촌로 100-8 (이촌동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003006-84.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003006-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌동아그린아파트', '서울', '용산구', '이촌로 100-8 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003006-114.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003006-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'LG한강자이', '서울', '용산구', '이촌로64길 15 (이촌동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003007-84.svg', 37.5201, 126.9685
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003007-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'LG한강자이', '서울', '용산구', '이촌로64길 15 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003007-114.svg', 37.5201, 126.9685
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003007-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'LG한강자이', '서울', '용산구', '이촌로64길 15 (이촌동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003007-145.svg', 37.5201, 126.9685
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003007-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌한강맨션', '서울', '용산구', '이촌로 248 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003008-114.svg', 37.5193, 126.9751
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003008-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌한강맨션', '서울', '용산구', '이촌로 248 (이촌동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003008-145.svg', 37.5193, 126.9751
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003008-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한강대우', '서울', '용산구', '이촌로 181 (이촌동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003105-59.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003105-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한강대우', '서울', '용산구', '이촌로 181 (이촌동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003105-84.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003105-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한강대우', '서울', '용산구', '이촌로 181 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003105-114.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003105-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한강대우', '서울', '용산구', '이촌로 181 (이촌동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003105-145.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003105-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌강촌아파트', '서울', '용산구', '이촌로81길 14 (이촌동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003106-59.svg', 37.5199, 126.9768
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003106-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌강촌아파트', '서울', '용산구', '이촌로81길 14 (이촌동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003106-84.svg', 37.5199, 126.9768
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003106-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌강촌아파트', '서울', '용산구', '이촌로81길 14 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14003106-114.svg', 37.5199, 126.9768
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14003106-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한가람아파트', '서울', '용산구', '이촌로 201 (이촌동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14072701-59.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14072701-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한가람아파트', '서울', '용산구', '이촌로 201 (이촌동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14072701-84.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14072701-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한가람아파트', '서울', '용산구', '이촌로 201 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14072701-114.svg', 37.5198, 126.9741
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14072701-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌', '서울', '용산구', '이촌로87길 21 (이촌동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14072702-59.svg', 37.5195, 126.9787
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14072702-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌', '서울', '용산구', '이촌로87길 21 (이촌동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14072702-84.svg', 37.5195, 126.9787
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14072702-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌', '서울', '용산구', '이촌로87길 21 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14072702-114.svg', 37.5195, 126.9787
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14072702-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '북한강성원아파트', '서울', '용산구', '이촌로2가길 66 (이촌동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14072901-59.svg', 37.5267, 126.9541
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14072901-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '현대한강', '서울', '용산구', '이촌로34길 29 (이촌동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14085501-59.svg', 37.5232, 126.9586
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14085501-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '현대한강', '서울', '용산구', '이촌로34길 29 (이촌동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14085501-84.svg', 37.5232, 126.9586
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14085501-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌대림', '서울', '용산구', '이촌로2가길 122 (이촌동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14090902-59.svg', 37.5267, 126.9541
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14090902-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌대림', '서울', '용산구', '이촌로2가길 122 (이촌동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14090902-84.svg', 37.5267, 126.9541
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14090902-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이촌대림', '서울', '용산구', '이촌로2가길 122 (이촌동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14090902-114.svg', 37.5267, 126.9541
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14090902-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청화아파트', '서울', '용산구', '장문로 27 (이태원동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14086001-114.svg', 37.5289, 126.9921
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14086001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청화아파트', '서울', '용산구', '장문로 27 (이태원동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14086001-145.svg', 37.5289, 126.9921
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14086001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산대림아파트', '서울', '용산구', '녹사평대로 254 (이태원동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14086101-59.svg', 37.5416, 126.9884
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14086101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산대림아파트', '서울', '용산구', '녹사평대로 254 (이태원동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14086101-84.svg', 37.5416, 126.9884
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14086101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산대림아파트', '서울', '용산구', '녹사평대로 254 (이태원동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14086101-114.svg', 37.5416, 126.9884
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14086101-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산대림아파트', '서울', '용산구', '녹사평대로 254 (이태원동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14086101-145.svg', 37.5416, 126.9884
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14086101-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '나인원 한남', '서울', '용산구', '한남대로 91 (한남동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025192-145.svg', 37.5332, 127.0083
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025192-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한남동리첸시아', '서울', '용산구', '한남대로 60 (한남동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14021001-59.svg', 37.5341, 127.0077
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14021001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한남동리첸시아', '서울', '용산구', '한남대로 60 (한남동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14021001-84.svg', 37.5341, 127.0077
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14021001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한남동리첸시아', '서울', '용산구', '한남대로 60 (한남동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa14021001-114.svg', 37.5341, 127.0077
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa14021001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '포레나북수원', '경기', '수원장안구', '장안구 경수대로 1110-39 (파장동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022987-84.svg', 37.319, 126.9882
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022987-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '북수원자이렉스비아', '경기', '수원장안구', '장안구 장안로 271 (정자동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022677-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022677-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '북수원자이렉스비아', '경기', '수원장안구', '장안구 장안로 271 (정자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022677-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022677-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '북수원자이렉스비아', '경기', '수원장안구', '장안구 장안로 271 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022677-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022677-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역푸르지오브리시엘', '경기', '수원장안구', '장안구 수성로157번길 60 (정자동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022938-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022938-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역푸르지오브리시엘', '경기', '수원장안구', '장안구 수성로157번길 60 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022938-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022938-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역푸르지오브리시엘', '경기', '수원장안구', '장안구 수성로157번길 60 (정자동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022938-145.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022938-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역 파크 푸르지오', '경기', '수원장안구', '장안구 대평로 27 (정자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024170-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024170-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역 파크 푸르지오', '경기', '수원장안구', '장안구 대평로 27 (정자동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024170-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024170-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역 파크 푸르지오', '경기', '수원장안구', '장안구 대평로 27 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024170-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024170-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역 파크 푸르지오', '경기', '수원장안구', '장안구 대평로 27 (정자동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024170-145.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024170-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자백설마을주공2단지', '경기', '수원장안구', '장안구 대평로89번길 10 (정자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44030004-59.svg', 37.2957, 126.9915
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44030004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자동신3차', '경기', '수원장안구', '장안구 장안로 200 (정자동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070703-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070703-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자동신1차', '경기', '수원장안구', '장안구 장안로 232 (정자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070706-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070706-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자동신1차', '경기', '수원장안구', '장안구 장안로 232 (정자동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070706-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070706-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자동신2차', '경기', '수원장안구', '장안구 장안로 211 (정자동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070707-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070707-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자동신2차', '경기', '수원장안구', '장안구 장안로 211 (정자동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070707-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070707-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '백설에듀빌', '경기', '수원장안구', '장안구 대평로89번길 32 (정자동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071902-84.svg', 37.2957, 126.9915
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071902-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역 더 센트럴', '경기', '수원장안구', '장안구 정자천로133번길 26 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071906-114.svg', 37.2943, 126.9908
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071906-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역 더 센트럴', '경기', '수원장안구', '장안구 정자천로133번길 26 (정자동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071906-145.svg', 37.2943, 126.9908
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071906-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자백설마을코오롱현대', '경기', '수원장안구', '장안구 만석로68번길 10 (정자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071908-59.svg', 37.2963, 126.9895
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071908-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼환나우빌', '경기', '수원장안구', '장안구 천천로22번길 34 (정자동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071909-59.svg', 37.2948, 126.9891
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071909-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자연꽃마을벽산', '경기', '수원장안구', '장안구 정자천로189번길 40 (정자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072003-84.svg', 37.2986, 126.9951
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자연꽃마을풍림', '경기', '수원장안구', '장안구 정자천로189번길 47 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072010-114.svg', 37.2978, 126.9922
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072010-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '꽃뫼노을마을신안아파트', '경기', '수원장안구', '장안구 대평로51번길 22 (정자동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072108-84.svg', 37.2923, 126.9924
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072108-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역파크뷰아파트', '경기', '수원장안구', '장안구 대평로51번길 56 (정자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072110-59.svg', 37.2923, 126.9924
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072110-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자두견마을벽산3차', '경기', '수원장안구', '장안구 정자천로188번길 28 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072209-114.svg', 37.2946, 126.9974
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072209-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역현대벽산', '경기', '수원장안구', '장안구 정자천로188번길 64 (정자동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072211-59.svg', 37.2946, 126.9974
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072211-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역 우방 센트럴파크', '경기', '수원장안구', '장안구 수성로245번길 21 (정자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072212-59.svg', 37.2916, 126.9978
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072212-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자대월마을대림진흥', '경기', '수원장안구', '장안구 천천로74번길 92 (정자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072805-84.svg', 37.3012, 126.9884
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072805-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '북수원 리버파크아파트', '경기', '수원장안구', '장안구 천천로74번길 35 (정자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072806-59.svg', 37.3012, 126.9884
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072806-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역위너스파크아파트', '경기', '수원장안구', '장안구 천천로21번길 33 (정자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073307-84.svg', 37.2937, 126.9863
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073307-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자청솔마을한라비발디', '경기', '수원장안구', '장안구 만석로20번길 28 (정자동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073411-59.svg', 37.2943, 126.9847
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073411-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자청솔마을SK한화', '경기', '수원장안구', '장안구 만석로20번길 25 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073504-114.svg', 37.2943, 126.9847
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073504-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자청솔마을SK한화', '경기', '수원장안구', '장안구 만석로20번길 25 (정자동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073504-145.svg', 37.2943, 126.9847
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073504-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자동 경남아너스빌 아파트', '경기', '수원장안구', '장안구 만석로159번길 31 (정자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44083704-59.svg', 37.3018, 126.9964
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44083704-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자동 경남아너스빌 아파트', '경기', '수원장안구', '장안구 만석로159번길 31 (정자동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44083704-84.svg', 37.3018, 126.9964
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44083704-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자동 경남아너스빌 아파트', '경기', '수원장안구', '장안구 만석로159번길 31 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44083704-114.svg', 37.3018, 126.9964
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44083704-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자벽산블루밍', '경기', '수원장안구', '장안구 파장로 53 (정자동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44084005-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44084005-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자벽산블루밍', '경기', '수원장안구', '장안구 파장로 53 (정자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44084005-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44084005-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '정자벽산블루밍', '경기', '수원장안구', '장안구 파장로 53 (정자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44084005-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44084005-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원장안힐스테이트', '경기', '수원장안구', '장안구 장안로359번길 20 (이목동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070601-59.svg', 37.3116, 126.985
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070601-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원장안힐스테이트', '경기', '수원장안구', '장안구 장안로359번길 20 (이목동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070601-84.svg', 37.3116, 126.985
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070601-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원장안힐스테이트', '경기', '수원장안구', '장안구 장안로359번길 20 (이목동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070601-114.svg', 37.3116, 126.985
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070601-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원장안STX칸', '경기', '수원장안구', '장안구 장안로385번길 95 (이목동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070602-59.svg', 37.3144, 126.9839
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070602-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원장안STX칸', '경기', '수원장안구', '장안구 장안로385번길 95 (이목동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070602-84.svg', 37.3144, 126.9839
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070602-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원장안STX칸', '경기', '수원장안구', '장안구 장안로385번길 95 (이목동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070602-114.svg', 37.3144, 126.9839
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070602-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성균관대역 동문 디 이스트', '경기', '수원장안구', '장안구 율전로101번길 73 (율전동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026691-59.svg', 37.2989, 126.9648
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026691-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성균관대역 동문 디 이스트', '경기', '수원장안구', '장안구 율전로101번길 73 (율전동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026691-84.svg', 37.2989, 126.9648
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026691-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전삼성1단지', '경기', '수원장안구', '장안구 서부로 2065 (율전동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070506-59.svg', 37.3005, 126.9728
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070506-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전삼성1단지', '경기', '수원장안구', '장안구 서부로 2065 (율전동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070506-84.svg', 37.3005, 126.9728
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070506-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전삼성2단지', '경기', '수원장안구', '장안구 서부로 2067 (율전동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070509-59.svg', 37.2974, 126.971
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070509-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전삼성2단지', '경기', '수원장안구', '장안구 서부로 2067 (율전동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070509-84.svg', 37.2974, 126.971
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070509-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전밤꽃마을주공2단지', '경기', '수원장안구', '장안구 상률로12번길 28 (율전동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072408-59.svg', 37.3052, 126.9676
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072408-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전밤꽃마을뜨란채', '경기', '수원장안구', '장안구 상률로 32 (율전동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072412-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072412-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전밤꽃마을뜨란채', '경기', '수원장안구', '장안구 상률로 32 (율전동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072412-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072412-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전신일', '경기', '수원장안구', '장안구 화산로 263 (율전동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072611-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072611-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전신일', '경기', '수원장안구', '장안구 화산로 263 (율전동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072611-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072611-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전신일', '경기', '수원장안구', '장안구 화산로 263 (율전동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072611-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072611-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전이안', '경기', '수원장안구', '장안구 율전로 73 (율전동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073707-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073707-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전이안', '경기', '수원장안구', '장안구 율전로 73 (율전동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073707-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073707-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전이안', '경기', '수원장안구', '장안구 율전로 73 (율전동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073707-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073707-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '율전벽산블루밍', '경기', '수원장안구', '장안구 덕영대로407번길 63-27 (율전동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073805-84.svg', 37.3035, 126.9677
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073805-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역푸르지오더에듀포레', '경기', '수원장안구', '장안구 화산로 85 (천천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44033010-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44033010-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역푸르지오더에듀포레', '경기', '수원장안구', '장안구 화산로 85 (천천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44033010-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44033010-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역푸르지오더에듀포레', '경기', '수원장안구', '장안구 화산로 85 (천천동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44033010-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44033010-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화서역푸르지오더에듀포레', '경기', '수원장안구', '장안구 화산로 85 (천천동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44033010-145.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44033010-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천천현대', '경기', '수원장안구', '장안구 하률로46번길 17 (천천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071006-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071006-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼호진덕', '경기', '수원장안구', '장안구 하률로46번길 22 (천천동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071301-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071301-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천천비단마을현대성우우방', '경기', '수원장안구', '장안구 만석로 29 (천천동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071704-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071704-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천천비단마을현대성우우방', '경기', '수원장안구', '장안구 만석로 29 (천천동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071704-145.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071704-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천천삼성래미안', '경기', '수원장안구', '장안구 화산로187번길 19 (천천동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072307-59.svg', 37.2981, 126.9753
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072307-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천천삼성래미안', '경기', '수원장안구', '장안구 화산로187번길 19 (천천동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072307-84.svg', 37.2981, 126.9753
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072307-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천천신안한일', '경기', '수원장안구', '장안구 하률로30번길 22 (천천동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072503-114.svg', 37.3016, 126.9763
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072503-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천천일성', '경기', '수원장안구', '장안구 정자로19번길 18 (천천동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44072702-84.svg', 37.3017, 126.9786
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44072702-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비단마을베스트타운아파트', '경기', '수원장안구', '장안구 정자로42번길 52 (천천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073008-84.svg', 37.2986, 126.9824
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073008-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천천비단마을신명', '경기', '수원장안구', '장안구 정자로41번길 12 (천천동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44073205-59.svg', 37.3011, 126.9813
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44073205-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원 아너스빌 위즈', '경기', '수원장안구', '장안구 송원로 20 (송죽동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027135-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027135-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원 아너스빌 위즈', '경기', '수원장안구', '장안구 송원로 20 (송죽동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027135-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027135-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원 아너스빌 위즈', '경기', '수원장안구', '장안구 송원로 20 (송죽동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027135-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027135-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원로얄팰리스', '경기', '수원장안구', '장안구 송정로 83 (송죽동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44021003-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44021003-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원로얄팰리스', '경기', '수원장안구', '장안구 송정로 83 (송죽동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44021003-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44021003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원로얄팰리스', '경기', '수원장안구', '장안구 송정로 83 (송죽동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44021003-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44021003-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '더샵광교산퍼스트파크 아파트', '경기', '수원장안구', '장안구 송정로 190 (조원동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023773-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023773-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '더샵광교산퍼스트파크 아파트', '경기', '수원장안구', '장안구 송정로 190 (조원동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023773-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023773-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '광교산임광그대가', '경기', '수원장안구', '장안구 수일로 205 (조원동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070202-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070202-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '광교산임광그대가', '경기', '수원장안구', '장안구 수일로 205 (조원동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070202-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070202-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '조원벽산', '경기', '수원장안구', '장안구 조원로 16 (조원동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070801-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070801-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '조원벽산', '경기', '수원장안구', '장안구 조원로 16 (조원동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070801-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070801-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '조원벽산', '경기', '수원장안구', '장안구 조원로 16 (조원동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070801-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070801-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원한일타운아파트', '경기', '수원장안구', '장안구 경수대로976번길 22 (조원동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070904-59.svg', 37.305, 127.0065
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070904-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원한일타운아파트', '경기', '수원장안구', '장안구 경수대로976번길 22 (조원동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070904-84.svg', 37.305, 127.0065
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070904-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원한일타운아파트', '경기', '수원장안구', '장안구 경수대로976번길 22 (조원동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070904-114.svg', 37.305, 127.0065
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070904-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원한일타운아파트', '경기', '수원장안구', '장안구 경수대로976번길 22 (조원동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44070904-145.svg', 37.305, 127.0065
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44070904-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '조원주공뉴타운1단지', '경기', '수원장안구', '장안구 금당로39번길 33 (조원동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071602-84.svg', 37.3037, 127.0165
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071602-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '조원주공뉴타운2단지', '경기', '수원장안구', '장안구 금당로39번길 34 (조원동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071603-59.svg', 37.3037, 127.0165
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071603-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '조원주공뉴타운2단지', '경기', '수원장안구', '장안구 금당로39번길 34 (조원동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44071603-84.svg', 37.3037, 127.0165
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44071603-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서광교 파크 스위첸', '경기', '수원장안구', '장안구 창훈로 30 (연무동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023204-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023204-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서광교 파크 스위첸', '경기', '수원장안구', '장안구 창훈로 30 (연무동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023204-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023204-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '연무신미주', '경기', '수원장안구', '장안구 광교산로 148 (연무동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44080703-59.svg', 37.3005, 127.0316
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44080703-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '연무신미주', '경기', '수원장안구', '장안구 광교산로 148 (연무동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44080703-84.svg', 37.3005, 127.0316
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44080703-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원역센트럴어반시티', '경기', '수원권선구', '권선구 세권로 1 (세류동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027871-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027871-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원역센트럴어반시티', '경기', '수원권선구', '권선구 세권로 1 (세류동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027871-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027871-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원역센트럴어반시티', '경기', '수원권선구', '권선구 세권로 1 (세류동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027871-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027871-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원역센트럴타운아파트', '경기', '수원권선구', '권선구 세류로 39 (세류동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027921-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027921-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원역해모로아파트', '경기', '수원권선구', '권선구 세류로 60 (세류동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027961-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027961-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원역해모로아파트', '경기', '수원권선구', '권선구 세류로 60 (세류동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027961-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027961-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수원역해모로아파트', '경기', '수원권선구', '권선구 세류로 60 (세류동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027961-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027961-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '매교역성원상떼빌', '경기', '수원권선구', '권선구 정조로 618 (세류동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44174403-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44174403-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '매교역성원상떼빌', '경기', '수원권선구', '권선구 정조로 618 (세류동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44174403-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44174403-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '매교역성원상떼빌', '경기', '수원권선구', '권선구 정조로 618 (세류동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44174403-114.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44174403-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '세류미영', '경기', '수원권선구', '권선구 정조로 432 (세류동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44175402-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44175402-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '세류미영', '경기', '수원권선구', '권선구 정조로 432 (세류동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa44175402-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa44175402-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '만석 비치타운주공 아파트', '인천', '제물포구', '화도진로 187 (만석동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40101001-59.svg', 37.4751, 126.6352
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40101001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '만석 비치타운주공 아파트', '인천', '제물포구', '화도진로 187 (만석동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40101001-84.svg', 37.4751, 126.6352
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40101001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화수 영풍 아파트', '인천', '제물포구', '화도진로 132 (화수동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40102001-59.svg', 37.4751, 126.6352
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40102001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화수 영풍 아파트', '인천', '제물포구', '화도진로 132 (화수동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40102001-84.svg', 37.4751, 126.6352
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40102001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천화도진그린빌', '인천', '제물포구', '화도진로 113 (화수동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40102002-59.svg', 37.4794, 126.6302
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40102002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천화도진그린빌', '인천', '제물포구', '화도진로 113 (화수동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40102002-84.svg', 37.4794, 126.6302
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40102002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '미륭', '인천', '제물포구', '화수로 44 (화수동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40180401-59.svg', 37.4827, 126.6333
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40180401-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '솔빛주공2차1단지아파트', '인천', '제물포구', '송현로 39 (송현동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104002-59.svg', 37.4794, 126.6362
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '솔빛주공2차1단지아파트', '인천', '제물포구', '송현로 39 (송현동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104002-84.svg', 37.4794, 126.6362
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송현2차 아파트', '인천', '제물포구', '인중로 635 (송현동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104003-59.svg', 37.4823, 126.6427
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104003-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송현2차 아파트', '인천', '제물포구', '인중로 635 (송현동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104003-84.svg', 37.4823, 126.6427
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송현1차 아파트', '인천', '제물포구', '인중로 621 (송현동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104004-59.svg', 37.4837, 126.635
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송현주공아파트', '인천', '제물포구', '인중로 653 (송현동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104005-59.svg', 37.4811, 126.6427
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104005-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송현주공아파트', '인천', '제물포구', '인중로 653 (송현동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104005-84.svg', 37.4811, 126.6427
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104005-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동부아파트', '인천', '제물포구', '화수로 38 (송현동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104006-59.svg', 37.4827, 126.6333
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104006-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동부아파트', '인천', '제물포구', '화수로 38 (송현동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104006-84.svg', 37.4827, 126.6333
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104006-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송현솔빛마을주공1차아파트', '인천', '제물포구', '송현로 50 (송현동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104007-59.svg', 37.4794, 126.6362
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104007-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송현솔빛마을주공1차아파트', '인천', '제물포구', '송현로 50 (송현동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104007-84.svg', 37.4794, 126.6362
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104007-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '솔빛마을주공2차2단지', '인천', '제물포구', '화수로 8-10 (송현동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40104008-59.svg', 37.4827, 126.6333
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40104008-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송현 삼두2차아파트', '인천', '제물포구', '화수로 21 (송현동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40170601-59.svg', 37.4827, 126.6333
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40170601-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천두산위브더센트럴', '인천', '제물포구', '샛골로162번길 45 (송림동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10020257-59.svg', 37.4768, 126.6457
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10020257-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천두산위브더센트럴', '인천', '제물포구', '샛골로162번길 45 (송림동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10020257-84.svg', 37.4768, 126.6457
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10020257-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천두산위브더센트럴', '인천', '제물포구', '샛골로162번길 45 (송림동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10020257-114.svg', 37.4768, 126.6457
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10020257-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동인천역파크푸르지오', '인천', '제물포구', '화도진로 16 (송림동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023677-59.svg', 37.4747, 126.636
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023677-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동인천역파크푸르지오', '인천', '제물포구', '화도진로 16 (송림동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023677-84.svg', 37.4747, 126.636
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023677-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천브리즈힐', '인천', '제물포구', '송림로162번길 9 (송림동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024248-59.svg', 37.4777, 126.652
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024248-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천브리즈힐', '인천', '제물포구', '송림로162번길 9 (송림동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024248-84.svg', 37.4777, 126.652
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024248-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송림 풍림아이원아파트', '인천', '제물포구', '송미로 6 (송림동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40107002-59.svg', 37.4823, 126.6486
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40107002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송림 풍림아이원아파트', '인천', '제물포구', '송미로 6 (송림동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40107002-84.svg', 37.4823, 126.6486
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40107002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송림 풍림아이원아파트', '인천', '제물포구', '송미로 6 (송림동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40107002-114.svg', 37.4823, 126.6486
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40107002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동산휴먼시아1단지', '인천', '제물포구', '재능로 191 (송림동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40107003-59.svg', 37.4737, 126.6514
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40107003-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동산휴먼시아2단지', '인천', '제물포구', '새천년로38번길 11 (송림동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40107004-59.svg', 37.4717, 126.6509
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40107004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동산휴먼시아2단지', '인천', '제물포구', '새천년로38번길 11 (송림동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40107004-84.svg', 37.4717, 126.6509
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40107004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동산휴먼시아2단지', '인천', '제물포구', '새천년로38번길 11 (송림동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40107004-114.svg', 37.4717, 126.6509
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40107004-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송림휴먼시아1단지', '인천', '제물포구', '송향로 31 (송림동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40172201-59.svg', 37.4798, 126.6521
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40172201-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송림휴먼시아1단지', '인천', '제물포구', '송향로 31 (송림동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40172201-84.svg', 37.4798, 126.6521
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40172201-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송림휴먼시아1단지', '인천', '제물포구', '송향로 31 (송림동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40172201-114.svg', 37.4798, 126.6521
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40172201-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '항동연안아파트', '인천', '제물포구', '축항대로 234 (항동7가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40003703-59.svg', 37.4494, 126.6246
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40003703-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '항동연안아파트', '인천', '제물포구', '축항대로 234 (항동7가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40003703-84.svg', 37.4494, 126.6246
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40003703-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비취맨션1단지아파트', '인천', '제물포구', '축항대로86번길 47 (항동7가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40080101-84.svg', 37.4505, 126.6033
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40080101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비취맨션1단지아파트', '인천', '제물포구', '축항대로86번길 47 (항동7가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40080101-114.svg', 37.4505, 126.6033
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40080101-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비취맨션3단지 아파트', '인천', '제물포구', '축항대로86번길 47 (항동7가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40080102-84.svg', 37.4505, 126.6033
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40080102-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비취맨션3단지 아파트', '인천', '제물포구', '축항대로86번길 47 (항동7가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40080102-114.svg', 37.4505, 126.6033
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40080102-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비취맨션3단지 아파트', '인천', '제물포구', '축항대로86번길 47 (항동7가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40080102-145.svg', 37.4505, 126.6033
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40080102-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비취맨션2단지 아파트', '인천', '제물포구', '축항대로86번길 47 (항동7가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40080104-59.svg', 37.4505, 126.6033
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40080104-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비취맨션2단지 아파트', '인천', '제물포구', '축항대로86번길 47 (항동7가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40080104-84.svg', 37.4505, 126.6033
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40080104-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '비취맨션2단지 아파트', '인천', '제물포구', '축항대로86번길 47 (항동7가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40080104-114.svg', 37.4505, 126.6033
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40080104-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥 경남아너스빌 아파트', '인천', '제물포구', '서해대로 439 (신흥동1가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010103-59.svg', 37.4422, 126.6198
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010103-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥 경남아너스빌 아파트', '인천', '제물포구', '서해대로 439 (신흥동1가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010103-84.svg', 37.4422, 126.6198
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010103-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥 삼익 아파트', '인천', '제물포구', '인중로 97 (신흥동2가)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010201-59.svg', 37.4637, 126.6384
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010201-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥 삼익 아파트', '인천', '제물포구', '인중로 97 (신흥동2가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010201-84.svg', 37.4637, 126.6384
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010201-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥 삼익 아파트', '인천', '제물포구', '인중로 97 (신흥동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010201-114.svg', 37.4637, 126.6384
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010201-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천유림노르웨이숲', '인천', '제물포구', '서해대로 278 (신흥동3가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023248-59.svg', 37.4809, 126.6393
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023248-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인천유림노르웨이숲', '인천', '제물포구', '서해대로 278 (신흥동3가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023248-84.svg', 37.4809, 126.6393
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023248-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥 항운 아파트', '인천', '제물포구', '서해대로 220 (신흥동3가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010301-59.svg', 37.4702, 126.6366
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010301-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥아이파크 아파트', '인천', '제물포구', '인항로 30 (신흥동3가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010302-59.svg', 37.4578, 126.633
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010302-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥아이파크 아파트', '인천', '제물포구', '인항로 30 (신흥동3가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010302-84.svg', 37.4578, 126.633
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010302-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥아이파크 아파트', '인천', '제물포구', '인항로 30 (신흥동3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40010302-114.svg', 37.4578, 126.633
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40010302-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송월 아파트', '인천', '제물포구', '참외전로 13 (송월동1가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40022101-59.svg', 37.4709, 126.6375
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40022101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송월 아파트', '인천', '제물포구', '참외전로 13 (송월동1가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa40022101-84.svg', 37.4709, 126.6375
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa40022101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영종국제도시 화성파크드림 오션브릿지', '인천', '영종구', '은하수로 183 (중산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10020867-84.svg', 37.4985, 126.5687
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10020867-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영주동금호타운', '부산', '중구', '영주로 51 (영주동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60011202-59.svg', 35.1121, 129.0302
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60011202-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영주동금호타운', '부산', '중구', '영주로 51 (영주동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60011202-84.svg', 35.1121, 129.0302
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60011202-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영주동아11블럭아파트', '부산', '중구', '영주로 65 (영주동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60011204-59.svg', 35.1121, 129.0302
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60011204-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영주동아11블럭아파트', '부산', '중구', '영주로 65 (영주동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60011204-84.svg', 35.1121, 129.0302
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60011204-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동대신역비스타동원아파트', '부산', '서구', '보수대로154번길 29 (동대신동1가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024328-59.svg', 35.1109, 129.0234
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024328-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동대신역비스타동원아파트', '부산', '서구', '보수대로154번길 29 (동대신동1가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024328-84.svg', 35.1109, 129.0234
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024328-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼익', '부산', '서구', '대영로85번길 34-47 (동대신동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275001-114.svg', 35.113, 129.0195
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼익', '부산', '서구', '대영로85번길 34-47 (동대신동2가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275001-145.svg', 35.113, 129.0195
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동대신동 브라운스톤하이포레아파트', '부산', '서구', '동대로19번길 32 (동대신동3가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024875-59.svg', 35.1199, 129.0192
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024875-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동대신동 브라운스톤하이포레아파트', '부산', '서구', '동대로19번길 32 (동대신동3가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024875-84.svg', 35.1199, 129.0192
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024875-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신푸르지오아파트', '부산', '서구', '대영로38번길 11 (서대신동1가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026034-59.svg', 35.1091, 129.0144
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026034-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신푸르지오아파트', '부산', '서구', '대영로38번길 11 (서대신동1가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026034-84.svg', 35.1091, 129.0144
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026034-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신푸르지오아파트', '부산', '서구', '대영로38번길 11 (서대신동1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026034-114.svg', 35.1091, 129.0144
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026034-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신해모로센트럴아파트', '부산', '서구', '대티로 178 (서대신동2가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023704-59.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023704-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신해모로센트럴아파트', '부산', '서구', '대티로 178 (서대신동2가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023704-84.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023704-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신해모로센트럴아파트', '부산', '서구', '대티로 178 (서대신동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023704-114.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023704-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신2차푸르지오', '부산', '서구', '고운들로 181 (서대신동2가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024535-59.svg', 35.1085, 129.0161
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024535-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신2차푸르지오', '부산', '서구', '고운들로 181 (서대신동2가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024535-84.svg', 35.1085, 129.0161
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024535-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신2차푸르지오', '부산', '서구', '고운들로 181 (서대신동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024535-114.svg', 35.1085, 129.0161
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024535-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신더샵아파트', '부산', '서구', '꽃마을로 48 (서대신동3가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026510-59.svg', 35.1157, 129.0136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026510-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신더샵아파트', '부산', '서구', '꽃마을로 48 (서대신동3가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026510-84.svg', 35.1157, 129.0136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026510-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신더샵아파트', '부산', '서구', '꽃마을로 48 (서대신동3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026510-114.svg', 35.1157, 129.0136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026510-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신롯데캐슬아파트', '부산', '서구', '대티로 161 (서대신동3가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10028182-59.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10028182-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신롯데캐슬아파트', '부산', '서구', '대티로 161 (서대신동3가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10028182-84.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10028182-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신롯데캐슬아파트', '부산', '서구', '대티로 161 (서대신동3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10028182-114.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10028182-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남성한빛아파트', '부산', '서구', '꽃마을로 43 (서대신동3가)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275104-59.svg', 35.1275, 129.0072
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275104-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남성한빛아파트', '부산', '서구', '꽃마을로 43 (서대신동3가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275104-84.svg', 35.1275, 129.0072
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275104-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남성한빛아파트', '부산', '서구', '꽃마을로 43 (서대신동3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275104-114.svg', 35.1275, 129.0072
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275104-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신공원한신휴플러스', '부산', '서구', '보수대로 284 (서대신동3가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275105-59.svg', 35.1014, 129.0223
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275105-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신공원한신휴플러스', '부산', '서구', '보수대로 284 (서대신동3가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275105-84.svg', 35.1014, 129.0223
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275105-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신공원한신휴플러스', '부산', '서구', '보수대로 284 (서대신동3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275105-114.svg', 35.1014, 129.0223
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275105-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '협성르네상스타운', '부산', '서구', '대티로 159 (서대신동3가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275303-84.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275303-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '협성르네상스타운', '부산', '서구', '대티로 159 (서대신동3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275303-114.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275303-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '협성르네상스타운', '부산', '서구', '대티로 159 (서대신동3가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275303-145.svg', 35.1113, 129.01
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275303-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '부민e-편한세상아파트', '부산', '서구', '해돋이로 313 (부민동3가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60270501-59.svg', 35.0904, 129.0217
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60270501-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '부민e-편한세상아파트', '부산', '서구', '해돋이로 313 (부민동3가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60270501-84.svg', 35.0904, 129.0217
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60270501-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '부민e-편한세상아파트', '부산', '서구', '해돋이로 313 (부민동3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60270501-114.svg', 35.0904, 129.0217
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60270501-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '토성동경동리인타워', '부산', '서구', '보수대로 27 (토성동1가)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025793-84.svg', 35.1029, 129.0212
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025793-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '토성동경동리인타워', '부산', '서구', '보수대로 27 (토성동1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025793-114.svg', 35.1029, 129.0212
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025793-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경동포레스트힐 행복주택 아미', '부산', '서구', '까치고개로130번길 11-4 (아미동2가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022985-59.svg', 35.1003, 129.0144
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022985-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남부민풀리페', '부산', '서구', '해돋이로 23 (남부민동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60275201-59.svg', 35.0904, 129.0217
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60275201-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송도대림아파트', '부산', '서구', '충무대로 133 (남부민동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60280302-59.svg', 35.0811, 129.0243
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60280302-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송도대림아파트', '부산', '서구', '충무대로 133 (남부민동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60280302-84.svg', 35.0811, 129.0243
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60280302-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'e편한세상 송도 더퍼스트비치', '부산', '서구', '충무대로21번길 9 (암남동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022434-59.svg', 35.0777, 129.015
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022434-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'e편한세상 송도 더퍼스트비치', '부산', '서구', '충무대로21번길 9 (암남동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022434-84.svg', 35.0777, 129.015
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022434-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'e편한세상 송도 더퍼스트비치', '부산', '서구', '충무대로21번길 9 (암남동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022434-114.svg', 35.0777, 129.015
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022434-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트이진베이시티', '부산', '서구', '송도해변로 192 (암남동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023790-84.svg', 35.0775, 129.0193
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023790-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트이진베이시티', '부산', '서구', '송도해변로 192 (암남동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023790-114.svg', 35.0775, 129.0193
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023790-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트이진베이시티', '부산', '서구', '송도해변로 192 (암남동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023790-145.svg', 35.0775, 129.0193
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023790-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '초량베스티움센트럴베이', '부산', '동구', '홍곡로 37 (초량동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024393-59.svg', 35.125, 129.0418
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024393-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '초량베스티움센트럴베이', '부산', '동구', '홍곡로 37 (초량동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024393-84.svg', 35.125, 129.0418
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024393-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '범양레우스 센트럴베이', '부산', '동구', '초량중로 114 (초량동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024998-84.svg', 35.1176, 129.0386
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024998-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'e편한세상부산항', '부산', '동구', '홍곡로 50 (초량동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025359-84.svg', 35.125, 129.0418
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025359-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '협성휴포레부산진역오션뷰아파트', '부산', '동구', '중앙대로 357 (수정동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025380-59.svg', 35.1298, 129.05
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025380-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '협성휴포레부산진역오션뷰아파트', '부산', '동구', '중앙대로 357 (수정동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025380-84.svg', 35.1298, 129.05
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025380-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '부산항일동미라주더오션아파트', '부산', '동구', '자성로 2 (좌천동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023963-59.svg', 35.1342, 129.0554
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023963-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '부산항일동미라주더오션아파트', '부산', '동구', '자성로 2 (좌천동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023963-84.svg', 35.1342, 129.0554
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023963-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '두산위브범일뉴타운', '부산', '동구', '성남일로 5 (좌천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60105002-59.svg', 35.1327, 129.0555
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60105002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '두산위브범일뉴타운', '부산', '동구', '성남일로 5 (좌천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60105002-84.svg', 35.1327, 129.0555
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60105002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '두산위브더제니스 하버시티', '부산', '동구', '범일로 21 (범일동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023208-59.svg', 35.1363, 129.0594
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023208-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '두산위브더제니스 하버시티', '부산', '동구', '범일로 21 (범일동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023208-84.svg', 35.1363, 129.0594
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023208-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '오션브릿지', '부산', '동구', '범일로 41 (범일동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026746-59.svg', 35.1363, 129.0594
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026746-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '오션브릿지', '부산', '동구', '범일로 41 (범일동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026746-84.svg', 35.1363, 129.0594
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026746-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '오션브릿지', '부산', '동구', '범일로 41 (범일동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026746-114.svg', 35.1363, 129.0594
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026746-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한성기린프라자', '부산', '동구', '중앙대로 514 (범일동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60106001-59.svg', 35.1266, 129.0466
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60106001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한성기린프라자', '부산', '동구', '중앙대로 514 (범일동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60106001-84.svg', 35.1266, 129.0466
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60106001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한성기린프라자', '부산', '동구', '중앙대로 514 (범일동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60106001-114.svg', 35.1266, 129.0466
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60106001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '두산위브포세이돈Ⅱ', '부산', '동구', '자성로116번길 2 (범일동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60106002-84.svg', 35.1364, 129.0644
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60106002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '두산위브포세이돈Ⅱ', '부산', '동구', '자성로116번길 2 (범일동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60106002-114.svg', 35.1364, 129.0644
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60106002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '두산위브포세이돈Ⅱ', '부산', '동구', '자성로116번길 2 (범일동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60106002-145.svg', 35.1364, 129.0644
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60106002-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '진흥마제스타워범일', '부산', '동구', '자성로133번길 6 (범일동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60172001-84.svg', 35.14, 129.0633
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60172001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '진흥마제스타워범일', '부산', '동구', '자성로133번길 6 (범일동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60172001-114.svg', 35.14, 129.0633
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60172001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '진흥마제스타워범일', '부산', '동구', '자성로133번길 6 (범일동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60172001-145.svg', 35.14, 129.0633
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60172001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대동대교아파트', '부산', '영도구', '대평로 16 (대평동1가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675701-59.svg', 35.0934, 129.0327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675701-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대동대교아파트', '부산', '영도구', '대평로 16 (대평동1가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675701-84.svg', 35.0934, 129.0327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675701-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대동대교아파트', '부산', '영도구', '대평로 16 (대평동1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675701-114.svg', 35.0934, 129.0327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675701-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대동대교아파트', '부산', '영도구', '대평로 16 (대평동1가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675701-145.svg', 35.0934, 129.0327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675701-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동부산아이존빌아파트', '부산', '영도구', '영선대로 98 (영선동2가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60674101-59.svg', 35.0889, 129.0426
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60674101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동부산아이존빌아파트', '부산', '영도구', '영선대로 98 (영선동2가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60674101-84.svg', 35.0889, 129.0426
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60674101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동부산아이존빌아파트', '부산', '영도구', '영선대로 98 (영선동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60674101-114.svg', 35.0889, 129.0426
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60674101-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영도대원아파트', '부산', '영도구', '남항새싹길 79 (영선동4가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675901-84.svg', 35.0829, 129.0426
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675901-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영도대원아파트', '부산', '영도구', '남항새싹길 79 (영선동4가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675901-114.svg', 35.0829, 129.0426
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675901-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영도대원아파트', '부산', '영도구', '남항새싹길 79 (영선동4가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675901-145.svg', 35.0829, 129.0426
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675901-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영선동반도보라아파트', '부산', '영도구', '해안산책길 30 (영선동4가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60681702-59.svg', 35.081, 129.0435
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60681702-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영선동반도보라아파트', '부산', '영도구', '해안산책길 30 (영선동4가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60681702-84.svg', 35.081, 129.0435
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60681702-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영선동반도보라아파트', '부산', '영도구', '해안산책길 30 (영선동4가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60681702-114.svg', 35.081, 129.0435
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60681702-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영선동반도보라아파트', '부산', '영도구', '해안산책길 30 (영선동4가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60681702-145.svg', 35.081, 129.0435
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60681702-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '미광마린타워아파트', '부산', '영도구', '대교로14번길 17 (봉래동2가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675801-84.svg', 35.0947, 129.0442
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675801-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '미광마린타워아파트', '부산', '영도구', '대교로14번길 17 (봉래동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675801-114.svg', 35.0947, 129.0442
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675801-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '미광마린타워아파트', '부산', '영도구', '대교로14번길 17 (봉래동2가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60675801-145.svg', 35.0947, 129.0442
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60675801-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영도 센트럴 에일린의뜰', '부산', '영도구', '태종로 172 (봉래동4가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024303-59.svg', 35.0919, 129.066
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024303-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영도 센트럴 에일린의뜰', '부산', '영도구', '태종로 172 (봉래동4가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024303-84.svg', 35.0919, 129.066
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024303-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영도 센트럴 에일린의뜰', '부산', '영도구', '태종로 172 (봉래동4가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024303-114.svg', 35.0919, 129.066
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024303-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영도유림아파트', '부산', '영도구', '봉래길 94 (봉래동4가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60681101-59.svg', 35.092, 129.0523
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60681101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영도유림아파트', '부산', '영도구', '봉래길 94 (봉래동4가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60681101-84.svg', 35.092, 129.0523
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60681101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원우엔리치빌', '부산', '영도구', '조내기로 38 (청학동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60607002-84.svg', 35.0869, 129.0625
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60607002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원우엔리치빌', '부산', '영도구', '조내기로 38 (청학동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60607002-114.svg', 35.0869, 129.0625
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60607002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신영도롯데낙천대', '부산', '영도구', '청학남로 48 (청학동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60607003-59.svg', 35.09, 129.0602
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60607003-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신영도롯데낙천대', '부산', '영도구', '청학남로 48 (청학동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60607003-84.svg', 35.09, 129.0602
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60607003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신영도롯데낙천대', '부산', '영도구', '청학남로 48 (청학동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa60607003-114.svg', 35.09, 129.0602
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa60607003-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대구역센트럴대원칸타빌', '대구', '중구', '태평로 224 (동인동1가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022426-84.svg', 35.8733, 128.6088
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022426-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트 동인센트럴', '대구', '중구', '동덕로 181 (동인동1가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022674-84.svg', 35.859, 128.6051
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022674-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트 동인센트럴', '대구', '중구', '동덕로 181 (동인동1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022674-114.svg', 35.859, 128.6051
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022674-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트 동인센트럴', '대구', '중구', '동덕로 181 (동인동1가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022674-145.svg', 35.859, 128.6051
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022674-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동인태왕아너스라플란드', '대구', '중구', '국채보상로151길 55 (동인동3가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022946-59.svg', 35.8717, 128.6118
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022946-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '엑소디움센트럴동인', '대구', '중구', '국채보상로139길 40 (동인동3가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023412-59.svg', 35.8707, 128.6064
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023412-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '엑소디움센트럴동인', '대구', '중구', '국채보상로139길 40 (동인동3가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023412-84.svg', 35.8707, 128.6064
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023412-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '엑소디움센트럴동인', '대구', '중구', '국채보상로139길 40 (동인동3가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023412-114.svg', 35.8707, 128.6064
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023412-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '엑소디움센트럴동인', '대구', '중구', '국채보상로139길 40 (동인동3가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023412-145.svg', 35.8707, 128.6064
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023412-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동성로SK리더스뷰', '대구', '중구', '공평로 36 (삼덕동2가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022315-84.svg', 35.8662, 128.6007
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022315-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼덕청아람리슈빌', '대구', '중구', '달구벌대로447길 77 (삼덕동3가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70041301-59.svg', 35.8641, 128.6088
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70041301-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼덕청아람리슈빌', '대구', '중구', '달구벌대로447길 77 (삼덕동3가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70041301-84.svg', 35.8641, 128.6088
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70041301-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트 도원 센트럴', '대구', '중구', '태평로 50 (도원동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022638-84.svg', 35.8773, 128.5852
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022638-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트 도원 센트럴', '대구', '중구', '태평로 50 (도원동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022638-114.svg', 35.8773, 128.5852
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022638-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대구역제일풍경채위너스카이', '대구', '중구', '달성로26길 70 (수창동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022993-84.svg', 35.8756, 128.5853
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022993-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대구역센트럴자이아파트', '대구', '중구', '서성로 99 (수창동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026722-59.svg', 35.8731, 128.5876
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026722-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대구역센트럴자이아파트', '대구', '중구', '서성로 99 (수창동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026722-84.svg', 35.8731, 128.5876
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026722-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대구역센트럴자이아파트', '대구', '중구', '서성로 99 (수창동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026722-114.svg', 35.8731, 128.5876
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026722-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트 달성공원역', '대구', '중구', '태평로 41 (태평로3가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10021294-84.svg', 35.8733, 128.603
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10021294-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청라언덕역서한포레스트', '대구', '중구', '달구벌대로 2021 (동산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023476-84.svg', 35.8656, 128.596
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023476-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청라언덕역서한포레스트', '대구', '중구', '달구벌대로 2021 (동산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023476-114.svg', 35.8656, 128.596
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023476-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트대구역', '대구', '중구', '태평로28길 13 (태평로2가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022874-84.svg', 35.8749, 128.5918
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022874-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트대구역', '대구', '중구', '태평로28길 13 (태평로2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022874-114.svg', 35.8749, 128.5918
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022874-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이편한세상 대신아파트', '대구', '중구', '달구벌대로 1943 (대신동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026060-59.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026060-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이편한세상 대신아파트', '대구', '중구', '달구벌대로 1943 (대신동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026060-84.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026060-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신센트럴자이', '대구', '중구', '달구벌대로 1955 (대신동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10028088-59.svg', 35.8639, 128.5777
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10028088-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신센트럴자이', '대구', '중구', '달구벌대로 1955 (대신동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10028088-84.svg', 35.8639, 128.5777
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10028088-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대신센트럴자이', '대구', '중구', '달구벌대로 1955 (대신동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10028088-114.svg', 35.8639, 128.5777
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10028088-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태왕아너스스카이', '대구', '중구', '달구벌대로 1975 (대신동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70032001-84.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70032001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태왕아너스스카이', '대구', '중구', '달구벌대로 1975 (대신동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70032001-114.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70032001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태왕아너스스카이', '대구', '중구', '달구벌대로 1975 (대신동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70032001-145.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70032001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '달성파크푸르지오힐스테이트', '대구', '중구', '달성로 123 (달성동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023152-59.svg', 35.8678, 128.5822
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023152-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '달성파크푸르지오힐스테이트', '대구', '중구', '달성로 123 (달성동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023152-84.svg', 35.8678, 128.5822
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023152-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '해링턴플레이스 더 반월당', '대구', '중구', '중앙대로61길 30 (남산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022368-84.svg', 35.8604, 128.5892
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022368-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '해링턴플레이스 더 반월당', '대구', '중구', '중앙대로61길 30 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022368-114.svg', 35.8604, 128.5892
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022368-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청라힐스자이', '대구', '중구', '남산로 73 (남산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023346-59.svg', 35.8605, 128.5841
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023346-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청라힐스자이', '대구', '중구', '남산로 73 (남산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023346-84.svg', 35.8605, 128.5841
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023346-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청라힐스자이', '대구', '중구', '남산로 73 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023346-114.svg', 35.8605, 128.5841
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023346-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '반월당역 서한포레스트', '대구', '중구', '중앙대로67길 11 (남산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023505-84.svg', 35.8632, 128.5922
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023505-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산자이하늘채', '대구', '중구', '명덕로 33 (남산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023856-59.svg', 35.8555, 128.606
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023856-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산자이하늘채', '대구', '중구', '명덕로 33 (남산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023856-84.svg', 35.8555, 128.606
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023856-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산롯데캐슬센트럴스카이', '대구', '중구', '재마루길 77 (남산동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024121-59.svg', 35.8647, 128.5853
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024121-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산롯데캐슬센트럴스카이', '대구', '중구', '재마루길 77 (남산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024121-84.svg', 35.8647, 128.5853
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024121-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산롯데캐슬센트럴스카이', '대구', '중구', '재마루길 77 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024121-114.svg', 35.8647, 128.5853
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024121-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이편한세상남산', '대구', '중구', '달구벌대로 2020 (남산동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024881-59.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024881-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이편한세상남산', '대구', '중구', '달구벌대로 2020 (남산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024881-84.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024881-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산역화성파크드림', '대구', '중구', '남산로7길 7 (남산동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026037-59.svg', 35.8602, 128.5791
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026037-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산역화성파크드림', '대구', '중구', '남산로7길 7 (남산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026037-84.svg', 35.8602, 128.5791
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026037-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산휴먼시아1단지', '대구', '중구', '달구벌대로 1960 (남산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044002-59.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청라센트럴파크', '대구', '중구', '달구벌대로 1970 (남산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044003-84.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청라센트럴파크', '대구', '중구', '달구벌대로 1970 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044003-114.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044003-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산그린타운', '대구', '중구', '달구벌대로 1950 (남산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044004-59.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산그린타운', '대구', '중구', '달구벌대로 1950 (남산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044004-84.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남산그린타운', '대구', '중구', '달구벌대로 1950 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044004-114.svg', 35.8664, 128.5878
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044004-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '극동스타클래스남산', '대구', '중구', '남산로 30 (남산동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044005-59.svg', 35.8605, 128.5841
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044005-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '극동스타클래스남산', '대구', '중구', '남산로 30 (남산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044005-84.svg', 35.8605, 128.5841
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044005-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '극동스타클래스남산', '대구', '중구', '남산로 30 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044005-114.svg', 35.8605, 128.5841
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044005-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '반월당삼정그린코아(아파트)', '대구', '중구', '중앙대로67길 10 (남산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044202-84.svg', 35.8632, 128.5922
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044202-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '반월당삼정그린코아(아파트)', '대구', '중구', '중앙대로67길 10 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70044202-114.svg', 35.8632, 128.5922
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70044202-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '보성송림맨션', '대구', '중구', '남산로4길 91 (남산동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70072601-59.svg', 35.8589, 128.5849
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70072601-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '보성송림맨션', '대구', '중구', '남산로4길 91 (남산동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70072601-84.svg', 35.8589, 128.5849
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70072601-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '보성송림맨션', '대구', '중구', '남산로4길 91 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70072601-114.svg', 35.8589, 128.5849
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70072601-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '보성황실타운', '대구', '중구', '남산로13길 17 (남산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70075102-59.svg', 35.8615, 128.5806
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70075102-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '보성황실타운', '대구', '중구', '남산로13길 17 (남산동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70075102-84.svg', 35.8615, 128.5806
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70075102-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '보성황실타운', '대구', '중구', '남산로13길 17 (남산동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70075102-114.svg', 35.8615, 128.5806
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70075102-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '보성황실타운', '대구', '중구', '남산로13길 17 (남산동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa70075102-145.svg', 35.8615, 128.5806
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa70075102-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '어진마을', '대전', '동구', '계족로 65 (인동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30002004-59.svg', 36.3543, 127.4327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30002004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '어진마을', '대전', '동구', '계족로 65 (인동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30002004-84.svg', 36.3543, 127.4327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30002004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인동현대아파트', '대전', '동구', '대전로 664 (인동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30076903-59.svg', 36.3208, 127.4383
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30076903-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '인동현대아파트', '대전', '동구', '대전로 664 (인동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30076903-84.svg', 36.3208, 127.4383
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30076903-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효동현대', '대전', '동구', '대전로 646 (효동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30078301-59.svg', 36.3425, 127.4234
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30078301-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효동현대', '대전', '동구', '대전로 646 (효동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30078301-84.svg', 36.3425, 127.4234
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30078301-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효동현대', '대전', '동구', '대전로 646 (효동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30078301-114.svg', 36.3425, 127.4234
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30078301-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '리더스시티5단지아파트', '대전', '동구', '안샘로14번길 7 (천동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10020979-59.svg', 36.3165, 127.447
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10020979-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '리더스시티5단지아파트', '대전', '동구', '안샘로14번길 7 (천동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10020979-84.svg', 36.3165, 127.447
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10020979-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '리더스시티4BL', '대전', '동구', '안샘로 11 (천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022472-59.svg', 36.3175, 127.445
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022472-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '리더스시티4BL', '대전', '동구', '안샘로 11 (천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022472-84.svg', 36.3175, 127.445
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022472-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천동휴먼시아1단지', '대전', '동구', '대전로542번길 78 (천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30004002-59.svg', 36.3127, 127.4459
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30004002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천동휴먼시아2단지', '대전', '동구', '대전로542번길 78-1 (천동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30077701-84.svg', 36.3127, 127.4459
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30077701-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천동휴먼시아2단지', '대전', '동구', '대전로542번길 78-1 (천동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30077701-114.svg', 36.3127, 127.4459
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30077701-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '위드힐', '대전', '동구', '대전로542번길 121 (천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30077702-59.svg', 36.3158, 127.4464
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30077702-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '위드힐', '대전', '동구', '대전로542번길 121 (천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30077702-84.svg', 36.3158, 127.4464
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30077702-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '위드힐', '대전', '동구', '대전로542번길 121 (천동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30077702-114.svg', 36.3158, 127.4464
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30077702-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '은어송마을4단지', '대전', '동구', '은어송로 116 (가오동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30005001-59.svg', 36.3096, 127.4609
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30005001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '은어송마을6단지', '대전', '동구', '신기로 100 (가오동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30005002-84.svg', 36.3095, 127.4528
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30005002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '은어송마을5단지 우미린아파트', '대전', '동구', '은어송로 100 (가오동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30005004-59.svg', 36.3083, 127.4587
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30005004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '은어송마을1단지', '대전', '동구', '동구청로 67 (가오동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30005005-84.svg', 36.3016, 127.4599
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30005005-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '은어송마을3단지', '대전', '동구', '은어송로 117 (가오동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30005006-84.svg', 36.3103, 127.4603
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30005006-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '은어송마을3단지', '대전', '동구', '은어송로 117 (가오동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30005006-114.svg', 36.3103, 127.4603
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30005006-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '가오주공아파트', '대전', '동구', '대전로448번길 11 (가오동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30075903-59.svg', 36.3072, 127.4543
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30075903-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥sk뷰아파트', '대전', '동구', '충무로 255 (신흥동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023828-59.svg', 36.3208, 127.4374
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023828-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥sk뷰아파트', '대전', '동구', '충무로 255 (신흥동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023828-84.svg', 36.3208, 127.4374
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023828-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이스트시티2단지', '대전', '동구', '동대전로46번길 120 (신흥동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025986-59.svg', 36.3242, 127.4409
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025986-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이스트시티2단지', '대전', '동구', '동대전로46번길 120 (신흥동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025986-84.svg', 36.3242, 127.4409
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025986-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥마을주공아파트', '대전', '동구', '옥천로 38 (신흥동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30011001-59.svg', 36.3386, 127.5079
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30011001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신흥마을주공아파트', '대전', '동구', '옥천로 38 (신흥동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30011001-84.svg', 36.3386, 127.5079
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30011001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼정그린코아포레스트2단지아파트', '대전', '동구', '새울로 19 (판암동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026140-59.svg', 36.3313, 127.4639
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026140-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼정그린코아포레스트2단지아파트', '대전', '동구', '새울로 19 (판암동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026140-84.svg', 36.3313, 127.4639
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026140-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼정그린코아포레스트1단지아파트', '대전', '동구', '동부로10번길 55 (판암동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026152-59.svg', 36.3182, 127.4593
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026152-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼정그린코아포레스트1단지아파트', '대전', '동구', '동부로10번길 55 (판암동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026152-84.svg', 36.3182, 127.4593
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026152-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '판암주공5', '대전', '동구', '동부로 73 (판암동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30013001-59.svg', 36.3469, 127.4603
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30013001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '판암주공1차2차', '대전', '동구', '옥천로180번길 47-2 (판암동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30013002-59.svg', 36.3155, 127.4617
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30013002-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '판암주공1차2차', '대전', '동구', '옥천로180번길 47-2 (판암동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30013002-84.svg', 36.3155, 127.4617
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30013002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대전판암3', '대전', '동구', '옥천로 152-9 (판암동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30077302-59.svg', 36.3386, 127.5079
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30077302-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대전판암4', '대전', '동구', '동부로 56-7 (판암동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30077402-59.svg', 36.317, 127.4564
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30077402-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '판암주공6', '대전', '동구', '동부로 55-58 (판암동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa30077601-59.svg', 36.3411, 127.4603
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa30077601-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'e편한세상 대전에코포레 아파트', '대전', '동구', '용운로 203 (용운동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024504-59.svg', 36.3279, 127.4557
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024504-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'e편한세상 대전에코포레 아파트', '대전', '동구', '용운로 203 (용운동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024504-84.svg', 36.3279, 127.4557
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024504-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '빌리브울산', '울산', '중구', '구교로 59 (학성동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024277-59.svg', 35.562, 129.3415
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024277-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '빌리브울산', '울산', '중구', '구교로 59 (학성동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024277-84.svg', 35.562, 129.3415
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024277-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '번영로 센트리지4단지', '울산', '중구', '복산1길 1 (복산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022936-59.svg', 35.5654, 129.3303
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022936-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '번영로 센트리지4단지', '울산', '중구', '복산1길 1 (복산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022936-84.svg', 35.5654, 129.3303
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022936-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '번영로센트리지5단지 아파트', '울산', '중구', '복산1길 1 (복산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022976-59.svg', 35.5654, 129.3303
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022976-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '번영로센트리지5단지 아파트', '울산', '중구', '복산1길 1 (복산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022976-84.svg', 35.5654, 129.3303
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022976-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '번영로센트리지2단지', '울산', '중구', '복산1길 1 (복산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022992-59.svg', 35.5654, 129.3303
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022992-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '번영로센트리지2단지', '울산', '중구', '복산1길 1 (복산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022992-84.svg', 35.5654, 129.3303
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022992-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '번영로 센트리지 3단지 아파트', '울산', '중구', '복산1길 1 (복산동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022994-59.svg', 35.5654, 129.3303
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022994-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '번영로 센트리지 3단지 아파트', '울산', '중구', '복산1길 1 (복산동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022994-84.svg', 35.5654, 129.3303
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022994-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성지아파트', '울산', '중구', '도화골길 30 (복산동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024461-59.svg', 35.5668, 129.3313
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024461-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성지아파트', '울산', '중구', '도화골길 30 (복산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024461-84.svg', 35.5668, 129.3313
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024461-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '복산 IPARK', '울산', '중구', '계변로 96 (복산동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026959-59.svg', 35.5598, 129.3326
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026959-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '복산 IPARK', '울산', '중구', '계변로 96 (복산동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026959-84.svg', 35.5598, 129.3326
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026959-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '남운럭키아파트', '울산', '중구', '도화골길 28 (복산동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68122005-84.svg', 35.5668, 129.3313
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68122005-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태화강엑소디움', '울산', '중구', '강북로 123 (옥교동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68119001-114.svg', 35.5503, 129.3527
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68119001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태화강엑소디움', '울산', '중구', '강북로 123 (옥교동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68119001-145.svg', 35.5503, 129.3527
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68119001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태화강유보라팰라티움', '울산', '중구', '당산4길 12 (우정동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022947-84.svg', 35.5541, 129.3136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022947-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정아이파크', '울산', '중구', '우정2길 45 (우정동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68175101-84.svg', 35.5595, 129.3122
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68175101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정아이파크', '울산', '중구', '우정2길 45 (우정동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68175101-114.svg', 35.5595, 129.3122
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68175101-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정아이파크', '울산', '중구', '우정2길 45 (우정동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68175101-145.svg', 35.5595, 129.3122
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68175101-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '마제스타워울산', '울산', '중구', '학성로 1 (우정동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181502-84.svg', 35.5564, 129.3276
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181502-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '마제스타워울산', '울산', '중구', '학성로 1 (우정동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181502-114.svg', 35.5564, 129.3276
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181502-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정선경1차아파트', '울산', '중구', '우정3길 9 (우정동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181603-59.svg', 35.5588, 129.3112
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181603-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정선경1차아파트', '울산', '중구', '우정3길 9 (우정동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181603-84.svg', 35.5588, 129.3112
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181603-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정선경1차아파트', '울산', '중구', '우정3길 9 (우정동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181603-114.svg', 35.5588, 129.3112
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181603-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정선경1차아파트', '울산', '중구', '우정3길 9 (우정동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181603-145.svg', 35.5588, 129.3112
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181603-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정선경2차', '울산', '중구', '유곡로 10 (우정동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181604-59.svg', 35.557, 129.3035
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181604-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정선경2차', '울산', '중구', '유곡로 10 (우정동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181604-84.svg', 35.557, 129.3035
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181604-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정선경2차', '울산', '중구', '유곡로 10 (우정동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181604-114.svg', 35.557, 129.3035
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181604-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우정선경2차', '울산', '중구', '유곡로 10 (우정동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68181604-145.svg', 35.557, 129.3035
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68181604-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '경동햇빛마을', '울산', '중구', '함월11길 10 (성안동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68130002-84.svg', 35.5745, 129.3075
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68130002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성안금호타운', '울산', '중구', '함월5길 35 (성안동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68130003-59.svg', 35.5749, 129.3057
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68130003-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성안금호타운', '울산', '중구', '함월5길 35 (성안동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68130003-84.svg', 35.5749, 129.3057
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68130003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성안청구', '울산', '중구', '함월22길 25 (성안동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68130004-59.svg', 35.579, 129.317
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68130004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성안청구', '울산', '중구', '함월22길 25 (성안동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68130004-84.svg', 35.579, 129.317
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68130004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '성안청구', '울산', '중구', '함월22길 25 (성안동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68130004-114.svg', 35.579, 129.317
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68130004-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '벽산e빌리지', '울산', '중구', '함월22길 24 (성안동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68130005-84.svg', 35.579, 129.317
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68130005-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '유곡e편한세상', '울산', '중구', '평동3길 2 (유곡동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68170301-84.svg', 35.5584, 129.3045
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68170301-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '유곡e편한세상', '울산', '중구', '평동3길 2 (유곡동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68170301-114.svg', 35.5584, 129.3045
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68170301-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '유곡e편한세상', '울산', '중구', '평동3길 2 (유곡동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68170301-145.svg', 35.5584, 129.3045
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68170301-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '유곡푸르지오', '울산', '중구', '평동3길 1 (유곡동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68170302-84.svg', 35.5584, 129.3045
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68170302-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '유곡푸르지오', '울산', '중구', '평동3길 1 (유곡동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68170302-114.svg', 35.5584, 129.3045
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68170302-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '유곡푸르지오', '울산', '중구', '평동3길 1 (유곡동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa68170302-145.svg', 35.5584, 129.3045
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa68170302-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을9단지', '세종', '반곡동', '547 (873)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023365-84.svg', 36.4958, 127.3178
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023365-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을8단지아파트', '세종', '반곡동', '546 (858)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023375-59.svg', 36.4841, 127.2943
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023375-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을4단지', '세종', '반곡동', '500 (59-7)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025230-59.svg', 36.4924, 127.3266
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025230-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을4단지', '세종', '반곡동', '500 (59-7)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025230-84.svg', 36.4924, 127.3266
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025230-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을4단지', '세종', '반곡동', '500 (59-7)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025230-114.svg', 36.4924, 127.3266
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025230-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을1단지아파트', '세종', '반곡동', '14 (수루배마을1단지아파트)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025330-84.svg', 36.4983, 127.3117
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025330-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을1단지아파트', '세종', '반곡동', '14 (수루배마을1단지아파트)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025330-114.svg', 36.4983, 127.3117
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025330-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을1단지아파트', '세종', '반곡동', '14 (수루배마을1단지아파트)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025330-145.svg', 36.4983, 127.3117
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025330-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을6단지아파트', '세종', '반곡동', '598 (수루배마을6단지아파트)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025346-59.svg', 36.4924, 127.3266
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025346-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을6단지아파트', '세종', '반곡동', '598 (수루배마을6단지아파트)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025346-84.svg', 36.4924, 127.3266
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025346-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을2단지아파트', '세종', '반곡동', '9 (수루배마을2단지아파트)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025383-59.svg', 36.4961, 127.3098
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025383-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을2단지아파트', '세종', '반곡동', '9 (수루배마을2단지아파트)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025383-84.svg', 36.4961, 127.3098
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025383-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을3단지', '세종', '반곡동', '15 (수루배마을3단지)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025486-84.svg', 36.4983, 127.3092
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025486-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을3단지', '세종', '반곡동', '15 (수루배마을3단지)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025486-114.svg', 36.4983, 127.3092
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025486-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을5단지', '세종', '반곡동', '9 (4101-3)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025816-59.svg', 36.4942, 127.3123
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025816-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '수루배마을5단지', '세종', '반곡동', '9 (4101-3)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025816-84.svg', 36.4942, 127.3123
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025816-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을4단지아파트', '세종', '소담동', '21 (545)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023940-59.svg', 36.4863, 127.2986
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023940-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트세종리버파크 새샘마을7단지', '세종', '소담동', '6 (539)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024345-84.svg', 36.4873, 127.2995
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024345-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트세종리버파크 새샘마을7단지', '세종', '소담동', '6 (539)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024345-114.svg', 36.4873, 127.2995
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024345-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트세종리버파크 새샘마을7단지', '세종', '소담동', '6 (539)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024345-145.svg', 36.4873, 127.2995
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024345-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을8단지아파트', '세종', '소담동', '22 (새샘마을8단지아파트)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024346-84.svg', 36.4873, 127.2995
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024346-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을8단지아파트', '세종', '소담동', '22 (새샘마을8단지아파트)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024346-114.svg', 36.4873, 127.2995
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024346-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을8단지아파트', '세종', '소담동', '22 (새샘마을8단지아파트)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024346-145.svg', 36.4873, 127.2995
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024346-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을1단지', '세종', '소담동', '357 (새샘마을1단지)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026099-84.svg', 36.4804, 127.2989
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026099-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을1단지', '세종', '소담동', '357 (새샘마을1단지)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026099-114.svg', 36.4804, 127.2989
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026099-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을6단지', '세종', '소담동', '302 (32-41)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026741-59.svg', 36.4766, 127.2889
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026741-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을6단지', '세종', '소담동', '302 (32-41)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026741-84.svg', 36.4766, 127.2889
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026741-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '세종 한양수자인엘시티 새샘마을5단지아파트', '세종', '소담동', '301 (598)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027147-59.svg', 36.4812, 127.3009
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027147-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '세종 한양수자인엘시티 새샘마을5단지아파트', '세종', '소담동', '301 (598)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027147-84.svg', 36.4812, 127.3009
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027147-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을9단지아파트', '세종', '소담동', '15 (325)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027408-84.svg', 36.491, 127.3028
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027408-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을9단지아파트', '세종', '소담동', '15 (325)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027408-114.svg', 36.491, 127.3028
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027408-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '새샘마을9단지아파트', '세종', '소담동', '15 (325)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027408-145.svg', 36.491, 127.3028
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027408-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한신휴플러스', '강원', '춘천시', '서부대성로 34 (요선동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20003001-59.svg', 37.8742, 127.7413
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20003001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한신휴플러스', '강원', '춘천시', '서부대성로 34 (요선동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20003001-84.svg', 37.8742, 127.7413
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20003001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한신휴플러스', '강원', '춘천시', '서부대성로 34 (요선동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20003001-114.svg', 37.8742, 127.7413
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20003001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '롯데캐슬위너클래스', '강원', '춘천시', '방송길 41 (약사동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023722-59.svg', 37.8685, 127.7214
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023722-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '롯데캐슬위너클래스', '강원', '춘천시', '방송길 41 (약사동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023722-84.svg', 37.8685, 127.7214
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023722-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '모아엘가센텀뷰아파트', '강원', '춘천시', '공지로 400 (약사동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024074-59.svg', 37.8738, 127.7183
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024074-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '모아엘가센텀뷰아파트', '강원', '춘천시', '공지로 400 (약사동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024074-84.svg', 37.8738, 127.7183
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024074-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동보아파트', '강원', '춘천시', '공지로200번길 13 (효자동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20009203-59.svg', 37.8645, 127.7403
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20009203-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '현진에버빌3차아파트', '강원', '춘천시', '춘천로 120 (효자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20082901-84.svg', 37.8973, 127.7644
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20082901-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '현진에버빌3차아파트', '강원', '춘천시', '춘천로 120 (효자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20082901-114.svg', 37.8973, 127.7644
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20082901-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '춘천효자주공8차', '강원', '춘천시', '공지로 234-16 (효자동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20094802-59.svg', 37.8738, 127.7183
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20094802-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '소양현대아파트', '강원', '춘천시', '모수물길 60 (소양로2가)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20011201-59.svg', 37.8874, 127.7279
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20011201-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '소양현대아파트', '강원', '춘천시', '모수물길 60 (소양로2가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20011201-84.svg', 37.8874, 127.7279
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20011201-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '소양현대아파트', '강원', '춘천시', '모수물길 60 (소양로2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20011201-114.svg', 37.8874, 127.7279
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20011201-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'e편한세상춘천', '강원', '춘천시', '서부대성로 33 (소양로2가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20011202-84.svg', 37.8841, 127.7263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20011202-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'e편한세상춘천', '강원', '춘천시', '서부대성로 33 (소양로2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20011202-114.svg', 37.8841, 127.7263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20011202-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '파밀리에리버파크', '강원', '춘천시', '중앙로194번길 11 (근화동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022782-59.svg', 37.8776, 127.7128
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022782-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '파밀리에리버파크', '강원', '춘천시', '중앙로194번길 11 (근화동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022782-84.svg', 37.8776, 127.7128
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022782-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신성근화미소지움', '강원', '춘천시', '근화길15번길 26 (근화동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20093103-59.svg', 37.8725, 127.718
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20093103-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신성근화미소지움', '강원', '춘천시', '근화길15번길 26 (근화동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20093103-84.svg', 37.8725, 127.718
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20093103-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신성근화미소지움', '강원', '춘천시', '근화길15번길 26 (근화동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20093103-114.svg', 37.8725, 127.718
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20093103-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우두 이지더원 2차 아파트', '강원', '춘천시', '우두1길 140 (우두동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023269-84.svg', 37.9106, 127.7358
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023269-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '춘천우두이지더원시그니처', '강원', '춘천시', '우두1길 70 (우두동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023965-84.svg', 37.9106, 127.7358
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023965-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '춘천우두LH천년나무3단지아파트', '강원', '춘천시', '우두1길 40 (우두동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024323-59.svg', 37.9086, 127.738
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024323-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '춘천파크에뷰아파트', '강원', '춘천시', '우두1길 129 (우두동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024596-84.svg', 37.9106, 127.7358
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024596-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우두LH 천년나무1단지', '강원', '춘천시', '우두로 130 (우두동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026590-59.svg', 37.9129, 127.7359
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026590-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '강변코아루', '강원', '춘천시', '새청말길 26 (우두동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20015004-84.svg', 37.8984, 127.7395
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20015004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '강변코아루', '강원', '춘천시', '새청말길 26 (우두동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20015004-114.svg', 37.8984, 127.7395
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20015004-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '강변코아루', '강원', '춘천시', '새청말길 26 (우두동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20015004-145.svg', 37.8984, 127.7395
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20015004-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '두미르', '강원', '춘천시', '영서로 2793 (우두동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20077901-84.svg', 37.8563, 127.7373
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20077901-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '롯데인벤스우두파크아파트', '강원', '춘천시', '충열로 29 (우두동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20093903-84.svg', 37.9173, 127.7405
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20093903-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '롯데인벤스우두파크아파트', '강원', '춘천시', '충열로 29 (우두동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20093903-114.svg', 37.9173, 127.7405
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20093903-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '롯데인벤스우두파크아파트', '강원', '춘천시', '충열로 29 (우두동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20093903-145.svg', 37.9173, 127.7405
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20093903-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '사농현대아파트', '강원', '춘천시', '영서로 2920 (사농동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20014001-59.svg', 37.8441, 127.7585
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20014001-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '사농현대아파트', '강원', '춘천시', '영서로 2920 (사농동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20014001-84.svg', 37.8441, 127.7585
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20014001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '사농현대아파트', '강원', '춘천시', '영서로 2920 (사농동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20014001-114.svg', 37.8441, 127.7585
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20014001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '춘천롯데캐슬더퍼스트아파트1단지', '강원', '춘천시', '마장길 58 (사농동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20071303-84.svg', 37.9093, 127.7301
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20071303-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '춘천롯데캐슬더퍼스트아파트1단지', '강원', '춘천시', '마장길 58 (사농동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa20071303-114.svg', 37.9093, 127.7301
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa20071303-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청주행정타운 코아루휴티스', '충북', '청주상당구', '상당구 중앙로 80 (북문로3가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024536-84.svg', 36.64, 127.4887
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024536-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '센트럴칸타빌아파트', '충북', '청주상당구', '상당구 용담로 7 (문화동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025801-84.svg', 36.6354, 127.5062
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025801-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '센트럴칸타빌아파트', '충북', '청주상당구', '상당구 용담로 7 (문화동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025801-114.svg', 36.6354, 127.5062
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025801-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '센트럴칸타빌아파트', '충북', '청주상당구', '상당구 용담로 7 (문화동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025801-145.svg', 36.6354, 127.5062
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025801-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '보성트윈힐스아파트', '충북', '청주상당구', '상당구 중고개로 349 (탑동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36008102-59.svg', 36.6284, 127.507
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36008102-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '탑동현대아파트', '충북', '청주상당구', '상당구 탑동로 78 (탑동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36077703-84.svg', 36.6302, 127.4996
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36077703-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '탑클래스아파트', '충북', '청주상당구', '상당구 산성로 55 (탑동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36077704-59.svg', 36.6448, 127.5237
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36077704-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '탑클래스아파트', '충북', '청주상당구', '상당구 산성로 55 (탑동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36077704-84.svg', 36.6448, 127.5237
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36077704-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대성우성3차아파트', '충북', '청주상당구', '상당구 용담로63번길 33 (대성동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36076902-84.svg', 36.6328, 127.4988
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36076902-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대성우성3차아파트', '충북', '청주상당구', '상당구 용담로63번길 33 (대성동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36076902-114.svg', 36.6328, 127.4988
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36076902-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대성우성3차아파트', '충북', '청주상당구', '상당구 용담로63번길 33 (대성동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36076902-145.svg', 36.6328, 127.4988
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36076902-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신라송림아파트', '충북', '청주상당구', '상당구 단재로77번길 21-22 (영운동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36009004-59.svg', 36.6214, 127.4971
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36009004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '신라송림아파트', '충북', '청주상당구', '상당구 단재로77번길 21-22 (영운동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36009004-84.svg', 36.6214, 127.4971
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36009004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영운수정아파트', '충북', '청주상당구', '상당구 영운천로51번길 26 (영운동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36009005-59.svg', 36.6182, 127.5037
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36009005-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '금천센트럴파크스타힐스아파트', '충북', '청주상당구', '상당구 쇠내로 48 (금천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024466-84.svg', 36.6247, 127.5048
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024466-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '장자마을현대아파트', '충북', '청주상당구', '상당구 수영로 312 (금천동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36076611-84.svg', 36.6226, 127.503
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36076611-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '장자마을10단지부영아파트', '충북', '청주상당구', '상당구 호미로233번길 68 (금천동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36078007-84.svg', 36.6282, 127.5114
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36078007-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '장자마을7단지부영아파트', '충북', '청주상당구', '상당구 중고개로 288 (금천동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36078013-59.svg', 36.6277, 127.5073
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36078013-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '뉴타운아파트', '충북', '청주상당구', '상당구 꽃산동로 41 (금천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079014-59.svg', 36.625, 127.5084
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079014-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '뉴타운아파트', '충북', '청주상당구', '상당구 꽃산동로 41 (금천동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079014-84.svg', 36.625, 127.5084
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079014-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '뉴타운아파트', '충북', '청주상당구', '상당구 꽃산동로 41 (금천동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079014-114.svg', 36.625, 127.5084
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079014-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '뉴타운아파트', '충북', '청주상당구', '상당구 꽃산동로 41 (금천동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079014-145.svg', 36.625, 127.5084
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079014-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '장자마을3단지부영아파트', '충북', '청주상당구', '상당구 호미로 285 (금천동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079015-84.svg', 36.6177, 127.5239
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079015-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '금천우미린', '충북', '청주상당구', '상당구 꽃산동로 25 (금천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079016-84.svg', 36.6241, 127.5086
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079016-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '장자마을e-그린타운2차', '충북', '청주상당구', '상당구 수영로 294 (금천동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079105-84.svg', 36.6237, 127.5039
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079105-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '장자마을5단지(부영8차)아파트', '충북', '청주상당구', '상당구 수영로 306 (금천동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079108-84.svg', 36.6333, 127.5128
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079108-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '금천효성1차아파트', '충북', '청주상당구', '상당구 수영로 204 (금천동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079310-59.svg', 36.6252, 127.5039
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079310-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '금천효성1차아파트', '충북', '청주상당구', '상당구 수영로 204 (금천동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36079310-84.svg', 36.6252, 127.5039
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36079310-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '금천풍림아파트', '충북', '청주상당구', '상당구 꽃산동로 36 (금천동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36080006-59.svg', 36.6241, 127.5086
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36080006-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '금천풍림아파트', '충북', '청주상당구', '상당구 꽃산동로 36 (금천동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36080006-84.svg', 36.6241, 127.5086
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36080006-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '금천풍림아파트', '충북', '청주상당구', '상당구 꽃산동로 36 (금천동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36080006-145.svg', 36.6241, 127.5086
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36080006-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '금천경희', '충북', '청주상당구', '상당구 꽃산동로 4-5 (금천동)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa36080009-59.svg', 36.625, 127.5084
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa36080009-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천안역필하우스에듀시티1단지아파트', '충남', '천안동남구', '동남구 성황로 40 (문화동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023818-59.svg', 36.8124, 127.1571
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023818-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천안역필하우스에듀시티1단지아파트', '충남', '천안동남구', '동남구 성황로 40 (문화동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023818-84.svg', 36.8124, 127.1571
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023818-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천안역필하우스에듀시티1단지아파트', '충남', '천안동남구', '동남구 성황로 40 (문화동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023818-114.svg', 36.8124, 127.1571
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023818-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트천안', '충남', '천안동남구', '동남구 옛시청길 29 (문화동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024342-59.svg', 36.807, 127.1486
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024342-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '힐스테이트천안', '충남', '천안동남구', '동남구 옛시청길 29 (문화동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024342-84.svg', 36.807, 127.1486
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024342-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이편한세상천안역아파트', '충남', '천안동남구', '동남구 원성천1길 99 (원성동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023117-59.svg', 36.8059, 127.1598
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023117-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이편한세상천안역아파트', '충남', '천안동남구', '동남구 원성천1길 99 (원성동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023117-84.svg', 36.8059, 127.1598
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023117-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원성동 극동아파트', '충남', '천안동남구', '동남구 충절로 190 (원성동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33095401-59.svg', 36.8057, 127.1588
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33095401-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '원성동 극동아파트', '충남', '천안동남구', '동남구 충절로 190 (원성동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33095401-84.svg', 36.8057, 127.1588
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33095401-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천안 신성미소지움 아파트', '충남', '천안동남구', '동남구 천안대로 483-8 (구성동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33006004-59.svg', 36.8247, 127.153
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33006004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천안 신성미소지움 아파트', '충남', '천안동남구', '동남구 천안대로 483-8 (구성동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33006004-84.svg', 36.8247, 127.153
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33006004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천안 신성미소지움 아파트', '충남', '천안동남구', '동남구 천안대로 483-8 (구성동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33006004-114.svg', 36.8247, 127.153
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33006004-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '구성휴먼시아', '충남', '천안동남구', '동남구 대흥로 35 (구성동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33074601-59.svg', 36.7973, 127.1565
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33074601-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '구성휴먼시아', '충남', '천안동남구', '동남구 대흥로 35 (구성동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33074601-84.svg', 36.7973, 127.1565
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33074601-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수행정타운금호어울림', '충남', '천안동남구', '동남구 수도산공원길 1 (청수동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023396-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023396-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수행정타운금호어울림', '충남', '천안동남구', '동남구 수도산공원길 1 (청수동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023396-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023396-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수극동1차아파트', '충남', '천안동남구', '동남구 청수로 99 (청수동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019002-84.svg', 36.7896, 127.1547
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수극동1차아파트', '충남', '천안동남구', '동남구 청수로 99 (청수동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019002-114.svg', 36.7896, 127.1547
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 극동2차아파트', '충남', '천안동남구', '동남구 청수로 71-7 (청수동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019003-84.svg', 36.7885, 127.1526
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 극동2차아파트', '충남', '천안동남구', '동남구 청수로 71-7 (청수동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019003-114.svg', 36.7885, 127.1526
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019003-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 현대아파트', '충남', '천안동남구', '동남구 풍세로 1010-31 (청수동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019004-59.svg', 36.7684, 127.1327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 현대아파트', '충남', '천안동남구', '동남구 풍세로 1010-31 (청수동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019004-84.svg', 36.7684, 127.1327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 현대아파트', '충남', '천안동남구', '동남구 풍세로 1010-31 (청수동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019004-114.svg', 36.7684, 127.1327
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019004-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 청솔LG.SK아파트', '충남', '천안동남구', '동남구 청수로 98 (청수동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019005-59.svg', 36.7885, 127.1526
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019005-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 청솔LG.SK아파트', '충남', '천안동남구', '동남구 청수로 98 (청수동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019005-84.svg', 36.7885, 127.1526
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019005-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 청솔LG.SK아파트', '충남', '천안동남구', '동남구 청수로 98 (청수동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019005-114.svg', 36.7885, 127.1526
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019005-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수동 청솔LG.SK아파트', '충남', '천안동남구', '동남구 청수로 98 (청수동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33019005-145.svg', 36.7885, 127.1526
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33019005-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼룡호반써밋포레센트', '충남', '천안동남구', '동남구 충절로 369 (삼룡동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022834-84.svg', 36.7696, 127.2779
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022834-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼룡호반써밋포레센트', '충남', '천안동남구', '동남구 충절로 369 (삼룡동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022834-114.svg', 36.7696, 127.2779
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022834-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼룡호반써밋포레센트', '충남', '천안동남구', '동남구 충절로 369 (삼룡동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10022834-145.svg', 36.7696, 127.2779
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10022834-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '행정타운센트럴두산위브아파트', '충남', '천안동남구', '동남구 청당5로 20 (청당동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023358-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023358-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당서희스타힐스아파트', '충남', '천안동남구', '동남구 청당4로 45 (청당동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023484-59.svg', 36.7791, 127.1483
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023484-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당서희스타힐스아파트', '충남', '천안동남구', '동남구 청당4로 45 (청당동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023484-84.svg', 36.7791, 127.1483
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023484-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당 코오롱 하늘채아파트', '충남', '천안동남구', '동남구 광풍로 1800 (청당동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025255-59.svg', 36.7809, 127.1473
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025255-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당 코오롱 하늘채아파트', '충남', '천안동남구', '동남구 광풍로 1800 (청당동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025255-84.svg', 36.7809, 127.1473
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025255-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당 한양수자인 블루시티', '충남', '천안동남구', '동남구 청당4로 60 (청당동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026387-84.svg', 36.7789, 127.1509
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026387-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수포레나아파트', '충남', '천안동남구', '동남구 청수14로 13 (청당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027917-114.svg', 36.7851, 127.1551
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027917-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당마을 신도브래뉴 아파트', '충남', '천안동남구', '동남구 풍세로 770 (청당동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33027001-84.svg', 36.7531, 127.1273
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33027001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당마을 신도브래뉴 아파트', '충남', '천안동남구', '동남구 풍세로 770 (청당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33027001-114.svg', 36.7531, 127.1273
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33027001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당벽산블루밍아파트', '충남', '천안동남구', '동남구 청당2길 118 (청당동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33027002-84.svg', 36.78, 127.1554
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33027002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당벽산블루밍아파트', '충남', '천안동남구', '동남구 청당2길 118 (청당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33027002-114.svg', 36.78, 127.1554
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33027002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당벽산블루밍아파트', '충남', '천안동남구', '동남구 청당2길 118 (청당동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33027002-145.svg', 36.78, 127.1554
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33027002-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당산운마을5단지(LH임대아파트)', '충남', '천안동남구', '동남구 청수8로 71 (청당동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33077501-59.svg', 36.7884, 127.1592
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33077501-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수2단지주공버들마을', '충남', '천안동남구', '동남구 청수14로 29 (청당동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33077502-59.svg', 36.7851, 127.1551
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33077502-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중흥S클래스아파트', '충남', '천안동남구', '동남구 청수14로 117 (청당동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33084901-84.svg', 36.7851, 127.1551
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33084901-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우미린', '충남', '천안동남구', '동남구 청수14로 16 (청당동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33084902-114.svg', 36.7851, 127.1551
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33084902-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우미린', '충남', '천안동남구', '동남구 청수14로 16 (청당동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33084902-145.svg', 36.7851, 127.1551
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33084902-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청수한양수자인', '충남', '천안동남구', '동남구 청수4로 11 (청당동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33084903-84.svg', 36.7829, 127.1525
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33084903-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '청당 포레스트 더힐', '충남', '천안동남구', '동남구 청수8로 72 (청당동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa33084904-84.svg', 36.785, 127.1614
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa33084904-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '전주태평아이파크', '전북', '전주완산구', '완산구 태진로 35 (태평동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023779-59.svg', 35.8268, 127.1367
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023779-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '전주태평아이파크', '전북', '전주완산구', '완산구 태진로 35 (태평동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023779-84.svg', 35.8268, 127.1367
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023779-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'SK VIEW', '전북', '전주완산구', '완산구 태평2길 22 (태평동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56008001-114.svg', 35.8228, 127.1406
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56008001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'SK VIEW', '전북', '전주완산구', '완산구 태평2길 22 (태평동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56008001-145.svg', 35.8228, 127.1406
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56008001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한옥마을 서해그랑블아파트', '전북', '전주완산구', '완산구 견훤왕궁1길 10 (중노송동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026521-59.svg', 35.8269, 127.1522
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026521-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한옥마을 서해그랑블아파트', '전북', '전주완산구', '완산구 견훤왕궁1길 10 (중노송동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026521-84.svg', 35.8269, 127.1522
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026521-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '한옥마을 서해그랑블아파트', '전북', '전주완산구', '완산구 견훤왕궁1길 10 (중노송동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10026521-114.svg', 35.8269, 127.1522
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10026521-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중노송동 기린봉', '전북', '전주완산구', '완산구 견훤로 100 (중노송동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56010001-84.svg', 35.8212, 127.1626
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56010001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중노송동 우성해오름', '전북', '전주완산구', '완산구 인봉남로 56 (중노송동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56082702-59.svg', 35.8261, 127.1597
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56082702-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중노송동 우성해오름', '전북', '전주완산구', '완산구 인봉남로 56 (중노송동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56082702-84.svg', 35.8261, 127.1597
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56082702-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중노송동 우성해오름', '전북', '전주완산구', '완산구 인봉남로 56 (중노송동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56082702-114.svg', 35.8261, 127.1597
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56082702-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중노송동 우성해오름', '전북', '전주완산구', '완산구 인봉남로 56 (중노송동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56082702-145.svg', 35.8261, 127.1597
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56082702-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동서학동 거산황궁', '전북', '전주완산구', '완산구 장승배기로 398 (동서학동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56012002-84.svg', 35.7915, 127.1164
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56012002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동서학동 거산황궁', '전북', '전주완산구', '완산구 장승배기로 398 (동서학동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56012002-114.svg', 35.7915, 127.1164
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56012002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동서학동 거산황궁', '전북', '전주완산구', '완산구 장승배기로 398 (동서학동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56012002-145.svg', 35.7915, 127.1164
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56012002-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서서학동 광진산업', '전북', '전주완산구', '완산구 덕적골3길 17 (서서학동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56081606-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56081606-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 신일', '전북', '전주완산구', '완산구 서원로 386 (중화산동1가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083210-59.svg', 35.8118, 127.1263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083210-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 신일', '전북', '전주완산구', '완산구 서원로 386 (중화산동1가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083210-84.svg', 35.8118, 127.1263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083210-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 신일', '전북', '전주완산구', '완산구 서원로 386 (중화산동1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083210-114.svg', 35.8118, 127.1263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083210-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 신일', '전북', '전주완산구', '완산구 서원로 386 (중화산동1가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083210-145.svg', 35.8118, 127.1263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083210-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 현대(A)단지', '전북', '전주완산구', '완산구 안행로 175 (중화산동1가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083508-59.svg', 35.8023, 127.1346
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083508-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 현대(A)단지', '전북', '전주완산구', '완산구 안행로 175 (중화산동1가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083508-84.svg', 35.8023, 127.1346
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083508-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 현대(A)단지', '전북', '전주완산구', '완산구 안행로 175 (중화산동1가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083508-114.svg', 35.8023, 127.1346
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083508-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 현대(A)단지', '전북', '전주완산구', '완산구 안행로 175 (중화산동1가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083508-145.svg', 35.8023, 127.1346
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083508-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산영무예다음아파트', '전북', '전주완산구', '완산구 안행로 165-5 (중화산동2가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027772-84.svg', 35.8023, 127.1346
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027772-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산풍림아이원', '전북', '전주완산구', '완산구 서원로 289 (중화산동2가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56076711-84.svg', 35.8121, 127.1263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56076711-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산풍림아이원', '전북', '전주완산구', '완산구 서원로 289 (중화산동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56076711-114.svg', 35.8121, 127.1263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56076711-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산풍림아이원', '전북', '전주완산구', '완산구 서원로 289 (중화산동2가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56076711-145.svg', 35.8121, 127.1263
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56076711-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 광진', '전북', '전주완산구', '완산구 선너머로 16 (중화산동2가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083209-84.svg', 35.8154, 127.1283
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083209-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동 광진', '전북', '전주완산구', '완산구 선너머로 16 (중화산동2가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083209-145.svg', 35.8154, 127.1283
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083209-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동우성근영', '전북', '전주완산구', '완산구 영경1길 25 (중화산동2가)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083306-59.svg', 35.8191, 127.1269
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083306-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동우성근영', '전북', '전주완산구', '완산구 영경1길 25 (중화산동2가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083306-84.svg', 35.8191, 127.1269
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083306-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동우성근영', '전북', '전주완산구', '완산구 영경1길 25 (중화산동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083306-114.svg', 35.8191, 127.1269
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083306-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동우성중산타운', '전북', '전주완산구', '완산구 신촌3길 1 (중화산동2가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083704-84.svg', 35.8171, 127.1159
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083704-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동한신코아', '전북', '전주완산구', '완산구 신촌2길 20 (중화산동2가)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083705-84.svg', 35.8142, 127.1172
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083705-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동한신코아', '전북', '전주완산구', '완산구 신촌2길 20 (중화산동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083705-114.svg', 35.8142, 127.1172
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083705-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동코오롱하늘채', '전북', '전주완산구', '완산구 화산천변로 55 (중화산동2가)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083807-84.svg', 35.8222, 127.1161
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083807-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동코오롱하늘채', '전북', '전주완산구', '완산구 화산천변로 55 (중화산동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083807-114.svg', 35.8222, 127.1161
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083807-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동코오롱하늘채', '전북', '전주완산구', '완산구 화산천변로 55 (중화산동2가)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083807-145.svg', 35.8222, 127.1161
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083807-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동현대에코르', '전북', '전주완산구', '완산구 화산천변로 50 (중화산동2가)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083808-84.svg', 35.8222, 127.1161
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083808-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중화산동현대에코르', '전북', '전주완산구', '완산구 화산천변로 50 (중화산동2가)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56083808-114.svg', 35.8222, 127.1161
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56083808-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서신아이파크e편한세상', '전북', '전주완산구', '완산구 전주천서로 445 (서신동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024783-59.svg', 35.8197, 127.136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024783-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서신아이파크e편한세상', '전북', '전주완산구', '완산구 전주천서로 445 (서신동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024783-84.svg', 35.8197, 127.136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024783-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서신아이파크e편한세상', '전북', '전주완산구', '완산구 전주천서로 445 (서신동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024783-114.svg', 35.8197, 127.136
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024783-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '동아한일아파트', '전북', '전주완산구', '완산구 새터로 95 (서신동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56079101-59.svg', 35.8352, 127.1196
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56079101-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서신동 롯데', '전북', '전주완산구', '완산구 전룡로 128-5 (서신동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56081807-84.svg', 35.8285, 127.1247
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56081807-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서신동 롯데', '전북', '전주완산구', '완산구 전룡로 128-5 (서신동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56081807-114.svg', 35.8285, 127.1247
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56081807-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '서신동 롯데', '전북', '전주완산구', '완산구 전룡로 128-5 (서신동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa56081807-145.svg', 35.8285, 127.1247
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa56081807-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '상도코아루센트럴하임', '경북', '포항남구', '남구 상도남로 25 (상도동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027999-59.svg', 36.0083, 129.3451
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027999-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '상도코아루센트럴하임', '경북', '포항남구', '남구 상도남로 25 (상도동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027999-84.svg', 36.0083, 129.3451
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027999-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태왕아너스오션', '경북', '포항남구', '남구 서동로 166 (송도동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79082901-84.svg', 36.0399, 129.3753
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79082901-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태왕아너스오션', '경북', '포항남구', '남구 서동로 166 (송도동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79082901-114.svg', 36.0399, 129.3753
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79082901-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '태왕아너스오션', '경북', '포항남구', '남구 서동로 166 (송도동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79082901-145.svg', 36.0399, 129.3753
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79082901-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '일월LH행복주택', '경북', '포항남구', '일월동', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10023457-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10023457-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우방신세계1차아파트', '경북', '포항남구', '남구 해병로 125-1 (인덕동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79072402-59.svg', 35.965, 129.4102
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79072402-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '우방신세계1차아파트', '경북', '포항남구', '남구 해병로 125-1 (인덕동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79072402-84.svg', 35.965, 129.4102
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79072402-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자웰빙 SK VIEW 2차', '경북', '포항남구', '남구 효성로63번길 17 (효자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79033002-114.svg', 36.007, 129.3409
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79033002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자웰빙 SK VIEW 2차', '경북', '포항남구', '남구 효성로63번길 17 (효자동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79033002-145.svg', 36.007, 129.3409
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79033002-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자웰빙타운 SK VIEW', '경북', '포항남구', '남구 새천년대로 306 (효자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79033003-84.svg', 36.0146, 129.3448
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79033003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자웰빙타운 SK VIEW', '경북', '포항남구', '남구 새천년대로 306 (효자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79033003-114.svg', 36.0146, 129.3448
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79033003-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자웰빙타운 SK VIEW', '경북', '포항남구', '남구 새천년대로 306 (효자동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79033003-145.svg', 36.0146, 129.3448
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79033003-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자웰빙SKVIEW3차', '경북', '포항남구', '남구 효성로 82 (효자동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79076001-84.svg', 36.0061, 129.3393
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79076001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자웰빙SKVIEW3차', '경북', '포항남구', '남구 효성로 82 (효자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79076001-114.svg', 36.0061, 129.3393
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79076001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자웰빙SKVIEW3차', '경북', '포항남구', '남구 효성로 82 (효자동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79076001-145.svg', 36.0061, 129.3393
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79076001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자풍림아이원', '경북', '포항남구', '남구 효성로 55 (효자동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79076002-84.svg', 36.0061, 129.3393
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79076002-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자풍림아이원', '경북', '포항남구', '남구 효성로 55 (효자동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79076002-114.svg', 36.0061, 129.3393
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79076002-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '승리행복화목마을회', '경북', '포항남구', '남구 지곡로 20 (효자동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79083401-59.svg', 36.0096, 129.329
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79083401-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '승리행복화목마을회', '경북', '포항남구', '남구 지곡로 20 (효자동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79083401-84.svg', 36.0096, 129.329
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79083401-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '지곡삼성그린빌라', '경북', '포항남구', '남구 지곡로 319 (지곡동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075102-84.svg', 36.0335, 129.3143
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075102-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '엘지그린빌라', '경북', '포항남구', '남구 지곡로211번길 50 (지곡동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075103-84.svg', 36.0287, 129.318
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075103-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자그린1차아파트', '경북', '포항남구', '남구 지곡로 260 (지곡동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075204-59.svg', 36.0335, 129.3143
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075204-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자그린1차아파트', '경북', '포항남구', '남구 지곡로 260 (지곡동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075204-84.svg', 36.0335, 129.3143
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075204-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자그린2차아파트', '경북', '포항남구', '남구 지곡로 294 (지곡동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075205-59.svg', 36.0265, 129.3252
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075205-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '효자그린2차아파트', '경북', '포항남구', '남구 지곡로 294 (지곡동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075205-84.svg', 36.0265, 129.3252
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075205-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '라온프라이빗스카이파크', '경북', '포항남구', '남구 새천년대로410번길 20 (대잠동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024902-59.svg', 36.0121, 129.3447
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024902-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '라온프라이빗스카이파크', '경북', '포항남구', '남구 새천년대로410번길 20 (대잠동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024902-84.svg', 36.0121, 129.3447
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024902-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동대우아파트', '경북', '포항남구', '남구 포스코대로 152 (대잠동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79073003-84.svg', 36.0255, 129.3391
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79073003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동우방파크빌', '경북', '포항남구', '남구 포스코대로 159 (대잠동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79073004-59.svg', 36.0255, 129.3391
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79073004-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동우방파크빌', '경북', '포항남구', '남구 포스코대로 159 (대잠동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79073004-84.svg', 36.0255, 129.3391
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79073004-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대잠그린파크', '경북', '포항남구', '남구 대이로46번길 29 (대잠동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79073105-84.svg', 36.0204, 129.3437
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79073105-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대잠그린파크', '경북', '포항남구', '남구 대이로46번길 29 (대잠동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79073105-114.svg', 36.0204, 129.3437
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79073105-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대잠센트럴하이츠', '경북', '포항남구', '남구 희망대로 520 (대잠동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79073106-114.svg', 36.0284, 129.3798
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79073106-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대잠센트럴하이츠', '경북', '포항남구', '남구 희망대로 520 (대잠동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79073106-145.svg', 36.0284, 129.3798
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79073106-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동현대홈타운', '경북', '포항남구', '남구 대이로 100 (대잠동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075806-84.svg', 36.0203, 129.3411
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075806-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동현대홈타운', '경북', '포항남구', '남구 대이로 100 (대잠동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075806-114.svg', 36.0203, 129.3411
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075806-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동현대홈타운', '경북', '포항남구', '남구 대이로 100 (대잠동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075806-145.svg', 36.0203, 129.3411
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075806-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대잠아델리아', '경북', '포항남구', '남구 대이로20번길 24 (대잠동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79082602-84.svg', 36.018, 129.3443
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79082602-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대잠아델리아', '경북', '포항남구', '남구 대이로20번길 24 (대잠동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79082602-114.svg', 36.018, 129.3443
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79082602-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동그린빌명품아파트', '경북', '포항남구', '남구 대이로 138 (이동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79072302-59.svg', 36.0278, 129.341
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79072302-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동그린빌명품아파트', '경북', '포항남구', '남구 대이로 138 (이동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79072302-84.svg', 36.0278, 129.341
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79072302-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이동그린빌명품아파트', '경북', '포항남구', '남구 대이로 138 (이동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79072302-114.svg', 36.0278, 129.341
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79072302-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '해뜨는마을', '경북', '포항남구', '남구 병포길 124-6 (구룡포읍)', '59', 58.8, 2, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79080401-59.svg', 35.9818, 129.5542
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79080401-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼도한솔1차아파트', '경북', '포항남구', '남구 연일로 142 (연일읍)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075611-59.svg', 36.0077, 129.3422
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075611-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼도한솔1차아파트', '경북', '포항남구', '남구 연일로 142 (연일읍)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075611-84.svg', 36.0077, 129.3422
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075611-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '형산강변타운', '경북', '포항남구', '남구 연일로 130 (연일읍)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075713-59.svg', 36.0077, 129.3422
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075713-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '형산강변타운', '경북', '포항남구', '남구 연일로 130 (연일읍)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79075713-84.svg', 36.0077, 129.3422
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79075713-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼도3차한솔타운', '경북', '포항남구', '남구 철강로 71 (연일읍)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79088209-59.svg', 35.9657, 129.422
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79088209-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼도3차한솔타운', '경북', '포항남구', '남구 철강로 71 (연일읍)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79088209-84.svg', 35.9657, 129.422
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79088209-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼도3차한솔타운', '경북', '포항남구', '남구 철강로 71 (연일읍)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa79088209-114.svg', 35.9657, 129.422
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa79088209-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원중동유니시티3단지', '경남', '창원의창구', '의창구 중동로 77 (중동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025098-59.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025098-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원중동유니시티3단지', '경남', '창원의창구', '의창구 중동로 77 (중동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025098-84.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025098-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원중동유니시티3단지', '경남', '창원의창구', '의창구 중동로 77 (중동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025098-114.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025098-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중동유니시티4단지', '경남', '창원의창구', '의창구 중동로 78 (중동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025118-59.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025118-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중동유니시티4단지', '경남', '창원의창구', '의창구 중동로 78 (중동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025118-84.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025118-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중동유니시티4단지', '경남', '창원의창구', '의창구 중동로 78 (중동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025118-114.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025118-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중동유니시티4단지', '경남', '창원의창구', '의창구 중동로 78 (중동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025118-145.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025118-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원 중동 유니시티 2단지', '경남', '창원의창구', '의창구 중동로 33 (중동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025452-59.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025452-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원 중동 유니시티 2단지', '경남', '창원의창구', '의창구 중동로 33 (중동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025452-84.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025452-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원 중동 유니시티 2단지', '경남', '창원의창구', '의창구 중동로 33 (중동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025452-114.svg', 35.2553, 128.629
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025452-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원중동유니시티1단지', '경남', '창원의창구', '의창구 중동로 34 (중동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025454-59.svg', 35.2541, 128.6259
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025454-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원중동유니시티1단지', '경남', '창원의창구', '의창구 중동로 34 (중동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025454-84.svg', 35.2541, 128.6259
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025454-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원중동유니시티1단지', '경남', '창원의창구', '의창구 중동로 34 (중동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025454-114.svg', 35.2541, 128.6259
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025454-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원중동유니시티1단지', '경남', '창원의창구', '의창구 중동로 34 (중동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025454-145.svg', 35.2541, 128.6259
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025454-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중동대동다:숲', '경남', '창원의창구', '의창구 팔용로 512 (서상동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64170001-84.svg', 35.2489, 128.6075
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64170001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중동대동다:숲', '경남', '창원의창구', '의창구 팔용로 512 (서상동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64170001-114.svg', 35.2489, 128.6075
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64170001-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '중동대동다:숲', '경남', '창원의창구', '의창구 팔용로 512 (서상동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64170001-145.svg', 35.2489, 128.6075
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64170001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '도계휴먼시아', '경남', '창원의창구', '의창구 원이대로82번길 15-15 (도계동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64179602-59.svg', 35.2534, 128.6357
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64179602-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '흥한웰가', '경남', '창원의창구', '의창구 천주로 33 (동정동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64195903-84.svg', 35.3838, 128.6052
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64195903-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '흥한웰가', '경남', '창원의창구', '의창구 천주로 33 (동정동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64195903-114.svg', 35.3838, 128.6052
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64195903-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '봉림휴먼시아2단지', '경남', '창원의창구', '의창구 대봉로 25 (봉림동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64124201-59.svg', 35.2583, 128.6665
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64124201-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'LH피닉스포레', '경남', '창원의창구', '의창구 대봉로 27 (봉림동)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64124202-84.svg', 35.2583, 128.6665
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64124202-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT 'LH피닉스포레', '경남', '창원의창구', '의창구 대봉로 27 (봉림동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64124202-114.svg', 35.2583, 128.6665
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64124202-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '봉림휴먼시아1단지', '경남', '창원의창구', '의창구 소봉로 50 (봉림동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64124203-59.svg', 35.2513, 128.6707
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64124203-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원명곡포엘른아파트', '경남', '창원의창구', '의창구 명곡지구로 25 (명곡동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10021560-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10021560-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원두산위브아파트', '경남', '창원의창구', '의창구 도계로 135 (명서동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64176301-84.svg', 35.2578, 128.6389
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64176301-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원두산위브아파트', '경남', '창원의창구', '의창구 도계로 135 (명서동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64176301-114.svg', 35.2578, 128.6389
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64176301-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원두산위브아파트', '경남', '창원의창구', '의창구 도계로 135 (명서동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64176301-145.svg', 35.2578, 128.6389
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64176301-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '늘푸른마을코오롱', '경남', '창원의창구', '의창구 지귀로95번길 7 (봉곡동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64193501-59.svg', 35.2475, 128.6577
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64193501-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '늘푸른마을코오롱', '경남', '창원의창구', '의창구 지귀로95번길 7 (봉곡동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64193501-84.svg', 35.2475, 128.6577
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64193501-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원반계LH아파트', '경남', '창원의창구', '의창구 소계로 13 (팔용동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024449-59.svg', 35.2537, 128.604
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024449-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원힐스테이트아티움시티', '경남', '창원의창구', '의창구 창원대로397번길 11 (팔용동)', '84', 84, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10024897-84.svg', 35.235, 128.6427
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10024897-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대동중앙', '경남', '창원의창구', '의창구 반계로 101 (팔용동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64178804-59.svg', 35.2502, 128.6132
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64178804-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '벽산블루밍C단지', '경남', '창원의창구', '의창구 남산로 20 (팔용동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64184902-59.svg', 35.257, 128.6156
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64184902-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '벽산블루밍C단지', '경남', '창원의창구', '의창구 남산로 20 (팔용동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64184902-84.svg', 35.257, 128.6156
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64184902-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '극동아파트', '경남', '창원의창구', '의창구 팔용로 446 (팔용동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64184905-59.svg', 35.252, 128.6101
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64184905-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '극동아파트', '경남', '창원의창구', '의창구 팔용로 446 (팔용동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64184905-84.svg', 35.252, 128.6101
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64184905-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '극동아파트', '경남', '창원의창구', '의창구 팔용로 446 (팔용동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64184905-114.svg', 35.252, 128.6101
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64184905-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '팔용벽산블루밍A단지', '경남', '창원의창구', '의창구 반계로 104-9 (팔용동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64185003-59.svg', 35.2503, 128.6133
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64185003-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '팔용벽산블루밍A단지', '경남', '창원의창구', '의창구 반계로 104-9 (팔용동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64185003-84.svg', 35.2503, 128.6133
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64185003-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '벽산블루밍아파트B단지', '경남', '창원의창구', '의창구 반계로 104-8 (팔용동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64190606-59.svg', 35.253, 128.6156
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64190606-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '벽산블루밍아파트B단지', '경남', '창원의창구', '의창구 반계로 104-8 (팔용동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64190606-84.svg', 35.253, 128.6156
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64190606-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '송정주공아파트', '경남', '창원의창구', '의창구 용정길 26 (동읍)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64196009-59.svg', 35.2786, 128.7022
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64196009-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼진아파트', '경남', '창원의창구', '의창구 의창대로915번길 8 (동읍)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64186208-59.svg', 35.2806, 128.6906
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64186208-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '칠성그린아파트', '경남', '창원의창구', '의창구 동읍로 196 (동읍)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64190710-59.svg', 35.3698, 128.6433
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64190710-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원포레힐스데시앙', '경남', '창원의창구', '의창구 감계로187번길 9 (북면)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10020898-59.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10020898-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원포레힐스데시앙', '경남', '창원의창구', '의창구 감계로187번길 9 (북면)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10020898-84.svg', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10020898-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계아내에코프리미엄2차', '경남', '창원의창구', '의창구 감계로 342 (북면)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025820-59.svg', 35.2961, 128.5881
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025820-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계아내에코프리미엄2차', '경남', '창원의창구', '의창구 감계로 342 (북면)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10025820-84.svg', 35.2961, 128.5881
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10025820-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계 힐스테이트 4차 아파트', '경남', '창원의창구', '의창구 감계로 233 (북면)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027049-59.svg', 35.2958, 128.6006
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027049-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계 힐스테이트 4차 아파트', '경남', '창원의창구', '의창구 감계로 233 (북면)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027049-84.svg', 35.2958, 128.6006
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027049-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계 힐스테이트 4차 아파트', '경남', '창원의창구', '의창구 감계로 233 (북면)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027049-114.svg', 35.2958, 128.6006
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027049-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원감계푸르지오아파트', '경남', '창원의창구', '의창구 감계로 220 (북면)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027154-59.svg', 35.2961, 128.5881
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027154-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '창원감계푸르지오아파트', '경남', '창원의창구', '의창구 감계로 220 (북면)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa10027154-84.svg', 35.2961, 128.5881
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa10027154-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계휴먼빌', '경남', '창원의창구', '의창구 감계로 297 (북면)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64187103-59.svg', 35.2961, 128.5881
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64187103-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계휴먼빌', '경남', '창원의창구', '의창구 감계로 297 (북면)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64187103-84.svg', 35.2961, 128.5881
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64187103-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계힐스테이트1차', '경남', '창원의창구', '의창구 동전로 86 (북면)', '84', 84.4, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64187104-84.svg', 35.2979, 128.5948
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64187104-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '감계힐스테이트1차', '경남', '창원의창구', '의창구 동전로 86 (북면)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64187104-114.svg', 35.2979, 128.5948
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64187104-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '천수림아파트', '경남', '창원의창구', '의창구 감계로 222 (북면)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa64187105-59.svg', 35.2961, 128.5881
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa64187105-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '일도우성1단지', '제주', '제주시', '태성로 3 (일도이동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69001203-59.svg', 33.5011, 126.5486
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69001203-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '일도우성1단지', '제주', '제주시', '태성로 3 (일도이동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69001203-84.svg', 33.5011, 126.5486
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69001203-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '일도신천지아파트', '제주', '제주시', '천수로 72 (일도이동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69001204-59.svg', 33.504, 126.5424
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69001204-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대유대림', '제주', '제주시', '남광로 181 (일도이동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69001205-84.svg', 33.4934, 126.5386
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69001205-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '대유대림', '제주', '제주시', '남광로 181 (일도이동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69001205-114.svg', 33.4934, 126.5386
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69001205-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '영산홍주택', '제주', '제주시', '승천로 27 (이도이동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69002201-59.svg', 33.4923, 126.5427
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69002201-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '이도주공1', '제주', '제주시', '구남로7길 36 (이도이동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69002202-59.svg', 33.4927, 126.5346
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69002202-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '제주이도한일베라체', '제주', '제주시', '신설로 55 (이도이동)', '84', 84.5, 3, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69073101-84.svg', 33.4931, 126.5439
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69073101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '제주이도한일베라체', '제주', '제주시', '신설로 55 (이도이동)', '114', 114.8, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69073101-114.svg', 33.4931, 126.5439
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69073101-114.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '제주이도한일베라체', '제주', '제주시', '신설로 55 (이도이동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69073101-145.svg', 33.4931, 126.5439
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69073101-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '건입동 현대아파트', '제주', '제주시', '만덕로3길 26 (건입동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69005001-84.svg', 33.5152, 126.5323
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69005001-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '건입동 현대아파트', '제주', '제주시', '만덕로3길 26 (건입동)', '145', 145.4, 4, 2, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69005001-145.svg', 33.5152, 126.5323
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69005001-145.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화북주공1', '제주', '제주시', '동화로1길 11 (화북일동)', '84', 99.6, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69006101-84.svg', 33.5182, 126.5774
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69006101-84.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '화북주공2', '제주', '제주시', '동화로1길 39 (화북일동)', '59', 59.4, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69006102-59.svg', 33.5177, 126.5774
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69006102-59.svg');
INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT '삼화휴먼시아1단지', '제주', '제주시', '화삼북로2길 12 (화북일동)', '59', 59, 3, 1, 'minicad', '실단지 개략 재작도 (참고용·실측 아님)', '/catalog/plans/img/cx-aa69078101-59.svg', 33.5157, 126.5764
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = '/catalog/plans/img/cx-aa69078101-59.svg');
