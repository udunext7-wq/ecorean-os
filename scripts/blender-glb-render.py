# ============================================================================
#  ECOREAN MiniCAD 3D → Blender 사실적 렌더 (2단계) v2
#  사용:  blender -b -P scripts/blender-glb-render.py -- <입력.glb> <출력.png> [samples] [view] [light]
#    view : iso(기본) | front | top | room          (room = 가장 큰 방 실내 눈높이)
#           room:<방이름>  예) room:거실  room:안방   (extras.ecorean.name 부분 일치)
#    light: day(기본) | night                        (night = 조명 기구가 주인공)
#  MiniCAD 3D 의 [⬇GLB] 파일을 그대로 받는다.
#   - 재질 이름 MC_<hex>[_glass|_emit] → 유리/발광 자동 변환
#   - 바닥: GLB 에 실려 온 캔버스 텍스처(널결·줄눈)는 그대로 쓰고, 없을 때만 프로시저럴 노드 생성
#  Copyright (c) 2026 ECOREAN.
# ============================================================================
import bpy, sys, math, os
from mathutils import Vector

argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(argv)<2:
    print('usage: blender -b -P blender-glb-render.py -- in.glb out.png [samples] [view] [light]'); sys.exit(1)
GLB, OUT = argv[0], argv[1]
SAMPLES = int(argv[2]) if len(argv)>2 else 96
VIEW = argv[3] if len(argv)>3 else 'iso'
LIGHT = argv[4] if len(argv)>4 else 'day'
NIGHT = (LIGHT=='night')

bpy.ops.wm.read_factory_settings(use_empty=True)
scn=bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)

# --- 렌더 설정 ---
scn.render.engine='CYCLES'
scn.cycles.samples=SAMPLES
try: scn.cycles.use_denoising=True
except Exception: pass
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='OPTIX'; prefs.get_devices()
    for d in prefs.devices: d.use=True
    scn.cycles.device='GPU'
except Exception:
    scn.cycles.device='CPU'
scn.render.resolution_x=1920; scn.render.resolution_y=1280
scn.render.image_settings.file_format='PNG'
scn.render.filepath=os.path.abspath(OUT)
try: scn.view_settings.view_transform='Filmic'
except Exception: pass
try: scn.view_settings.look='Medium High Contrast'
except Exception: pass

# --- 월드 ---
w=bpy.data.worlds.new('W'); scn.world=w; w.use_nodes=True
bg=w.node_tree.nodes['Background']
if NIGHT: bg.inputs[0].default_value=(0.02,0.03,0.07,1); bg.inputs[1].default_value=0.06
else:     bg.inputs[0].default_value=(0.75,0.82,0.95,1); bg.inputs[1].default_value=0.55

# --- 경계 상자 ---
meshes=[o for o in scn.objects if o.type=='MESH']
mins=[1e9]*3; maxs=[-1e9]*3
for o in meshes:
    for c in o.bound_box:
        p=o.matrix_world @ Vector(c)
        for i in range(3):
            mins[i]=min(mins[i],p[i]); maxs[i]=max(maxs[i],p[i])
cx,cy,cz=[(mins[i]+maxs[i])/2 for i in range(3)]
span=max(maxs[0]-mins[0],maxs[1]-mins[1],1.0)

# --- 태양 ---
sun=bpy.data.objects.new('Sun',bpy.data.lights.new('Sun','SUN'))
sun.data.energy=0.12 if NIGHT else 3.2
sun.data.angle=math.radians(4)
sun.rotation_euler=(math.radians(50),0,math.radians(35))
scn.collection.objects.link(sun)

# --- 방 찾기 (extras.ecorean kind=='floor') ---
def eco_of(o):
    # 정식 [⬇GLB] = extras.ecorean / 뷰어 루트 직접 내보내기 = extras.obj — 둘 다 받는다
    try:
        e=o.get('ecorean')
        if e is not None: return dict(e)
    except Exception: pass
    try:
        e=o.get('obj')
        if e is not None:
            d=dict(e)
            meta={}
            try: meta=dict(d.get('meta') or {})
            except Exception: pass
            return {'kind':d.get('kind'),'name':d.get('name'),'id':d.get('id'),
                    'floor':d.get('floorName') or '',
                    'material':meta.get('material') or meta.get('floorMaterial'),
                    'ceilingMaterial':meta.get('ceilingMaterial')}
    except Exception: pass
    return None
def obj_bbox(root):
    mn=[1e9]*3; mx=[-1e9]*3; found=False
    stack=[root]
    while stack:
        o=stack.pop(); stack.extend(o.children)
        if o.type!='MESH': continue
        found=True
        for c in o.bound_box:
            p=o.matrix_world @ Vector(c)
            for i in range(3):
                mn[i]=min(mn[i],p[i]); mx[i]=max(mx[i],p[i])
    return (mn,mx) if found else None
rooms=[]
for o in scn.objects:
    e=eco_of(o)
    if e and str(e.get('kind'))=='floor':
        bb=obj_bbox(o)
        if bb:
            (mn,mx)=bb
            rooms.append({'name':str(e.get('name') or ''),'floor':str(e.get('floor') or ''),
                          'mn':mn,'mx':mx,'area':(mx[0]-mn[0])*(mx[1]-mn[1])})
rooms.sort(key=lambda r:-r['area'])

# --- 카메라 ---
cam=bpy.data.objects.new('Cam',bpy.data.cameras.new('Cam'))
scn.collection.objects.link(cam); scn.camera=cam
def look_at(obj,tgt):
    d=Vector(tgt)-obj.location
    obj.rotation_euler=d.to_track_quat('-Z','Y').to_euler()

