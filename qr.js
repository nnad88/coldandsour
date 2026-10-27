/* A QR encoder, because the table should not need a CDN to join.
   Byte mode, error level L, versions 1-20 — far more than a join link needs.
   Verified matrix-for-matrix against a reference encoder across every mask. */
(function (root) {
  "use strict";

  /* ---- GF(256), the field Reed-Solomon lives in ---- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    for (var x = 1, i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function polyMul(a, b) {
    var r = new Array(a.length + b.length - 1);
    for (var i = 0; i < r.length; i++) r[i] = 0;
    for (var x = 0; x < a.length; x++)
      for (var y = 0; y < b.length; y++) r[x + y] ^= mul(a[x], b[y]);
    return r;
  }
  function rsGen(n) { var g = [1]; for (var i = 0; i < n; i++) g = polyMul(g, [1, EXP[i]]); return g; }
  function rsEnc(data, n) {
    var g = rsGen(n), res = new Array(n), i, j;
    for (i = 0; i < n; i++) res[i] = 0;
    for (i = 0; i < data.length; i++) {
      var f = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (f !== 0) for (j = 0; j < n; j++) res[j] ^= mul(g[j + 1], f);
    }
    return res;
  }

  /* ---- level L: [ec per block, blocks A, data A, blocks B, data B] ---- */
  var LEC = [null,
    [7,1,19,0,0],   [10,1,34,0,0],  [15,1,55,0,0],  [20,1,80,0,0],  [26,1,108,0,0],
    [18,2,68,0,0],  [20,2,78,0,0],  [24,2,97,0,0],  [30,2,116,0,0], [18,2,68,2,69],
    [20,4,81,0,0],  [24,2,92,2,93], [26,4,107,0,0], [30,3,115,1,116],[22,5,87,1,88],
    [24,5,98,1,99], [28,1,107,5,108],[30,5,120,1,121],[28,3,113,4,114],[28,3,107,5,108]
  ];
  var ALIGN = [null, [], [6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],
    [6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],
    [6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90]];
  function remainderBits(v) { return v === 1 ? 0 : v <= 6 ? 7 : v <= 13 ? 0 : 3; }

  function formatBits(mask) {
    var d = (1 << 3) | mask;                 // 01 = level L
    var rem = d << 10;
    for (var i = 14; i >= 10; i--) if (rem & (1 << i)) rem ^= 0x537 << (i - 10);
    return ((d << 10) | rem) ^ 0x5412;
  }
  function versionBits(v) {
    var rem = v << 12;
    for (var i = 17; i >= 12; i--) if (rem & (1 << i)) rem ^= 0x1F25 << (i - 12);
    return (v << 12) | rem;
  }

  function utf8(str) {
    var out = [], s = unescape(encodeURIComponent(str));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xFF);
    return out;
  }

  function capacity(v) { var t = LEC[v]; return t[1] * t[2] + t[3] * t[4]; }

  function pickVersion(len) {
    for (var v = 1; v <= 20; v++) {
      var header = 4 + (v < 10 ? 8 : 16);
      if (capacity(v) * 8 >= header + len * 8) return v;
    }
    return 0;
  }

  function codewords(bytes, v) {
    var bits = [], i, j;
    function push(val, n) { for (var k = n - 1; k >= 0; k--) bits.push((val >> k) & 1); }
    push(4, 4);                                   // byte mode
    push(bytes.length, v < 10 ? 8 : 16);
    for (i = 0; i < bytes.length; i++) push(bytes[i], 8);
    var total = capacity(v) * 8;
    for (i = 0; i < 4 && bits.length < total; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    var data = [];
    for (i = 0; i < bits.length; i += 8) {
      var b = 0; for (j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data.push(b);
    }
    var pad = [0xEC, 0x11], p = 0;
    while (data.length < capacity(v)) data.push(pad[p++ % 2]);

    // split into blocks, then interleave data and error codewords
    var t = LEC[v], blocks = [], ecs = [], at = 0;
    function take(count, n) {
      for (var b = 0; b < count; b++) {
        var chunk = data.slice(at, at + n); at += n;
        blocks.push(chunk); ecs.push(rsEnc(chunk, t[0]));
      }
    }
    take(t[1], t[2]); take(t[3], t[4]);

    var out = [], maxD = Math.max(t[2], t[4] || 0);
    for (i = 0; i < maxD; i++)
      for (j = 0; j < blocks.length; j++) if (i < blocks[j].length) out.push(blocks[j][i]);
    for (i = 0; i < t[0]; i++)
      for (j = 0; j < ecs.length; j++) out.push(ecs[j][i]);
    return out;
  }

  function build(v, words, mask) {
    var n = 17 + 4 * v, i, j, r, c;
    var m = [], fixed = [];
    for (i = 0; i < n; i++) { m.push(new Array(n).fill(0)); fixed.push(new Array(n).fill(0)); }

    function put(row, col, val) { m[row][col] = val; fixed[row][col] = 1; }

    function finder(row, col) {
      for (r = -1; r <= 7; r++) for (c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        put(rr, cc, on ? 1 : 0);
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

    for (i = 8; i < n - 8; i++) { put(6, i, i % 2 === 0 ? 1 : 0); put(i, 6, i % 2 === 0 ? 1 : 0); }

    var cen = ALIGN[v];
    for (i = 0; i < cen.length; i++) for (j = 0; j < cen.length; j++) {
      var ar = cen[i], ac = cen[j];
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= n - 9) || (ar >= n - 9 && ac <= 8)) continue;
      for (r = -2; r <= 2; r++) for (c = -2; c <= 2; c++)
        put(ar + r, ac + c, (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) ? 1 : 0);
    }

    put(n - 8, 8, 1);                                   // the always-dark module

    // reserve the format areas before data is laid down
    for (i = 0; i <= 8; i++) { if (!fixed[8][i]) put(8, i, 0); if (!fixed[i][8]) put(i, 8, 0); }
    for (i = 0; i < 8; i++) { if (!fixed[8][n - 1 - i]) put(8, n - 1 - i, 0);
                              if (!fixed[n - 1 - i][8]) put(n - 1 - i, 8, 0); }
    if (v >= 7) for (i = 0; i < 18; i++) {
      var vr = Math.floor(i / 3), vc = i % 3;
      put(n - 11 + vc, vr, 0); put(vr, n - 11 + vc, 0);
    }

    // data, snaking up and down two columns at a time
    var bit = 0, up = true;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var step = 0; step < n; step++) {
        var row = up ? n - 1 - step : step;
        for (var k = 0; k < 2; k++) {
          var cc2 = col - k;
          if (fixed[row][cc2]) continue;
          var val = 0;
          if (bit < words.length * 8) val = (words[bit >> 3] >> (7 - (bit & 7))) & 1;
          bit++;
          if (maskAt(mask, row, cc2)) val ^= 1;
          m[row][cc2] = val;
        }
      }
      up = !up;
    }

    // format info, least significant bit first, in both of its copies
    var f = formatBits(mask);
    for (i = 0; i <= 5; i++) m[i][8] = (f >> i) & 1;
    m[7][8] = (f >> 6) & 1; m[8][8] = (f >> 7) & 1; m[8][7] = (f >> 8) & 1;
    for (i = 9; i <= 14; i++) m[8][14 - i] = (f >> i) & 1;
    for (i = 0; i <= 7; i++) m[8][n - 1 - i] = (f >> i) & 1;
    for (i = 8; i <= 14; i++) m[n - 15 + i][8] = (f >> i) & 1;

    if (v >= 7) {
      var vb = versionBits(v);
      for (i = 0; i < 18; i++) {
        var b = (vb >> i) & 1, rr2 = Math.floor(i / 3), cc3 = i % 3;
        m[n - 11 + cc3][rr2] = b; m[rr2][n - 11 + cc3] = b;
      }
    }
    return m;
  }

  function maskAt(k, r, c) {
    switch (k) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  function penalty(m) {
    var n = m.length, score = 0, i, j, run, dark = 0;
    for (i = 0; i < n; i++) {
      run = 1;
      for (j = 1; j < n; j++) {
        if (m[i][j] === m[i][j - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
      run = 1;
      for (j = 1; j < n; j++) {
        if (m[j][i] === m[j - 1][i]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < n - 1; j++) {
      var s = m[i][j] + m[i][j + 1] + m[i + 1][j] + m[i + 1][j + 1];
      if (s === 0 || s === 4) score += 3;
    }
    var pat1 = [1,0,1,1,1,0,1,0,0,0,0], pat2 = [0,0,0,0,1,0,1,1,1,0,1];
    function look(get, len) {
      for (var a = 0; a + 11 <= len; a++) {
        var ok1 = true, ok2 = true;
        for (var b = 0; b < 11; b++) {
          var val = get(a + b);
          if (val !== pat1[b]) ok1 = false;
          if (val !== pat2[b]) ok2 = false;
        }
        if (ok1) score += 40;
        if (ok2) score += 40;
      }
    }
    for (i = 0; i < n; i++) {
      (function (row) { look(function (k) { return m[row][k]; }, n); })(i);
      (function (col) { look(function (k) { return m[k][col]; }, n); })(i);
    }
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) dark += m[i][j];
    score += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
    return score;
  }

  /* Returns a square array of 0/1 rows, or null when the text will not fit. */
  function matrix(text, forceMask) {
    var bytes = utf8(text), v = pickVersion(bytes.length);
    if (!v) return null;
    var words = codewords(bytes, v);
    var pad = remainderBits(v);
    if (pad) words = words.concat([0]);        // remainder bits ride in a spare byte
    if (typeof forceMask === "number") return build(v, words, forceMask);
    var best = null, bestScore = Infinity;
    for (var k = 0; k < 8; k++) {
      var m = build(v, words, k), p = penalty(m);
      if (p < bestScore) { bestScore = p; best = m; }
    }
    return best;
  }

  /* Paints into a canvas at whole-pixel module size, so it never blurs. */
  function toCanvas(canvas, text, size, quiet) {
    var m = matrix(text);
    if (!m) return false;
    var n = m.length;
    quiet = quiet == null ? 2 : quiet;
    // draw in device pixels: at 2 CSS px per module a camera struggles, and a
    // phone's screen has two or three real pixels for every CSS one
    var dpr = Math.min(3, Math.max(1, (root.devicePixelRatio || 1)));
    var scale = Math.max(2, Math.floor(size * dpr / (n + quiet * 2)));
    var px = (n + quiet * 2) * scale;
    canvas.width = px; canvas.height = px;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    var cx = canvas.getContext("2d");
    cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, px, px);
    cx.fillStyle = "#16141A";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
      if (m[r][c]) cx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    return true;
  }

  root.CasQR = { matrix: matrix, toCanvas: toCanvas };
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) module.exports = globalThis.CasQR;
