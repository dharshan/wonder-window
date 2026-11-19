# Wonder Window: Blender asset build (headless): Blender -b --factory-startup -P space.py -- <outdir> [home|props|all]
# Builds the three home planets with their orbiters and the rocket (space_home.glb), plus the game props
# (props.glb: answer tile and pedestal). Everything is lit once in Cycles and the lighting is baked into
# textures; the TV shows them unlit, so they cost the same as flat-coloured meshes.
import bpy, bmesh, math, sys, os
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else '/tmp/ww_blender'; WHAT = ARGS[1] if len(ARGS) > 1 else 'all'
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
os.makedirs(OUT, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 96; sc.render.bake.margin = 6
    w = bpy.data.worlds.new('sky'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.36, 0.32, 0.58, 1); bg.inputs[1].default_value = 0.32
    def light(name, kind, loc, energy, color, size=1.0):
        d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = color
        if kind == 'AREA': d.size = size
        if kind == 'SUN': d.angle = math.radians(8)
        o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    light('key', 'SUN', (-6, -8, 10), 3.4, (1.0, 0.95, 0.88))
    light('rim', 'AREA', (8, 10, 3), 600, (0.55, 0.82, 1.0), 6)
    light('fill', 'AREA', (0, -12, -4), 90, (0.85, 0.8, 1.0), 8)
    return sc

def mat(name, build):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; build(nt, nt.nodes['Principled BSDF']); return m
def principled(color, rough=0.5, coat=0.0, emit=None):
    def b(nt, p):
        p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = rough
        if coat: p.inputs['Coat Weight'].default_value = coat
        if emit: p.inputs['Emission Color'].default_value = (*emit[0], 1); p.inputs['Emission Strength'].default_value = emit[1]
    return b
def textured(color_file, height_file, bump=0.55, rough=0.5, coat=0.25):
    def b(nt, p):
        N, L = nt.nodes, nt.links
        c = N.new('ShaderNodeTexImage'); c.image = bpy.data.images.load(os.path.join(TEX, color_file)); L.new(c.outputs['Color'], p.inputs['Base Color'])
        h = N.new('ShaderNodeTexImage'); h.image = bpy.data.images.load(os.path.join(TEX, height_file)); h.image.colorspace_settings.name = 'Non-Color'
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.06
        L.new(h.outputs['Color'], bp.inputs['Height']); L.new(bp.outputs['Normal'], p.inputs['Normal'])
        p.inputs['Roughness'].default_value = rough; p.inputs['Coat Weight'].default_value = coat
    return b

def link(name, me, material=None):
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if material: o.data.materials.append(material)
    return o
def apply_mods(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = name; return objs[0]
def sphere(name, r, material, seg=96, rings=64, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc); o = bpy.context.object; o.name = name
    bpy.ops.object.shade_smooth(); o.data.materials.append(material); return o
def lathe(profile, seg=48):
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in profile]; es = [bm.edges.new((a, b)) for a, b in zip(vs, vs[1:])]
    bmesh.ops.spin(bm, geom=vs + es, axis=(0, 0, 1), cent=(0, 0, 0), steps=seg, angle=math.tau, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('lathe'); bm.to_mesh(me); bm.free(); return me
def flat_poly(name, pts, thick, bevel, material):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); vs = [bm.verts.new((x, y, 0)) for x, y in pts]; bm.faces.new(vs)
    bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free(); o = link(name, me, material)
    s = o.modifiers.new('s', 'SOLIDIFY'); s.thickness = thick; s.offset = 0
    b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = 3; b.limit_method = 'ANGLE'; apply_mods(o); return o

def bake(o, size, unwrap=True):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    if unwrap:
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02); bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new(o.name + '_bake', size, size, alpha=False)
    for slot in o.material_slots:
        nt = slot.material.node_tree; n = nt.nodes.new('ShaderNodeTexImage'); n.image = img; nt.nodes.active = n; n.select = True
    bpy.ops.object.bake(type='COMBINED', use_clear=True)
    img.filepath_raw = os.path.join(OUT, o.name + '_bake.png'); img.file_format = 'PNG'; img.save()
    m = bpy.data.materials.new(o.name + '_baked'); m.use_nodes = True; nt = m.node_tree; t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
    nt.links.new(t.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    o.data.materials.clear(); o.data.materials.append(m)
    for poly in o.data.polygons: poly.material_index = 0
    print('baked', o.name, size, flush=True)

def export(names, file):
    for o in list(bpy.context.scene.objects):
        if o.name not in names: bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, file), export_format='GLB', export_image_format='JPEG', export_jpeg_quality=88, export_apply=True, export_yup=True)
    print('EXPORTED', file, flush=True)

