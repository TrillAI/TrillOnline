#!/usr/bin/env python3
"""
TrillXP Official Android APK Compiler & Signer
Compiles genuine Java source (`android/src/ai/trill/trillxp/MainActivity.java`)
against official Android SDK 33 (`android.jar`) using Eclipse Java Compiler (`ecj`),
converts bytecode to Dalvik Executable (`classes.dex`) via Google `dx`, compiles & links
resources + `AndroidManifest.xml` + full bundled `dist/` TrillXP Windows XP OS assets
via Google `aapt2`, 4-byte-aligns (`zipalign -p 4`), and signs with dual V1 JAR +
APK Signature Scheme v2 (`0x7109871a`) RSA-2048 signatures.
"""

import base64
import hashlib
import json
import math
import os
import shutil
import stat
import struct
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
import zlib

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ANDROID_DIR = os.path.join(ROOT_DIR, "android")
DIST_DIR = os.path.join(ROOT_DIR, "dist")
OUT_APK = os.path.join(ROOT_DIR, "public", "downloads", "TrillXP.apk")
TOOLS_DIR = "/tmp/apktools"
TOOLS_BIN = os.path.join(TOOLS_DIR, "bin")

# Pinned Git blob SHAs for deterministic compiler binaries via api.github.com
AAPT2_BLOB = ("iBotPeaches/Apktool", "9327b68672020608699a49f36878190c67f1d762")
DX_BLOB = ("xiaoyvyv/android-dx", "9827a88ef5dfdcb4027fcc68ca84c563a16a0dd1")
ECJ_BLOB = ("Shiniga-OP/Compilador-de-Java-para-DEX", "9acfefc805539172b88dd4dbbc20a2f5eeddb596")


def fetch_git_blob(repo: str, sha: str, dest: str) -> None:
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    url = f"https://api.github.com/repos/{repo}/git/blobs/{sha}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "TrillXP-APK-Builder",
            "Accept": "application/vnd.github.raw",
        },
    )
    print(f"Fetching {os.path.basename(dest)} from {repo}...")
    with urllib.request.urlopen(req, timeout=90) as resp, open(dest, "wb") as out:
        while True:
            chunk = resp.read(256 * 1024)
            if not chunk:
                break
            out.write(chunk)


