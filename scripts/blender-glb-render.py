# ============================================================================
#  ECOREAN MiniCAD 3D → Blender 사실적 렌더 (2단계)
#  사용:  blender -b -P scripts/blender-glb-render.py -- <입력.glb> <출력.png> [samples] [view]
#    view: iso(기본) | front | top
#  MiniCAD 3D 의 [⬇GLB] 파일을 그대로 받는다.
#   - 재질 이름 MC_<hex>[_glass|_emit] → 유리/발광 자동 변환
#   - 객체 extras.ecorean(kind/type/재질 코드) → 바닥 원목·타일 프로시저럴 재질 자동 적용
#  Copyright (c) 2026 ECOREAN.
# ============================================================================
import bpy, sys, math, os

argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(argv)<2:
    print('usage: blender -b -P blender-glb-render.py -- in.glb out.png [samples] [view]'); sys.exit(1)
GLB, OUT = argv[0], argv[1]
SAMPLES = int(argv[2]) if len(argv)>2 else 96
VIEW = argv[3] if len(argv)>3 else 'iso'

# --- 빈 장면으로 ---
bpy.ops.wm.read_factory_settings(use_empty=True)
scn=bpy.context.scene

# --- GLB 가져오기 (extras 는 오브젝트 커스텀 프로퍼티로 들어온다) ---
bpy.ops.import_scene.gltf(filepath=GLB)

# --- 렌더 설정: Cycles + 디노이즈 ---
scn.render.engine='CYCLES'
scn.cycles.samples=SAMPLES
try: scn.cycles.use_denoising=True
except Exception: pass
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='OPTIX'
    prefs.get_devices()
    for d in prefs.devices: d.use=True
    scn.cycles.device='GPU'
except Exception:
    scn.cycles.device='CPU'
scn.render.resolution_x=1920; scn.render.resolution_y=1280
scn.render.image_settings.file_format='PNG'
scn.render.filepath=os.path.abspath(OUT)
scn.view_settings.view_transform='Filmic' if 'Filmic' in [i.identifier for i in type(scn.view_settings).bl_rna.properties['view_transform'].enum_items] else scn.view_settings.view_transform

# --- 월드: 하늘 + 은은한 주광 ---
w=bpy.data.worlds.new('W'); scn.world=w; w.use_nodes=True
bg=w.node_tree.nodes['Background']; bg.inputs[0].default_value=(0.75,0.82,0.95,1); bg.inputs[1].default_value=0.55

# --- 경계 상자 ---
mins=[1e9]*3; maxs=[-1e9]*3
meshes=[o for o in scn.objects if o.type=='MESH']
for o in meshes:
    for c in o.bound_box:
        p=o.matrix_world @ __import__('mathutils').Vector(c)
        for i in range(3):
            mins[i]=min(mins[i],p[i]); maxs[i]=max(maxs[i],p[i])
cx,cy,cz=[(mins[i]+maxs[i])/2 for i in range(3)]
span=max(maxs[0]-mins[0],maxs[1]-mins[1],1.0)

# --- 태양 ---
sun=bpy.data.objects.new('Sun',bpy.data.lights.new('Sun','SUN'))
sun.data.energy=3.2; sun.data.angle=math.radians(4)
sun.rotation_euler=(math.radians(50),0,math.radians(35))
scn.collection.objects.link(sun)

# --- 카메라 ---
cam=bpy.data.objects.new('Cam',bpy.data.cameras.new('Cam'))
scn.collection.objects.link(cam); scn.camera=cam
def look_at(obj,tgt):
    d=(__import__('mathutils').Vector(tgt)-obj.location)
    obj.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
if VIEW=='top':
    cam.location=(cx,cy,cz+span*1.7); look_at(cam,(cx,cy,cz))
elif VIEW=='front':
    cam.location=(cx,mins[1]-span*1.1,cz+span*0.18); look_at(cam,(cx,cy,cz))