# ------------------------------------------------------------------ home: three planets, orbiters, rocket
def build_home():
    reset(); bakes = []
    # Puzzle Planet (+ jigsaw pieces)
    play = sphere('planet_play', 3.2, mat('play', textured('puzzle_color.png', 'puzzle_height.png')))
    def jig(s=0.9, n=10):
        h, r = s / 2, s * 0.17; pts = [(-h, -h)]
        for i in range(n + 1): a = math.pi * i / n; pts.append((-r * math.cos(a), -h - r * math.sin(a)))
        pts.append((h, -h))
        for i in range(n + 1): a = math.pi * i / n; pts.append((h + r * math.sin(a), -r * math.cos(a)))
        return pts + [(h, h), (-h, h)]
    cols = [(1.0, 0.72, 0.12), (0.18, 0.55, 1.0), (1.0, 0.30, 0.32), (0.15, 0.85, 0.58), (0.62, 0.36, 1.0), (1.0, 0.42, 0.75)]
    ps = []
    for i, c in enumerate(cols):
        o = flat_poly(f'piece{i}', jig(), 0.24, 0.06, mat(f'pc{i}', principled(c, 0.32, 0.5)))
        a = i / 6 * math.tau; o.location = (math.cos(a) * 5, math.sin(a) * 5, math.sin(a * 2) * 0.4); o.rotation_euler = (0.6 + i * 0.5, 0.3 * i, a); ps.append(o)
    pieces = join(ps, 'pieces')
    # Maker Planet (+ rainbow rings)
    trypl = sphere('planet_try', 3.2, mat('try', textured('maker_color.png', 'maker_height.png', 0.45, 0.45, 0.3)))
    ringcols = [(1.0, 0.36, 0.36), (1.0, 0.6, 0.2), (1.0, 0.82, 0.25), (0.25, 0.88, 0.62), (0.3, 0.6, 1.0), (0.66, 0.42, 1.0)]
    rs = []
    for k, c in enumerate(ringcols):
        bpy.ops.mesh.primitive_torus_add(major_radius=4.3 + k * 0.22, minor_radius=0.085, major_segments=160, minor_segments=10); r = bpy.context.object
        bpy.ops.object.shade_smooth(); r.data.materials.append(mat(f'ring{k}', principled(c, 0.3, 0.4))); rs.append(r)
    rings = join(rs, 'rings')
    # Story Moon (+ observatory with a glowing window, moonlet)
    watch = sphere('planet_watch', 3.2, mat('watch', textured('moon_color.png', 'moon_height.png', 0.9, 0.75, 0.0)))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.75, location=(0, 0, 3.1)); dome = bpy.context.object
    bpy.ops.object.shade_smooth(); dome.data.materials.append(mat('dome', principled((0.95, 0.93, 1.0), 0.25, 0.6)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.78, depth=0.25, location=(0, 0, 3.0)); base = bpy.context.object; base.data.materials.append(mat('dbase', principled((0.42, 0.29, 0.94), 0.4)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.25, depth=0.06, location=(0, -0.7, 3.45), rotation=(math.radians(70), 0, 0)); win = bpy.context.object
    win.data.materials.append(mat('dwin', principled((1.0, 0.8, 0.4), 0.3, 0, ((1.0, 0.75, 0.3), 6.0))))
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.07, depth=0.9, location=(0.35, -0.2, 3.75), rotation=(math.radians(-35), math.radians(20), 0)); scope = bpy.context.object
    scope.data.materials.append(mat('scope', principled((0.98, 0.78, 0.29), 0.3, 0.3)))
    obs = join([dome, base, win, scope], 'observatory')
    moonlet = sphere('moonlet', 0.55, mat('moonlet', textured('moon_color.png', 'moon_height.png', 0.9, 0.8, 0.0)), 48, 32)
    # rocket (vivid red fins and nose, white hull, purple band, glowing porthole)
    prof = [(0.001, -1.1)] + [(max(0.001, 0.62 * math.sin(math.pi * (t / 24) ** 0.78) * (1 - 0.25 * t / 24)), t / 24 * 2.4 - 1.1) for t in range(1, 25)]
    body = link('rbody', lathe(prof), mat('hull', principled((0.98, 0.97, 1.0), 0.25, 0.7))); bpy.context.view_layer.objects.active = body
    band = link('rband', lathe([(0.625, -0.37), (0.635, -0.25), (0.625, -0.13)]), mat('band', principled((0.40, 0.24, 0.95), 0.3, 0.4)))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.22, location=(0, 0, 1.36)); nose = bpy.context.object; nose.scale = (1, 1, 1.35)
    bpy.ops.object.shade_smooth(); nose.data.materials.append(mat('nose', principled((0.96, 0.22, 0.26), 0.28, 0.6)))
    fins = []
    for k in range(3):
        f = flat_poly(f'fin{k}', [(0.0, 0.0), (0.45, -0.1), (0.78, -0.55), (0.82, -0.98), (0.4, -0.72), (0.0, -0.75)], 0.09, 0.025, mat(f'fin{k}', principled((0.96, 0.22, 0.26), 0.3, 0.5)))
        f.rotation_euler = (math.pi / 2, 0, k * math.tau / 3); f.location = (0, 0, -0.3); fins.append(f)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.06, location=(0, -0.58, 0.38), rotation=(math.pi / 2, 0, 0)); ring = bpy.context.object
    ring.data.materials.append(mat('gold', principled((1.0, 0.76, 0.22), 0.22, 0.4)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.27, depth=0.05, location=(0, -0.56, 0.38), rotation=(math.pi / 2, 0, 0)); port = bpy.context.object
    port.data.materials.append(mat('glass', principled((0.35, 0.75, 1.0), 0.08, 0, ((0.4, 0.8, 1.0), 0.8))))
    rocket = join([body, band, nose, ring, port] + fins, 'rocket')
    # light every set as it appears in the app: planet at the origin with its orbiters around it
    for o in (trypl, watch): o.location.x = 40 if o is trypl else 80
    rings.location.x = 40; obs.location.x = 80; moonlet.location = (80 + 5.4, 0, 0.8); rocket.location = (-4.8, -2.0, 0.9)
    for o, size, uv in [(play, 2048, False), (pieces, 1024, True), (trypl, 2048, False), (rings, 1024, True), (watch, 2048, False), (obs, 512, True), (moonlet, 512, False), (rocket, 1024, True)]: bake(o, size, uv)
    for o in (trypl, rings): o.location.x -= 40
    for o in (watch, obs, moonlet): o.location.x -= 80
    rocket.location = (0, 0, 0)
    export(['planet_play', 'pieces', 'planet_try', 'rings', 'planet_watch', 'observatory', 'moonlet', 'rocket'], 'space_home.glb')

# ------------------------------------------------------------------ game props: answer tile + pedestal (white, tinted in the app)
def build_props():
    reset()
    def rbox(w, h, d, r):
        bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.scale = (w, d, h); bpy.ops.object.transform_apply(scale=True)
        b = o.modifiers.new('b', 'BEVEL'); b.width = r; b.segments = 6; apply_mods(o); bpy.ops.object.shade_smooth(); return o
    tile = rbox(2.05, 2.05, 0.5, 0.3); tile.name = 'tile'; tile.data.materials.append(mat('tile', principled((0.92, 0.92, 0.92), 0.35, 0.6)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.15, depth=0.5, location=(0, 0, 0)); ped = bpy.context.object; ped.name = 'pedestal'
    b = ped.modifiers.new('b', 'BEVEL'); b.width = 0.08; b.segments = 4; apply_mods(ped); bpy.ops.object.shade_smooth()
    ped.data.materials.append(mat('ped', principled((0.92, 0.92, 0.92), 0.45, 0.2)))
    ped.location.x = 10
    for o, size in [(tile, 1024), (ped, 512)]: bake(o, size)
    ped.location.x = 0
    export(['tile', 'pedestal'], 'props.glb')

if WHAT in ('home', 'all'): build_home()
if WHAT in ('props', 'all'): build_props()