room_pick=None
if VIEW.startswith('room'):
    want=VIEW.split(':',1)[1] if ':' in VIEW else ''
    cand=[r for r in rooms if want and want in r['name']] or rooms
    if cand: room_pick=cand[0]
if room_pick:
    r=room_pick
    rcx,rcy=(r['mn'][0]+r['mx'][0])/2,(r['mn'][1]+r['mx'][1])/2
    rw,rd=r['mx'][0]-r['mn'][0], r['mx'][1]-r['mn'][1]
    fz=r['mn'][2]                              # 그 방의 바닥 표고
    # 방의 한쪽 구석 눈높이에서 대각선으로 — 실내 컷
    cam.location=(rcx-rw*0.36, rcy-rd*0.36, fz+1.5)
    look_at(cam,(rcx+rw*0.12, rcy+rd*0.12, fz+1.15))
    cam.data.lens=17                           # 실내 광각
    cam.data.clip_start=0.03
    print('[ECOREAN] room view: %s (%s) %.1fx%.1fm fz=%.2f'%(r['name'],r['floor'],rw,rd,fz))
elif VIEW=='top':
    cam.location=(cx,cy,cz+span*1.7); look_at(cam,(cx,cy,cz)); cam.data.lens=32
elif VIEW=='front':
    cam.location=(cx,mins[1]-span*1.15,mins[2]+span*0.22); look_at(cam,(cx,cy,mins[2]+span*0.18)); cam.data.lens=35
else: # iso — 사람이 모형을 보는 낮은 앙각
    cam.location=(cx+span*0.85, mins[1]-span*0.75, mins[2]+span*0.55)
    look_at(cam,(cx,cy,mins[2]+min(span*0.18,(maxs[2]-mins[2])*0.45)))
    cam.data.lens=38

# --- 재질 변환 ---
def has_image_tex(nt):
    return any(n.type=='TEX_IMAGE' and n.image for n in nt.nodes)
def wood_nodes(nt,base):
    n=nt.nodes; bsdf=n.get('Principled BSDF')
    tex=n.new('ShaderNodeTexWave'); tex.wave_type='BANDS'
    tex.inputs['Scale'].default_value=1.6; tex.inputs['Distortion'].default_value=6.0; tex.inputs['Detail'].default_value=2.0
    ramp=n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=base
    ramp.color_ramp.elements[1].color=tuple(c*0.55 for c in base[:3])+(1.0,)
    nt.links.new(tex.outputs['Color'],ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=0.55
def tile_nodes(nt,base,scale=3.3):
    n=nt.nodes; bsdf=n.get('Principled BSDF')
    brick=n.new('ShaderNodeTexBrick'); brick.offset=0.0
    brick.inputs['Scale'].default_value=scale
    brick.inputs['Mortar Size'].default_value=0.006
    brick.inputs['Color1'].default_value=base
    brick.inputs['Color2'].default_value=tuple(c*0.93 for c in base[:3])+(1.0,)
    brick.inputs['Mortar'].default_value=(0.25,0.25,0.25,1)
    nt.links.new(brick.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=0.28

WOODY={'STRONG','WOOD','REINFORCED','WOOD_TILE','LVT','PVC'}
TILY={'TILE_PORC','TILE_POLISHED','TILE_BATH','MARBLE'}
done=set()
for o in meshes:
    eco=eco_of(o) or (eco_of(o.parent) if o.parent else None)
    for slot in o.material_slots:
        m=slot.material
        if not m or m.name in done: continue
        done.add(m.name)
        if not m.use_nodes: m.use_nodes=True
        nt=m.node_tree; bsdf=nt.nodes.get('Principled BSDF')
        if not bsdf: continue
        name=m.name or ''
        if '_glass' in name:
            for key in ('Transmission Weight','Transmission'):
                try: bsdf.inputs[key].default_value=1.0; break
                except Exception: pass
            bsdf.inputs['Roughness'].default_value=0.05
            try: bsdf.inputs['Alpha'].default_value=1.0
            except Exception: pass
        elif '_emit' in name:
            col=tuple(bsdf.inputs['Base Color'].default_value)
            try:
                bsdf.inputs['Emission Color'].default_value=col
                bsdf.inputs['Emission Strength'].default_value=40.0 if NIGHT else 10.0
            except Exception:
                try:
                    bsdf.inputs['Emission'].default_value=col
                    bsdf.inputs['Emission Strength'].default_value=40.0 if NIGHT else 10.0
                except Exception: pass
        # 바닥: 텍스처가 실려 왔으면 그대로(광 조정만), 없으면 프로시저럴
        if eco and str(eco.get('kind'))=='floor':
            code=str(eco.get('material') or '')
            if has_image_tex(nt):
                bsdf.inputs['Roughness'].default_value=0.3 if code in TILY else 0.55
            elif code in WOODY: wood_nodes(nt,tuple(bsdf.inputs['Base Color'].default_value))
            elif code in TILY: tile_nodes(nt,tuple(bsdf.inputs['Base Color'].default_value),5.0 if code=='TILE_BATH' else 3.3)

print('[ECOREAN] objects=%d rooms=%d span=%.1fm view=%s light=%s samples=%d'%(len(meshes),len(rooms),span,VIEW,LIGHT,SAMPLES))
bpy.ops.render.render(write_still=True)
print('[ECOREAN] saved:',scn.render.filepath)
