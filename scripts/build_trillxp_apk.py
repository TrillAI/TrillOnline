#!/usr/bin/env python3
"""
TrillXP Native Android APK Builder (Pure Python + OpenSSL)
Builds a spec-compliant, V1 + APK Signature Scheme v2 cryptographically signed
Android package (`public/downloads/TrillXP.apk`, package `ai.trill.trillxp`)
that launches a fullscreen hardware-accelerated Android WebView running TrillXP!
"""

import base64
import hashlib
import math
import os
import struct
import subprocess
import tempfile
import zlib

OUT_APK = os.path.join("public", "downloads", "TrillXP.apk")


# ==============================================================================
# 1. CRISP 96x96 RGBA PNG LAUNCHER ICON (TrillXP Windows Flag + Gold Globe)
# ==============================================================================
def build_launcher_png(size: int = 96) -> bytes:
    rows = []
    cx = cy = (size - 1) / 2.0
    rad = size * 0.44
    for y in range(size):
        row = bytearray([0])  # filter type 0
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.hypot(dx, dy)
            if dist > rad + 1.2:
                row.extend((0, 0, 0, 0))
                continue
            # Gold rim
            if dist > rad - 3.5:
                row.extend((250, 204, 21, 255))
                continue
            # Royal blue XP globe interior
            r, g, b = 24, 68, 178
            # 4 Windows XP Flag panes in center!
            nx = dx / rad
            ny = dy / rad
            wave = 0.06 * math.sin(nx * 5.0)
            if -0.48 <= nx <= -0.04 and -0.45 <= ny + wave <= -0.03:
                r, g, b = 239, 68, 68      # Red top-left
            elif 0.04 <= nx <= 0.48 and -0.45 <= ny + wave <= -0.03:
                r, g, b = 34, 197, 94      # Green top-right
            elif -0.48 <= nx <= -0.04 and 0.03 <= ny + wave <= 0.45:
                r, g, b = 59, 130, 246     # Blue bottom-left
            elif 0.04 <= nx <= 0.48 and 0.03 <= ny + wave <= 0.45:
                r, g, b = 250, 204, 21     # Yellow bottom-right
            row.extend((r, g, b, 255))
        rows.append(bytes(row))

    raw = b"".join(rows)

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


# ==============================================================================
# 2. ANDROID STRING POOL HELPER (UTF-16LE ResStringPool)
# ==============================================================================
def build_utf16_string_pool(strings: list[str]) -> bytes:
    offsets = []
    encoded_blobs = []
    cur = 0
    for s in strings:
        offsets.append(cur)
        u16 = s.encode("utf-16le")
        char_len = len(s)
        blob = struct.pack("<H", char_len) + u16 + b"\x00\x00"
        encoded_blobs.append(blob)
        cur += len(blob)

    str_data = b"".join(encoded_blobs)
    while len(str_data) % 4 != 0:
        str_data += b"\x00"

    header_size = 28
    strings_start = header_size + 4 * len(strings)
    total_size = strings_start + len(str_data)

    header = struct.pack(
        "<HHIIIIII",
        0x0001,         # RES_STRING_POOL_TYPE
        header_size,
        total_size,
        len(strings),
        0,              # styleCount
        0,              # flags (0 = UTF-16)
        strings_start,
        0,              # stylesStart
    )
    offset_bytes = b"".join(struct.pack("<I", o) for o in offsets)
    return header + offset_bytes + str_data


