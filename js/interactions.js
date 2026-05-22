/* ── 光标（CSS 原生，零延迟） ── */


/* ── 噪点纹理 ── */
const grainCanvas = document.getElementById('grain-canvas');
if (grainCanvas) {
  const gc = grainCanvas.getContext('2d');
  function drawGrain() {
    grainCanvas.width = window.innerWidth;
    grainCanvas.height = window.innerHeight;
    const img = gc.createImageData(grainCanvas.width, grainCanvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255 | 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = 255;
    }
    gc.putImageData(img, 0, 0);
  }
  drawGrain();
  setInterval(drawGrain, 80);
}

/* ── Hero ↔ 项目卡片 变形切换 ── */
const heroScreen = document.getElementById('hero-screen');
if (heroScreen) {
  const heroText    = document.getElementById('hero-text');
  const cardsOverlay= document.getElementById('cards-overlay');
  const projectGrid = document.getElementById('project-grid');
  const scrollHint  = document.getElementById('scroll-hint');
  let expanded = false, locked = false;

  // 静态项目数据
  const projects = [
    { href: 'project.html?id=1', color: '#C44DFF', tag: 'Brand Identity', title: 'Project Title One · 2024' },
    { href: 'project.html?id=2', color: '#4776E6', tag: 'Visual System',  title: 'Project Title Two · 2024' },
    { href: 'project.html?id=3', color: '#1ABC9C', tag: 'Packaging',      title: 'Project Title Three · 2023' },
    { href: 'project.html?id=4', color: '#FF8C42', tag: 'Motion',         title: 'Project Title Four · 2024' },
    { href: 'project.html?id=5', color: '#9B59B6', tag: 'Brand Refresh',  title: 'Project Title Five · 2023' },
  ];
  const total = projects.length;
  projects.forEach((p, i) => {
    const a = document.createElement('a');
    a.href = p.href;
    a.className = 'project-card';
    a.innerHTML = `<div class="card-cover"><div style="width:100%;height:100%;background:${p.color}"></div></div><div class="card-body"><div class="card-tags"><span class="tag">${p.tag}</span></div><p class="card-title">${p.title}</p></div>`;
    // 对齐到第 i 条线：top = (i+1)/(total+1)*100%，水平错落
    const topPct = ((i + 1) / (total + 1) * 100).toFixed(1);
    const leftOffsets = [5, 22, 42, 58, 72]; // 每张卡片水平位置 %
    a.style.top  = `${topPct}%`;
    a.style.left = `${leftOffsets[i] ?? (10 + i * 16)}%`;
    projectGrid.appendChild(a);
  });

  function expand() {
    if (locked || expanded) return;
    locked = true; expanded = true;
    if (window.ropeSetExpand) window.ropeSetExpand(1);
    heroText.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    heroText.style.opacity = '0';
    heroText.style.transform = 'translateY(-20px)';
    scrollHint.classList.add('hidden');
    cardsOverlay.classList.add('visible');
    setTimeout(() => {
      cardsOverlay.style.transition = 'opacity 0.35s ease';
      cardsOverlay.style.opacity = '1';
      cardsOverlay.style.pointerEvents = 'all';
      locked = false;
    }, 300);
  }

  function collapse() {
    if (locked || !expanded) return;
    locked = true; expanded = false;
    if (window.ropeSetExpand) window.ropeSetExpand(0);
    cardsOverlay.style.transition = 'opacity 0.25s ease';
    cardsOverlay.style.opacity = '0';
    cardsOverlay.style.pointerEvents = 'none';
    setTimeout(() => {
      cardsOverlay.classList.remove('visible');
      heroText.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      heroText.style.opacity = '1';
      heroText.style.transform = 'translateY(0)';
      scrollHint.classList.remove('hidden');
      locked = false;
    }, 280);
  }

  window.addEventListener('wheel', e => {
    if (e.deltaY > 30) expand();
    else if (e.deltaY < -30) collapse();
  }, { passive: true });

  let touchY = 0;
  window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', e => {
    const dy = touchY - e.changedTouches[0].clientY;
    if (dy > 40) expand(); else if (dy < -40) collapse();
  }, { passive: true });

  // 初始 reveal
  heroScreen.querySelectorAll('.split-text').forEach(el => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const parts = el.innerHTML.split(/(<br\s*\/?>|\s+)/);
    el.innerHTML = parts.map(p => /^<br/i.test(p) || !p.trim() ? p : `<span class="word">${p}</span>`).join('');
  });
  heroScreen.querySelectorAll('.word, .reveal').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 80 + i * 70);
  });
}


