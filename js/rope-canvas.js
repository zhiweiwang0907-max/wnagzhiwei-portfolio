/* ── 彩色麻绳线条 ── */
(function () {
  const canvas = document.getElementById('rope-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = document.getElementById('hero-screen');

  let W, H;
  function resize() {
    W = canvas.width  = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
    initRopes();
  }

  let mx = -999, my = -999;
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
  });
  hero.addEventListener('mouseleave', () => { mx = -999; my = -999; });

  const COLORS = ['#E8472A','#F2A93B','#4A90D9','#7B5EA7','#2ECC8A','#E84393'];

  let expandT = 0, targetExpandT = 0;
  window.ropeSetExpand = (v) => { targetExpandT = v; };

  class Rope {
    constructor(color, gridIndex, total) {
      this.color = color;
      this.gridIndex = gridIndex;
      this.total = total;
      this.pts = [];
      this.reset();
    }
    reset() {
      const x0 = Math.random() * W;
      const y0 = Math.random() * H * 0.3 + H * 0.05;
      const x1 = Math.random() * W;
      const y1 = Math.random() * H * 0.3 + H * 0.55;
      const N = 28 + Math.floor(Math.random() * 12);
      this.pts = Array.from({ length: N }, (_, i) => {
        const t = i / (N - 1);
        return { x: x0+(x1-x0)*t, y: y0+(y1-y0)*t, px: x0+(x1-x0)*t, py: y0+(y1-y0)*t };
      });
      this.segLen = Math.hypot(x1-x0, y1-y0) / (N-1);
      this.ax = x0; this.ay = y0; this.bx = x1; this.by = y1;
      this.thickness = 1.8 + Math.random() * 2.2;
      this.twist = 0.18 + Math.random() * 0.14;
      this.phase = Math.random() * Math.PI * 2;
    }
    gridTarget(i, N) {
      const row = (this.gridIndex + 1) / (this.total + 1);
      return { x: (i / (N-1)) * W, y: row * H };
    }
    update() {
      const pts = this.pts, N = pts.length;
      for (let i = 1; i < N-1; i++) {
        const p = pts[i];
        const vx = (p.x - p.px) * 0.985;
        const vy = (p.y - p.py) * 0.985;
        let fx = 0, fy = 0;
        if (expandT < 0.8) {
          const dx = p.x - mx, dy = p.y - my;
          const d2 = dx*dx + dy*dy;
          if (d2 < 14400) {
            const d = Math.sqrt(d2) + 0.1;
            const f = (120-d) * 0.18 / d * (1-expandT);
            fx += dx*f; fy += dy*f;
          }
        }
        fx += (Math.random()-0.5) * 0.12 * (1-expandT);
        fy += (Math.random()-0.5) * 0.12 * (1-expandT);
        if (expandT > 0.01) {
          const g = this.gridTarget(i, N);
          fx += (g.x - p.x) * expandT * 0.25;
          fy += (g.y - p.y) * expandT * 0.25;
        }
        p.px = p.x; p.py = p.y;
        p.x += vx + fx;
        p.y += vy + fy + 0.08 * (1-expandT);
      }
      const g0 = this.gridTarget(0, N), gN = this.gridTarget(N-1, N);
      pts[0].x   = this.ax + (g0.x - this.ax) * expandT;
      pts[0].y   = this.ay + (g0.y - this.ay) * expandT;
      pts[N-1].x = this.bx + (gN.x - this.bx) * expandT;
      pts[N-1].y = this.by + (gN.y - this.by) * expandT;
      for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < N-1; i++) {
          const a = pts[i], b = pts[i+1];
          const dx = b.x-a.x, dy = b.y-a.y;
          const d = Math.sqrt(dx*dx+dy*dy) || 0.001;
          const diff = (d-this.segLen)/d*0.5;
          const ox = dx*diff, oy = dy*diff;
          if (i > 0)   { a.x += ox; a.y += oy; }
          if (i < N-2) { b.x -= ox; b.y -= oy; }
        }
        pts[0].x   = this.ax + (g0.x-this.ax)*expandT;
        pts[0].y   = this.ay + (g0.y-this.ay)*expandT;
        pts[N-1].x = this.bx + (gN.x-this.bx)*expandT;
        pts[N-1].y = this.by + (gN.y-this.by)*expandT;
      }
    }
    draw(t) {
      const pts = this.pts, N = pts.length;
      const tw = this.twist, th = this.thickness;
      const alpha = 1 - expandT * 0.5;
      const lineW = th * (1 - expandT * 0.4);
      for (let strand = 0; strand < 3; strand++) {
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const p = pts[i];
          let nx = 0, ny = 0;
          if (i < N-1) {
            const dx = pts[i+1].x-p.x, dy = pts[i+1].y-p.y;
            const d = Math.sqrt(dx*dx+dy*dy)||1;
            nx = -dy/d; ny = dx/d;
          }
          const angle = i*tw + strand*(Math.PI*2/3) + this.phase + t*0.4;
          const off = Math.sin(angle) * lineW * 0.7 * (1-expandT*0.8);
          i===0 ? ctx.moveTo(p.x+nx*off, p.y+ny*off) : ctx.lineTo(p.x+nx*off, p.y+ny*off);
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.strandColor(strand===1 ? 1.0 : 0.72);
        ctx.lineWidth = lineW * 0.55;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke();
      }
      // 高光
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        let nx=0, ny=0;
        if (i<N-1) {
          const dx=pts[i+1].x-p.x, dy=pts[i+1].y-p.y, d=Math.sqrt(dx*dx+dy*dy)||1;
          nx=-dy/d; ny=dx/d;
        }
        const off = Math.sin(i*tw+this.phase+t*0.4) * lineW*0.3*(1-expandT*0.8);
        i===0 ? ctx.moveTo(p.x+nx*off, p.y+ny*off) : ctx.lineTo(p.x+nx*off, p.y+ny*off);
      }
      ctx.globalAlpha = alpha * 0.22;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = lineW * 0.18;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    strandColor(bright) {
      const c=this.color;
      const r=parseInt(c.slice(1,3),16), g=parseInt(c.slice(3,5),16), b=parseInt(c.slice(5,7),16);
      return `rgb(${Math.round(r*bright)},${Math.round(g*bright)},${Math.round(b*bright)})`;
    }
  }

  let ropes = [];
  function initRopes() {
    ropes = COLORS.map((c,i) => new Rope(c, i, COLORS.length));
  }

  let time = 0;
  function render() {
    expandT += (targetExpandT - expandT) * 0.06;
    ctx.clearRect(0, 0, W, H);
    time += 0.016;
    ropes.forEach(r => { r.update(); r.draw(time); });
    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  resize();
  render();
})();