# ==============================================================================
# 3. BINARY AndroidManifest.xml (AXML)
# ==============================================================================
def build_binary_manifest() -> bytes:
    # Resource-backed attribute names MUST come first so RES_XML_RESOURCE_MAP aligns 1:1!
    attr_res = [
        ("theme", 0x01010000),
        ("label", 0x01010001),
        ("icon", 0x01010002),
        ("name", 0x01010003),
        ("exported", 0x01010010),
        ("configChanges", 0x0101001F),
        ("minSdkVersion", 0x0101020C),
        ("versionCode", 0x0101021B),
        ("versionName", 0x0101021C),
        ("targetSdkVersion", 0x01010270),
    ]
    other_strings = [
        "android",
        "http://schemas.android.com/apk/res/android",
        "",
        "manifest",
        "package",
        "ai.trill.trillxp",
        "1.0.0",
        "uses-sdk",
        "uses-permission",
        "android.permission.INTERNET",
        "application",
        "TrillXP",
        "activity",
        "ai.trill.trillxp.MainActivity",
        "intent-filter",
        "action",
        "android.intent.action.MAIN",
        "category",
        "android.intent.category.LAUNCHER",
    ]
    all_strings = [a[0] for a in attr_res] + other_strings
    sidx = {s: i for i, s in enumerate(all_strings)}

    sp_chunk = build_utf16_string_pool(all_strings)
    res_map_body = b"".join(struct.pack("<I", r_id) for _, r_id in attr_res)
    res_map_chunk = struct.pack("<HHI", 0x0180, 8, 8 + len(res_map_body)) + res_map_body

    NS_ANDROID = sidx["http://schemas.android.com/apk/res/android"]
    NS_NONE = 0xFFFFFFFF

    TYPE_REFERENCE = 0x01
    TYPE_STRING = 0x03
    TYPE_INT_DEC = 0x10
    TYPE_INT_HEX = 0x11
    TYPE_INT_BOOL = 0x12

    def start_ns(prefix: str, uri: str, line: int = 2) -> bytes:
        return struct.pack(
            "<HHIIIII",
            0x0100, 16, 24, line, 0xFFFFFFFF,
            sidx[prefix], sidx[uri]
        )

    def end_ns(prefix: str, uri: str, line: int = 20) -> bytes:
        return struct.pack(
            "<HHIIIII",
            0x0101, 16, 24, line, 0xFFFFFFFF,
            sidx[prefix], sidx[uri]
        )

    def attr_str(ns: int, name: str, val_str: str) -> bytes:
        vs = sidx[val_str]
        return struct.pack("<IIIHBBI", ns, sidx[name], vs, 8, 0, TYPE_STRING, vs)

    def attr_int(ns: int, name: str, val: int, vtype: int = TYPE_INT_DEC) -> bytes:
        return struct.pack("<IIIHBBI", ns, sidx[name], 0xFFFFFFFF, 8, 0, vtype, val & 0xFFFFFFFF)

    def start_el(name: str, attrs: list[bytes], line: int = 3) -> bytes:
        total = 36 + 20 * len(attrs)
        hdr = struct.pack(
            "<HHIIIIIHHH",
            0x0102, 16, total, line, 0xFFFFFFFF,
            NS_NONE, sidx[name],
            20, 20, len(attrs),
        ) + struct.pack("<HHH", 0, 0, 0)
        return hdr + b"".join(attrs)

    def end_el(name: str, line: int = 4) -> bytes:
        return struct.pack(
            "<HHIIIII",
            0x0103, 16, 24, line, 0xFFFFFFFF,
            NS_NONE, sidx[name]
        )

    # Note: Android attributes with resource IDs are ordered ascending by resource ID!
    xml_nodes = b"".join([
        start_ns("android", "http://schemas.android.com/apk/res/android", 2),

        start_el("manifest", [
            attr_int(NS_ANDROID, "versionCode", 1, TYPE_INT_DEC),
            attr_str(NS_ANDROID, "versionName", "1.0.0"),
            attr_str(NS_NONE, "package", "ai.trill.trillxp"),
        ], 2),

        start_el("uses-sdk", [
            attr_int(NS_ANDROID, "minSdkVersion", 21, TYPE_INT_DEC),
            attr_int(NS_ANDROID, "targetSdkVersion", 33, TYPE_INT_DEC),
        ], 4),
        end_el("uses-sdk", 4),

        start_el("uses-permission", [
            attr_str(NS_ANDROID, "name", "android.permission.INTERNET"),
        ], 5),
        end_el("uses-permission", 5),

        start_el("application", [
            attr_int(NS_ANDROID, "theme", 0x01030007, TYPE_REFERENCE),  # Theme.NoTitleBar.Fullscreen
            attr_str(NS_ANDROID, "label", "TrillXP"),
            attr_int(NS_ANDROID, "icon", 0x7F010000, TYPE_REFERENCE),   # @drawable/ic_launcher
        ], 7),

        start_el("activity", [
            attr_str(NS_ANDROID, "label", "TrillXP"),
            attr_str(NS_ANDROID, "name", "ai.trill.trillxp.MainActivity"),
            attr_int(NS_ANDROID, "exported", 0xFFFFFFFF, TYPE_INT_BOOL),
            attr_int(NS_ANDROID, "configChanges", 0x04A0, TYPE_INT_HEX),  # orientation|screenSize|keyboardHidden
        ], 9),

        start_el("intent-filter", [], 11),
        start_el("action", [attr_str(NS_ANDROID, "name", "android.intent.action.MAIN")], 12),
        end_el("action", 12),
        start_el("category", [attr_str(NS_ANDROID, "name", "android.intent.category.LAUNCHER")], 13),
        end_el("category", 13),
        end_el("intent-filter", 14),

        end_el("activity", 15),
        end_el("application", 16),
        end_el("manifest", 17),

        end_ns("android", "http://schemas.android.com/apk/res/android", 17),
    ])

    body = sp_chunk + res_map_chunk + xml_nodes
    return struct.pack("<HHI", 0x0003, 8, 8 + len(body)) + body


