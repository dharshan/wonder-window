# Wonder Window intro (6 s): the rocket lifts off from behind Puzzle Planet, swoops past Maker Planet and
# Story Moon, and the title appears. Uses the baked space_home.glb (emission shading keeps the baked look).
# Blender -b --factory-startup -P intro.py -- <space_home.glb> <Fredoka.ttf> <out.mp4>
import bpy, math, sys, random
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; GLB, FONT, OUT = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE_NEXT'; sc.render.resolution_x, sc.render.resolution_y = 1280, 720; sc.render.fps = 30
sc.frame_start, sc.frame_end = 1, 180; sc.eevee.taa_render_samples = 16
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.012, 0.008, 0.05, 1)
bpy.ops.import_scene.gltf(filepath=GLB)
# baked colour → emission so the scene looks exactly as on the TV
for m in bpy.data.materials:
    if not m.use_nodes: continue
    nt = m.node_tree; p = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None); img = next((n for n in nt.nodes if n.type == 'TEX_IMAGE'), None)
    if p and img:
        em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(img.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = 1.0
        out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
O = bpy.data.objects
# glTF import is Y-up converted back to Z-up; lay the planets out like the app's home
def place(names, loc):
    for n in names:
        if n in O: O[n].location = Vector(loc) + (O[n].location if n in ('observatory', 'moonlet') else Vector((0, 0, 0)))
place(['planet_play', 'pieces'], (-11, 0, -1.2)); place(['planet_try', 'rings'], (0, 5, 1.4)); place(['planet_watch', 'observatory', 'moonlet'], (11, 0, -0.6))
for n in ('planet_play', 'planet_try', 'planet_watch'):
    o = O[n]; o.rotation_mode = 'XYZ'; o.keyframe_insert('rotation_euler', frame=1); o.rotation_euler.z += 0.5; o.keyframe_insert('rotation_euler', frame=180)
# stars: a shell of small emissive icospheres
random.seed(3); star = bpy.data.materials.new('star'); star.use_nodes = True; nt = star.node_tree
e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (0.95, 0.95, 1, 1); e.inputs['Strength'].default_value = 3
nt.links.new(e.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.12); s0 = bpy.context.object; s0.data.materials.append(star)
for i in range(700):
    u, th, r = random.uniform(-1, 1), random.uniform(0, math.tau), random.uniform(80, 140); q = math.sqrt(1 - u * u)
    s = s0.copy(); s.location = (r * q * math.cos(th), r * q * math.sin(th), r * u); s.scale = [random.uniform(.5, 2.2)] * 3; sc.collection.objects.link(s)
# rocket path + flame
R = O['rocket']; R.rotation_mode = 'QUATERNION'
flame_mat = bpy.data.materials.new('flame'); flame_mat.use_nodes = True; fn = flame_mat.node_tree
fe = fn.nodes.new('ShaderNodeEmission'); fe.inputs['Color'].default_value = (1, 0.6, 0.2, 1); fe.inputs['Strength'].default_value = 6
fn.links.new(fe.outputs['Emission'], fn.nodes['Material Output'].inputs['Surface'])
bpy.ops.mesh.primitive_cone_add(radius1=0.33, depth=1.2, location=(0, 0, -1.7), rotation=(math.pi, 0, 0)); flame = bpy.context.object; flame.data.materials.append(flame_mat); flame.parent = R
path = [(1, (-11, -1, -6)), (35, (-9, -2, 2.5)), (75, (-3, -4, 4.5)), (110, (4, -3, 3.0)), (140, (9, -6, 2.0)), (180, (16, -12, 4.5))]
prev = None
for f, p in path:
    R.location = p; R.keyframe_insert('location', frame=f)
for f in range(1, 181, 3):
    sc.frame_set(f); here = R.matrix_world.translation.copy(); sc.frame_set(min(180, f + 3)); nxt = R.matrix_world.translation.copy(); sc.frame_set(f)
    d = (nxt - here); d = d.normalized() if d.length > 1e-4 else Vector((0, 0, 1))
    R.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d); R.keyframe_insert('rotation_quaternion', frame=f)
for f in range(1, 181, 2):
    flame.scale = (1, 1, 0.8 + 0.4 * random.random()); flame.keyframe_insert('scale', frame=f)
# camera: starts low on Puzzle Planet, follows the rocket, pulls back to the three planets for the title
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 32; cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(tgt)
c = cam.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
for f, cp, tp in [(1, (-15, -16, -1), (-11, 0, -2)), (40, (-12, -18, 2), (-9, -2, 2)), (90, (-4, -22, 5), (-2, -3, 4)), (140, (4, -26, 6), (5, -3, 2)), (180, (0, -34, 4), (0, 0, 1.5))]:
    cam.location = cp; cam.keyframe_insert('location', frame=f); tgt.location = tp; tgt.keyframe_insert('location', frame=f)
# title
bpy.ops.object.text_add(location=(0, -12, 6.2), rotation=(math.radians(80), 0, 0)); t = bpy.context.object; t.data.body = 'Wonder Window'
t.data.font = bpy.data.fonts.load(FONT); t.data.align_x = 'CENTER'; t.data.size = 2.5; t.data.extrude = 0.14; t.data.offset = 0.045; t.data.bevel_depth = 0.02
tm = bpy.data.materials.new('title'); tm.use_nodes = True; tn = tm.node_tree; te = tn.nodes.new('ShaderNodeEmission'); te.inputs['Color'].default_value = (1, 0.79, 0.29, 1); te.inputs['Strength'].default_value = 1.6
tn.links.new(te.outputs['Emission'], tn.nodes['Material Output'].inputs['Surface']); t.data.materials.append(tm)
t.scale = (0.001,) * 3; t.keyframe_insert('scale', frame=138); t.scale = (1.08,) * 3; t.keyframe_insert('scale', frame=152); t.scale = (1,) * 3; t.keyframe_insert('scale', frame=158)
# soft glow on emissive things
sc.use_nodes = True; ct = sc.node_tree; rl = ct.nodes['Render Layers']; comp = ct.nodes['Composite']
gl = ct.nodes.new('CompositorNodeGlare'); gl.glare_type = 'FOG_GLOW'; gl.quality = 'HIGH'; gl.threshold = 0.85; gl.size = 7
ct.links.new(rl.outputs['Image'], gl.inputs['Image']); ct.links.new(gl.outputs['Image'], comp.inputs['Image'])
sc.render.image_settings.file_format = 'FFMPEG'; sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.ffmpeg.constant_rate_factor = 'HIGH'
sc.render.filepath = OUT
bpy.ops.render.render(animation=True); print('RENDERED', OUT, flush=True)