else:
    cam.location=(cx+span*0.75,mins[1]-span*0.85,maxs[2]+span*0.85); look_at(cam,(cx,cy,(mins[2]+cz)/2))
cam.data.lens=32

# --- 재질 변환 ---
def hex_to_rgb(h):
    try:
        h=h.strip('#'); r=int(h[0:2],16)/255; g=int(h[2:4],16)/255; b=int(h[4:6],16)/255
        # sRGB → linear
        f=lambda u:(u/12.92) if u<=0.04045 else (((u+0.055)/1.055)**2.4)
        return (f(r),f(g),f(b),1.0)
    except Exception: return (0.8,0.8,0.8,1.0)

def wood_nodes(nt,base):
    n=nt.nodes; bsdf=n.get('Principled BSDF')
    tex=n.new('ShaderNodeTexWave'); tex.wave_type='BANDS'; tex.inputs['Scale'].default_value=1.6
    tex.inputs['Distortion'].default_value=6.0; tex.inputs['Detail'].default_value=2.0
    ramp=n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=base
    dark=tuple(c*0.55 for c in base[:3])+(1.0,)
    ramp.color_ramp.elements[1].color=dark
    nt.links.new(tex.outputs['Color'],ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=0.55

def tile_nodes(nt,base,scale=3.3):
    n=nt.nodes; bsdf=n.get('Principled BSDF')
    brick=n.new('ShaderNodeTexBrick')
    brick.offset=0.0
    brick.inputs['Scale'].default_value=scale
    brick.inputs['Mortar Size'].default_value=0.006
    brick.inputs['Color1'].default_value=base
    brick.inputs['Color2'].default_value=tuple(c*0.93 for c in base[:3])+(1.0,)
    brick.inputs['Mortar'].default_value=(0.25,0.25,0.25,1)
    nt.links.new(brick.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=0.28

WOODY={'STRONG','WOOD','REINFORCED','WOOD_TILE','LVT','PVC'}
TILY={'TILE_PORC','TILE_POLISHED','TILE_BATH','MARBLE'}

for o in meshes:
    eco=None
    try:
        e=o.get('ecorean') or (o.parent.get('ecorean') if o.parent else None)
        if e is not None: eco=dict(e)
    except Exception: pass
    for slot in o.material_slots:
        m=slot.material
        if not m: continue
        if not m.use_nodes: m.use_nodes=True
        nt=m.node_tree; bsdf=nt.nodes.get('Principled BSDF')
        if not bsdf: continue
        name=m.name or ''
        if '_glass' in name:
            try:
                bsdf.inputs['Transmission Weight'].default_value=1.0
            except Exception:
                try: bsdf.inputs['Transmission'].default_value=1.0
                except Exception: pass
            bsdf.inputs['Roughness'].default_value=0.05
            m.blend_method='BLEND' if hasattr(m,'blend_method') else m.blend_method
        elif '_emit' in name:
            col=bsdf.inputs['Base Color'].default_value[:]
            try:
                bsdf.inputs['Emission Color'].default_value=col
                bsdf.inputs['Emission Strength'].default_value=14.0
            except Exception:
                try:
                    bsdf.inputs['Emission'].default_value=col
                    bsdf.inputs['Emission Strength'].default_value=14.0
                except Exception: pass
        # 바닥: extras 의 재질 코드로 프로시저럴
        if eco and eco.get('kind')=='floor':
            code=str(eco.get('material') or '')
            base=bsdf.inputs['Base Color'].default_value[:]
            if code in WOODY: wood_nodes(nt,tuple(base))
            elif code in TILY: tile_nodes(nt,tuple(base),5.0 if code=='TILE_BATH' else 3.3)

print('[ECOREAN] objects=%d span=%.1fm view=%s samples=%d'%(len(meshes),span,VIEW,SAMPLES))
bpy.ops.render.render(write_still=True)
print('[ECOREAN] saved:',scn.render.filepath)