def ensure_toolchain() -> tuple[str, str, str, str, str]:
    """
    Ensures Java runtime, ecj.jar, dx.jar, aapt2, and android-33.jar are present.
    Uses system `java` when available (e.g. GitHub Actions ubuntu-latest), otherwise
    installs `jdk4py` into `/tmp/apktools`.
    """
    os.makedirs(TOOLS_BIN, exist_ok=True)

    java_bin = shutil.which("java")
    if not java_bin:
        jdk_java = os.path.join(TOOLS_DIR, "jdk4py", "java-runtime", "bin", "java")
        if not os.path.exists(jdk_java):
            print("Installing portable OpenJDK runtime (jdk4py) into /tmp/apktools...")
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "--quiet", "--target", TOOLS_DIR, "jdk4py"],
                check=True,
            )
        java_bin = jdk_java

    aapt2_bin = os.path.join(TOOLS_BIN, "aapt2")
    dx_jar = os.path.join(TOOLS_BIN, "dx.jar")
    ecj_jar = os.path.join(TOOLS_BIN, "ecj.jar")
    android_jar = os.path.join(TOOLS_BIN, "android-33.jar")

    fetch_git_blob(*AAPT2_BLOB, aapt2_bin)
    os.chmod(aapt2_bin, os.stat(aapt2_bin).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    fetch_git_blob(*DX_BLOB, dx_jar)
    fetch_git_blob(*ECJ_BLOB, ecj_jar)

    if not (os.path.exists(android_jar) and os.path.getsize(android_jar) > 1_000_000):
        req = urllib.request.Request(
            "https://api.github.com/repos/Sable/android-platforms/contents/android-33",
            headers={"User-Agent": "TrillXP-APK-Builder"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            entries = json.loads(resp.read())
            sha = next(it["sha"] for it in entries if it["name"] == "android.jar")
        fetch_git_blob("Sable/android-platforms", sha, android_jar)

    return java_bin, ecj_jar, dx_jar, aapt2_bin, android_jar


def build_launcher_png(size: int) -> bytes:
    """Renders crisp RGBA launcher icon (Royal Blue XP Globe + 4-Pane Windows Flag + Gold Rim)."""
    rows = []
    cx = cy = (size - 1) / 2.0
    rad = size * 0.45
    rim = max(2.0, size * 0.04)
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.hypot(dx, dy)
            if dist > rad + 1.0:
                row.extend((0, 0, 0, 0))
                continue
            alpha = 255 if dist <= rad else int(max(0.0, (rad + 1.0 - dist)) * 255)
            if dist > rad - rim:
                row.extend((250, 204, 21, alpha))
                continue
            # Glossy blue gradient globe
            ny_norm = (y / float(size))
            r = int(16 + 24 * (1.0 - ny_norm))
            g = int(58 + 56 * (1.0 - ny_norm))
            b = int(165 + 65 * (1.0 - ny_norm))

            nx = dx / rad
            ny = dy / rad
            wave = 0.06 * math.sin(nx * 5.0)
            if -0.48 <= nx <= -0.04 and -0.45 <= ny + wave <= -0.03:
                r, g, b = 239, 68, 68      # Red pane
            elif 0.04 <= nx <= 0.48 and -0.45 <= ny + wave <= -0.03:
                r, g, b = 34, 197, 94      # Green pane
            elif -0.48 <= nx <= -0.04 and 0.03 <= ny + wave <= 0.45:
                r, g, b = 56, 189, 248     # Cyan-Blue pane
            elif 0.04 <= nx <= 0.48 and 0.03 <= ny + wave <= 0.45:
                r, g, b = 250, 204, 21     # Gold-Yellow pane
            row.extend((r, g, b, alpha))
        rows.append(bytes(row))

    raw = b"".join(rows)

    def png_chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(raw, 9))
        + png_chunk(b"IEND", b"")
    )


def ensure_web_dist() -> None:
    """Builds the full TrillXP production web bundle into `dist/`."""
    if not os.path.exists(os.path.join(ROOT_DIR, "node_modules", ".bin", "tsc")):
        print("Installing npm dependencies (`npm install`)...")
        subprocess.run(["npm", "install"], cwd=ROOT_DIR, check=True)
    print("Building fresh TrillXP web bundle (`npm run build`)...")
    subprocess.run(["npm", "run", "build"], cwd=ROOT_DIR, check=True)


def write_aligned_zip(entries: list[tuple[str, bytes, bool]]) -> tuple[bytes, int, int]:
    """
    Writes a clean ZIP archive without data descriptors and 4-byte aligns every
    uncompressed (`ZIP_STORED`) entry (`zipalign -p 4` equivalent).
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

        extra = b""
        if method == 0:
            # Page-align classes.dex / .so to 4096 bytes and other stored resources to 4 bytes!
            align = 4096 if name.endswith(".so") else 4
            data_start = lfh_offset + 30 + len(name_b)
            pad = (align - (data_start % align)) % align
            if pad > 0:
                extra = b"\x00" * pad

        lfh = struct.pack(
            "<IHHHHHIIIHH",
            0x04034B50,
            20,
            0,
            method,
            0x0000,
            0x5961,
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


def compute_apk_v2_chunked_digest(before_cd: bytes, cd_bytes: bytes, eocd_bytes: bytes) -> bytes:
    CHUNK = 1024 * 1024
    chunk_digests = []
    for section in (before_cd, cd_bytes, eocd_bytes):
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


def build_and_sign_apk() -> None:
    ensure_web_dist()
    java_bin, ecj_jar, dx_jar, aapt2_bin, android_jar = ensure_toolchain()
    os.makedirs(os.path.dirname(OUT_APK), exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        classes_dir = os.path.join(tmp, "classes")
        res_src_dir = os.path.join(tmp, "res")
        res_compiled_zip = os.path.join(tmp, "res_compiled.zip")
        assets_dir = os.path.join(tmp, "assets")
        www_dir = os.path.join(assets_dir, "www")
        linked_unsigned_apk = os.path.join(tmp, "linked_unsigned.apk")
        dex_path = os.path.join(tmp, "classes.dex")

        os.makedirs(classes_dir, exist_ok=True)
        shutil.copytree(os.path.join(ANDROID_DIR, "res"), res_src_dir)

        # 1. Generate multi-density launcher icons
        densities = [
            ("drawable-mdpi", 48),
            ("drawable-hdpi", 72),
            ("drawable-xhdpi", 96),
            ("drawable-xxhdpi", 144),
            ("drawable-xxxhdpi", 192),
        ]
        for folder, px in densities:
            ddir = os.path.join(res_src_dir, folder)
            os.makedirs(ddir, exist_ok=True)
            with open(os.path.join(ddir, "ic_launcher.png"), "wb") as f:
                f.write(build_launcher_png(px))

        # 2. Copy full compiled `dist/` TrillXP OS into `assets/www/` (excluding TrillXP.apk itself!)
        os.makedirs(www_dir, exist_ok=True)
        for root, _dirs, files in os.walk(DIST_DIR):
            rel_root = os.path.relpath(root, DIST_DIR)
            for fname in files:
                if fname.lower().endswith(".apk"):
                    continue
                src_file = os.path.join(root, fname)
                dst_dir = www_dir if rel_root == "." else os.path.join(www_dir, rel_root)
                os.makedirs(dst_dir, exist_ok=True)
                shutil.copy2(src_file, os.path.join(dst_dir, fname))

        # 3. Compile Java sources -> JVM 1.8 `.class` bytecode via Eclipse Compiler for Java (`ecj`)
        java_sources = []
        for root, _dirs, files in os.walk(os.path.join(ANDROID_DIR, "src")):
            for fname in files:
                if fname.endswith(".java"):
                    java_sources.append(os.path.join(root, fname))

        print(f"Compiling {len(java_sources)} Java source file(s) with ecj against android-33.jar...")
        subprocess.run(
            [
                java_bin,
                "-jar", ecj_jar,
                "-1.8",
                "-bootclasspath", android_jar,
                "-d", classes_dir,
                "-proc:none",
                *java_sources,
            ],
            check=True,
        )

        # 4. Compile `.class` files -> `classes.dex` via Google `dx`
        print("Converting .class bytecode -> classes.dex via Google dx...")
        subprocess.run(
            [
                java_bin,
                "-jar", dx_jar,
                "--dex",
                "--min-sdk-version=21",
                f"--output={dex_path}",
                classes_dir,
            ],
            check=True,
        )

        # 5. Compile resources & link `AndroidManifest.xml` + `assets/www/` via Google `aapt2`
        print("Compiling Android resources & linking APK with aapt2...")
        subprocess.run(
            [aapt2_bin, "compile", "--dir", res_src_dir, "-o", res_compiled_zip],
            check=True,
        )
        subprocess.run(
            [
                aapt2_bin, "link",
                "-I", android_jar,
                "--manifest", os.path.join(ANDROID_DIR, "AndroidManifest.xml"),
                "-A", assets_dir,
                "-o", linked_unsigned_apk,
                "--auto-add-overlay",
                res_compiled_zip,
            ],
            check=True,
        )

        # 6. Collect linked entries + `classes.dex`, preserving stored alignment for `resources.arsc` & PNGs
        core_files: list[tuple[str, bytes, bool]] = []
        UNCOMPRESSED_EXTS = (".arsc", ".png", ".wav", ".mp3", ".ogg", ".webm", ".mp4", ".jpg", ".jpeg")

        with zipfile.ZipFile(linked_unsigned_apk, "r") as zf:
            for info in zf.infolist():
                if info.filename.startswith("META-INF/"):
                    continue
                raw = zf.read(info.filename)
                lower = info.filename.lower()
                should_compress = not any(lower.endswith(ext) for ext in UNCOMPRESSED_EXTS)
                if info.filename == "resources.arsc":
                    should_compress = False
                core_files.append((info.filename, raw, should_compress))

        with open(dex_path, "rb") as f:
            dex_bytes = f.read()
        core_files.append(("classes.dex", dex_bytes, True))

        # 7. Sign with RSA-2048 X.509 certificate (V1 JAR + APK Signature Scheme v2)
        key_pem = os.path.join(tmp, "key.pem")
        cert_pem = os.path.join(tmp, "cert.pem")
        cert_der_path = os.path.join(tmp, "cert.der")
        pubkey_der_path = os.path.join(tmp, "pub.der")

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
        subprocess.run(["openssl", "x509", "-in", cert_pem, "-outform", "DER", "-out", cert_der_path], check=True)
        subprocess.run(["openssl", "pkey", "-in", key_pem, "-pubout", "-outform", "DER", "-out", pubkey_der_path], check=True)

        with open(cert_der_path, "rb") as f:
            cert_der = f.read()
        with open(pubkey_der_path, "rb") as f:
            spki_der = f.read()

        # V1 JAR Signature
        mf_sections = ["Manifest-Version: 1.0\r\nCreated-By: TrillXP Official APK Compiler 1.1\r\n\r\n"]
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
        struct.pack_into("<I", eocd_bytes, 16, cd_off)

        # APK Signature Scheme v2 Signing Block (`APK Sig Block 42`, ID 0x7109871a)
        ALGO_RSA_PKCS1_V15_SHA256 = 0x0103
        v2_digest = compute_apk_v2_chunked_digest(before_cd, cd_bytes, bytes(eocd_bytes))

        digest_entry = lp_bytes(struct.pack("<I", ALGO_RSA_PKCS1_V15_SHA256) + lp_bytes(v2_digest))
        digests_seq = lp_bytes(digest_entry)
        certs_seq = lp_bytes(lp_bytes(cert_der))
        attrs_seq = lp_bytes(b"")
        signed_data = digests_seq + certs_seq + attrs_seq

        sd_path = os.path.join(tmp, "signed_data.bin")
        sig_path = os.path.join(tmp, "sig.bin")
        with open(sd_path, "wb") as f:
            f.write(signed_data)

        subprocess.run(["openssl", "dgst", "-sha256", "-sign", key_pem, "-out", sig_path, sd_path], check=True)
        with open(sig_path, "rb") as f:
            rsa_sig = f.read()

        sig_entry = lp_bytes(struct.pack("<I", ALGO_RSA_PKCS1_V15_SHA256) + lp_bytes(rsa_sig))
        signatures_seq = lp_bytes(sig_entry)
        signer = lp_bytes(lp_bytes(signed_data) + signatures_seq + lp_bytes(spki_der))
        v2_block_value = lp_bytes(signer)

        pair_v2 = struct.pack("<QI", 4 + len(v2_block_value), 0x7109871A) + v2_block_value
        raw_total = 8 + len(pair_v2) + 8 + 16
        rem = raw_total % 4096
        pairs = pair_v2
        if rem != 0:
            need = 4096 - rem
            if need < 12:
                need += 4096
            pad_val_len = need - 12
            pairs += struct.pack("<QI", 4 + pad_val_len, 0x42726577) + (b"\x00" * pad_val_len)

        size_of_block = len(pairs) + 8 + 16
        apk_sig_block = (
            struct.pack("<Q", size_of_block)
            + pairs
            + struct.pack("<Q", size_of_block)
            + b"APK Sig Block 42"
        )

        new_cd_off = cd_off + len(apk_sig_block)
        struct.pack_into("<I", eocd_bytes, 16, new_cd_off)

        final_apk = before_cd + apk_sig_block + cd_bytes + bytes(eocd_bytes)
        with open(OUT_APK, "wb") as f:
            f.write(final_apk)

        # Also sync into `dist/downloads/TrillXP.apk` so production server serves the updated APK
        dist_dl_dir = os.path.join(DIST_DIR, "downloads")
        os.makedirs(dist_dl_dir, exist_ok=True)
        shutil.copy2(OUT_APK, os.path.join(dist_dl_dir, "TrillXP.apk"))

        apk_sha256 = hashlib.sha256(final_apk).hexdigest()
        cert_sha256 = hashlib.sha256(cert_der).hexdigest()
        print(f"Successfully built & signed {OUT_APK} ({len(final_apk):,} bytes / {len(final_apk)/(1024*1024):.2f} MB)")
        print(f"Entries bundled : {len(core_files)}")
        print(f"APK SHA-256     : {apk_sha256}")
        print(f"Cert SHA-256    : {cert_sha256}")


if __name__ == "__main__":
    build_and_sign_apk()
