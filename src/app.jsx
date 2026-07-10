const { useState, useRef, useEffect, useCallback, useMemo } = React;

/* ============================================================
   CONFIG & DATA
   ============================================================ */
const IMG = "assets/images/";

/* ============================================================
   SFX — Web Audio 合成効果音（外部ファイル不要・オフライン・ミュート可）
   ============================================================ */
const SFX = (() => {
  let ctx = null, master = null, enabled = true;
  try { enabled = (localStorage.getItem('ndm_sound') ?? '1') === '1'; } catch (e) {}
  const ensure = () => {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination);
      } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  // 最初のユーザー操作で AudioContext を起動（自動再生ポリシー対策）
  if (typeof window !== 'undefined') {
    const unlock = () => ensure();
    ['pointerdown','touchstart','keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  }
  const tone = (t0, freq, dur, { type='sine', gain=0.3, glideTo=null, attack=0.005 } = {}) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
  };
  const noise = (t0, dur, { gain=0.3, type='highpass', freq=1000, q=1 } = {}) => {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = Math.random()*2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0 + dur + 0.03);
  };
  const play = (fn) => { if (!enabled) return; const c = ensure(); if (!c) return; try { fn(c.currentTime); } catch (e) {} };
  return {
    setEnabled(v){ enabled = !!v; try { localStorage.setItem('ndm_sound', v ? '1':'0'); } catch(e){} if (v) ensure(); },
    isEnabled(){ return enabled; },
    tap(){ play(t => tone(t, 520, 0.07, { type:'square', gain:0.10 })); },
    roll(){ play(t => { for (let i=0;i<8;i++) noise(t + i*0.055, 0.05, { gain:0.09, type:'bandpass', freq:2200 + Math.random()*1800, q:2 }); }); },
    land(){ play(t => { tone(t, 190, 0.13, { type:'triangle', gain:0.32, glideTo:85 }); noise(t, 0.06, { gain:0.14, type:'lowpass', freq:420 }); }); },
    coin(){ play(t => { [880,1180,1560].forEach((f,i)=>tone(t + i*0.06, f, 0.14, { type:'triangle', gain:0.22 })); }); },
    zorume(){ play(t => { [523,659,784,1047].forEach((f,i)=>tone(t + i*0.08, f, 0.22, { type:'square', gain:0.15 })); }); },
    jackpot(){ play(t => { [523,659,784,1047,1319,1568].forEach((f,i)=>tone(t + i*0.09, f, 0.3, { type:'sawtooth', gain:0.13 })); [1568,2093].forEach((f,i)=>tone(t + 0.62 + i*0.12, f, 0.4, { type:'triangle', gain:0.11 })); }); },
    shield(){ play(t => { tone(t, 300, 0.5, { type:'sine', gain:0.2, glideTo:920, attack:0.02 }); noise(t, 0.4, { gain:0.05, type:'highpass', freq:3200 }); }); },
    attack(){ play(t => { noise(t, 0.18, { gain:0.4, type:'lowpass', freq:800 }); tone(t, 150, 0.22, { type:'sawtooth', gain:0.24, glideTo:60 }); noise(t + 0.02, 0.12, { gain:0.18, type:'highpass', freq:4200 }); }); },
    steal(){ play(t => { noise(t, 0.28, { gain:0.11, type:'bandpass', freq:1200, q:0.7 }); tone(t + 0.14, 1400, 0.1, { type:'triangle', gain:0.15, glideTo:2000 }); }); },
    build(){ play(t => { tone(t, 120, 0.14, { type:'square', gain:0.24, glideTo:80 }); tone(t + 0.12, 880, 0.2, { type:'triangle', gain:0.18, glideTo:1200 }); }); },
    card(){ play(t => { noise(t, 0.08, { gain:0.14, type:'bandpass', freq:3000, q:1 }); [1047,1319,1568].forEach((f,i)=>tone(t + 0.06 + i*0.05, f, 0.14, { type:'triangle', gain:0.16 })); }); },
    stage(){ play(t => { [392,523,659,784,1047].forEach((f,i)=>tone(t + i*0.1, f, 0.32, { type:'square', gain:0.15 })); }); },
  };
})();

const DICE_FACES = {
  COIN:    { id:'coin',    weight:2, image:IMG+'dice/DiceFace_Coin.png',    label:'コイン',       emoji:'🪙' },
  ATTACK:  { id:'attack',  weight:1, image:IMG+'dice/DiceFace_Attack.png',  label:'アタック',     emoji:'⚔️' },
  STEAL:   { id:'steal',   weight:1, image:IMG+'dice/DiceFace_Steal.png',   label:'スティール',   emoji:'🥷' },
  SHIELD:  { id:'shield',  weight:1, image:IMG+'dice/DiceFace_Shield.png',  label:'シールド',     emoji:'🛡️' },
  JACKPOT: { id:'jackpot', weight:1, image:IMG+'dice/DiceFace_Jackpot.png', label:'ジャックポット', emoji:'⭐' },
};
const FACE_LIST = Object.values(DICE_FACES);
const WEIGHTED  = FACE_LIST.flatMap(f => Array(f.weight).fill(f));
const rollFace  = () => WEIGHTED[Math.floor(Math.random()*WEIGHTED.length)];

/* ---- 役ベースの抽選 ----
   各ダイスを独立に振るのではなく、まず「役」を出現確率で決め、
   その役に合う3つの出目を作ってからダイスを回す。
   確率（100ロールあたりの期待回数）: */
