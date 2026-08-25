// 수도권 실단지 평면도 생성 — 1차 배치 (2026-08-25 대표 지시: 전국 목표, 수도권부터)
// 실단지의 평형·유형(판상 3/4베이·타워)을 참조해 표준 템플릿(기존 std JSON)으로 "개략 재작도".
// 단지명·주소·좌표는 사실 정보, 도면은 자체 재작도 저작물 — 타 플랫폼 이미지 복제 아님.
// 출력: img/cx-*.svg (이후 plans-svg-to-minicad.mjs 로 JSON, plans-svg-openings.mjs 로 개구부 표기)
//       scripts/plans-complexes-spec.json (DB 시드용)
import { readFileSync, writeFileSync } from 'node:fs';
import { renderPlanSVG, validateTiling, specFromPlanJSON, f1 } from './lib/plan-svg.mjs';

const DATA = 'sites/net/public/catalog/plans/data';
const IMG = 'sites/net/public/catalog/plans/img';

// tpl: 재작도에 참조할 표준 템플릿 (판상3베이=84a·59a, 판상4베이=84b, 타워=84c·59c, 구축판상=99, 중형=66)
// lat/lng: 개략 좌표 (동 단위 정확도 — 지도 마커용)
const COMPLEXES = [
  // ── 서울 ──
  { slug:'cx-helio-84',    name:'헬리오시티',                 at:'84A', tpl:'std-84b', sido:'서울', gugun:'송파구',  addr:'송파대로 345 (가락동)',        lat:37.4972, lng:127.1233 },
  { slug:'cx-helio-59',    name:'헬리오시티',                 at:'59A', tpl:'std-59a', sido:'서울', gugun:'송파구',  addr:'송파대로 345 (가락동)',        lat:37.4972, lng:127.1233 },
  { slug:'cx-parkrio-84',  name:'파크리오',                   at:'84',  tpl:'std-84a', sido:'서울', gugun:'송파구',  addr:'올림픽로 435 (신천동)',        lat:37.5203, lng:127.1078 },
  { slug:'cx-els-84',      name:'잠실엘스',                   at:'84',  tpl:'std-84a', sido:'서울', gugun:'송파구',  addr:'올림픽로 99 (잠실동)',         lat:37.5118, lng:127.0887 },
  { slug:'cx-ricenz-84',   name:'리센츠',                     at:'84',  tpl:'std-84b', sido:'서울', gugun:'송파구',  addr:'올림픽로 135 (잠실동)',        lat:37.5145, lng:127.0922 },
  { slug:'cx-foreon-84',   name:'올림픽파크포레온',           at:'84A', tpl:'std-84b', sido:'서울', gugun:'강동구',  addr:'양재대로 1025 (둔촌동)',       lat:37.5273, lng:127.1360 },
  { slug:'cx-foreon-59',   name:'올림픽파크포레온',           at:'59A', tpl:'std-59b', sido:'서울', gugun:'강동구',  addr:'양재대로 1025 (둔촌동)',       lat:37.5273, lng:127.1360 },
  { slug:'cx-gracium-84',  name:'고덕그라시움',               at:'84',  tpl:'std-84a', sido:'서울', gugun:'강동구',  addr:'고덕로 333 (고덕동)',          lat:37.5590, lng:127.1553 },
  { slug:'cx-mapo-rp-84',  name:'마포래미안푸르지오',         at:'84',  tpl:'std-84a', sido:'서울', gugun:'마포구',  addr:'마포대로 195 (아현동)',        lat:37.5535, lng:126.9557 },
  { slug:'cx-ghg-xi-84',   name:'경희궁자이',                 at:'84',  tpl:'std-84c', sido:'서울', gugun:'종로구',  addr:'송월길 99 (홍파동)',           lat:37.5713, lng:126.9636 },
  { slug:'cx-banpo-xi-84', name:'반포자이',                   at:'84',  tpl:'std-84b', sido:'서울', gugun:'서초구',  addr:'신반포로 270 (반포동)',        lat:37.5040, lng:127.0183 },
  { slug:'cx-acro-rp-84',  name:'아크로리버파크',             at:'84',  tpl:'std-84c', sido:'서울', gugun:'서초구',  addr:'신반포로15길 19 (반포동)',     lat:37.5166, lng:127.0009 },
  { slug:'cx-eunma-84',    name:'은마아파트',                 at:'84',  tpl:'std-99',  sido:'서울', gugun:'강남구',  addr:'삼성로 212 (대치동)',          lat:37.4994, lng:127.0614 },
  { slug:'cx-mokdong7-66', name:'목동신시가지7단지',          at:'66',  tpl:'std-66',  sido:'서울', gugun:'양천구',  addr:'목동동로 100 (목동)',          lat:37.5263, lng:126.8709 },
  // ── 경기 ──
  { slug:'cx-wirye-84',    name:'위례자연앤래미안e편한세상',  at:'84',  tpl:'std-84a', sido:'경기', gugun:'성남시 수정구', addr:'위례광장로 (창곡동)',     lat:37.4772, lng:127.1430 },
  { slug:'cx-gwanggyo-84', name:'광교중흥S클래스',            at:'84',  tpl:'std-84c', sido:'경기', gugun:'수원시 영통구', addr:'광교중앙로 (원천동)',     lat:37.2857, lng:127.0589 },
  { slug:'cx-dongtan-84',  name:'동탄역시범한화꿈에그린',     at:'84',  tpl:'std-84b', sido:'경기', gugun:'화성시',  addr:'동탄순환대로 (청계동)',        lat:37.2038, lng:127.1005 },
  { slug:'cx-kintex-84',   name:'킨텍스원시티',               at:'84',  tpl:'std-84c', sido:'경기', gugun:'고양시 일산서구', addr:'킨텍스로 (대화동)',     lat:37.6660, lng:126.7449 },
  { slug:'cx-foresia-84',  name:'산성역포레스티아',           at:'84',  tpl:'std-84a', sido:'경기', gugun:'성남시 수정구', addr:'산성대로 (신흥동)',       lat:37.4553, lng:127.1521 },
  { slug:'cx-parkview-84', name:'분당파크뷰',                 at:'84',  tpl:'std-84b', sido:'경기', gugun:'성남시 분당구', addr:'백현로 (정자동)',         lat:37.3653, lng:127.1094 },
  // ── 인천 ──
  { slug:'cx-songdo-84',   name:'송도더샵퍼스트파크',         at:'84',  tpl:'std-84c', sido:'인천', gugun:'연수구',  addr:'송도과학로 (송도동)',          lat:37.3925, lng:126.6588 },
  // ── 2차: 전국 광역시·주요 도시 (2026-08-26 대표 지시: 전국 확장) ──
  { slug:'cx-samik-84',    name:'삼익비치',                   at:'84',  tpl:'std-99',  sido:'부산', gugun:'수영구',  addr:'광남로 (남천동)',              lat:35.1367, lng:129.1106 },
  { slug:'cx-zenith-84',   name:'해운대두산위브더제니스',     at:'84',  tpl:'std-84c', sido:'부산', gugun:'해운대구', addr:'마린시티2로 (우동)',          lat:35.1565, lng:129.1450 },
  { slug:'cx-jangjeon-84', name:'래미안장전',                 at:'84',  tpl:'std-84a', sido:'부산', gugun:'금정구',  addr:'금정로 (장전동)',              lat:35.2305, lng:129.0850 },
  { slug:'cx-beomeo-84',   name:'범어SK뷰',                   at:'84',  tpl:'std-84b', sido:'대구', gugun:'수성구',  addr:'동대구로 (범어동)',            lat:35.8590, lng:128.6250 },
  { slug:'cx-suseong-84',  name:'수성롯데캐슬더퍼스트',       at:'84',  tpl:'std-84a', sido:'대구', gugun:'수성구',  addr:'수성로 (수성동)',              lat:35.8410, lng:128.6180 },
  { slug:'cx-crova-84',    name:'크로바아파트',               at:'84',  tpl:'std-99',  sido:'대전', gugun:'서구',    addr:'둔산로 (둔산동)',              lat:36.3510, lng:127.3780 },
  { slug:'cx-jukdong-84',  name:'죽동푸르지오',               at:'84',  tpl:'std-84a', sido:'대전', gugun:'유성구',  addr:'죽동로 (죽동)',                lat:36.3760, lng:127.3310 },
  { slug:'cx-bongseon-84', name:'봉선동포스코더샵',           at:'84',  tpl:'std-84a', sido:'광주', gugun:'남구',    addr:'봉선로 (봉선동)',              lat:35.1210, lng:126.9120 },
  { slug:'cx-munsu-84',    name:'문수로2차아이파크',          at:'84',  tpl:'std-84b', sido:'울산', gugun:'남구',    addr:'문수로 (신정동)',              lat:35.5300, lng:129.3070 },
  { slug:'cx-saerom-84',   name:'새롬동캐슬앤파밀리에',       at:'84',  tpl:'std-84b', sido:'세종', gugun:'세종시',  addr:'새롬중앙로 (새롬동)',          lat:36.4770, lng:127.2540 },
  { slug:'cx-buldang-84',  name:'불당지웰더샵',               at:'84',  tpl:'std-84c', sido:'충남', gugun:'천안시 서북구', addr:'불당25로 (불당동)',       lat:36.8000, lng:127.1050 },
  { slug:'cx-jiwell-84',   name:'복대지웰시티',               at:'84',  tpl:'std-84c', sido:'충북', gugun:'청주시 흥덕구', addr:'대농로 (복대동)',         lat:36.6280, lng:127.4260 },
  { slug:'cx-ecocity-84',  name:'에코시티더샵',               at:'84',  tpl:'std-84a', sido:'전북', gugun:'전주시 덕진구', addr:'세병로 (송천동)',         lat:35.8680, lng:127.1120 },
  { slug:'cx-yongji-84',   name:'용지더샵레이크파크',         at:'84',  tpl:'std-84b', sido:'경남', gugun:'창원시 성산구', addr:'중앙대로 (용지동)',       lat:35.2280, lng:128.6820 },
  { slug:'cx-nohyeong-84', name:'노형2차아이파크',            at:'84',  tpl:'std-84a', sido:'제주', gugun:'제주시',  addr:'노형로 (노형동)',              lat:33.4860, lng:126.4800 },
  // ── 3차: 수도권 확충 + 전국 보강 (2026-08-26 대표 지시: 완성) ──
  { slug:'cx-daechi-rp-84', name:'래미안대치팰리스',          at:'84',  tpl:'std-84c', sido:'서울', gugun:'강남구',  addr:'대치동',                       lat:37.4991, lng:127.0570 },
  { slug:'cx-dogok-84',    name:'도곡렉슬',                   at:'84',  tpl:'std-84a', sido:'서울', gugun:'강남구',  addr:'도곡동',                       lat:37.4910, lng:127.0480 },
  { slug:'cx-firstige-84', name:'래미안퍼스티지',             at:'84',  tpl:'std-84b', sido:'서울', gugun:'서초구',  addr:'반포동',                       lat:37.5090, lng:127.0080 },
  { slug:'cx-trizium-84',  name:'잠실트리지움',               at:'84',  tpl:'std-84a', sido:'서울', gugun:'송파구',  addr:'잠실동',                       lat:37.5100, lng:127.0830 },
  { slug:'cx-lakepal-84',  name:'레이크팰리스',               at:'84',  tpl:'std-84b', sido:'서울', gugun:'송파구',  addr:'잠실동',                       lat:37.5080, lng:127.0960 },
  { slug:'cx-tenzhill-84', name:'왕십리텐즈힐',               at:'84',  tpl:'std-84a', sido:'서울', gugun:'성동구',  addr:'하왕십리동',                   lat:37.5640, lng:127.0290 },
  { slug:'cx-magok7-84',   name:'마곡엠밸리7단지',            at:'84',  tpl:'std-84a', sido:'서울', gugun:'강서구',  addr:'마곡동',                       lat:37.5670, lng:126.8270 },
  { slug:'cx-estium-84',   name:'신길래미안에스티움',         at:'84',  tpl:'std-84a', sido:'서울', gugun:'영등포구', addr:'신길동',                      lat:37.5080, lng:126.9130 },
  { slug:'cx-riverheim-84',name:'아크로리버하임',             at:'84',  tpl:'std-84c', sido:'서울', gugun:'동작구',  addr:'흑석동',                       lat:37.5070, lng:126.9630 },
  { slug:'cx-hangaram-84', name:'이촌한가람',                 at:'84',  tpl:'std-99',  sido:'서울', gugun:'용산구',  addr:'이촌동',                       lat:37.5210, lng:126.9720 },
  { slug:'cx-sanggye7-66', name:'상계주공7단지',              at:'66',  tpl:'std-66',  sido:'서울', gugun:'노원구',  addr:'상계동',                       lat:37.6560, lng:127.0630 },
  { slug:'cx-gileum-84',   name:'길음뉴타운래미안',           at:'84',  tpl:'std-84a', sido:'서울', gugun:'성북구',  addr:'길음동',                       lat:37.6030, lng:127.0250 },
  { slug:'cx-dmc-xi-84',   name:'DMC파크뷰자이',              at:'84',  tpl:'std-84b', sido:'서울', gugun:'은평구',  addr:'수색동',                       lat:37.5800, lng:126.8950 },
  { slug:'cx-pangyo-84',   name:'판교원마을푸르지오',         at:'84',  tpl:'std-84a', sido:'경기', gugun:'성남시 분당구', addr:'판교동',                 lat:37.3880, lng:127.0850 },
  { slug:'cx-gmxi-84',     name:'광명역파크자이',             at:'84',  tpl:'std-84c', sido:'경기', gugun:'광명시',  addr:'일직동',                       lat:37.4160, lng:126.8840 },
  { slug:'cx-dasan-84',    name:'다산자연앤e편한세상',        at:'84',  tpl:'std-84a', sido:'경기', gugun:'남양주시', addr:'다산동',                      lat:37.6180, lng:127.1550 },
  { slug:'cx-byeollae-84', name:'별내아이파크',               at:'84',  tpl:'std-84b', sido:'경기', gugun:'남양주시', addr:'별내동',                      lat:37.6440, lng:127.1130 },
  { slug:'cx-baegot-84',   name:'배곧한라비발디',             at:'84',  tpl:'std-84a', sido:'경기', gugun:'시흥시',  addr:'배곧동',                       lat:37.3680, lng:126.7260 },
  { slug:'cx-pyeongchon-84',name:'평촌더샵센트럴시티',        at:'84',  tpl:'std-84b', sido:'경기', gugun:'안양시 동안구', addr:'호계동',                 lat:37.3890, lng:126.9560 },
  { slug:'cx-sanbon-84',   name:'산본래미안하이어스',         at:'84',  tpl:'std-84a', sido:'경기', gugun:'군포시',  addr:'산본동',                       lat:37.3620, lng:126.9300 },
  { slug:'cx-suwon-sk-84', name:'수원SK스카이뷰',             at:'84',  tpl:'std-84b', sido:'경기', gugun:'수원시 장안구', addr:'정자동',                 lat:37.3060, lng:126.9970 },
  { slug:'cx-wisity-84',   name:'일산위시티자이',             at:'84',  tpl:'std-84b', sido:'경기', gugun:'고양시 일산동구', addr:'식사동',               lat:37.6790, lng:126.7950 },
  { slug:'cx-gimpo-59',    name:'김포한강반도유보라',         at:'59',  tpl:'std-59a', sido:'경기', gugun:'김포시',  addr:'장기동',                       lat:37.6440, lng:126.6700 },
  { slug:'cx-wirye-jp-84', name:'위례중앙푸르지오',           at:'84',  tpl:'std-84b', sido:'경기', gugun:'하남시',  addr:'학암동',                       lat:37.4840, lng:127.1490 },
  { slug:'cx-misa-xi-84',  name:'미사강변센트럴자이',         at:'84',  tpl:'std-84a', sido:'경기', gugun:'하남시',  addr:'망월동',                       lat:37.5630, lng:127.1890 },
  { slug:'cx-dongtan2-84', name:'동탄역더샵센트럴시티',       at:'84',  tpl:'std-84c', sido:'경기', gugun:'화성시',  addr:'오산동',                       lat:37.2000, lng:127.0930 },
  { slug:'cx-cheongna-84', name:'청라제일풍경채',             at:'84',  tpl:'std-84b', sido:'인천', gugun:'서구',    addr:'청라동',                       lat:37.5340, lng:126.6520 },
  { slug:'cx-bupyeong-84', name:'부평래미안',                 at:'84',  tpl:'std-84a', sido:'인천', gugun:'부평구',  addr:'부평동',                       lat:37.5070, lng:126.7220 },
  { slug:'cx-hwamyeong-84',name:'화명롯데캐슬카이저',         at:'84',  tpl:'std-84b', sido:'부산', gugun:'북구',    addr:'화명동',                       lat:35.2340, lng:129.0120 },
  { slug:'cx-gwangan-84',  name:'광안쌍용예가디오션',         at:'84',  tpl:'std-84c', sido:'부산', gugun:'수영구',  addr:'광안동',                       lat:35.1560, lng:129.1130 },
  { slug:'cx-wolbae-84',   name:'월배아이파크',               at:'84',  tpl:'std-84a', sido:'대구', gugun:'달서구',  addr:'진천동',                       lat:35.8180, lng:128.5230 },
  { slug:'cx-trifull-84',  name:'트리풀시티',                 at:'84',  tpl:'std-84b', sido:'대전', gugun:'유성구',  addr:'상대동',                       lat:36.3480, lng:127.3410 },
  { slug:'cx-suwan-84',    name:'수완진아리채',               at:'84',  tpl:'std-84a', sido:'광주', gugun:'광산구',  addr:'수완동',                       lat:35.1910, lng:126.8250 },
  { slug:'cx-songjeong-84',name:'송정금강펜테리움',           at:'84',  tpl:'std-84a', sido:'울산', gugun:'북구',    addr:'송정동',                       lat:35.5980, lng:129.3560 },
  { slug:'cx-doram-84',    name:'도램마을10단지',             at:'84',  tpl:'std-84a', sido:'세종', gugun:'세종시',  addr:'도담동',                       lat:36.5100, lng:127.2620 },
  { slug:'cx-onui-84',     name:'온의롯데캐슬스카이클래스',   at:'84',  tpl:'std-84c', sido:'강원', gugun:'춘천시',  addr:'온의동',                       lat:37.8680, lng:127.7200 },
  { slug:'cx-pohang-84',   name:'포항자이',                   at:'84',  tpl:'std-84a', sido:'경북', gugun:'포항시 북구', addr:'장성동',                   lat:36.0730, lng:129.3820 },
];

