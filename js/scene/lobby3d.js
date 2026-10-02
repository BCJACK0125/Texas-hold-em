import * as THREE from 'three';

const SUIT_SYM = ['♠', '♥', '♦', '♣'];
const SUIT_COL = ['#161616', '#d42a2a', '#1f5fd1', '#12863e'];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function cardFaceTexture(rank, suit) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 358;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 256, 358); grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#efe9db');
  g.fillStyle = grd; rr(g, 0, 0, 256, 358, 22); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; rr(g, 6, 6, 244, 346, 18); g.stroke();
  g.fillStyle = SUIT_COL[suit];
  g.font = 'bold 74px Cinzel, Georgia, serif'; g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillText(rank, 20, 16);
  g.font = '56px serif'; g.fillText(SUIT_SYM[suit], 24, 92);
  g.font = '170px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(SUIT_SYM[suit], 150, 230);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function cardBackTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 358;
  const g = c.getContext('2d');
  g.fillStyle = '#6e1717'; rr(g, 0, 0, 256, 358, 22); g.fill();
  g.strokeStyle = '#e6c56a'; g.lineWidth = 6; rr(g, 14, 14, 228, 330, 14); g.stroke();
  g.save(); rr(g, 20, 20, 216, 318, 10); g.clip();
  g.strokeStyle = 'rgba(243,210,122,.28)'; g.lineWidth = 3;
  for (let i = -400; i < 400; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 358, 358); g.stroke(); g.beginPath(); g.moveTo(i + 358, 0); g.lineTo(i, 358); g.stroke(); }
  g.restore();
  g.fillStyle = '#e6c56a'; g.font = 'bold 64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♠', 128, 179);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function feltTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(512, 512, 60, 512, 512, 520);
  grd.addColorStop(0, '#1d8a62'); grd.addColorStop(0.6, '#0f5a40'); grd.addColorStop(1, '#073424');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 1024);
  // 布紋雜訊
  const img = g.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 14; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(243,210,122,.35)'; g.lineWidth = 5;
  g.beginPath(); g.arc(512, 512, 400, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(243,210,122,.22)'; g.font = 'bold 64px Cinzel, Georgia, serif'; g.textAlign = 'center';
  g.fillText('A C E   P A T H', 512, 700);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function chipTexture(color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#f5f0e6';
  for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 8, 0, 14, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}

function chipTopTexture(color) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f5f0e6'; g.lineWidth = 10; g.setLineDash([14, 12]); g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
  g.setLineDash([]); g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 36, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createLobbyScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07090c');
  scene.fog = new THREE.Fog('#07090c', 9, 22);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 5.2, 8.4);

  // 燈光
  scene.add(new THREE.AmbientLight('#8aa0b0', 0.35));
  const spot = new THREE.SpotLight('#ffe6b0', 70, 20, Math.PI / 5.5, 0.55, 1.4);
  spot.position.set(0, 8, 1.5); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005;
  scene.add(spot); scene.add(spot.target);
  const rimG = new THREE.PointLight('#d4af37', 18, 14); rimG.position.set(-5, 2.5, -2); scene.add(rimG);
  const rimB = new THREE.PointLight('#3fa7ff', 10, 14); rimB.position.set(5, 2, -3); scene.add(rimB);

  const root = new THREE.Group();
  scene.add(root);

  // 牌桌
  const table = new THREE.Group();
  root.add(table);
  const SX = 1.75;
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 96), new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.95 }));
  felt.scale.set(SX, 1, 1); felt.receiveShadow = true; table.add(felt);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(3.12, 0.3, 24, 120), new THREE.MeshStandardMaterial({ color: '#2a1a0c', roughness: 0.45, metalness: 0.1 }));
  rail.rotation.x = Math.PI / 2; rail.scale.set(SX * 0.985, 1.0, 1); rail.position.y = 0.12; rail.castShadow = true; table.add(rail);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(2.83, 0.028, 8, 160), new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 1, roughness: 0.25, emissive: '#3a2a06' }));
  trim.rotation.x = Math.PI / 2; trim.scale.set(SX * 1.04, 1.04, 1); trim.position.y = 0.11; table.add(trim);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 2.4, 48), new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.6 }));
  base.position.y = -1.3; table.add(base);

  // 牌
  const CW = 0.62, CH = 0.87;
  const cardGeo = new THREE.BoxGeometry(CW, 0.012, CH);
  const backTex = cardBackTexture();
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#e9e3d4' });
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.5 });
  const makeCard = (rank, suit) => {
    const face = new THREE.MeshStandardMaterial({ map: cardFaceTexture(rank, suit), roughness: 0.45 });
    const m = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, face, backMat, edgeMat, edgeMat]);
    m.castShadow = true;
    return m;
  };

  // 公共牌：皇家同花順
  const flush = [['A', 0], ['K', 0], ['Q', 0], ['J', 0], ['10', 0]];
  const boardCards = flush.map(([r, s], i) => {
    const c = makeCard(r, s);
    c.position.set((i - 2) * 0.72, 0.12, 0.15);
    c.rotation.y = (Math.random() - 0.5) * 0.04;
    c.userData = { delay: i * 0.18, flipped: false, baseY: 0.12 };
    c.rotation.z = Math.PI; // 先背面朝上
    table.add(c);
    return c;
  });

  // 懸浮的底牌
  const hole = new THREE.Group();
  const h1 = makeCard('A', 1), h2 = makeCard('A', 2);
  h1.position.set(-0.36, 0, 0); h1.rotation.set(1.2, 0, 0.16);
  h2.position.set(0.36, 0.02, 0.05); h2.rotation.set(1.2, 0, -0.16);
  h1.scale.setScalar(1.25); h2.scale.setScalar(1.25);
  hole.add(h1, h2);
  hole.position.set(0, 1.7, 2.1);
  root.add(hole);

  // 籌碼
  const chipColors = ['#c0392b', '#1b1b1b', '#d4af37', '#1f5fd1', '#12863e'];
  const chipGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 40);
  const chipMats = chipColors.map(col => [new THREE.MeshStandardMaterial({ map: chipTexture(col), roughness: 0.4 }), new THREE.MeshStandardMaterial({ map: chipTopTexture(col), roughness: 0.4 }), new THREE.MeshStandardMaterial({ map: chipTopTexture(col), roughness: 0.4 })]);
  const stacks = [[-3.4, 0.4, 9, 0], [-3.0, 0.9, 6, 2], [3.3, 0.5, 11, 1], [2.9, 1.0, 5, 3], [0.2, -1.2, 7, 2], [-0.35, -1.0, 4, 4], [3.6, -0.5, 8, 0]];
  const chips = [];
  for (const [x, z, n, ci] of stacks) {
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(chipGeo, chipMats[ci]);
      m.position.set(x + (Math.random() - 0.5) * 0.02, 0.13 + k * 0.062, z + (Math.random() - 0.5) * 0.02);
      m.rotation.y = Math.random() * Math.PI;
      m.castShadow = true;
      m.userData = { targetY: m.position.y, startY: m.position.y + 3 + k * 0.25, delay: 0.6 + Math.random() * 0.6 };
      m.position.y = m.userData.startY;
      table.add(m); chips.push(m);
    }
  }

  // 漂浮的牌
  const floaters = [];
  const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];
  for (let i = 0; i < 16; i++) {
    const c = makeCard(RANKS[i % RANKS.length], i % 4);
    const r = 6 + Math.random() * 5, a = Math.random() * Math.PI * 2;
    c.position.set(Math.cos(a) * r, 1 + Math.random() * 5, Math.sin(a) * r - 4);
    c.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    c.userData = { spin: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3), bob: Math.random() * 6, baseY: c.position.y };
    c.scale.setScalar(0.9);
    scene.add(c); floaters.push(c);
  }

  // 金色粒子
  const N = 500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = Math.random() * 10 - 1; pos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#f3d27a', size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  // 地板
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#0a0c10', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.5; floor.receiveShadow = true; scene.add(floor);

  // 互動
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = e => { mouse.tx = (e.clientX / window.innerWidth) * 2 - 1; mouse.ty = (e.clientY / window.innerHeight) * 2 - 1; };
  window.addEventListener('pointermove', onMove);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.2;
    root.position.x = wide ? Math.min(3.4, (w / h - 0.9) * 4) : 0;
    root.position.y = wide ? 0 : -0.8;
    camera.fov = wide ? 38 : 52;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);

  const clock = new THREE.Clock();
  let raf = 0;
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
    const scroll = Math.min(1, window.scrollY / window.innerHeight);
    camera.position.x = Math.sin(t * 0.12) * 0.6 + mouse.x * 0.8;
    camera.position.y = 5.2 - mouse.y * 0.5 + scroll * 1.5;
    camera.position.z = 8.4 - scroll * 1.2;
    camera.lookAt(root.position.x * 0.3, 0.2, 0);
    table.rotation.y = Math.sin(t * 0.15) * 0.08;
    // 翻開公共牌
    boardCards.forEach(c => {
      const k = ease((t - 0.8 - c.userData.delay) / 0.6);
      c.rotation.z = Math.PI * (1 - k);
      c.position.y = c.userData.baseY + Math.sin(k * Math.PI) * 0.5;
    });
    chips.forEach(m => { const k = ease((t - m.userData.delay) / 0.7); m.position.y = m.userData.startY + (m.userData.targetY - m.userData.startY) * k; });
    hole.position.y = 1.7 + Math.sin(t * 1.1) * 0.08;
    hole.rotation.y = Math.sin(t * 0.5) * 0.15 + mouse.x * 0.2;
    hole.rotation.x = mouse.y * 0.1;
    floaters.forEach(c => {
      c.rotation.x += c.userData.spin.x * 0.01; c.rotation.y += c.userData.spin.y * 0.01; c.rotation.z += c.userData.spin.z * 0.01;
      c.position.y = c.userData.baseY + Math.sin(t * 0.5 + c.userData.bob) * 0.3;
    });
    dust.rotation.y = t * 0.02;
    rimG.intensity = 16 + Math.sin(t * 1.3) * 4;
    renderer.render(scene, camera);
  };
  loop();

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect(); io.disconnect();
      scene.traverse(o => {
        o.geometry?.dispose();
        const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { x.map?.dispose(); x.dispose(); });
      });
      renderer.dispose();
    },
  };
}