/* ── 音乐播放器 ── */
const player = document.getElementById('music-player');
const trigger = document.getElementById('music-trigger');
if (player && trigger) {
  const songs = [
    { title: "Comptine d'un autre été", artist: "Yann Tiersen",      dur: "3:24" },
    { title: "Experience",              artist: "Ludovico Einaudi",   dur: "5:13" },
    { title: "Clair de Lune",           artist: "Debussy",            dur: "4:52" },
    { title: "River Flows in You",      artist: "Yiruma",             dur: "3:51" },
    { title: "Nuvole Bianche",          artist: "Ludovico Einaudi",   dur: "5:57" },
    { title: "Gymnopédie No.1",         artist: "Erik Satie",         dur: "3:05" },
    { title: "Fly",                     artist: "Ludovico Einaudi",   dur: "3:44" },
  ];

  let cur = 0, playing = false, progress = 0, timer = null;
  const disc   = document.getElementById('mp-disc');
  const songEl = document.getElementById('mp-song');
  const artEl  = document.getElementById('mp-artist');
  const fill   = document.getElementById('mp-fill');
  const curEl  = document.getElementById('mp-cur');
  const durEl  = document.getElementById('mp-dur');
  const list   = document.getElementById('mp-list');
  const playBtn= document.getElementById('mp-play');

  // 渲染列表
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `${s.title}<span>${s.artist}</span>`;
    li.addEventListener('click', () => { cur = i; progress = 0; load(); if (!playing) togglePlay(); });
    list.appendChild(li);
  });

  function load() {
    songEl.textContent = songs[cur].title;
    artEl.textContent  = songs[cur].artist;
    durEl.textContent  = songs[cur].dur;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    curEl.textContent = '0:00';
    list.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === cur));
  }

  function togglePlay() {
    playing = !playing;
    playBtn.textContent = playing ? '⏸' : '▶';
    disc.classList.toggle('playing', playing);
    document.querySelector('.mp-cover')?.classList.toggle('playing', playing);
    if (playing) {
      startAudio();
      timer = setInterval(() => {
        progress = Math.min(progress + 100 / 200, 100);
        fill.style.transition = '1s linear';
        fill.style.width = progress + '%';
        const secs = Math.round(progress / 100 * 204);
        curEl.textContent = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
        if (progress >= 100) { clearInterval(timer); cur = (cur+1) % songs.length; progress = 0; load(); }
      }, 1000);
    } else {
      stopAudio();
      clearInterval(timer);
    }
  }

  // Web Audio 合成
  let audioCtx = null, gainNode = null, noteInterval = null;
  // 每首歌对应一组音符（C大调/A小调简单旋律）
  const melodies = [
    [261.6, 293.7, 329.6, 349.2, 392.0, 349.2, 329.6, 293.7], // C D E F G F E D
    [220.0, 246.9, 261.6, 293.7, 329.6, 293.7, 261.6, 246.9], // A B C D E D C B
    [329.6, 349.2, 392.0, 440.0, 392.0, 349.2, 329.6, 293.7], // E F G A G F E D
    [261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 261.6, 196.0], // C E G C G E C G
    [293.7, 329.6, 369.9, 440.0, 369.9, 329.6, 293.7, 246.9], // D E F# A F# E D B
    [261.6, 311.1, 349.2, 415.3, 349.2, 311.1, 261.6, 233.1], // C Eb F Ab F Eb C Bb
    [293.7, 349.2, 392.0, 466.2, 392.0, 349.2, 293.7, 261.6], // D F G Bb G F D C
  ];

  function playNote(freq, when, dur) {
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    osc2.type = 'sine'; osc2.frequency.value = freq * 2.01; // 泛音
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.18, when + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(env); osc2.connect(env); env.connect(gainNode);
    osc.start(when); osc.stop(when + dur);
    osc2.start(when); osc2.stop(when + dur);
  }

  function startAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.6;
    gainNode.connect(audioCtx.destination);
    const notes = melodies[cur % melodies.length];
    let step = 0;
    function scheduleNext() {
      const now = audioCtx.currentTime;
      playNote(notes[step % notes.length], now, 0.9);
      // 偶尔加低八度
      if (step % 4 === 0) playNote(notes[step % notes.length] / 2, now, 1.2);
      step++;
      noteInterval = setTimeout(scheduleNext, 900);
    }
    scheduleNext();
  }

  function stopAudio() {
    clearTimeout(noteInterval);
    if (gainNode) {
      gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    }
  }

  document.getElementById('mp-play').addEventListener('click', togglePlay);
  document.getElementById('mp-prev').addEventListener('click', () => { cur = (cur - 1 + songs.length) % songs.length; progress = 0; load(); });
  document.getElementById('mp-next').addEventListener('click', () => { cur = (cur + 1) % songs.length; progress = 0; load(); });
  document.getElementById('mp-close').addEventListener('click', () => player.classList.remove('open'));

  // 鼠标移到右侧触发
  trigger.addEventListener('mouseenter', () => player.classList.add('open'));
  document.addEventListener('mousemove', e => {
    if (e.clientX < window.innerWidth - 340) player.classList.remove('open');
  });

  load();
}

/* ── 页面切换过渡 ── */
document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href === 'index.html') return;
  link.addEventListener('click', e => {
    e.preventDefault();
    document.body.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(-12px)';
    setTimeout(() => { location.href = href; }, 320);
  });
});

document.body.style.opacity = '0';
document.body.style.transform = 'translateY(12px)';
requestAnimationFrame(() => {
  document.body.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
  document.body.style.opacity = '1';
  document.body.style.transform = 'translateY(0)';
});
