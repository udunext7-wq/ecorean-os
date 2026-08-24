'use strict';
// ===== v5.5: 통합 라이브러리 — 평면도용 정교한 도형 (shape 필드로 볼륨감) =====
// shape 좌표계: 객체 중심 (0,0), 가로축 = +X, 세로축 = +Y. 단위 mm.
// shape 명령: rect/circle/line/arc/path. fill·stroke·strokeWidth로 볼륨감.
// v5.9: nameEn 필드 추가 — AI 파싱(T2I/T2V 프롬프트, JSON SSoT, BOC 카탈로그) 정확도 향상

const FURNITURE_LIB={
  // ===== 거실 =====
  sofa3:{name:'소파(3인)',nameEn:'3-seater sofa',w:2200,h:900,c:'#8B7239',shape:[
    {type:'rect',x:-1100,y:-450,w:2200,h:900,fill:'#8B7239',stroke:'#3E2A14',sw:30,r:80},
    {type:'rect',x:-1050,y:-200,w:2100,h:600,fill:'#A88248',stroke:'#5D4225',sw:15,r:50},
    {type:'line',x1:-367,y1:-200,x2:-367,y2:400,stroke:'#5D4225',sw:8},
    {type:'line',x1:367,y1:-200,x2:367,y2:400,stroke:'#5D4225',sw:8},
  ]},
  sofa2:{name:'소파(2인)',nameEn:'2-seater sofa (loveseat)',w:1500,h:900,c:'#8B7239',shape:[
    {type:'rect',x:-750,y:-450,w:1500,h:900,fill:'#8B7239',stroke:'#3E2A14',sw:30,r:80},
    {type:'rect',x:-700,y:-200,w:1400,h:600,fill:'#A88248',stroke:'#5D4225',sw:15,r:50},
    {type:'line',x1:0,y1:-200,x2:0,y2:400,stroke:'#5D4225',sw:8},
  ]},
  sofa1:{name:'1인 의자',nameEn:'armchair',w:800,h:900,c:'#8B7239',shape:[
    {type:'rect',x:-400,y:-450,w:800,h:900,fill:'#8B7239',stroke:'#3E2A14',sw:25,r:60},
    {type:'rect',x:-350,y:-200,w:700,h:600,fill:'#A88248',stroke:'#5D4225',sw:12,r:40},
  ]},
  coffee:{name:'거실 테이블',nameEn:'coffee table',w:1200,h:600,c:'#5D4037',shape:[
    {type:'rect',x:-600,y:-300,w:1200,h:600,fill:'#5D4037',stroke:'#2A1505',sw:18,r:30},
    {type:'rect',x:-580,y:-280,w:1160,h:560,fill:'transparent',stroke:'#8B6336',sw:3,r:25},
  ]},
  tv_stand:{name:'TV장',nameEn:'TV stand',w:1800,h:400,c:'#3E3E3E',shape:[
    {type:'rect',x:-900,y:-200,w:1800,h:400,fill:'#2A2A2A',stroke:'#5A5A5A',sw:15,r:8},
    {type:'rect',x:-880,y:-180,w:1760,h:80,fill:'#1A1A1A',stroke:'#0A0A0A',sw:2},
    {type:'line',x1:-300,y1:-100,x2:-300,y2:200,stroke:'#5A5A5A',sw:4},
    {type:'line',x1:300,y1:-100,x2:300,y2:200,stroke:'#5A5A5A',sw:4},
  ]},
  bookshelf:{name:'책장',nameEn:'bookshelf',w:1600,h:350,c:'#5D4037',shape:[
    {type:'rect',x:-800,y:-175,w:1600,h:350,fill:'#5D4037',stroke:'#2A1505',sw:15,r:5},
    {type:'line',x1:-800,y1:-50,x2:800,y2:-50,stroke:'#2A1505',sw:5},
    {type:'line',x1:-800,y1:80,x2:800,y2:80,stroke:'#2A1505',sw:5},
    {type:'line',x1:-400,y1:-175,x2:-400,y2:175,stroke:'#2A1505',sw:5},
    {type:'line',x1:0,y1:-175,x2:0,y2:175,stroke:'#2A1505',sw:5},
    {type:'line',x1:400,y1:-175,x2:400,y2:175,stroke:'#2A1505',sw:5},
  ]},
  piano:{name:'피아노 (업라이트)',nameEn:'upright piano',w:1500,h:600,c:'#1A1A1A',shape:[
    {type:'rect',x:-750,y:-300,w:1500,h:600,fill:'#1A1A1A',stroke:'#000',sw:18,r:8},
    {type:'rect',x:-700,y:120,w:1400,h:160,fill:'#F5F1EB',stroke:'#5A5A5A',sw:3},
    {type:'rect',x:-700,y:120,w:1400,h:30,fill:'#0A0A0A',stroke:'#000',sw:1},
  ]},
  rug:{name:'러그',nameEn:'area rug',w:2400,h:1800,c:'#A88248',shape:[
    {type:'rect',x:-1200,y:-900,w:2400,h:1800,fill:'#A88248',stroke:'#5D4225',sw:8,r:30},
    {type:'rect',x:-1150,y:-850,w:2300,h:1700,fill:'transparent',stroke:'#5D4225',sw:5,dash:[20,15]},
  ]},
  plant:{name:'화분',nameEn:'potted plant',w:500,h:500,c:'#7BA05B',shape:[
    {type:'circle',cx:0,cy:0,r:250,fill:'#5D4037',stroke:'#2A1505',sw:8},
    {type:'circle',cx:0,cy:0,r:200,fill:'#7BA05B',stroke:'#3D6034',sw:4},
    {type:'circle',cx:-80,cy:-50,r:60,fill:'#94B07A',stroke:'#3D6034',sw:2},
    {type:'circle',cx:60,cy:30,r:50,fill:'#94B07A',stroke:'#3D6034',sw:2},
    {type:'circle',cx:0,cy:80,r:55,fill:'#94B07A',stroke:'#3D6034',sw:2},
  ]},
  // ===== 침실 =====
  bed_d:{name:'더블 침대',nameEn:'double bed',w:1500,h:2000,c:'#5D4037',shape:[
    {type:'rect',x:-750,y:-1000,w:1500,h:2000,fill:'#F5F1EB',stroke:'#3E2A14',sw:30,r:30},
    {type:'rect',x:-750,y:-1000,w:1500,h:300,fill:'#5D4037',stroke:'#3E2A14',sw:20,r:15},
    {type:'rect',x:-650,y:-900,w:600,h:200,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
    {type:'rect',x:50,y:-900,w:600,h:200,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
    {type:'line',x1:-750,y1:300,x2:750,y2:300,stroke:'#A88248',sw:4,dash:[15,8]},
  ]},
  bed_s:{name:'싱글 침대',nameEn:'single bed',w:1000,h:2000,c:'#5D4037',shape:[
    {type:'rect',x:-500,y:-1000,w:1000,h:2000,fill:'#F5F1EB',stroke:'#3E2A14',sw:25,r:25},
    {type:'rect',x:-500,y:-1000,w:1000,h:300,fill:'#5D4037',stroke:'#3E2A14',sw:18,r:15},
    {type:'rect',x:-400,y:-900,w:800,h:200,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
  ]},
  bed_k:{name:'킹 침대',nameEn:'king bed',w:1800,h:2000,c:'#5D4037',shape:[
    {type:'rect',x:-900,y:-1000,w:1800,h:2000,fill:'#F5F1EB',stroke:'#3E2A14',sw:30,r:30},
    {type:'rect',x:-900,y:-1000,w:1800,h:300,fill:'#5D4037',stroke:'#3E2A14',sw:20,r:15},
    {type:'rect',x:-820,y:-900,w:700,h:220,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
    {type:'rect',x:120,y:-900,w:700,h:220,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
    {type:'line',x1:-900,y1:300,x2:900,y2:300,stroke:'#A88248',sw:4,dash:[15,8]},
  ]},
  nightstand:{name:'협탁',nameEn:'nightstand',w:500,h:400,c:'#5D4037',shape:[
    {type:'rect',x:-250,y:-200,w:500,h:400,fill:'#5D4037',stroke:'#2A1505',sw:15,r:8},
    {type:'rect',x:-220,y:-100,w:440,h:80,fill:'transparent',stroke:'#A88248',sw:3,r:5},
    {type:'circle',cx:0,cy:-60,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
  ]},
  wardrobe:{name:'옷장',nameEn:'wardrobe',w:2000,h:600,c:'#5D4037',shape:[
    {type:'rect',x:-1000,y:-300,w:2000,h:600,fill:'#5D4037',stroke:'#2A1505',sw:20,r:5},
    {type:'line',x1:-500,y1:-300,x2:-500,y2:300,stroke:'#2A1505',sw:5},
    {type:'line',x1:0,y1:-300,x2:0,y2:300,stroke:'#2A1505',sw:5},
    {type:'line',x1:500,y1:-300,x2:500,y2:300,stroke:'#2A1505',sw:5},
    {type:'circle',cx:-750,cy:0,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
    {type:'circle',cx:-250,cy:0,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
    {type:'circle',cx:250,cy:0,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
    {type:'circle',cx:750,cy:0,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
  ]},
  dressing_table:{name:'화장대',nameEn:'dressing table (vanity)',w:1200,h:500,c:'#5D4037',shape:[
    {type:'rect',x:-600,y:-250,w:1200,h:500,fill:'#5D4037',stroke:'#2A1505',sw:18,r:5},
    {type:'rect',x:-550,y:-220,w:1100,h:200,fill:'#A88248',stroke:'#5D4037',sw:5,r:5},
    {type:'circle',cx:-300,cy:100,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
    {type:'circle',cx:300,cy:100,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
  ]},
  mirror:{name:'전신거울',nameEn:'full-length mirror',w:600,h:150,c:'#A0C8E0',shape:[
    {type:'rect',x:-300,y:-75,w:600,h:150,fill:'#A0C8E0',stroke:'#5D4037',sw:18,r:8},
    {type:'rect',x:-280,y:-55,w:560,h:110,fill:'#D4ECF5',stroke:'#A0C8E0',sw:3,r:4},
  ]},
  // ===== 서재 =====
  desk:{name:'책상',nameEn:'desk',w:1400,h:700,c:'#5D4037',shape:[
    {type:'rect',x:-700,y:-350,w:1400,h:700,fill:'#5D4037',stroke:'#2A1505',sw:18,r:8},
    {type:'rect',x:-680,y:-330,w:1360,h:200,fill:'transparent',stroke:'#A88248',sw:3,r:5},
  ]},
  desk_l:{name:'L자 책상',nameEn:'L-shaped desk',w:1800,h:1500,c:'#5D4037',shape:[
    {type:'rect',x:-900,y:-750,w:1800,h:600,fill:'#5D4037',stroke:'#2A1505',sw:18,r:8},
    {type:'rect',x:-900,y:-150,w:600,h:900,fill:'#5D4037',stroke:'#2A1505',sw:18,r:8},
  ]},
  office_chair:{name:'사무 의자',nameEn:'office chair',w:600,h:600,c:'#3E3E3E',shape:[
    {type:'circle',cx:0,cy:0,r:280,fill:'#3E3E3E',stroke:'#1A1A1A',sw:15},
    {type:'circle',cx:0,cy:0,r:230,fill:'#5A5A5A',stroke:'#3E3E3E',sw:5},
    {type:'rect',x:-180,y:-300,w:360,h:80,fill:'#5A5A5A',stroke:'#1A1A1A',sw:8,r:15},
  ]},
  // ===== 식당 =====
  dining4:{name:'식탁(4인)',nameEn:'4-person dining table',w:1400,h:900,c:'#5D4037',shape:[
    {type:'rect',x:-700,y:-450,w:1400,h:900,fill:'#5D4037',stroke:'#2A1505',sw:25,r:15},
    {type:'rect',x:-680,y:-430,w:1360,h:860,fill:'transparent',stroke:'#A88248',sw:3,r:12},
  ]},
  dining6:{name:'식탁(6인)',nameEn:'6-person dining table',w:1800,h:900,c:'#5D4037',shape:[
    {type:'rect',x:-900,y:-450,w:1800,h:900,fill:'#5D4037',stroke:'#2A1505',sw:25,r:15},
    {type:'rect',x:-880,y:-430,w:1760,h:860,fill:'transparent',stroke:'#A88248',sw:3,r:12},
  ]},
  dining_round:{name:'원형 식탁',nameEn:'round dining table',w:1300,h:1300,c:'#5D4037',shape:[
    {type:'circle',cx:0,cy:0,r:650,fill:'#5D4037',stroke:'#2A1505',sw:25},
    {type:'circle',cx:0,cy:0,r:625,fill:'transparent',stroke:'#A88248',sw:3},
  ]},
  chair:{name:'의자',nameEn:'dining chair',w:450,h:450,c:'#5D4037',shape:[
    {type:'rect',x:-225,y:-225,w:450,h:450,fill:'#5D4037',stroke:'#2A1505',sw:15,r:8},
    {type:'rect',x:-225,y:-225,w:450,h:80,fill:'#3E2A14',stroke:'#1A1A1A',sw:5,r:5},
  ]},
  bar_stool:{name:'바 스툴',nameEn:'bar stool',w:450,h:450,c:'#5D4037',shape:[
    {type:'circle',cx:0,cy:0,r:200,fill:'#5D4037',stroke:'#2A1505',sw:15},
    {type:'circle',cx:0,cy:0,r:160,fill:'transparent',stroke:'#A88248',sw:3},
  ]},
  // ===== 기타 =====
  treadmill:{name:'러닝머신',nameEn:'treadmill',w:900,h:1900,c:'#3E3E3E',shape:[
    {type:'rect',x:-450,y:-950,w:900,h:1900,fill:'#3E3E3E',stroke:'#1A1A1A',sw:18,r:30},
    {type:'rect',x:-380,y:-300,w:760,h:1100,fill:'#1A1A1A',stroke:'#000',sw:3,r:8},
    {type:'rect',x:-380,y:-870,w:760,h:200,fill:'#5A5A5A',stroke:'#1A1A1A',sw:5,r:8},
  ]},
  // ===== 2026-08-24: 트렌드 가구 13종 (대표 지시) =====
  island:{name:'아일랜드 식탁',nameEn:'kitchen island',w:2400,h:900,c:'#9A8C78',shape:[
    {type:'rect',x:-1200,y:-450,w:2400,h:900,fill:'#8A8073',stroke:'#3E362C',sw:25,r:40},
    {type:'rect',x:-1160,y:-410,w:2320,h:820,fill:'#A99C89',stroke:'#6B6152',sw:8,r:30},
    {type:'line',x1:-1160,y1:180,x2:1160,y2:180,stroke:'#6B6152',sw:6,dash:[60,45]},
    {type:'circle',cx:-650,cy:-90,r:120,fill:'transparent',stroke:'#3E362C',sw:10},
    {type:'circle',cx:-330,cy:-90,r:120,fill:'transparent',stroke:'#3E362C',sw:10},
    {type:'rect',x:340,y:-260,w:640,h:400,fill:'#C9C2B4',stroke:'#6B6152',sw:10,r:26},
    {type:'circle',cx:660,cy:-330,r:28,fill:'#5A5A5A',stroke:'#1A1A1A',sw:4},
  ]},
  sofa_modular:{name:'모듈러 소파 (L형)',nameEn:'modular L sofa',w:3200,h:2400,c:'#8B7239',shape:[
    {type:'rect',x:-1600,y:-1200,w:3200,h:1000,fill:'#8B7239',stroke:'#3E2A14',sw:28,r:90},
    {type:'rect',x:600,y:-1200,w:1000,h:2400,fill:'#8B7239',stroke:'#3E2A14',sw:28,r:90},
    {type:'rect',x:-1550,y:-950,w:2100,h:700,fill:'#A88248',stroke:'#5D4225',sw:12,r:60},
    {type:'rect',x:660,y:-950,w:880,h:2080,fill:'#A88248',stroke:'#5D4225',sw:12,r:60},
    {type:'line',x1:-850,y1:-950,x2:-850,y2:-250,stroke:'#5D4225',sw:8},
    {type:'line',x1:-150,y1:-950,x2:-150,y2:-250,stroke:'#5D4225',sw:8},
    {type:'line',x1:660,y1:130,x2:1540,y2:130,stroke:'#5D4225',sw:8},
    {type:'rect',x:-1450,y:-1150,w:600,h:180,fill:'#6B5B3E',stroke:'#3E2A14',sw:6,r:60},
  ]},
  sofa_curved:{name:'커브드 소파',nameEn:'curved sofa',w:2600,h:1100,c:'#7A6A55',shape:[
    {type:'rect',x:-1300,y:-550,w:2600,h:1100,fill:'#7A6A55',stroke:'#3B332A',sw:26,r:480},
    {type:'rect',x:-1180,y:-430,w:2360,h:860,fill:'#8F7E66',stroke:'#5C5040',sw:10,r:400},
    {type:'arc',cx:0,cy:-2050,r:2600,start:62,end:118,stroke:'#5C5040',sw:10},
    {type:'line',x1:-440,y1:-380,x2:-500,y2:410,stroke:'#5C5040',sw:8},
    {type:'line',x1:440,y1:-380,x2:500,y2:410,stroke:'#5C5040',sw:8},
  ]},
  lounge_chair:{name:'라운지체어+오토만',nameEn:'lounge chair',w:900,h:1650,c:'#6B5B3E',shape:[
    {type:'rect',x:-450,y:-825,w:900,h:950,fill:'#6B5B3E',stroke:'#3E2A14',sw:22,r:140},
    {type:'rect',x:-360,y:-735,w:720,h:770,fill:'#8A7A55',stroke:'#5D4225',sw:10,r:110},
    {type:'line',x1:-360,y1:-430,x2:360,y2:-430,stroke:'#5D4225',sw:8},
    {type:'rect',x:-330,y:275,w:660,h:520,fill:'#6B5B3E',stroke:'#3E2A14',sw:18,r:120},
    {type:'rect',x:-260,y:345,w:520,h:380,fill:'#8A7A55',stroke:'#5D4225',sw:8,r:90},
  ]},
  side_table:{name:'사이드 테이블',nameEn:'side table',w:500,h:500,c:'#A88248',shape:[
    {type:'circle',cx:0,cy:0,r:250,fill:'#A88248',stroke:'#3E2A14',sw:16},
    {type:'circle',cx:0,cy:0,r:200,fill:'#C9A961',stroke:'#8B7239',sw:6},
    {type:'circle',cx:0,cy:0,r:26,fill:'#5D4225',stroke:'#3E2A14',sw:3},
  ]},
  console:{name:'콘솔 테이블',nameEn:'console table',w:1200,h:400,c:'#8B7239',shape:[
    {type:'rect',x:-600,y:-200,w:1200,h:400,fill:'#8B7239',stroke:'#3E2A14',sw:18,r:36},
    {type:'rect',x:-560,y:-160,w:1120,h:320,fill:'#A88248',stroke:'#5D4225',sw:6,r:26},
    {type:'circle',cx:-380,cy:0,r:80,fill:'#6B705C',stroke:'#3B4032',sw:8},
    {type:'rect',x:120,y:-90,w:340,h:180,fill:'#C9A961',stroke:'#8B7239',sw:6,r:16},
  ]},
  home_bar:{name:'홈바',nameEn:'home bar counter',w:1800,h:600,c:'#3E3E3E',shape:[
    {type:'rect',x:-900,y:-300,w:1800,h:600,fill:'#3E3E3E',stroke:'#141414',sw:22,r:40},
    {type:'rect',x:-860,y:-260,w:1720,h:520,fill:'#5A5A5A',stroke:'#2A2A2A',sw:8,r:30},
    {type:'circle',cx:-620,cy:-60,r:60,fill:'transparent',stroke:'#C9A961',sw:8},
    {type:'circle',cx:-450,cy:-60,r:60,fill:'transparent',stroke:'#C9A961',sw:8},
    {type:'circle',cx:180,cy:-80,r:36,fill:'#C9A961',stroke:'#8B7239',sw:4},
    {type:'circle',cx:320,cy:-80,r:36,fill:'#C9A961',stroke:'#8B7239',sw:4},
    {type:'circle',cx:460,cy:-80,r:36,fill:'#C9A961',stroke:'#8B7239',sw:4},
    {type:'line',x1:-860,y1:120,x2:860,y2:120,stroke:'#2A2A2A',sw:6,dash:[50,40]},
  ]},
  massage_chair:{name:'안마의자',nameEn:'massage chair',w:900,h:1300,c:'#3E3E3E',shape:[
    {type:'rect',x:-450,y:-650,w:900,h:1300,fill:'#3E3E3E',stroke:'#141414',sw:22,r:180},
    {type:'rect',x:-300,y:-520,w:600,h:1040,fill:'#5A5A5A',stroke:'#2A2A2A',sw:10,r:130},
    {type:'circle',cx:0,cy:-360,r:130,fill:'#6E6E6E',stroke:'#2A2A2A',sw:8},
    {type:'rect',x:-440,y:-260,w:130,h:760,fill:'#2E2E2E',stroke:'#141414',sw:8,r:60},
    {type:'rect',x:310,y:-260,w:130,h:760,fill:'#2E2E2E',stroke:'#141414',sw:8,r:60},
    {type:'line',x1:-300,y1:120,x2:300,y2:120,stroke:'#2A2A2A',sw:8},
  ]},
  styler:{name:'의류관리기',nameEn:'clothing care unit',w:600,h:600,c:'#5A5A5A',shape:[
    {type:'rect',x:-300,y:-300,w:600,h:600,fill:'#5A5A5A',stroke:'#1A1A1A',sw:18,r:24},
    {type:'rect',x:-260,y:-260,w:520,h:520,fill:'#6E6E6E',stroke:'#2A2A2A',sw:6,r:16},
    {type:'line',x1:-260,y1:-160,x2:260,y2:-160,stroke:'#2A2A2A',sw:5},
    {type:'rect',x:180,y:-80,w:50,h:220,fill:'#C9A961',stroke:'#8B7239',sw:4,r:20},
  ]},
  desk_motion:{name:'모션데스크',nameEn:'standing desk',w:1400,h:700,c:'#8B7239',shape:[
    {type:'rect',x:-700,y:-350,w:1400,h:700,fill:'#A88248',stroke:'#3E2A14',sw:18,r:50},
    {type:'rect',x:-660,y:-310,w:1320,h:620,fill:'#C9A961',stroke:'#8B7239',sw:6,r:40},
    {type:'rect',x:-300,y:-300,w:600,h:110,fill:'#3E3E3E',stroke:'#141414',sw:6,r:16},
    {type:'rect',x:-260,y:40,w:520,h:170,fill:'#8B7239',stroke:'#5D4225',sw:5,r:16},
    {type:'rect',x:-690,y:-140,w:90,h:280,fill:'#5A5A5A',stroke:'#2A2A2A',sw:6,r:24},
    {type:'rect',x:600,y:-140,w:90,h:280,fill:'#5A5A5A',stroke:'#2A2A2A',sw:6,r:24},
  ]},
  beanbag:{name:'빈백',nameEn:'beanbag',w:900,h:900,c:'#6B705C',shape:[
    {type:'circle',cx:0,cy:20,r:440,fill:'#6B705C',stroke:'#3B4032',sw:20},
    {type:'circle',cx:0,cy:-60,r:330,fill:'#7E8470',stroke:'#565C4A',sw:8},
    {type:'arc',cx:0,cy:-60,r:220,start:200,end:340,stroke:'#565C4A',sw:8},
  ]},
  cat_tower:{name:'캣타워',nameEn:'cat tower',w:600,h:600,c:'#9A8C78',shape:[
    {type:'circle',cx:0,cy:0,r:300,fill:'#9A8C78',stroke:'#5C5040',sw:16},
    {type:'circle',cx:-90,cy:-70,r:170,fill:'#B5A68F',stroke:'#6B6152',sw:8},
    {type:'circle',cx:130,cy:110,r:120,fill:'#B5A68F',stroke:'#6B6152',sw:8},
    {type:'circle',cx:-90,cy:-70,r:42,fill:'#5C5040',stroke:'#3B332A',sw:5},
  ]},
  system_hanger:{name:'시스템 행거',nameEn:'system hanger',w:2000,h:500,c:'#5A5A5A',shape:[
    {type:'rect',x:-1000,y:-250,w:2000,h:500,fill:'transparent',stroke:'#5A5A5A',sw:14,r:20},
    {type:'line',x1:-960,y1:-140,x2:960,y2:-140,stroke:'#2A2A2A',sw:12},
    {type:'line',x1:-820,y1:-140,x2:-820,y2:170,stroke:'#8B7239',sw:8},
    {type:'line',x1:-620,y1:-140,x2:-620,y2:200,stroke:'#8B7239',sw:8},
    {type:'line',x1:-420,y1:-140,x2:-420,y2:150,stroke:'#8B7239',sw:8},
    {type:'line',x1:-220,y1:-140,x2:-220,y2:190,stroke:'#8B7239',sw:8},
    {type:'rect',x:80,y:-90,w:880,h:300,fill:'#9A8C78',stroke:'#5C5040',sw:8,r:16},
    {type:'line',x1:80,y1:60,x2:960,y2:60,stroke:'#5C5040',sw:5},
  ]},
};

// ===== 2026-08-24: 가구2 — 픽스(빌트인) 가구 라이브러리 (대표 지시) =====
// 견적 OS 연동: 각 모듈에 est={code,cat,unit} — JSON export 시 estModule 로 승계 (단가 없음, 헌법 준수)
// 평면 도식 관례: 밑장=실선+도어라인, 상부장=점선 외곽, 코너=대각선, 키큰장=X, 개수대/쿡탑=심볼
const FIXFURN_LIB={
  // --- 싱크대(주방) 모듈 ---
  base_600:{name:'밑장 600',nameEn:'base cabinet 600',w:600,h:600,c:'#A98F68',est:{code:'KB-600',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-300,y:-300,w:600,h:600,fill:'#A98F68',stroke:'#3E332A',sw:16,r:8},
    {type:'rect',x:-260,y:-260,w:520,h:520,fill:'#BCA27A',stroke:'#6E5D46',sw:5,r:6},
    {type:'line',x1:-260,y1:220,x2:260,y2:220,stroke:'#3E332A',sw:8},
    {type:'circle',cx:0,cy:262,r:16,fill:'#3E332A',stroke:'#1A1A1A',sw:2},
  ]},
  base_900:{name:'밑장 900',nameEn:'base cabinet 900',w:900,h:600,c:'#A98F68',est:{code:'KB-900',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-450,y:-300,w:900,h:600,fill:'#A98F68',stroke:'#3E332A',sw:16,r:8},
    {type:'rect',x:-410,y:-260,w:820,h:520,fill:'#BCA27A',stroke:'#6E5D46',sw:5,r:6},
    {type:'line',x1:0,y1:-260,x2:0,y2:260,stroke:'#6E5D46',sw:5},
    {type:'line',x1:-410,y1:220,x2:410,y2:220,stroke:'#3E332A',sw:8},
    {type:'circle',cx:-100,cy:262,r:16,fill:'#3E332A',stroke:'#1A1A1A',sw:2},
    {type:'circle',cx:100,cy:262,r:16,fill:'#3E332A',stroke:'#1A1A1A',sw:2},
  ]},
  base_sink_900:{name:'개수대 밑장 900',nameEn:'sink base 900',w:900,h:600,c:'#A98F68',est:{code:'KB-SINK-900',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-450,y:-300,w:900,h:600,fill:'#A98F68',stroke:'#3E332A',sw:16,r:8},
    {type:'rect',x:-350,y:-210,w:700,h:420,fill:'#C3C7C7',stroke:'#5F6668',sw:10,r:60},
    {type:'rect',x:-300,y:-160,w:600,h:320,fill:'#DADEDE',stroke:'#8A9194',sw:5,r:44},
    {type:'circle',cx:0,cy:-248,r:26,fill:'#8A9194',stroke:'#5F6668',sw:4},
    {type:'circle',cx:0,cy:40,r:20,fill:'#8A9194',stroke:'#5F6668',sw:3},
  ]},
  base_cook_600:{name:'쿡탑 밑장 600',nameEn:'cooktop base 600',w:600,h:600,c:'#A98F68',est:{code:'KB-COOK-600',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-300,y:-300,w:600,h:600,fill:'#A98F68',stroke:'#3E332A',sw:16,r:8},
    {type:'rect',x:-260,y:-260,w:520,h:520,fill:'#2E2E2E',stroke:'#141414',sw:8,r:14},
    {type:'circle',cx:-120,cy:-120,r:85,fill:'transparent',stroke:'#8A8A8A',sw:8},
    {type:'circle',cx:120,cy:-120,r:85,fill:'transparent',stroke:'#8A8A8A',sw:8},
    {type:'circle',cx:-120,cy:120,r:85,fill:'transparent',stroke:'#8A8A8A',sw:8},
    {type:'circle',cx:120,cy:120,r:85,fill:'transparent',stroke:'#8A8A8A',sw:8},
  ]},
  base_drawer_600:{name:'서랍 밑장 600',nameEn:'drawer base 600',w:600,h:600,c:'#A98F68',est:{code:'KB-DRW-600',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-300,y:-300,w:600,h:600,fill:'#A98F68',stroke:'#3E332A',sw:16,r:8},
    {type:'rect',x:-260,y:-260,w:520,h:520,fill:'#BCA27A',stroke:'#6E5D46',sw:5,r:6},
    {type:'line',x1:-260,y1:-90,x2:260,y2:-90,stroke:'#6E5D46',sw:6},
    {type:'line',x1:-260,y1:90,x2:260,y2:90,stroke:'#6E5D46',sw:6},
    {type:'line',x1:-70,y1:-175,x2:70,y2:-175,stroke:'#3E332A',sw:10},
    {type:'line',x1:-70,y1:0,x2:70,y2:0,stroke:'#3E332A',sw:10},
    {type:'line',x1:-70,y1:175,x2:70,y2:175,stroke:'#3E332A',sw:10},
  ]},
  wall_600:{name:'상부장(벽장) 600',nameEn:'wall cabinet 600',w:600,h:350,c:'#B89B6A',est:{code:'KW-600',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-300,y:-175,w:600,h:350,fill:'#B89B6A22',stroke:'#8F7752',sw:12,dash:[70,45],r:6},
    {type:'rect',x:-255,y:-130,w:510,h:260,fill:'transparent',stroke:'#8F7752',sw:5,dash:[40,30],r:4},
    {type:'line',x1:0,y1:-130,x2:0,y2:130,stroke:'#8F7752',sw:5,dash:[40,30]},
  ]},
  wall_900:{name:'상부장(벽장) 900',nameEn:'wall cabinet 900',w:900,h:350,c:'#B89B6A',est:{code:'KW-900',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-450,y:-175,w:900,h:350,fill:'#B89B6A22',stroke:'#8F7752',sw:12,dash:[70,45],r:6},
    {type:'rect',x:-405,y:-130,w:810,h:260,fill:'transparent',stroke:'#8F7752',sw:5,dash:[40,30],r:4},
    {type:'line',x1:-150,y1:-130,x2:-150,y2:130,stroke:'#8F7752',sw:5,dash:[40,30]},
    {type:'line',x1:150,y1:-130,x2:150,y2:130,stroke:'#8F7752',sw:5,dash:[40,30]},
  ]},
  corner_base_900:{name:'코너 밑장 900',nameEn:'corner base 900',w:900,h:900,c:'#A98F68',est:{code:'KB-CNR-900',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-450,y:-450,w:900,h:900,fill:'#A98F68',stroke:'#3E332A',sw:16,r:8},
    {type:'rect',x:-410,y:-410,w:820,h:820,fill:'#BCA27A',stroke:'#6E5D46',sw:5,r:6},
    {type:'line',x1:-410,y1:-410,x2:410,y2:410,stroke:'#3E332A',sw:8},
    {type:'line',x1:-410,y1:410,x2:120,y2:410,stroke:'#3E332A',sw:8},
    {type:'line',x1:410,y1:-410,x2:410,y2:120,stroke:'#3E332A',sw:8},
    {type:'circle',cx:190,cy:190,r:16,fill:'#3E332A',stroke:'#1A1A1A',sw:2},
  ]},
  corner_wall_600:{name:'코너 상부장 600',nameEn:'corner wall cabinet 600',w:600,h:600,c:'#B89B6A',est:{code:'KW-CNR-600',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-300,y:-300,w:600,h:600,fill:'#B89B6A22',stroke:'#8F7752',sw:12,dash:[70,45],r:6},
    {type:'line',x1:-300,y1:-300,x2:300,y2:300,stroke:'#8F7752',sw:6,dash:[50,35]},
  ]},
  tall_600:{name:'키큰장 600',nameEn:'tall cabinet 600',w:600,h:600,c:'#8F7752',est:{code:'KT-600',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-300,y:-300,w:600,h:600,fill:'#8F7752',stroke:'#3E332A',sw:16,r:8},
    {type:'rect',x:-260,y:-260,w:520,h:520,fill:'#A98F68',stroke:'#6E5D46',sw:5,r:6},
    {type:'line',x1:-260,y1:-260,x2:260,y2:260,stroke:'#3E332A',sw:7},
    {type:'line',x1:-260,y1:260,x2:260,y2:-260,stroke:'#3E332A',sw:7},
  ]},
  fridge_cab_900:{name:'냉장고장 900',nameEn:'fridge housing 900',w:900,h:700,c:'#8F7752',est:{code:'KT-REF-900',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-450,y:-350,w:900,h:700,fill:'#8F7752',stroke:'#3E332A',sw:16,r:8},
    {type:'rect',x:-390,y:-290,w:780,h:580,fill:'#D9DCDC',stroke:'#8A9194',sw:8,r:10},
    {type:'line',x1:0,y1:-290,x2:0,y2:290,stroke:'#8A9194',sw:6},
    {type:'line',x1:-40,y1:-140,x2:-40,y2:140,stroke:'#8A9194',sw:8},
    {type:'line',x1:40,y1:-140,x2:40,y2:140,stroke:'#8A9194',sw:8},
  ]},
  island_1500:{name:'아일랜드장 1500',nameEn:'island unit 1500',w:1500,h:900,c:'#8A8073',est:{code:'KI-1500',cat:'KITCHEN',unit:'EA'},shape:[
    {type:'rect',x:-750,y:-450,w:1500,h:900,fill:'#8A8073',stroke:'#38322A',sw:18,r:24},
    {type:'rect',x:-710,y:-410,w:1420,h:820,fill:'#A99C89',stroke:'#6B6152',sw:6,r:18},
    {type:'line',x1:-710,y1:190,x2:710,y2:190,stroke:'#6B6152',sw:6,dash:[55,40]},
    {type:'line',x1:-260,y1:-410,x2:-260,y2:190,stroke:'#6B6152',sw:5},
    {type:'line',x1:260,y1:-410,x2:260,y2:190,stroke:'#6B6152',sw:5},
    {type:'circle',cx:0,cy:-110,r:16,fill:'#38322A',stroke:'#1A1A1A',sw:2},
  ]},
  // --- 빌트인(픽스) 가구 ---
  wardrobe_fix_1200:{name:'붙박이장 1200',nameEn:'built-in wardrobe 1200',w:1200,h:600,c:'#7A6A50',est:{code:'BF-WD-1200',cat:'BUILTIN',unit:'EA'},shape:[
    {type:'rect',x:-600,y:-300,w:1200,h:600,fill:'#7A6A50',stroke:'#332B1E',sw:16,r:8},
    {type:'rect',x:-560,y:-260,w:1120,h:520,fill:'#94805F',stroke:'#5C4F3A',sw:5,r:6},
    {type:'line',x1:-200,y1:-260,x2:-200,y2:260,stroke:'#5C4F3A',sw:5},
    {type:'line',x1:200,y1:-260,x2:200,y2:260,stroke:'#5C4F3A',sw:5},
    {type:'line',x1:-560,y1:-140,x2:560,y2:-140,stroke:'#332B1E',sw:6},
    {type:'line',x1:-480,y1:-140,x2:-480,y2:90,stroke:'#5C4F3A',sw:4},
    {type:'line',x1:-380,y1:-140,x2:-380,y2:120,stroke:'#5C4F3A',sw:4},
    {type:'line',x1:-280,y1:-140,x2:-280,y2:80,stroke:'#5C4F3A',sw:4},
  ]},
  shoe_cab_1200:{name:'신발장 1200',nameEn:'shoe cabinet 1200',w:1200,h:350,c:'#7A6A50',est:{code:'BF-SHOE-1200',cat:'BUILTIN',unit:'EA'},shape:[
    {type:'rect',x:-600,y:-175,w:1200,h:350,fill:'#7A6A50',stroke:'#332B1E',sw:14,r:8},
    {type:'rect',x:-560,y:-135,w:1120,h:270,fill:'#94805F',stroke:'#5C4F3A',sw:5,r:6},
    {type:'line',x1:-280,y1:-135,x2:-280,y2:135,stroke:'#5C4F3A',sw:5},
    {type:'line',x1:0,y1:-135,x2:0,y2:135,stroke:'#5C4F3A',sw:5},
    {type:'line',x1:280,y1:-135,x2:280,y2:135,stroke:'#5C4F3A',sw:5},
  ]},
  tv_lowcab_2400:{name:'거실장(TV) 2400',nameEn:'TV low cabinet 2400',w:2400,h:450,c:'#6B5B3E',est:{code:'BF-TV-2400',cat:'BUILTIN',unit:'EA'},shape:[
    {type:'rect',x:-1200,y:-225,w:2400,h:450,fill:'#6B5B3E',stroke:'#2E2614',sw:16,r:10},
    {type:'rect',x:-1160,y:-185,w:2320,h:370,fill:'#8A7A55',stroke:'#5D4225',sw:5,r:8},
    {type:'line',x1:-580,y1:-185,x2:-580,y2:185,stroke:'#5D4225',sw:5},
    {type:'line',x1:0,y1:-185,x2:0,y2:185,stroke:'#5D4225',sw:5},
    {type:'line',x1:580,y1:-185,x2:580,y2:185,stroke:'#5D4225',sw:5},
    {type:'rect',x:-450,y:-245,w:900,h:70,fill:'#2E2E2E',stroke:'#141414',sw:4,r:8},
  ]},
  bath_vanity_900:{name:'욕실 하부장 900',nameEn:'bath vanity 900',w:900,h:550,c:'#8A8073',est:{code:'BF-VAN-900',cat:'BUILTIN',unit:'EA'},shape:[
    {type:'rect',x:-450,y:-275,w:900,h:550,fill:'#8A8073',stroke:'#38322A',sw:14,r:10},
    {type:'rect',x:-410,y:-235,w:820,h:470,fill:'#A99C89',stroke:'#6B6152',sw:5,r:8},
    {type:'circle',cx:0,cy:-20,r:170,fill:'#DADEDE',stroke:'#8A9194',sw:8},
    {type:'circle',cx:0,cy:-215,r:22,fill:'#8A9194',stroke:'#5F6668',sw:3},
  ]},
  laundry_cab_700:{name:'세탁장 700',nameEn:'laundry cabinet 700',w:700,h:700,c:'#8A8073',est:{code:'BF-LND-700',cat:'BUILTIN',unit:'EA'},shape:[
    {type:'rect',x:-350,y:-350,w:700,h:700,fill:'#8A8073',stroke:'#38322A',sw:14,r:10},
    {type:'rect',x:-310,y:-310,w:620,h:620,fill:'#D9DCDC',stroke:'#8A9194',sw:6,r:8},
    {type:'circle',cx:0,cy:0,r:210,fill:'transparent',stroke:'#8A9194',sw:10},
    {type:'circle',cx:0,cy:0,r:130,fill:'transparent',stroke:'#B0B6B8',sw:6},
  ]},
};
// 렌더·JSON·시맨틱 파이프라인 공용화 — 배치 객체 kind 는 'furniture' 그대로 사용
Object.assign(FURNITURE_LIB,FIXFURN_LIB);

const FIXTURE_LIB={
  // ===== 욕실 =====
  toilet:{name:'양변기',nameEn:'toilet',w:400,h:700,c:'#FFFFFF',shape:[
    {type:'rect',x:-200,y:-350,w:400,h:250,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:15},
    {type:'rect',x:-180,y:-330,w:360,h:210,fill:'transparent',stroke:'#5A5A5A',sw:3,r:10},
    {type:'circle',cx:0,cy:120,r:200,fill:'#FFFFFF',stroke:'#A8A8A8',sw:8},
    {type:'circle',cx:0,cy:120,r:170,fill:'transparent',stroke:'#5A5A5A',sw:3},
  ]},
  toilet_round:{name:'원형변기',nameEn:'round-bowl toilet',w:400,h:600,c:'#FFFFFF',shape:[
    {type:'rect',x:-180,y:-300,w:360,h:200,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:15},
    {type:'circle',cx:0,cy:80,r:200,fill:'#FFFFFF',stroke:'#A8A8A8',sw:8},
  ]},
  bidet:{name:'비데',nameEn:'bidet',w:400,h:550,c:'#FFFFFF',shape:[
    {type:'rect',x:-200,y:-275,w:400,h:550,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:25},
    {type:'rect',x:-150,y:-200,w:300,h:80,fill:'#3E3E3E',stroke:'#1A1A1A',sw:4,r:8},
  ]},
  sink_b:{name:'세면대',nameEn:'bathroom sink (basin)',w:600,h:450,c:'#FFFFFF',shape:[
    {type:'rect',x:-300,y:-225,w:600,h:450,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:25},
    {type:'circle',cx:0,cy:30,r:170,fill:'#FFFFFF',stroke:'#A8A8A8',sw:5},
    {type:'circle',cx:0,cy:30,r:30,fill:'#5A5A5A',stroke:'#3E3E3E',sw:3},
    {type:'rect',x:-15,y:-180,w:30,h:80,fill:'#A8A8A8',stroke:'#5A5A5A',sw:3,r:5},
  ]},
  sink_b_oval:{name:'세면대(타원)',nameEn:'oval bathroom basin',w:700,h:500,c:'#FFFFFF',shape:[
    {type:'rect',x:-350,y:-250,w:700,h:500,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:30},
    {type:'circle',cx:0,cy:50,r:200,fill:'#FFFFFF',stroke:'#A8A8A8',sw:5},
  ]},
  bathtub:{name:'욕조',nameEn:'bathtub',w:1700,h:750,c:'#F0F0F0',shape:[
    {type:'rect',x:-850,y:-375,w:1700,h:750,fill:'#F5F5F5',stroke:'#A8A8A8',sw:12,r:60},
    {type:'rect',x:-780,y:-310,w:1560,h:620,fill:'#E8F0F5',stroke:'#5BA0D4',sw:8,r:50},
    {type:'circle',cx:-700,cy:0,r:18,fill:'#5A5A5A',stroke:'#3E3E3E',sw:3},
  ]},
  bathtub_corner:{name:'코너 욕조',nameEn:'corner bathtub',w:1500,h:1500,c:'#F0F0F0',shape:[
    {type:'arc',cx:-750,cy:-750,r:1500,start:0,end:90,fill:'#F5F5F5',stroke:'#A8A8A8',sw:12},
    {type:'arc',cx:-750,cy:-750,r:1380,start:0,end:90,fill:'#E8F0F5',stroke:'#5BA0D4',sw:8},
  ]},
  shower:{name:'샤워부스',nameEn:'shower stall',w:900,h:900,c:'#5BA0D4',shape:[
    {type:'rect',x:-450,y:-450,w:900,h:900,fill:'#D4ECF5',stroke:'#5BA0D4',sw:12,r:8},
    {type:'rect',x:-430,y:-430,w:860,h:860,fill:'transparent',stroke:'#5BA0D4',sw:3,dash:[15,8],r:5},
    {type:'circle',cx:0,cy:0,r:30,fill:'#A8A8A8',stroke:'#5A5A5A',sw:3},
  ]},
  shower_corner:{name:'코너 샤워',nameEn:'corner shower',w:900,h:900,c:'#5BA0D4',shape:[
    {type:'rect',x:-450,y:-450,w:900,h:900,fill:'#D4ECF5',stroke:'#5BA0D4',sw:12,r:8},
    {type:'arc',cx:-450,cy:-450,r:850,start:0,end:90,fill:'transparent',stroke:'#5BA0D4',sw:5,dash:[10,5]},
  ]},
  // ===== 주방 =====
  fridge:{name:'냉장고',nameEn:'refrigerator',w:800,h:700,c:'#FFFFFF',shape:[
    {type:'rect',x:-400,y:-350,w:800,h:700,fill:'#F5F1EB',stroke:'#A8A8A8',sw:18,r:10},
    {type:'line',x1:-400,y1:-50,x2:400,y2:-50,stroke:'#A8A8A8',sw:5},
    {type:'rect',x:-380,y:-330,w:760,h:260,fill:'transparent',stroke:'#5A5A5A',sw:2,r:5},
    {type:'rect',x:-380,y:-30,w:760,h:360,fill:'transparent',stroke:'#5A5A5A',sw:2,r:5},
    {type:'rect',x:330,y:-280,w:30,h:160,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:5},
    {type:'rect',x:330,y:50,w:30,h:240,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:5},
  ]},
  fridge_2door:{name:'냉장고 양문',nameEn:'side-by-side refrigerator',w:1100,h:750,c:'#FFFFFF',shape:[
    {type:'rect',x:-550,y:-375,w:1100,h:750,fill:'#F5F1EB',stroke:'#A8A8A8',sw:18,r:10},
    {type:'line',x1:0,y1:-375,x2:0,y2:375,stroke:'#A8A8A8',sw:5},
    {type:'rect',x:-30,y:-300,w:30,h:200,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:5},
    {type:'rect',x:0,y:-300,w:30,h:200,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:5},
  ]},
  // ===== 세탁/유틸리티 =====
  washer:{name:'세탁기',nameEn:'washing machine',w:700,h:700,c:'#FFFFFF',shape:[
    {type:'rect',x:-350,y:-350,w:700,h:700,fill:'#F5F1EB',stroke:'#A8A8A8',sw:15,r:8},
    {type:'circle',cx:0,cy:30,r:240,fill:'#3E3E3E',stroke:'#5A5A5A',sw:8},
    {type:'circle',cx:0,cy:30,r:200,fill:'#1A1A1A',stroke:'#5A5A5A',sw:3},
    {type:'rect',x:-300,y:-330,w:600,h:80,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3,r:5},
    {type:'circle',cx:240,cy:-290,r:15,fill:'#5BA0D4'},
  ]},
  dryer:{name:'건조기',nameEn:'clothes dryer',w:700,h:700,c:'#FFFFFF',shape:[
    {type:'rect',x:-350,y:-350,w:700,h:700,fill:'#F5F1EB',stroke:'#A8A8A8',sw:15,r:8},
    {type:'circle',cx:0,cy:30,r:240,fill:'#5A5A5A',stroke:'#3E3E3E',sw:8},
    {type:'rect',x:-300,y:-330,w:600,h:80,fill:'#5A5A5A',stroke:'#1A1A1A',sw:3,r:5},
  ]},
};

const LIGHT_LIB={
  ceiling:{name:'천장 조명',nameEn:'ceiling light',size:400,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:200,fill:'#D4B872',stroke:'#A88248',sw:8},
    {type:'circle',cx:0,cy:0,r:160,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
  ]},
  downlight:{name:'다운라이트',nameEn:'recessed downlight',size:150,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:75,fill:'#D4B872',stroke:'#A88248',sw:5},
    {type:'circle',cx:0,cy:0,r:55,fill:'#F5E5B8',stroke:'#D4B872',sw:2},
  ]},
  pendant:{name:'펜던트',nameEn:'pendant light',size:300,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:150,fill:'#D4B872',stroke:'#A88248',sw:8},
    {type:'circle',cx:0,cy:0,r:120,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:0,r:25,fill:'#3E3E3E',stroke:'#1A1A1A',sw:2},
  ]},
  chandelier:{name:'샹들리에',nameEn:'chandelier',size:600,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:300,fill:'transparent',stroke:'#D4B872',sw:5},
    {type:'circle',cx:-200,cy:0,r:50,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:200,cy:0,r:50,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:-200,r:50,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:200,r:50,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:-141,cy:-141,r:45,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:141,cy:-141,r:45,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:-141,cy:141,r:45,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:141,cy:141,r:45,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:0,r:30,fill:'#A88248',stroke:'#5D4037',sw:2},
  ]},
  wall_lamp:{name:'벽등',nameEn:'wall sconce',size:200,c:'#D4B872',shape:[
    {type:'rect',x:-100,y:-50,w:200,h:100,fill:'#D4B872',stroke:'#A88248',sw:5,r:10},
    {type:'rect',x:-80,y:-30,w:160,h:60,fill:'#F5E5B8',stroke:'#D4B872',sw:2,r:5},
  ]},
  floor_lamp:{name:'스탠드',nameEn:'floor lamp',size:400,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:200,fill:'#D4B872',stroke:'#A88248',sw:6},
    {type:'circle',cx:0,cy:0,r:30,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3},
  ]},
  track:{name:'트랙라이트',nameEn:'track light',size:300,c:'#D4B872',shape:[
    {type:'rect',x:-150,y:-25,w:300,h:50,fill:'#5A5A5A',stroke:'#1A1A1A',sw:5,r:5},
    {type:'circle',cx:-100,cy:0,r:18,fill:'#D4B872',stroke:'#A88248',sw:2},
    {type:'circle',cx:0,cy:0,r:18,fill:'#D4B872',stroke:'#A88248',sw:2},
    {type:'circle',cx:100,cy:0,r:18,fill:'#D4B872',stroke:'#A88248',sw:2},
  ]},
  fluorescent:{name:'형광등',nameEn:'fluorescent light fixture',size:1200,c:'#D4B872',shape:[
    {type:'rect',x:-600,y:-50,w:1200,h:100,fill:'#F5E5B8',stroke:'#D4B872',sw:5,r:5},
    {type:'rect',x:-580,y:-30,w:1160,h:60,fill:'#FFF8E0',stroke:'#F5E5B8',sw:2,r:3},
  ]},
  // ===== 2026-08-24: 트렌드 조명 6종 (대표 지시) =====
  line_t5:{name:'라인조명 (T5)',nameEn:'LED line light',size:1200,c:'#D4B872',shape:[
    {type:'rect',x:-600,y:-30,w:1200,h:60,fill:'#FFF3D0',stroke:'#D4B872',sw:5,r:30},
    {type:'rect',x:-620,y:-18,w:40,h:36,fill:'#5A5A5A',stroke:'#2A2A2A',sw:3,r:8},
    {type:'rect',x:580,y:-18,w:40,h:36,fill:'#5A5A5A',stroke:'#2A2A2A',sw:3,r:8},
    {type:'line',x1:-560,y1:0,x2:560,y2:0,stroke:'#FFE9A8',sw:14},
  ]},
  magnet_track:{name:'마그네틱 트랙',nameEn:'magnetic track light',size:1500,c:'#D4B872',shape:[
    {type:'rect',x:-750,y:-35,w:1500,h:70,fill:'#2E2E2E',stroke:'#101010',sw:6,r:8},
    {type:'circle',cx:-480,cy:0,r:45,fill:'#D4B872',stroke:'#A88248',sw:4},
    {type:'rect',x:-220,y:-22,w:360,h:44,fill:'#FFF3D0',stroke:'#D4B872',sw:3,r:22},
    {type:'circle',cx:330,cy:0,r:30,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:520,cy:0,r:45,fill:'#D4B872',stroke:'#A88248',sw:4},
  ]},
  cove:{name:'간접조명 (코브)',nameEn:'cove strip light',size:1500,c:'#D4B872',shape:[
    {type:'rect',x:-750,y:-25,w:1500,h:50,fill:'#FFF8E0',stroke:'#F5E5B8',sw:3,r:25},
    {type:'line',x1:-750,y1:-70,x2:750,y2:-70,stroke:'#D4B872',sw:5,dash:[70,50]},
    {type:'line',x1:-750,y1:70,x2:750,y2:70,stroke:'#D4B872',sw:5,dash:[70,50]},
  ]},
  spot_cyl:{name:'원통 스포트',nameEn:'cylinder spotlight',size:180,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:90,fill:'#3E3E3E',stroke:'#141414',sw:5},
    {type:'circle',cx:0,cy:0,r:58,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:0,r:22,fill:'#FFE9A8',stroke:'#D4B872',sw:2},
  ]},
  table_lamp:{name:'단스탠드 (무드등)',nameEn:'table lamp',size:250,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:125,fill:'#F5E5B8',stroke:'#D4B872',sw:6},
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFF3D0',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:0,r:20,fill:'#A88248',stroke:'#5D4037',sw:3},
  ]},
  pendant_cluster:{name:'클러스터 펜던트',nameEn:'cluster pendant',size:500,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:26,fill:'#3E3E3E',stroke:'#141414',sw:3},
    {type:'line',x1:0,y1:0,x2:-140,y2:-90,stroke:'#5A5A5A',sw:4},
    {type:'line',x1:0,y1:0,x2:170,y2:-40,stroke:'#5A5A5A',sw:4},
    {type:'line',x1:0,y1:0,x2:30,y2:150,stroke:'#5A5A5A',sw:4},
    {type:'circle',cx:-140,cy:-90,r:95,fill:'#F5E5B8',stroke:'#D4B872',sw:5},
    {type:'circle',cx:170,cy:-40,r:70,fill:'#F5E5B8',stroke:'#D4B872',sw:5},
    {type:'circle',cx:30,cy:150,r:80,fill:'#F5E5B8',stroke:'#D4B872',sw:5},
  ]},
};

