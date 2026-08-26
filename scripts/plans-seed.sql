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
