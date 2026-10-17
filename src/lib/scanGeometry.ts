/**
 * Scan geometry (v1.5) — straighten a photographed page.
 *
 * The student drags the four corners of the page (or accepts the automatic
 * guess); the page is then "un-tilted" into a flat rectangle, like a
 * scanner app does. Pure maths, no libraries — unit-tested.
 */

export type Pt = [number, number];
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt];

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Output size for a quad: the longer of each pair of opposite edges. */
export function quadSize(q: Quad): { w: number; h: number } {
  return {
    w: Math.max(dist(q[0], q[1]), dist(q[3], q[2])),
    h: Math.max(dist(q[0], q[3]), dist(q[1], q[2])),
  };
}

/**
 * Homography (3×3, h33 = 1) that maps each `from` point onto the matching
 * `to` point. Returned as [a,b,c,d,e,f,g,h]:
 *   x' = (a x + b y + c) / (g x + h y + 1),  y' = (d x + e y + f) / (g x + h y + 1)
 */
export function homography(from: Quad, to: Quad): number[] {
  const A: number[][] = [];
  const B: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i];
    const [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
  }
  return solve(A, B);
}

export function applyHomography(H: number[], x: number, y: number): Pt {
  const w = H[6] * x + H[7] * y + 1;
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

/** Gaussian elimination with partial pivoting. */
function solve(A: number[][], B: number[]): number[] {
  const n = B.length;
  const M = A.map((row, i) => [...row, B[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const pivot = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / pivot;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

/**
 * Copy the quad from `src` (RGBA, sw×sh) into a flat dw×dh image.
 * Bilinear sampling for smooth handwriting.
 */
export function warpQuad(src: Uint8ClampedArray, sw: number, sh: number, q: Quad, dw: number, dh: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dw * dh * 4);
  const rect: Quad = [[0, 0], [dw - 1, 0], [dw - 1, dh - 1], [0, dh - 1]];
  const H = homography(rect, q);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const w = H[6] * x + H[7] * y + 1;
      let sx = (H[0] * x + H[1] * y + H[2]) / w;
      let sy = (H[3] * x + H[4] * y + H[5]) / w;
      sx = Math.min(sw - 1.001, Math.max(0, sx));
      sy = Math.min(sh - 1.001, Math.max(0, sy));
      const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const o = (y * dw + x) * 4;
      for (let k = 0; k < 3; k++) {
        const top = src[i00 + k] + (src[i10 + k] - src[i00 + k]) * fx;
        const bot = src[i01 + k] + (src[i11 + k] - src[i01 + k]) * fx;
        out[o + k] = top + (bot - top) * fy;
      }
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Default corners: a small margin inside the photo. */
export function insetQuad(w: number, h: number, margin = 0.04): Quad {
  const mx = w * margin, my = h * margin;
  return [[mx, my], [w - mx, my], [w - mx, h - my], [mx, h - my]];
}

/**
 * Guess where the page is: the paper is usually the brightest large area.
 * Works on a small greyscale copy (gw×gh). Returns corners in that grid, or
 * null when it can't tell (then the inset default is used).
 */
export function detectPage(gray: Uint8Array | Uint8ClampedArray, gw: number, gh: number): Quad | null {
  // Otsu threshold: best split between dark background and bright paper
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * hist[v];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let v = 0; v < 256; v++) {
    wB += hist[v];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += v * hist[v];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; threshold = v; }
  }
  let count = 0;
  let tl: Pt = [0, 0], tr: Pt = [0, 0], br: Pt = [0, 0], bl: Pt = [0, 0];
  let sMin = Infinity, sMax = -Infinity, dMin = Infinity, dMax = -Infinity;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (gray[y * gw + x] <= threshold) continue;
      count++;
      const s = x + y, d = x - y;
      if (s < sMin) { sMin = s; tl = [x, y]; }
      if (s > sMax) { sMax = s; br = [x, y]; }
      if (d > dMax) { dMax = d; tr = [x, y]; }
      if (d < dMin) { dMin = d; bl = [x, y]; }
    }
  }
  const share = count / total;
  // Paper should be a clear, not total, part of the photo
  if (share < 0.15 || share > 0.97) return null;
  const q: Quad = [tl, tr, br, bl];
  const { w, h } = quadSize(q);
  if (w < gw * 0.3 || h < gh * 0.3) return null;
  return q;
}