# ==============================================================================
# 4. BINARY resources.arsc (RES_TABLE_TYPE: @drawable/ic_launcher & @string/app_name)
# ==============================================================================
def build_resources_arsc() -> bytes:
    global_pool = build_utf16_string_pool([
        "res/drawable/ic_launcher.png",
        "TrillXP",
    ])
    type_pool = build_utf16_string_pool(["drawable", "string"])
    key_pool = build_utf16_string_pool(["ic_launcher", "app_name"])

    def make_type_spec_and_type(type_id: int, key_idx: int, global_str_idx: int) -> bytes:
        # RES_TABLE_TYPE_SPEC_TYPE (0x0202)
        spec = struct.pack("<HHIBBHI", 0x0202, 16, 20, type_id, 0, 0, 1) + struct.pack("<I", 0)
        # ResTable_entry (8 bytes) + Res_value (8 bytes) = 16 bytes
        entry = struct.pack("<HHIHBBI", 8, 0, key_idx, 8, 0, 0x03, global_str_idx)
        # ResTable_config = 48 bytes (all 0 = default config, size=48)
        config = struct.pack("<I", 48) + b"\x00" * 44
        type_hdr_size = 20 + len(config)  # 68 bytes
        entries_start = type_hdr_size + 4  # 1 uint32 offset
        total_type_sz = entries_start + len(entry)
        tchunk = (
            struct.pack("<HHIBBHII", 0x0201, type_hdr_size, total_type_sz, type_id, 0, 0, 1, entries_start)
            + config
            + struct.pack("<I", 0)
            + entry
        )
        return spec + tchunk

    type_chunks = make_type_spec_and_type(1, 0, 0) + make_type_spec_and_type(2, 1, 1)

    pkg_name_u16 = "ai.trill.trillxp".encode("utf-16le").ljust(256, b"\x00")
    pkg_hdr_size = 288  # ResTable_package header (standard 288 bytes)
    type_strings_off = pkg_hdr_size
    key_strings_off = pkg_hdr_size + len(type_pool)
    pkg_total_sz = pkg_hdr_size + len(type_pool) + len(key_pool) + len(type_chunks)

    pkg_hdr = (
        struct.pack("<HHII", 0x0200, pkg_hdr_size, pkg_total_sz, 0x7F)
        + pkg_name_u16
        + struct.pack("<IIIII", type_strings_off, 2, key_strings_off, 2, 0)
    )
    pkg_chunk = pkg_hdr + type_pool + key_pool + type_chunks

    total_arsc = 12 + len(global_pool) + len(pkg_chunk)
    return struct.pack("<HHII", 0x0002, 12, total_arsc, 1) + global_pool + pkg_chunk


# ==============================================================================
# 5. VALID DALVIK EXECUTABLE classes.dex (`ai.trill.trillxp.MainActivity`)
#    Creates fullscreen WebView, enables JS & DOMStorage, loads TrillXP!
# ==============================================================================
def uleb128(val: int) -> bytes:
    out = bytearray()
    while True:
        b = val & 0x7F
        val >>= 7
        if val:
            out.append(b | 0x80)
        else:
            out.append(b)
            break
    return bytes(out)