const HAND_ODDS = [
  { id:'attack',  p:0.05 },   // アタックぞろ目  ≈5回
  { id:'steal',   p:0.05 },   // スティールぞろ目 ≈5回
  { id:'shield',  p:0.05 },   // シールドぞろ目  ≈5回
  { id:'jackpot', p:0.04 },   // ジャックポットぞろ目 ≈4回
  { id:'coin',    p:0.05 },   // コインぞろ目    ≈5回
  { id:'combo',   p:0.05 },   // ジャックポット×2 ≈5回
]; // 残り ≈71% は通常役
const shuffle3 = (a) => { const b=[...a]; for(let i=2;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; };
const NON_JACKPOT = FACE_LIST.filter(f => f.id !== 'jackpot');
function normalRoll() { // 通常役：ぞろ目でもJP×2でもない3つ
  let r;
  do { r = [rollFace(), rollFace(), rollFace()]; }
  while ((r[0].id===r[1].id && r[1].id===r[2].id) || r.filter(x=>x.id==='jackpot').length >= 2);
  return r;
}
function decideHand() {
  const roll = Math.random();
  let acc = 0;
  for (const h of HAND_ODDS) {
    acc += h.p;
    if (roll < acc) {
      if (h.id === 'combo') {
        const other = NON_JACKPOT[Math.floor(Math.random()*NON_JACKPOT.length)];
        return shuffle3([DICE_FACES.JACKPOT, DICE_FACES.JACKPOT, other]);
      }
      const f = DICE_FACES[h.id.toUpperCase()];
      return [f, f, f];   // ぞろ目
    }
  }
  return normalRoll();
}

// DEBUG — force any hand on the next roll (faces:null = random)
const D = DICE_FACES;
const DEBUG_HANDS = [
  { key:'coinz',   label:'🪙 コインぞろ目',      faces:[D.COIN,D.COIN,D.COIN] },
  { key:'attackz', label:'⚔️ アタックぞろ目',    faces:[D.ATTACK,D.ATTACK,D.ATTACK] },
  { key:'stealz',  label:'🥷 スティールぞろ目',  faces:[D.STEAL,D.STEAL,D.STEAL] },
  { key:'shieldz', label:'🛡️ シールドぞろ目',    faces:[D.SHIELD,D.SHIELD,D.SHIELD] },
  { key:'jpz',     label:'⭐ ジャックポットぞろ目', faces:[D.JACKPOT,D.JACKPOT,D.JACKPOT] },
  { key:'jpcombo', label:'⭐⭐ ジャックポット×2', faces:[D.JACKPOT,D.JACKPOT,D.COIN] },
  { key:'coinwin', label:'🪙 コイン獲得（通常）', faces:[D.COIN,D.COIN,D.ATTACK] },
  { key:'random',  label:'🎲 ランダム',          faces:null },
];

// Shared face → color / emoji / label maps (used across screens)
const FACE_COLOR = { coin:'#D97706', attack:'#DC2626', steal:'#DB2777', shield:'#2563EB', jackpot:'#059669' };
const FACE_EMOJI = { coin:'🪙', attack:'⚔️', steal:'🥷', shield:'🛡️', jackpot:'⭐' };
const FACE_LABEL = { coin:'コイン', attack:'アタック', steal:'スティール', shield:'シールド', jackpot:'ジャックポット' };
const FACE_EFFECT = {
  coin:    IMG+'effect/CoinBurst.png',
  attack:  IMG+'effect/Effect_Attack.png',
  steal:   IMG+'effect/Effect_Smoke.png',
  shield:  IMG+'effect/Effect_Shield.png',
  jackpot: IMG+'effect/Effect_Jackpot.png',
};

function calculateCoins(results, stage) {
  const baseCoins = stage * 100;
  const addCoins  = 500;
  const coinCount = results.filter(r => r.id === 'coin').length;
  return baseCoins + addCoins * coinCount;
}
function checkZorume(results) {
  const isZorume = results[0].id === results[1].id && results[1].id === results[2].id;
  const jackpotCount = results.filter(r => r.id === 'jackpot').length;
  const isJackpotCombo = jackpotCount >= 2 && !isZorume;
  return { isZorume, isJackpotCombo, faceId: results[0].id };
}

// SCREEN 03 — bonus dice tables
const BONUS_DICE_TABLES = {
  coin: [
    { face:1, label:'×2',  sub:'よく出る', multiplier:2 },
    { face:2, label:'×5',  sub:'出る',     multiplier:5 },
    { face:3, label:'×10', sub:'たまに',   multiplier:10 },
    { face:4, label:'×20', sub:'レア',     multiplier:20 },
    { face:5, label:'×50', sub:'超レア',   multiplier:50 },
    { face:6, label:'×100',sub:'夢',       multiplier:100 },
  ],
  attack: [
    { face:1, label:'一撃',   sub:'城×1',        damage:1, coinRate:0 },
    { face:2, label:'強奪',   sub:'コイン10%',   damage:0, coinRate:0.10 },
    { face:3, label:'襲撃',   sub:'×1＋5%',      damage:1, coinRate:0.05 },
    { face:4, label:'連撃',   sub:'城×2',        damage:2, coinRate:0 },
    { face:5, label:'火攻め', sub:'×2＋15%',     damage:2, coinRate:0.15 },
    { face:6, label:'城壊し', sub:'×3＋25%',     damage:3, coinRate:0.25 },
  ],
  jackpot: [
    { face:1, label:'小判雨',   sub:'×20',   coinMultiplier:20, treasure:0 },
    { face:2, label:'お宝箱',   sub:'×3+箱', coinMultiplier:3,  treasure:1 },
    { face:3, label:'大当たり', sub:'×10+箱',coinMultiplier:10, treasure:1 },
    { face:4, label:'レア確定', sub:'×5+箱', coinMultiplier:5,  treasure:1, rare:true },
    { face:5, label:'忍者召喚', sub:'×5+仲間',coinMultiplier:5, companion:true },
    { face:6, label:'超JP',     sub:'×50!!', coinMultiplier:50, treasure:1, rare:true, companion:true },
  ],
  steal: [
    { face:1, label:'×1',  sub:'スカり',  multiplier:1 },
    { face:2, label:'×2',  sub:'出る',    multiplier:2 },
    { face:3, label:'×3',  sub:'たまに',  multiplier:3 },
    { face:4, label:'×5',  sub:'レア',    multiplier:5 },
    { face:5, label:'×10', sub:'超レア',  multiplier:10 },
    { face:6, label:'×20', sub:'夢',      multiplier:20 },
  ],
};
const rollBonusDice = (t) => { const table = BONUS_DICE_TABLES[t]; return table[Math.floor(Math.random()*table.length)]; };

// SCREEN 04 — opponent castle parts (attack targets)
const CASTLE_ATTACK_PARTS = [
  { id:'tower',    label:'天守閣',   x:'50%', y:'18%', state:'intact' },
  { id:'gate',     label:'城門',     x:'50%', y:'80%', state:'intact' },
  { id:'quarters', label:'武家屋敷', x:'18%', y:'50%', state:'destroyed' },
  { id:'garden',   label:'庭園',     x:'82%', y:'62%', state:'intact' },
  { id:'storage',  label:'蔵',       x:'78%', y:'32%', state:'intact' },
];

// SCREEN 06 — steal locations (matches BG_Steal layout)
const STEAL_LOCATIONS = [
  { id:'manor',      label:'屋敷',   icon:IMG+'ui/StealIcon_Manor.png',      emoji:'🏯', coinRange:[30000,60000], boxChance:0.15 },
  { id:'storehouse', label:'蔵',     icon:IMG+'ui/StealIcon_Storehouse.png', emoji:'🏬', coinRange:[50000,90000], boxChance:0.30 },
  { id:'shrine',     label:'神社',   icon:IMG+'ui/StealIcon_Shrine.png',     emoji:'⛩️', coinRange:[10000,30000], boxChance:0.50 },
  { id:'market',     label:'城下町', icon:IMG+'ui/StealIcon_Market.png',     emoji:'🏮', coinRange:[25000,55000], boxChance:0.15 },
];
const generateStealResults = (ids) => ids.map(id => {
  const loc = STEAL_LOCATIONS.find(l => l.id === id);
  const coinGain = Math.floor(loc.coinRange[0] + Math.random()*(loc.coinRange[1]-loc.coinRange[0]));
  return { ...loc, coinGain, hasBox: Math.random() < loc.boxChance };
});
// スティール：相手の村の建物ごとの奪取パラメータ（建物を直接タップして盗む）
const STEAL_BUILDING = {
  castle:     { coinRange:[40000,85000], boxChance:0.15 },
  storehouse: { coinRange:[50000,90000], boxChance:0.38 },
  statue:     { coinRange:[15000,35000], boxChance:0.50 },
  garden:     { coinRange:[25000,55000], boxChance:0.22 },
};
const stealFromBuilding = (it) => {
  const p = STEAL_BUILDING[it.id] || { coinRange:[20000,50000], boxChance:0.2 };
  const coinGain = Math.floor(p.coinRange[0] + Math.random()*(p.coinRange[1]-p.coinRange[0]));
  return { id:it.id, label:it.label, coinGain, hasBox: Math.random() < p.boxChance };
};

// SCREEN 07 — own castle parts (build)
const PART_COST = [100,300,700,1500,3000];
const makeCastleParts = () => ([
  { id:'tower',    label:'天守閣',   x:'50%', y:'22%', level:5, maxLevel:5, cost:PART_COST, state:'complete' },
  { id:'gate',     label:'城門',     x:'50%', y:'78%', level:5, maxLevel:5, cost:PART_COST, state:'complete' },
  { id:'quarters', label:'武家屋敷', x:'20%', y:'52%', level:2, maxLevel:5, cost:PART_COST, state:'building' },
  { id:'garden',   label:'庭園',     x:'80%', y:'60%', level:0, maxLevel:5, cost:PART_COST, state:'notStarted' },
  { id:'storage',  label:'蔵',       x:'76%', y:'34%', level:0, maxLevel:5, cost:PART_COST, state:'destroyed' },
]);

// Fresh castle for a new stage — every part unbuilt
const freshCastleParts = () => makeCastleParts().map(p => ({ ...p, level:0, state:'notStarted' }));

const fmt = n => Math.round(n).toLocaleString('en-US');
const CASTLE_IMG = { himeji: IMG+'building/Castle_Himeji.png', windsor: IMG+'building/Castle_Windsor.png', tajmahal: IMG+'building/Castle_TajMahal.png' };
// 10ステージ＝10テーマ（世界の名所ツアー）。stage1から順に切り替わる。
const STAGE_THEMES = ['himeji','windsor','tajmahal','egypt','china','greece','aztec','russia','arabia','dragon'];
const MAX_STAGE = STAGE_THEMES.length;
const castleTypeForStage = (s) => STAGE_THEMES[Math.min(Math.max(1, s|0), MAX_STAGE) - 1];

// 小判（コイン/ジャックポット）で得られるベース金額。ステージ進捗に応じて超線形に増える。
// 例: s1=500, s2=1500, s3=3000, s5=7500, s7=14000, s10=27500（旧: stage*500 = s10で5000）。
const coinBaseForStage = (s) => { const n = Math.min(Math.max(1, s|0), MAX_STAGE); return 250 * n * (n + 1); };

/* 対戦相手ロスター：大金持ち → 初心者 の順。アタック/スティールのたびに入れ替わる。
   coins=保有コイン（獲得額のベース）、shields=初期シールド枚数（金持ちほど堅い）。 */
const OPPONENTS = [
  { key:'shogun',     name:'将軍 徳川',    img:'opp/Opp_Shogun.png',     coins:2200000, shields:2 },
  { key:'daimyo',     name:'大名 織田',    img:'opp/Opp_Daimyo.png',     coins:1300000, shields:2 },
  { key:'merchant',   name:'豪商 越後屋',  img:'opp/Opp_Merchant.png',   coins:820000,  shields:1 },
  { key:'general',    name:'侍大将 武田',  img:'opp/Opp_General.png',    coins:520000,  shields:1 },
  { key:'tanaka',     name:'城主 田中',    img:'opp/Opp_LordTanaka.png', coins:300000,  shields:1 },
  { key:'ninja',      name:'忍者頭 服部',  img:'opp/Opp_NinjaChief.png', coins:210000,  shields:1 },
  { key:'kunoichi',   name:'くノ一 あやめ', img:'opp/Opp_Kunoichi.png',   coins:150000,  shields:0 },
  { key:'ronin',      name:'浪人 佐々木',  img:'opp/Opp_Ronin.png',      coins:78000,   shields:0 },
  { key:'ashigaru',   name:'足軽 権兵衛',  img:'opp/Opp_Ashigaru.png',   coins:36000,   shields:0 },
  { key:'apprentice', name:'見習い 小太郎', img:'opp/Opp_Apprentice.png', coins:12000,   shields:0 },
];
const OPP_BY_KEY = Object.fromEntries(OPPONENTS.map(o => [o.key, o]));
// ロスターから対戦相手インスタンスを生成（shieldsはコピーして戦闘で消費できるように）
const makeOpponent = (o) => ({ key:o.key, name:o.name, img:IMG+o.img, coins:o.coins, shields:o.shields });
// 現在と違う相手をランダムに選ぶ（連続で同じ相手を避ける）
const pickOpponent = (currentKey) => {
  const pool = OPPONENTS.filter(o => o.key !== currentKey);
  return makeOpponent(pool[Math.floor(Math.random()*pool.length)]);
};
// 表示用の短い呼び名（「将軍 徳川」→「徳川」）
const oppShortName = (name) => (name||'').split(' ').pop();

const CASTLE_NAME = { himeji:'姫路城', windsor:'ウィンザー城', tajmahal:'タージ・マハル' };
// 城テーマごとの建築段階画像（最後が完成形）
const CASTLE_STAGES = {
  himeji:   [IMG+'building/Castle_Build_1.png', IMG+'building/Castle_Build_2.png', IMG+'building/Castle_Build_3.png', IMG+'building/Castle_Build_4.png', IMG+'building/Castle_Himeji.png'],
  windsor:  [IMG+'building/Windsor_Build_1.png', IMG+'building/Windsor_Build_2.png', IMG+'building/Castle_Windsor.png'],
  tajmahal: [IMG+'building/Taj_Build_1.png', IMG+'building/Taj_Build_2.png', IMG+'building/Castle_TajMahal.png'],
};
// 建設画面の背景（城テーマに合わせる）
const CASTLE_BG = { himeji:IMG+'bg/BG_Castle.png', windsor:IMG+'bg/BG_Castle_Windsor.png', tajmahal:IMG+'bg/BG_Castle_TajMahal.png' };
// 城テーマごとの付帯建築（蔵/石像/庭園）段階画像。城以外もテーマに一致させる。
const BUILDING_STAGES = {
  himeji: {
    storehouse:[IMG+'building/Build_Storehouse_1.png', IMG+'building/Build_Storehouse_2.png', IMG+'building/Build_Storehouse_3.png'],
    statue:    [IMG+'building/Build_Statue_1.png',     IMG+'building/Build_Statue_2.png',     IMG+'building/Build_Statue_3.png'],
    garden:    [IMG+'building/Build_Garden_1.png',     IMG+'building/Build_Garden_2.png',     IMG+'building/Build_Garden_3.png'],
  },
  windsor: {
    storehouse:[IMG+'building/Windsor_Storehouse_1.png', IMG+'building/Windsor_Storehouse_2.png', IMG+'building/Windsor_Storehouse_3.png'],
    statue:    [IMG+'building/Windsor_Statue_1.png',     IMG+'building/Windsor_Statue_2.png',     IMG+'building/Windsor_Statue_3.png'],
    garden:    [IMG+'building/Windsor_Garden_1.png',     IMG+'building/Windsor_Garden_2.png',     IMG+'building/Windsor_Garden_3.png'],
  },
  tajmahal: {
    storehouse:[IMG+'building/Taj_Storehouse_1.png', IMG+'building/Taj_Storehouse_2.png', IMG+'building/Taj_Storehouse_3.png'],
    statue:    [IMG+'building/Taj_Statue_1.png',     IMG+'building/Taj_Statue_2.png',     IMG+'building/Taj_Statue_3.png'],
    garden:    [IMG+'building/Taj_Garden_1.png',     IMG+'building/Taj_Garden_2.png',     IMG+'building/Taj_Garden_3.png'],
  },
};
// stage4-10 の新テーマを自動登録（画像は <Pfx>_Build_1/2 + Castle_<Pfx>、蔵/石像/庭園は <Pfx>_<Type>_1..3、背景 BG_Castle_<Pfx>）
const NEW_THEMES = {
  egypt:  { name:'ピラミッド',       pfx:'Egypt'  },
  china:  { name:'紫禁城',           pfx:'China'  },
  greece: { name:'パルテノン神殿',   pfx:'Greece' },
  aztec:  { name:'太陽のピラミッド', pfx:'Aztec'  },
  russia: { name:'聖ワシリイ大聖堂', pfx:'Russia' },
  arabia: { name:'砂漠の宮殿',       pfx:'Arabia' },
  dragon: { name:'龍宮天空城',       pfx:'Dragon' },
};
Object.keys(NEW_THEMES).forEach(key => {
  const p = NEW_THEMES[key].pfx;
  CASTLE_NAME[key]   = NEW_THEMES[key].name;
  CASTLE_STAGES[key] = [IMG+'building/'+p+'_Build_1.png', IMG+'building/'+p+'_Build_2.png', IMG+'building/Castle_'+p+'.png'];
  CASTLE_BG[key]     = IMG+'bg/BG_Castle_'+p+'.png';
  BUILDING_STAGES[key] = {
    storehouse:[IMG+'building/'+p+'_Storehouse_1.png', IMG+'building/'+p+'_Storehouse_2.png', IMG+'building/'+p+'_Storehouse_3.png'],
    statue:    [IMG+'building/'+p+'_Statue_1.png',     IMG+'building/'+p+'_Statue_2.png',     IMG+'building/'+p+'_Statue_3.png'],
    garden:    [IMG+'building/'+p+'_Garden_1.png',     IMG+'building/'+p+'_Garden_2.png',     IMG+'building/'+p+'_Garden_3.png'],
  };
});
// 指定テーマでのその建物の段階配列（城はCASTLE_STAGES、蔵/石像/庭園はBUILDING_STAGES）
const themedStagesFor = (itemId, theme) =>
  itemId === 'castle' ? CASTLE_STAGES[theme] : (BUILDING_STAGES[theme] || BUILDING_STAGES.himeji)[itemId];

/* ---- Coin Master style build items (each levels up through visual stages) ---- */
const BUILD_ITEMS = [
  { id:'castle',     label:'天守閣', emoji:'🏯', x:'50%', y:'40%', w:180, stages:CASTLE_STAGES.himeji },
  { id:'storehouse', label:'蔵',     emoji:'🏬', x:'18%', y:'60%', w:112,
    stages:[IMG+'building/Build_Storehouse_1.png', IMG+'building/Build_Storehouse_2.png', IMG+'building/Build_Storehouse_3.png'] },
  { id:'statue',     label:'石像',   emoji:'🗿', x:'83%', y:'57%', w:92,
    stages:[IMG+'building/Build_Statue_1.png', IMG+'building/Build_Statue_2.png', IMG+'building/Build_Statue_3.png'] },
  { id:'garden',     label:'庭園',   emoji:'🌸', x:'50%', y:'82%', w:150,
    stages:[IMG+'building/Build_Garden_1.png', IMG+'building/Build_Garden_2.png', IMG+'building/Build_Garden_3.png'] },
];
const itemMax = (it) => it.stages.length - 1;                 // top level index (= complete)
// Coin Master 風の値段感：6桁が当たり前（標準stage3のLv0で約10万コイン）。ステージ・レベルで増加。
// 例) stage1 Lv0=55,000 / stage3 Lv0≈100,000・Lv3≈627,000 / stage5 Lv0=143,000
const buildCost = (level, stage=1) => Math.round((33000 + 22000*stage) * Math.pow(1.85, level));
// every item starts at level 0 (nothing pre-built)
const makeVillage = (opts={}) => BUILD_ITEMS.map(it => ({ ...it, level: opts.max ? itemMax(it) : (opts.levels?.[it.id] ?? 0) }));

/* ============================================================
   SHARED UTILITIES
   ============================================================ */
function Img({ src, alt, className, style, fallback }) {
  const [err, setErr] = useState(false);
  if (err || !src) return fallback || null;
  return <img src={src} alt={alt||''} className={className} style={style} onError={()=>setErr(true)} />;
}

// ease-out cubic count-up hook: returns current display value for a target
function useCountUp(target, duration = 1000, run = true) {
  const [val, setVal] = useState(run ? 0 : target);
  const fromRef = useRef(0);
  useEffect(() => {
    if (!run) { setVal(target); return; }
    let raf, start = null;
    const from = fromRef.current;
    const step = (now) => {
      if (start === null) start = now;
      const t = Math.max(0, Math.min(1, (now - start)/duration));
      const eased = 1 - Math.pow(1-t, 3);
      setVal(Math.floor(from + (target-from)*eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, run]);
  return val;
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */
function TopBar({ coins, shields, onMenu, onShop, night, onToggleNight }) {
  const [snd, setSnd] = useState(() => SFX.isEnabled());
  const toggleSnd = () => { const v = !snd; setSnd(v); SFX.setEnabled(v); if (v) SFX.tap(); };
  return (
    <div className="topbar">
      <div className="coin-pill">
        <Img src={IMG+'ui/Koban_Small.png'} fallback={<span className="coin-emoji">🪙</span>} />
        <span className="coin-amount gold-text">{fmt(coins)}</span>
        <button className="plus-btn" title="ショップ" onClick={onShop}><Img src={IMG+'ui/Icon_Plus.png'} className="icon-img" fallback={<span>+</span>} /></button>
      </div>
      <div className="shield-box">
        <Img src={IMG+'ui/Icon_Shield.png'} className="sh-ico-img" fallback={<span className="sh-ico">🛡️</span>} />
        <span className="shield-dots">{[0,1,2].map(i => <i key={i} className={i < shields ? 'on':''} />)}</span>
      </div>
      <div className="topbar-right">
        <button className="menu-btn snd-btn" title="サウンド" onClick={toggleSnd}><span className="snd-ico">{snd ? '🔊' : '🔇'}</span></button>
        {onToggleNight && <button className="menu-btn" title="昼夜切替" onClick={onToggleNight}><Img src={IMG+'ui/Icon_Night.png'} className="icon-img" fallback={<span>{night ? '☀️' : '🌙'}</span>} /></button>}
        {onMenu && <button className="menu-btn" title="メニュー" onClick={onMenu}><Img src={IMG+'ui/Icon_Menu.png'} className="icon-img" fallback={<span>≡</span>} /></button>}
      </div>
    </div>
  );
}

// Scroll banner (UI_Scroll.png) with title text
function ScrollBanner({ title, sub, className }) {
  return (
    <div className={"scroll-banner " + (className||'')}>
      <Img src={IMG+'ui/UI_Scroll.png'} className="scroll-bg" fallback={<div className="scroll-bg-fallback" />} />
      <div className="scroll-content">
        <div className="scroll-title gold-text">{title}</div>
        {sub && <div className="scroll-sub">{sub}</div>}
      </div>
    </div>
  );
}

function Toast({ msg }) {
  return <div className={"toast " + (msg ? 'show':'')}>{msg}</div>;
}

/* ============================================================
   SCREEN 01 — MAIN ROLL
   ============================================================ */
const INITIAL_DICE = [DICE_FACES.COIN, DICE_FACES.ATTACK, DICE_FACES.SHIELD];

function Die({ face, phase, anim='toss' }) {
  const cls = "die " + (anim==='toss' ? 'toss ' : '') + (phase === 'spinning' ? 'spinning' : phase === 'landed' ? 'landed' : '');
  return (
    <div className={cls}>
      <Img src={IMG+'dice/Dice_Normal.png'} className="die-body"
           fallback={<div className="die-body" style={{background:'#f5f0e0',borderRadius:16,border:'3px solid #D4A017'}} />} />
      <Img src={face.image} className="die-face" fallback={<span className="face-emoji">{face.emoji}</span>} />
    </div>
  );
}

/* ---- 3D dice (CSS cube). 空中は等速回転→着地で減速。左→右に跳ね上げ発射 ---- */
const FACE_IMG_BY_ID = {}; Object.values(DICE_FACES).forEach(f => { FACE_IMG_BY_ID[f.id] = f.image; });
const CUBE_LAYOUT = [
  { slot:'front',  id:'coin' },   { slot:'top',    id:'attack' },
  { slot:'right',  id:'steal' },  { slot:'left',   id:'shield' },
  { slot:'bottom', id:'jackpot' },{ slot:'back',   id:'coin' },
];
const REST3D = { front:{x:0,y:0}, back:{x:0,y:180}, right:{x:0,y:-90}, left:{x:0,y:90}, top:{x:-90,y:0}, bottom:{x:90,y:0} };
const SLOT_FOR_ID = { coin:'front', attack:'top', steal:'right', shield:'left', jackpot:'bottom' };
const norm360 = a => ((a % 360) + 360) % 360;

function Die3D({ face, rollKey, index=0 }) {
  const cubeRef = useRef(null), launchRef = useRef(null);
  const rot = useRef(null);
  // idle は各ダイスで違う役を見せる：小判(front)/スティール(right)/シールド(left)。
  // 着地時と同じ「面を正面に向ける」向き＝読みやすい。top/bottom(rotateX±90)は真横に潰れるので使わない。
  if (rot.current === null) { const s = REST3D[['front','right','left'][index % 3]]; rot.current = { rx:s.x, ry:s.y }; }
  // idle 向きを一度だけ適用（transformはJSXに置かず、Reactの再描画で消えないようにする）
  useEffect(() => { if (cubeRef.current) cubeRef.current.style.transform = `rotateX(${rot.current.rx}deg) rotateY(${rot.current.ry}deg)`; }, []);
  useEffect(() => {
    if (!rollKey) return;                     // 初期表示ではロールしない
    const rest = REST3D[SLOT_FOR_ID[face.id] || 'front'];
    const spinsX = 2 + Math.floor(Math.random()*3);   // 2〜4回転
    const spinsY = 3 + Math.floor(Math.random()*3);   // 3〜5回転
    const rx0 = rot.current.rx, ry0 = rot.current.ry;
    const rxE = rx0 + norm360(rest.x - rx0) + spinsX*360;
    const ryE = ry0 + norm360(rest.y - ry0) + spinsY*360;
    const rxA = rx0 + 0.84*(rxE-rx0), ryA = ry0 + 0.84*(ryE-ry0);
    rot.current = { rx:rxE, ry:ryE };
    const dur = 1.3;
    const c = cubeRef.current, l = launchRef.current;
    if (!c || !l) return;
    const start = () => {
      c.style.setProperty('--rx0', rx0+'deg'); c.style.setProperty('--ry0', ry0+'deg');
      c.style.setProperty('--rxA', rxA+'deg'); c.style.setProperty('--ryA', ryA+'deg');
      c.style.setProperty('--rxE', rxE+'deg'); c.style.setProperty('--ryE', ryE+'deg');
      c.style.animation = 'none'; void c.offsetWidth; c.style.animation = `d3tumble ${dur}s both`;
      l.style.animation = 'none'; void l.offsetWidth; l.style.animation = `d3launch ${dur}s linear both`;
    };
    const t = setTimeout(start, index * 150);  // 左→右に順番に発射
    return () => clearTimeout(t);
  }, [rollKey]);
  return (
    <div className="d3-slot">
      <div className="d3-launch" ref={launchRef}>
        <div className="d3-tilt">
          <div className="d3-cube" ref={cubeRef}>
            {CUBE_LAYOUT.map((f,i) => (
              <div key={i} className={"d3-face f-"+f.slot}>
                <Img src={FACE_IMG_BY_ID[f.id]} className="d3-sym" fallback={<span className="d3-emo">{FACE_EMOJI[f.id]}</span>} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RollButton({ disabled, onRoll, auto, onToggleAuto }) {
  const pressT = useRef(0);
  const stopGuard = useRef(0);   // ignore the ghost click that fires right after a long-press enables auto
  const [charging, setCharging] = useState(false);
  const LONG = 550; // ms — hold this long → auto; shorter → single roll
  // Decide auto-vs-roll on RELEASE (by hold duration) so the button never swaps to STOP mid-hold.
  const start = () => { if (disabled) return; pressT.current = performance.now(); setCharging(true); };
  const cancel = () => { pressT.current = 0; setCharging(false); };
  const end = (e) => {
    if (e && e.cancelable) e.preventDefault();
    if (pressT.current === 0) return;
    const held = performance.now() - pressT.current;
    cancel();
    if (disabled) return;
    if (held >= LONG) { stopGuard.current = performance.now() + 500; onToggleAuto(true); }
    else onRoll();
  };
  const stop = () => { if (performance.now() < stopGuard.current) return; onToggleAuto(false); };

  // While auto-rolling the button becomes a STOP control — always tappable (never disabled).
  if (auto) {
    return (
      <div className="roll-zone">
        <button className="roll-btn stop" onClick={stop}>
          <span className="stop-ico">■</span>停止
        </button>
        <div className="roll-sub auto" onClick={stop}>オートロール中</div>
      </div>
    );
  }
  return (
    <div className="roll-zone">
      <button className={"roll-btn" + (charging ? ' charging':'')} disabled={disabled}
        onMouseDown={start} onMouseUp={end} onMouseLeave={cancel} onTouchStart={start} onTouchEnd={end}>
        振る！
      </button>
      <div className="roll-sub">{charging ? 'はなすとオートロール！' : '長押しでオートロール'}</div>
    </div>
  );
}

/* 装備中キャラを常時表示するミニマスコット。連番フレームをループ再生（しゃべらない）。
   6フレームをすべてDOMに置き opacity で切替 → 再取得のちらつきなし。タップでキャラ画面へ。 */
function CharMascot({ id, onClick }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    setF(0);
    const t = setInterval(() => setF(x => (x + 1) % 6), 120);
    return () => clearInterval(t);
  }, [id]);
  const frames = charFrames(id);
  return (
    <button className="game-mascot" onClick={onClick} aria-label="仲間">
      {frames.map((src, i) => (
        <Img key={i} src={src} className={"gm-img" + (i === f ? ' on' : '')} fallback={i === 0 ? <span className="gm-emoji">🧙</span> : null} />
      ))}
    </button>
  );
}

/* 画面左右のサイドレール（旧メニュー＋ボトムナビを左右に分散）。全遷移先へ1タップ。 */
const SIDE_LEFT = [
  { screen:'castle',     img:'ui/Icon_Village.png', emoji:'🏯', label:'村建設' },
  { screen:'characters', img:'char/Char_maneki_1.png', emoji:'🥷', label:'仲間' },
  { screen:'collection', img:'ui/Icon_Card.png',    emoji:'📖', label:'カード' },
  { screen:'clan',       img:'ui/Icon_Clan.png',    emoji:'🗡️', label:'討伐', badge:'ticket' },
];
const SIDE_RIGHT = [
  { screen:'shop',   img:'ui/Icon_Shop.png',   emoji:'🛒', label:'商店' },
  { screen:'season', img:'ui/Icon_Event.png',  emoji:'🎫', label:'催事' },
  { screen:'invite', img:'ui/Icon_Invite.png', emoji:'👥', label:'招待' },
];
function SideRail({ side, items, go, tickets=0, pulseKey=0 }) {
  return (
    <div className={"side-rail " + side}>
      {items.map(m => (
        <button key={m.screen + (m.screen==='collection' ? ('-'+pulseKey) : '')}
          className={"rail-btn rail-" + m.screen + (m.screen==='collection' && pulseKey ? ' pulse' : '')}
          onClick={()=>{ SFX.tap(); go(m.screen); }}>
          {m.badge==='ticket' && tickets>0 && <span className="nb-badge"><Img src={IMG+'ui/Icon_Ticket.png'} className="nb-badge-ico" fallback={<span>🎟️</span>} />{tickets}</span>}
          <Img src={IMG+m.img} className="rail-ico" fallback={<span className="rail-emoji">{m.emoji}</span>} />
          <span className="rail-label">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

function MainRoll({ game, addCoins, grantShields, grantRolls, showToast, go, onZorume, onCardDrop, dropCard, onMenu, onShop, tickets, bet=1, setBet, night, onToggleNight, auto, setAuto, rollAnim='toss', onToggleRollAnim, paused=false, equipped=null, freeRollChance=0, cardDropBonus=0, onResetShop, onRerollShop, onDebugTickets }) {
  const freeRollRef = useRef(freeRollChance); freeRollRef.current = freeRollChance;   // 招き猫系：確率で無料ロール
  const cardBonusRef = useRef(cardDropBonus); cardBonusRef.current = cardDropBonus;   // だるま：カード排出率+
  const [coinSpray, setCoinSpray] = useState(0);     // コイン噴き上げ演出のキー（0=非表示）
  const [cardFly, setCardFly] = useState(null);      // {card,key,phase,dx,dy} ロール獲得カードの飛翔演出
  const [railPulse, setRailPulse] = useState(0);     // カードUI（左レール）到着パルスのキー
  const cardFlyRef = useRef(null);                   // 飛翔カードのDOM参照（着地座標計算用）
  const flyTimers = useRef([]);
  const [dice, setDice] = useState(INITIAL_DICE);
  const [phases, setPhases] = useState(['idle','idle','idle']);
  const [isRolling, setIsRolling] = useState(false);
  const [lastGain, setLastGain] = useState(0);
  const [gainKey, setGainKey] = useState(0);
  const [mood, setMood] = useState('idle');
  const [speech, setSpeech] = useState('');
  const [fx, setFx] = useState({ coin:false, jackpot:false, gain:0, key:0 });
  const [showDebug, setShowDebug] = useState(() => new URLSearchParams(window.location.search).has('debugopen'));
  // auto は App 側で保持（ボーナス/アタック等で MainRoll がアンマウントされても状態を維持する）

  // 常時ループの桜吹雪演出：マウント時に一度だけランダム生成（再レンダリングでリセットさせない）
  const petals = useMemo(() => Array.from({ length: 13 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    variant: `effect/Effect_SakuraPetal_${1 + Math.floor(Math.random() * 3)}.png`,
    drift: -60 + Math.random() * 120,
    spin: 180 + Math.random() * 360,
    size: 18 + Math.random() * 16,
    dur: 9 + Math.random() * 7,
    delay: -16 + Math.random() * 16,
  })), []);

  const spinIntervals = useRef([]);
  const fxKeyRef = useRef(0);
  const rollingRef = useRef(false);
  const doRollRef = useRef(null);   // stable handle so the auto-loop effect doesn't churn with game identity
  const rollsRef = useRef(game.rolls);
  rollsRef.current = game.rolls;
  const betRef = useRef(1); betRef.current = bet;   // ロールポイント倍率（報酬計算で参照）
  const rollAnimRef = useRef(rollAnim); rollAnimRef.current = rollAnim;
  const [roll3dKey, setRoll3dKey] = useState(0);    // 3D演出のロール再生トリガー

  const clearSpins = () => { spinIntervals.current.forEach(clearInterval); spinIntervals.current = []; };
  useEffect(() => () => { clearSpins(); flyTimers.current.forEach(clearTimeout); }, []);

  const fireFx = useCallback((partial) => {
    fxKeyRef.current += 1;
    setFx({ coin:false, jackpot:false, gain:0, ...partial, key: fxKeyRef.current });
  }, []);

  // ロール完了＝コイン噴き上げ演出の終了時に呼ぶ（オートロールはここで次へ進む）
  const finishRoll = useCallback(() => {
    setPhases(['idle','idle','idle']);
    rollingRef.current = false; setIsRolling(false);
    setTimeout(() => { setMood('idle'); setSpeech(''); }, 400);
  }, []);

  // 獲得カードを別位置に出し、少し見せてから左レールの「カード」ボタンへ飛ばす。着地でボタンをパルス。
  const flyKeyRef = useRef(0);
  const startCardFly = useCallback((card) => {
    flyTimers.current.forEach(clearTimeout); flyTimers.current = [];
    setCardFly({ card, key: ++flyKeyRef.current, phase:'reveal', dx:0, dy:0 });
    flyTimers.current.push(setTimeout(() => {
      const from = cardFlyRef.current && cardFlyRef.current.getBoundingClientRect();
      const toEl = document.querySelector('.side-rail.left .rail-collection');
      let dx = -120, dy = 60;
      if (from && toEl) { const tr = toEl.getBoundingClientRect();
        dx = (tr.left + tr.width/2) - (from.left + from.width/2);
        dy = (tr.top + tr.height/2) - (from.top + from.height/2); }
      setCardFly(prev => prev ? { ...prev, phase:'fly', dx, dy } : prev);
    }, 780));
    flyTimers.current.push(setTimeout(() => { setCardFly(null); setRailPulse(k => k + 1); }, 780 + 560));
  }, []);

  const doRoll = useCallback((forced) => {
    if (rollingRef.current) return;
    if (game.rolls < game.bet) { showToast('ロールが足りません'); setAuto(false); return; }
    rollingRef.current = true;
    setIsRolling(true);
    if (Math.random() < freeRollRef.current) { showToast('🐾 無料ロール！'); }   // 招き猫系：消費なし
    else game.useRolls(game.bet);   // ロールポイント倍率ぶん消費
    setMood('excited'); setSpeech(''); SFX.roll();
    const results = Array.isArray(forced) && forced.length===3 ? forced : decideHand();

    if (rollAnimRef.current === '3d') {
      // 3D：面の高速切替はせず、立方体が結果面へ転がって着地。着地に合わせて判定。
      clearSpins();
      setDice(results);
      setPhases(['spinning','spinning','spinning']);
      setRoll3dKey(k => k + 1);
      setTimeout(() => resolveRoll(results), 1700);   // stagger + 転がり + 着地ぶん
      return;
    }

    setPhases(['spinning','spinning','spinning']);
    clearSpins();
    for (let i=0;i<3;i++){
      const id = setInterval(() => setDice(prev => { const nx=[...prev]; nx[i]=rollFace(); return nx; }), 80);
      spinIntervals.current.push(id);
    }
    const stopTimes = [520,680,840];
    results.forEach((res,i) => setTimeout(() => {
      clearInterval(spinIntervals.current[i]);
      setDice(prev => { const nx=[...prev]; nx[i]=res; return nx; });
      setPhases(prev => { const nx=[...prev]; nx[i]='landed'; return nx; });
    }, stopTimes[i]));
    setTimeout(() => resolveRoll(results), 900);
  }, [game, showToast]);

  const resolveRoll = useCallback((results) => {
    const { isZorume, isJackpotCombo, faceId } = checkZorume(results);
    const gain = calculateCoins(results, game.stage) * betRef.current;
    SFX.land();

    if (isZorume) {
      // hand off to the zorume overlay + flow router
      setMood('zorume');
      setSpeech(FACE_LABEL[faceId] + 'ぞろ目！');
      SFX.zorume();
      setTimeout(() => { rollingRef.current = false; setIsRolling(false); setMood('idle'); setSpeech(''); setPhases(['idle','idle','idle']); }, 1300);
      onZorume(faceId);
      return;
    }
    if (isJackpotCombo) {
      const bonus = gain + 3000;
      fireFx({ jackpot:true }); SFX.jackpot();
      setMood('excited'); setSpeech('ジャックポット×2！');
      addCoins(bonus); setLastGain(bonus); setGainKey(k=>k+1);
      setCoinSpray(k=>k+1);
      showToast('ジャックポットコンボ！ +' + fmt(bonus) + ' 🪙');
    } else {
      const coinCount = results.filter(r=>r.id==='coin').length;
      const shieldCount = results.filter(r=>r.id==='shield').length;
      addCoins(gain); setLastGain(gain); setGainKey(k=>k+1);
      if (gain>0) { setCoinSpray(k=>k+1); SFX.coin(); }   // 非ぞろ目は常に gain>0 → 毎回噴き上げ
      if (shieldCount>=2) { grantShields(1); showToast('シールド +1 🛡️'); }
      setMood(coinCount>=2 ? 'excited':'idle');
      setSpeech(coinCount>=2 ? 'コインざっくざく！' : '');
      // 通常ロールで一定確率にカードドロップ：中央でなくオフセンターに出して左レールへ飛ばす
      if (dropCard && Math.random() < (0.10 + cardBonusRef.current)) setTimeout(() => { const c = dropCard(); startCardFly(c); }, 500);   // カード排出率 35%→10%（だるま等の cardDropBonus は加算）
    }
    // ロール解放はコイン噴き上げの onDone (finishRoll) が行う。ここでは解放しない（次ロールが演出を待つ）。
  }, [game.stage, addCoins, grantShields, fireFx, showToast, onZorume, dropCard, startCardFly, finishRoll]);

  doRollRef.current = doRoll;
  // auto-roll loop — depends only on auto/isRolling (NOT on doRoll/game identity),
  // so the 350ms timer isn't reset by App re-renders (e.g. coin count-up animation).
  useEffect(() => {
    if (!auto || isRolling || paused) return;   // メニュー/ジャックポット等の演出中は一時停止（閉じたら再開）
    if (rollsRef.current < betRef.current) { setAuto(false); return; }
    const t = setTimeout(() => doRollRef.current && doRollRef.current(), 350);
    return () => clearTimeout(t);
  }, [auto, isRolling, paused]);

  // refill timer (cosmetic)
  const [refill, setRefill] = useState('50:00');
  useEffect(() => {
    if (game.rolls >= game.rollsMax) { setRefill('満タン'); return; }
    let sec = 50*60; setRefill('50:00');
    const id = setInterval(() => { sec = Math.max(0,sec-1); setRefill(`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`); }, 1000);
    return () => clearInterval(id);
  }, [game.rolls, game.rollsMax]);

  // demo hook (?demo=win|coin|zorume|jackpot|shield)
  const demoFired = useRef(false);
  useEffect(() => {
    if (demoFired.current) return;
    const demo = new URLSearchParams(window.location.search).get('demo');
    const F = DICE_FACES;
    const map = { zorume:[F.JACKPOT,F.JACKPOT,F.JACKPOT], attackz:[F.ATTACK,F.ATTACK,F.ATTACK], stealz:[F.STEAL,F.STEAL,F.STEAL], shield:[F.SHIELD,F.SHIELD,F.SHIELD], jackpot:[F.JACKPOT,F.JACKPOT,F.COIN], coin:[F.COIN,F.COIN,F.COIN], win:[F.COIN,F.COIN,F.ATTACK] };
    if (!map[demo]) return;
    demoFired.current = true;
    const t = setTimeout(() => doRoll(map[demo]), 900);
    return () => clearTimeout(t);
  }, [doRoll]);

  const pct = Math.max(0, Math.min(100, (game.rolls/game.rollsMax)*100));

  return (
    <div className="screen main-screen" style={{ '--bg': `url("${IMG}${night?'bg/BG_Main_Night.png':'bg/BG_Main_Day.png'}")` }}>
      <div className="bg-layer" />
      <div className="ambient-layer" aria-hidden="true">
        {petals.map(p => (
          <div className="petal" key={p.id} style={{
            left: p.left + '%',
            '--drift': p.drift + 'px',
            '--spin': p.spin + 'deg',
            width: p.size + 'px',
            height: p.size + 'px',
            animationDuration: p.dur + 's',
            animationDelay: p.delay + 's',
          }}>
            <Img src={IMG + p.variant} className="petal-img" fallback={<span className="petal-emoji">🌸</span>} />
          </div>
        ))}
      </div>
      <TopBar coins={game.coins} shields={game.shields} onMenu={onMenu} onShop={onShop} night={night} onToggleNight={onToggleNight} />

      {/* 左右サイドレール：旧メニュー＋ボトムナビを左右に分散配置 */}
      <SideRail side="left" items={SIDE_LEFT} go={go} tickets={tickets} pulseKey={railPulse} />
      <SideRail side="right" items={SIDE_RIGHT} go={go} tickets={tickets} />

      {/* 獲得カードの飛翔演出：オフセンターで一瞬見せてから左レール「カード」ボタンへ */}
      {cardFly && (
        <div className={"card-fly " + cardFly.phase + (cardFly.card.gold?' gold':'')} ref={cardFlyRef}
             style={cardFly.phase==='fly' ? { transform:`translate(${cardFly.dx}px, ${cardFly.dy}px) scale(.16)`, opacity:0 } : undefined}>
          <Img src={cardFly.card.img} className="cf-fly-img" fallback={<span className="cf-fly-emoji">🎴</span>} />
          <span className="cf-fly-cap">{cardFly.card.gold?'★ ':''}カード獲得！</span>
        </div>
      )}

      {/* 装備中キャラの常時表示（他UIと非重複の左下）。未装備なら非表示 */}
      {equipped && <CharMascot id={equipped} onClick={()=>go('characters')} />}

      {/* opponent card */}
      <div className="opp-card">
        <div className="opp-avatar">
          <Img key={game.opponent.key} src={game.opponent.img} className="opp-portrait" fallback={<span className="opp-face">👺</span>} />
        </div>
        <div className="opp-info">
          <div className="opp-label">対戦相手</div>
          <div className="opp-name">{game.opponent.name}</div>
        </div>
        <div className="opp-coins">💰 {fmt(game.opponent.coins)}</div>
      </div>

      {/* dice area */}
      <div className="dice-area">
        <div className="dice-stage">
          <div className={"dice-row" + (rollAnim==='3d' ? ' d3' : '')}>
            {rollAnim==='3d'
              ? dice.map((f,i)=><Die3D key={i} face={f} rollKey={roll3dKey} index={i} />)
              : dice.map((f,i)=><Die key={i} face={f} phase={phases[i]} anim={rollAnim} />)}
          </div>
        </div>
        <div className={"gain-banner " + (gainKey ? 'pop':'')} key={gainKey}>
          <span className="gb-label">今回の獲得</span>
          <span className="gold-text">+{fmt(lastGain)}</span>
          <Img src={IMG+'ui/Koban_Small.png'} fallback={<span>🪙</span>} />
        </div>
      </div>

      {/* energy bar */}
      <div className="energy-wrap">
        <div className="energy-top">
          <span>残りロール</span>
          <span className="energy-right">
            <button className="free-roll-btn" onClick={()=>{ grantRolls && grantRolls(5); showToast('🎲 ロール +5！'); }}>🎬 無料+5</button>
            <span><b>{game.rolls}</b> / {game.rollsMax}</span>
          </span>
        </div>
        <div className="energy-track"><div className="energy-fill" style={{width:pct+'%'}} /></div>
        <div className="energy-timer">次の補充: {refill}</div>
      </div>

      {/* roll point (bet) selector: ×1〜×3 で消費ロール＆報酬に倍率 */}
      <div className="bet-bar">
        <span className="bet-label">ロールポイント</span>
        {[1,2,3].map(n => (
          <button key={n} className={"bet-btn " + (bet===n?'on':'')} disabled={isRolling}
            onClick={()=>setBet && setBet(n)}>×{n}</button>
        ))}
        <span className="bet-hint">消費{bet}・報酬×{bet}</span>
      </div>

      {/* bottom dock: ロールボタンのみ（遷移先は左右サイドレールへ移動） */}
      <div className="bottom-dock">
        <RollButton disabled={isRolling || game.rolls < bet} onRoll={doRoll} auto={auto} onToggleAuto={setAuto} />
      </div>

      {/* jackpot effect + gain float (on top). coin burst is rendered behind the dice above. */}
      <div className="fx-layer">
        {fx.jackpot && <Img key={'j'+fx.key} src={IMG+'effect/Effect_Jackpot.png'} className="jackpot-fx on" fallback={<div/>} />}
      </div>

      {/* コイン獲得の大きなパーティクル演出（画面下から噴き上がる）。終了でロール解放＝次ロールへ。 */}
      {coinSpray>0 && <CoinParticles key={'cp'+coinSpray} onDone={finishRoll} />}

      {/* DEBUG — force any hand */}
      <button className="debug-fab" onClick={()=>setShowDebug(v=>!v)} title="デバッグ">🐞</button>
      {showDebug &&
        <div className="debug-panel">
          <div className="debug-head">🐞 デバッグ：役を指定</div>
          {DEBUG_HANDS.map(h =>
            <button key={h.key} className="debug-item" disabled={isRolling}
              onClick={()=>{ setShowDebug(false); doRoll(h.faces || undefined); }}>
              {h.label}
            </button>)}
          {onToggleRollAnim &&
            <button className="debug-item" disabled={isRolling} onClick={onToggleRollAnim}>
              🎬 ダイス演出: {rollAnim==='3d' ? '3D立体' : rollAnim==='toss' ? '飛ばし（下から）' : '回転（従来）'}
            </button>}
          {onRerollShop && <button className="debug-item" onClick={()=>{ onRerollShop(); }}>🛒 ショップ再ロール（4種入替）</button>}
          {onResetShop && <button className="debug-item" onClick={()=>{ onResetShop(); }}>🛒 ショップ購入リセット</button>}
          {onDebugTickets && <button className="debug-item" onClick={()=>{ onDebugTickets(); }}>🎟️ レイドチケット +5</button>}
          <button className="debug-close" onClick={()=>setShowDebug(false)}>閉じる</button>
        </div>}
    </div>
  );
}

/* ============================================================
   SCREEN 02 — ZORUME OVERLAY
   ============================================================ */
function ZorumeOverlay({ faceId, onComplete }) {
  const [phase, setPhase] = useState('flash'); // flash → show → transition
  useEffect(() => {
    const t1 = setTimeout(()=>setPhase('show'), 220);
    const t2 = setTimeout(()=>setPhase('transition'), 900);
    const t3 = setTimeout(()=>onComplete(), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [faceId, onComplete]);

  const color = FACE_COLOR[faceId];
  const face = DICE_FACES[faceId.toUpperCase()];
  return (
    <div className="zorume-overlay" style={{ '--zc': color }}>
      <div className="z-flash" />
      {(() => { const zbg = faceId==='attack' ? 'bg/BG_Attack.png' : faceId==='steal' ? 'bg/BG_Steal.png' : 'bg/BG_Bonus.png';
        return <div className="z-bg" style={{ backgroundImage:`url("${IMG}${zbg}")` }} />; })()}
      <Img src={FACE_EFFECT[faceId]} className="z-effect" fallback={<div/>} />
      <div className="z-dice-row">
        {[0,1,2].map(i =>
          <div className="z-die" key={i} style={{ animationDelay:`${i*80}ms` }}>
            <Img src={IMG+'dice/Dice_Normal.png'} className="die-body" fallback={<div className="die-body" style={{background:'#f5f0e0',borderRadius:16}} />} />
            <Img src={face.image} className="die-face" fallback={<span className="face-emoji">{face.emoji}</span>} />
          </div>)}
      </div>
      <div className="z-banner">
        <Img src={IMG+'ui/UI_Scroll.png'} className="scroll-bg" fallback={<div className="scroll-bg-fallback" />} />
        <div className="scroll-content">
          <div className="scroll-title gold-text">{faceId==='jackpot' ? 'JACKPOT!!' : 'ぞろ目！！'}</div>
          <div className="z-badge" style={{ background:color }}>{FACE_EMOJI[faceId]} {FACE_LABEL[faceId]} ぞろ目</div>
        </div>
      </div>
      <div className="z-chara"><Img src={IMG+'char/Chara_NinjaDog.png'} fallback={<span style={{fontSize:80}}>🐕</span>} /></div>
      {phase==='transition' && <div className="z-next">つぎへ →</div>}
    </div>
  );
}

/* ============================================================
   SCREEN 03 — BONUS ROLL（金色の3Dダイス1個。メインと同じ跳ね上げ→転がり→着地）
   ============================================================ */
const BONUS_SLOTS = ['front','top','right','left','bottom','back'];
function BonusDie3D({ table, result, rollKey }) {
  const cubeRef = useRef(null), launchRef = useRef(null);
  const rot = useRef({ rx:-20, ry:24 });
  useEffect(() => { if (cubeRef.current) cubeRef.current.style.transform = `rotateX(${rot.current.rx}deg) rotateY(${rot.current.ry}deg)`; }, []);
  useEffect(() => {
    if (!rollKey || !result) return;
    const resIdx = Math.max(0, table.findIndex(t => t.face === result.face));
    const rest = REST3D[BONUS_SLOTS[resIdx % 6]];
    const spinsX = 2 + Math.floor(Math.random()*3), spinsY = 3 + Math.floor(Math.random()*3);
    const rx0 = rot.current.rx, ry0 = rot.current.ry;
    const rxE = rx0 + norm360(rest.x - rx0) + spinsX*360;
    const ryE = ry0 + norm360(rest.y - ry0) + spinsY*360;
    const rxA = rx0 + 0.84*(rxE-rx0), ryA = ry0 + 0.84*(ryE-ry0);
    rot.current = { rx:rxE, ry:ryE };
    const dur = 1.5;
    const c = cubeRef.current, l = launchRef.current; if (!c || !l) return;
    c.style.setProperty('--rx0', rx0+'deg'); c.style.setProperty('--ry0', ry0+'deg');
    c.style.setProperty('--rxA', rxA+'deg'); c.style.setProperty('--ryA', ryA+'deg');
    c.style.setProperty('--rxE', rxE+'deg'); c.style.setProperty('--ryE', ryE+'deg');
    c.style.animation = 'none'; void c.offsetWidth; c.style.animation = `d3tumble ${dur}s both`;
    l.style.animation = 'none'; void l.offsetWidth; l.style.animation = `d3launchBig ${dur}s linear both`;
  }, [rollKey]);
  return (
    <div className="d3-slot bonus">
      <div className="d3-launch" ref={launchRef}>
        <div className="d3-tilt">
          <div className="d3-cube bonus" ref={cubeRef}>
            {BONUS_SLOTS.map((slot, i) => (
              <div key={slot} className={"d3-face f-"+slot}><span className="bd3-label">{table[i] ? table[i].label : ''}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BonusRoll({ trigger, stage=3, bet=1, onComplete }) {
  const table = BONUS_DICE_TABLES[trigger] || BONUS_DICE_TABLES.coin;
  const [phase, setPhase] = useState('rolling'); // rolling → result
  const [result, setResult] = useState(null);
  const [rollKey, setRollKey] = useState(0);
  const timerRef = useRef(null);
  const color = FACE_COLOR[trigger];

  const base = coinBaseForStage(stage);
  const coinGain = result
    ? (trigger==='coin'    ? base * result.multiplier * bet
     : trigger==='jackpot' ? (base * result.coinMultiplier + (result.treasure ? 50000 : 0)) * bet
     : 0)
    : 0;
  const gainDisplay = useCountUp(coinGain, 900, phase==='result' && coinGain>0);

  useEffect(() => () => clearTimeout(timerRef.current), []);
  // 入場後まもなく自動で振る：金ダイスが跳ね上がって転がり、当選倍率の面で着地
  useEffect(() => {
    const t = setTimeout(() => {
      const res = rollBonusDice(trigger);
      setResult(res); setRollKey(1); SFX.roll();
      timerRef.current = setTimeout(() => { setPhase('result'); SFX.coin(); }, 1650);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="screen bonus-screen" style={{ backgroundImage:`url("${IMG}bg/BG_Bonus.png")`, '--zc':color }}>
      <div className="bonus-dim" />
      <ScrollBanner title="ボーナスロール！" className="bonus-title" />
      <div className="trigger-card" style={{ borderColor:color }}>
        <span className="trigger-emoji">{FACE_EMOJI[trigger]}{FACE_EMOJI[trigger]}{FACE_EMOJI[trigger]}</span>
        <span>{FACE_LABEL[trigger]} ぞろ目</span>
      </div>

      {/* 倍率の元金は最初から表示（出た倍率が掛かる基準額） */}
      <div className="bonus-base">
        倍率の元金 <Img src={IMG+'ui/Koban_Small.png'} className="bb-ico" fallback={<span>🪙</span>} /> <b className="gold-text">{fmt(base)}</b>
        {bet>1 && <span className="bb-bet">（×{bet}ロールポイント）</span>}
      </div>

      <div className="bonus-dice-wrap">
        {phase==='result' && <Img src={IMG+'effect/Effect_Jackpot.png'} className="bonus-flash" fallback={<div/>} />}
        <BonusDie3D table={table} result={result} rollKey={rollKey} />
      </div>

      {phase==='result' && coinGain>0 && <CoinParticles key="bonusparts" count={34} />}
      {phase==='result' && coinGain>0 &&
        <div className="bonus-reward">
          <div className="br-formula">
            <span className="br-term"><Img src={IMG+'ui/Koban_Small.png'} className="brf-ico" fallback={<span>🪙</span>} />{fmt(base)}</span>
            <span className="br-op">× {result.multiplier}</span>
            {bet>1 && <span className="br-op">× {bet}</span>}
          </div>
          <div className="br-eq gold-text">= +{fmt(gainDisplay)} 🪙</div>
        </div>}
      {phase!=='result'
        ? <div className="bonus-status">ボーナスダイスを振っています…</div>
        : <button className="big-btn gold-btn" onClick={()=>onComplete(result)}>次へ →</button>}
    </div>
  );
}

/* ============================================================
   SCREEN 04 — ATTACK SELECT
   ============================================================ */
/* 連番フレームのワンショット演出（終了で onDone）。name_1..count.png を interval間隔で再生。 */
function FrameAnim({ name, count, interval=90, className='', onDone }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      if (i > count - 1) { clearInterval(t); onDone && onDone(); return; }
      setF(i);
    }, interval);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={"fx-anim " + className}>
      {Array.from({ length: count }).map((_, n) => (
        <Img key={n} src={IMG+name+'_'+(n+1)+'.png'} className={"fx-f" + (n===f?' on':'')} fallback={null} />
      ))}
    </div>
  );
}

/* コイン獲得の大きなパーティクル演出：多数の小判が画面下から噴き上がり、弧を描いて散って落ちる。
   個々の小判に方向/高さ/回転/サイズ/遅延をランダム付与し CSS で飛ばす（実時間パーティクル）。終了で onDone。 */
function CoinParticles({ count=30, onDone }) {
  const [parts] = useState(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    dx: (Math.random() * 2 - 1) * 46,          // 横方向の到達（vw）
    up: 46 + Math.random() * 40,               // 打ち上げ最高点（vh）
    rot: (Math.random() * 2 - 1) * 620,         // 回転（deg）
    dur: 0.95 + Math.random() * 0.55,           // 秒
    delay: Math.random() * 0.22,                // 秒（噴出のばらけ）
    sz: 26 + Math.random() * 30,                // px
    big: Math.random() < 0.42,
    x0: 50 + (Math.random() * 2 - 1) * 16,      // 噴出口の横位置（%）: 画面下中央付近
  })));
  useEffect(() => { const t = setTimeout(() => onDone && onDone(), 1350); return () => clearTimeout(t); }, []);
  return (
    <div className="coin-particles">
      {parts.map(p => (
        <Img key={p.id} src={IMG + (p.big ? 'ui/Koban_Large.png' : 'ui/Koban_Small.png')} className="coin-p"
          style={{ left: p.x0 + '%', width: p.sz + 'px', height: p.sz + 'px',
                   '--dx': p.dx + 'vw', '--up': p.up + 'vh', '--rot': p.rot + 'deg',
                   animationDuration: p.dur + 's', animationDelay: p.delay + 's' }}
          fallback={<span className="coin-p-emoji">🪙</span>} />
      ))}
    </div>
  );
}

function AttackSelect({ opponent, bonusResult, stage=3, ignoreShield=false, onCancel, onResolve }) {
  // opponent's village（建設画面と同じ見た目）。建物を直接タップして攻撃。
  const [village] = useState(() => themedVillage(stage, { levels:{ castle:3, storehouse:2, statue:2, garden:1 } }));
  const [hit, setHit] = useState(null);      // 攻撃中の建物
  const [phase, setPhase] = useState(null);  // 'coin' | 'shield' | 'broken'
  const [broken, setBroken] = useState([]);  // 破壊済みの建物id
  const rate = Math.round((bonusResult?.coinRate ?? 0.25) * 100) || 25;

  const pick = (it) => {
    if (hit) return;                          // 1回のみ攻撃
    const success = opponent.shields <= 0 || ignoreShield;
    setHit(it);
    if (success) { setPhase('burst'); SFX.attack(); }   // まず派手なインパクト → コイン → 破壊
    else { setPhase('shield'); SFX.shield(); setTimeout(()=>onResolve(it, false), 760); }
  };
  const onSprayDone = () => {
    setBroken(b => hit ? [...b, hit.id] : b);  // 建物を破壊状態へ
    setPhase('broken');
    SFX.coin();
    setTimeout(()=>onResolve(hit, true), 700);   // 破壊状態を見せてから結果へ
  };

  return (
    <div className="screen attack-screen" style={{ backgroundImage:`url("${IMG}bg/BG_Attack.png")` }}>
      <div className="mini-bar">
        <button className="ghost-btn" onClick={onCancel}>← 戻る</button>
        <span className="foe-coins"><Img src={IMG+'ui/Koban_Small.png'} className="fc-ico" fallback={<span>💰</span>} />{fmt(opponent.coins)}</span>
        <button className="ghost-btn danger" onClick={onCancel}>逃げる</button>
      </div>
      <ScrollBanner title="攻撃する建物をタップ！" className="attack-title" />
      <div className="asym-note attack">⚔️ 侍の攻撃はシールドで防がれることがある</div>

      <div className="castle-stage village">
        {village.map(it => {
          const broke = broken.includes(it.id);
          const isHit = hit && hit.id === it.id;
          return (
            <div key={it.id} className={"village-item attackable " + (broke?'broken ':'') + (isHit?'hit ':'')}
                 style={{ left:it.x, top:it.y, width:it.w }} onClick={()=>pick(it)}>
              <Img src={it.stages[it.level]} className="vi-img" style={{ width:it.w }} fallback={<span className="vi-emoji">{it.emoji}</span>} />
              {broke && <Img src={IMG+'effect/Effect_Rubble.png'} className="vi-rubble" fallback={<div/>} />}
              {!hit && <div className="target-overlay"><Img src={IMG+'ui/UI_Target.png'} className="reticle" fallback={<span className="reticle-fallback">◎</span>} /></div>}
              {isHit && phase==='burst' && <FrameAnim name="effect/AttackBurst" count={8} interval={55} className="burstfx" onDone={()=>setPhase('coin')} />}
              {isHit && phase==='coin' && <FrameAnim name="effect/CoinSpray" count={8} interval={95} className="coinfx" onDone={onSprayDone} />}
              {isHit && phase==='shield' && <Img src={IMG+'effect/Effect_Shield.png'} className="vi-shieldfx" fallback={<span style={{fontSize:44}}>🛡️</span>} />}
              <span className="target-label">{it.label}</span>
            </div>
          );
        })}
      </div>

      <div className="predict-panel">
        <div className="predict-frame">
          <div>💥 破壊成功時: 相手コインの約 <b>{rate}%</b> 獲得</div>
          <div>🛡️ シールド時: 相手コインの約 <b>7%</b> 獲得</div>
          {bonusResult && <div className="predict-bonus">ボーナス: {bonusResult.label} ダメージ{bonusResult.damage||0}</div>}
        </div>
      </div>

      <div className="attack-chara"><Img src={IMG+'char/Chara_RoboNinja.png'} fallback={<span style={{fontSize:70}}>🤖</span>} /></div>
    </div>
  );
}

/* ============================================================
   SCREEN 05 — ATTACK RESULT
   ============================================================ */
function AttackResult({ result, onNext, opponentName }) {
  const foe = oppShortName(opponentName) || '相手';
  const display = useCountUp(result.coinGain, 1000, true);
  const success = result.success;
  useEffect(() => { success ? SFX.attack() : SFX.shield(); }, []);
  return (
    <div className="screen result-screen" style={{ backgroundImage:`url("${IMG}bg/BG_Attack.png")` }}>
      <div className="result-dim" />
      <div className={"result-pop " + (success ? 'ok':'shield')}>
        <div className="result-head">{success ? '攻撃成功！！' : 'シールドに阻まれた！'}</div>
        <div className="result-visual">
          {success
            ? <><Img src={IMG+'building/Castle_Broken.png'} className="rv-castle" fallback={<span style={{fontSize:90}}>🏚️</span>} />
                <Img src={IMG+'effect/Effect_Attack.png'} className="rv-effect" fallback={<div/>} /></>
            : <Img src={IMG+'effect/Effect_Shield.png'} className="rv-effect big" fallback={<span style={{fontSize:90}}>🛡️</span>} />}
          {success && <Img src={IMG+'effect/CoinBurst.png'} className="rv-burst" fallback={<div/>} />}
        </div>
        {success && <div className="result-part">{result.damage>1 ? `建物を計${result.damage}棟 破壊！` : '建物を破壊！'}</div>}
        <div className="result-coin">
          <Img src={IMG+'ui/Koban_Large.png'} className="rc-icon" fallback={<span>🪙</span>} />
          <span className="gold-text">+{fmt(display)}</span>
        </div>
        <div className="result-react">{success ? `😡 ${foe}: 怒り` : `😅 ${foe}: セーフ`}</div>
        <button className="big-btn green-btn" onClick={onNext}>次へ →</button>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 06 — STEAL
   ============================================================ */
function StealScreen({ opponentName, opponentCoins=0, opponentImg='', betMult=1, onReceive, stealMult=1, autoLastSpot=false, stage=3, pieceBonus=0, ownedPieces={} }) {
  // 相手の村（建設画面と同じ配置）を表示し、建物を直接タップして盗む。
  const [village] = useState(() => themedVillage(stage, { levels:{ castle:3, storehouse:2, statue:2, garden:1 } }));
  const [phase, setPhase] = useState('intro'); // intro → selecting → summary
  const [picks, setPicks] = useState([]);      // {id,label,coinGain,hasBox}
  const [swiping, setSwiping] = useState(null);// 盗み演出中の建物id
  const [boxGot, setBoxGot] = useState(null);  // 宝箱GET演出中の建物id
  const [boxRewards, setBoxRewards] = useState([]); // 宝箱の中身（カード or 仲間かけら／同時には出ない）

  useEffect(() => { const t = setTimeout(()=>setPhase('selecting'), 600); return ()=>clearTimeout(t); }, []);

  const pickedIds = picks.map(p => p.id);

  const pick = (it) => {
    if (phase!=='selecting' || swiping || pickedIds.includes(it.id) || picks.length>=3) return;
    setSwiping(it.id); SFX.steal();   // 盗む演出 → 完了でコイン確定
  };
  // 影のくノ一（autoLastSpot）は3件盗んだ後、残り1件も自動で強奪。
  const finalizeSwipe = (it) => {
    let next = [...picks, stealFromBuilding(it)];
    if (next.length === 3 && autoLastSpot) {
      const rest = village.find(v => !next.some(p => p.id === v.id));
      if (rest) next = [...next, { ...stealFromBuilding(rest), auto:true }];
    }
    const gotBox = next.slice(picks.length).some(r=>r.hasBox);
    setPicks(next); setSwiping(null); SFX.coin();
    if (gotBox) { setBoxGot(it.id); SFX.jackpot(); setTimeout(()=>setBoxGot(null), 1000); }
    if (next.length >= 3) {
      // 宝箱の中身を確定（1箱＝カード or 仲間のどちらか一方）。サマリーで演出リビール。
      const rewards = next.filter(p=>p.hasBox).map(()=>rollStealBoxReward(stage, 0.25, pieceBonus, ownedPieces));
      setBoxRewards(rewards);
      setTimeout(()=>{ setPhase('summary'); SFX.coin(); }, gotBox ? 1250 : 650);
    }
  };

  const subtotal = picks.reduce((s,r)=>s+r.coinGain, 0);
  const boxCount = picks.filter(p=>p.hasBox).length;   // 宝箱の数＝獲得カード枚数
  const total = Math.round(subtotal * betMult * stealMult);   // ロールポイント(betMult)＋装備キャラ(stealMult)
  const totalDisplay = useCountUp(total, 1000, phase==='summary');
  const picksLeft = Math.max(0, 3 - picks.length);

  return (
    <div className="screen steal-screen" style={{ backgroundImage:`url("${IMG}bg/BG_Steal.png")` }}>
      {phase==='intro' && <Img src={IMG+'effect/Effect_Smoke.png'} className="steal-smoke" fallback={<div className="steal-smoke-fallback" />} />}
      <div className="mini-bar">
        <div className="steal-foe">
          <div className="steal-foe-face"><Img key={opponentImg} src={opponentImg} className="sff-img" fallback={<span className="sff-emoji">👺</span>} /></div>
          <div className="steal-foe-info">
            <span className="steal-foe-name">🥷 {opponentName}</span>
            <span className="steal-foe-coins"><Img src={IMG+'ui/Koban_Small.png'} className="fc-ico" fallback={<span>💰</span>} />{fmt(opponentCoins)}</span>
          </div>
        </div>
        <button className="ghost-btn danger" onClick={()=>onReceive(0)}>逃げる</button>
      </div>

      <ScrollBanner title="盗む建物をタップ！" sub={`${'●'.repeat(Math.min(picks.length,3))}${'○'.repeat(picksLeft)}`} className="steal-title" />

      {/* 相手の村：建物を直接タップして盗む */}
      <div className="castle-stage village">
        {village.map(it => {
          const p = picks.find(x => x.id === it.id);
          const isSw = swiping === it.id;
          return (
            <div key={it.id} className={"village-item stealable " + (p?'looted ':'') + (isSw?'swiping ':'')}
                 style={{ left:it.x, top:it.y, width:it.w }} onClick={()=>pick(it)}>
              <Img src={it.stages[it.level]} className="vi-img" style={{ width:it.w }} fallback={<span className="vi-emoji">{it.emoji}</span>} />
              {!p && !isSw && phase==='selecting' && <div className="target-overlay"><Img src={IMG+'ui/UI_Target.png'} className="reticle steal" fallback={<span className="reticle-fallback">◎</span>} /></div>}
              {isSw && <FrameAnim name="effect/StealSwipe" count={7} interval={80} className="stealfx" onDone={()=>finalizeSwipe(it)} />}
              {p && <div className="sc-loot">
                      <span className="sc-coin gold-text">+{fmt(p.coinGain)}</span>
                      {p.hasBox && <Img src={IMG+'ui/TreasureBox_Open.png'} className="sc-loot-box" fallback={<span>🎁</span>} />}
                    </div>}
              {boxGot===it.id && <div className="box-get">
                      <FrameAnim name="effect/Effect_Shine" count={8} interval={70} className="shinefx" />
                      <Img src={IMG+'ui/TreasureBox_Open.png'} className="box-get-img" fallback={<span style={{fontSize:44}}>🎁</span>} />
                      <span className="box-get-label">宝箱GET！</span>
                    </div>}
              <span className="target-label">{it.label}</span>
              {p && <span className="steal-check">✓</span>}
            </div>
          );
        })}
      </div>

      {phase==='summary'
        ? <div className="steal-summary-overlay">
            <div className="steal-summary">
              <div className="ss-row">{autoLastSpot ? '４か所の合計' : '3か所の合計'}: <b>+{fmt(subtotal)}</b></div>
              {autoLastSpot && <div className="ss-row mult">🥷 影のくノ一：最後の1か所も強奪！</div>}
              {betMult>1 && <div className="ss-row mult">× {betMult}倍（ロールポイント）</div>}
              {stealMult>1 && <div className="ss-row mult">× {stealMult}倍（仲間）</div>}
              <div className="ss-total gold-text">= +{fmt(totalDisplay)} 🎉</div>
              {boxRewards.length>0 &&
                <div className="steal-rewards">
                  <div className="sr-head"><Img src={IMG+'ui/TreasureBox_Open.png'} className="sr-box-ico" fallback={<span>🎁</span>} />宝箱の中身</div>
                  <div className="sr-grid">
                    {boxRewards.map((r,i) => (
                      <div key={i} className={"sr-tile " + r.type} style={{ animationDelay:(0.12+i*0.18)+'s' }}>
                        {r.type==='card'
                          ? <><Img src={r.card.img} className="sr-img" fallback={<span className="sr-emoji">🎴</span>} />
                              <span className="sr-cap">{r.card.gold?'★':''}カード</span></>
                          : <><Img src={charThumb(r.char.id)} className="sr-img" fallback={<span className="sr-emoji">🥷</span>} />
                              <span className="sr-cap">{r.char.name}<br/>かけら +{r.amount}</span></>}
                      </div>
                    ))}
                  </div>
                </div>}
              <button className="big-btn green-btn" onClick={()=>onReceive(total, boxRewards)}>受け取る！</button>
            </div>
          </div>
        : null}

      <div className="steal-chara"><Img src={IMG+'char/Chara_NinjaMonkey.png'} fallback={<span style={{fontSize:64}}>🐒</span>} /></div>
    </div>
  );
}

/* ============================================================
   SCREEN 07 — CASTLE BUILD
   ============================================================ */
// Build a village whose 天守閣 AND 蔵/石像/庭園 all match the stage's castle theme (Himeji/Windsor/TajMahal)
const themedVillage = (stage, opts={}) => {
  const theme = castleTypeForStage(stage);
  return makeVillage(opts).map(it => {
    const stages = themedStagesFor(it.id, theme);
    const lvl = opts.max ? stages.length-1 : Math.min(it.level ?? 0, stages.length-1);
    return { ...it, stages, level: lvl };
  });
};

function CastleScreen({ game, spendCoins, grantRolls, showToast, onBack, onNextStage, village, setVillage, buildDiscount=0, headStart=0 }) {
  // 建築状況は App が保持（画面遷移でリセットされない）
  const [tappedId, setTappedId] = useState(null);   // last-built item (for highlight/burst)
  const stageComplete = village.every(v => v.level === itemMax(v));

  const goNextStage = () => {
    const ns = game.stage + 1;
    onNextStage();
    const nv = themedVillage(ns, {});       // new village, everything level 0
    // 大黒天など：新ステージ開始時に建物を headStart 個だけ Lv+1 で開始
    if (headStart > 0) {
      let done = 0;
      for (const it of nv) { if (done >= headStart) break; if (it.id !== 'castle') { it.level = Math.min(1, itemMax(it)); done++; } }
    }
    setVillage(nv);
    setTappedId(null);
    grantRolls && grantRolls(25);           // ステージクリア報酬：ダイスロール
    showToast(headStart>0 ? '次のステージへ！ 🎲+25 ＆ 建物Lv+1！' : '次のステージへ！ 🎲ロール +25 獲得');
  };

  const costOf = (it) => it.level < itemMax(it) ? Math.round(buildCost(it.level, game.stage) * (1 - buildDiscount)) : 0;

  // Tapping a building (or its card) levels it up — no separate build button.
  const build = (it) => {
    if (it.level >= itemMax(it)) return;
    const cost = costOf(it);
    if (game.coins < cost) { showToast('コインが足りません'); return; }
    spendCoins(cost);
    setTappedId(it.id);
    setTimeout(()=>setTappedId(t => t===it.id ? null : t), 700);
    const lvl = it.level + 1;
    const complete = lvl === itemMax(it);
    complete ? SFX.stage() : SFX.build();
    setVillage(prev => prev.map(x => x.id===it.id ? { ...x, level:lvl } : x));
    // レベルアップでダイスロール獲得（完成時は多め）
    const rr = complete ? 10 : 3;
    grantRolls && grantRolls(rr);
    showToast(complete ? `${it.emoji} 完成！ 🎲ロール +${rr}！` : `${it.emoji} Lv${lvl}！ 🎲ロール +${rr}`);
  };

  const castleType = castleTypeForStage(game.stage);

  return (
    <div className="screen castle-screen" style={{ backgroundImage:`url("${CASTLE_BG[castleType]}")` }}>
      <TopBar coins={game.coins} shields={game.shields} />
      <div className="mini-bar"><button className="ghost-btn" onClick={onBack}>← 戻る</button></div>
      <ScrollBanner title={`ステージ ${game.stage}`} className="castle-title" />

      {/* village — tap a building to level it up */}
      <div className="castle-stage village">
        {village.map(it => {
          const done = it.level === itemMax(it);
          return (
            <div key={it.id}
              className={"village-item build " + (tappedId===it.id?'built ':'') + (done?'done':'')}
              style={{ left:it.x, top:it.y, width:it.w }} onClick={()=>build(it)}>
              <Img src={it.stages[it.level]} className="vi-img" style={{ width:it.w }} fallback={<span className="vi-emoji">{it.emoji}</span>} />
              {done && <span className="vi-check">✓</span>}
              {tappedId===it.id && <Img src={IMG+'effect/CoinBurst.png'} className="vi-burst" fallback={<div/>} />}
            </div>
          );
        })}
      </div>

      <div className="build-hint">🔨 タップしてレベルアップ！</div>

      {/* build cards — TAP a card to build/level up that item */}
      <div className="part-cards">
        {village.map(it => {
          const done = it.level === itemMax(it);
          const poor = !done && game.coins < costOf(it);
          return (
            <button key={it.id} className={"build-card " + (done?'done ':'') + (poor?'poor ':'') + (tappedId===it.id?'pressed':'')}
              style={{ borderColor: done ? '#059669' : it.level>0 ? '#D97706' : '#4B5563' }}
              onClick={()=>build(it)} disabled={done}>
              <Img src={it.stages[it.level]} className="pc-icon-img" fallback={<span className="pc-label">{it.emoji}</span>} />
              <div className="pc-lvl">Lv{it.level}/{itemMax(it)}</div>
              <div className="pc-dots">{Array.from({length:itemMax(it)}).map((_,i)=><i key={i} className={i<it.level?'on':''} />)}</div>
              {done ? <div className="pc-state" style={{color:'#059669'}}>✓ 完成</div>
                    : <div className="pc-cost"><Img src={IMG+'ui/Koban_Small.png'} className="pc-coin-ico" fallback={<span>💰</span>} />{fmt(costOf(it))}</div>}
            </button>
          );
        })}
      </div>

      {stageComplete &&
        <div className="stage-clear">
          <div className="sc-title">🎉 ステージクリア！</div>
          <button className="big-btn gold-btn" onClick={goNextStage}>次のステージへ →</button>
          <button className="big-btn green-btn small" onClick={onBack}>ロール画面に戻る</button>
        </div>}
    </div>
  );
}

/* ============================================================
   COLLECTION — 流派カード（既存アセットを流用）
   ============================================================ */
const CARD_SETS = [
  { id:'ninja', name:'忍びの一族', color:'#DB2777', reward:{ rolls:20, coins:50000 }, cards:[
    { id:'dog',    name:'忍犬',      img:IMG+'char/Chara_NinjaDog.png' },
    { id:'monkey', name:'忍猿',      img:IMG+'char/Chara_NinjaMonkey.png' },
    { id:'robo',   name:'ロボ忍者',  img:IMG+'char/Chara_RoboNinja.png' },
    { id:'shuri',  name:'秘伝手裏剣', img:IMG+'card/Card_Shuriken.png', gold:true },
  ]},
  { id:'arms', name:'武具秘伝', color:'#DC2626', reward:{ rolls:30, coins:100000 }, cards:[
    { id:'katana', name:'刀',     img:IMG+'dice/DiceFace_Attack.png' },
    { id:'shield', name:'盾',     img:IMG+'dice/DiceFace_Shield.png' },
    { id:'smoke',  name:'煙玉',   img:IMG+'effect/Effect_Smoke.png' },
    { id:'jack',   name:'黄金の星', img:IMG+'dice/DiceFace_Jackpot.png', gold:true },
  ]},
  { id:'castle', name:'名城巡り', color:'#059669', reward:{ rolls:50, coins:300000 }, cards:[
    { id:'himeji',  name:'姫路城',       img:IMG+'building/Castle_Himeji.png' },
    { id:'windsor', name:'ウィンザー城', img:IMG+'building/Castle_Windsor.png' },
    { id:'taj',     name:'タージ・マハル', img:IMG+'building/Castle_TajMahal.png' },
    { id:'chest',   name:'埋蔵金',       img:IMG+'ui/TreasureBox_Open.png', gold:true },
  ]},
  { id:'worldE', name:'世界名城・東', color:'#D97706', reward:{ rolls:60, coins:400000 }, cards:[
    { id:'egypt', name:'ピラミッド',   img:IMG+'building/Castle_Egypt.png' },
    { id:'china', name:'紫禁城',       img:IMG+'building/Castle_China.png' },
    { id:'aztec', name:'太陽の神殿',   img:IMG+'building/Castle_Aztec.png' },
    { id:'sphinx',name:'黄金のスフィンクス', img:IMG+'card/Card_Sphinx.png', gold:true },
  ]},
  { id:'worldW', name:'世界名城・西', color:'#0EA5E9', reward:{ rolls:80, coins:600000 }, cards:[
    { id:'greece', name:'パルテノン神殿', img:IMG+'building/Castle_Greece.png' },
    { id:'russia', name:'聖ワシリイ大聖堂', img:IMG+'building/Castle_Russia.png' },
    { id:'arabia', name:'砂漠の宮殿',     img:IMG+'building/Castle_Arabia.png' },
    { id:'dragoncastle', name:'龍宮天空城', img:IMG+'building/Castle_Dragon.png' },
    { id:'risingdragon', name:'昇り龍',   img:IMG+'card/Card_GoldDragon.png', gold:true },
  ]},
  { id:'rivalsHi', name:'群雄割拠', color:'#B91C1C', reward:{ rolls:70, coins:500000 }, cards:[
    { id:'shogun',  name:'将軍 徳川',  img:IMG+'opp/Opp_Shogun.png' },
    { id:'daimyo',  name:'大名 織田',  img:IMG+'opp/Opp_Daimyo.png' },
    { id:'general', name:'侍大将 武田', img:IMG+'opp/Opp_General.png' },
    { id:'helm',    name:'覇王の兜',    img:IMG+'card/Card_Helm.png', gold:true },
  ]},
  { id:'rivalsMid', name:'忍びの好敵手', color:'#7C3AED', reward:{ rolls:50, coins:300000 }, cards:[
    { id:'hattori',  name:'忍者頭 服部',  img:IMG+'opp/Opp_NinjaChief.png' },
    { id:'ayame',    name:'くノ一 あやめ', img:IMG+'opp/Opp_Kunoichi.png' },
    { id:'lordtanaka', name:'城主 田中',  img:IMG+'opp/Opp_LordTanaka.png' },
    { id:'scroll',   name:'秘伝の巻物',    img:IMG+'card/Card_Scroll.png', gold:true },
  ]},
  { id:'rivalsLo', name:'市井の者', color:'#65A30D', reward:{ rolls:40, coins:200000 }, cards:[
    { id:'echigoya', name:'豪商 越後屋',  img:IMG+'opp/Opp_Merchant.png' },
    { id:'sasaki',   name:'浪人 佐々木',  img:IMG+'opp/Opp_Ronin.png' },
    { id:'gonbei',   name:'足軽 権兵衛',  img:IMG+'opp/Opp_Ashigaru.png' },
    { id:'kotaro',   name:'見習い 小太郎', img:IMG+'opp/Opp_Apprentice.png' },
    { id:'kobanpile',name:'小判の山',     img:IMG+'card/Card_KobanPile.png', gold:true },
  ]},
];
const ALL_CARDS = CARD_SETS.flatMap(s => s.cards.map(c => ({ ...c, setId:s.id })));
const dropRandomCard = (goldChance = 0.12) => {
  const gold = Math.random() < goldChance;
  const pool = ALL_CARDS.filter(c => !!c.gold === gold);
  return pool[Math.floor(Math.random()*pool.length)];
};

/* ============================================================
   CHARACTERS（仲間）— ピース100枚で入手、1体だけ装備してパッシブ発動
   ============================================================ */
const CHAR_PIECE_GOAL = 100;                    // 入手に必要なピース数

// --- レベル/攻撃力（討伐戦：ピース購入でLv5まで強化） ---
const CHAR_MAX_LEVEL = 5;
const RAID_LEVEL_MULT = { 1:1, 2:1.3, 3:1.6, 4:2.0, 5:2.5 };
const RAID_ATK_BASE = { normal:12, rare:20, epic:32, legend:48 };
const attackPower = (id, level=1) => {
  const c = CHAR_BY_ID[id]; if (!c) return 0;
  return Math.round(RAID_ATK_BASE[c.rank] * (RAID_LEVEL_MULT[level] || 1));
};
const CHAR_LEVEL_COST = {
  normal: [30, 50, 70, 100],
  rare:   [20, 40, 50, 70],
  epic:   [10, 20, 30, 40],
  legend: [5, 10, 20, 30],
};
const charLevelCost = (rank, level) => CHAR_LEVEL_COST[rank][level - 1];

const CHAR_RANKS = {
  normal: { label:'ノーマル',   color:'#94A3B8', short:'N' },
  rare:   { label:'レア',       color:'#38BDF8', short:'R' },
  epic:   { label:'エピック',   color:'#A855F7', short:'E' },
  legend: { label:'レジェンド', color:'#F59E0B', short:'L' },
};
// キャラの連番アイドルフレーム（1..6）。サムネは _1。
const charFrames = (id) => [1,2,3,4,5,6].map(n => IMG+'char/Char_'+id+'_'+n+'.png');
const charThumb  = (id) => IMG+'char/Char_'+id+'_1.png';

// effect 既定値。装備キャラの effect をこれにマージして使う。
const NO_EFFECT = { coinMult:1, stealMult:1, attackMult:1, buildDiscount:0, freeRollChance:0,
  startShields:0, headStartLevels:0, pieceBonus:0, cardDropBonus:0, jackpotBonus:0,
  stealLastSpot:false, ignoreShield:false };

const CHARACTERS = [
  // NORMAL（1効果・控えめ）
  { id:'maneki',      name:'招き猫',       rank:'normal', unlockStage:1,  desc:'通常ロールが5%の確率で無料', effect:{ freeRollChance:0.05 } },
  { id:'miyadaiku',   name:'宮大工',       rank:'normal', unlockStage:1,  desc:'建設費が5%割引',            effect:{ buildDiscount:0.05 } },
  { id:'fukusuzume',  name:'福すずめ',     rank:'normal', unlockStage:2,  desc:'宝箱のピース獲得+10%',       effect:{ pieceBonus:0.10 } },
  { id:'ishigame',    name:'石亀',         rank:'normal', unlockStage:2,  desc:'ステージ開始時シールド+1',    effect:{ startShields:1 } },
  { id:'zenitengu',   name:'銭天狗',       rank:'normal', unlockStage:3,  desc:'小判ぞろ目コイン+8%',        effect:{ coinMult:1.08 } },
  { id:'kosodoro',    name:'こそ泥',       rank:'normal', unlockStage:3,  desc:'スティール獲得コイン+8%',    effect:{ stealMult:1.08 } },
  { id:'ashigaru',    name:'足軽',         rank:'normal', unlockStage:4,  desc:'アタック獲得コイン+8%',      effect:{ attackMult:1.08 } },
  { id:'daruma',      name:'縁起だるま',   rank:'normal', unlockStage:4,  desc:'ロールのカード排出率+5%',     effect:{ cardDropBonus:0.05 } },
  // RARE（強めの1効果）
  { id:'kinmaneki',   name:'黄金招き猫',   rank:'rare',   unlockStage:5,  desc:'通常ロールが10%の確率で無料', effect:{ freeRollChance:0.10 } },
  { id:'toryo',       name:'棟梁',         rank:'rare',   unlockStage:5,  desc:'建設費が12%割引',           effect:{ buildDiscount:0.12 } },
  { id:'fukunokami',  name:'福の神',       rank:'rare',   unlockStage:6,  desc:'小判ぞろ目コイン+18%',       effect:{ coinMult:1.18 } },
  { id:'nezumikozo',  name:'鼠小僧',       rank:'rare',   unlockStage:6,  desc:'スティール獲得コイン+18%',   effect:{ stealMult:1.18 } },
  { id:'akaoni',      name:'赤鬼',         rank:'rare',   unlockStage:7,  desc:'アタック獲得コイン+18%',     effect:{ attackMult:1.18 } },
  { id:'bakedanuki',  name:'化け狸',       rank:'rare',   unlockStage:7,  desc:'宝箱のピース獲得+25%',       effect:{ pieceBonus:0.25 } },
  // EPIC（複合・特殊）
  { id:'kagekunoichi',name:'影のくノ一',   rank:'epic',   unlockStage:8,  desc:'スティール+1か所＋獲得+10%', effect:{ stealLastSpot:true, stealMult:1.10 } },
  { id:'ashuramusha', name:'阿修羅武者',   rank:'epic',   unlockStage:8,  desc:'アタック必中＋獲得+15%', effect:{ ignoreShield:true, attackMult:1.15 } },
  { id:'daikokuten',  name:'大黒天',       rank:'epic',   unlockStage:9,  desc:'建設20%割引＋建物Lv+1', effect:{ buildDiscount:0.20, headStartLevels:1 } },
  { id:'takarabune',  name:'七福神の宝船', rank:'epic',   unlockStage:9,  desc:'小判ぞろ目+25%＋ピース+20%',     effect:{ coinMult:1.25, pieceBonus:0.20 } },
  // LEGEND（切り札・複合大）
  { id:'ryujin',      name:'昇り龍神',     rank:'legend', unlockStage:10, desc:'全獲得+30%＋ジャックポット+50%',     effect:{ coinMult:1.30, stealMult:1.30, attackMult:1.30, jackpotBonus:0.5 } },
  { id:'daitengu',    name:'金の大天狗',   rank:'legend', unlockStage:10, desc:'無料ロール20%＋建設25%割引＋ピース+30%', effect:{ freeRollChance:0.20, buildDiscount:0.25, pieceBonus:0.30 } },
];
const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));
// localStorage JSON ヘルパー（既存の try/catch 方針に倣う）
const lsGet = (k, def) => { try { const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : def; } catch(e){ return def; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
// 装備キャラ（id）から有効な effect を導出。レベルが上がるほど効果が強化される
// （乗算系effectは基準倍率からの伸び幅を、加算系effectはそのまま倍率で拡大）。
const EFF_MULT_KEYS = ['coinMult','stealMult','attackMult'];
const EFF_ADD_KEYS  = ['buildDiscount','freeRollChance','pieceBonus','cardDropBonus','jackpotBonus'];
const activeEffect = (equippedId, level=1) => {
  const c = equippedId && CHAR_BY_ID[equippedId];
  if (!c) return NO_EFFECT;
  const mult = RAID_LEVEL_MULT[level] || 1;
  const out = { ...c.effect };
  EFF_MULT_KEYS.forEach(k => { if (out[k] != null) out[k] = 1 + (out[k] - 1) * mult; });
  EFF_ADD_KEYS.forEach(k =>  { if (out[k] != null) out[k] = out[k] * mult; });
  return { ...NO_EFFECT, ...out };
};
// ピース1口の枚数。宝箱=box / ジャックポット=jackpot。レジェンドは少なめ。
const piecesFor = (rank, source) => {
  const [lo, hi] = source === 'jackpot'
    ? (rank === 'legend' ? [12, 20] : [25, 45])
    : (rank === 'legend' ? [5, 10]  : [10, 20]);   // box
  return lo + Math.floor(Math.random() * (hi - lo + 1));
};
// --- 仲間ガチャ（商店）。排出は全キャラ対象（ステージ未到達は既存の解放待ち扱い） ---
const GACHA_TIERS = [
  { key:'normal', name:'ノーマルガチャ', price:100000,
    odds:{ normal:0.73, rare:0.25, epic:0.01, legend:0.01 },
    pieces:{ normal:[15,30], rare:[10,20], epic:[5,10], legend:[3,5] } },
  { key:'rare',   name:'レアガチャ',     price:500000,
    odds:{ normal:0.27, rare:0.60, epic:0.10, legend:0.03 },
    pieces:{ normal:[40,70], rare:[25,45], epic:[15,25], legend:[8,12] } },
  { key:'super',  name:'スーパーガチャ', price:1000000,
    odds:{ rare:0.30, epic:0.50, legend:0.20 },
    pieces:{ rare:[50,80], epic:[30,50], legend:[15,25] } },
];
const rollGacha = (tier) => {
  const keys = Object.keys(tier.odds);
  const r = Math.random();
  let acc = 0, rank = keys[keys.length - 1];   // 端数で加算しきれなかった場合のフォールバック＝最後のキー
  for (const k of keys) { acc += tier.odds[k]; if (r < acc) { rank = k; break; } }
  const pool = CHARACTERS.filter(c => c.rank === rank);
  const char = pool[Math.floor(Math.random() * pool.length)];
  const [lo, hi] = tier.pieces[rank];
  return { char, amount: lo + Math.floor(Math.random() * (hi - lo + 1)), rank };
};
// 解放済み（unlockStage<=stage）のキャラからランダム抽選。未所持を優先。
const pickCharForPieces = (stage, ownedPieces) => {
  const pool = CHARACTERS.filter(c => c.unlockStage <= stage);
  if (!pool.length) return null;
  const notDone = pool.filter(c => (ownedPieces[c.id] || 0) < CHAR_PIECE_GOAL);
  const cand = notDone.length ? notDone : pool;
  return cand[Math.floor(Math.random() * cand.length)];
};
// スティールの宝箱1つ分の中身：カード「または」仲間のかけら（同時には出ない）。
const rollStealBoxReward = (stage, goldChance = 0.25, pieceBonus = 0, ownedPieces = {}) => {
  const wantChar = Math.random() < 0.5;
  if (wantChar) {
    const ch = pickCharForPieces(stage, ownedPieces);
    if (ch) {
      const amount = Math.round(piecesFor(ch.rank, 'box') * (1 + pieceBonus));
      return { type: 'char', char: ch, amount };
    }
  }
  return { type: 'card', card: dropRandomCard(goldChance) };
};
// ジャックポットの「仲間召喚」：全キャラ対象（未解放でも可）。ノーマルは排出せず、レア>エピック>レジェンドの順に出やすい。
// 枚数はレア度固定：レア20 / エピック10 / レジェンド5。
const SUMMON_AMOUNT = { rare: 20, epic: 10, legend: 5 };
const rollCompanionSummon = () => {
  const r = Math.random() * 100;
  const rank = r < 60 ? 'rare' : r < 90 ? 'epic' : 'legend';   // 60% / 30% / 10%（ノーマル除外）
  const pool = CHARACTERS.filter(c => c.rank === rank);
  const char = pool[Math.floor(Math.random() * pool.length)];
  return { char, amount: SUMMON_AMOUNT[rank] };
};

/* ---- Shinobi Mart（総合ショップ）データ ---- */
// キャラのピースをこばんで購入。ランク別の価格と枚数。日替り4種・各1回。
const CHAR_SHOP_PRICE = {
  normal: { coins: 30000,  pieces: 15 },
  rare:   { coins: 90000,  pieces: 12 },
  epic:   { coins: 240000, pieces: 10 },
  legend: { coins: 700000, pieces: 6  },
};
// こばんで買える消耗品（何度でも購入可）
const KOBAN_SHOP = [
  { id:'roll30',  label:'ロール +30', sub:'🎲', coins:60000,  rolls:30 },
  { id:'roll80',  label:'ロール +80', sub:'🎲', coins:150000, rolls:80 },
  { id:'shield1', label:'シールド +1', sub:'🛡️', coins:120000, shields:1 },
  { id:'ticket1', label:'レイド券 +1', sub:'🎟️', coins:100000, tickets:1 },
];
const todayStr = () => { try { return new Date().toISOString().slice(0,10); } catch(e){ return '2026-01-01'; } };
// 日付シードで解放済みキャラから4体を決定（毎日入れ替わる・決定的）
const buildDailyOffers = (stage, dateStr) => {
  const pool = CHARACTERS.filter(c => c.unlockStage <= stage);
  let seed = 2166136261; for (const ch of dateStr) seed = ((seed ^ ch.charCodeAt(0)) * 16777619) >>> 0;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr.slice(0, 4).map(c => c.id);
};

function CardFace({ card, owned }) {
  return (
    <div className={"card-face " + (card.gold?'gold ':'') + (owned?'owned':'locked')}>
      {owned
        ? (card.img ? <Img src={card.img} className="cf-img" fallback={<span className="cf-emoji">{card.emoji||'🎴'}</span>} />
                    : <span className="cf-emoji">{card.emoji||'🎴'}</span>)
        : <span className="cf-q">？</span>}
      <span className="cf-name">{owned ? card.name : '？？？'}</span>
      {card.gold && <span className="cf-goldtag">GOLD</span>}
    </div>
  );
}

function CollectionScreen({ owned, claimed, onClaim, onBack, showToast }) {
  const has = (id) => (owned[id]||0) > 0;
  return (
    <div className="screen sheet-screen">
      <div className="mini-bar"><button className="ghost-btn" onClick={onBack}>← 戻る</button><span className="ghost-label">📖 流派コレクション</span></div>
      <div className="sheet-scroll">
        {CARD_SETS.map(set => {
          const done = set.cards.every(c => has(c.id));
          const isClaimed = claimed.includes(set.id);
          return (
            <div key={set.id} className="card-set" style={{ borderColor:set.color }}>
              <div className="cs-head">
                <span className="cs-name" style={{ color:set.color }}>{set.name}</span>
                <span className="cs-prog">{set.cards.filter(c=>has(c.id)).length}/{set.cards.length}</span>
              </div>
              <div className="card-row">
                {set.cards.map(c => <CardFace key={c.id} card={c} owned={has(c.id)} />)}
              </div>
              <button className={"big-btn small " + (done && !isClaimed ? 'gold-btn':'disabled')}
                disabled={!done || isClaimed} onClick={()=>onClaim(set)}>
                {isClaimed ? '受取済み' : done ? `コンプ報酬：🎲${set.reward.rolls} 💰${fmt(set.reward.coins)}` : 'セット未完成'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   CHARACTERS — 仲間の選択/装備画面（ランク別ロスター＋ピース進捗）
   ============================================================ */
function CharactersScreen({ ownedPieces, equipped, onEquip, onBack, stage, charLevels={}, onLevelUp }) {
  const ranks = ['normal','rare','epic','legend'];
  const eqChar = equipped && CHAR_BY_ID[equipped];
  return (
    <div className="screen sheet-screen">
      <div className="mini-bar"><button className="ghost-btn" onClick={onBack}>← 戻る</button><span className="ghost-label">🥷 仲間（キャラクター）</span></div>
      <div className="char-equip-banner">
        {eqChar
          ? <><Img src={charThumb(eqChar.id)} className="ceb-img" fallback={<span style={{fontSize:32}}>🧙</span>} />
              <div className="ceb-info"><div className="ceb-label">装備中</div><div className="ceb-name">{eqChar.name}</div></div></>
          : <div className="ceb-empty">仲間を装備しよう</div>}
      </div>
      <div className="sheet-scroll">
        {ranks.map(rk => {
          const meta = CHAR_RANKS[rk];
          const list = CHARACTERS.filter(c => c.rank === rk);
          const ownedN = list.filter(c => (ownedPieces[c.id]||0) >= CHAR_PIECE_GOAL).length;
          return (
            <div key={rk} className="char-rank-sec" style={{ borderColor: meta.color }}>
              <div className="cs-head">
                <span className="cs-name" style={{ color: meta.color }}>{meta.label}</span>
                <span className="cs-prog">{ownedN}/{list.length}</span>
              </div>
              <div className="char-grid">
                {list.map(c => {
                  const pieces      = ownedPieces[c.id] || 0;
                  const complete    = pieces >= CHAR_PIECE_GOAL;
                  const stageOk     = c.unlockStage <= stage;
                  const hasProgress = pieces > 0;
                  const reveal      = stageOk || hasProgress;   // 実名・実サムネ・進捗を公開する
                  const owned       = complete && stageOk;      // 装備可能
                  const locked      = !reveal;                  // ＝ !stageOk && !hasProgress（真の未遭遇のみ）
                  const lockBadge   = !stageOk && hasProgress;   // ステージ未到達だが公開済み（旧pendingを統合、コンプ有無問わず）
                  const showProg    = !complete && reveal;       // 未コンプかつ公開済み → 進捗バー
                  const on          = equipped === c.id;
                  return (
                    <div key={c.id} className={"char-card " + (owned?'owned ':'') + (lockBadge?'char-pending ':'') + (locked?'locked ':'') + (on?'equipped':'')} style={{ '--rk': meta.color }}>
                      <div className="char-card-face">
                        {locked
                          ? <span className="char-lock">🔒</span>
                          : <Img src={charThumb(c.id)} className="char-card-img" fallback={<span style={{fontSize:38}}>🧙</span>} />}
                        <span className="char-rank-tag" style={{ background: meta.color }}>{meta.short}</span>
                      </div>
                      <div className="char-card-name">{locked ? '？？？' : c.name}</div>
                      <div className="char-card-desc">{locked ? `ステージ${c.unlockStage}で解放` : c.desc}</div>
                      {owned &&
                        <button className={"char-eq-btn " + (on?'on':'')} onClick={()=>onEquip(c.id)}>{on ? '装備中 ✓' : '装備する'}</button>}
                      {owned && (() => {
                        const lv = charLevels[c.id] || 1;
                        const isMax = lv >= CHAR_MAX_LEVEL;
                        const cost = isMax ? 0 : charLevelCost(c.rank, lv);
                        const canLvUp = !isMax && (pieces - CHAR_PIECE_GOAL) >= cost;
                        return (
                          <div className="char-lv-block">
                            <span className="char-lv-badge">Lv{lv}/{CHAR_MAX_LEVEL}</span>
                            {isMax
                              ? <button className="char-lvup-btn max" disabled>MAX</button>
                              : <button className={"char-lvup-btn" + (canLvUp?'':' disabled')} disabled={!canLvUp} onClick={()=>onLevelUp && onLevelUp(c.id)}>
                                  レベルアップ（🧩{cost}）
                                </button>}
                          </div>
                        );
                      })()}
                      {lockBadge &&
                        <div className="char-pending-badge">ステージ{c.unlockStage} 解放待ち</div>}
                      {showProg &&
                        <div className="char-prog">
                          <div className="char-prog-bar"><div className="char-prog-fill" style={{ width:(pieces/CHAR_PIECE_GOAL*100)+'%', background: meta.color }} /></div>
                          <span className="char-prog-txt">{pieces}/{CHAR_PIECE_GOAL} かけら</span>
                        </div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   CLAN RAID — 一族＋協力ボス（10体ローテーション＋討伐専用編成）
   ============================================================ */
// --- 討伐戦ボス（10体、村ステージSTAGE_THEMESと1:1対応） ---
const RAID_BOSSES = [
  { n:1,  theme:'himeji',   name:'姫路の妖魔',   img:'boss/Boss_himeji.png',   bg:'bg/BG_Raid_himeji.png',   emoji:'🏯' },
  { n:2,  theme:'windsor',  name:'鋼鉄の騎士王', img:'boss/Boss_windsor.png',  bg:'bg/BG_Raid_windsor.png',  emoji:'🛡️' },
  { n:3,  theme:'tajmahal', name:'白亜の魔宮神', img:'boss/Boss_tajmahal.png', bg:'bg/BG_Raid_tajmahal.png', emoji:'🕌' },
  { n:4,  theme:'egypt',    name:'黄金のファラオ', img:'boss/Boss_egypt.png',   bg:'bg/BG_Raid_egypt.png',    emoji:'🐫' },
  { n:5,  theme:'china',    name:'紫禁の龍帝',   img:'boss/Boss_china.png',    bg:'bg/BG_Raid_china.png',    emoji:'🐉' },
  { n:6,  theme:'greece',   name:'神殿の巨神',   img:'boss/Boss_greece.png',   bg:'bg/BG_Raid_greece.png',   emoji:'🏛️' },
  { n:7,  theme:'aztec',    name:'石造の石神',   img:'boss/Boss_aztec.png',    bg:'bg/BG_Raid_aztec.png',    emoji:'🗿' },
  { n:8,  theme:'russia',   name:'氷雪の熊将',   img:'boss/Boss_russia.png',   bg:'bg/BG_Raid_russia.png',   emoji:'🐻' },
  { n:9,  theme:'arabia',   name:'灼熱の魔神',   img:'boss/Boss_arabia.png',   bg:'bg/BG_Raid_arabia.png',   emoji:'🧞' },
  { n:10, theme:'dragon',   name:'覇龍',         img:'boss/Boss_dragon.png',   bg:'bg/BG_Raid_dragon.png',   emoji:'🐲' },
];
const RAID_MAX_BOSS = RAID_BOSSES.length;   // = MAX_STAGE = 10

// --- ボス撃破報酬カーブ ---
const raidBossCoin  = (n) => 200000 + 300000 * (n - 1);   // boss1=200k … boss10=2.9M
const raidBossRolls = (n) => 20 + 5 * n;                  // 25 … 70
const RAID_MILESTONES = [75, 50, 25];
const RAID_MILESTONE_FRAC = { 75:0.08, 50:0.10, 25:0.12 };
const raidMilestoneReward = (n, m) => Math.round(raidBossCoin(n) * RAID_MILESTONE_FRAC[m]);

// --- ダメージ計算 ---
const RAID_DMG_MIN = 3, RAID_DMG_MAX = 60;
const raidBossTough = (n) => 2.5 + (n - 1) * 1.4;
const raidDamagePct = (partyAP, n) =>
  Math.max(RAID_DMG_MIN, Math.min(RAID_DMG_MAX, Math.round((partyAP + 6) / raidBossTough(n))));
const RAID_PARTY_MAX = 4;

function ClanRaidScreen({ onBack, addCoins, grantRolls, showToast, tickets, spendTicket, raid, setRaid, raidParty=[], charLevels={}, stage, onEditParty }) {
  const { boss, hp, awaitingUnlock, allDone, claimedBosses=[], milestonesHit=[], log } = raid;   // レイド進行はApp保持（再入場でリセットしない）
  const bossDef = RAID_BOSSES[boss-1] || RAID_BOSSES[0];
  const defeated = hp <= 0;
  const partyAP = raidParty.reduce((s,id)=>s+attackPower(id, charLevels[id]||1), 0);
  const claimedThis = claimedBosses.includes(boss);

  const attack = () => {
    if (allDone || awaitingUnlock || defeated) return;
    if (tickets <= 0) { showToast('レイドチケット🎟️が必要'); return; }
    if (!raidParty.length) { showToast('討伐編成を組もう'); return; }
    spendTicket();
    const dmg = raidDamagePct(partyAP, boss);
    const nextHp = Math.max(0, hp - dmg);
    const newlyHit = RAID_MILESTONES.filter(m => hp > m && nextHp <= m && !milestonesHit.includes(m));
    let bonus = 0;
    if (newlyHit.length) {
      bonus = newlyHit.reduce((s,m) => s + raidMilestoneReward(boss, m), 0);
      addCoins(bonus);
      showToast(`🏯 ボスHP ${newlyHit[newlyHit.length-1]}%突破！ 報酬 +${fmt(bonus)} 🪙`);
    }
    setRaid(r => ({ ...r, hp: nextHp,
      log: nextHp<=0 ? `🎉 ${bossDef.name} 撃破！一族の勝利！` : `🥷 一族が ${dmg}% 削った！`,
      milestonesHit:[...(r.milestonesHit||[]), ...newlyHit] }));
  };
  const claim = () => {
    if (claimedBosses.includes(boss)) return;
    addCoins(raidBossCoin(boss));
    grantRolls && grantRolls(raidBossRolls(boss));
    showToast(`🎲 ロール +${raidBossRolls(boss)} 獲得！`);
    setRaid(r => {
      const cb = [...r.claimedBosses, boss];
      if (boss >= RAID_MAX_BOSS) return { ...r, claimedBosses:cb, allDone:true };
      if (stage >= boss + 1) return { ...r, claimedBosses:cb, boss:boss+1, hp:100, milestonesHit:[], log:`ボス${boss+1}が出現した！` };
      return { ...r, claimedBosses:cb, awaitingUnlock:true };
    });
  };

  return (
    <div className="screen sheet-screen" style={{ backgroundImage:`url("${IMG}${bossDef.bg}")` }}>
      <div className="result-dim" />
      <div className="mini-bar"><button className="ghost-btn" onClick={onBack}>← 戻る</button><span className="ghost-label">🎟️ レイドチケット × {tickets}</span></div>
      <div className="raid-body">
        <div className="raid-title">討伐戦 — ボス {boss}/{RAID_MAX_BOSS}</div>
        <div className="raid-boss">
          <Img src={IMG+bossDef.img} className={"raid-castle " + (defeated?'broken':'')} fallback={<span style={{fontSize:110}}>{bossDef.emoji}</span>} />
          {defeated && <Img src={IMG+'effect/Effect_Attack.png'} className="raid-fx" fallback={<div/>} />}
        </div>
        <div className="raid-boss-name">{bossDef.name}</div>
        <div className="raid-hpbar-frame">
          <div className="raid-hpbar"><div className="raid-hpfill" style={{ width:hp+'%' }} /><span className="raid-hptext">ボスHP {hp}%</span></div>
        </div>
        <div className="raid-log">{log}</div>

        <div className="raid-party-bar">
          <div className="rpb-head">
            <span>討伐編成・合計攻撃力 ⚔️{fmt(partyAP)}</span>
            <button className="raid-party-edit" onClick={onEditParty}>編成 ✎</button>
          </div>
          <div className="raid-party-slots">
            {Array.from({ length: RAID_PARTY_MAX }).map((_, i) => {
              const id = raidParty[i];
              const c = id && CHAR_BY_ID[id];
              return (
                <div key={i} className={"raid-party-slot" + (c ? ' filled' : '')} onClick={!c ? onEditParty : undefined}>
                  {c
                    ? <>
                        <Img src={charThumb(c.id)} className="rps-img" fallback={<span style={{fontSize:26}}>🧙</span>} />
                        <span className="rps-name">{c.name}</span>
                        <span className="rps-lv">Lv{charLevels[c.id] || 1}</span>
                      </>
                    : <span className="rps-plus">＋</span>}
                </div>
              );
            })}
          </div>
        </div>

        {allDone
          ? <div className="raid-done">
              <div className="raid-done-title">🏆 討伐完了！</div>
              <div className="raid-log">全10体のボスを討伐した。一族の伝説は語り継がれる。</div>
            </div>
          : awaitingUnlock
          ? <div className="raid-log" style={{ marginTop:8 }}>次のボスはステージ{boss+1}到達で出現します</div>
          : defeated
          ? <button className={"big-btn gold-btn" + (claimedThis ? ' disabled' : '')} disabled={claimedThis} onClick={claim}>
              {claimedThis ? '受取済み' : `報酬を受け取る 💰${fmt(raidBossCoin(boss))}`}
            </button>
          : <button className={"big-btn red-btn" + (tickets>0 && raidParty.length ? '' : ' disabled')} onClick={attack}>攻撃する！ 🎟️×1</button>}
        {!allDone && !awaitingUnlock && !defeated && tickets<=0 &&
          <div className="raid-log" style={{ marginTop:8 }}>🎟️チケットはゾロ目小判で入手できます</div>}
        {!allDone && !awaitingUnlock && !defeated && tickets>0 && !raidParty.length &&
          <div className="raid-log" style={{ marginTop:8 }}>討伐編成を1体以上組もう</div>}
      </div>
    </div>
  );
}

/* ============================================================
   RAID PARTY — 討伐編成画面（所持キャラから最大4体を選出）
   ============================================================ */
function RaidPartyScreen({ ownedPieces, charLevels={}, party=[], onToggle, onBack, stage }) {
  const ranks = ['normal','rare','epic','legend'];
  const sumAP = party.reduce((s,id)=>s+attackPower(id, charLevels[id]||1), 0);
  return (
    <div className="screen sheet-screen">
      <div className="mini-bar"><button className="ghost-btn" onClick={onBack}>← 戻る</button><span className="ghost-label">🗡️ 討伐編成</span></div>
      <div className="char-equip-banner">
        <div className="ceb-info">
          <div className="ceb-label">編成 {party.length}/{RAID_PARTY_MAX}</div>
          <div className="ceb-name">合計攻撃力 ⚔️{fmt(sumAP)}</div>
        </div>
      </div>
      <div className="sheet-scroll">
        {ranks.map(rk => {
          const meta = CHAR_RANKS[rk];
          const list = CHARACTERS.filter(c => c.rank === rk);
          return (
            <div key={rk} className="char-rank-sec" style={{ borderColor: meta.color }}>
              <div className="cs-head"><span className="cs-name" style={{ color: meta.color }}>{meta.label}</span></div>
              <div className="char-grid">
                {list.map(c => {
                  const pieces   = ownedPieces[c.id] || 0;
                  const owned    = pieces >= CHAR_PIECE_GOAL && c.unlockStage <= stage;
                  const locked   = !owned;
                  const lv       = charLevels[c.id] || 1;
                  const selIdx   = party.indexOf(c.id);
                  const selected = selIdx >= 0;
                  const full     = !selected && party.length >= RAID_PARTY_MAX;
                  return (
                    <div key={c.id}
                      className={"char-card raid-pick " + (owned?'owned ':'') + (locked?'locked ':'') + (selected?'selected ':'') + (full?'full-disabled':'')}
                      style={{ '--rk': meta.color }} onClick={()=>owned && onToggle(c.id)}>
                      <div className="char-card-face">
                        {locked
                          ? <span className="char-lock">🔒</span>
                          : <Img src={charThumb(c.id)} className="char-card-img" fallback={<span style={{fontSize:38}}>🧙</span>} />}
                        <span className="char-rank-tag" style={{ background: meta.color }}>{meta.short}</span>
                        {selected && <span className="raid-pick-badge">{selIdx+1}</span>}
                      </div>
                      <div className="char-card-name">{locked ? '？？？' : c.name}</div>
                      {owned
                        ? <div className="char-atk-badge">⚔️{attackPower(c.id, lv)}　Lv{lv}</div>
                        : <div className="char-card-desc">未入手</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   SEASON — シーズンパス（XP=ロール数）
   ============================================================ */
// 報酬は {kind, amt, text?} で保持（絵文字パースをやめ、アイコンは画像で表示）
const SEASON_TIERS = [
  { xp:0,  kind:'roll', amt:10 }, { xp:5, kind:'coin', amt:20000 }, { xp:12, kind:'shield', amt:1 },
  { xp:20, kind:'roll', amt:30 }, { xp:30, kind:'coin', amt:80000 }, { xp:42, kind:'card', text:'カード' },
  { xp:55, kind:'roll', amt:50 }, { xp:70, kind:'coin', amt:200000 }, { xp:88, kind:'cosmetic', text:'限定衣装' },
];
// 報酬アイコン（画像）と絵文字フォールバック
const REWARD_ICON  = { roll:'ui/Icon_Dice.png', coin:'ui/Koban_Small.png', shield:'ui/Icon_Shield.png', card:'ui/Icon_Card.png', cosmetic:'ui/Icon_Crown.png' };
const REWARD_EMOJI = { roll:'🎲', coin:'💰', shield:'🛡️', card:'🎴', cosmetic:'👑' };
const rewardLabel = (r) => r.text || (r.kind==='shield' ? '+'+r.amt : fmt(r.amt));
function RewardChip({ r }) {
  return (
    <span className="reward-chip">
      <Img src={IMG+REWARD_ICON[r.kind]} className="reward-ico" fallback={<span>{REWARD_EMOJI[r.kind]}</span>} />
      {rewardLabel(r)}
    </span>
  );
}
function SeasonScreen({ xp, claimed, onClaim, onBack }) {
  // 次に到達すべきティア（未解放の最初のもの）を算出。全解放済なら MAX。
  const nextTier = SEASON_TIERS.find(t => xp < t.xp);
  const prevXp = SEASON_TIERS.filter(t => t.xp <= xp).reduce((m,t) => Math.max(m,t.xp), 0);
  const isMax = !nextTier;
  const target = isMax ? xp : nextTier.xp;
  const pct = isMax ? 100 : Math.max(0, Math.min(100, ((xp - prevXp) / (target - prevXp)) * 100));
  return (
    <div className="screen season-screen" style={{ backgroundImage:`url("${IMG}bg/BG_Season.png")` }}>
      <div className="mini-bar"><button className="ghost-btn" onClick={onBack}>← 戻る</button></div>
      <ScrollBanner title="花見シーズン" sub="ロールでXPを貯めよう" className="season-title" />
      <div className="season-body">
        <div className="season-xpbar">
          <div className="sx-top">
            <span className="sx-label">🎫 シーズンXP</span>
            <b className="sx-val">{xp}</b>
          </div>
          <div className="sx-track">
            <div className="sx-fill" style={{ width: pct + '%' }} />
          </div>
          <div className="sx-next">{isMax ? 'MAX 到達！全報酬解放' : `次の報酬まで あと ${target - xp} XP（${target}XP）`}</div>
        </div>
        <div className="sheet-scroll">
          <div className="season-track">
            {SEASON_TIERS.map((t,i) => {
              const unlocked = xp >= t.xp;
              const isClaimed = claimed.includes(i);
              const state = isClaimed ? 'claimed' : (unlocked ? 'on' : 'locked');
              return (
                <div key={i} className={"season-tier " + state}>
                  <div className="st-tier">Lv{i+1}</div>
                  <div className="st-reward"><RewardChip r={t} /></div>
                  <div className="st-req">{t.xp}XP</div>
                  <button className={"tier-btn " + (unlocked && !isClaimed ? 'ready':'')} disabled={!unlocked || isClaimed} onClick={()=>onClaim(i)}>
                    {isClaimed ? '✓' : unlocked ? '受取' : '🔒'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INVITE — 招待マイルストン
   ============================================================ */
const INVITE_MILES = [
  { label:'友達がゲームを開始', reward:{ kind:'roll', amt:25 }, done:true },
  { label:'友達がステージ3到達', reward:{ kind:'coin', amt:100000 }, done:true },
  { label:'友達が一族に加入', reward:{ kind:'roll', amt:50 }, done:false },
  { label:'友達が初回購入', reward:{ kind:'cosmetic', text:'限定ペット' }, done:false },
];
function InviteScreen({ onBack, showToast, grantRolls, addCoins }) {
  const [claimed, setClaimed] = useState([]);
  const claim = (i, reward) => {
    setClaimed(c => [...c, i]);
    if (reward.kind==='roll' && grantRolls) grantRolls(reward.amt||0);
    else if (reward.kind==='coin' && addCoins) addCoins(reward.amt||0);
    showToast('招待報酬を受け取りました！');
  };
  return (
    <div className="screen sheet-screen">
      <div className="mini-bar"><button className="ghost-btn" onClick={onBack}>← 戻る</button><span className="ghost-label">👥 友達を招待</span></div>
      <div className="invite-hero">
        <div className="invite-code">招待コード： <b>NINJA-7F3K</b></div>
        <button className="big-btn green-btn" onClick={()=>showToast('リンクをコピーしました')}>招待リンクをコピー</button>
      </div>
      <div className="sheet-scroll">
        {INVITE_MILES.map((m,i) => {
          const isClaimed = claimed.includes(i);
          return (
            <div key={i} className={"invite-mile " + (m.done?'reached':'')}>
              <span className="im-check">{m.done?'✅':'⬜'}</span>
              <span className="im-label">{m.label}</span>
              <span className="im-reward"><RewardChip r={m.reward} /></span>
              <button className={"tier-btn " + (m.done && !isClaimed?'ready':'')} disabled={!m.done||isClaimed}
                onClick={()=>claim(i, m.reward)}>
                {isClaimed?'✓':m.done?'受取':'🔒'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   SHOP — 課金ショップ（モック）
   ============================================================ */
const SHOP_PACKS = [
  { id:'s', title:'見習いパック', price:'¥120', coins:100000, rolls:20, tag:'' },
  { id:'m', title:'忍者パック',   price:'¥610', coins:600000, rolls:120, tag:'人気' },
  { id:'l', title:'大名パック',   price:'¥3,060', coins:3500000, rolls:700, tag:'お得' },
  { id:'vip', title:'VIP（月額）', price:'¥980', coins:0, rolls:0, tag:'広告除去+日替ボーナス' },
];
function ShopScreen({ onBack, onBuyPack, coins, shopOffers, shopBought, ownedPieces, onBuyPiece, kobanItems, onBuyKoban, charLevels={}, onBuyGacha }) {
  return (
    <div className="screen sheet-screen">
      <div className="mini-bar">
        <button className="ghost-btn" onClick={onBack}>← 戻る</button>
        <span className="ghost-label">🛒 Shinobi Mart</span>
        <span className="shop-coins"><Img src={IMG+'ui/Koban_Small.png'} className="sc-koban" fallback={<span>🪙</span>} /> {fmt(coins)}</span>
      </div>
      <div className="sheet-scroll">

        {/* 仲間ガチャ */}
        <div className="shop-sec">
          <div className="shop-sec-head"><span className="shop-sec-title">🎰 仲間ガチャ</span><span className="shop-sec-note">高いガチャほど強い仲間が出やすい</span></div>
          <div className="gacha-list">
            {GACHA_TIERS.map(tier => {
              const poor = coins < tier.price;
              return (
                <div key={tier.key} className={"shop-pack gacha-card gacha-" + tier.key}>
                  <div className="gacha-card-title">{tier.name}</div>
                  <button className={"po-buy gacha-buy " + (poor?'poor':'buy')} disabled={poor} onClick={()=>onBuyGacha(tier)}>
                    <Img src={IMG+'ui/Koban_Small.png'} className="po-koban" fallback={<span>🪙</span>} />{fmt(tier.price)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 日替りピース商店 */}
        <div className="shop-sec">
          <div className="shop-sec-head"><span className="shop-sec-title">🧩 日替りピース</span><span className="shop-sec-note">毎日入れ替わり・各1回</span></div>
          <div className="piece-grid">
            {shopOffers.map(id => {
              const ch = CHAR_BY_ID[id]; if (!ch) return null;
              const rk = CHAR_RANKS[ch.rank]; const price = CHAR_SHOP_PRICE[ch.rank];
              const bought   = shopBought.includes(id);
              const pieces   = ownedPieces[id] || 0;
              const unlocked = pieces >= CHAR_PIECE_GOAL;             // 解放済み（旧 done）。解放後もピースは強化素材として購入可
              const lv       = charLevels[id] || 1;
              const maxed    = unlocked && lv >= CHAR_MAX_LEVEL;      // Lv最大＝ピースが完全に無駄になるため購入不可
              const poor     = coins < price.coins;
              const disabled = bought || maxed;
              return (
                <div key={id} className={"piece-offer " + (bought?'bought ':'') + (maxed?'maxed':'')} style={{ '--rk': rk.color }}>
                  <div className="po-face">
                    <Img src={charThumb(id)} className="po-img" fallback={<span style={{fontSize:34}}>🧙</span>} />
                    <span className="char-rank-tag" style={{ background:rk.color }}>{rk.short}</span>
                  </div>
                  {unlocked && <span className="po-owned-badge">✅ 解放済 Lv{lv}</span>}
                  <div className="po-name">{ch.name}</div>
                  <div className="po-amt">{unlocked ? `強化かけら +${price.pieces}` : `かけら +${price.pieces}`}</div>
                  <button className={"po-buy " + (disabled?'disabled':(poor?'poor':'buy'))} disabled={disabled}
                    onClick={()=>onBuyPiece(id)}>
                    {bought ? '購入済み' : maxed ? 'Lv最大' : <><Img src={IMG+'ui/Koban_Small.png'} className="po-koban" fallback={<span>🪙</span>} />{fmt(price.coins)}</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* こばんショップ（消耗品・日替り各1回） */}
        <div className="shop-sec">
          <div className="shop-sec-head"><span className="shop-sec-title">🪙 こばんショップ</span><span className="shop-sec-note">各1回／日</span></div>
          <div className="koban-grid">
            {kobanItems.map(it => {
              const poor = coins < it.coins;
              const bought = shopBought.includes(it.id);
              return (
                <div key={it.id} className={"koban-item " + (bought?'bought':'')}>
                  <div className="ki-label">{it.sub} {it.label}</div>
                  <button className={"po-buy " + (bought?'disabled':(poor?'poor':'buy'))} disabled={bought} onClick={()=>onBuyKoban(it)}>
                    {bought ? '購入済み' : <><Img src={IMG+'ui/Koban_Small.png'} className="po-koban" fallback={<span>🪙</span>} />{fmt(it.coins)}</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 課金パック（¥） */}
        <div className="shop-sec">
          <div className="shop-sec-head"><span className="shop-sec-title">💎 パック</span></div>
          <div className="shop-grid">
            {SHOP_PACKS.map(p => (
              <div key={p.id} className="shop-pack">
                {p.tag && <span className="pack-tag">{p.tag}</span>}
                <div className="pack-title">{p.title}</div>
                <div className="pack-contents">
                  {p.coins>0 && <div>🪙 {fmt(p.coins)}</div>}
                  {p.rolls>0 && <div>🎲 {p.rolls}</div>}
                  {p.id==='vip' && <div>👑 特典</div>}
                </div>
                <button className="big-btn small gold-btn" onClick={()=>onBuyPack(p)}>{p.price}</button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ============================================================
   MENU — ナビゲーション
   ============================================================ */
const MENU_ITEMS = [
  { screen:'castle',     icon:'🏯', img:'ui/Icon_Village.png', label:'村建設' },
  { screen:'characters', icon:'🥷', img:'char/Char_maneki_1.png', label:'仲間' },
  { screen:'collection', icon:'📖', img:'ui/Icon_Card.png',    label:'コレクション' },
  { screen:'clan',       icon:'🗡️', img:'ui/Icon_Clan.png',    label:'一族レイド' },
  { screen:'season',     icon:'🎫', img:'ui/Icon_Event.png',   label:'シーズン' },
  { screen:'invite',     icon:'👥', img:'ui/Icon_Invite.png',  label:'招待' },
  { screen:'shop',       icon:'🛒', img:'ui/Icon_Shop.png',    label:'ショップ' },
];
function MenuOverlay({ onPick, onClose }) {
  return (
    <div className="menu-overlay" onClick={onClose}>
      <div className="menu-sheet" onClick={e=>e.stopPropagation()}>
        <div className="menu-title">メニュー</div>
        <div className="menu-grid">
          {MENU_ITEMS.map(m => (
            <button key={m.screen} className="menu-item" onClick={()=>onPick(m.screen)}>
              <Img src={IMG+m.img} className="mi-icon-img" fallback={<span className="mi-icon">{m.icon}</span>} /><span className="mi-label">{m.label}</span>
            </button>
          ))}
        </div>
        <button className="big-btn small green-btn" onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

/* ============================================================
   MULTIPLIER OVERLAY — ゾロ目（Jackpot等）のコイン×倍率演出
   ============================================================ */
// ジャックポット6報酬のアイコン（label→画像）。無い場合はemojiにフォールバック。
const JACKPOT_ICON = {
  '小判雨':   { img: IMG+'ui/Koban_Small.png',      emoji:'🪙' },
  'お宝箱':   { img: IMG+'ui/TreasureBox_Open.png', emoji:'🎁' },
  '大当たり': { img: IMG+'ui/Koban_Large.png',      emoji:'💰' },
  'レア確定': { img: IMG+'ui/Icon_Card.png',        emoji:'🃏' },
  '忍者召喚': { img: IMG+'char/Chara_NinjaFox.png',   emoji:'🦊' },
  '超JP':     { img: IMG+'ui/Icon_Crown.png',       emoji:'👑' },
};

function JackpotTile({ item, win }) {
  const ic = JACKPOT_ICON[item.label] || {};
  return (
    <div className={"jp-tile" + (win ? " win" : "")}>
      <Img src={ic.img} className="jpt-ico" fallback={<span className="jpt-ico jpt-emoji">{ic.emoji || '⭐'}</span>} />
      <div className="jpt-text">
        <div className="jpt-name">{item.label}</div>
        <div className="jpt-mult">{item.sub}{item.treasure ? ' 🎁' : ''}</div>
      </div>
    </div>
  );
}

function MultiplierOverlay({ base, result, summon=null, boxReward=null, pool, betMult=1, onDone }) {
  // ジャックポットは6種の報酬から抽選。当選(result)は確定済み。
  // どの報酬が並ぶか見えるよう「縦スロットリール」で高速回転→減速→当選タイルを中央の当たりラインに停止。
  const items = (pool && pool.length) ? pool : [result];
  const TILE = 88;
  const SPINS = 6;
  const landIdx = Math.max(0, items.indexOf(result));
  const mult = result.coinMultiplier;
  const total = (base * mult + (result.treasure ? 50000 : 0)) * betMult;

  // リールの牌列：0..winIdx が回転区間、末尾に上下ぶんを足す。3枚窓の中央(上から2枚目)に当選を置く。
  const winIdx = SPINS * items.length + landIdx;
  const displayItems = [];
  for (let k = 0; k < winIdx + 3; k++) displayItems.push(items[k % items.length]);
  const finalY = -(winIdx - 1) * TILE; // 中央=上から2枚目なので winIdx-1 ぶん上へ

  const [phase, setPhase] = useState('spin'); // spin → land → total
  const [offset, setOffset] = useState(0);
  const [spinning, setSpinning] = useState(false); // transition を適用するか
  const disp = useCountUp(total, 1600, phase==='total');
  const doneRef = useRef(false);
  const timersRef = useRef([]);
  const finish = () => { if (doneRef.current) return; doneRef.current = true; onDone(total); };

  useEffect(() => {
    const T = timersRef.current;
    // 1) transformを効かせるため一拍おいてから finalY へ（fast→減速→着地）
    T.push(setTimeout(() => { setSpinning(true); setOffset(finalY); }, 30));
    // 回転中の控えめなチッ音
    const tick = setInterval(() => SFX.tap(), 110);
    T.push(setTimeout(() => clearInterval(tick), 2600));
    // 2) 回転完了 → 着地
    T.push(setTimeout(() => { setPhase('land'); SFX.jackpot(); }, 2780));
    // 3) 着地の強調のあと payout を表示
    T.push(setTimeout(() => setPhase('total'), 3680));
    // 4) 自動で受け取り（tapでも可）
    T.push(setTimeout(finish, 3680 + 4500));
    return () => { clearInterval(tick); T.forEach(clearTimeout); };
  }, []);

  return (
    <div className="mult-overlay jackpot" onClick={() => { if (phase==='total') finish(); }}
         style={{ backgroundImage:`url("${IMG}bg/BG_Jackpot.png")` }}>
      {phase !== 'spin' && <div className="mult-flash" />}
      <div className="mult-inner">
        <div className="mult-label">🎉 ジャックポット！{phase==='spin' && <span className="mult-sub2">…どの報酬？</span>}</div>

        <div className={"jp-slot " + phase}>
          <div className="jp-slot-line" />
          <div className="jp-reel"
               style={{ transform:`translateY(${offset}px)`,
                        transition: spinning ? 'transform 2.7s cubic-bezier(.12,.75,.2,1)' : 'none' }}>
            {displayItems.map((it, k) => (
              <JackpotTile key={k} item={it} win={phase!=='spin' && k===winIdx} />
            ))}
          </div>
        </div>

        {phase==='total' && <>
          <div className="mult-base"><Img src={IMG+'ui/Koban_Small.png'} className="mb-ico" fallback={<span>🪙</span>} /> {fmt(base)}</div>
          <div className="mult-x">× {mult}{betMult>1?` × ${betMult}`:''}{result.treasure?' ＋🎁':''}</div>
          <div className="mult-total gold-text">= +{fmt(disp)} 🪙</div>
          {summon && <div className={"jp-summon " + summon.char.rank}>
            <Img src={charThumb(summon.char.id)} className="jp-summon-ico" fallback={<span style={{fontSize:30}}>🥷</span>} />
            <span className="jp-summon-txt">仲間召喚！ <b>{summon.char.name}</b><br/>かけら +{summon.amount}</span>
          </div>}
          {boxReward && <div className="jp-boxreward">
            <div className="jp-box-head"><Img src={IMG+'ui/TreasureBox_Open.png'} className="jp-box-ico" fallback={<span>🎁</span>} />宝箱の中身</div>
            <div className={"jp-box-tile " + boxReward.type}>
              {boxReward.type==='card'
                ? <><Img src={boxReward.card.img} className="jp-box-img" fallback={<span style={{fontSize:28}}>🎴</span>} />
                    <span className="jp-box-cap">{boxReward.card.gold?'★':''}カード</span></>
                : <><Img src={charThumb(boxReward.char.id)} className="jp-box-img" fallback={<span style={{fontSize:28}}>🥷</span>} />
                    <span className="jp-box-cap">{boxReward.char.name}<br/>かけら +{boxReward.amount}</span></>}
            </div>
          </div>}
          <div className="mult-tap">タップで受け取る</div>
        </>}
      </div>
    </div>
  );
}

/* ============================================================
   SHIELD OVERLAY — シールドぞろ目の獲得演出（青・盾スラム＋ピル充填）
   ============================================================ */
function ShieldOverlay({ onDone }) {
  const [phase, setPhase] = useState('in'); // in → fill
  useEffect(() => {
    SFX.shield();
    const t1 = setTimeout(() => setPhase('fill'), 520);
    const t2 = setTimeout(() => onDone(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className="shield-overlay">
      <div className="shield-flash" />
      <div className="shield-rays" />
      <Img src={IMG+'effect/Effect_Shield.png'} className="shield-fx" fallback={<div/>} />
      <div className="shield-inner">
        <Img src={IMG+'ui/Icon_Shield.png'} className="shield-big" fallback={<span style={{fontSize:120}}>🛡️</span>} />
        <div className="shield-title">シールド ぞろ目！</div>
        <div className="shield-pips">
          {[0,1,2].map(i => <i key={i} className={phase==='fill'?'on':''} style={{ transitionDelay:(i*170)+'ms' }} />)}
        </div>
        <div className="shield-sub">🛡️ 次の攻撃を防ぐ</div>
      </div>
    </div>
  );
}

/* ============================================================
   GACHA OVERLAY — 仲間ガチャ（商店）の抽選演出
   ============================================================ */
function GachaOverlay({ tier, char, amount, rank, onDone }) {
  const [phase, setPhase] = useState('shake'); // shake → flash（→flash2 legendのみ）→ reveal
  const meta = CHAR_RANKS[rank];
  const legend = rank === 'legend';
  const timersRef = useRef([]);
  const skip = () => { timersRef.current.forEach(clearTimeout); SFX.stage(); setPhase('reveal'); };
  useEffect(() => {
    SFX.tap();
    const T = timersRef.current;
    T.push(setTimeout(() => { setPhase('flash'); SFX.jackpot(); }, 1200));
    if (legend) T.push(setTimeout(() => { setPhase('flash2'); SFX.jackpot(); }, 1650));
    T.push(setTimeout(() => { setPhase('reveal'); SFX.stage(); }, legend ? 2150 : 1650));
    return () => T.forEach(clearTimeout);
  }, []);
  const revealed = phase === 'reveal';
  return (
    <div className="gacha-overlay" onClick={revealed ? onDone : skip}>
      {phase === 'shake' &&
        <Img src={IMG+'ui/TreasureBox_Closed.png'} className="gacha-box-shake" fallback={<span className="gacha-emoji gacha-box-shake">🎁</span>} />}
      {(phase === 'flash' || phase === 'flash2') &&
        <div className={"gacha-flash" + (phase === 'flash2' ? ' gacha-flash2' : '')} style={{ '--rk': meta.color }} />}
      {revealed &&
        <div className="gacha-result" style={{ '--rk': meta.color }}>
          <div className={"gacha-glow" + (legend ? ' legend' : '')} />
          <div className="gacha-char-face">
            <Img src={charThumb(char.id)} className="gacha-char-img" fallback={<span style={{fontSize:52}}>🧙</span>} />
          </div>
          <div className="gacha-char-name">{char.name}</div>
          <div className="gacha-rank-tag">{meta.label}</div>
          <div className="gacha-amt">🧩 かけら +{amount}</div>
          <div className="gacha-tap-hint">タップして閉じる</div>
        </div>}
    </div>
  );
}

/* ============================================================
   APP — shared state + router
   ============================================================ */
function App() {
  const [coins, setCoins] = useState(241000);
  const [shields, setShields] = useState(2);
  const [stage, setStage] = useState(() => {
    const q = parseInt(new URLSearchParams(window.location.search).get('stg'), 10);
    if (q) return q;
    return lsGet('ndm_stage', 1);
  });
  useEffect(() => { lsSet('ndm_stage', stage); }, [stage]);
  // 村の建築状況はApp側で保持（建築画面を離れて戻ってもリセットしない）＆ localStorageに建物レベルのみ永続化
  const [castleVillage, setCastleVillage] = useState(() => {
    const qs = new URLSearchParams(window.location.search);
    const qStage = parseInt(qs.get('stg'), 10);
    const useQuery = !!qStage || qs.has('castleclear');
    const st = qStage || lsGet('ndm_stage', 1);
    const base = themedVillage(st, { max: qs.has('castleclear') });
    if (useQuery) return base;   // URLパラメータ指定時は保存データを無視
    const saved = lsGet('ndm_village', null);   // { stage, levels: {id: level} }
    if (saved && saved.stage === st && saved.levels) {
      return base.map(it => ({ ...it, level: Math.min(saved.levels[it.id] ?? it.level, it.stages.length - 1) }));
    }
    return base;
  });
  useEffect(() => {
    lsSet('ndm_village', { stage, levels: Object.fromEntries(castleVillage.map(it => [it.id, it.level])) });
  }, [castleVillage, stage]);
  const [rolls, setRolls] = useState(50);
  const [rollsMax] = useState(50);
  const [opponent, setOpponent] = useState(() => {
    const o = makeOpponent(OPP_BY_KEY[new URLSearchParams(window.location.search).get('opp')] || OPP_BY_KEY.tanaka);
    const qsp = new URLSearchParams(window.location.search);
    if (qsp.has('oppshield')) o.shields = parseInt(qsp.get('oppshield'),10);
    return o;
  });

  // ?screen=bonus|attackSelect|attackResult|steal|castle — jump straight to a screen (dev/preview)
  const qp = new URLSearchParams(window.location.search);
  const initScreen = qp.get('screen') || 'main';
  const initFlow = {
    bonus:        { trigger: qp.get('trigger') || 'attack' },
    attackSelect: { bonusResult: BONUS_DICE_TABLES.attack[5] },
    attackResult: { attackResult: { success:true, coinGain:75000, partLabel:'武家屋敷' } },
    steal:        { stealMultiplier:2 },
  }[initScreen] || {};

  const [screen, setScreen] = useState(initScreen);
  const [flow, setFlow] = useState(initFlow);
  const [zorumeFace, setZorumeFace] = useState(null);
  const [multFx, setMultFx] = useState(null);   // {base, mult} ジャックポット等の倍率演出
  const [shieldFx, setShieldFx] = useState(false); // シールドぞろ目の獲得演出
  const [gachaFx, setGachaFx] = useState(null);    // {tier, char, amount, rank} 仲間ガチャ演出中
  const [toast, setToast] = useState('');
  const [night, setNight] = useState(qp.has('night'));
  // collection / season / cards
  const [ownedCards, setOwnedCards] = useState({});   // {cardId: count}
  const ownedRef = useRef({});                        // 所持カードの同期ミラー（カードドロップの即時判定用）
  useEffect(()=>{ ownedRef.current = ownedCards; }, [ownedCards]);
  const [claimedSets, setClaimedSets] = useState([]);
  const [seasonXP, setSeasonXP] = useState(0);
  const [claimedTiers, setClaimedTiers] = useState([]);
  const [cardPopup, setCardPopup] = useState(null);   // {card, isNew}
  const [tickets, setTickets] = useState(1);          // レイドチケット（ゾロ目小判で入手・レイドで消費）
  // キャラ（仲間）：ピース所持数・装備中キャラ。localStorage 永続。
  const [ownedCharPieces, setOwnedCharPieces] = useState(() => lsGet('ndm_char_pieces', {}));
  const ownedPiecesRef = useRef(ownedCharPieces);
  useEffect(()=>{ ownedPiecesRef.current = ownedCharPieces; lsSet('ndm_char_pieces', ownedCharPieces); }, [ownedCharPieces]);
  const [equippedChar, setEquippedChar] = useState(() => lsGet('ndm_char_equipped', null));
  useEffect(()=>{ lsSet('ndm_char_equipped', equippedChar); }, [equippedChar]);
  // キャラのレベル（ピース購入で最大Lv5まで強化。討伐戦の攻撃力・装備効果に反映）。localStorage 永続。
  const [charLevels, setCharLevels] = useState(() => lsGet('ndm_char_levels', {}));
  useEffect(()=>{ lsSet('ndm_char_levels', charLevels); }, [charLevels]);
  // 討伐戦専用の編成（最大4体）。localStorage 永続。
  const [raidParty, setRaidParty] = useState(() => lsGet('ndm_raid_party', []));
  useEffect(()=>{ lsSet('ndm_raid_party', raidParty); }, [raidParty]);
  const eff = activeEffect(equippedChar, charLevels[equippedChar] || 1);   // 装備キャラの有効 effect（レベル反映）
  const effRef = useRef(eff); effRef.current = eff;   // フロー/タイマー内での参照用
  const [charPopup, setCharPopup] = useState(null);   // {char, pending} 新キャラ入手演出（pending=ステージ未到達で解放待ち）
  // Shinobi Mart のピース日替り（4種・各1回）。日付が変われば再抽選。
  const [charShop, setCharShop] = useState(() => {
    const today = todayStr();
    const saved = lsGet('ndm_charshop', null);
    if (saved && saved.date === today && Array.isArray(saved.offers)) return saved;
    const stg = parseInt(new URLSearchParams(window.location.search).get('stg'),10) || 1;
    return { date: today, offers: buildDailyOffers(stg, today), bought: [] };
  });
  useEffect(()=>{ lsSet('ndm_charshop', charShop); }, [charShop]);
  // レイド進行はApp側で保持（画面を離れて戻ってもボスHPがリセットされない）。10体ローテーション・localStorage 永続。
  const RAID_DEFAULT = { boss:1, hp:100, awaitingUnlock:false, allDone:false,
    claimedBosses:[], milestonesHit:[], log:'一族で強敵を討伐せよ！' };
  const [raid, setRaid] = useState(() => {
    const s = lsGet('ndm_raid', null);
    return (s && Number.isInteger(s.boss)) ? { ...RAID_DEFAULT, ...s } : RAID_DEFAULT;
  });
  useEffect(()=>{ lsSet('ndm_raid', raid); }, [raid]);
  const [bet, setBet] = useState(1);                  // ロールポイント倍率（1〜3）：消費ロール＆報酬に同倍率
  const betRef = useRef(1); betRef.current = bet;      // フロー中の報酬計算で参照（stale closure回避）
  const [auto, setAuto] = useState(qp.has('auto'));   // オートロール（App 側で保持：画面遷移で MainRoll が再マウントされても維持）
  // ダイスのロール演出スタイル：'3d'（立体・既定）/ 'toss'（下から飛ばす）/ 'classic'（回転）。いつでも切替可（localStorage保持）
  const [rollAnim, setRollAnim] = useState(() => {
    try { return localStorage.getItem('ndm_rollanim') || qp.get('rollanim') || '3d'; } catch(e) { return qp.get('rollanim') || '3d'; }
  });
  const toggleRollAnim = useCallback(() => setRollAnim(a => {
    const order = ['3d','toss','classic'];
    const nx = order[(order.indexOf(a) + 1) % order.length];
    try { localStorage.setItem('ndm_rollanim', nx); } catch(e){}
    return nx;
  }), []);

  const coinsRef = useRef(coins);
  useEffect(()=>{ coinsRef.current = coins; }, [coins]);
  const stageRef = useRef(stage);
  useEffect(()=>{ stageRef.current = stage; }, [stage]);

  // 討伐戦：報酬受取後、次ボスの解放待ち（awaitingUnlock）だった場合は村ステージが追いついた瞬間に出現させる。
  // ClanRaidScreen が非マウントでも進行させる必要があるため App 側に置く。
  useEffect(() => {
    setRaid(r => {
      if (r.awaitingUnlock && !r.allDone && stage >= r.boss + 1) {
        return { ...r, boss: r.boss + 1, hp:100, awaitingUnlock:false, milestonesHit:[],
                 log:`ボス${r.boss+1}が出現した！` };
      }
      return r;
    });
  }, [stage]);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(()=>setToast(''), 1700); }, []);
  const go = useCallback((s, data={}) => { setFlow(data); setScreen(s); }, []);

  // animated coin add
  const addCoins = useCallback((delta) => {
    const from = coinsRef.current, to = from + delta, dur = 700;
    let start = null;
    const step = (now) => {
      if (start===null) start = now;
      const t = Math.max(0, Math.min(1, (now-start)/dur));
      const eased = 1 - Math.pow(1-t,3);
      setCoins(Math.round(from + (to-from)*eased));
      if (t<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);
  const spendCoins = useCallback((n) => setCoins(c => Math.max(0, c-n)), []);
  const grantShields = useCallback((n) => setShields(s => Math.min(3, s+n)), []);
  const grantRolls = useCallback((n) => setRolls(r => r+n), []);
  const grantTickets = useCallback((n) => setTickets(t => t+n), []);
  const spendTicket = useCallback(() => setTickets(t => Math.max(0, t-1)), []);
  const useRolls = useCallback((n) => { setRolls(r => Math.max(0, r-n)); setSeasonXP(x => x+n); }, []);
  const nextStage = useCallback(() => {
    setStage(s => Math.min(MAX_STAGE, s+1));
    const sh = effRef.current.startShields || 0;   // 石亀など：ステージ開始時シールド+
    if (sh) grantShields(sh);
  }, [grantShields]);

  // ---- collection / season / shop handlers ----
  // カード獲得はキュー方式：複数枚（例：スティール宝箱×N）を順番にポップアップ表示する
  const cardQueueRef = useRef([]);
  const cardShowingRef = useRef(false);
  const pumpCards = useCallback(() => {
    if (cardShowingRef.current) return;
    const next = cardQueueRef.current.shift();
    if (!next) { setCardPopup(null); return; }
    cardShowingRef.current = true;
    setCardPopup(next); SFX.card();
    setTimeout(() => { cardShowingRef.current = false; setCardPopup(null); setTimeout(pumpCards, 200); }, 1900);
  }, []);
  // n枚ドロップ。goldChanceで宝箱などのGOLD確率を上げられる。
  // ownedRef で現在の所持数を同期参照し、drops を同期的に確定させてからキューに積む
  // （setOwnedCards の updater 内で drops を組むと setTimeout 経由のバッチで遅延し、pump 時に空になるため）。
  const enqueueCards = useCallback((n = 1, goldChance = 0.12) => {
    const owned = { ...ownedRef.current };
    const drops = Array.from({ length: n }, () => {
      const card = dropRandomCard(goldChance);
      const isNew = !(owned[card.id] > 0);
      owned[card.id] = (owned[card.id] || 0) + 1;
      return { card, isNew };
    });
    ownedRef.current = owned;
    setOwnedCards(owned);
    cardQueueRef.current.push(...drops);
    pumpCards();
  }, [pumpCards]);
  const onCardDrop = useCallback(() => enqueueCards(1), [enqueueCards]);
  // ロールのカードドロップ用：ポップアップを出さずに1枚付与し、引いたカードを返す（演出はMainRoll側で飛ばす）。
  const dropCardSilent = useCallback((goldChance = 0.12) => {
    const card = dropRandomCard(goldChance);
    const owned = { ...ownedRef.current };
    owned[card.id] = (owned[card.id] || 0) + 1;
    ownedRef.current = owned; setOwnedCards(owned);
    SFX.card();
    return card;
  }, []);

  // キャラのピース付与。source='box'|'jackpot'。解放済みからランダム、pieceBonusで増量。
  // 100枚到達で入手演出（charPopup）。boxes回など複数口はまとめて回す。
  const grantCharPieces = useCallback((source, draws = 1) => {
    const owned = { ...ownedPiecesRef.current };
    let last = null, gained = 0, completed = null;
    for (let i = 0; i < draws; i++) {
      const ch = pickCharForPieces(stageRef.current, owned);
      if (!ch) break;
      let amt = piecesFor(ch.rank, source);
      amt = Math.round(amt * (1 + (effRef.current.pieceBonus || 0)));
      const cur = owned[ch.id] || 0;
      const nx = cur + amt;   // 100到達後も貯まる（レベルアップ素材として使うため上限なし）
      owned[ch.id] = nx;
      last = ch; gained = amt;
      if (cur < CHAR_PIECE_GOAL && nx >= CHAR_PIECE_GOAL) completed = ch;
    }
    if (!last) return;
    ownedPiecesRef.current = owned;
    setOwnedCharPieces(owned);
    if (completed) {
      // grantCharPieces の抽選プールは常に unlockStage<=stage 済みなので pending は基本発生しないが、念のため判定を揃える。
      const pending = completed.unlockStage > stageRef.current;
      setCharPopup({ char: completed, pending }); SFX.stage(); setTimeout(()=>setCharPopup(null), 2600);
    } else { showToast(`🧩 ${last.name}のピース +${gained}`); SFX.coin(); }
  }, [showToast]);

  const equipChar = useCallback((id) => {
    setEquippedChar(prev => {
      if (prev === id) return null;   // 同じキャラを再タップで解除（常に許可）
      const c = CHAR_BY_ID[id];
      const complete = (ownedPiecesRef.current[id]||0) >= CHAR_PIECE_GOAL;
      const stageOk  = c && c.unlockStage <= stageRef.current;
      if (!c || !complete || !stageOk) return prev;   // 装備不可（未コンプ／ステージ未到達）なら無視
      return id;
    });
    SFX.tap();
  }, []);

  // ピース（100枚コンプ後の余剰）を消費してキャラをレベルアップ（最大Lv5）。討伐戦の攻撃力・装備効果に反映。
  const levelUpChar = useCallback((id) => {
    const c = CHAR_BY_ID[id]; if (!c) return;
    const pieces = ownedPiecesRef.current[id] || 0;
    const lv = charLevels[id] || 1;
    if (pieces < CHAR_PIECE_GOAL) return;
    if (lv >= CHAR_MAX_LEVEL) { showToast('最大レベルです'); return; }
    const cost = charLevelCost(c.rank, lv);
    if (pieces - CHAR_PIECE_GOAL < cost) { showToast('かけらが足りません'); return; }
    const owned = { ...ownedPiecesRef.current, [id]: pieces - cost };
    ownedPiecesRef.current = owned; setOwnedCharPieces(owned);
    setCharLevels(m => ({ ...m, [id]: lv + 1 }));
    SFX.stage(); showToast(`⬆️ ${c.name} Lv${lv+1}！`);
  }, [charLevels, showToast]);

  // 討伐編成（最大4体）の選択/解除
  const toggleRaidParty = useCallback((id) => {
    setRaidParty(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const c = CHAR_BY_ID[id];
      const owned = c && (ownedPiecesRef.current[id]||0) >= CHAR_PIECE_GOAL && c.unlockStage <= stageRef.current;
      if (!owned || prev.length >= RAID_PARTY_MAX) return prev;
      return [...prev, id];
    });
    SFX.tap();
  }, []);

  // 指定キャラに固定枚数のピースを加算（ショップ購入・スティール・ジャックポット召喚用）。100到達で入手演出。
  // ジャックポット召喚（rollCompanionSummon）はステージ未到達キャラも対象になり得るため pending 判定が必要。
  const addPiecesTo = useCallback((charId, amt) => {
    const owned = { ...ownedPiecesRef.current };
    const cur = owned[charId] || 0;
    const nx = cur + amt;   // 100到達後も貯まる（レベルアップ素材として使うため上限なし）
    owned[charId] = nx; ownedPiecesRef.current = owned; setOwnedCharPieces(owned);
    if (cur < CHAR_PIECE_GOAL && nx >= CHAR_PIECE_GOAL) {
      const c = CHAR_BY_ID[charId];
      const pending = c.unlockStage > stageRef.current;
      setCharPopup({ char: c, pending }); SFX.stage(); setTimeout(()=>setCharPopup(null), 2600);
    }
  }, []);
  // スティール宝箱の中身を付与（カードは所持数へ加算・仲間はかけら加算）。演出はスティール画面側で完結済みなのでポップアップは出さない（仲間コンプ時のみ祝う）。
  const grantStealRewards = useCallback((rewards) => {
    if (!rewards || !rewards.length) return;
    const owned = { ...ownedRef.current };
    let addedCard = false;
    rewards.forEach(r => { if (r.type==='card' && r.card) { owned[r.card.id] = (owned[r.card.id]||0)+1; addedCard = true; } });
    if (addedCard) { ownedRef.current = owned; setOwnedCards(owned); }
    rewards.forEach(r => { if (r.type==='char' && r.char) addPiecesTo(r.char.id, r.amount); });   // addPiecesTo はコンプ時のみポップアップ
  }, [addPiecesTo]);
  // Shinobi Mart: ピース購入（こばん・その日1回）
  const buyCharPieces = useCallback((charId) => {
    if (charShop.bought.includes(charId)) return;
    const ch = CHAR_BY_ID[charId]; const price = CHAR_SHOP_PRICE[ch.rank];
    if (coinsRef.current < price.coins) { showToast('コインが足りません'); return; }
    spendCoins(price.coins); SFX.coin();
    addPiecesTo(charId, price.pieces);
    setCharShop(s => ({ ...s, bought: [...s.bought, charId] }));
    showToast(`🧩 ${ch.name}のかけら +${price.pieces}`);
  }, [charShop, spendCoins, showToast, addPiecesTo]);
  // Shinobi Mart: こばんで消耗品購入（何度でも）
  const buyKoban = useCallback((item) => {
    if (charShop.bought.includes(item.id)) return;   // こばん商品も日替り・各1回
    if (coinsRef.current < item.coins) { showToast('コインが足りません'); return; }
    spendCoins(item.coins); SFX.coin();
    if (item.rolls) grantRolls(item.rolls);
    if (item.shields) grantShields(item.shields);
    if (item.tickets) grantTickets(item.tickets);
    setCharShop(s => ({ ...s, bought: [...s.bought, item.id] }));
    showToast(`${item.label} を購入！`);
  }, [charShop, spendCoins, grantRolls, grantShields, grantTickets, showToast]);
  // Shinobi Mart: 仲間ガチャ（回数無制限・演出はGachaOverlayが担当）
  const buyGacha = useCallback((tier) => {
    if (coinsRef.current < tier.price) { showToast('コインが足りません'); return; }
    spendCoins(tier.price);
    setGachaFx({ tier, ...rollGacha(tier) });
    SFX.tap();
  }, [spendCoins, showToast]);

  // ---- デバッグ：ショップ ----
  const debugResetShop = useCallback(() => {   // 購入済みをクリア（当日分を再購入可能に）
    setCharShop(s => ({ ...s, bought: [] }));
    showToast('🐞 ショップの購入状態をリセット');
  }, [showToast]);
  const debugRerollShop = useCallback(() => {  // ラインナップを再抽選（ランダム4種）＋購入状態クリア
    const pool = CHARACTERS.filter(c => c.unlockStage <= stageRef.current).map(c => c.id);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    setCharShop(s => ({ ...s, offers: pool.slice(0, 4), bought: [] }));
    showToast('🐞 ショップを再ロール');
  }, [showToast]);

  const claimSet = useCallback((set) => {
    if (claimedSets.includes(set.id)) return;
    setClaimedSets(c => [...c, set.id]);
    addCoins(set.reward.coins); grantRolls(set.reward.rolls);
    showToast(`${set.name} コンプ！ 🎲${set.reward.rolls} 💰${fmt(set.reward.coins)}`);
  }, [claimedSets, addCoins, grantRolls, showToast]);
  const claimTier = useCallback((i) => {
    if (claimedTiers.includes(i)) return;
    setClaimedTiers(c => [...c, i]);
    const r = SEASON_TIERS[i];
    if (r.kind==='roll') grantRolls(r.amt||10);
    else if (r.kind==='coin') addCoins(r.amt||0);
    else if (r.kind==='shield') grantShields(r.amt||1);
    showToast('シーズン報酬を受け取りました！');
  }, [claimedTiers, grantRolls, addCoins, grantShields, showToast]);
  const buyPack = useCallback((p) => {
    if (p.coins) addCoins(p.coins);
    if (p.rolls) grantRolls(p.rolls);
    showToast(`${p.title} を付与しました`);
  }, [addCoins, grantRolls, showToast]);

  const game = { coins, shields, stage, rolls, rollsMax, opponent, useRolls, bet };

  // ---- flow handlers ----
  const onZorume = useCallback((faceId) => {
    if (faceId === 'shield') { setShieldFx(true); return; }   // 専用の獲得演出（付与は演出完了時）
    setZorumeFace(faceId); // shows overlay; onComplete routes to bonus
  }, []);

  const onZorumeComplete = useCallback(() => {
    const f = zorumeFace; setZorumeFace(null);
    if (f === 'coin') {
      go('bonus', { trigger:'coin' });                          // 小判ゾロ目のみボーナスルーレット
    } else if (f === 'attack') {
      go('attackSelect', { bonusResult: rollBonusDice('attack') });   // Attackはミニゲーム直行
    } else if (f === 'steal') {
      go('steal', {});   // Stealはミニゲーム直行
    } else if (f === 'jackpot') {
      const res = rollBonusDice('jackpot');   // Jackpotは報酬スロット演出（どの報酬かを見せる）
      const summon = res.companion ? rollCompanionSummon() : null;   // 仲間召喚：どの仲間のかけらを何枚もらえるか事前確定
      // 宝箱面（お宝箱/大当たり/レア確定）は箱の中身（カード or 仲間のかけら）も必ず付与。以前はコインに畳み込むだけで「何も出ない」ように見えていた。
      // レア確定はGOLDカード率を高める。超JPは仲間召喚が主報酬なので箱は付けない。
      const boxReward = (res.treasure && !res.companion) ? rollStealBoxReward(stage, res.rare ? 0.9 : 0.45, effRef.current.pieceBonus, ownedCharPieces) : null;
      setMultFx({ base: coinBaseForStage(stage), result: res, summon, boxReward });
    } else { go('main'); }
  }, [zorumeFace, go, stage]);

  const onBonusComplete = useCallback((result) => {
    const trigger = flow.trigger;
    const base = coinBaseForStage(stage);
    if (trigger === 'coin') {
      const gain = Math.round(base * result.multiplier * betRef.current * effRef.current.coinMult); addCoins(gain);
      // 獲得額の「式」はボーナス画面で表示済み。ここではチケット入手のみ通知。
      if (Math.random() < 0.4) { grantTickets(1); showToast('レイドチケット🎟️入手！'); }
      go('main');
    } else if (trigger === 'jackpot') {
      const jm = effRef.current.coinMult * (1 + effRef.current.jackpotBonus);   // 龍神など
      const gain = Math.round((base * result.coinMultiplier + (result.treasure ? 50000 : 0)) * betRef.current * jm); addCoins(gain);
      showToast(`${result.label}！ +${fmt(gain)} 🪙${result.treasure?' 💎':''}`); go('main');
      // ジャックポットはキャラのピースも多めに付与（宝/仲間面はさらに1口）
      const draws = 1 + ((result.treasure || result.companion) ? 1 : 0);
      setTimeout(()=>grantCharPieces('jackpot', draws), 450);
    } else if (trigger === 'attack') {
      go('attackSelect', { bonusResult: result });
    } else { go('main'); }
  }, [flow.trigger, stage, addCoins, showToast, go, grantTickets, grantCharPieces]);

  // AttackSelect が建物ごとに演出（コイン噴出/破壊 or シールド防御）を終えてから成否を渡してくる。
  const onAttackResolve = useCallback((part, success) => {
    const br = flow.bonusResult;
    const damage = br?.damage || 1;                 // 破壊する棟数（ボーナスダイス由来）
    const rate   = br?.coinRate || 0.25;            // 成功時の獲得率（ボーナスダイス由来）
    const b = betRef.current;
    const e = effRef.current;                        // 装備キャラ効果
    if (!success) {
      setOpponent(o => ({ ...o, shields: Math.max(0, o.shields - 1) }));   // シールドが1枚防ぐ
      go('attackResult', { attackResult: { success:false, coinGain: Math.floor(opponent.coins*0.07*e.attackMult)*b, partLabel: part.label, damage } });
    } else {
      go('attackResult', { attackResult: { success:true, coinGain: Math.floor(opponent.coins*rate*e.attackMult)*b, partLabel: part.label, damage, rate } });
    }
  }, [flow.bonusResult, opponent, go]);

  // 対戦が片付くたびに次の対戦相手へ入れ替える（大金持ち〜初心者からランダム）
  const rotateOpponent = useCallback(() => setOpponent(o => pickOpponent(o.key)), []);
  const onAttackNext = useCallback(() => { addCoins(flow.attackResult.coinGain); rotateOpponent(); go('main'); }, [flow.attackResult, addCoins, go, rotateOpponent]);
  const onStealReceive = useCallback((total, rewards=[]) => {
    if (total>0) { addCoins(total); showToast(`+${fmt(total)} コイン獲得！`); }
    rotateOpponent(); go('main');
    // 宝箱の中身（カード or 仲間かけら）はスティール画面でリビュー済み。ここでは付与のみ（ポップアップなし）。
    if (rewards && rewards.length) setTimeout(()=>grantStealRewards(rewards), 300);
  }, [addCoins, showToast, go, rotateOpponent, grantStealRewards]);

  return (
    <div className="app">
      {screen==='main' && <MainRoll game={game} addCoins={addCoins} grantShields={grantShields} grantRolls={grantRolls} showToast={showToast} go={go} onZorume={onZorume} onCardDrop={onCardDrop} dropCard={dropCardSilent} onShop={()=>go('shop')} tickets={tickets} bet={bet} setBet={setBet} night={night} onToggleNight={()=>setNight(n=>!n)} auto={auto} setAuto={setAuto} rollAnim={rollAnim} onToggleRollAnim={toggleRollAnim}
        paused={!!multFx || shieldFx || !!zorumeFace} equipped={equippedChar}
        freeRollChance={eff.freeRollChance} cardDropBonus={eff.cardDropBonus}
        onResetShop={debugResetShop} onRerollShop={debugRerollShop}
        onDebugTickets={()=>{ grantTickets(5); showToast('🎟️ チケット +5（デバッグ）'); }} />}
      {screen==='bonus' && <BonusRoll trigger={flow.trigger} stage={stage} bet={bet} onComplete={onBonusComplete} />}
      {screen==='attackSelect' && <AttackSelect opponent={opponent} bonusResult={flow.bonusResult} stage={stage} ignoreShield={eff.ignoreShield} onCancel={()=>go('main')} onResolve={onAttackResolve} />}
      {screen==='attackResult' && <AttackResult result={flow.attackResult} onNext={onAttackNext} opponentName={opponent.name} />}
      {screen==='steal' && <StealScreen opponentName={opponent.name} opponentCoins={opponent.coins} opponentImg={opponent.img} betMult={bet} onReceive={onStealReceive} stealMult={eff.stealMult} autoLastSpot={eff.stealLastSpot} stage={stage} pieceBonus={eff.pieceBonus} ownedPieces={ownedCharPieces} />}
      {screen==='castle' && <CastleScreen game={game} spendCoins={spendCoins} grantRolls={grantRolls} showToast={showToast} onBack={()=>go('main')} onNextStage={nextStage} village={castleVillage} setVillage={setCastleVillage} buildDiscount={eff.buildDiscount} headStart={eff.headStartLevels} />}
      {screen==='collection' && <CollectionScreen owned={ownedCards} claimed={claimedSets} onClaim={claimSet} onBack={()=>go('main')} showToast={showToast} />}
      {screen==='characters' && <CharactersScreen ownedPieces={ownedCharPieces} equipped={equippedChar} onEquip={equipChar} onBack={()=>go('main')} stage={stage} charLevels={charLevels} onLevelUp={levelUpChar} />}
      {screen==='clan' && <ClanRaidScreen onBack={()=>go('main')} addCoins={addCoins} grantRolls={grantRolls} showToast={showToast} tickets={tickets} spendTicket={spendTicket} raid={raid} setRaid={setRaid} raidParty={raidParty} charLevels={charLevels} stage={stage} onEditParty={()=>go('raidParty')} />}
      {screen==='raidParty' && <RaidPartyScreen ownedPieces={ownedCharPieces} charLevels={charLevels} party={raidParty} onToggle={toggleRaidParty} onBack={()=>go('clan')} stage={stage} />}
      {screen==='season' && <SeasonScreen xp={seasonXP} claimed={claimedTiers} onClaim={claimTier} onBack={()=>go('main')} />}
      {screen==='invite' && <InviteScreen onBack={()=>go('main')} showToast={showToast} grantRolls={grantRolls} addCoins={addCoins} />}
      {screen==='shop' && <ShopScreen onBack={()=>go('main')} onBuyPack={buyPack} coins={coins}
        shopOffers={charShop.offers} shopBought={charShop.bought} ownedPieces={ownedCharPieces}
        onBuyPiece={buyCharPieces} kobanItems={KOBAN_SHOP} onBuyKoban={buyKoban} charLevels={charLevels} onBuyGacha={buyGacha} />}

      {cardPopup &&
        <div className="card-popup" key={cardPopup.card.id + (cardPopup.isNew?'-n':'-d')}>
          <div className="cp-inner">
            <div className="cp-head">{cardPopup.isNew ? '🎴 新カード獲得！' : '🎴 カード獲得'}</div>
            <CardFace card={cardPopup.card} owned={true} />
          </div>
        </div>}

      {charPopup &&
        <div className="card-popup char-win" key={'char-'+charPopup.char.id}>
          <div className="cp-inner">
            <div className="cp-head">{charPopup.pending ? '🧩 かけらコンプ！' : '🎉 新しい仲間！'}</div>
            <div className="char-pop-face" style={{ '--rk': CHAR_RANKS[charPopup.char.rank].color }}>
              <Img src={charThumb(charPopup.char.id)} className="char-pop-img" fallback={<span style={{fontSize:70}}>🧙</span>} />
            </div>
            <div className="char-pop-name">{charPopup.char.name}</div>
            <div className="char-pop-rank" style={{ color: CHAR_RANKS[charPopup.char.rank].color }}>{CHAR_RANKS[charPopup.char.rank].label}</div>
            <div className="char-pop-desc">{charPopup.pending ? `ステージ${charPopup.char.unlockStage}で仲間になる` : charPopup.char.desc}</div>
          </div>
        </div>}

      {zorumeFace && <ZorumeOverlay faceId={zorumeFace} onComplete={onZorumeComplete} />}
      {multFx && <MultiplierOverlay base={multFx.base} result={multFx.result} summon={multFx.summon} boxReward={multFx.boxReward} pool={BONUS_DICE_TABLES.jackpot} betMult={bet}
        onDone={(total)=>{ const summon = multFx.summon; const boxReward = multFx.boxReward; setMultFx(null); const g = Math.round(total * eff.coinMult * (1 + eff.jackpotBonus)); addCoins(g); showToast(`ジャックポット！ +${fmt(g)} 🪙`);
          if (summon) setTimeout(()=>{ addPiecesTo(summon.char.id, summon.amount); showToast(`🧩 仲間召喚！ ${summon.char.name}のかけら +${summon.amount}`); }, 450);
          if (boxReward) setTimeout(()=>{ grantStealRewards([boxReward]); showToast(boxReward.type==='card' ? `🎁 宝箱：${boxReward.card.gold?'★GOLD ':''}カード獲得！` : `🎁 宝箱：${boxReward.char.name}のかけら +${boxReward.amount}`); }, 700); }} />}
      {shieldFx && <ShieldOverlay onDone={()=>{ setShieldFx(false); grantShields(3); }} />}
      {gachaFx && <GachaOverlay tier={gachaFx.tier} char={gachaFx.char} amount={gachaFx.amount} rank={gachaFx.rank}
        onDone={()=>{ addPiecesTo(gachaFx.char.id, gachaFx.amount); setGachaFx(null); }} />}
      <Toast msg={toast} />
    </div>
  );
}

/* ============================================================
   LOADING — 起動時に全画像をプリロード（スプラッシュ＋進捗バー）
   ============================================================ */
function LoadingScreen({ onDone }) {
  const [pct, setPct] = useState(0);
  const imgsRef = useRef([]);   // 参照を保持しないとGCされ onload が発火しない
  useEffect(() => {
    const list = (typeof window !== 'undefined' && Array.isArray(window.NDM_IMAGES)) ? window.NDM_IMAGES : [];
    if (!list.length) { onDone(); return; }
    let loaded = 0, done = false;
    const t0 = Date.now();
    // 100%到達後も含め、最低でも約1.1秒はスプラッシュを見せる（一瞬で消えるチラつき防止）
    const finish = () => { if (done) return; done = true; setTimeout(onDone, Math.max(300, 1100 - (Date.now() - t0))); };
    // 全アセットのロードが完了する（=100%）までローディング画面を抜けない。
    // 各画像は onload / onerror のどちらかが必ず発火するため loaded は必ず list.length に到達する。
    const bump = () => { loaded++; setPct(Math.round(loaded / list.length * 100)); if (loaded >= list.length) finish(); };
    imgsRef.current = list.map(src => { const img = new Image(); img.onload = bump; img.onerror = bump; img.src = src; return img; });
    // 応答が返らず固まった接続に備えた最終手段のみ（通常は発火しない・十分長め）。
    const safety = setTimeout(finish, 90000);
    return () => clearTimeout(safety);
  }, []);
  return (
    <div className="loading-screen" style={{ backgroundImage:`url("${IMG}bg/BG_Splash.png")` }}>
      <div className="load-dim" />
      <div className="load-title">NINJA<br/><span className="lt-2">DICE MASTER</span></div>
      <div className="load-sub">忍者ダイスマスター</div>
      <div className="load-bottom">
        <div className="load-bar"><div className="load-fill" style={{ width: pct + '%' }} /></div>
        <div className="load-pct">読み込み中… {pct}%</div>
      </div>
    </div>
  );
}
function Root() {
  const [ready, setReady] = useState(false);
  return ready ? <App /> : <LoadingScreen onDone={() => setReady(true)} />;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
