/* ── Liquid Glass Shader ── */
(function () {
  const canvas = document.getElementById('liquid-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const vert = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0, 1); }
  `;

  // 液态金属 shader
  const frag = `
    precision mediump float;
    varying vec2 v_uv;
    uniform float u_time;
    uniform vec2  u_mouse;
    uniform float u_speed;

    vec2 hash2(vec2 p) {
      p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
      return fract(sin(p) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      float a = dot(hash2(i)-0.5, f);
      float b = dot(hash2(i+vec2(1,0))-0.5, f-vec2(1,0));
      float c = dot(hash2(i+vec2(0,1))-0.5, f-vec2(0,1));
      float d = dot(hash2(i+vec2(1,1))-0.5, f-vec2(1,1));
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y) * 0.5 + 0.5;
    }

    vec2 flowNormal(vec2 uv, float t) {
      float s = 1.0 + u_speed * 3.0;
      vec2 n;
      n.x = noise(uv*5.0 + vec2(t*0.6, t*0.4)) - 0.5;
      n.y = noise(uv*5.0 + vec2(t*0.4+2.1, -t*0.5)) - 0.5;
      n += (vec2(noise(uv*11.0 + vec2(-t*0.3, t*0.7)),
                 noise(uv*11.0 + vec2(t*0.8+4.1, t*0.2))) - 0.5) * 0.4;
      // 鼠标涟漪
      vec2 d = uv - u_mouse;
      float r = length(d);
      float ripple = sin(r*22.0 - t*8.0) * exp(-r*4.0) * u_speed * 1.2;
      n += normalize(d+0.001) * ripple;
      return n * s;
    }

    void main() {
      vec2 uv = v_uv;
      float t = u_time;

      // 圆形裁剪
      float dist = length(uv - 0.5);
      float edge = smoothstep(0.50, 0.46, dist);
      if (edge < 0.01) discard;

      vec2 norm = flowNormal(uv, t);

      // 金属反射：用法线扰动采样环境色
      vec2 ref = uv + norm * 0.03;
      float env = noise(ref * 2.0 + vec2(t*0.1, 0.0));

      // 金属色调：深银 → 亮银 → 冷白
      vec3 dark   = vec3(0.12, 0.12, 0.14);
      vec3 mid    = vec3(0.55, 0.57, 0.62);
      vec3 bright = vec3(0.92, 0.94, 1.00);
      vec3 metal = mix(mix(dark, mid, env), bright, pow(env, 3.0));

      // 主镜面高光（强）
      vec2 nN = normalize(norm + 0.001);
      float spec  = pow(max(0.0, dot(nN, normalize(vec2(0.5, 0.8)))), 8.0);
      float spec2 = pow(max(0.0, dot(nN, normalize(vec2(-0.4, 0.6)))), 12.0);
      float spec3 = pow(max(0.0, dot(nN, normalize(vec2(0.1, -0.7)))), 16.0);
      metal += vec3(spec * 0.6);
      metal += vec3(0.85, 0.90, 1.00) * spec2 * 0.35;
      metal += vec3(1.0) * spec3 * 0.2;

      // 菲涅尔边缘
      float fresnel = pow(1.0 - smoothstep(0.28, 0.50, dist), 2.5);
      metal += vec3(0.8, 0.85, 0.95) * fresnel * 0.9;

      // 顶部弧形高光
      float topArc = smoothstep(0.0, 0.12, 0.5 - uv.y) * smoothstep(0.5, 0.32, dist);
      metal += vec3(1.0) * topArc * 0.5;

      // 轻微彩虹色散（金属氧化感）
      float irid = sin(norm.x * 12.0 + t * 0.5) * 0.5 + 0.5;
      metal += vec3(0.0, 0.05, 0.12) * irid * 0.15;

      float alpha = edge * 0.92;
      gl_FragColor = vec4(metal, alpha);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s); return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uTime  = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const uSpeed = gl.getUniformLocation(prog, 'u_speed');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let mouse = { x: 0.5, y: 0.5 }, prevMouse = { x: 0.5, y: 0.5 };
  let speed = 0, targetSpeed = 0;
  const hero = document.getElementById('hero-screen');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  hero.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    const inEllipse = (nx-0.5)**2/0.25 + (ny-0.5)**2/0.25 <= 1;
    if (!inEllipse) return;
    const dx = nx - prevMouse.x, dy = ny - prevMouse.y;
    targetSpeed = Math.min(1.0, Math.sqrt(dx*dx+dy*dy) * 25);
    prevMouse = mouse = { x: nx, y: ny };
  });

  function render(t) {
    speed += (targetSpeed - speed) * 0.1;
    targetSpeed *= 0.90;
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uSpeed, speed);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