def build_classes_dex() -> bytes:
    # Strings MUST be sorted lexicographically in DEX!
    strings = sorted([
        "<init>",
        "Lai/trill/trillxp/MainActivity;",
        "Landroid/app/Activity;",
        "Landroid/content/Context;",
        "Landroid/os/Bundle;",
        "Landroid/view/View;",
        "Landroid/webkit/WebSettings;",
        "Landroid/webkit/WebView;",
        "Ljava/lang/String;",
        "MainActivity.java",
        "V",
        "VL",
        "VZ",
        "Z",
        "file:///android_asset/www/index.html",
        "getSettings",
        "loadUrl",
        "onCreate",
        "setContentView",
        "setDomStorageEnabled",
        "setJavaScriptEnabled",
    ])
    s_idx = {s: i for i, s in enumerate(strings)}

    # Types MUST be sorted by string_idx!
    type_descs = sorted([
        "Lai/trill/trillxp/MainActivity;",
        "Landroid/app/Activity;",
        "Landroid/content/Context;",
        "Landroid/os/Bundle;",
        "Landroid/view/View;",
        "Landroid/webkit/WebSettings;",
        "Landroid/webkit/WebView;",
        "Ljava/lang/String;",
        "V",
        "Z",
    ], key=lambda d: s_idx[d])
    t_idx = {d: i for i, d in enumerate(type_descs)}

    # Protos:
    # 0: ()V
    # 1: ()Landroid/webkit/WebSettings;
    # 2: (Landroid/content/Context;)V
    # 3: (Landroid/os/Bundle;)V
    # 4: (Landroid/view/View;)V
    # 5: (Ljava/lang/String;)V
    # 6: (Z)V
    proto_defs = [
        ("V", "V", []),
        ("Landroid/webkit/WebSettings;", "Landroid/webkit/WebSettings;", []),
        ("VL", "V", ["Landroid/content/Context;"]),
        ("VL", "V", ["Landroid/os/Bundle;"]),
        ("VL", "V", ["Landroid/view/View;"]),
        ("VL", "V", ["Ljava/lang/String;"]),
        ("VZ", "V", ["Z"]),
    ]
    # Sort protos by (return_type_idx, param_type_idxs) as required by DEX format!
    proto_defs.sort(key=lambda p: (t_idx[p[1]], [t_idx[x] for x in p[2]]))

    def find_proto(ret: str, params: list[str]) -> int:
        for idx, (_, r, ps) in enumerate(proto_defs):
            if r == ret and ps == params:
                return idx
        raise KeyError((ret, params))

    # Methods MUST be sorted by (class_idx, name_idx, proto_idx)!
    method_defs = [
        ("Lai/trill/trillxp/MainActivity;", "<init>", find_proto("V", [])),
        ("Lai/trill/trillxp/MainActivity;", "onCreate", find_proto("V", ["Landroid/os/Bundle;"])),
        ("Landroid/app/Activity;", "<init>", find_proto("V", [])),
        ("Landroid/app/Activity;", "onCreate", find_proto("V", ["Landroid/os/Bundle;"])),
        ("Landroid/app/Activity;", "setContentView", find_proto("V", ["Landroid/view/View;"])),
        ("Landroid/webkit/WebSettings;", "setDomStorageEnabled", find_proto("V", ["Z"])),
        ("Landroid/webkit/WebSettings;", "setJavaScriptEnabled", find_proto("V", ["Z"])),
        ("Landroid/webkit/WebView;", "<init>", find_proto("V", ["Landroid/content/Context;"])),
        ("Landroid/webkit/WebView;", "getSettings", find_proto("Landroid/webkit/WebSettings;", [])),
        ("Landroid/webkit/WebView;", "loadUrl", find_proto("V", ["Ljava/lang/String;"])),
    ]
    method_defs.sort(key=lambda m: (t_idx[m[0]], s_idx[m[1]], m[2]))
    m_idx = {m: i for i, m in enumerate(method_defs)}

    # Assemble Dalvik bytecode for `<init>()V`:
    # registers=1, ins=1, outs=1
    # invoke-direct {v0}, Landroid/app/Activity;-><init>()V  (70 10 mmmm 00 00)
    # return-void                                            (0e 00)
    m_act_init = m_idx[("Landroid/app/Activity;", "<init>", find_proto("V", []))]
    insns_init = struct.pack("<HHH", 0x1070, m_act_init, 0x0000) + struct.pack("<H", 0x000E)
    code_init = struct.pack("<HHHHII", 1, 1, 1, 0, 0, len(insns_init) // 2) + insns_init
    if len(code_init) % 4 != 0:
        code_init += b"\x00\x00"

    # Assemble Dalvik bytecode for `onCreate(Landroid/os/Bundle;)V`:
    # registers=4 (v0=WebView, v1=WebSettings/bool/url, v2=this, v3=Bundle), ins=2, outs=2
    m_super_oncreate = m_idx[("Landroid/app/Activity;", "onCreate", find_proto("V", ["Landroid/os/Bundle;"]))]
    m_wv_init = m_idx[("Landroid/webkit/WebView;", "<init>", find_proto("V", ["Landroid/content/Context;"]))]
    m_wv_settings = m_idx[("Landroid/webkit/WebView;", "getSettings", find_proto("Landroid/webkit/WebSettings;", []))]
    m_set_js = m_idx[("Landroid/webkit/WebSettings;", "setJavaScriptEnabled", find_proto("V", ["Z"]))]
    m_set_dom = m_idx[("Landroid/webkit/WebSettings;", "setDomStorageEnabled", find_proto("V", ["Z"]))]
    m_load_url = m_idx[("Landroid/webkit/WebView;", "loadUrl", find_proto("V", ["Ljava/lang/String;"]))]
    m_set_cv = m_idx[("Landroid/app/Activity;", "setContentView", find_proto("V", ["Landroid/view/View;"]))]

    insns_oncreate = b"".join([
        # invoke-super {v2, v3}, Activity->onCreate(Bundle)V
        struct.pack("<HHH", 0x206F, m_super_oncreate, 0x0032),
        # new-instance v0, Landroid/webkit/WebView;
        struct.pack("<HH", 0x0022, t_idx["Landroid/webkit/WebView;"]),
        # invoke-direct {v0, v2}, WebView-><init>(Context)V
        struct.pack("<HHH", 0x2070, m_wv_init, 0x0020),
        # invoke-virtual {v0}, WebView->getSettings()WebSettings
        struct.pack("<HHH", 0x106E, m_wv_settings, 0x0000),
        # move-result-object v1
        struct.pack("<H", 0x010C),
        # const/4 v3, #int 1 (0x1312 -> op 0x12, A=3, B=1 -> byte1=0x12, byte2=0x13)
        struct.pack("<BB", 0x12, 0x13),
        # invoke-virtual {v1, v3}, WebSettings->setJavaScriptEnabled(Z)V
        struct.pack("<HHH", 0x206E, m_set_js, 0x0031),
        # invoke-virtual {v1, v3}, WebSettings->setDomStorageEnabled(Z)V
        struct.pack("<HHH", 0x206E, m_set_dom, 0x0031),
        # const-string v1, "file:///android_asset/www/index.html"
        struct.pack("<HH", 0x011A, s_idx["file:///android_asset/www/index.html"]),
        # invoke-virtual {v0, v1}, WebView->loadUrl(String)V
        struct.pack("<HHH", 0x206E, m_load_url, 0x0010),
        # invoke-virtual {v2, v0}, Activity->setContentView(View)V
        struct.pack("<HHH", 0x206E, m_set_cv, 0x0002),
        # return-void
        struct.pack("<H", 0x000E),
    ])
    code_oncreate = struct.pack("<HHHHII", 4, 2, 2, 0, 0, len(insns_oncreate) // 2) + insns_oncreate
    if len(code_oncreate) % 4 != 0:
        code_oncreate += b"\x00\x00"

    # Layout fixed tables starting right after 112-byte DEX header:
    off = 112
    string_ids_off = off
    off += len(strings) * 4

    type_ids_off = off
    off += len(type_descs) * 4

    proto_ids_off = off
    off += len(proto_defs) * 12

    method_ids_off = off
    off += len(method_defs) * 8

    class_defs_off = off
    off += 32  # 1 class_def_item

    data_off = off

    # Build data section:
    data = bytearray()

    def align4():
        while (data_off + len(data)) % 4 != 0:
            data.append(0)

    # 1. type_lists for protos with parameters
    proto_param_offs = []
    for _, _, params in proto_defs:
        if not params:
            proto_param_offs.append(0)
        else:
            align4()
            poff = data_off + len(data)
            proto_param_offs.append(poff)
            data.extend(struct.pack("<I", len(params)))
            for p in params:
                data.extend(struct.pack("<H", t_idx[p]))

    # 2. code_items (4-byte aligned)
    align4()
    code_init_off = data_off + len(data)
    data.extend(code_init)

    align4()
    code_oncreate_off = data_off + len(data)
    data.extend(code_oncreate)

    # 3. string_data_items
    string_data_offs = []
    for s in strings:
        string_data_offs.append(data_off + len(data))
        utf8 = s.encode("utf-8")
        data.extend(uleb128(len(s)) + utf8 + b"\x00")

    # 4. class_data_item for MainActivity
    class_data_off = data_off + len(data)
    m_my_init = m_idx[("Lai/trill/trillxp/MainActivity;", "<init>", find_proto("V", []))]
    m_my_oncreate = m_idx[("Lai/trill/trillxp/MainActivity;", "onCreate", find_proto("V", ["Landroid/os/Bundle;"]))]
    class_data = b"".join([
        uleb128(0),  # static_fields_size
        uleb128(0),  # instance_fields_size
        uleb128(1),  # direct_methods_size (<init>)
        uleb128(1),  # virtual_methods_size (onCreate)
        # direct_method[0]: <init>, PUBLIC|CONSTRUCTOR (0x10001)
        uleb128(m_my_init),
        uleb128(0x10001),
        uleb128(code_init_off),
        # virtual_method[0]: onCreate, PUBLIC (0x0001)
        uleb128(m_my_oncreate),
        uleb128(0x0001),
        uleb128(code_oncreate_off),
    ])
    data.extend(class_data)

    # 5. map_list (4-byte aligned at end of data section)
    align4()
    map_off = data_off + len(data)
    map_items = [
        (0x0000, 1, 0),                        # HEADER_ITEM
        (0x0001, len(strings), string_ids_off),
        (0x0002, len(type_descs), type_ids_off),
        (0x0003, len(proto_defs), proto_ids_off),
        (0x0005, len(method_defs), method_ids_off),
        (0x0006, 1, class_defs_off),
        (0x1001, sum(1 for x in proto_param_offs if x), next(x for x in proto_param_offs if x)),
        (0x2001, 2, code_init_off),
        (0x2002, len(strings), string_data_offs[0]),
        (0x2000, 1, class_data_off),
        (0x1000, 1, map_off),
    ]
    map_items.sort(key=lambda it: it[2])
    data.extend(struct.pack("<I", len(map_items)))
    for m_type, m_count, m_offset in map_items:
        data.extend(struct.pack("<HHII", m_type, 0, m_count, m_offset))

    align4()
    file_size = data_off + len(data)
    data_size = len(data)

    # Encode ID tables
    string_ids_bytes = b"".join(struct.pack("<I", o) for o in string_data_offs)
    type_ids_bytes = b"".join(struct.pack("<I", s_idx[d]) for d in type_descs)
    proto_ids_bytes = b"".join(
        struct.pack(
            "<III",
            s_idx[shorty if shorty in s_idx else "VL"],
            t_idx[ret],
            poff,
        )
        for (shorty, ret, _), poff in zip(proto_defs, proto_param_offs)
    )
    method_ids_bytes = b"".join(
        struct.pack("<HHI", t_idx[cls], s_idx[name], pidx)
        for cls, name, pidx in method_defs
    )
    class_defs_bytes = struct.pack(
        "<IIIIIIII",
        t_idx["Lai/trill/trillxp/MainActivity;"],
        0x0001,  # ACC_PUBLIC
        t_idx["Landroid/app/Activity;"],
        0,       # interfaces_off
        s_idx["MainActivity.java"],
        0,       # annotations_off
        class_data_off,
        0,       # static_values_off
    )

    header_tail = struct.pack(
        "<IIIIIIIIIIIIIIIIIIII",
        file_size,
        112,               # header_size
        0x12345678,        # ENDIAN_CONSTANT
        0, 0,              # link_size, link_off
        map_off,
        len(strings), string_ids_off,
        len(type_descs), type_ids_off,
        len(proto_defs), proto_ids_off,
        0, 0,              # field_ids_size, field_ids_off
        len(method_defs), method_ids_off,
        1, class_defs_off,
        data_size, data_off,
    )

    body_after_sig = header_tail + string_ids_bytes + type_ids_bytes + proto_ids_bytes + method_ids_bytes + class_defs_bytes + bytes(data)
    sha1_digest = hashlib.sha1(body_after_sig).digest()
    checksum = zlib.adler32(sha1_digest + body_after_sig) & 0xFFFFFFFF

    return b"dex\n035\x00" + struct.pack("<I", checksum) + sha1_digest + body_after_sig


# ==============================================================================
# 6. BUNDLED OFFLINE + LIVE TRILLXP ANDROID WEBVIEW SHELL (`assets/www/index.html`)
# ==============================================================================
def build_bundled_mobile_html() -> bytes:
    html = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>TrillXP — Android Edition</title>
<style>
  *{box-sizing:border-box;user-select:none;-webkit-user-select:none}
  html,body{margin:0;height:100%;overflow:hidden;overscroll-behavior:none;background:#00309c;font-family:Tahoma,Verdana,sans-serif;color:#fff}
  .shell{display:flex;flex-direction:column;height:100%;background:radial-gradient(circle at 25% 20%,#5a7edc 0%,#245edb 55%,#00309c 100%)}
  .hdr{padding:16px 18px;background:#00309c;border-bottom:2px solid #f59432;display:flex;align-items:center;justify-content:space-between}
  .brand{font-size:22px;font-weight:800}
  .brand sup{color:#ff7b29;font-size:13px}
  .main{flex:1;padding:18px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
  .card{background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.38);border-radius:10px;padding:14px}
  input{width:100%;padding:10px;border-radius:6px;border:1px solid #93c5fd;font-size:14px;margin:8px 0}
  .btn{display:inline-block;padding:10px 18px;border-radius:6px;border:2px solid #fde047;background:linear-gradient(180deg,#43b047,#247827);color:#fff;font-weight:800;font-size:14px;cursor:pointer;text-decoration:none}
  .taskbar{height:34px;background:linear-gradient(180deg,#3168d5,#1941a5);display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:12px}
  .start{background:linear-gradient(180deg,#45b649,#267c2a);padding:4px 14px;border-radius:0 10px 10px 0;font-weight:800;font-style:italic}
</style>
</head>
<body>
<div class="shell">
  <div class="hdr">
    <div class="brand">Trill<span>XP</span><sup>Mobile</sup></div>
    <div style="font-size:11px;color:#dbeafe">v1.0.0 • ai.trill.trillxp</div>
  </div>
  <div class="main">
    <div class="card">
      <div style="font-weight:800;font-size:16px;margin-bottom:6px">🕰️ Welcome to TrillXP for Android!</div>
      <div style="font-size:13px;line-height:1.45;color:#e0f2fe">
        Experience the early-2000s PC &amp; Internet era natively on Android — featuring Windows XP SP3, Classic AOL 9.8 + 56K Dial-Up, Classic Slingo (with the Devil Laugh!), Solitaire, Spider Solitaire, SkiFree, JezzBall, CMD, PowerShell, and built-in Arena AI Agent!
      </div>
    </div>
    <div class="card">
      <div style="font-weight:700;font-size:13px">Connect to Live TrillXP Cloud / Local Instance:</div>
      <input id="hostUrl" value="https://trillxp.app" placeholder="Enter your TrillXP server URL"/>
      <button class="btn" onclick="location.href=document.getElementById('hostUrl').value">▶ Launch Full TrillXP Desktop</button>
    </div>
    <div class="card" style="font-size:12px;line-height:1.45">
      <b>Historical Did-You-Know?</b><br/>
      • Windows XP debuted on <b>October 25, 2001</b> with the iconic Sonoma County <i>Bliss</i> wallpaper.<br/>
      • A 56K dial-up modem downloaded a single 4 MB MP3 song in ~12 minutes — and disconnected if someone picked up the landline!<br/>
      • AOL mailed over 1 billion free trial CDs in the late 1990s and early 2000s.
    </div>
  </div>
  <div class="taskbar">
    <span class="start">start</span>
    <span id="clk">12:00 PM</span>
  </div>
</div>
<script>
  setInterval(()=>{document.getElementById('clk').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});},1000);
</script>
</body>
</html>"""
    return html.encode("utf-8")


# ==============================================================================
# 7. ZIP WRITER WITH 4-BYTE ALIGNMENT (`zipalign -p 4`) + V1 JAR SIGN + APK SIG v2
# ==============================================================================
def write_aligned_zip(entries: list[tuple[str, bytes, bool]]) -> tuple[bytes, int, int]:
    """
    Writes a clean ZIP archive (no data descriptors, 4-byte aligned uncompressed data!)
    Returns (zip_bytes, cd_offset, eocd_offset).
    """
    local_parts = bytearray()
    cd_parts = bytearray()

    for name, raw_data, compress in entries:
        name_b = name.encode("utf-8")
        crc = zlib.crc32(raw_data) & 0xFFFFFFFF
        uncomp_sz = len(raw_data)

        if compress:
            cobj = zlib.compressobj(9, zlib.DEFLATED, -zlib.MAX_WBITS)
            comp_data = cobj.compress(raw_data) + cobj.flush()
            method = 8
        else:
            comp_data = raw_data
            method = 0

        comp_sz = len(comp_data)
        lfh_offset = len(local_parts)

        # Compute extra field padding so uncompressed file payload starts on a 4-byte boundary!
        extra = b""
        if method == 0:
            data_start = lfh_offset + 30 + len(name_b)
            pad = (4 - (data_start % 4)) % 4
            if pad > 0:
                extra = b"\x00" * pad

        lfh = struct.pack(
            "<IHHHHHIIIHH",
            0x04034B50,
            20,
            0,
            method,
            0x0000,
            0x5961,  # 2026-11-01 DOS date
            crc,
            comp_sz,
            uncomp_sz,
            len(name_b),
            len(extra),
        )
        local_parts.extend(lfh + name_b + extra + comp_data)

        cdh = struct.pack(
            "<IHHHHHHIIIHHHHHII",
            0x02014B50,
            20,
            20,
            0,
            method,
            0x0000,
            0x5961,
            crc,
            comp_sz,
            uncomp_sz,
            len(name_b),
            0,
            0,
            0,
            0,
            0,
            lfh_offset,
        )
        cd_parts.extend(cdh + name_b)

    cd_offset = len(local_parts)
    cd_size = len(cd_parts)
    eocd_offset = cd_offset + cd_size
    eocd = struct.pack(
        "<IHHHHIIH",
        0x06054B50,
        0,
        0,
        len(entries),
        len(entries),
        cd_size,
        cd_offset,
        0,
    )
    return bytes(local_parts + cd_parts + eocd), cd_offset, eocd_offset


def compute_apk_v2_chunked_digest(before_cd: bytes, cd_bytes: bytes, eocd_bytes_with_updated_cd: bytes) -> bytes:
    """
    Computes APK Signature Scheme v2 SHA-256 chunked digest (1 MiB chunks over the 3 ZIP sections).
    """
    CHUNK = 1024 * 1024
    chunk_digests = []
    for section in (before_cd, cd_bytes, eocd_bytes_with_updated_cd):
        pos = 0
        n = len(section)
        while pos < n:
            piece = section[pos : pos + CHUNK]
            h = hashlib.sha256(b"\xa5" + struct.pack("<I", len(piece)) + piece).digest()
            chunk_digests.append(h)
            pos += CHUNK
    top = b"\x5a" + struct.pack("<I", len(chunk_digests)) + b"".join(chunk_digests)
    return hashlib.sha256(top).digest()


def lp_bytes(b: bytes) -> bytes:
    return struct.pack("<I", len(b)) + b


def build_and_sign_apk():
    os.makedirs(os.path.dirname(OUT_APK), exist_ok=True)

    manifest_bin = build_binary_manifest()
    arsc_bin = build_resources_arsc()
    icon_png = build_launcher_png(96)
    dex_bin = build_classes_dex()
    web_html = build_bundled_mobile_html()

    core_files = [
        ("AndroidManifest.xml", manifest_bin, True),
        ("resources.arsc", arsc_bin, False),              # Uncompressed + 4-byte aligned!
        ("res/drawable/ic_launcher.png", icon_png, False),  # Uncompressed + 4-byte aligned!
        ("classes.dex", dex_bin, True),
        ("assets/www/index.html", web_html, True),
    ]

    with tempfile.TemporaryDirectory() as tmp:
        key_pem = os.path.join(tmp, "key.pem")
        cert_pem = os.path.join(tmp, "cert.pem")
        cert_der_path = os.path.join(tmp, "cert.der")
        pubkey_der_path = os.path.join(tmp, "pub.der")

        # Generate RSA-2048 signing key + X.509 certificate via OpenSSL
        subprocess.run(
            [
                "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                "-keyout", key_pem, "-out", cert_pem, "-days", "10000",
                "-subj", "/CN=TrillXP Preservation Project/O=TrillAI/C=US",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            ["openssl", "x509", "-in", cert_pem, "-outform", "DER", "-out", cert_der_path],
            check=True,
        )
        subprocess.run(
            ["openssl", "pkey", "-in", key_pem, "-pubout", "-outform", "DER", "-out", pubkey_der_path],
            check=True,
        )

        with open(cert_der_path, "rb") as f:
            cert_der = f.read()
        with open(pubkey_der_path, "rb") as f:
            spki_der = f.read()

        # --- V1 JAR Signature (MANIFEST.MF, TRILLXP.SF, TRILLXP.RSA) ---
        mf_sections = ["Manifest-Version: 1.0\r\nCreated-By: TrillXP APK Builder 1.0\r\n\r\n"]
        sf_entry_chunks = []
        for fname, fbytes, _ in core_files:
            d64 = base64.b64encode(hashlib.sha256(fbytes).digest()).decode("ascii")
            sec = f"Name: {fname}\r\nSHA-256-Digest: {d64}\r\n\r\n"
            mf_sections.append(sec)
            sec_d64 = base64.b64encode(hashlib.sha256(sec.encode("utf-8")).digest()).decode("ascii")
            sf_entry_chunks.append(f"Name: {fname}\r\nSHA-256-Digest: {sec_d64}\r\n\r\n")

        manifest_mf = "".join(mf_sections).encode("utf-8")
        mf_whole_d64 = base64.b64encode(hashlib.sha256(manifest_mf).digest()).decode("ascii")
        sf_header = (
            "Signature-Version: 1.0\r\n"
            f"SHA-256-Digest-Manifest: {mf_whole_d64}\r\n"
            "X-Android-APK-Signed: 2\r\n\r\n"
        )
        trillxp_sf = (sf_header + "".join(sf_entry_chunks)).encode("utf-8")

        sf_path = os.path.join(tmp, "TRILLXP.SF")
        rsa_path = os.path.join(tmp, "TRILLXP.RSA")
        with open(sf_path, "wb") as f:
            f.write(trillxp_sf)

        subprocess.run(
            [
                "openssl", "cms", "-sign", "-binary", "-noattr",
                "-in", sf_path, "-signer", cert_pem, "-inkey", key_pem,
                "-outform", "DER", "-out", rsa_path, "-md", "sha256",
            ],
            check=True,
        )
        with open(rsa_path, "rb") as f:
            trillxp_rsa = f.read()

        all_entries = core_files + [
            ("META-INF/MANIFEST.MF", manifest_mf, True),
            ("META-INF/TRILLXP.SF", trillxp_sf, True),
            ("META-INF/TRILLXP.RSA", trillxp_rsa, True),
        ]

        unsigned_v2_zip, cd_off, eocd_off = write_aligned_zip(all_entries)
        before_cd = unsigned_v2_zip[:cd_off]
        cd_bytes = unsigned_v2_zip[cd_off:eocd_off]
        eocd_bytes = bytearray(unsigned_v2_zip[eocd_off:])
        # Note: per APK Signature Scheme v2 spec, EOCD's CD-offset field is set to `cd_off` (before inserting block) during digest calculation!
        struct.pack_into("<I", eocd_bytes, 16, cd_off)

        # --- APK Signature Scheme v2 Signing Block (`APK Sig Block 42`, ID 0x7109871a) ---
        ALGO_RSA_PKCS1_V15_SHA256 = 0x0103
        v2_digest = compute_apk_v2_chunked_digest(before_cd, cd_bytes, bytes(eocd_bytes))

        digest_entry = lp_bytes(struct.pack("<I", ALGO_RSA_PKCS1_V15_SHA256) + lp_bytes(v2_digest))
        digests_seq = lp_bytes(digest_entry)
        certs_seq = lp_bytes(lp_bytes(cert_der))
        attrs_seq = lp_bytes(b"")  # empty additional attributes
        signed_data = digests_seq + certs_seq + attrs_seq

        sd_path = os.path.join(tmp, "signed_data.bin")
        sig_path = os.path.join(tmp, "sig.bin")
        with open(sd_path, "wb") as f:
            f.write(signed_data)

        subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_pem, "-out", sig_path, sd_path],
            check=True,
        )
        with open(sig_path, "rb") as f:
            rsa_sig = f.read()

        sig_entry = lp_bytes(struct.pack("<I", ALGO_RSA_PKCS1_V15_SHA256) + lp_bytes(rsa_sig))
        signatures_seq = lp_bytes(sig_entry)

        signer = lp_bytes(lp_bytes(signed_data) + signatures_seq + lp_bytes(spki_der))
        v2_block_value = lp_bytes(signer)

        # Pair: uint64 length (4 + len(value)) + uint32 ID (0x7109871a) + value
        pair_v2 = struct.pack("<QI", 4 + len(v2_block_value), 0x7109871A) + v2_block_value

        # Pad APK Signing Block to multiple of 4096 bytes using VERITY_PADDING_BLOCK_ID (0x42726577)
        raw_total = 8 + len(pair_v2) + 8 + 16
        rem = raw_total % 4096
        pairs = pair_v2
        if rem != 0:
            need = (4096 - rem)
            if need < 12:
                need += 4096
            pad_val_len = need - 12
            pairs += struct.pack("<QI", 4 + pad_val_len, 0x42726577) + (b"\x00" * pad_val_len)

        size_of_block = len(pairs) + 8 + 16
        apk_sig_block = struct.pack("<Q", size_of_block) + pairs + struct.pack("<Q", size_of_block) + b"APK Sig Block 42"

        # Update EOCD Central Directory offset to point past the inserted APK Signing Block!
        new_cd_off = cd_off + len(apk_sig_block)
        struct.pack_into("<I", eocd_bytes, 16, new_cd_off)

        final_apk = before_cd + apk_sig_block + cd_bytes + bytes(eocd_bytes)
        with open(OUT_APK, "wb") as f:
            f.write(final_apk)

        apk_sha256 = hashlib.sha256(final_apk).hexdigest()
        cert_sha256 = hashlib.sha256(cert_der).hexdigest()
        print(f"Built {OUT_APK} ({len(final_apk):,} bytes)")
        print(f"APK SHA-256 : {apk_sha256}")
        print(f"Cert SHA-256: {cert_sha256}")


if __name__ == "__main__":
    build_and_sign_apk()
