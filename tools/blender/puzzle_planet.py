# Wonder Window: Blender pilot (run headless: Blender -b -P pilot.py -- <outdir>)
# Builds Puzzle Planet, its orbiting jigsaw pieces and the rocket, lights them, bakes the full lighting
# (direct + indirect, soft shadows, bounce, bump detail) into textures and exports one GLB.
# On the TV these render as unlit textured meshes: the look of a lit, ray-traced scene at the cost of a texture.
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/ww_blender'
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 96
sc.render.bake.margin = 6

# ---------- world + lights (match the app: warm key from upper-left, cool rim, purple sky bounce)
world = bpy.data.worlds.new('sky'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.32, 0.26, 0.55, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 0.45
def light(name, kind, loc, energy, color, size=1.0):
    d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = color
    if kind == 'AREA': d.size = size
    if kind == 'SUN': d.angle = math.radians(8)
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
light('key', 'SUN', (-6, -8, 10), 3.0, (1.0, 0.95, 0.88))
light('rim', 'AREA', (8, 10, 3), 650, (0.55, 0.82, 1.0), 6)
light('fill', 'AREA', (0, -12, -4), 120, (0.8, 0.75, 1.0), 8)

def mat(name, build):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; build(nt, nt.nodes['Principled BSDF']); return m
def principled(color, rough=0.55, coat=0.0):
    def b(nt, p):
        p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = rough
        if coat: p.inputs['Coat Weight'].default_value = coat
    return b

# ---------- Puzzle Planet: orange world with raised puzzle-tile seams (Voronoi), warm colour variation
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
def planet_nodes(nt, p):
    """Painted jigsaw tiles (puzzle_color.png) with matching relief (puzzle_height.png): Puzzle Planet."""
    N = nt.nodes; L = nt.links
    col = N.new('ShaderNodeTexImage'); col.image = bpy.data.images.load(os.path.join(TEX, 'puzzle_color.png')); L.new(col.outputs['Color'], p.inputs['Base Color'])
    hgt = N.new('ShaderNodeTexImage'); hgt.image = bpy.data.images.load(os.path.join(TEX, 'puzzle_height.png')); hgt.image.colorspace_settings.name = 'Non-Color'
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.55; bump.inputs['Distance'].default_value = 0.06
    L.new(hgt.outputs['Color'], bump.inputs['Height']); L.new(bump.outputs['Normal'], p.inputs['Normal'])
    p.inputs['Roughness'].default_value = 0.5; p.inputs['Coat Weight'].default_value = 0.25
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=64, radius=3.2, location=(0, 0, 0))
planet = bpy.context.object; planet.name = 'planet_play'; bpy.ops.object.shade_smooth()
planet.data.materials.append(mat('planet', planet_nodes))

# ---------- jigsaw pieces on an orbit ring (one joined mesh = one draw call on the TV)
def jigsaw_outline(s=0.9, n=10):
    """Square tile with an outward knob on the bottom and right edges (counter-clockwise outline)."""
    h, r = s / 2, s * 0.17; pts = [(-h, -h)]
    for i in range(n + 1):                               # bottom edge knob, bulging down (-y)
        a = math.pi * i / n; pts.append((-r * math.cos(a), -h - r * math.sin(a)))
    pts.append((h, -h))
    for i in range(n + 1):                               # right edge knob, bulging right (+x)
        a = math.pi * i / n; pts.append((h + r * math.sin(a), -r * math.cos(a)))
    pts += [(h, h), (-h, h)]
    return pts
PIECE_COL = [(1.0, 0.79, 0.29), (0.30, 0.64, 1.0), (1.0, 0.42, 0.42), (0.25, 0.88, 0.66), (0.71, 0.49, 1.0), (1.0, 0.56, 0.82)]
pieces = []
for i, col in enumerate(PIECE_COL):
    me = bpy.data.meshes.new(f'piece{i}'); bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in jigsaw_outline()]; bm.faces.new(vs)
    bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(f'piece{i}', me); sc.collection.objects.link(o)
    sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.24; sol.offset = 0
    bev = o.modifiers.new('b', 'BEVEL'); bev.width = 0.06; bev.segments = 3; bev.limit_method = 'ANGLE'
    a = i / 6 * math.tau; o.location = (math.cos(a) * 5, math.sin(a) * 5, math.sin(a * 2) * 0.4)
    o.rotation_euler = (0.6 + i * 0.5, 0.3 * i, a)
    o.data.materials.append(mat(f'piece{i}', principled(col, 0.35, 0.4)))
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.shade_auto_smooth(angle=math.radians(40)) if hasattr(bpy.ops.object, 'shade_auto_smooth') else None
    o.select_set(False); pieces.append(o)