const ELECTRIC_LIB={
  outlet_w:{name:'벽 콘센트(2구)',nameEn:'wall outlet (2-gang)',size:200,c:'#7BA05B',sym:'⚡',shape:[
    {type:'rect',x:-100,y:-60,w:200,h:120,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'circle',cx:-40,cy:0,r:18,fill:'#3E3E3E'},
    {type:'circle',cx:40,cy:0,r:18,fill:'#3E3E3E'},
  ]},
  outlet_w4:{name:'벽 콘센트(4구)',nameEn:'wall outlet (4-gang)',size:300,c:'#7BA05B',sym:'⚡',shape:[
    {type:'rect',x:-150,y:-60,w:300,h:120,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'circle',cx:-90,cy:0,r:15,fill:'#3E3E3E'},
    {type:'circle',cx:-30,cy:0,r:15,fill:'#3E3E3E'},
    {type:'circle',cx:30,cy:0,r:15,fill:'#3E3E3E'},
    {type:'circle',cx:90,cy:0,r:15,fill:'#3E3E3E'},
  ]},
  outlet_f:{name:'바닥 콘센트',nameEn:'floor outlet',size:200,c:'#7BA05B',sym:'◉',shape:[
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5},
    {type:'circle',cx:0,cy:0,r:40,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3},
  ]},
  switch_1:{name:'스위치(1구)',nameEn:'light switch (1-gang)',size:150,c:'#7BA05B',sym:'◇',shape:[
    {type:'rect',x:-50,y:-75,w:100,h:150,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'rect',x:-30,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
  ]},
  switch_2:{name:'스위치(2구)',nameEn:'light switch (2-gang)',size:200,c:'#7BA05B',sym:'◇',shape:[
    {type:'rect',x:-100,y:-75,w:200,h:150,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'rect',x:-80,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
    {type:'rect',x:20,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
  ]},
  switch_3:{name:'스위치(3구)',nameEn:'light switch (3-gang)',size:280,c:'#7BA05B',sym:'◇',shape:[
    {type:'rect',x:-140,y:-75,w:280,h:150,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'rect',x:-120,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
    {type:'rect',x:-30,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
    {type:'rect',x:60,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
  ]},
  internet:{name:'인터넷/TV',nameEn:'internet/TV jack',size:200,c:'#5B8DA0',sym:'📡',shape:[
    {type:'rect',x:-80,y:-80,w:160,h:160,fill:'#D4ECF5',stroke:'#5B8DA0',sw:5,r:8},
    {type:'rect',x:-50,y:-50,w:100,h:30,fill:'#3E3E3E',stroke:'#1A1A1A',sw:2,r:3},
    {type:'rect',x:-50,y:20,w:100,h:30,fill:'#3E3E3E',stroke:'#1A1A1A',sw:2,r:3},
  ]},
  ac:{name:'에어컨',nameEn:'wall-mounted air conditioner',size:800,c:'#5B8DA0',sym:'❄',shape:[
    {type:'rect',x:-400,y:-150,w:800,h:300,fill:'#F5F1EB',stroke:'#5B8DA0',sw:10,r:30},
    {type:'rect',x:-380,y:-130,w:760,h:60,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3,r:8},
    {type:'rect',x:-380,y:-50,w:760,h:160,fill:'transparent',stroke:'#A8A8A8',sw:2,dash:[10,5]},
  ]},
  ac_floor:{name:'스탠드 에어컨',nameEn:'floor-standing air conditioner',size:500,c:'#5B8DA0',sym:'❄',shape:[
    {type:'rect',x:-250,y:-200,w:500,h:400,fill:'#F5F1EB',stroke:'#5B8DA0',sw:12,r:25},
    {type:'rect',x:-220,y:-170,w:440,h:60,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3,r:8},
    {type:'rect',x:-220,y:-90,w:440,h:260,fill:'transparent',stroke:'#A8A8A8',sw:2,dash:[10,5]},
  ]},
  intercom:{name:'인터폰',nameEn:'video intercom',size:200,c:'#7BA05B',sym:'📞',shape:[
    {type:'rect',x:-90,y:-100,w:180,h:200,fill:'#F5F1EB',stroke:'#5A5A5A',sw:5,r:8},
    {type:'rect',x:-70,y:-80,w:140,h:80,fill:'#3E3E3E',stroke:'#1A1A1A',sw:2,r:3},
    {type:'circle',cx:0,cy:50,r:18,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2},
  ]},
  boiler_ctrl:{name:'보일러 조작기',nameEn:'boiler controller (thermostat)',size:200,c:'#C96A4A',sym:'🔥',shape:[
    {type:'rect',x:-90,y:-60,w:180,h:120,fill:'#F5F1EB',stroke:'#C96A4A',sw:5,r:8},
    {type:'rect',x:-70,y:-40,w:140,h:50,fill:'#1A1A1A',stroke:'#5A5A5A',sw:2,r:3},
    {type:'circle',cx:-40,cy:30,r:10,fill:'#C96A4A'},
    {type:'circle',cx:0,cy:30,r:10,fill:'#A8A8A8'},
    {type:'circle',cx:40,cy:30,r:10,fill:'#A8A8A8'},
  ]},
};

// v5.6: 공조/소방 라이브러리 (HVAC + Fire) — 한국 평면도 표준 심볼
const HVAC_FIRE_LIB={
  // ===== 공조 (HVAC) =====
  ac_ceiling:{name:'시스템 에어컨',nameEn:'ceiling-mounted system AC',size:900,c:'#5B8DA0',shape:[
    {type:'rect',x:-450,y:-450,w:900,h:900,fill:'#F5F1EB',stroke:'#5B8DA0',sw:15,r:10},
    {type:'rect',x:-380,y:-380,w:760,h:760,fill:'transparent',stroke:'#5B8DA0',sw:5,r:5},
    {type:'line',x1:-380,y1:0,x2:380,y2:0,stroke:'#5B8DA0',sw:5,dash:[20,10]},
    {type:'line',x1:0,y1:-380,x2:0,y2:380,stroke:'#5B8DA0',sw:5,dash:[20,10]},
  ]},
  diffuser:{name:'환기 디퓨저',nameEn:'ventilation diffuser',size:300,c:'#5B8DA0',shape:[
    {type:'rect',x:-150,y:-150,w:300,h:300,fill:'#F5F1EB',stroke:'#5B8DA0',sw:8,r:5},
    {type:'circle',cx:0,cy:0,r:100,fill:'transparent',stroke:'#5B8DA0',sw:5},
    {type:'line',x1:-100,y1:0,x2:100,y2:0,stroke:'#5B8DA0',sw:4},
    {type:'line',x1:0,y1:-100,x2:0,y2:100,stroke:'#5B8DA0',sw:4},
  ]},
  vent_fan:{name:'환기팬',nameEn:'ventilation fan',size:300,c:'#5B8DA0',shape:[
    {type:'rect',x:-150,y:-150,w:300,h:300,fill:'#F5F1EB',stroke:'#5B8DA0',sw:8,r:5},
    {type:'circle',cx:0,cy:0,r:120,fill:'transparent',stroke:'#5B8DA0',sw:5},
    {type:'line',x1:-90,y1:-50,x2:90,y2:50,stroke:'#5B8DA0',sw:6},
    {type:'line',x1:-50,y1:90,x2:50,y2:-90,stroke:'#5B8DA0',sw:6},
    {type:'line',x1:90,y1:-50,x2:-50,y2:90,stroke:'#5B8DA0',sw:6},
  ]},
  hood:{name:'레인지 후드',nameEn:'range hood',size:900,c:'#5A5A5A',shape:[
    {type:'rect',x:-450,y:-200,w:900,h:400,fill:'#5A5A5A',stroke:'#1A1A1A',sw:12,r:5},
    {type:'rect',x:-400,y:-150,w:800,h:50,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3,r:3},
    {type:'rect',x:-300,y:-50,w:600,h:200,fill:'#A8A8A8',stroke:'#5A5A5A',sw:3,r:5},
  ]},
  hvac_grille:{name:'공조 그릴',nameEn:'HVAC grille',size:400,c:'#5B8DA0',shape:[
    {type:'rect',x:-200,y:-100,w:400,h:200,fill:'#F5F1EB',stroke:'#5B8DA0',sw:8,r:5},
    {type:'line',x1:-180,y1:-60,x2:180,y2:-60,stroke:'#5B8DA0',sw:3},
    {type:'line',x1:-180,y1:-20,x2:180,y2:-20,stroke:'#5B8DA0',sw:3},
    {type:'line',x1:-180,y1:20,x2:180,y2:20,stroke:'#5B8DA0',sw:3},
    {type:'line',x1:-180,y1:60,x2:180,y2:60,stroke:'#5B8DA0',sw:3},
  ]},
  // ===== 소방 (Fire) =====
  // ===== 2026-08-24: 에어컨 계열·공조 확충 (대표 지시) =====
  ac_4way:{name:'시스템 AC 4way 카세트',nameEn:'4-way cassette AC',size:900,c:'#5B8DA0',shape:[
    {type:'rect',x:-450,y:-450,w:900,h:900,fill:'#F5F1EB',stroke:'#5B8DA0',sw:15,r:10},
    {type:'rect',x:-330,y:-330,w:660,h:660,fill:'transparent',stroke:'#5B8DA0',sw:5,r:6},
    {type:'rect',x:-300,y:-430,w:600,h:70,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4,r:20},
    {type:'rect',x:-300,y:360,w:600,h:70,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4,r:20},
    {type:'rect',x:-430,y:-300,w:70,h:600,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4,r:20},
    {type:'rect',x:360,y:-300,w:70,h:600,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4,r:20},
    {type:'circle',cx:0,cy:0,r:70,fill:'transparent',stroke:'#5B8DA0',sw:5},
    {type:'text',x:-38,y:-52,text:'4W',fontSize:110,fill:'#5B8DA0'},
  ]},
  ac_2way:{name:'시스템 AC 2way 카세트',nameEn:'2-way cassette AC',size:1200,c:'#5B8DA0',shape:[
    {type:'rect',x:-600,y:-225,w:1200,h:450,fill:'#F5F1EB',stroke:'#5B8DA0',sw:14,r:10},
    {type:'rect',x:-500,y:-205,w:1000,h:70,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4,r:20},
    {type:'rect',x:-500,y:135,w:1000,h:70,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4,r:20},
    {type:'line',x1:-500,y1:0,x2:500,y2:0,stroke:'#5B8DA0',sw:4,dash:[25,15]},
    {type:'text',x:-45,y:-52,text:'2W',fontSize:100,fill:'#5B8DA0'},
  ]},
  ac_1way:{name:'시스템 AC 1way 카세트',nameEn:'1-way cassette AC',size:1000,c:'#5B8DA0',shape:[
    {type:'rect',x:-500,y:-125,w:1000,h:250,fill:'#F5F1EB',stroke:'#5B8DA0',sw:12,r:8},
    {type:'rect',x:-420,y:25,w:840,h:60,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4,r:18},
    {type:'line',x1:-420,y1:-40,x2:420,y2:-40,stroke:'#5B8DA0',sw:4,dash:[25,15]},
    {type:'text',x:-42,y:-105,text:'1W',fontSize:90,fill:'#5B8DA0'},
  ]},
  ac_wall:{name:'벽걸이 에어컨',nameEn:'wall-mounted AC',size:900,c:'#5B8DA0',shape:[
    {type:'rect',x:-450,y:-125,w:900,h:250,fill:'#F5F1EB',stroke:'#5B8DA0',sw:12,r:60},
    {type:'line',x1:-360,y1:55,x2:360,y2:55,stroke:'#5B8DA0',sw:6},
    {type:'arc',cx:0,cy:125,r:250,start:35,end:75,stroke:'#5B8DA0',sw:4},
    {type:'arc',cx:0,cy:125,r:250,start:105,end:145,stroke:'#5B8DA0',sw:4},
  ]},
  ac_stand:{name:'스탠드 에어컨',nameEn:'floor standing AC',size:450,c:'#5B8DA0',shape:[
    {type:'rect',x:-225,y:-175,w:450,h:350,fill:'#F5F1EB',stroke:'#5B8DA0',sw:12,r:40},
    {type:'line',x1:-140,y1:-95,x2:140,y2:-95,stroke:'#5B8DA0',sw:5},
    {type:'line',x1:-140,y1:-25,x2:140,y2:-25,stroke:'#5B8DA0',sw:5},
    {type:'line',x1:-140,y1:45,x2:140,y2:45,stroke:'#5B8DA0',sw:5},
    {type:'circle',cx:0,cy:115,r:26,fill:'#5B8DA0',stroke:'#3D6473',sw:3},
  ]},
  ac_duct:{name:'덕트형 AC (천장 매립)',nameEn:'concealed duct AC',size:900,c:'#5B8DA0',shape:[
    {type:'rect',x:-450,y:-225,w:900,h:450,fill:'#F5F1EB55',stroke:'#5B8DA0',sw:10,dash:[60,40],r:8},
    {type:'line',x1:-330,y1:-90,x2:330,y2:-90,stroke:'#5B8DA0',sw:5,dash:[35,25]},
    {type:'line',x1:-330,y1:90,x2:330,y2:90,stroke:'#5B8DA0',sw:5,dash:[35,25]},
    {type:'line',x1:250,y1:0,x2:400,y2:0,stroke:'#5B8DA0',sw:6},
    {type:'line',x1:340,y1:-40,x2:400,y2:0,stroke:'#5B8DA0',sw:6},
    {type:'line',x1:340,y1:40,x2:400,y2:0,stroke:'#5B8DA0',sw:6},
  ]},
  ac_outdoor:{name:'에어컨 실외기',nameEn:'AC outdoor unit',size:900,c:'#8A9194',shape:[
    {type:'rect',x:-450,y:-175,w:900,h:350,fill:'#D9DCDC',stroke:'#5F6668',sw:12,r:10},
    {type:'circle',cx:-200,cy:0,r:125,fill:'transparent',stroke:'#5F6668',sw:8},
    {type:'circle',cx:-200,cy:0,r:35,fill:'#5F6668',stroke:'#3C4143',sw:3},
    {type:'line',x1:60,y1:-115,x2:60,y2:115,stroke:'#8A9194',sw:5},
    {type:'line',x1:160,y1:-115,x2:160,y2:115,stroke:'#8A9194',sw:5},
    {type:'line',x1:260,y1:-115,x2:260,y2:115,stroke:'#8A9194',sw:5},
    {type:'line',x1:360,y1:-115,x2:360,y2:115,stroke:'#8A9194',sw:5},
  ]},
  erv:{name:'전열교환기 (ERV)',nameEn:'energy recovery ventilator',size:800,c:'#5B8DA0',shape:[
    {type:'rect',x:-400,y:-300,w:800,h:600,fill:'#F5F1EB55',stroke:'#5B8DA0',sw:10,dash:[55,35],r:8},
    {type:'line',x1:-400,y1:-300,x2:400,y2:300,stroke:'#5B8DA0',sw:5},
    {type:'line',x1:-400,y1:300,x2:400,y2:-300,stroke:'#5B8DA0',sw:5},
    {type:'rect',x:-490,y:-70,w:90,h:140,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4},
    {type:'rect',x:400,y:-70,w:90,h:140,fill:'#BCD4DE',stroke:'#5B8DA0',sw:4},
    {type:'circle',cx:0,cy:0,r:80,fill:'#F5F1EB',stroke:'#5B8DA0',sw:6},
    {type:'text',x:-62,y:-40,text:'ERV',fontSize:80,fill:'#5B8DA0'},
  ]},
  boiler_unit:{name:'보일러',nameEn:'boiler unit',size:450,c:'#8A9194',shape:[
    {type:'rect',x:-225,y:-175,w:450,h:350,fill:'#D9DCDC',stroke:'#5F6668',sw:12,r:12},
    {type:'circle',cx:0,cy:-30,r:80,fill:'transparent',stroke:'#C77B3F',sw:8},
    {type:'line',x1:0,y1:-95,x2:-35,y2:-10,stroke:'#C77B3F',sw:8},
    {type:'line',x1:-35,y1:-10,x2:20,y2:-45,stroke:'#C77B3F',sw:8},
    {type:'line',x1:20,y1:-45,x2:0,y2:35,stroke:'#C77B3F',sw:8},
    {type:'circle',cx:-120,cy:130,r:22,fill:'#5F6668',stroke:'#3C4143',sw:3},
    {type:'circle',cx:120,cy:130,r:22,fill:'#5F6668',stroke:'#3C4143',sw:3},
  ]},
  sprinkler:{name:'스프링클러(펜던트)',nameEn:'pendant fire sprinkler',size:200,c:'#E2725B',shape:[
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFFFFF',stroke:'#E2725B',sw:8},
    {type:'circle',cx:0,cy:0,r:30,fill:'#E2725B',stroke:'#A04830',sw:3},
    {type:'line',x1:-80,y1:0,x2:80,y2:0,stroke:'#E2725B',sw:5},
    {type:'line',x1:0,y1:-80,x2:0,y2:80,stroke:'#E2725B',sw:5},
  ]},
  sprinkler_side:{name:'스프링클러(사이드월)',nameEn:'sidewall fire sprinkler',size:200,c:'#E2725B',shape:[
    {type:'rect',x:-60,y:-30,w:120,h:60,fill:'#FFFFFF',stroke:'#E2725B',sw:6,r:8},
    {type:'circle',cx:60,cy:0,r:25,fill:'#E2725B',stroke:'#A04830',sw:3},
    {type:'line',x1:-50,y1:-20,x2:-50,y2:20,stroke:'#E2725B',sw:4},
  ]},
  smoke_detector:{name:'연기 감지기',nameEn:'smoke detector',size:200,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFFFFF',stroke:'#D4B872',sw:8},
    {type:'circle',cx:0,cy:0,r:50,fill:'transparent',stroke:'#D4B872',sw:4},
    {type:'text',x:-30,y:-25,text:'S',fontSize:50,fill:'#D4B872'},
  ]},
  heat_detector:{name:'열 감지기',nameEn:'heat detector',size:200,c:'#C96A4A',shape:[
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFFFFF',stroke:'#C96A4A',sw:8},
    {type:'circle',cx:0,cy:0,r:50,fill:'transparent',stroke:'#C96A4A',sw:4},
    {type:'text',x:-30,y:-25,text:'H',fontSize:50,fill:'#C96A4A'},
  ]},
  emerg_light:{name:'비상 조명',nameEn:'emergency light',size:200,c:'#7BA05B',shape:[
    {type:'rect',x:-90,y:-50,w:180,h:100,fill:'#7BA05B',stroke:'#3D6034',sw:8,r:8},
    {type:'rect',x:-70,y:-30,w:140,h:60,fill:'#FFFFFF',stroke:'#7BA05B',sw:3,r:5},
    {type:'text',x:-15,y:-25,text:'E',fontSize:40,fill:'#7BA05B'},
  ]},
  exit_sign:{name:'비상 대피등',nameEn:'exit sign',size:300,c:'#7BA05B',shape:[
    {type:'rect',x:-150,y:-50,w:300,h:100,fill:'#7BA05B',stroke:'#3D6034',sw:8,r:8},
    {type:'rect',x:-130,y:-30,w:260,h:60,fill:'#FFFFFF',stroke:'#7BA05B',sw:3,r:5},
    {type:'text',x:-50,y:-25,text:'EXIT',fontSize:30,fill:'#7BA05B'},
  ]},
  fire_ext:{name:'소화기',nameEn:'fire extinguisher',size:250,c:'#C96A4A',shape:[
    {type:'rect',x:-60,y:-125,w:120,h:250,fill:'#C96A4A',stroke:'#7A3825',sw:8,r:15},
    {type:'rect',x:-40,y:-105,w:80,h:30,fill:'#1A1A1A',stroke:'#000',sw:3,r:5},
    {type:'rect',x:-50,y:-50,w:100,h:80,fill:'#FFFFFF',stroke:'#C96A4A',sw:3,r:3},
    {type:'text',x:-15,y:-30,text:'F',fontSize:50,fill:'#C96A4A'},
  ]},
  hydrant:{name:'옥내 소화전',nameEn:'indoor fire hydrant',size:500,c:'#C96A4A',shape:[
    {type:'rect',x:-200,y:-250,w:400,h:500,fill:'#C96A4A',stroke:'#7A3825',sw:12,r:8},
    {type:'rect',x:-160,y:-210,w:320,h:420,fill:'#FFFFFF',stroke:'#C96A4A',sw:5,r:5},
    {type:'text',x:-100,y:-50,text:'消防',fontSize:60,fill:'#C96A4A'},
  ]},
  emerg_bell:{name:'비상벨',nameEn:'emergency alarm bell',size:200,c:'#C96A4A',shape:[
    {type:'circle',cx:0,cy:0,r:90,fill:'#C96A4A',stroke:'#7A3825',sw:8},
    {type:'circle',cx:0,cy:0,r:55,fill:'#FFFFFF',stroke:'#C96A4A',sw:4},
    {type:'text',x:-25,y:-30,text:'B',fontSize:50,fill:'#C96A4A'},
  ]},
  auto_ext:{name:'자동확산소화기',nameEn:'automatic fire suppressor',size:300,c:'#C96A4A',shape:[
    {type:'circle',cx:0,cy:0,r:130,fill:'#C96A4A',stroke:'#7A3825',sw:10},
    {type:'circle',cx:0,cy:0,r:100,fill:'#FFFFFF',stroke:'#C96A4A',sw:5},
    {type:'circle',cx:0,cy:0,r:30,fill:'#C96A4A',stroke:'#7A3825',sw:3},
    {type:'line',x1:-100,y1:0,x2:100,y2:0,stroke:'#C96A4A',sw:5},
    {type:'line',x1:0,y1:-100,x2:0,y2:100,stroke:'#C96A4A',sw:5},
  ]},
};