const tplCache = {};
const loadTpl = t => tplCache[t] || (tplCache[t] = specFromPlanJSON(JSON.parse(readFileSync(`${DATA}/${t}.json`, 'utf8'))));

let made = 0;
const seed = [];
for (const c of COMPLEXES) {
  const tpl = loadTpl(c.tpl);
  const title = `${c.name} ${c.at} (개략 재작도)`;
  const err = validateTiling(tpl);
  if (err) { console.error(`❌ ${c.slug}: 템플릿 ${c.tpl} ${err}`); continue; }
  const svg = renderPlanSVG({
    title,
    sub: `전용 ${tpl.area}㎡급 · 방 ${tpl.bedrooms} · 욕실 ${tpl.baths} — 실단지 개략 재작도 (실측 아님·참고용)`,
    W: tpl.W, H: tpl.H, rooms: tpl.rooms, balcony: tpl.balcony,
  });
  writeFileSync(`${IMG}/${c.slug}.svg`, svg);
  seed.push({
    slug: c.slug, complex_name: c.name, area_type: c.at,
    region_sido: c.sido, region_gugun: c.gugun, address: c.addr,
    exclusive_area_m2: tpl.area, rooms: tpl.bedrooms, baths: tpl.baths,
    lat: c.lat, lng: c.lng, image_path: `/catalog/plans/img/${c.slug}.svg`,
  });
  made++;
  console.log(`✅ ${c.slug}: ${title} — ${c.sido} ${c.gugun} · 템플릿 ${c.tpl}`);
}
writeFileSync('scripts/plans-complexes-spec.json', JSON.stringify(seed, null, 1));
console.log(`\n${made}/${COMPLEXES.length} 생성 완료 (시드: scripts/plans-complexes-spec.json)`);
