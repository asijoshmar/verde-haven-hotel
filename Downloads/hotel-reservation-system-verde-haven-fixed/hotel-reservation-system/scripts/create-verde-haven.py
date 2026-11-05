
import bpy
import math
import os

# =====================================================
# VERDE HAVEN BOUTIQUE HOTEL
# Blender 5.2 | 7 rooms | GLB for Vue + Three.js
# =====================================================

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_DIR = os.path.join(ROOT, "frontend", "public", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Clear default scene
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

scene = bpy.context.scene
scene.unit_settings.system = "METRIC"

# ---------- MATERIALS ----------
def make_material(name, color, roughness=0.7, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat

ivory = make_material("Warm Ivory", (0.84, 0.80, 0.70))
forest = make_material("Verde Forest Green", (0.055, 0.19, 0.12))
oak = make_material("Natural Oak", (0.39, 0.23, 0.12))
light_oak = make_material("Light Oak", (0.65, 0.46, 0.27))
linen = make_material("Cream Linen", (0.94, 0.91, 0.83))
mattress_mat = make_material("Mattress", (0.83, 0.80, 0.72))
stone = make_material("Sandstone Flooring", (0.56, 0.48, 0.36))
glass = make_material("Window Glass", (0.20, 0.49, 0.53), 0.22, 0.1)
brass = make_material("Champagne Brass", (0.68, 0.45, 0.17), 0.3, 0.5)
dark = make_material("Dark Bronze", (0.075, 0.085, 0.07), 0.35, 0.3)
leaf = make_material("Tropical Greenery", (0.10, 0.30, 0.12))
ceramic = make_material("Bathroom Ceramic", (0.82, 0.86, 0.81))

ACTIVE_ROOM = None

# ---------- BASIC MODEL HELPERS ----------
def cube(name, loc, size, mat, bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(
        location=False, rotation=False, scale=True
    )

    if mat:
        obj.data.materials.append(mat)

    if bevel:
        mod = obj.modifiers.new("Soft Edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        obj.modifiers.new("Weighted Normals", "WEIGHTED_NORMAL")

    if ACTIVE_ROOM:
        obj.parent = ACTIVE_ROOM

    return obj

def cylinder(name, loc, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24, radius=radius, depth=depth, location=loc
    )
    obj = bpy.context.object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if ACTIVE_ROOM:
        obj.parent = ACTIVE_ROOM
    return obj

def sphere(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16, ring_count=8, location=loc
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(
        location=False, rotation=False, scale=True
    )
    if mat:
        obj.data.materials.append(mat)
    if ACTIVE_ROOM:
        obj.parent = ACTIVE_ROOM
    return obj

def plant(name, x, y, z=0):
    cylinder(name + " Pot", (x, y, z + 0.20), 0.20, 0.38, dark)
    cylinder(name + " Stem", (x, y, z + 0.65), 0.035, 0.75, oak)
    for i in range(6):
        a = i * math.tau / 6
        sphere(
            name + " Leaf",
            (x + math.cos(a) * 0.20,
             y + math.sin(a) * 0.17,
             z + 0.82 + (i % 3) * 0.12),
            (0.12, 0.09, 0.27), leaf
        )

def make_bed(name, x, y, z=0, width=1.55, length=2.05):
    cube(name + " Base", (x, y, z + 0.28),
         (width, length, 0.38), oak)
    cube(name + " Mattress", (x, y, z + 0.51),
         (width - 0.08, length - 0.08, 0.16), mattress_mat)
    cube(name + " Duvet", (x, y - 0.30, z + 0.61),
         (width - 0.12, length * 0.52, 0.055), linen)
    cube(name + " Headboard", (x, y + length / 2, z + 0.72),
         (width + 0.12, 0.12, 1.0), forest)

    for side in (-1, 1):
        cube(name + " Pillow", (x + side * width * 0.23,
             y + length * 0.29, z + 0.63),
             (0.48, 0.36, 0.10), linen)

def make_room(room_id, room_type, cx, cy, width=3.7, depth=4.4):
    global ACTIVE_ROOM

    # Root object for room identification in Three.js
    ACTIVE_ROOM = bpy.data.objects.new("ROOM_" + room_id, None)
    bpy.context.collection.objects.link(ACTIVE_ROOM)
    ACTIVE_ROOM.empty_display_type = "CUBE"
    ACTIVE_ROOM["room_id"] = int(room_id)
    ACTIVE_ROOM["room_number"] = room_id
    ACTIVE_ROOM["room_type"] = room_type

    x, y = cx, cy
    prefix = "Room " + room_id + " "

    # Floor and walls
    cube(prefix + "Floor", (x, y, 0.08),
         (width, depth, 0.16), stone)
    cube(prefix + "Back Wall", (x, y + depth / 2, 1.5),
         (width, 0.14, 3.0), ivory)
    cube(prefix + "Left Wall", (x - width / 2, y, 1.5),
         (0.14, depth, 3.0), ivory)
    cube(prefix + "Right Wall", (x + width / 2, y, 1.5),
         (0.14, depth, 3.0), ivory)

    # Window with frame
    cube(prefix + "Window", (x, y + depth / 2 - 0.09, 2.0),
         (1.45, 0.05, 1.15), glass)
    cube(prefix + "Window Frame Vertical",
         (x, y + depth / 2 - 0.14, 2.0),
         (0.055, 0.06, 1.18), dark)
    cube(prefix + "Window Sill",
         (x, y + depth / 2 - 0.16, 1.40),
         (1.65, 0.18, 0.10), oak)

    # Furnished bed
    make_bed(prefix + "Bed", x - 0.25, y - 0.30,
             width=1.50 if room_type != "Family Room" else 1.75)

    # Bedside tables and lamps
    for side in (-1, 1):
        tx = x - 0.25 + side * 1.02
        ty = y + 0.75
        cube(prefix + "Nightstand", (tx, ty, 0.40),
             (0.42, 0.42, 0.62), oak)
        cylinder(prefix + "Lamp Base", (tx, ty, 0.74),
                 0.10, 0.05, brass)
        cylinder(prefix + "Lamp Shade", (tx, ty, 0.91),
                 0.12, 0.24, linen)

    # Wardrobe
    cube(prefix + "Wardrobe", (x - 1.40, y - 1.40, 1.10),
         (0.48, 0.90, 2.20), oak)
    cube(prefix + "Wardrobe Handle", (x - 1.15, y - 1.40, 1.12),
         (0.025, 0.045, 0.24), brass)

    # Desk and chair
    cube(prefix + "Desk Top", (x + 1.10, y - 1.50, 0.78),
         (0.70, 1.0, 0.12), light_oak)
    cube(prefix + "Desk Support", (x + 1.10, y - 1.50, 0.40),
         (0.55, 0.75, 0.68), oak)
    cube(prefix + "Chair Seat", (x + 1.10, y - 0.78, 0.48),
         (0.48, 0.45, 0.12), forest)
    cube(prefix + "Chair Back", (x + 1.10, y - 0.57, 0.76),
         (0.48, 0.10, 0.60), oak)

    # Bathroom corner
    bx, by = x + width / 2 - 0.58, y + depth / 2 - 0.83
    cube(prefix + "Bathroom Floor", (bx, by, 0.17),
         (1.0, 1.42, 0.08), ceramic)
    cube(prefix + "Bathroom Partition", (bx - 0.53, by, 1.05),
         (0.08, 1.42, 2.1), ivory)
    cube(prefix + "Vanity", (bx + 0.12, by - 0.38, 0.70),
         (0.50, 0.38, 0.12), light_oak)
    sphere(prefix + "Sink", (bx + 0.12, by - 0.38, 0.79),
           (0.17, 0.12, 0.07), ceramic)
    cylinder(prefix + "Toilet", (bx + 0.10, by + 0.34, 0.36),
             0.18, 0.48, ceramic)
    cube(prefix + "Toilet Tank", (bx + 0.10, by + 0.50, 0.58),
         (0.34, 0.16, 0.40), ceramic)

    plant(prefix + "Indoor Plant", x - 1.30, y + 0.15)

    ACTIVE_ROOM = None

# ---------- HOTEL FOUNDATION ----------
cube("Hotel Foundation", (0, 0, -0.16), (19, 14, 0.32), dark)
cube("Hotel Common Floor", (0, 0, 0.015), (18.5, 13.5, 0.08), stone)

# Seven rooms matching the existing database IDs
room_data = [
    ("101", "Standard Room", -6.0, 4.0),
    ("102", "Standard Room", -2.0, 4.0),
    ("201", "Deluxe Room",    2.0, 4.0),
    ("202", "Deluxe Room",    6.0, 4.0),
    ("301", "Family Room",   -4.0, -4.0),
    ("302", "Family Room",    0.0, -4.0),
    ("401", "Suite Room",     4.0, -4.0),
]

for room_id, room_type, x, y in room_data:
    make_room(room_id, room_type, x, y)

# ---------- RECEPTION AND LOBBY ----------
cube("Reception Counter", (-6.1, -0.15, 0.62),
     (2.0, 0.80, 1.15), oak)
cube("Reception Countertop", (-6.1, -0.15, 1.22),
     (2.10, 0.90, 0.10), brass)
cube("Reception Feature Wall", (-6.1, 0.55, 1.80),
     (2.5, 0.14, 2.20), forest)
cube("Reception Sign", (-6.1, 0.46, 2.15),
     (1.80, 0.06, 0.40), brass)

for x in (-1.0, 1.0):
    cube("Lobby Bench Seat", (x, 0.0, 0.45),
         (1.30, 0.45, 0.15), light_oak)
    cube("Lobby Bench Base", (x, 0.0, 0.25),
         (1.10, 0.30, 0.35), oak)

plant("Lobby Plant", -8.0, -1.0)
plant("Lobby Plant", -4.0, -1.0)
plant("Entrance Plant", 8.0, -5.5)
plant("Garden Plant", 8.0, 5.5)

# Entrance canopy and columns
cube("Entrance Steps", (0, -7.0, 0.02),
     (4.0, 1.0, 0.18), light_oak)
cube("Entrance Canopy", (0, -6.1, 3.05),
     (4.2, 1.4, 0.20), forest)

for x in (-1.8, 1.8):
    cube("Entrance Column", (x, -6.15, 1.50),
         (0.16, 0.16, 3.0), oak)

# ---------- LIGHTS AND CAMERA ----------
world = bpy.data.worlds.new("Verde Haven World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (
    0.40, 0.45, 0.40, 1
)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.45

bpy.ops.object.light_add(type="AREA", location=(0, 0, 14))
light = bpy.context.object
light.name = "Hotel Soft Lighting"
light.data.energy = 2200
light.data.shape = "DISK"
light.data.size = 12

bpy.ops.object.camera_add(location=(18, -23, 22))
camera = bpy.context.object
camera.name = "Hotel Overview Camera"
camera.rotation_euler = (
    math.radians(32), 0, math.radians(38)
)
camera.data.lens = 48
scene.camera = camera

# ---------- SAVE BLEND AND EXPORT GLB ----------
blend_path = os.path.join(MODEL_DIR, "verde-haven-hotel.blend")
glb_path = os.path.join(MODEL_DIR, "verde-haven-hotel.glb")

bpy.ops.wm.save_as_mainfile(filepath=blend_path)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=glb_path,
    export_format="GLB",
    use_selection=False
)

print("========================================")
print("VERDE HAVEN HOTEL MODEL CREATED")
print("BLEND:", blend_path)
print("GLB:", glb_path)
print("ROOMS:", [r[0] for r in room_data])
print("========================================")
