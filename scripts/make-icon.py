"""Compose the browser icon: the survey's disc, at icon sizes.

The disc is `#ef6148` with the Designally mark laid on it at 56% of the
diameter, nudged +5% / -1% of its own width for optical centring — the same
three numbers `.qdisc.markdisc img` uses, so the tab and the survey show one
object rather than two drawings of it.

Pure stdlib: zlib and struct. No PIL in this project and none added for one
asset.
"""
import struct, zlib, math

ORANGE = (0xEF, 0x61, 0x48)
# Of the disc's diameter. 0.56 is the survey's own figure and it is right down
# to about 48px; below that the rim is spending pixels the mark needs, and the
# separated dot — the whole point of the corrected artwork — closes up into the
# bowl. Optical scaling, the way an icon set has always been drawn: the smaller
# the tile, the larger the drawing inside it.
MARK_BY_SIZE = {512: 0.56, 180: 0.56, 48: 0.62, 32: 0.68, 16: 0.76}
NUDGE_X = 0.05              # of the mark's own width
NUDGE_Y = -0.01


def read_rgba(path):
    d = open(path, 'rb').read()
    w, h = struct.unpack('>II', d[16:24])
    bitdepth, ctype, interlace = d[24], d[25], d[28]
    assert (bitdepth, ctype, interlace) == (8, 6, 0), (bitdepth, ctype, interlace)
    idat, i = b'', 8
    while i < len(d):
        ln = struct.unpack('>I', d[i:i + 4])[0]
        if d[i + 4:i + 8] == b'IDAT':
            idat += d[i + 8:i + 8 + ln]
        i += 12 + ln
    raw = zlib.decompress(idat)
    bpp, stride = 4, w * 4
    def paeth(a, b, c):
        p = a + b - c
        pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
        return a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
    prev, rows, pos = bytearray(stride), [], 0
    for _ in range(h):
        f = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos + stride]); pos += stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            v = line[x]
            if   f == 1: v += a
            elif f == 2: v += b
            elif f == 3: v += (a + b) // 2
            elif f == 4: v += paeth(a, b, c)
            line[x] = v & 0xFF
        rows.append(line); prev = line
    return w, h, rows


def mark_alpha(mx, my, rows, mw, mh):
    """Bilinear alpha of the mark at a fractional pixel. Colour is white."""
    if mx < 0 or my < 0 or mx > mw - 1 or my > mh - 1:
        return 0.0
    x0, y0 = int(mx), int(my)
    x1, y1 = min(x0 + 1, mw - 1), min(y0 + 1, mh - 1)
    fx, fy = mx - x0, my - y0
    def a(x, y): return rows[y][x * 4 + 3]
    top = a(x0, y0) * (1 - fx) + a(x1, y0) * fx
    bot = a(x0, y1) * (1 - fx) + a(x1, y1) * fx
    return (top * (1 - fy) + bot * fy) / 255.0


def compose(size, mw, mh, rows):
    r = size / 2.0
    cx = cy = r
    scaled_w = size * MARK_BY_SIZE[size]
    scaled_h = scaled_w * mh / mw
    left = (size - scaled_w) / 2.0 + scaled_w * NUDGE_X
    top = (size - scaled_h) / 2.0 + scaled_h * NUDGE_Y
    out = bytearray()
    for y in range(size):
        out.append(0)                                   # filter: None
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            # circle coverage, one pixel of feather so the rim is not stepped
            dist = math.hypot(px - cx, py - cy)
            disc = max(0.0, min(1.0, r - dist + 0.5))
            if disc <= 0:
                out += b'\x00\x00\x00\x00'
                continue
            m = 0.0
            if scaled_w > 0:
                m = mark_alpha((px - left) * (mw - 1) / scaled_w,
                               (py - top) * (mh - 1) / scaled_h, rows, mw, mh)
            # white mark over orange, the pair then cut to the circle
            rr = ORANGE[0] + (255 - ORANGE[0]) * m
            gg = ORANGE[1] + (255 - ORANGE[1]) * m
            bb = ORANGE[2] + (255 - ORANGE[2]) * m
            out += bytes((round(rr), round(gg), round(bb), round(disc * 255)))
    return bytes(out)


def png(size, raw_scanlines):
    def chunk(t, data):
        return (struct.pack('>I', len(data)) + t + data +
                struct.pack('>I', zlib.crc32(t + data) & 0xFFFFFFFF))
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw_scanlines, 9))
            + chunk(b'IEND', b''))


def ico(pngs):
    """ICO holding PNG entries — the format every browser since IE11 reads."""
    head = struct.pack('<HHH', 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries, blobs = b'', b''
    for size, blob in pngs:
        entries += struct.pack('<BBBBHHII', size if size < 256 else 0,
                               size if size < 256 else 0, 0, 0, 1, 32,
                               len(blob), offset)
        blobs += blob
        offset += len(blob)
    return head + entries + blobs


if __name__ == '__main__':
    mw, mh, rows = read_rgba('public/designally-mark.png')
    made = {}
    for size in (512, 180, 48, 32, 16):
        made[size] = png(size, compose(size, mw, mh, rows))
        print(f'  {size:>3}px  {len(made[size]):>6} bytes')
    open('src/app/icon.png', 'wb').write(made[512])
    open('src/app/apple-icon.png', 'wb').write(made[180])
    open('src/app/favicon.ico', 'wb').write(
        ico([(48, made[48]), (32, made[32]), (16, made[16])]))
    print('wrote src/app/icon.png, apple-icon.png, favicon.ico')
