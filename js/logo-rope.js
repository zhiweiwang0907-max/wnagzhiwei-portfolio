/* ── Logo 麻绳：wang ↔ 笑脸 切换 ── */
(function () {
  const canvas = document.getElementById('logo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function cubicPts(p0,p1,p2,p3,n){const a=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;a.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]);}return a;}
  function linePts(p0,p1,n){const a=[];for(let i=0;i<=n;i++){const t=i/n;a.push([p0[0]+(p1[0]-p0[0])*t,p0[1]+(p1[1]-p0[1])*t]);}return a;}
  function arcPts(cx,cy,rx,ry,a0,a1,n){const a=[];for(let i=0;i<=n;i++){const t=a0+(a1-a0)*i/n;a.push([cx+rx*Math.cos(t),cy+ry*Math.sin(t)]);}return a;}
  function dedup(pts){return pts.filter((p,i)=>i===0||Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1])>0.5);}

  // ── "wang" 路径 ──
  const sc=H*0.72, ox=4, oy=H*0.78;
  function pt(nx,ny){return[ox+nx*(W-8),oy-ny*sc];}
  let wangPath=[];
  wangPath.push(...linePts(pt(0.00,1),pt(0.04,0),6));
  wangPath.push(...linePts(pt(0.04,0),pt(0.08,0.6),4));
  wangPath.push(...linePts(pt(0.08,0.6),pt(0.12,0),4));
  wangPath.push(...linePts(pt(0.12,0),pt(0.16,1),6));
  wangPath.push(...cubicPts(pt(0.28,0.5),pt(0.22,1.05),pt(0.18,0.05),pt(0.28,0.05),12));
  wangPath.push(...linePts(pt(0.28,0.05),pt(0.28,0.5),5));
  wangPath.push(...linePts(pt(0.32,0.5),pt(0.32,0.02),6));
  wangPath.push(...cubicPts(pt(0.32,0.5),pt(0.34,0.65),pt(0.44,0.65),pt(0.46,0.5),8));
  wangPath.push(...linePts(pt(0.46,0.5),pt(0.46,0.02),6));
  wangPath.push(...cubicPts(pt(0.64,0.5),pt(0.58,1.05),pt(0.50,1.05),pt(0.50,0.5),10));
  wangPath.push(...cubicPts(pt(0.50,0.5),pt(0.50,0.05),pt(0.64,0.05),pt(0.64,0.5),10));
  wangPath.push(...linePts(pt(0.64,0.5),pt(0.64,-0.15),4));
  wangPath.push(...cubicPts(pt(0.64,-0.15),pt(0.64,-0.35),pt(0.50,-0.35),pt(0.50,-0.15),6));
  wangPath = dedup(wangPath);

  // ── 笑脸路径（一笔画：脸圆 → 左眼 → 右眼 → 微笑弧） ──
  const cx=W/2, cy=H/2, fr=H*0.42;
  let facePath=[];
  // 脸圆
  facePath.push(...arcPts(cx,cy,fr,fr,0,Math.PI*2,32));
  // 连到左眼
  facePath.push(...linePts([cx-fr*0.32,cy-fr*0.18],[cx-fr*0.32,cy-fr*0.18],1));
  // 左眼小圆
  facePath.push(...arcPts(cx-fr*0.32,cy-fr*0.2,fr*0.1,fr*0.1,0,Math.PI*2,8));
  // 连到右眼
  facePath.push(...linePts([cx+fr*0.32,cy-fr*0.18],[cx+fr*0.32,cy-fr*0.18],1));
  // 右眼小圆
  facePath.push(...arcPts(cx+fr*0.32,cy-fr*0.2,fr*0.1,fr*0.1,0,Math.PI*2,8));
  // 连到微笑起点
  facePath.push(...linePts([cx-fr*0.38,cy+fr*0.1],[cx-fr*0.38,cy+fr*0.1],1));
  // 微笑弧
  facePath.push(...arcPts(cx,cy+fr*0.05,fr*0.38,fr*0.28,Math.PI,0,16));
  facePath = dedup(facePath);

  // 统一粒子数（取较少的那个，插值用）
  function resample(pts, n) {
    // 按弧长均匀重采样到 n 个点
    const lens = [0];
    for (let i=1;i<pts.length;i++) lens.push(lens[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
    const total = lens[lens.length-1];
    const out = [];
    for (let i=0;i<n;i++) {
      const target = total*i/(n-1);
      let j=0; while(j<lens.length-1&&lens[j+1]<target)j++;
      const t=lens[j+1]===lens[j]?0:(target-lens[j])/(lens[j+1]-lens[j]);
      out.push([pts[j][0]+(pts[j+1]?pts[j+1][0]-pts[j][0]:0)*t, pts[j][1]+(pts[j+1]?pts[j+1][1]-pts[j][1]:0)*t]);
    }
    return out;
  }

  const N = 80;
  const wangR  = resample(wangPath, N);
  const faceR  = resample(facePath, N);

  // 当前显示粒子位置（从 wang 开始）
  const particles = wangR.map(([x,y])=>({x,y}));

  // 状态
  let mode = 'wang'; // 'wang' | 'face'
  let morphT = 1; // 1=完全到位
  let morphFrom = null, morphTo = null;

  function startMorph(to) {
    morphFrom = particles.map(p=>({x:p.x,y:p.y}));
    morphTo   = to === 'face' ? faceR : wangR;
    mode = to;
    morphT = 0;
  }

  // hover 切换
  canvas.style.cursor = 'pointer';
  canvas.addEventListener('mouseenter', () => { if (mode !== 'face') startMorph('face'); });
  canvas.addEventListener('mouseleave', () => { if (mode !== 'wang') startMorph('wang'); });

  const COLOR = '#E8472A';
  const THICKNESS = 2.2;

  function drawRope() {
    ctx.clearRect(0,0,W,H);
    const pts = particles;
    for (let strand=0;strand<3;strand++) {
      ctx.beginPath();
      for (let i=0;i<N;i++) {
        const p=pts[i];
        let nx=0,ny=0;
        if(i<N-1){const dx=pts[i+1].x-p.x,dy=pts[i+1].y-p.y,d=Math.sqrt(dx*dx+dy*dy)||1;nx=-dy/d;ny=dx/d;}
        const off=Math.sin(i*0.22+strand*(Math.PI*2/3))*THICKNESS*0.65;
        i===0?ctx.moveTo(p.x+nx*off,p.y+ny*off):ctx.lineTo(p.x+nx*off,p.y+ny*off);
      }
      const bright=strand===1?1.0:0.68;
      const r=parseInt(COLOR.slice(1,3),16),g=parseInt(COLOR.slice(3,5),16),b=parseInt(COLOR.slice(5,7),16);
      ctx.strokeStyle=`rgb(${Math.round(r*bright)},${Math.round(g*bright)},${Math.round(b*bright)})`;
      ctx.lineWidth=THICKNESS*0.55; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke();
    }
    ctx.beginPath();
    for(let i=0;i<N;i++){const p=pts[i];let nx=0,ny=0;if(i<N-1){const dx=pts[i+1].x-p.x,dy=pts[i+1].y-p.y,d=Math.sqrt(dx*dx+dy*dy)||1;nx=-dy/d;ny=dx/d;}const off=Math.sin(i*0.22)*THICKNESS*0.28;i===0?ctx.moveTo(p.x+nx*off,p.y+ny*off):ctx.lineTo(p.x+nx*off,p.y+ny*off);}
    ctx.strokeStyle='rgba(255,255,255,0.28)'; ctx.lineWidth=THICKNESS*0.15; ctx.stroke();
  }

  // 入场：写出 wang
  let writeT = 0;
  const WRITE_DUR = 1400;
  let startTime = null;
  let writing = true;

  function ease(t){return t<0.5?2*t*t:-1+(4-2*t)*t;}

  function render(ts) {
    if (writing) {
      if (!startTime) startTime = ts;
      const p = Math.min((ts-startTime)/WRITE_DUR, 1);
      const vis = Math.floor(p*N);
      // 只显示前 vis 个粒子
      ctx.clearRect(0,0,W,H);
      if (vis >= 2) {
        const saved = particles.slice(vis);
        // 临时截断绘制
        const origN = N;
        const tmp = particles.splice(vis);
        // 用 N 替换
        const realN = particles.length;
        // 直接绘制前 vis 个
        for (let strand=0;strand<3;strand++){
          ctx.beginPath();
          for(let i=0;i<realN;i++){const p2=particles[i];let nx=0,ny=0;if(i<realN-1){const dx=particles[i+1].x-p2.x,dy=particles[i+1].y-p2.y,d=Math.sqrt(dx*dx+dy*dy)||1;nx=-dy/d;ny=dx/d;}const off=Math.sin(i*0.22+strand*(Math.PI*2/3))*THICKNESS*0.65;i===0?ctx.moveTo(p2.x+nx*off,p2.y+ny*off):ctx.lineTo(p2.x+nx*off,p2.y+ny*off);}
          const bright=strand===1?1.0:0.68;const r=parseInt(COLOR.slice(1,3),16),g=parseInt(COLOR.slice(3,5),16),b=parseInt(COLOR.slice(5,7),16);
          ctx.strokeStyle=`rgb(${Math.round(r*bright)},${Math.round(g*bright)},${Math.round(b*bright)})`;ctx.lineWidth=THICKNESS*0.55;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
        }
        particles.push(...tmp);
      }
      if (p < 1) { requestAnimationFrame(render); return; }
      writing = false;
    }

    // morph 动画
    if (morphFrom && morphT < 1) {
      morphT = Math.min(morphT + 0.04, 1);
      const e = ease(morphT);
      for (let i=0;i<N;i++) {
        particles[i].x = morphFrom[i].x + (morphTo[i][0]-morphFrom[i].x)*e;
        particles[i].y = morphFrom[i].y + (morphTo[i][1]-morphFrom[i].y)*e;
      }
      if (morphT >= 1) morphFrom = null;
    }

    drawRope();
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