# ---------- rocket (Z up): lathed body, red nose, purple band, three fins, glowing porthole
def lathe(profile, seg=48):
    bm = bmesh.new(); prev = None; edges = []
    vs = [bm.verts.new((r, 0, z)) for r, z in profile]
    for a, b2 in zip(vs, vs[1:]): edges.append(bm.edges.new((a, b2)))
    bmesh.ops.spin(bm, geom=vs + edges, axis=(0, 0, 1), cent=(0, 0, 0), steps=seg, angle=math.tau, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return bm
def obj_from_bm(name, bm, material):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    o.data.materials.append(material); return o
prof = [(0.001, -1.1)] + [(max(0.001, 0.62 * math.sin(math.pi * (t / 24) ** 0.78) * (1 - 0.25 * t / 24)), t / 24 * 2.4 - 1.1) for t in range(1, 25)]
body = obj_from_bm('r_body', lathe(prof), mat('hull', principled((0.97, 0.96, 1.0), 0.28, 0.6)))
band = obj_from_bm('r_band', lathe([(0.625, -0.37), (0.635, -0.25), (0.625, -0.13)]), mat('band', principled((0.42, 0.29, 0.94), 0.35)))
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.22, location=(0, 0, 1.36)); nose = bpy.context.object; nose.scale = (1, 1, 1.35)
nose.data.materials.append(mat('nose', principled((1.0, 0.36, 0.45), 0.3, 0.5)))
fins = []
for k in range(3):
    me = bpy.data.meshes.new(f'fin{k}'); bm = bmesh.new()
    prof2 = [(0.0, 0.0), (0.45, -0.1), (0.78, -0.55), (0.82, -0.98), (0.4, -0.72), (0.0, -0.75)]
    vs = [bm.verts.new((x, 0, z)) for x, z in prof2]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(f'fin{k}', me); sc.collection.objects.link(o)
    s2 = o.modifiers.new('s', 'SOLIDIFY'); s2.thickness = 0.09; s2.offset = 0; b2 = o.modifiers.new('b', 'BEVEL'); b2.width = 0.025; b2.segments = 2
    o.location = (0, 0, -0.3); o.rotation_euler = (0, 0, k * math.tau / 3); o.data.materials.append(mat(f'fin{k}', principled((1.0, 0.36, 0.45), 0.35, 0.3)))
    fins.append(o)
bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.06, location=(0, -0.58, 0.38), rotation=(math.pi / 2, 0, 0)); ring = bpy.context.object
ring.data.materials.append(mat('ringgold', principled((1.0, 0.78, 0.29), 0.25, 0.3)))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.27, depth=0.05, location=(0, -0.56, 0.38), rotation=(math.pi / 2, 0, 0)); port = bpy.context.object
def glass(nt, p):
    p.inputs['Base Color'].default_value = (0.35, 0.75, 1.0, 1); p.inputs['Roughness'].default_value = 0.08
    p.inputs['Emission Color'].default_value = (0.4, 0.8, 1.0, 1); p.inputs['Emission Strength'].default_value = 0.6
port.data.materials.append(mat('glass', glass))
for o in [band, nose, ring, port] + fins:
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    o.select_set(False)
# join rocket parts into one mesh
bpy.ops.object.select_all(action='DESELECT')
for o in [body, band, nose, ring, port] + fins: o.select_set(True)
bpy.context.view_layer.objects.active = body; bpy.ops.object.join(); rocket = body; rocket.name = 'rocket'
rocket.location = (-4.8, -2.0, 0.9); rocket.rotation_euler = (math.radians(8), math.radians(-10), 0)
# join pieces
bpy.ops.object.select_all(action='DESELECT')
for o in pieces: o.select_set(True)
bpy.context.view_layer.objects.active = pieces[0]; bpy.ops.object.join(); orbit = pieces[0]; orbit.name = 'pieces'

# ---------- bake: unwrap, bake combined lighting per object into its own texture
def bake(o, size):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    if o.name != 'planet_play':
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02); bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new(o.name + '_bake', size, size, alpha=False)
    for slot in o.material_slots:
        nt = slot.material.node_tree; n = nt.nodes.new('ShaderNodeTexImage'); n.image = img; nt.nodes.active = n; n.select = True
    bpy.ops.object.bake(type='COMBINED', use_clear=True)
    img.filepath_raw = os.path.join(OUT, o.name + '_bake.png'); img.file_format = 'PNG'; img.save()
    # export material: just the baked texture (three.js shows it unlit)
    m = bpy.data.materials.new(o.name + '_baked'); m.use_nodes = True; nt = m.node_tree; p = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
    o.data.materials.clear(); o.data.materials.append(m)
    for poly in o.data.polygons: poly.material_index = 0
    print('baked', o.name, size, flush=True)
for o, size in [(planet, 2048), (orbit, 1024), (rocket, 1024)]: bake(o, size)

# keep only the three objects; export GLB (Y-up), JPEG textures to keep the APK small
for o in list(sc.objects):
    if o.name not in ('planet_play', 'pieces', 'rocket'): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'puzzle_planet.glb'), export_format='GLB', export_image_format='JPEG',
                          export_jpeg_quality=88, export_apply=True, export_yup=True, export_materials='EXPORT')
print('EXPORTED', os.path.join(OUT, 'puzzle_planet.glb'), flush=True)
