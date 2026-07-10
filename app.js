const {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo
} = React;

/* ============================================================
   CONFIG & DATA
   ============================================================ */
const IMG = "assets/images/";

/* ============================================================
   SFX — Web Audio 合成効果音（外部ファイル不要・オフライン・ミュート可）
   ============================================================ */
const SFX = (() => {
  let ctx = null,
    master = null,
    enabled = true;
  try {
    enabled = (localStorage.getItem('ndm_sound') ?? '1') === '1';
  } catch (e) {}
  const ensure = () => {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.32;
        master.connect(ctx.destination);
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  // 最初のユーザー操作で AudioContext を起動（自動再生ポリシー対策）
  if (typeof window !== 'undefined') {
    const unlock = () => ensure();
    ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, {
      passive: true
    }));
  }
  const tone = (t0, freq, dur, {
    type = 'sine',
    gain = 0.3,
    glideTo = null,
    attack = 0.005
  } = {}) => {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  };
  const noise = (t0, dur, {
    gain = 0.3,
    type = 'highpass',
    freq = 1000,
    q = 1
  } = {}) => {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  };
  const play = fn => {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    try {
      fn(c.currentTime);
    } catch (e) {}
  };
  return {
    setEnabled(v) {
      enabled = !!v;
      try {
        localStorage.setItem('ndm_sound', v ? '1' : '0');
      } catch (e) {}
      if (v) ensure();
    },
    isEnabled() {
      return enabled;
    },
    tap() {
      play(t => tone(t, 520, 0.07, {
        type: 'square',
        gain: 0.10
      }));
    },
    roll() {
      play(t => {
        for (let i = 0; i < 8; i++) noise(t + i * 0.055, 0.05, {
          gain: 0.09,
          type: 'bandpass',
          freq: 2200 + Math.random() * 1800,
          q: 2
        });
      });
    },
    land() {
      play(t => {
        tone(t, 190, 0.13, {
          type: 'triangle',
          gain: 0.32,
          glideTo: 85
        });
        noise(t, 0.06, {
          gain: 0.14,
          type: 'lowpass',
          freq: 420
        });
      });
    },
    coin() {
      play(t => {
        [880, 1180, 1560].forEach((f, i) => tone(t + i * 0.06, f, 0.14, {
          type: 'triangle',
          gain: 0.22
        }));
      });
    },
    zorume() {
      play(t => {
        [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.08, f, 0.22, {
          type: 'square',
          gain: 0.15
        }));
      });
    },
    jackpot() {
      play(t => {
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(t + i * 0.09, f, 0.3, {
          type: 'sawtooth',
          gain: 0.13
        }));
        [1568, 2093].forEach((f, i) => tone(t + 0.62 + i * 0.12, f, 0.4, {
          type: 'triangle',
          gain: 0.11
        }));
      });
    },
    shield() {
      play(t => {
        tone(t, 300, 0.5, {
          type: 'sine',
          gain: 0.2,
          glideTo: 920,
          attack: 0.02
        });
        noise(t, 0.4, {
          gain: 0.05,
          type: 'highpass',
          freq: 3200
        });
      });
    },
    attack() {
      play(t => {
        noise(t, 0.18, {
          gain: 0.4,
          type: 'lowpass',
          freq: 800
        });
        tone(t, 150, 0.22, {
          type: 'sawtooth',
          gain: 0.24,
          glideTo: 60
        });
        noise(t + 0.02, 0.12, {
          gain: 0.18,
          type: 'highpass',
          freq: 4200
        });
      });
    },
    steal() {
      play(t => {
        noise(t, 0.28, {
          gain: 0.11,
          type: 'bandpass',
          freq: 1200,
          q: 0.7
        });
        tone(t + 0.14, 1400, 0.1, {
          type: 'triangle',
          gain: 0.15,
          glideTo: 2000
        });
      });
    },
    build() {
      play(t => {
        tone(t, 120, 0.14, {
          type: 'square',
          gain: 0.24,
          glideTo: 80
        });
        tone(t + 0.12, 880, 0.2, {
          type: 'triangle',
          gain: 0.18,
          glideTo: 1200
        });
      });
    },
    card() {
      play(t => {
        noise(t, 0.08, {
          gain: 0.14,
          type: 'bandpass',
          freq: 3000,
          q: 1
        });
        [1047, 1319, 1568].forEach((f, i) => tone(t + 0.06 + i * 0.05, f, 0.14, {
          type: 'triangle',
          gain: 0.16
        }));
      });
    },
    stage() {
      play(t => {
        [392, 523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.1, f, 0.32, {
          type: 'square',
          gain: 0.15
        }));
      });
    }
  };
})();
const DICE_FACES = {
  COIN: {
    id: 'coin',
    weight: 2,
    image: IMG + 'DiceFace_Coin.png',
    label: 'コイン',
    emoji: '🪙'
  },
  ATTACK: {
    id: 'attack',
    weight: 1,
    image: IMG + 'DiceFace_Attack.png',
    label: 'アタック',
    emoji: '⚔️'
  },
  STEAL: {
    id: 'steal',
    weight: 1,
    image: IMG + 'DiceFace_Steal.png',
    label: 'スティール',
    emoji: '🥷'
  },
  SHIELD: {
    id: 'shield',
    weight: 1,
    image: IMG + 'DiceFace_Shield.png',
    label: 'シールド',
    emoji: '🛡️'
  },
  JACKPOT: {
    id: 'jackpot',
    weight: 1,
    image: IMG + 'DiceFace_Jackpot.png',
    label: 'ジャックポット',
    emoji: '⭐'
  }
};
const FACE_LIST = Object.values(DICE_FACES);
const WEIGHTED = FACE_LIST.flatMap(f => Array(f.weight).fill(f));
const rollFace = () => WEIGHTED[Math.floor(Math.random() * WEIGHTED.length)];

/* ---- 役ベースの抽選 ----
   各ダイスを独立に振るのではなく、まず「役」を出現確率で決め、
   その役に合う3つの出目を作ってからダイスを回す。
   確率（100ロールあたりの期待回数）: */
const HAND_ODDS = [{
  id: 'attack',
  p: 0.05
},
// アタックぞろ目  ≈5回
{
  id: 'steal',
  p: 0.05
},
// スティールぞろ目 ≈5回
{
  id: 'shield',
  p: 0.05
},
// シールドぞろ目  ≈5回
{
  id: 'jackpot',
  p: 0.04
},
// ジャックポットぞろ目 ≈4回
{
  id: 'coin',
  p: 0.05
},
// コインぞろ目    ≈5回
{
  id: 'combo',
  p: 0.05
} // ジャックポット×2 ≈5回
]; // 残り ≈71% は通常役
const shuffle3 = a => {
  const b = [...a];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const NON_JACKPOT = FACE_LIST.filter(f => f.id !== 'jackpot');
function normalRoll() {
  // 通常役：ぞろ目でもJP×2でもない3つ
  let r;
  do {
    r = [rollFace(), rollFace(), rollFace()];
  } while (r[0].id === r[1].id && r[1].id === r[2].id || r.filter(x => x.id === 'jackpot').length >= 2);
  return r;
}
function decideHand() {
  const roll = Math.random();
  let acc = 0;
  for (const h of HAND_ODDS) {
    acc += h.p;
    if (roll < acc) {
      if (h.id === 'combo') {
        const other = NON_JACKPOT[Math.floor(Math.random() * NON_JACKPOT.length)];
        return shuffle3([DICE_FACES.JACKPOT, DICE_FACES.JACKPOT, other]);
      }
      const f = DICE_FACES[h.id.toUpperCase()];
      return [f, f, f]; // ぞろ目
    }
  }
  return normalRoll();
}

// DEBUG — force any hand on the next roll (faces:null = random)
const D = DICE_FACES;
const DEBUG_HANDS = [{
  key: 'coinz',
  label: '🪙 コインぞろ目',
  faces: [D.COIN, D.COIN, D.COIN]
}, {
  key: 'attackz',
  label: '⚔️ アタックぞろ目',
  faces: [D.ATTACK, D.ATTACK, D.ATTACK]
}, {
  key: 'stealz',
  label: '🥷 スティールぞろ目',
  faces: [D.STEAL, D.STEAL, D.STEAL]
}, {
  key: 'shieldz',
  label: '🛡️ シールドぞろ目',
  faces: [D.SHIELD, D.SHIELD, D.SHIELD]
}, {
  key: 'jpz',
  label: '⭐ ジャックポットぞろ目',
  faces: [D.JACKPOT, D.JACKPOT, D.JACKPOT]
}, {
  key: 'jpcombo',
  label: '⭐⭐ ジャックポット×2',
  faces: [D.JACKPOT, D.JACKPOT, D.COIN]
}, {
  key: 'coinwin',
  label: '🪙 コイン獲得（通常）',
  faces: [D.COIN, D.COIN, D.ATTACK]
}, {
  key: 'random',
  label: '🎲 ランダム',
  faces: null
}];

// Shared face → color / emoji / label maps (used across screens)
const FACE_COLOR = {
  coin: '#D97706',
  attack: '#DC2626',
  steal: '#DB2777',
  shield: '#2563EB',
  jackpot: '#059669'
};
const FACE_EMOJI = {
  coin: '🪙',
  attack: '⚔️',
  steal: '🥷',
  shield: '🛡️',
  jackpot: '⭐'
};
const FACE_LABEL = {
  coin: 'コイン',
  attack: 'アタック',
  steal: 'スティール',
  shield: 'シールド',
  jackpot: 'ジャックポット'
};
const FACE_EFFECT = {
  coin: IMG + 'CoinBurst.png',
  attack: IMG + 'Effect_Attack.png',
  steal: IMG + 'Effect_Smoke.png',
  shield: IMG + 'Effect_Shield.png',
  jackpot: IMG + 'Effect_Jackpot.png'
};
function calculateCoins(results, stage) {
  const baseCoins = stage * 100;
  const addCoins = 500;
  const coinCount = results.filter(r => r.id === 'coin').length;
  return baseCoins + addCoins * coinCount;
}
function checkZorume(results) {
  const isZorume = results[0].id === results[1].id && results[1].id === results[2].id;
  const jackpotCount = results.filter(r => r.id === 'jackpot').length;
  const isJackpotCombo = jackpotCount >= 2 && !isZorume;
  return {
    isZorume,
    isJackpotCombo,
    faceId: results[0].id
  };
}

// SCREEN 03 — bonus dice tables
const BONUS_DICE_TABLES = {
  coin: [{
    face: 1,
    label: '×2',
    sub: 'よく出る',
    multiplier: 2
  }, {
    face: 2,
    label: '×5',
    sub: '出る',
    multiplier: 5
  }, {
    face: 3,
    label: '×10',
    sub: 'たまに',
    multiplier: 10
  }, {
    face: 4,
    label: '×20',
    sub: 'レア',
    multiplier: 20
  }, {
    face: 5,
    label: '×50',
    sub: '超レア',
    multiplier: 50
  }, {
    face: 6,
    label: '×100',
    sub: '夢',
    multiplier: 100
  }],
  attack: [{
    face: 1,
    label: '一撃',
    sub: '城×1',
    damage: 1,
    coinRate: 0
  }, {
    face: 2,
    label: '強奪',
    sub: 'コイン10%',
    damage: 0,
    coinRate: 0.10
  }, {
    face: 3,
    label: '襲撃',
    sub: '×1＋5%',
    damage: 1,
    coinRate: 0.05
  }, {
    face: 4,
    label: '連撃',
    sub: '城×2',
    damage: 2,
    coinRate: 0
  }, {
    face: 5,
    label: '火攻め',
    sub: '×2＋15%',
    damage: 2,
    coinRate: 0.15
  }, {
    face: 6,
    label: '城壊し',
    sub: '×3＋25%',
    damage: 3,
    coinRate: 0.25
  }],
  jackpot: [{
    face: 1,
    label: '小判雨',
    sub: '×20',
    coinMultiplier: 20,
    treasure: 0
  }, {
    face: 2,
    label: 'お宝箱',
    sub: '×3+箱',
    coinMultiplier: 3,
    treasure: 1
  }, {
    face: 3,
    label: '大当たり',
    sub: '×10+箱',
    coinMultiplier: 10,
    treasure: 1
  }, {
    face: 4,
    label: 'レア確定',
    sub: '×5+箱',
    coinMultiplier: 5,
    treasure: 1,
    rare: true
  }, {
    face: 5,
    label: '忍者召喚',
    sub: '×5+仲間',
    coinMultiplier: 5,
    companion: true
  }, {
    face: 6,
    label: '超JP',
    sub: '×50!!',
    coinMultiplier: 50,
    treasure: 1,
    rare: true,
    companion: true
  }],
  steal: [{
    face: 1,
    label: '×1',
    sub: 'スカり',
    multiplier: 1
  }, {
    face: 2,
    label: '×2',
    sub: '出る',
    multiplier: 2
  }, {
    face: 3,
    label: '×3',
    sub: 'たまに',
    multiplier: 3
  }, {
    face: 4,
    label: '×5',
    sub: 'レア',
    multiplier: 5
  }, {
    face: 5,
    label: '×10',
    sub: '超レア',
    multiplier: 10
  }, {
    face: 6,
    label: '×20',
    sub: '夢',
    multiplier: 20
  }]
};
const rollBonusDice = t => {
  const table = BONUS_DICE_TABLES[t];
  return table[Math.floor(Math.random() * table.length)];
};

// SCREEN 04 — opponent castle parts (attack targets)
const CASTLE_ATTACK_PARTS = [{
  id: 'tower',
  label: '天守閣',
  x: '50%',
  y: '18%',
  state: 'intact'
}, {
  id: 'gate',
  label: '城門',
  x: '50%',
  y: '80%',
  state: 'intact'
}, {
  id: 'quarters',
  label: '武家屋敷',
  x: '18%',
  y: '50%',
  state: 'destroyed'
}, {
  id: 'garden',
  label: '庭園',
  x: '82%',
  y: '62%',
  state: 'intact'
}, {
  id: 'storage',
  label: '蔵',
  x: '78%',
  y: '32%',
  state: 'intact'
}];

// SCREEN 06 — steal locations (matches BG_Steal layout)
const STEAL_LOCATIONS = [{
  id: 'manor',
  label: '屋敷',
  icon: IMG + 'StealIcon_Manor.png',
  emoji: '🏯',
  coinRange: [30000, 60000],
  boxChance: 0.15
}, {
  id: 'storehouse',
  label: '蔵',
  icon: IMG + 'StealIcon_Storehouse.png',
  emoji: '🏬',
  coinRange: [50000, 90000],
  boxChance: 0.30
}, {
  id: 'shrine',
  label: '神社',
  icon: IMG + 'StealIcon_Shrine.png',
  emoji: '⛩️',
  coinRange: [10000, 30000],
  boxChance: 0.50
}, {
  id: 'market',
  label: '城下町',
  icon: IMG + 'StealIcon_Market.png',
  emoji: '🏮',
  coinRange: [25000, 55000],
  boxChance: 0.15
}];
const generateStealResults = ids => ids.map(id => {
  const loc = STEAL_LOCATIONS.find(l => l.id === id);
  const coinGain = Math.floor(loc.coinRange[0] + Math.random() * (loc.coinRange[1] - loc.coinRange[0]));
  return {
    ...loc,
    coinGain,
    hasBox: Math.random() < loc.boxChance
  };
});
// スティール：相手の村の建物ごとの奪取パラメータ（建物を直接タップして盗む）
const STEAL_BUILDING = {
  castle: {
    coinRange: [40000, 85000],
    boxChance: 0.15
  },
  storehouse: {
    coinRange: [50000, 90000],
    boxChance: 0.38
  },
  statue: {
    coinRange: [15000, 35000],
    boxChance: 0.50
  },
  garden: {
    coinRange: [25000, 55000],
    boxChance: 0.22
  }
};
const stealFromBuilding = it => {
  const p = STEAL_BUILDING[it.id] || {
    coinRange: [20000, 50000],
    boxChance: 0.2
  };
  const coinGain = Math.floor(p.coinRange[0] + Math.random() * (p.coinRange[1] - p.coinRange[0]));
  return {
    id: it.id,
    label: it.label,
    coinGain,
    hasBox: Math.random() < p.boxChance
  };
};

// SCREEN 07 — own castle parts (build)
const PART_COST = [100, 300, 700, 1500, 3000];
const makeCastleParts = () => [{
  id: 'tower',
  label: '天守閣',
  x: '50%',
  y: '22%',
  level: 5,
  maxLevel: 5,
  cost: PART_COST,
  state: 'complete'
}, {
  id: 'gate',
  label: '城門',
  x: '50%',
  y: '78%',
  level: 5,
  maxLevel: 5,
  cost: PART_COST,
  state: 'complete'
}, {
  id: 'quarters',
  label: '武家屋敷',
  x: '20%',
  y: '52%',
  level: 2,
  maxLevel: 5,
  cost: PART_COST,
  state: 'building'
}, {
  id: 'garden',
  label: '庭園',
  x: '80%',
  y: '60%',
  level: 0,
  maxLevel: 5,
  cost: PART_COST,
  state: 'notStarted'
}, {
  id: 'storage',
  label: '蔵',
  x: '76%',
  y: '34%',
  level: 0,
  maxLevel: 5,
  cost: PART_COST,
  state: 'destroyed'
}];

// Fresh castle for a new stage — every part unbuilt
const freshCastleParts = () => makeCastleParts().map(p => ({
  ...p,
  level: 0,
  state: 'notStarted'
}));
const fmt = n => Math.round(n).toLocaleString('en-US');
const CASTLE_IMG = {
  himeji: IMG + 'Castle_Himeji.png',
  windsor: IMG + 'Castle_Windsor.png',
  tajmahal: IMG + 'Castle_TajMahal.png'
};
// 10ステージ＝10テーマ（世界の名所ツアー）。stage1から順に切り替わる。
const STAGE_THEMES = ['himeji', 'windsor', 'tajmahal', 'egypt', 'china', 'greece', 'aztec', 'russia', 'arabia', 'dragon'];
const MAX_STAGE = STAGE_THEMES.length;
const castleTypeForStage = s => STAGE_THEMES[Math.min(Math.max(1, s | 0), MAX_STAGE) - 1];

// 小判（コイン/ジャックポット）で得られるベース金額。ステージ進捗に応じて超線形に増える。
// 例: s1=500, s2=1500, s3=3000, s5=7500, s7=14000, s10=27500（旧: stage*500 = s10で5000）。
const coinBaseForStage = s => {
  const n = Math.min(Math.max(1, s | 0), MAX_STAGE);
  return 250 * n * (n + 1);
};

/* 対戦相手ロスター：大金持ち → 初心者 の順。アタック/スティールのたびに入れ替わる。
   coins=保有コイン（獲得額のベース）、shields=初期シールド枚数（金持ちほど堅い）。 */
const OPPONENTS = [{
  key: 'shogun',
  name: '将軍 徳川',
  img: 'Opp_Shogun.png',
  coins: 2200000,
  shields: 2
}, {
  key: 'daimyo',
  name: '大名 織田',
  img: 'Opp_Daimyo.png',
  coins: 1300000,
  shields: 2
}, {
  key: 'merchant',
  name: '豪商 越後屋',
  img: 'Opp_Merchant.png',
  coins: 820000,
  shields: 1
}, {
  key: 'general',
  name: '侍大将 武田',
  img: 'Opp_General.png',
  coins: 520000,
  shields: 1
}, {
  key: 'tanaka',
  name: '城主 田中',
  img: 'Opp_LordTanaka.png',
  coins: 300000,
  shields: 1
}, {
  key: 'ninja',
  name: '忍者頭 服部',
  img: 'Opp_NinjaChief.png',
  coins: 210000,
  shields: 1
}, {
  key: 'kunoichi',
  name: 'くノ一 あやめ',
  img: 'Opp_Kunoichi.png',
  coins: 150000,
  shields: 0
}, {
  key: 'ronin',
  name: '浪人 佐々木',
  img: 'Opp_Ronin.png',
  coins: 78000,
  shields: 0
}, {
  key: 'ashigaru',
  name: '足軽 権兵衛',
  img: 'Opp_Ashigaru.png',
  coins: 36000,
  shields: 0
}, {
  key: 'apprentice',
  name: '見習い 小太郎',
  img: 'Opp_Apprentice.png',
  coins: 12000,
  shields: 0
}];
const OPP_BY_KEY = Object.fromEntries(OPPONENTS.map(o => [o.key, o]));
// ロスターから対戦相手インスタンスを生成（shieldsはコピーして戦闘で消費できるように）
const makeOpponent = o => ({
  key: o.key,
  name: o.name,
  img: IMG + o.img,
  coins: o.coins,
  shields: o.shields
});
// 現在と違う相手をランダムに選ぶ（連続で同じ相手を避ける）
const pickOpponent = currentKey => {
  const pool = OPPONENTS.filter(o => o.key !== currentKey);
  return makeOpponent(pool[Math.floor(Math.random() * pool.length)]);
};
// 表示用の短い呼び名（「将軍 徳川」→「徳川」）
const oppShortName = name => (name || '').split(' ').pop();
const CASTLE_NAME = {
  himeji: '姫路城',
  windsor: 'ウィンザー城',
  tajmahal: 'タージ・マハル'
};
// 城テーマごとの建築段階画像（最後が完成形）
const CASTLE_STAGES = {
  himeji: [IMG + 'Castle_Build_1.png', IMG + 'Castle_Build_2.png', IMG + 'Castle_Build_3.png', IMG + 'Castle_Build_4.png', IMG + 'Castle_Himeji.png'],
  windsor: [IMG + 'Windsor_Build_1.png', IMG + 'Windsor_Build_2.png', IMG + 'Castle_Windsor.png'],
  tajmahal: [IMG + 'Taj_Build_1.png', IMG + 'Taj_Build_2.png', IMG + 'Castle_TajMahal.png']
};
// 建設画面の背景（城テーマに合わせる）
const CASTLE_BG = {
  himeji: IMG + 'BG_Castle.png',
  windsor: IMG + 'BG_Castle_Windsor.png',
  tajmahal: IMG + 'BG_Castle_TajMahal.png'
};
// 城テーマごとの付帯建築（蔵/石像/庭園）段階画像。城以外もテーマに一致させる。
const BUILDING_STAGES = {
  himeji: {
    storehouse: [IMG + 'Build_Storehouse_1.png', IMG + 'Build_Storehouse_2.png', IMG + 'Build_Storehouse_3.png'],
    statue: [IMG + 'Build_Statue_1.png', IMG + 'Build_Statue_2.png', IMG + 'Build_Statue_3.png'],
    garden: [IMG + 'Build_Garden_1.png', IMG + 'Build_Garden_2.png', IMG + 'Build_Garden_3.png']
  },
  windsor: {
    storehouse: [IMG + 'Windsor_Storehouse_1.png', IMG + 'Windsor_Storehouse_2.png', IMG + 'Windsor_Storehouse_3.png'],
    statue: [IMG + 'Windsor_Statue_1.png', IMG + 'Windsor_Statue_2.png', IMG + 'Windsor_Statue_3.png'],
    garden: [IMG + 'Windsor_Garden_1.png', IMG + 'Windsor_Garden_2.png', IMG + 'Windsor_Garden_3.png']
  },
  tajmahal: {
    storehouse: [IMG + 'Taj_Storehouse_1.png', IMG + 'Taj_Storehouse_2.png', IMG + 'Taj_Storehouse_3.png'],
    statue: [IMG + 'Taj_Statue_1.png', IMG + 'Taj_Statue_2.png', IMG + 'Taj_Statue_3.png'],
    garden: [IMG + 'Taj_Garden_1.png', IMG + 'Taj_Garden_2.png', IMG + 'Taj_Garden_3.png']
  }
};
// stage4-10 の新テーマを自動登録（画像は <Pfx>_Build_1/2 + Castle_<Pfx>、蔵/石像/庭園は <Pfx>_<Type>_1..3、背景 BG_Castle_<Pfx>）
const NEW_THEMES = {
  egypt: {
    name: 'ピラミッド',
    pfx: 'Egypt'
  },
  china: {
    name: '紫禁城',
    pfx: 'China'
  },
  greece: {
    name: 'パルテノン神殿',
    pfx: 'Greece'
  },
  aztec: {
    name: '太陽のピラミッド',
    pfx: 'Aztec'
  },
  russia: {
    name: '聖ワシリイ大聖堂',
    pfx: 'Russia'
  },
  arabia: {
    name: '砂漠の宮殿',
    pfx: 'Arabia'
  },
  dragon: {
    name: '龍宮天空城',
    pfx: 'Dragon'
  }
};
Object.keys(NEW_THEMES).forEach(key => {
  const p = NEW_THEMES[key].pfx;
  CASTLE_NAME[key] = NEW_THEMES[key].name;
  CASTLE_STAGES[key] = [IMG + p + '_Build_1.png', IMG + p + '_Build_2.png', IMG + 'Castle_' + p + '.png'];
  CASTLE_BG[key] = IMG + 'BG_Castle_' + p + '.png';
  BUILDING_STAGES[key] = {
    storehouse: [IMG + p + '_Storehouse_1.png', IMG + p + '_Storehouse_2.png', IMG + p + '_Storehouse_3.png'],
    statue: [IMG + p + '_Statue_1.png', IMG + p + '_Statue_2.png', IMG + p + '_Statue_3.png'],
    garden: [IMG + p + '_Garden_1.png', IMG + p + '_Garden_2.png', IMG + p + '_Garden_3.png']
  };
});
// 指定テーマでのその建物の段階配列（城はCASTLE_STAGES、蔵/石像/庭園はBUILDING_STAGES）
const themedStagesFor = (itemId, theme) => itemId === 'castle' ? CASTLE_STAGES[theme] : (BUILDING_STAGES[theme] || BUILDING_STAGES.himeji)[itemId];

/* ---- Coin Master style build items (each levels up through visual stages) ---- */
const BUILD_ITEMS = [{
  id: 'castle',
  label: '天守閣',
  emoji: '🏯',
  x: '50%',
  y: '40%',
  w: 180,
  stages: CASTLE_STAGES.himeji
}, {
  id: 'storehouse',
  label: '蔵',
  emoji: '🏬',
  x: '18%',
  y: '60%',
  w: 112,
  stages: [IMG + 'Build_Storehouse_1.png', IMG + 'Build_Storehouse_2.png', IMG + 'Build_Storehouse_3.png']
}, {
  id: 'statue',
  label: '石像',
  emoji: '🗿',
  x: '83%',
  y: '57%',
  w: 92,
  stages: [IMG + 'Build_Statue_1.png', IMG + 'Build_Statue_2.png', IMG + 'Build_Statue_3.png']
}, {
  id: 'garden',
  label: '庭園',
  emoji: '🌸',
  x: '50%',
  y: '82%',
  w: 150,
  stages: [IMG + 'Build_Garden_1.png', IMG + 'Build_Garden_2.png', IMG + 'Build_Garden_3.png']
}];
const itemMax = it => it.stages.length - 1; // top level index (= complete)
// Coin Master 風の値段感：6桁が当たり前（標準stage3のLv0で約10万コイン）。ステージ・レベルで増加。
// 例) stage1 Lv0=55,000 / stage3 Lv0≈100,000・Lv3≈627,000 / stage5 Lv0=143,000
const buildCost = (level, stage = 1) => Math.round((33000 + 22000 * stage) * Math.pow(1.85, level));
// every item starts at level 0 (nothing pre-built)
const makeVillage = (opts = {}) => BUILD_ITEMS.map(it => ({
  ...it,
  level: opts.max ? itemMax(it) : opts.levels?.[it.id] ?? 0
}));

/* ============================================================
   SHARED UTILITIES
   ============================================================ */
function Img({
  src,
  alt,
  className,
  style,
  fallback
}) {
  const [err, setErr] = useState(false);
  if (err || !src) return fallback || null;
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt || '',
    className: className,
    style: style,
    onError: () => setErr(true)
  });
}

// ease-out cubic count-up hook: returns current display value for a target
function useCountUp(target, duration = 1000, run = true) {
  const [val, setVal] = useState(run ? 0 : target);
  const fromRef = useRef(0);
  useEffect(() => {
    if (!run) {
      setVal(target);
      return;
    }
    let raf,
      start = null;
    const from = fromRef.current;
    const step = now => {
      if (start === null) start = now;
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.floor(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, run]);
  return val;
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */
function TopBar({
  coins,
  shields,
  onMenu,
  onShop,
  night,
  onToggleNight
}) {
  const [snd, setSnd] = useState(() => SFX.isEnabled());
  const toggleSnd = () => {
    const v = !snd;
    setSnd(v);
    SFX.setEnabled(v);
    if (v) SFX.tap();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "coin-pill"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Small.png',
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "coin-emoji"
    }, "🪙")
  }), /*#__PURE__*/React.createElement("span", {
    className: "coin-amount gold-text"
  }, fmt(coins)), /*#__PURE__*/React.createElement("button", {
    className: "plus-btn",
    title: "ショップ",
    onClick: onShop
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Icon_Plus.png',
    className: "icon-img",
    fallback: /*#__PURE__*/React.createElement("span", null, "+")
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shield-box"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Icon_Shield.png',
    className: "sh-ico-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "sh-ico"
    }, "🛡️")
  }), /*#__PURE__*/React.createElement("span", {
    className: "shield-dots"
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: i < shields ? 'on' : ''
  })))), /*#__PURE__*/React.createElement("div", {
    className: "topbar-right"
  }, /*#__PURE__*/React.createElement("button", {
    className: "menu-btn snd-btn",
    title: "サウンド",
    onClick: toggleSnd
  }, /*#__PURE__*/React.createElement("span", {
    className: "snd-ico"
  }, snd ? '🔊' : '🔇')), onToggleNight && /*#__PURE__*/React.createElement("button", {
    className: "menu-btn",
    title: "昼夜切替",
    onClick: onToggleNight
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Icon_Night.png',
    className: "icon-img",
    fallback: /*#__PURE__*/React.createElement("span", null, night ? '☀️' : '🌙')
  })), onMenu && /*#__PURE__*/React.createElement("button", {
    className: "menu-btn",
    title: "メニュー",
    onClick: onMenu
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Icon_Menu.png',
    className: "icon-img",
    fallback: /*#__PURE__*/React.createElement("span", null, "≡")
  }))));
}

// Scroll banner (UI_Scroll.png) with title text
function ScrollBanner({
  title,
  sub,
  className
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "scroll-banner " + (className || '')
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'UI_Scroll.png',
    className: "scroll-bg",
    fallback: /*#__PURE__*/React.createElement("div", {
      className: "scroll-bg-fallback"
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "scroll-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "scroll-title gold-text"
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    className: "scroll-sub"
  }, sub)));
}
function Toast({
  msg
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "toast " + (msg ? 'show' : '')
  }, msg);
}

/* ============================================================
   SCREEN 01 — MAIN ROLL
   ============================================================ */
const INITIAL_DICE = [DICE_FACES.COIN, DICE_FACES.ATTACK, DICE_FACES.SHIELD];
function Die({
  face,
  phase,
  anim = 'toss'
}) {
  const cls = "die " + (anim === 'toss' ? 'toss ' : '') + (phase === 'spinning' ? 'spinning' : phase === 'landed' ? 'landed' : '');
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Dice_Normal.png',
    className: "die-body",
    fallback: /*#__PURE__*/React.createElement("div", {
      className: "die-body",
      style: {
        background: '#f5f0e0',
        borderRadius: 16,
        border: '3px solid #D4A017'
      }
    })
  }), /*#__PURE__*/React.createElement(Img, {
    src: face.image,
    className: "die-face",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "face-emoji"
    }, face.emoji)
  }));
}

/* ---- 3D dice (CSS cube). 空中は等速回転→着地で減速。左→右に跳ね上げ発射 ---- */
const FACE_IMG_BY_ID = {};
Object.values(DICE_FACES).forEach(f => {
  FACE_IMG_BY_ID[f.id] = f.image;
});
const CUBE_LAYOUT = [{
  slot: 'front',
  id: 'coin'
}, {
  slot: 'top',
  id: 'attack'
}, {
  slot: 'right',
  id: 'steal'
}, {
  slot: 'left',
  id: 'shield'
}, {
  slot: 'bottom',
  id: 'jackpot'
}, {
  slot: 'back',
  id: 'coin'
}];
const REST3D = {
  front: {
    x: 0,
    y: 0
  },
  back: {
    x: 0,
    y: 180
  },
  right: {
    x: 0,
    y: -90
  },
  left: {
    x: 0,
    y: 90
  },
  top: {
    x: -90,
    y: 0
  },
  bottom: {
    x: 90,
    y: 0
  }
};
const SLOT_FOR_ID = {
  coin: 'front',
  attack: 'top',
  steal: 'right',
  shield: 'left',
  jackpot: 'bottom'
};
const norm360 = a => (a % 360 + 360) % 360;
function Die3D({
  face,
  rollKey,
  index = 0
}) {
  const cubeRef = useRef(null),
    launchRef = useRef(null);
  const rot = useRef(null);
  // idle は各ダイスで違う役を見せる：小判(front)/スティール(right)/シールド(left)。
  // 着地時と同じ「面を正面に向ける」向き＝読みやすい。top/bottom(rotateX±90)は真横に潰れるので使わない。
  if (rot.current === null) {
    const s = REST3D[['front', 'right', 'left'][index % 3]];
    rot.current = {
      rx: s.x,
      ry: s.y
    };
  }
  // idle 向きを一度だけ適用（transformはJSXに置かず、Reactの再描画で消えないようにする）
  useEffect(() => {
    if (cubeRef.current) cubeRef.current.style.transform = `rotateX(${rot.current.rx}deg) rotateY(${rot.current.ry}deg)`;
  }, []);
  useEffect(() => {
    if (!rollKey) return; // 初期表示ではロールしない
    const rest = REST3D[SLOT_FOR_ID[face.id] || 'front'];
    const spinsX = 2 + Math.floor(Math.random() * 3); // 2〜4回転
    const spinsY = 3 + Math.floor(Math.random() * 3); // 3〜5回転
    const rx0 = rot.current.rx,
      ry0 = rot.current.ry;
    const rxE = rx0 + norm360(rest.x - rx0) + spinsX * 360;
    const ryE = ry0 + norm360(rest.y - ry0) + spinsY * 360;
    const rxA = rx0 + 0.84 * (rxE - rx0),
      ryA = ry0 + 0.84 * (ryE - ry0);
    rot.current = {
      rx: rxE,
      ry: ryE
    };
    const dur = 1.3;
    const c = cubeRef.current,
      l = launchRef.current;
    if (!c || !l) return;
    const start = () => {
      c.style.setProperty('--rx0', rx0 + 'deg');
      c.style.setProperty('--ry0', ry0 + 'deg');
      c.style.setProperty('--rxA', rxA + 'deg');
      c.style.setProperty('--ryA', ryA + 'deg');
      c.style.setProperty('--rxE', rxE + 'deg');
      c.style.setProperty('--ryE', ryE + 'deg');
      c.style.animation = 'none';
      void c.offsetWidth;
      c.style.animation = `d3tumble ${dur}s both`;
      l.style.animation = 'none';
      void l.offsetWidth;
      l.style.animation = `d3launch ${dur}s linear both`;
    };
    const t = setTimeout(start, index * 150); // 左→右に順番に発射
    return () => clearTimeout(t);
  }, [rollKey]);
  return /*#__PURE__*/React.createElement("div", {
    className: "d3-slot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d3-launch",
    ref: launchRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "d3-tilt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d3-cube",
    ref: cubeRef
  }, CUBE_LAYOUT.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "d3-face f-" + f.slot
  }, /*#__PURE__*/React.createElement(Img, {
    src: FACE_IMG_BY_ID[f.id],
    className: "d3-sym",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "d3-emo"
    }, FACE_EMOJI[f.id])
  })))))));
}
function RollButton({
  disabled,
  onRoll,
  auto,
  onToggleAuto
}) {
  const pressT = useRef(0);
  const stopGuard = useRef(0); // ignore the ghost click that fires right after a long-press enables auto
  const [charging, setCharging] = useState(false);
  const LONG = 550; // ms — hold this long → auto; shorter → single roll
  // Decide auto-vs-roll on RELEASE (by hold duration) so the button never swaps to STOP mid-hold.
  const start = () => {
    if (disabled) return;
    pressT.current = performance.now();
    setCharging(true);
  };
  const cancel = () => {
    pressT.current = 0;
    setCharging(false);
  };
  const end = e => {
    if (e && e.cancelable) e.preventDefault();
    if (pressT.current === 0) return;
    const held = performance.now() - pressT.current;
    cancel();
    if (disabled) return;
    if (held >= LONG) {
      stopGuard.current = performance.now() + 500;
      onToggleAuto(true);
    } else onRoll();
  };
  const stop = () => {
    if (performance.now() < stopGuard.current) return;
    onToggleAuto(false);
  };

  // While auto-rolling the button becomes a STOP control — always tappable (never disabled).
  if (auto) {
    return /*#__PURE__*/React.createElement("div", {
      className: "roll-zone"
    }, /*#__PURE__*/React.createElement("button", {
      className: "roll-btn stop",
      onClick: stop
    }, /*#__PURE__*/React.createElement("span", {
      className: "stop-ico"
    }, "■"), "停止"), /*#__PURE__*/React.createElement("div", {
      className: "roll-sub auto",
      onClick: stop
    }, "オートロール中"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "roll-zone"
  }, /*#__PURE__*/React.createElement("button", {
    className: "roll-btn" + (charging ? ' charging' : ''),
    disabled: disabled,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: end
  }, "振る！"), /*#__PURE__*/React.createElement("div", {
    className: "roll-sub"
  }, charging ? 'はなすとオートロール！' : '長押しでオートロール'));
}

/* 装備中キャラを常時表示するミニマスコット。連番フレームをループ再生（しゃべらない）。
   6フレームをすべてDOMに置き opacity で切替 → 再取得のちらつきなし。タップでキャラ画面へ。 */
function CharMascot({
  id,
  onClick
}) {
  const [f, setF] = useState(0);
  useEffect(() => {
    setF(0);
    const t = setInterval(() => setF(x => (x + 1) % 6), 120);
    return () => clearInterval(t);
  }, [id]);
  const frames = charFrames(id);
  return /*#__PURE__*/React.createElement("button", {
    className: "game-mascot",
    onClick: onClick,
    "aria-label": "仲間"
  }, frames.map((src, i) => /*#__PURE__*/React.createElement(Img, {
    key: i,
    src: src,
    className: "gm-img" + (i === f ? ' on' : ''),
    fallback: i === 0 ? /*#__PURE__*/React.createElement("span", {
      className: "gm-emoji"
    }, "🧙") : null
  })));
}

/* 画面左右のサイドレール（旧メニュー＋ボトムナビを左右に分散）。全遷移先へ1タップ。 */
const SIDE_LEFT = [{
  screen: 'castle',
  img: 'Icon_Village.png',
  emoji: '🏯',
  label: '村建設'
}, {
  screen: 'characters',
  img: 'Char_maneki_1.png',
  emoji: '🥷',
  label: '仲間'
}, {
  screen: 'collection',
  img: 'Icon_Card.png',
  emoji: '📖',
  label: 'カード'
}, {
  screen: 'clan',
  img: 'Icon_Clan.png',
  emoji: '🗡️',
  label: '討伐',
  badge: 'ticket'
}];
const SIDE_RIGHT = [{
  screen: 'shop',
  img: 'Icon_Shop.png',
  emoji: '🛒',
  label: '商店'
}, {
  screen: 'season',
  img: 'Icon_Event.png',
  emoji: '🎫',
  label: '催事'
}, {
  screen: 'invite',
  img: 'Icon_Invite.png',
  emoji: '👥',
  label: '招待'
}];
function SideRail({
  side,
  items,
  go,
  tickets = 0,
  pulseKey = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "side-rail " + side
  }, items.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.screen + (m.screen === 'collection' ? '-' + pulseKey : ''),
    className: "rail-btn rail-" + m.screen + (m.screen === 'collection' && pulseKey ? ' pulse' : ''),
    onClick: () => {
      SFX.tap();
      go(m.screen);
    }
  }, m.badge === 'ticket' && tickets > 0 && /*#__PURE__*/React.createElement("span", {
    className: "nb-badge"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Icon_Ticket.png',
    className: "nb-badge-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, "🎟️")
  }), tickets), /*#__PURE__*/React.createElement(Img, {
    src: IMG + m.img,
    className: "rail-ico",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "rail-emoji"
    }, m.emoji)
  }), /*#__PURE__*/React.createElement("span", {
    className: "rail-label"
  }, m.label))));
}
function MainRoll({
  game,
  addCoins,
  grantShields,
  grantRolls,
  showToast,
  go,
  onZorume,
  onCardDrop,
  dropCard,
  onMenu,
  onShop,
  tickets,
  bet = 1,
  setBet,
  night,
  onToggleNight,
  auto,
  setAuto,
  rollAnim = 'toss',
  onToggleRollAnim,
  paused = false,
  equipped = null,
  freeRollChance = 0,
  cardDropBonus = 0,
  onResetShop,
  onRerollShop,
  onDebugTickets
}) {
  const freeRollRef = useRef(freeRollChance);
  freeRollRef.current = freeRollChance; // 招き猫系：確率で無料ロール
  const cardBonusRef = useRef(cardDropBonus);
  cardBonusRef.current = cardDropBonus; // だるま：カード排出率+
  const [coinSpray, setCoinSpray] = useState(0); // コイン噴き上げ演出のキー（0=非表示）
  const [cardFly, setCardFly] = useState(null); // {card,key,phase,dx,dy} ロール獲得カードの飛翔演出
  const [railPulse, setRailPulse] = useState(0); // カードUI（左レール）到着パルスのキー
  const cardFlyRef = useRef(null); // 飛翔カードのDOM参照（着地座標計算用）
  const flyTimers = useRef([]);
  const [dice, setDice] = useState(INITIAL_DICE);
  const [phases, setPhases] = useState(['idle', 'idle', 'idle']);
  const [isRolling, setIsRolling] = useState(false);
  const [lastGain, setLastGain] = useState(0);
  const [gainKey, setGainKey] = useState(0);
  const [mood, setMood] = useState('idle');
  const [speech, setSpeech] = useState('');
  const [fx, setFx] = useState({
    coin: false,
    jackpot: false,
    gain: 0,
    key: 0
  });
  const [showDebug, setShowDebug] = useState(() => new URLSearchParams(window.location.search).has('debugopen'));
  // auto は App 側で保持（ボーナス/アタック等で MainRoll がアンマウントされても状態を維持する）

  // 常時ループの桜吹雪演出：マウント時に一度だけランダム生成（再レンダリングでリセットさせない）
  const petals = useMemo(() => Array.from({
    length: 13
  }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    variant: `Effect_SakuraPetal_${1 + Math.floor(Math.random() * 3)}.png`,
    drift: -60 + Math.random() * 120,
    spin: 180 + Math.random() * 360,
    size: 18 + Math.random() * 16,
    dur: 9 + Math.random() * 7,
    delay: -16 + Math.random() * 16
  })), []);
  const spinIntervals = useRef([]);
  const fxKeyRef = useRef(0);
  const rollingRef = useRef(false);
  const doRollRef = useRef(null); // stable handle so the auto-loop effect doesn't churn with game identity
  const rollsRef = useRef(game.rolls);
  rollsRef.current = game.rolls;
  const betRef = useRef(1);
  betRef.current = bet; // ロールポイント倍率（報酬計算で参照）
  const rollAnimRef = useRef(rollAnim);
  rollAnimRef.current = rollAnim;
  const [roll3dKey, setRoll3dKey] = useState(0); // 3D演出のロール再生トリガー

  const clearSpins = () => {
    spinIntervals.current.forEach(clearInterval);
    spinIntervals.current = [];
  };
  useEffect(() => () => {
    clearSpins();
    flyTimers.current.forEach(clearTimeout);
  }, []);
  const fireFx = useCallback(partial => {
    fxKeyRef.current += 1;
    setFx({
      coin: false,
      jackpot: false,
      gain: 0,
      ...partial,
      key: fxKeyRef.current
    });
  }, []);

  // ロール完了＝コイン噴き上げ演出の終了時に呼ぶ（オートロールはここで次へ進む）
  const finishRoll = useCallback(() => {
    setPhases(['idle', 'idle', 'idle']);
    rollingRef.current = false;
    setIsRolling(false);
    setTimeout(() => {
      setMood('idle');
      setSpeech('');
    }, 400);
  }, []);

  // 獲得カードを別位置に出し、少し見せてから左レールの「カード」ボタンへ飛ばす。着地でボタンをパルス。
  const flyKeyRef = useRef(0);
  const startCardFly = useCallback(card => {
    flyTimers.current.forEach(clearTimeout);
    flyTimers.current = [];
    setCardFly({
      card,
      key: ++flyKeyRef.current,
      phase: 'reveal',
      dx: 0,
      dy: 0
    });
    flyTimers.current.push(setTimeout(() => {
      const from = cardFlyRef.current && cardFlyRef.current.getBoundingClientRect();
      const toEl = document.querySelector('.side-rail.left .rail-collection');
      let dx = -120,
        dy = 60;
      if (from && toEl) {
        const tr = toEl.getBoundingClientRect();
        dx = tr.left + tr.width / 2 - (from.left + from.width / 2);
        dy = tr.top + tr.height / 2 - (from.top + from.height / 2);
      }
      setCardFly(prev => prev ? {
        ...prev,
        phase: 'fly',
        dx,
        dy
      } : prev);
    }, 780));
    flyTimers.current.push(setTimeout(() => {
      setCardFly(null);
      setRailPulse(k => k + 1);
    }, 780 + 560));
  }, []);
  const doRoll = useCallback(forced => {
    if (rollingRef.current) return;
    if (game.rolls < game.bet) {
      showToast('ロールが足りません');
      setAuto(false);
      return;
    }
    rollingRef.current = true;
    setIsRolling(true);
    if (Math.random() < freeRollRef.current) {
      showToast('🐾 無料ロール！');
    } // 招き猫系：消費なし
    else game.useRolls(game.bet); // ロールポイント倍率ぶん消費
    setMood('excited');
    setSpeech('');
    SFX.roll();
    const results = Array.isArray(forced) && forced.length === 3 ? forced : decideHand();
    if (rollAnimRef.current === '3d') {
      // 3D：面の高速切替はせず、立方体が結果面へ転がって着地。着地に合わせて判定。
      clearSpins();
      setDice(results);
      setPhases(['spinning', 'spinning', 'spinning']);
      setRoll3dKey(k => k + 1);
      setTimeout(() => resolveRoll(results), 1700); // stagger + 転がり + 着地ぶん
      return;
    }
    setPhases(['spinning', 'spinning', 'spinning']);
    clearSpins();
    for (let i = 0; i < 3; i++) {
      const id = setInterval(() => setDice(prev => {
        const nx = [...prev];
        nx[i] = rollFace();
        return nx;
      }), 80);
      spinIntervals.current.push(id);
    }
    const stopTimes = [520, 680, 840];
    results.forEach((res, i) => setTimeout(() => {
      clearInterval(spinIntervals.current[i]);
      setDice(prev => {
        const nx = [...prev];
        nx[i] = res;
        return nx;
      });
      setPhases(prev => {
        const nx = [...prev];
        nx[i] = 'landed';
        return nx;
      });
    }, stopTimes[i]));
    setTimeout(() => resolveRoll(results), 900);
  }, [game, showToast]);
  const resolveRoll = useCallback(results => {
    const {
      isZorume,
      isJackpotCombo,
      faceId
    } = checkZorume(results);
    const gain = calculateCoins(results, game.stage) * betRef.current;
    SFX.land();
    if (isZorume) {
      // hand off to the zorume overlay + flow router
      setMood('zorume');
      setSpeech(FACE_LABEL[faceId] + 'ぞろ目！');
      SFX.zorume();
      setTimeout(() => {
        rollingRef.current = false;
        setIsRolling(false);
        setMood('idle');
        setSpeech('');
        setPhases(['idle', 'idle', 'idle']);
      }, 1300);
      onZorume(faceId);
      return;
    }
    if (isJackpotCombo) {
      const bonus = gain + 3000;
      fireFx({
        jackpot: true
      });
      SFX.jackpot();
      setMood('excited');
      setSpeech('ジャックポット×2！');
      addCoins(bonus);
      setLastGain(bonus);
      setGainKey(k => k + 1);
      setCoinSpray(k => k + 1);
      showToast('ジャックポットコンボ！ +' + fmt(bonus) + ' 🪙');
    } else {
      const coinCount = results.filter(r => r.id === 'coin').length;
      const shieldCount = results.filter(r => r.id === 'shield').length;
      addCoins(gain);
      setLastGain(gain);
      setGainKey(k => k + 1);
      if (gain > 0) {
        setCoinSpray(k => k + 1);
        SFX.coin();
      } // 非ぞろ目は常に gain>0 → 毎回噴き上げ
      if (shieldCount >= 2) {
        grantShields(1);
        showToast('シールド +1 🛡️');
      }
      setMood(coinCount >= 2 ? 'excited' : 'idle');
      setSpeech(coinCount >= 2 ? 'コインざっくざく！' : '');
      // 通常ロールで一定確率にカードドロップ：中央でなくオフセンターに出して左レールへ飛ばす
      if (dropCard && Math.random() < 0.10 + cardBonusRef.current) setTimeout(() => {
        const c = dropCard();
        startCardFly(c);
      }, 500); // カード排出率 35%→10%（だるま等の cardDropBonus は加算）
    }
    // ロール解放はコイン噴き上げの onDone (finishRoll) が行う。ここでは解放しない（次ロールが演出を待つ）。
  }, [game.stage, addCoins, grantShields, fireFx, showToast, onZorume, dropCard, startCardFly, finishRoll]);
  doRollRef.current = doRoll;
  // auto-roll loop — depends only on auto/isRolling (NOT on doRoll/game identity),
  // so the 350ms timer isn't reset by App re-renders (e.g. coin count-up animation).
  useEffect(() => {
    if (!auto || isRolling || paused) return; // メニュー/ジャックポット等の演出中は一時停止（閉じたら再開）
    if (rollsRef.current < betRef.current) {
      setAuto(false);
      return;
    }
    const t = setTimeout(() => doRollRef.current && doRollRef.current(), 350);
    return () => clearTimeout(t);
  }, [auto, isRolling, paused]);

  // refill timer (cosmetic)
  const [refill, setRefill] = useState('50:00');
  useEffect(() => {
    if (game.rolls >= game.rollsMax) {
      setRefill('満タン');
      return;
    }
    let sec = 50 * 60;
    setRefill('50:00');
    const id = setInterval(() => {
      sec = Math.max(0, sec - 1);
      setRefill(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, [game.rolls, game.rollsMax]);

  // demo hook (?demo=win|coin|zorume|jackpot|shield)
  const demoFired = useRef(false);
  useEffect(() => {
    if (demoFired.current) return;
    const demo = new URLSearchParams(window.location.search).get('demo');
    const F = DICE_FACES;
    const map = {
      zorume: [F.JACKPOT, F.JACKPOT, F.JACKPOT],
      attackz: [F.ATTACK, F.ATTACK, F.ATTACK],
      stealz: [F.STEAL, F.STEAL, F.STEAL],
      shield: [F.SHIELD, F.SHIELD, F.SHIELD],
      jackpot: [F.JACKPOT, F.JACKPOT, F.COIN],
      coin: [F.COIN, F.COIN, F.COIN],
      win: [F.COIN, F.COIN, F.ATTACK]
    };
    if (!map[demo]) return;
    demoFired.current = true;
    const t = setTimeout(() => doRoll(map[demo]), 900);
    return () => clearTimeout(t);
  }, [doRoll]);
  const pct = Math.max(0, Math.min(100, game.rolls / game.rollsMax * 100));
  return /*#__PURE__*/React.createElement("div", {
    className: "screen main-screen",
    style: {
      '--bg': `url("${IMG}${night ? 'BG_Main_Night.png' : 'BG_Main_Day.png'}")`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-layer"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ambient-layer",
    "aria-hidden": "true"
  }, petals.map(p => /*#__PURE__*/React.createElement("div", {
    className: "petal",
    key: p.id,
    style: {
      left: p.left + '%',
      '--drift': p.drift + 'px',
      '--spin': p.spin + 'deg',
      width: p.size + 'px',
      height: p.size + 'px',
      animationDuration: p.dur + 's',
      animationDelay: p.delay + 's'
    }
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + p.variant,
    className: "petal-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "petal-emoji"
    }, "🌸")
  })))), /*#__PURE__*/React.createElement(TopBar, {
    coins: game.coins,
    shields: game.shields,
    onMenu: onMenu,
    onShop: onShop,
    night: night,
    onToggleNight: onToggleNight
  }), /*#__PURE__*/React.createElement(SideRail, {
    side: "left",
    items: SIDE_LEFT,
    go: go,
    tickets: tickets,
    pulseKey: railPulse
  }), /*#__PURE__*/React.createElement(SideRail, {
    side: "right",
    items: SIDE_RIGHT,
    go: go,
    tickets: tickets
  }), cardFly && /*#__PURE__*/React.createElement("div", {
    className: "card-fly " + cardFly.phase + (cardFly.card.gold ? ' gold' : ''),
    ref: cardFlyRef,
    style: cardFly.phase === 'fly' ? {
      transform: `translate(${cardFly.dx}px, ${cardFly.dy}px) scale(.16)`,
      opacity: 0
    } : undefined
  }, /*#__PURE__*/React.createElement(Img, {
    src: cardFly.card.img,
    className: "cf-fly-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "cf-fly-emoji"
    }, "🎴")
  }), /*#__PURE__*/React.createElement("span", {
    className: "cf-fly-cap"
  }, cardFly.card.gold ? '★ ' : '', "カード獲得！")), equipped && /*#__PURE__*/React.createElement(CharMascot, {
    id: equipped,
    onClick: () => go('characters')
  }), /*#__PURE__*/React.createElement("div", {
    className: "opp-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "opp-avatar"
  }, /*#__PURE__*/React.createElement(Img, {
    key: game.opponent.key,
    src: game.opponent.img,
    className: "opp-portrait",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "opp-face"
    }, "👺")
  })), /*#__PURE__*/React.createElement("div", {
    className: "opp-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "opp-label"
  }, "対戦相手"), /*#__PURE__*/React.createElement("div", {
    className: "opp-name"
  }, game.opponent.name)), /*#__PURE__*/React.createElement("div", {
    className: "opp-coins"
  }, "💰 ", fmt(game.opponent.coins))), /*#__PURE__*/React.createElement("div", {
    className: "dice-area"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dice-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dice-row" + (rollAnim === '3d' ? ' d3' : '')
  }, rollAnim === '3d' ? dice.map((f, i) => /*#__PURE__*/React.createElement(Die3D, {
    key: i,
    face: f,
    rollKey: roll3dKey,
    index: i
  })) : dice.map((f, i) => /*#__PURE__*/React.createElement(Die, {
    key: i,
    face: f,
    phase: phases[i],
    anim: rollAnim
  })))), /*#__PURE__*/React.createElement("div", {
    className: "gain-banner " + (gainKey ? 'pop' : ''),
    key: gainKey
  }, /*#__PURE__*/React.createElement("span", {
    className: "gb-label"
  }, "今回の獲得"), /*#__PURE__*/React.createElement("span", {
    className: "gold-text"
  }, "+", fmt(lastGain)), /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Small.png',
    fallback: /*#__PURE__*/React.createElement("span", null, "🪙")
  }))), /*#__PURE__*/React.createElement("div", {
    className: "energy-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "energy-top"
  }, /*#__PURE__*/React.createElement("span", null, "残りロール"), /*#__PURE__*/React.createElement("span", {
    className: "energy-right"
  }, /*#__PURE__*/React.createElement("button", {
    className: "free-roll-btn",
    onClick: () => {
      grantRolls && grantRolls(5);
      showToast('🎲 ロール +5！');
    }
  }, "🎬 無料+5"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, game.rolls), " / ", game.rollsMax))), /*#__PURE__*/React.createElement("div", {
    className: "energy-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "energy-fill",
    style: {
      width: pct + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "energy-timer"
  }, "次の補充: ", refill)), /*#__PURE__*/React.createElement("div", {
    className: "bet-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bet-label"
  }, "ロールポイント"), [1, 2, 3].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    className: "bet-btn " + (bet === n ? 'on' : ''),
    disabled: isRolling,
    onClick: () => setBet && setBet(n)
  }, "×", n)), /*#__PURE__*/React.createElement("span", {
    className: "bet-hint"
  }, "消費", bet, "・報酬×", bet)), /*#__PURE__*/React.createElement("div", {
    className: "bottom-dock"
  }, /*#__PURE__*/React.createElement(RollButton, {
    disabled: isRolling || game.rolls < bet,
    onRoll: doRoll,
    auto: auto,
    onToggleAuto: setAuto
  })), /*#__PURE__*/React.createElement("div", {
    className: "fx-layer"
  }, fx.jackpot && /*#__PURE__*/React.createElement(Img, {
    key: 'j' + fx.key,
    src: IMG + 'Effect_Jackpot.png',
    className: "jackpot-fx on",
    fallback: /*#__PURE__*/React.createElement("div", null)
  })), coinSpray > 0 && /*#__PURE__*/React.createElement(CoinParticles, {
    key: 'cp' + coinSpray,
    onDone: finishRoll
  }), /*#__PURE__*/React.createElement("button", {
    className: "debug-fab",
    onClick: () => setShowDebug(v => !v),
    title: "デバッグ"
  }, "🐞"), showDebug && /*#__PURE__*/React.createElement("div", {
    className: "debug-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "debug-head"
  }, "🐞 デバッグ：役を指定"), DEBUG_HANDS.map(h => /*#__PURE__*/React.createElement("button", {
    key: h.key,
    className: "debug-item",
    disabled: isRolling,
    onClick: () => {
      setShowDebug(false);
      doRoll(h.faces || undefined);
    }
  }, h.label)), onToggleRollAnim && /*#__PURE__*/React.createElement("button", {
    className: "debug-item",
    disabled: isRolling,
    onClick: onToggleRollAnim
  }, "🎬 ダイス演出: ", rollAnim === '3d' ? '3D立体' : rollAnim === 'toss' ? '飛ばし（下から）' : '回転（従来）'), onRerollShop && /*#__PURE__*/React.createElement("button", {
    className: "debug-item",
    onClick: () => {
      onRerollShop();
    }
  }, "🛒 ショップ再ロール（4種入替）"), onResetShop && /*#__PURE__*/React.createElement("button", {
    className: "debug-item",
    onClick: () => {
      onResetShop();
    }
  }, "🛒 ショップ購入リセット"), onDebugTickets && /*#__PURE__*/React.createElement("button", {
    className: "debug-item",
    onClick: () => {
      onDebugTickets();
    }
  }, "🎟️ レイドチケット +5"), /*#__PURE__*/React.createElement("button", {
    className: "debug-close",
    onClick: () => setShowDebug(false)
  }, "閉じる")));
}

/* ============================================================
   SCREEN 02 — ZORUME OVERLAY
   ============================================================ */
function ZorumeOverlay({
  faceId,
  onComplete
}) {
  const [phase, setPhase] = useState('flash'); // flash → show → transition
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 220);
    const t2 = setTimeout(() => setPhase('transition'), 900);
    const t3 = setTimeout(() => onComplete(), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [faceId, onComplete]);
  const color = FACE_COLOR[faceId];
  const face = DICE_FACES[faceId.toUpperCase()];
  return /*#__PURE__*/React.createElement("div", {
    className: "zorume-overlay",
    style: {
      '--zc': color
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "z-flash"
  }), (() => {
    const zbg = faceId === 'attack' ? 'BG_Attack.png' : faceId === 'steal' ? 'BG_Steal.png' : 'BG_Bonus.png';
    return /*#__PURE__*/React.createElement("div", {
      className: "z-bg",
      style: {
        backgroundImage: `url("${IMG}${zbg}")`
      }
    });
  })(), /*#__PURE__*/React.createElement(Img, {
    src: FACE_EFFECT[faceId],
    className: "z-effect",
    fallback: /*#__PURE__*/React.createElement("div", null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "z-dice-row"
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    className: "z-die",
    key: i,
    style: {
      animationDelay: `${i * 80}ms`
    }
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Dice_Normal.png',
    className: "die-body",
    fallback: /*#__PURE__*/React.createElement("div", {
      className: "die-body",
      style: {
        background: '#f5f0e0',
        borderRadius: 16
      }
    })
  }), /*#__PURE__*/React.createElement(Img, {
    src: face.image,
    className: "die-face",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "face-emoji"
    }, face.emoji)
  })))), /*#__PURE__*/React.createElement("div", {
    className: "z-banner"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'UI_Scroll.png',
    className: "scroll-bg",
    fallback: /*#__PURE__*/React.createElement("div", {
      className: "scroll-bg-fallback"
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "scroll-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "scroll-title gold-text"
  }, faceId === 'jackpot' ? 'JACKPOT!!' : 'ぞろ目！！'), /*#__PURE__*/React.createElement("div", {
    className: "z-badge",
    style: {
      background: color
    }
  }, FACE_EMOJI[faceId], " ", FACE_LABEL[faceId], " ぞろ目"))), /*#__PURE__*/React.createElement("div", {
    className: "z-chara"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Chara_NinjaDog.png',
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 80
      }
    }, "🐕")
  })), phase === 'transition' && /*#__PURE__*/React.createElement("div", {
    className: "z-next"
  }, "つぎへ →"));
}

/* ============================================================
   SCREEN 03 — BONUS ROLL（金色の3Dダイス1個。メインと同じ跳ね上げ→転がり→着地）
   ============================================================ */
const BONUS_SLOTS = ['front', 'top', 'right', 'left', 'bottom', 'back'];
function BonusDie3D({
  table,
  result,
  rollKey
}) {
  const cubeRef = useRef(null),
    launchRef = useRef(null);
  const rot = useRef({
    rx: -20,
    ry: 24
  });
  useEffect(() => {
    if (cubeRef.current) cubeRef.current.style.transform = `rotateX(${rot.current.rx}deg) rotateY(${rot.current.ry}deg)`;
  }, []);
  useEffect(() => {
    if (!rollKey || !result) return;
    const resIdx = Math.max(0, table.findIndex(t => t.face === result.face));
    const rest = REST3D[BONUS_SLOTS[resIdx % 6]];
    const spinsX = 2 + Math.floor(Math.random() * 3),
      spinsY = 3 + Math.floor(Math.random() * 3);
    const rx0 = rot.current.rx,
      ry0 = rot.current.ry;
    const rxE = rx0 + norm360(rest.x - rx0) + spinsX * 360;
    const ryE = ry0 + norm360(rest.y - ry0) + spinsY * 360;
    const rxA = rx0 + 0.84 * (rxE - rx0),
      ryA = ry0 + 0.84 * (ryE - ry0);
    rot.current = {
      rx: rxE,
      ry: ryE
    };
    const dur = 1.5;
    const c = cubeRef.current,
      l = launchRef.current;
    if (!c || !l) return;
    c.style.setProperty('--rx0', rx0 + 'deg');
    c.style.setProperty('--ry0', ry0 + 'deg');
    c.style.setProperty('--rxA', rxA + 'deg');
    c.style.setProperty('--ryA', ryA + 'deg');
    c.style.setProperty('--rxE', rxE + 'deg');
    c.style.setProperty('--ryE', ryE + 'deg');
    c.style.animation = 'none';
    void c.offsetWidth;
    c.style.animation = `d3tumble ${dur}s both`;
    l.style.animation = 'none';
    void l.offsetWidth;
    l.style.animation = `d3launchBig ${dur}s linear both`;
  }, [rollKey]);
  return /*#__PURE__*/React.createElement("div", {
    className: "d3-slot bonus"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d3-launch",
    ref: launchRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "d3-tilt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d3-cube bonus",
    ref: cubeRef
  }, BONUS_SLOTS.map((slot, i) => /*#__PURE__*/React.createElement("div", {
    key: slot,
    className: "d3-face f-" + slot
  }, /*#__PURE__*/React.createElement("span", {
    className: "bd3-label"
  }, table[i] ? table[i].label : '')))))));
}
function BonusRoll({
  trigger,
  stage = 3,
  bet = 1,
  onComplete
}) {
  const table = BONUS_DICE_TABLES[trigger] || BONUS_DICE_TABLES.coin;
  const [phase, setPhase] = useState('rolling'); // rolling → result
  const [result, setResult] = useState(null);
  const [rollKey, setRollKey] = useState(0);
  const timerRef = useRef(null);
  const color = FACE_COLOR[trigger];
  const base = coinBaseForStage(stage);
  const coinGain = result ? trigger === 'coin' ? base * result.multiplier * bet : trigger === 'jackpot' ? (base * result.coinMultiplier + (result.treasure ? 50000 : 0)) * bet : 0 : 0;
  const gainDisplay = useCountUp(coinGain, 900, phase === 'result' && coinGain > 0);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  // 入場後まもなく自動で振る：金ダイスが跳ね上がって転がり、当選倍率の面で着地
  useEffect(() => {
    const t = setTimeout(() => {
      const res = rollBonusDice(trigger);
      setResult(res);
      setRollKey(1);
      SFX.roll();
      timerRef.current = setTimeout(() => {
        setPhase('result');
        SFX.coin();
      }, 1650);
    }, 500);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "screen bonus-screen",
    style: {
      backgroundImage: `url("${IMG}BG_Bonus.png")`,
      '--zc': color
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bonus-dim"
  }), /*#__PURE__*/React.createElement(ScrollBanner, {
    title: "ボーナスロール！",
    className: "bonus-title"
  }), /*#__PURE__*/React.createElement("div", {
    className: "trigger-card",
    style: {
      borderColor: color
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "trigger-emoji"
  }, FACE_EMOJI[trigger], FACE_EMOJI[trigger], FACE_EMOJI[trigger]), /*#__PURE__*/React.createElement("span", null, FACE_LABEL[trigger], " ぞろ目")), /*#__PURE__*/React.createElement("div", {
    className: "bonus-base"
  }, "倍率の元金 ", /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Small.png',
    className: "bb-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, "🪙")
  }), " ", /*#__PURE__*/React.createElement("b", {
    className: "gold-text"
  }, fmt(base)), bet > 1 && /*#__PURE__*/React.createElement("span", {
    className: "bb-bet"
  }, "（×", bet, "ロールポイント）")), /*#__PURE__*/React.createElement("div", {
    className: "bonus-dice-wrap"
  }, phase === 'result' && /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Effect_Jackpot.png',
    className: "bonus-flash",
    fallback: /*#__PURE__*/React.createElement("div", null)
  }), /*#__PURE__*/React.createElement(BonusDie3D, {
    table: table,
    result: result,
    rollKey: rollKey
  })), phase === 'result' && coinGain > 0 && /*#__PURE__*/React.createElement(CoinParticles, {
    key: "bonusparts",
    count: 34
  }), phase === 'result' && coinGain > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bonus-reward"
  }, /*#__PURE__*/React.createElement("div", {
    className: "br-formula"
  }, /*#__PURE__*/React.createElement("span", {
    className: "br-term"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Small.png',
    className: "brf-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, "🪙")
  }), fmt(base)), /*#__PURE__*/React.createElement("span", {
    className: "br-op"
  }, "× ", result.multiplier), bet > 1 && /*#__PURE__*/React.createElement("span", {
    className: "br-op"
  }, "× ", bet)), /*#__PURE__*/React.createElement("div", {
    className: "br-eq gold-text"
  }, "= +", fmt(gainDisplay), " 🪙")), phase !== 'result' ? /*#__PURE__*/React.createElement("div", {
    className: "bonus-status"
  }, "ボーナスダイスを振っています…") : /*#__PURE__*/React.createElement("button", {
    className: "big-btn gold-btn",
    onClick: () => onComplete(result)
  }, "次へ →"));
}

/* ============================================================
   SCREEN 04 — ATTACK SELECT
   ============================================================ */
/* 連番フレームのワンショット演出（終了で onDone）。name_1..count.png を interval間隔で再生。 */
function FrameAnim({
  name,
  count,
  interval = 90,
  className = '',
  onDone
}) {
  const [f, setF] = useState(0);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      if (i > count - 1) {
        clearInterval(t);
        onDone && onDone();
        return;
      }
      setF(i);
    }, interval);
    return () => clearInterval(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "fx-anim " + className
  }, Array.from({
    length: count
  }).map((_, n) => /*#__PURE__*/React.createElement(Img, {
    key: n,
    src: IMG + name + '_' + (n + 1) + '.png',
    className: "fx-f" + (n === f ? ' on' : ''),
    fallback: null
  })));
}

/* コイン獲得の大きなパーティクル演出：多数の小判が画面下から噴き上がり、弧を描いて散って落ちる。
   個々の小判に方向/高さ/回転/サイズ/遅延をランダム付与し CSS で飛ばす（実時間パーティクル）。終了で onDone。 */
function CoinParticles({
  count = 30,
  onDone
}) {
  const [parts] = useState(() => Array.from({
    length: count
  }, (_, i) => ({
    id: i,
    dx: (Math.random() * 2 - 1) * 46,
    // 横方向の到達（vw）
    up: 46 + Math.random() * 40,
    // 打ち上げ最高点（vh）
    rot: (Math.random() * 2 - 1) * 620,
    // 回転（deg）
    dur: 0.95 + Math.random() * 0.55,
    // 秒
    delay: Math.random() * 0.22,
    // 秒（噴出のばらけ）
    sz: 26 + Math.random() * 30,
    // px
    big: Math.random() < 0.42,
    x0: 50 + (Math.random() * 2 - 1) * 16 // 噴出口の横位置（%）: 画面下中央付近
  })));
  useEffect(() => {
    const t = setTimeout(() => onDone && onDone(), 1350);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "coin-particles"
  }, parts.map(p => /*#__PURE__*/React.createElement(Img, {
    key: p.id,
    src: IMG + (p.big ? 'Koban_Large.png' : 'Koban_Small.png'),
    className: "coin-p",
    style: {
      left: p.x0 + '%',
      width: p.sz + 'px',
      height: p.sz + 'px',
      '--dx': p.dx + 'vw',
      '--up': p.up + 'vh',
      '--rot': p.rot + 'deg',
      animationDuration: p.dur + 's',
      animationDelay: p.delay + 's'
    },
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "coin-p-emoji"
    }, "🪙")
  })));
}
function AttackSelect({
  opponent,
  bonusResult,
  stage = 3,
  ignoreShield = false,
  onCancel,
  onResolve
}) {
  // opponent's village（建設画面と同じ見た目）。建物を直接タップして攻撃。
  const [village] = useState(() => themedVillage(stage, {
    levels: {
      castle: 3,
      storehouse: 2,
      statue: 2,
      garden: 1
    }
  }));
  const [hit, setHit] = useState(null); // 攻撃中の建物
  const [phase, setPhase] = useState(null); // 'coin' | 'shield' | 'broken'
  const [broken, setBroken] = useState([]); // 破壊済みの建物id
  const rate = Math.round((bonusResult?.coinRate ?? 0.25) * 100) || 25;
  const pick = it => {
    if (hit) return; // 1回のみ攻撃
    const success = opponent.shields <= 0 || ignoreShield;
    setHit(it);
    if (success) {
      setPhase('burst');
      SFX.attack();
    } // まず派手なインパクト → コイン → 破壊
    else {
      setPhase('shield');
      SFX.shield();
      setTimeout(() => onResolve(it, false), 760);
    }
  };
  const onSprayDone = () => {
    setBroken(b => hit ? [...b, hit.id] : b); // 建物を破壊状態へ
    setPhase('broken');
    SFX.coin();
    setTimeout(() => onResolve(hit, true), 700); // 破壊状態を見せてから結果へ
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "screen attack-screen",
    style: {
      backgroundImage: `url("${IMG}BG_Attack.png")`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onCancel
  }, "← 戻る"), /*#__PURE__*/React.createElement("span", {
    className: "foe-coins"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Small.png',
    className: "fc-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, "💰")
  }), fmt(opponent.coins)), /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn danger",
    onClick: onCancel
  }, "逃げる")), /*#__PURE__*/React.createElement(ScrollBanner, {
    title: "攻撃する建物をタップ！",
    className: "attack-title"
  }), /*#__PURE__*/React.createElement("div", {
    className: "asym-note attack"
  }, "⚔️ 侍の攻撃はシールドで防がれることがある"), /*#__PURE__*/React.createElement("div", {
    className: "castle-stage village"
  }, village.map(it => {
    const broke = broken.includes(it.id);
    const isHit = hit && hit.id === it.id;
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      className: "village-item attackable " + (broke ? 'broken ' : '') + (isHit ? 'hit ' : ''),
      style: {
        left: it.x,
        top: it.y,
        width: it.w
      },
      onClick: () => pick(it)
    }, /*#__PURE__*/React.createElement(Img, {
      src: it.stages[it.level],
      className: "vi-img",
      style: {
        width: it.w
      },
      fallback: /*#__PURE__*/React.createElement("span", {
        className: "vi-emoji"
      }, it.emoji)
    }), broke && /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'Effect_Rubble.png',
      className: "vi-rubble",
      fallback: /*#__PURE__*/React.createElement("div", null)
    }), !hit && /*#__PURE__*/React.createElement("div", {
      className: "target-overlay"
    }, /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'UI_Target.png',
      className: "reticle",
      fallback: /*#__PURE__*/React.createElement("span", {
        className: "reticle-fallback"
      }, "◎")
    })), isHit && phase === 'burst' && /*#__PURE__*/React.createElement(FrameAnim, {
      name: "AttackBurst",
      count: 8,
      interval: 55,
      className: "burstfx",
      onDone: () => setPhase('coin')
    }), isHit && phase === 'coin' && /*#__PURE__*/React.createElement(FrameAnim, {
      name: "CoinSpray",
      count: 8,
      interval: 95,
      className: "coinfx",
      onDone: onSprayDone
    }), isHit && phase === 'shield' && /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'Effect_Shield.png',
      className: "vi-shieldfx",
      fallback: /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 44
        }
      }, "🛡️")
    }), /*#__PURE__*/React.createElement("span", {
      className: "target-label"
    }, it.label));
  })), /*#__PURE__*/React.createElement("div", {
    className: "predict-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "predict-frame"
  }, /*#__PURE__*/React.createElement("div", null, "💥 破壊成功時: 相手コインの約 ", /*#__PURE__*/React.createElement("b", null, rate, "%"), " 獲得"), /*#__PURE__*/React.createElement("div", null, "🛡️ シールド時: 相手コインの約 ", /*#__PURE__*/React.createElement("b", null, "7%"), " 獲得"), bonusResult && /*#__PURE__*/React.createElement("div", {
    className: "predict-bonus"
  }, "ボーナス: ", bonusResult.label, " ダメージ", bonusResult.damage || 0))), /*#__PURE__*/React.createElement("div", {
    className: "attack-chara"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Chara_RoboNinja.png',
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 70
      }
    }, "🤖")
  })));
}

/* ============================================================
   SCREEN 05 — ATTACK RESULT
   ============================================================ */
function AttackResult({
  result,
  onNext,
  opponentName
}) {
  const foe = oppShortName(opponentName) || '相手';
  const display = useCountUp(result.coinGain, 1000, true);
  const success = result.success;
  useEffect(() => {
    success ? SFX.attack() : SFX.shield();
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "screen result-screen",
    style: {
      backgroundImage: `url("${IMG}BG_Attack.png")`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "result-dim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "result-pop " + (success ? 'ok' : 'shield')
  }, /*#__PURE__*/React.createElement("div", {
    className: "result-head"
  }, success ? '攻撃成功！！' : 'シールドに阻まれた！'), /*#__PURE__*/React.createElement("div", {
    className: "result-visual"
  }, success ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Castle_Broken.png',
    className: "rv-castle",
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 90
      }
    }, "🏚️")
  }), /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Effect_Attack.png',
    className: "rv-effect",
    fallback: /*#__PURE__*/React.createElement("div", null)
  })) : /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Effect_Shield.png',
    className: "rv-effect big",
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 90
      }
    }, "🛡️")
  }), success && /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'CoinBurst.png',
    className: "rv-burst",
    fallback: /*#__PURE__*/React.createElement("div", null)
  })), success && /*#__PURE__*/React.createElement("div", {
    className: "result-part"
  }, result.damage > 1 ? `建物を計${result.damage}棟 破壊！` : '建物を破壊！'), /*#__PURE__*/React.createElement("div", {
    className: "result-coin"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Large.png',
    className: "rc-icon",
    fallback: /*#__PURE__*/React.createElement("span", null, "🪙")
  }), /*#__PURE__*/React.createElement("span", {
    className: "gold-text"
  }, "+", fmt(display))), /*#__PURE__*/React.createElement("div", {
    className: "result-react"
  }, success ? `😡 ${foe}: 怒り` : `😅 ${foe}: セーフ`), /*#__PURE__*/React.createElement("button", {
    className: "big-btn green-btn",
    onClick: onNext
  }, "次へ →")));
}

/* ============================================================
   SCREEN 06 — STEAL
   ============================================================ */
function StealScreen({
  opponentName,
  opponentCoins = 0,
  opponentImg = '',
  betMult = 1,
  onReceive,
  stealMult = 1,
  autoLastSpot = false,
  stage = 3,
  pieceBonus = 0,
  ownedPieces = {}
}) {
  // 相手の村（建設画面と同じ配置）を表示し、建物を直接タップして盗む。
  const [village] = useState(() => themedVillage(stage, {
    levels: {
      castle: 3,
      storehouse: 2,
      statue: 2,
      garden: 1
    }
  }));
  const [phase, setPhase] = useState('intro'); // intro → selecting → summary
  const [picks, setPicks] = useState([]); // {id,label,coinGain,hasBox}
  const [swiping, setSwiping] = useState(null); // 盗み演出中の建物id
  const [boxGot, setBoxGot] = useState(null); // 宝箱GET演出中の建物id
  const [boxRewards, setBoxRewards] = useState([]); // 宝箱の中身（カード or 仲間かけら／同時には出ない）

  useEffect(() => {
    const t = setTimeout(() => setPhase('selecting'), 600);
    return () => clearTimeout(t);
  }, []);
  const pickedIds = picks.map(p => p.id);
  const pick = it => {
    if (phase !== 'selecting' || swiping || pickedIds.includes(it.id) || picks.length >= 3) return;
    setSwiping(it.id);
    SFX.steal(); // 盗む演出 → 完了でコイン確定
  };
  // 影のくノ一（autoLastSpot）は3件盗んだ後、残り1件も自動で強奪。
  const finalizeSwipe = it => {
    let next = [...picks, stealFromBuilding(it)];
    if (next.length === 3 && autoLastSpot) {
      const rest = village.find(v => !next.some(p => p.id === v.id));
      if (rest) next = [...next, {
        ...stealFromBuilding(rest),
        auto: true
      }];
    }
    const gotBox = next.slice(picks.length).some(r => r.hasBox);
    setPicks(next);
    setSwiping(null);
    SFX.coin();
    if (gotBox) {
      setBoxGot(it.id);
      SFX.jackpot();
      setTimeout(() => setBoxGot(null), 1000);
    }
    if (next.length >= 3) {
      // 宝箱の中身を確定（1箱＝カード or 仲間のどちらか一方）。サマリーで演出リビール。
      const rewards = next.filter(p => p.hasBox).map(() => rollStealBoxReward(stage, 0.25, pieceBonus, ownedPieces));
      setBoxRewards(rewards);
      setTimeout(() => {
        setPhase('summary');
        SFX.coin();
      }, gotBox ? 1250 : 650);
    }
  };
  const subtotal = picks.reduce((s, r) => s + r.coinGain, 0);
  const boxCount = picks.filter(p => p.hasBox).length; // 宝箱の数＝獲得カード枚数
  const total = Math.round(subtotal * betMult * stealMult); // ロールポイント(betMult)＋装備キャラ(stealMult)
  const totalDisplay = useCountUp(total, 1000, phase === 'summary');
  const picksLeft = Math.max(0, 3 - picks.length);
  return /*#__PURE__*/React.createElement("div", {
    className: "screen steal-screen",
    style: {
      backgroundImage: `url("${IMG}BG_Steal.png")`
    }
  }, phase === 'intro' && /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Effect_Smoke.png',
    className: "steal-smoke",
    fallback: /*#__PURE__*/React.createElement("div", {
      className: "steal-smoke-fallback"
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "steal-foe"
  }, /*#__PURE__*/React.createElement("div", {
    className: "steal-foe-face"
  }, /*#__PURE__*/React.createElement(Img, {
    key: opponentImg,
    src: opponentImg,
    className: "sff-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "sff-emoji"
    }, "👺")
  })), /*#__PURE__*/React.createElement("div", {
    className: "steal-foe-info"
  }, /*#__PURE__*/React.createElement("span", {
    className: "steal-foe-name"
  }, "🥷 ", opponentName), /*#__PURE__*/React.createElement("span", {
    className: "steal-foe-coins"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Small.png',
    className: "fc-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, "💰")
  }), fmt(opponentCoins)))), /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn danger",
    onClick: () => onReceive(0)
  }, "逃げる")), /*#__PURE__*/React.createElement(ScrollBanner, {
    title: "盗む建物をタップ！",
    sub: `${'●'.repeat(Math.min(picks.length, 3))}${'○'.repeat(picksLeft)}`,
    className: "steal-title"
  }), /*#__PURE__*/React.createElement("div", {
    className: "castle-stage village"
  }, village.map(it => {
    const p = picks.find(x => x.id === it.id);
    const isSw = swiping === it.id;
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      className: "village-item stealable " + (p ? 'looted ' : '') + (isSw ? 'swiping ' : ''),
      style: {
        left: it.x,
        top: it.y,
        width: it.w
      },
      onClick: () => pick(it)
    }, /*#__PURE__*/React.createElement(Img, {
      src: it.stages[it.level],
      className: "vi-img",
      style: {
        width: it.w
      },
      fallback: /*#__PURE__*/React.createElement("span", {
        className: "vi-emoji"
      }, it.emoji)
    }), !p && !isSw && phase === 'selecting' && /*#__PURE__*/React.createElement("div", {
      className: "target-overlay"
    }, /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'UI_Target.png',
      className: "reticle steal",
      fallback: /*#__PURE__*/React.createElement("span", {
        className: "reticle-fallback"
      }, "◎")
    })), isSw && /*#__PURE__*/React.createElement(FrameAnim, {
      name: "StealSwipe",
      count: 7,
      interval: 80,
      className: "stealfx",
      onDone: () => finalizeSwipe(it)
    }), p && /*#__PURE__*/React.createElement("div", {
      className: "sc-loot"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sc-coin gold-text"
    }, "+", fmt(p.coinGain)), p.hasBox && /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'TreasureBox_Open.png',
      className: "sc-loot-box",
      fallback: /*#__PURE__*/React.createElement("span", null, "🎁")
    })), boxGot === it.id && /*#__PURE__*/React.createElement("div", {
      className: "box-get"
    }, /*#__PURE__*/React.createElement(FrameAnim, {
      name: "Effect_Shine",
      count: 8,
      interval: 70,
      className: "shinefx"
    }), /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'TreasureBox_Open.png',
      className: "box-get-img",
      fallback: /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 44
        }
      }, "🎁")
    }), /*#__PURE__*/React.createElement("span", {
      className: "box-get-label"
    }, "宝箱GET！")), /*#__PURE__*/React.createElement("span", {
      className: "target-label"
    }, it.label), p && /*#__PURE__*/React.createElement("span", {
      className: "steal-check"
    }, "✓"));
  })), phase === 'summary' ? /*#__PURE__*/React.createElement("div", {
    className: "steal-summary-overlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: "steal-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ss-row"
  }, autoLastSpot ? '４か所の合計' : '3か所の合計', ": ", /*#__PURE__*/React.createElement("b", null, "+", fmt(subtotal))), autoLastSpot && /*#__PURE__*/React.createElement("div", {
    className: "ss-row mult"
  }, "🥷 影のくノ一：最後の1か所も強奪！"), betMult > 1 && /*#__PURE__*/React.createElement("div", {
    className: "ss-row mult"
  }, "× ", betMult, "倍（ロールポイント）"), stealMult > 1 && /*#__PURE__*/React.createElement("div", {
    className: "ss-row mult"
  }, "× ", stealMult, "倍（仲間）"), /*#__PURE__*/React.createElement("div", {
    className: "ss-total gold-text"
  }, "= +", fmt(totalDisplay), " 🎉"), boxRewards.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "steal-rewards"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sr-head"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'TreasureBox_Open.png',
    className: "sr-box-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, "🎁")
  }), "宝箱の中身"), /*#__PURE__*/React.createElement("div", {
    className: "sr-grid"
  }, boxRewards.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "sr-tile " + r.type,
    style: {
      animationDelay: 0.12 + i * 0.18 + 's'
    }
  }, r.type === 'card' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
    src: r.card.img,
    className: "sr-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "sr-emoji"
    }, "🎴")
  }), /*#__PURE__*/React.createElement("span", {
    className: "sr-cap"
  }, r.card.gold ? '★' : '', "カード")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
    src: charThumb(r.char.id),
    className: "sr-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "sr-emoji"
    }, "🥷")
  }), /*#__PURE__*/React.createElement("span", {
    className: "sr-cap"
  }, r.char.name, /*#__PURE__*/React.createElement("br", null), "かけら +", r.amount)))))), /*#__PURE__*/React.createElement("button", {
    className: "big-btn green-btn",
    onClick: () => onReceive(total, boxRewards)
  }, "受け取る！"))) : null, /*#__PURE__*/React.createElement("div", {
    className: "steal-chara"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Chara_NinjaMonkey.png',
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 64
      }
    }, "🐒")
  })));
}

/* ============================================================
   SCREEN 07 — CASTLE BUILD
   ============================================================ */
// Build a village whose 天守閣 AND 蔵/石像/庭園 all match the stage's castle theme (Himeji/Windsor/TajMahal)
const themedVillage = (stage, opts = {}) => {
  const theme = castleTypeForStage(stage);
  return makeVillage(opts).map(it => {
    const stages = themedStagesFor(it.id, theme);
    const lvl = opts.max ? stages.length - 1 : Math.min(it.level ?? 0, stages.length - 1);
    return {
      ...it,
      stages,
      level: lvl
    };
  });
};
function CastleScreen({
  game,
  spendCoins,
  grantRolls,
  showToast,
  onBack,
  onNextStage,
  village,
  setVillage,
  buildDiscount = 0,
  headStart = 0
}) {
  // 建築状況は App が保持（画面遷移でリセットされない）
  const [tappedId, setTappedId] = useState(null); // last-built item (for highlight/burst)
  const stageComplete = village.every(v => v.level === itemMax(v));
  const goNextStage = () => {
    const ns = game.stage + 1;
    onNextStage();
    const nv = themedVillage(ns, {}); // new village, everything level 0
    // 大黒天など：新ステージ開始時に建物を headStart 個だけ Lv+1 で開始
    if (headStart > 0) {
      let done = 0;
      for (const it of nv) {
        if (done >= headStart) break;
        if (it.id !== 'castle') {
          it.level = Math.min(1, itemMax(it));
          done++;
        }
      }
    }
    setVillage(nv);
    setTappedId(null);
    grantRolls && grantRolls(25); // ステージクリア報酬：ダイスロール
    showToast(headStart > 0 ? '次のステージへ！ 🎲+25 ＆ 建物Lv+1！' : '次のステージへ！ 🎲ロール +25 獲得');
  };
  const costOf = it => it.level < itemMax(it) ? Math.round(buildCost(it.level, game.stage) * (1 - buildDiscount)) : 0;

  // Tapping a building (or its card) levels it up — no separate build button.
  const build = it => {
    if (it.level >= itemMax(it)) return;
    const cost = costOf(it);
    if (game.coins < cost) {
      showToast('コインが足りません');
      return;
    }
    spendCoins(cost);
    setTappedId(it.id);
    setTimeout(() => setTappedId(t => t === it.id ? null : t), 700);
    const lvl = it.level + 1;
    const complete = lvl === itemMax(it);
    complete ? SFX.stage() : SFX.build();
    setVillage(prev => prev.map(x => x.id === it.id ? {
      ...x,
      level: lvl
    } : x));
    // レベルアップでダイスロール獲得（完成時は多め）
    const rr = complete ? 10 : 3;
    grantRolls && grantRolls(rr);
    showToast(complete ? `${it.emoji} 完成！ 🎲ロール +${rr}！` : `${it.emoji} Lv${lvl}！ 🎲ロール +${rr}`);
  };
  const castleType = castleTypeForStage(game.stage);
  return /*#__PURE__*/React.createElement("div", {
    className: "screen castle-screen",
    style: {
      backgroundImage: `url("${CASTLE_BG[castleType]}")`
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    coins: game.coins,
    shields: game.shields
  }), /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onBack
  }, "← 戻る")), /*#__PURE__*/React.createElement(ScrollBanner, {
    title: `ステージ ${game.stage}`,
    className: "castle-title"
  }), /*#__PURE__*/React.createElement("div", {
    className: "castle-stage village"
  }, village.map(it => {
    const done = it.level === itemMax(it);
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      className: "village-item build " + (tappedId === it.id ? 'built ' : '') + (done ? 'done' : ''),
      style: {
        left: it.x,
        top: it.y,
        width: it.w
      },
      onClick: () => build(it)
    }, /*#__PURE__*/React.createElement(Img, {
      src: it.stages[it.level],
      className: "vi-img",
      style: {
        width: it.w
      },
      fallback: /*#__PURE__*/React.createElement("span", {
        className: "vi-emoji"
      }, it.emoji)
    }), done && /*#__PURE__*/React.createElement("span", {
      className: "vi-check"
    }, "✓"), tappedId === it.id && /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'CoinBurst.png',
      className: "vi-burst",
      fallback: /*#__PURE__*/React.createElement("div", null)
    }));
  })), /*#__PURE__*/React.createElement("div", {
    className: "build-hint"
  }, "🔨 タップしてレベルアップ！"), /*#__PURE__*/React.createElement("div", {
    className: "part-cards"
  }, village.map(it => {
    const done = it.level === itemMax(it);
    const poor = !done && game.coins < costOf(it);
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      className: "build-card " + (done ? 'done ' : '') + (poor ? 'poor ' : '') + (tappedId === it.id ? 'pressed' : ''),
      style: {
        borderColor: done ? '#059669' : it.level > 0 ? '#D97706' : '#4B5563'
      },
      onClick: () => build(it),
      disabled: done
    }, /*#__PURE__*/React.createElement(Img, {
      src: it.stages[it.level],
      className: "pc-icon-img",
      fallback: /*#__PURE__*/React.createElement("span", {
        className: "pc-label"
      }, it.emoji)
    }), /*#__PURE__*/React.createElement("div", {
      className: "pc-lvl"
    }, "Lv", it.level, "/", itemMax(it)), /*#__PURE__*/React.createElement("div", {
      className: "pc-dots"
    }, Array.from({
      length: itemMax(it)
    }).map((_, i) => /*#__PURE__*/React.createElement("i", {
      key: i,
      className: i < it.level ? 'on' : ''
    }))), done ? /*#__PURE__*/React.createElement("div", {
      className: "pc-state",
      style: {
        color: '#059669'
      }
    }, "✓ 完成") : /*#__PURE__*/React.createElement("div", {
      className: "pc-cost"
    }, /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'Koban_Small.png',
      className: "pc-coin-ico",
      fallback: /*#__PURE__*/React.createElement("span", null, "💰")
    }), fmt(costOf(it))));
  })), stageComplete && /*#__PURE__*/React.createElement("div", {
    className: "stage-clear"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sc-title"
  }, "🎉 ステージクリア！"), /*#__PURE__*/React.createElement("button", {
    className: "big-btn gold-btn",
    onClick: goNextStage
  }, "次のステージへ →"), /*#__PURE__*/React.createElement("button", {
    className: "big-btn green-btn small",
    onClick: onBack
  }, "ロール画面に戻る")));
}

/* ============================================================
   COLLECTION — 流派カード（既存アセットを流用）
   ============================================================ */
const CARD_SETS = [{
  id: 'ninja',
  name: '忍びの一族',
  color: '#DB2777',
  reward: {
    rolls: 20,
    coins: 50000
  },
  cards: [{
    id: 'dog',
    name: '忍犬',
    img: IMG + 'Chara_NinjaDog.png'
  }, {
    id: 'monkey',
    name: '忍猿',
    img: IMG + 'Chara_NinjaMonkey.png'
  }, {
    id: 'robo',
    name: 'ロボ忍者',
    img: IMG + 'Chara_RoboNinja.png'
  }, {
    id: 'shuri',
    name: '秘伝手裏剣',
    img: IMG + 'Card_Shuriken.png',
    gold: true
  }]
}, {
  id: 'arms',
  name: '武具秘伝',
  color: '#DC2626',
  reward: {
    rolls: 30,
    coins: 100000
  },
  cards: [{
    id: 'katana',
    name: '刀',
    img: IMG + 'DiceFace_Attack.png'
  }, {
    id: 'shield',
    name: '盾',
    img: IMG + 'DiceFace_Shield.png'
  }, {
    id: 'smoke',
    name: '煙玉',
    img: IMG + 'Effect_Smoke.png'
  }, {
    id: 'jack',
    name: '黄金の星',
    img: IMG + 'DiceFace_Jackpot.png',
    gold: true
  }]
}, {
  id: 'castle',
  name: '名城巡り',
  color: '#059669',
  reward: {
    rolls: 50,
    coins: 300000
  },
  cards: [{
    id: 'himeji',
    name: '姫路城',
    img: IMG + 'Castle_Himeji.png'
  }, {
    id: 'windsor',
    name: 'ウィンザー城',
    img: IMG + 'Castle_Windsor.png'
  }, {
    id: 'taj',
    name: 'タージ・マハル',
    img: IMG + 'Castle_TajMahal.png'
  }, {
    id: 'chest',
    name: '埋蔵金',
    img: IMG + 'TreasureBox_Open.png',
    gold: true
  }]
}, {
  id: 'worldE',
  name: '世界名城・東',
  color: '#D97706',
  reward: {
    rolls: 60,
    coins: 400000
  },
  cards: [{
    id: 'egypt',
    name: 'ピラミッド',
    img: IMG + 'Castle_Egypt.png'
  }, {
    id: 'china',
    name: '紫禁城',
    img: IMG + 'Castle_China.png'
  }, {
    id: 'aztec',
    name: '太陽の神殿',
    img: IMG + 'Castle_Aztec.png'
  }, {
    id: 'sphinx',
    name: '黄金のスフィンクス',
    img: IMG + 'Card_Sphinx.png',
    gold: true
  }]
}, {
  id: 'worldW',
  name: '世界名城・西',
  color: '#0EA5E9',
  reward: {
    rolls: 80,
    coins: 600000
  },
  cards: [{
    id: 'greece',
    name: 'パルテノン神殿',
    img: IMG + 'Castle_Greece.png'
  }, {
    id: 'russia',
    name: '聖ワシリイ大聖堂',
    img: IMG + 'Castle_Russia.png'
  }, {
    id: 'arabia',
    name: '砂漠の宮殿',
    img: IMG + 'Castle_Arabia.png'
  }, {
    id: 'dragoncastle',
    name: '龍宮天空城',
    img: IMG + 'Castle_Dragon.png'
  }, {
    id: 'risingdragon',
    name: '昇り龍',
    img: IMG + 'Card_GoldDragon.png',
    gold: true
  }]
}, {
  id: 'rivalsHi',
  name: '群雄割拠',
  color: '#B91C1C',
  reward: {
    rolls: 70,
    coins: 500000
  },
  cards: [{
    id: 'shogun',
    name: '将軍 徳川',
    img: IMG + 'Opp_Shogun.png'
  }, {
    id: 'daimyo',
    name: '大名 織田',
    img: IMG + 'Opp_Daimyo.png'
  }, {
    id: 'general',
    name: '侍大将 武田',
    img: IMG + 'Opp_General.png'
  }, {
    id: 'helm',
    name: '覇王の兜',
    img: IMG + 'Card_Helm.png',
    gold: true
  }]
}, {
  id: 'rivalsMid',
  name: '忍びの好敵手',
  color: '#7C3AED',
  reward: {
    rolls: 50,
    coins: 300000
  },
  cards: [{
    id: 'hattori',
    name: '忍者頭 服部',
    img: IMG + 'Opp_NinjaChief.png'
  }, {
    id: 'ayame',
    name: 'くノ一 あやめ',
    img: IMG + 'Opp_Kunoichi.png'
  }, {
    id: 'lordtanaka',
    name: '城主 田中',
    img: IMG + 'Opp_LordTanaka.png'
  }, {
    id: 'scroll',
    name: '秘伝の巻物',
    img: IMG + 'Card_Scroll.png',
    gold: true
  }]
}, {
  id: 'rivalsLo',
  name: '市井の者',
  color: '#65A30D',
  reward: {
    rolls: 40,
    coins: 200000
  },
  cards: [{
    id: 'echigoya',
    name: '豪商 越後屋',
    img: IMG + 'Opp_Merchant.png'
  }, {
    id: 'sasaki',
    name: '浪人 佐々木',
    img: IMG + 'Opp_Ronin.png'
  }, {
    id: 'gonbei',
    name: '足軽 権兵衛',
    img: IMG + 'Opp_Ashigaru.png'
  }, {
    id: 'kotaro',
    name: '見習い 小太郎',
    img: IMG + 'Opp_Apprentice.png'
  }, {
    id: 'kobanpile',
    name: '小判の山',
    img: IMG + 'Card_KobanPile.png',
    gold: true
  }]
}];
const ALL_CARDS = CARD_SETS.flatMap(s => s.cards.map(c => ({
  ...c,
  setId: s.id
})));
const dropRandomCard = (goldChance = 0.12) => {
  const gold = Math.random() < goldChance;
  const pool = ALL_CARDS.filter(c => !!c.gold === gold);
  return pool[Math.floor(Math.random() * pool.length)];
};

/* ============================================================
   CHARACTERS（仲間）— ピース100枚で入手、1体だけ装備してパッシブ発動
   ============================================================ */
const CHAR_PIECE_GOAL = 100; // 入手に必要なピース数

// --- レベル/攻撃力（討伐戦：ピース購入でLv5まで強化） ---
const CHAR_MAX_LEVEL = 5;
const RAID_LEVEL_MULT = {
  1: 1,
  2: 1.3,
  3: 1.6,
  4: 2.0,
  5: 2.5
};
const RAID_ATK_BASE = {
  normal: 12,
  rare: 20,
  epic: 32,
  legend: 48
};
const attackPower = (id, level = 1) => {
  const c = CHAR_BY_ID[id];
  if (!c) return 0;
  return Math.round(RAID_ATK_BASE[c.rank] * (RAID_LEVEL_MULT[level] || 1));
};
const CHAR_LEVEL_COST = {
  normal: [30, 50, 70, 100],
  rare: [20, 40, 50, 70],
  epic: [10, 20, 30, 40],
  legend: [5, 10, 20, 30]
};
const charLevelCost = (rank, level) => CHAR_LEVEL_COST[rank][level - 1];
const CHAR_RANKS = {
  normal: {
    label: 'ノーマル',
    color: '#94A3B8',
    short: 'N'
  },
  rare: {
    label: 'レア',
    color: '#38BDF8',
    short: 'R'
  },
  epic: {
    label: 'エピック',
    color: '#A855F7',
    short: 'E'
  },
  legend: {
    label: 'レジェンド',
    color: '#F59E0B',
    short: 'L'
  }
};
// キャラの連番アイドルフレーム（1..6）。サムネは _1。
const charFrames = id => [1, 2, 3, 4, 5, 6].map(n => IMG + 'Char_' + id + '_' + n + '.png');
const charThumb = id => IMG + 'Char_' + id + '_1.png';

// effect 既定値。装備キャラの effect をこれにマージして使う。
const NO_EFFECT = {
  coinMult: 1,
  stealMult: 1,
  attackMult: 1,
  buildDiscount: 0,
  freeRollChance: 0,
  startShields: 0,
  headStartLevels: 0,
  pieceBonus: 0,
  cardDropBonus: 0,
  jackpotBonus: 0,
  stealLastSpot: false,
  ignoreShield: false
};
const CHARACTERS = [
// NORMAL（1効果・控えめ）
{
  id: 'maneki',
  name: '招き猫',
  rank: 'normal',
  unlockStage: 1,
  desc: '通常ロールが5%の確率で無料',
  effect: {
    freeRollChance: 0.05
  }
}, {
  id: 'miyadaiku',
  name: '宮大工',
  rank: 'normal',
  unlockStage: 1,
  desc: '建設費が5%割引',
  effect: {
    buildDiscount: 0.05
  }
}, {
  id: 'fukusuzume',
  name: '福すずめ',
  rank: 'normal',
  unlockStage: 2,
  desc: '宝箱のピース獲得+10%',
  effect: {
    pieceBonus: 0.10
  }
}, {
  id: 'ishigame',
  name: '石亀',
  rank: 'normal',
  unlockStage: 2,
  desc: 'ステージ開始時シールド+1',
  effect: {
    startShields: 1
  }
}, {
  id: 'zenitengu',
  name: '銭天狗',
  rank: 'normal',
  unlockStage: 3,
  desc: '小判ぞろ目コイン+8%',
  effect: {
    coinMult: 1.08
  }
}, {
  id: 'kosodoro',
  name: 'こそ泥',
  rank: 'normal',
  unlockStage: 3,
  desc: 'スティール獲得コイン+8%',
  effect: {
    stealMult: 1.08
  }
}, {
  id: 'ashigaru',
  name: '足軽',
  rank: 'normal',
  unlockStage: 4,
  desc: 'アタック獲得コイン+8%',
  effect: {
    attackMult: 1.08
  }
}, {
  id: 'daruma',
  name: '縁起だるま',
  rank: 'normal',
  unlockStage: 4,
  desc: 'ロールのカード排出率+5%',
  effect: {
    cardDropBonus: 0.05
  }
},
// RARE（強めの1効果）
{
  id: 'kinmaneki',
  name: '黄金招き猫',
  rank: 'rare',
  unlockStage: 5,
  desc: '通常ロールが10%の確率で無料',
  effect: {
    freeRollChance: 0.10
  }
}, {
  id: 'toryo',
  name: '棟梁',
  rank: 'rare',
  unlockStage: 5,
  desc: '建設費が12%割引',
  effect: {
    buildDiscount: 0.12
  }
}, {
  id: 'fukunokami',
  name: '福の神',
  rank: 'rare',
  unlockStage: 6,
  desc: '小判ぞろ目コイン+18%',
  effect: {
    coinMult: 1.18
  }
}, {
  id: 'nezumikozo',
  name: '鼠小僧',
  rank: 'rare',
  unlockStage: 6,
  desc: 'スティール獲得コイン+18%',
  effect: {
    stealMult: 1.18
  }
}, {
  id: 'akaoni',
  name: '赤鬼',
  rank: 'rare',
  unlockStage: 7,
  desc: 'アタック獲得コイン+18%',
  effect: {
    attackMult: 1.18
  }
}, {
  id: 'bakedanuki',
  name: '化け狸',
  rank: 'rare',
  unlockStage: 7,
  desc: '宝箱のピース獲得+25%',
  effect: {
    pieceBonus: 0.25
  }
},
// EPIC（複合・特殊）
{
  id: 'kagekunoichi',
  name: '影のくノ一',
  rank: 'epic',
  unlockStage: 8,
  desc: 'スティール+1か所＋獲得+10%',
  effect: {
    stealLastSpot: true,
    stealMult: 1.10
  }
}, {
  id: 'ashuramusha',
  name: '阿修羅武者',
  rank: 'epic',
  unlockStage: 8,
  desc: 'アタック必中＋獲得+15%',
  effect: {
    ignoreShield: true,
    attackMult: 1.15
  }
}, {
  id: 'daikokuten',
  name: '大黒天',
  rank: 'epic',
  unlockStage: 9,
  desc: '建設20%割引＋建物Lv+1',
  effect: {
    buildDiscount: 0.20,
    headStartLevels: 1
  }
}, {
  id: 'takarabune',
  name: '七福神の宝船',
  rank: 'epic',
  unlockStage: 9,
  desc: '小判ぞろ目+25%＋ピース+20%',
  effect: {
    coinMult: 1.25,
    pieceBonus: 0.20
  }
},
// LEGEND（切り札・複合大）
{
  id: 'ryujin',
  name: '昇り龍神',
  rank: 'legend',
  unlockStage: 10,
  desc: '全獲得+30%＋ジャックポット+50%',
  effect: {
    coinMult: 1.30,
    stealMult: 1.30,
    attackMult: 1.30,
    jackpotBonus: 0.5
  }
}, {
  id: 'daitengu',
  name: '金の大天狗',
  rank: 'legend',
  unlockStage: 10,
  desc: '無料ロール20%＋建設25%割引＋ピース+30%',
  effect: {
    freeRollChance: 0.20,
    buildDiscount: 0.25,
    pieceBonus: 0.30
  }
}];
const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));
// localStorage JSON ヘルパー（既存の try/catch 方針に倣う）
const lsGet = (k, def) => {
  try {
    const v = localStorage.getItem(k);
    return v != null ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};
// 装備キャラ（id）から有効な effect を導出。レベルが上がるほど効果が強化される
// （乗算系effectは基準倍率からの伸び幅を、加算系effectはそのまま倍率で拡大）。
const EFF_MULT_KEYS = ['coinMult', 'stealMult', 'attackMult'];
const EFF_ADD_KEYS = ['buildDiscount', 'freeRollChance', 'pieceBonus', 'cardDropBonus', 'jackpotBonus'];
const activeEffect = (equippedId, level = 1) => {
  const c = equippedId && CHAR_BY_ID[equippedId];
  if (!c) return NO_EFFECT;
  const mult = RAID_LEVEL_MULT[level] || 1;
  const out = {
    ...c.effect
  };
  EFF_MULT_KEYS.forEach(k => {
    if (out[k] != null) out[k] = 1 + (out[k] - 1) * mult;
  });
  EFF_ADD_KEYS.forEach(k => {
    if (out[k] != null) out[k] = out[k] * mult;
  });
  return {
    ...NO_EFFECT,
    ...out
  };
};
// ピース1口の枚数。宝箱=box / ジャックポット=jackpot。レジェンドは少なめ。
const piecesFor = (rank, source) => {
  const [lo, hi] = source === 'jackpot' ? rank === 'legend' ? [12, 20] : [25, 45] : rank === 'legend' ? [5, 10] : [10, 20]; // box
  return lo + Math.floor(Math.random() * (hi - lo + 1));
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
      return {
        type: 'char',
        char: ch,
        amount
      };
    }
  }
  return {
    type: 'card',
    card: dropRandomCard(goldChance)
  };
};
// ジャックポットの「仲間召喚」：全キャラ対象（未解放でも可）。ノーマルは排出せず、レア>エピック>レジェンドの順に出やすい。
// 枚数はレア度固定：レア20 / エピック10 / レジェンド5。
const SUMMON_AMOUNT = {
  rare: 20,
  epic: 10,
  legend: 5
};
const rollCompanionSummon = () => {
  const r = Math.random() * 100;
  const rank = r < 60 ? 'rare' : r < 90 ? 'epic' : 'legend'; // 60% / 30% / 10%（ノーマル除外）
  const pool = CHARACTERS.filter(c => c.rank === rank);
  const char = pool[Math.floor(Math.random() * pool.length)];
  return {
    char,
    amount: SUMMON_AMOUNT[rank]
  };
};

/* ---- Shinobi Mart（総合ショップ）データ ---- */
// キャラのピースをこばんで購入。ランク別の価格と枚数。日替り4種・各1回。
const CHAR_SHOP_PRICE = {
  normal: {
    coins: 30000,
    pieces: 15
  },
  rare: {
    coins: 90000,
    pieces: 12
  },
  epic: {
    coins: 240000,
    pieces: 10
  },
  legend: {
    coins: 700000,
    pieces: 6
  }
};
// こばんで買える消耗品（何度でも購入可）
const KOBAN_SHOP = [{
  id: 'roll30',
  label: 'ロール +30',
  sub: '🎲',
  coins: 60000,
  rolls: 30
}, {
  id: 'roll80',
  label: 'ロール +80',
  sub: '🎲',
  coins: 150000,
  rolls: 80
}, {
  id: 'shield1',
  label: 'シールド +1',
  sub: '🛡️',
  coins: 120000,
  shields: 1
}, {
  id: 'ticket1',
  label: 'レイド券 +1',
  sub: '🎟️',
  coins: 100000,
  tickets: 1
}];
const todayStr = () => {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch (e) {
    return '2026-01-01';
  }
};
// 日付シードで解放済みキャラから4体を決定（毎日入れ替わる・決定的）
const buildDailyOffers = (stage, dateStr) => {
  const pool = CHARACTERS.filter(c => c.unlockStage <= stage);
  let seed = 2166136261;
  for (const ch of dateStr) seed = (seed ^ ch.charCodeAt(0)) * 16777619 >>> 0;
  const rand = () => {
    seed = seed * 1103515245 + 12345 & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr.slice(0, 4).map(c => c.id);
};
function CardFace({
  card,
  owned
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "card-face " + (card.gold ? 'gold ' : '') + (owned ? 'owned' : 'locked')
  }, owned ? card.img ? /*#__PURE__*/React.createElement(Img, {
    src: card.img,
    className: "cf-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "cf-emoji"
    }, card.emoji || '🎴')
  }) : /*#__PURE__*/React.createElement("span", {
    className: "cf-emoji"
  }, card.emoji || '🎴') : /*#__PURE__*/React.createElement("span", {
    className: "cf-q"
  }, "？"), /*#__PURE__*/React.createElement("span", {
    className: "cf-name"
  }, owned ? card.name : '？？？'), card.gold && /*#__PURE__*/React.createElement("span", {
    className: "cf-goldtag"
  }, "GOLD"));
}
function CollectionScreen({
  owned,
  claimed,
  onClaim,
  onBack,
  showToast
}) {
  const has = id => (owned[id] || 0) > 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "screen sheet-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onBack
  }, "← 戻る"), /*#__PURE__*/React.createElement("span", {
    className: "ghost-label"
  }, "📖 流派コレクション")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-scroll"
  }, CARD_SETS.map(set => {
    const done = set.cards.every(c => has(c.id));
    const isClaimed = claimed.includes(set.id);
    return /*#__PURE__*/React.createElement("div", {
      key: set.id,
      className: "card-set",
      style: {
        borderColor: set.color
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cs-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "cs-name",
      style: {
        color: set.color
      }
    }, set.name), /*#__PURE__*/React.createElement("span", {
      className: "cs-prog"
    }, set.cards.filter(c => has(c.id)).length, "/", set.cards.length)), /*#__PURE__*/React.createElement("div", {
      className: "card-row"
    }, set.cards.map(c => /*#__PURE__*/React.createElement(CardFace, {
      key: c.id,
      card: c,
      owned: has(c.id)
    }))), /*#__PURE__*/React.createElement("button", {
      className: "big-btn small " + (done && !isClaimed ? 'gold-btn' : 'disabled'),
      disabled: !done || isClaimed,
      onClick: () => onClaim(set)
    }, isClaimed ? '受取済み' : done ? `コンプ報酬：🎲${set.reward.rolls} 💰${fmt(set.reward.coins)}` : 'セット未完成'));
  })));
}

/* ============================================================
   CHARACTERS — 仲間の選択/装備画面（ランク別ロスター＋ピース進捗）
   ============================================================ */
function CharactersScreen({
  ownedPieces,
  equipped,
  onEquip,
  onBack,
  stage,
  charLevels = {},
  onLevelUp
}) {
  const ranks = ['normal', 'rare', 'epic', 'legend'];
  const eqChar = equipped && CHAR_BY_ID[equipped];
  return /*#__PURE__*/React.createElement("div", {
    className: "screen sheet-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onBack
  }, "← 戻る"), /*#__PURE__*/React.createElement("span", {
    className: "ghost-label"
  }, "🥷 仲間（キャラクター）")), /*#__PURE__*/React.createElement("div", {
    className: "char-equip-banner"
  }, eqChar ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
    src: charThumb(eqChar.id),
    className: "ceb-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 32
      }
    }, "🧙")
  }), /*#__PURE__*/React.createElement("div", {
    className: "ceb-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ceb-label"
  }, "装備中"), /*#__PURE__*/React.createElement("div", {
    className: "ceb-name"
  }, eqChar.name))) : /*#__PURE__*/React.createElement("div", {
    className: "ceb-empty"
  }, "仲間を装備しよう")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-scroll"
  }, ranks.map(rk => {
    const meta = CHAR_RANKS[rk];
    const list = CHARACTERS.filter(c => c.rank === rk);
    const ownedN = list.filter(c => (ownedPieces[c.id] || 0) >= CHAR_PIECE_GOAL).length;
    return /*#__PURE__*/React.createElement("div", {
      key: rk,
      className: "char-rank-sec",
      style: {
        borderColor: meta.color
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cs-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "cs-name",
      style: {
        color: meta.color
      }
    }, meta.label), /*#__PURE__*/React.createElement("span", {
      className: "cs-prog"
    }, ownedN, "/", list.length)), /*#__PURE__*/React.createElement("div", {
      className: "char-grid"
    }, list.map(c => {
      const pieces = ownedPieces[c.id] || 0;
      const complete = pieces >= CHAR_PIECE_GOAL;
      const stageOk = c.unlockStage <= stage;
      const hasProgress = pieces > 0;
      const reveal = stageOk || hasProgress; // 実名・実サムネ・進捗を公開する
      const owned = complete && stageOk; // 装備可能
      const locked = !reveal; // ＝ !stageOk && !hasProgress（真の未遭遇のみ）
      const lockBadge = !stageOk && hasProgress; // ステージ未到達だが公開済み（旧pendingを統合、コンプ有無問わず）
      const showProg = !complete && reveal; // 未コンプかつ公開済み → 進捗バー
      const on = equipped === c.id;
      return /*#__PURE__*/React.createElement("div", {
        key: c.id,
        className: "char-card " + (owned ? 'owned ' : '') + (lockBadge ? 'char-pending ' : '') + (locked ? 'locked ' : '') + (on ? 'equipped' : ''),
        style: {
          '--rk': meta.color
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "char-card-face"
      }, locked ? /*#__PURE__*/React.createElement("span", {
        className: "char-lock"
      }, "🔒") : /*#__PURE__*/React.createElement(Img, {
        src: charThumb(c.id),
        className: "char-card-img",
        fallback: /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 38
          }
        }, "🧙")
      }), /*#__PURE__*/React.createElement("span", {
        className: "char-rank-tag",
        style: {
          background: meta.color
        }
      }, meta.short)), /*#__PURE__*/React.createElement("div", {
        className: "char-card-name"
      }, locked ? '？？？' : c.name), /*#__PURE__*/React.createElement("div", {
        className: "char-card-desc"
      }, locked ? `ステージ${c.unlockStage}で解放` : c.desc), owned && /*#__PURE__*/React.createElement("button", {
        className: "char-eq-btn " + (on ? 'on' : ''),
        onClick: () => onEquip(c.id)
      }, on ? '装備中 ✓' : '装備する'), owned && (() => {
        const lv = charLevels[c.id] || 1;
        const isMax = lv >= CHAR_MAX_LEVEL;
        const cost = isMax ? 0 : charLevelCost(c.rank, lv);
        const canLvUp = !isMax && pieces - CHAR_PIECE_GOAL >= cost;
        return /*#__PURE__*/React.createElement("div", {
          className: "char-lv-block"
        }, /*#__PURE__*/React.createElement("span", {
          className: "char-lv-badge"
        }, "Lv", lv, "/", CHAR_MAX_LEVEL), isMax ? /*#__PURE__*/React.createElement("button", {
          className: "char-lvup-btn max",
          disabled: true
        }, "MAX") : /*#__PURE__*/React.createElement("button", {
          className: "char-lvup-btn" + (canLvUp ? '' : ' disabled'),
          disabled: !canLvUp,
          onClick: () => onLevelUp && onLevelUp(c.id)
        }, "レベルアップ（🧩", cost, "）"));
      })(), lockBadge && /*#__PURE__*/React.createElement("div", {
        className: "char-pending-badge"
      }, "ステージ", c.unlockStage, " 解放待ち"), showProg && /*#__PURE__*/React.createElement("div", {
        className: "char-prog"
      }, /*#__PURE__*/React.createElement("div", {
        className: "char-prog-bar"
      }, /*#__PURE__*/React.createElement("div", {
        className: "char-prog-fill",
        style: {
          width: pieces / CHAR_PIECE_GOAL * 100 + '%',
          background: meta.color
        }
      })), /*#__PURE__*/React.createElement("span", {
        className: "char-prog-txt"
      }, pieces, "/", CHAR_PIECE_GOAL, " かけら")));
    })));
  })));
}

/* ============================================================
   CLAN RAID — 一族＋協力ボス（10体ローテーション＋討伐専用編成）
   ============================================================ */
// --- 討伐戦ボス（10体、村ステージSTAGE_THEMESと1:1対応） ---
const RAID_BOSSES = [{
  n: 1,
  theme: 'himeji',
  name: '姫路の妖魔',
  img: 'Boss_himeji.png',
  bg: 'BG_Raid_himeji.png',
  emoji: '🏯'
}, {
  n: 2,
  theme: 'windsor',
  name: '鋼鉄の騎士王',
  img: 'Boss_windsor.png',
  bg: 'BG_Raid_windsor.png',
  emoji: '🛡️'
}, {
  n: 3,
  theme: 'tajmahal',
  name: '白亜の魔宮神',
  img: 'Boss_tajmahal.png',
  bg: 'BG_Raid_tajmahal.png',
  emoji: '🕌'
}, {
  n: 4,
  theme: 'egypt',
  name: '黄金のファラオ',
  img: 'Boss_egypt.png',
  bg: 'BG_Raid_egypt.png',
  emoji: '🐫'
}, {
  n: 5,
  theme: 'china',
  name: '紫禁の龍帝',
  img: 'Boss_china.png',
  bg: 'BG_Raid_china.png',
  emoji: '🐉'
}, {
  n: 6,
  theme: 'greece',
  name: '神殿の巨神',
  img: 'Boss_greece.png',
  bg: 'BG_Raid_greece.png',
  emoji: '🏛️'
}, {
  n: 7,
  theme: 'aztec',
  name: '石造の石神',
  img: 'Boss_aztec.png',
  bg: 'BG_Raid_aztec.png',
  emoji: '🗿'
}, {
  n: 8,
  theme: 'russia',
  name: '氷雪の熊将',
  img: 'Boss_russia.png',
  bg: 'BG_Raid_russia.png',
  emoji: '🐻'
}, {
  n: 9,
  theme: 'arabia',
  name: '灼熱の魔神',
  img: 'Boss_arabia.png',
  bg: 'BG_Raid_arabia.png',
  emoji: '🧞'
}, {
  n: 10,
  theme: 'dragon',
  name: '覇龍',
  img: 'Boss_dragon.png',
  bg: 'BG_Raid_dragon.png',
  emoji: '🐲'
}];
const RAID_MAX_BOSS = RAID_BOSSES.length; // = MAX_STAGE = 10

// --- ボス撃破報酬カーブ ---
const raidBossCoin = n => 200000 + 300000 * (n - 1); // boss1=200k … boss10=2.9M
const raidBossRolls = n => 20 + 5 * n; // 25 … 70
const RAID_MILESTONES = [75, 50, 25];
const RAID_MILESTONE_FRAC = {
  75: 0.08,
  50: 0.10,
  25: 0.12
};
const raidMilestoneReward = (n, m) => Math.round(raidBossCoin(n) * RAID_MILESTONE_FRAC[m]);

// --- ダメージ計算 ---
const RAID_DMG_MIN = 3,
  RAID_DMG_MAX = 60;
const raidBossTough = n => 2.5 + (n - 1) * 1.4;
const raidDamagePct = (partyAP, n) => Math.max(RAID_DMG_MIN, Math.min(RAID_DMG_MAX, Math.round((partyAP + 6) / raidBossTough(n))));
const RAID_PARTY_MAX = 4;
function ClanRaidScreen({
  onBack,
  addCoins,
  grantRolls,
  showToast,
  tickets,
  spendTicket,
  raid,
  setRaid,
  raidParty = [],
  charLevels = {},
  stage,
  onEditParty
}) {
  const {
    boss,
    hp,
    awaitingUnlock,
    allDone,
    claimedBosses = [],
    milestonesHit = [],
    log
  } = raid; // レイド進行はApp保持（再入場でリセットしない）
  const bossDef = RAID_BOSSES[boss - 1] || RAID_BOSSES[0];
  const defeated = hp <= 0;
  const partyAP = raidParty.reduce((s, id) => s + attackPower(id, charLevels[id] || 1), 0);
  const claimedThis = claimedBosses.includes(boss);
  const attack = () => {
    if (allDone || awaitingUnlock || defeated) return;
    if (tickets <= 0) {
      showToast('レイドチケット🎟️が必要');
      return;
    }
    if (!raidParty.length) {
      showToast('討伐編成を組もう');
      return;
    }
    spendTicket();
    const dmg = raidDamagePct(partyAP, boss);
    const nextHp = Math.max(0, hp - dmg);
    const newlyHit = RAID_MILESTONES.filter(m => hp > m && nextHp <= m && !milestonesHit.includes(m));
    let bonus = 0;
    if (newlyHit.length) {
      bonus = newlyHit.reduce((s, m) => s + raidMilestoneReward(boss, m), 0);
      addCoins(bonus);
      showToast(`🏯 ボスHP ${newlyHit[newlyHit.length - 1]}%突破！ 報酬 +${fmt(bonus)} 🪙`);
    }
    setRaid(r => ({
      ...r,
      hp: nextHp,
      log: nextHp <= 0 ? `🎉 ${bossDef.name} 撃破！一族の勝利！` : `🥷 一族が ${dmg}% 削った！`,
      milestonesHit: [...(r.milestonesHit || []), ...newlyHit]
    }));
  };
  const claim = () => {
    if (claimedBosses.includes(boss)) return;
    addCoins(raidBossCoin(boss));
    grantRolls && grantRolls(raidBossRolls(boss));
    showToast(`🎲 ロール +${raidBossRolls(boss)} 獲得！`);
    setRaid(r => {
      const cb = [...r.claimedBosses, boss];
      if (boss >= RAID_MAX_BOSS) return {
        ...r,
        claimedBosses: cb,
        allDone: true
      };
      if (stage >= boss + 1) return {
        ...r,
        claimedBosses: cb,
        boss: boss + 1,
        hp: 100,
        milestonesHit: [],
        log: `ボス${boss + 1}が出現した！`
      };
      return {
        ...r,
        claimedBosses: cb,
        awaitingUnlock: true
      };
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "screen sheet-screen",
    style: {
      backgroundImage: `url("${IMG}${bossDef.bg}")`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "result-dim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onBack
  }, "← 戻る"), /*#__PURE__*/React.createElement("span", {
    className: "ghost-label"
  }, "🎟️ レイドチケット × ", tickets)), /*#__PURE__*/React.createElement("div", {
    className: "raid-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "raid-title"
  }, "討伐戦 — ボス ", boss, "/", RAID_MAX_BOSS), /*#__PURE__*/React.createElement("div", {
    className: "raid-boss"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + bossDef.img,
    className: "raid-castle " + (defeated ? 'broken' : ''),
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 110
      }
    }, bossDef.emoji)
  }), defeated && /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Effect_Attack.png',
    className: "raid-fx",
    fallback: /*#__PURE__*/React.createElement("div", null)
  })), /*#__PURE__*/React.createElement("div", {
    className: "raid-boss-name"
  }, bossDef.name), /*#__PURE__*/React.createElement("div", {
    className: "raid-hpbar-frame"
  }, /*#__PURE__*/React.createElement("div", {
    className: "raid-hpbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "raid-hpfill",
    style: {
      width: hp + '%'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "raid-hptext"
  }, "ボスHP ", hp, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "raid-log"
  }, log), /*#__PURE__*/React.createElement("div", {
    className: "raid-party-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rpb-head"
  }, /*#__PURE__*/React.createElement("span", null, "討伐編成・合計攻撃力 ⚔️", fmt(partyAP)), /*#__PURE__*/React.createElement("button", {
    className: "raid-party-edit",
    onClick: onEditParty
  }, "編成 ✎")), /*#__PURE__*/React.createElement("div", {
    className: "raid-party-slots"
  }, Array.from({
    length: RAID_PARTY_MAX
  }).map((_, i) => {
    const id = raidParty[i];
    const c = id && CHAR_BY_ID[id];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "raid-party-slot" + (c ? ' filled' : ''),
      onClick: !c ? onEditParty : undefined
    }, c ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
      src: charThumb(c.id),
      className: "rps-img",
      fallback: /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 26
        }
      }, "🧙")
    }), /*#__PURE__*/React.createElement("span", {
      className: "rps-name"
    }, c.name), /*#__PURE__*/React.createElement("span", {
      className: "rps-lv"
    }, "Lv", charLevels[c.id] || 1)) : /*#__PURE__*/React.createElement("span", {
      className: "rps-plus"
    }, "＋"));
  }))), allDone ? /*#__PURE__*/React.createElement("div", {
    className: "raid-done"
  }, /*#__PURE__*/React.createElement("div", {
    className: "raid-done-title"
  }, "🏆 討伐完了！"), /*#__PURE__*/React.createElement("div", {
    className: "raid-log"
  }, "全10体のボスを討伐した。一族の伝説は語り継がれる。")) : awaitingUnlock ? /*#__PURE__*/React.createElement("div", {
    className: "raid-log",
    style: {
      marginTop: 8
    }
  }, "次のボスはステージ", boss + 1, "到達で出現します") : defeated ? /*#__PURE__*/React.createElement("button", {
    className: "big-btn gold-btn" + (claimedThis ? ' disabled' : ''),
    disabled: claimedThis,
    onClick: claim
  }, claimedThis ? '受取済み' : `報酬を受け取る 💰${fmt(raidBossCoin(boss))}`) : /*#__PURE__*/React.createElement("button", {
    className: "big-btn red-btn" + (tickets > 0 && raidParty.length ? '' : ' disabled'),
    onClick: attack
  }, "攻撃する！ 🎟️×1"), !allDone && !awaitingUnlock && !defeated && tickets <= 0 && /*#__PURE__*/React.createElement("div", {
    className: "raid-log",
    style: {
      marginTop: 8
    }
  }, "🎟️チケットはゾロ目小判で入手できます"), !allDone && !awaitingUnlock && !defeated && tickets > 0 && !raidParty.length && /*#__PURE__*/React.createElement("div", {
    className: "raid-log",
    style: {
      marginTop: 8
    }
  }, "討伐編成を1体以上組もう")));
}

/* ============================================================
   RAID PARTY — 討伐編成画面（所持キャラから最大4体を選出）
   ============================================================ */
function RaidPartyScreen({
  ownedPieces,
  charLevels = {},
  party = [],
  onToggle,
  onBack,
  stage
}) {
  const ranks = ['normal', 'rare', 'epic', 'legend'];
  const sumAP = party.reduce((s, id) => s + attackPower(id, charLevels[id] || 1), 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "screen sheet-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onBack
  }, "← 戻る"), /*#__PURE__*/React.createElement("span", {
    className: "ghost-label"
  }, "🗡️ 討伐編成")), /*#__PURE__*/React.createElement("div", {
    className: "char-equip-banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ceb-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ceb-label"
  }, "編成 ", party.length, "/", RAID_PARTY_MAX), /*#__PURE__*/React.createElement("div", {
    className: "ceb-name"
  }, "合計攻撃力 ⚔️", fmt(sumAP)))), /*#__PURE__*/React.createElement("div", {
    className: "sheet-scroll"
  }, ranks.map(rk => {
    const meta = CHAR_RANKS[rk];
    const list = CHARACTERS.filter(c => c.rank === rk);
    return /*#__PURE__*/React.createElement("div", {
      key: rk,
      className: "char-rank-sec",
      style: {
        borderColor: meta.color
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cs-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "cs-name",
      style: {
        color: meta.color
      }
    }, meta.label)), /*#__PURE__*/React.createElement("div", {
      className: "char-grid"
    }, list.map(c => {
      const pieces = ownedPieces[c.id] || 0;
      const owned = pieces >= CHAR_PIECE_GOAL && c.unlockStage <= stage;
      const locked = !owned;
      const lv = charLevels[c.id] || 1;
      const selIdx = party.indexOf(c.id);
      const selected = selIdx >= 0;
      const full = !selected && party.length >= RAID_PARTY_MAX;
      return /*#__PURE__*/React.createElement("div", {
        key: c.id,
        className: "char-card raid-pick " + (owned ? 'owned ' : '') + (locked ? 'locked ' : '') + (selected ? 'selected ' : '') + (full ? 'full-disabled' : ''),
        style: {
          '--rk': meta.color
        },
        onClick: () => owned && onToggle(c.id)
      }, /*#__PURE__*/React.createElement("div", {
        className: "char-card-face"
      }, locked ? /*#__PURE__*/React.createElement("span", {
        className: "char-lock"
      }, "🔒") : /*#__PURE__*/React.createElement(Img, {
        src: charThumb(c.id),
        className: "char-card-img",
        fallback: /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 38
          }
        }, "🧙")
      }), /*#__PURE__*/React.createElement("span", {
        className: "char-rank-tag",
        style: {
          background: meta.color
        }
      }, meta.short), selected && /*#__PURE__*/React.createElement("span", {
        className: "raid-pick-badge"
      }, selIdx + 1)), /*#__PURE__*/React.createElement("div", {
        className: "char-card-name"
      }, locked ? '？？？' : c.name), owned ? /*#__PURE__*/React.createElement("div", {
        className: "char-atk-badge"
      }, "⚔️", attackPower(c.id, lv), "\u3000Lv", lv) : /*#__PURE__*/React.createElement("div", {
        className: "char-card-desc"
      }, "未入手"));
    })));
  })));
}

/* ============================================================
   SEASON — シーズンパス（XP=ロール数）
   ============================================================ */
// 報酬は {kind, amt, text?} で保持（絵文字パースをやめ、アイコンは画像で表示）
const SEASON_TIERS = [{
  xp: 0,
  kind: 'roll',
  amt: 10
}, {
  xp: 5,
  kind: 'coin',
  amt: 20000
}, {
  xp: 12,
  kind: 'shield',
  amt: 1
}, {
  xp: 20,
  kind: 'roll',
  amt: 30
}, {
  xp: 30,
  kind: 'coin',
  amt: 80000
}, {
  xp: 42,
  kind: 'card',
  text: 'カード'
}, {
  xp: 55,
  kind: 'roll',
  amt: 50
}, {
  xp: 70,
  kind: 'coin',
  amt: 200000
}, {
  xp: 88,
  kind: 'cosmetic',
  text: '限定衣装'
}];
// 報酬アイコン（画像）と絵文字フォールバック
const REWARD_ICON = {
  roll: 'Icon_Dice.png',
  coin: 'Koban_Small.png',
  shield: 'Icon_Shield.png',
  card: 'Icon_Card.png',
  cosmetic: 'Icon_Crown.png'
};
const REWARD_EMOJI = {
  roll: '🎲',
  coin: '💰',
  shield: '🛡️',
  card: '🎴',
  cosmetic: '👑'
};
const rewardLabel = r => r.text || (r.kind === 'shield' ? '+' + r.amt : fmt(r.amt));
function RewardChip({
  r
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "reward-chip"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + REWARD_ICON[r.kind],
    className: "reward-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, REWARD_EMOJI[r.kind])
  }), rewardLabel(r));
}
function SeasonScreen({
  xp,
  claimed,
  onClaim,
  onBack
}) {
  // 次に到達すべきティア（未解放の最初のもの）を算出。全解放済なら MAX。
  const nextTier = SEASON_TIERS.find(t => xp < t.xp);
  const prevXp = SEASON_TIERS.filter(t => t.xp <= xp).reduce((m, t) => Math.max(m, t.xp), 0);
  const isMax = !nextTier;
  const target = isMax ? xp : nextTier.xp;
  const pct = isMax ? 100 : Math.max(0, Math.min(100, (xp - prevXp) / (target - prevXp) * 100));
  return /*#__PURE__*/React.createElement("div", {
    className: "screen season-screen",
    style: {
      backgroundImage: `url("${IMG}BG_Season.png")`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onBack
  }, "← 戻る")), /*#__PURE__*/React.createElement(ScrollBanner, {
    title: "花見シーズン",
    sub: "ロールでXPを貯めよう",
    className: "season-title"
  }), /*#__PURE__*/React.createElement("div", {
    className: "season-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "season-xpbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sx-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sx-label"
  }, "🎫 シーズンXP"), /*#__PURE__*/React.createElement("b", {
    className: "sx-val"
  }, xp)), /*#__PURE__*/React.createElement("div", {
    className: "sx-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sx-fill",
    style: {
      width: pct + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sx-next"
  }, isMax ? 'MAX 到達！全報酬解放' : `次の報酬まで あと ${target - xp} XP（${target}XP）`)), /*#__PURE__*/React.createElement("div", {
    className: "sheet-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "season-track"
  }, SEASON_TIERS.map((t, i) => {
    const unlocked = xp >= t.xp;
    const isClaimed = claimed.includes(i);
    const state = isClaimed ? 'claimed' : unlocked ? 'on' : 'locked';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "season-tier " + state
    }, /*#__PURE__*/React.createElement("div", {
      className: "st-tier"
    }, "Lv", i + 1), /*#__PURE__*/React.createElement("div", {
      className: "st-reward"
    }, /*#__PURE__*/React.createElement(RewardChip, {
      r: t
    })), /*#__PURE__*/React.createElement("div", {
      className: "st-req"
    }, t.xp, "XP"), /*#__PURE__*/React.createElement("button", {
      className: "tier-btn " + (unlocked && !isClaimed ? 'ready' : ''),
      disabled: !unlocked || isClaimed,
      onClick: () => onClaim(i)
    }, isClaimed ? '✓' : unlocked ? '受取' : '🔒'));
  })))));
}

/* ============================================================
   INVITE — 招待マイルストン
   ============================================================ */
const INVITE_MILES = [{
  label: '友達がゲームを開始',
  reward: {
    kind: 'roll',
    amt: 25
  },
  done: true
}, {
  label: '友達がステージ3到達',
  reward: {
    kind: 'coin',
    amt: 100000
  },
  done: true
}, {
  label: '友達が一族に加入',
  reward: {
    kind: 'roll',
    amt: 50
  },
  done: false
}, {
  label: '友達が初回購入',
  reward: {
    kind: 'cosmetic',
    text: '限定ペット'
  },
  done: false
}];
function InviteScreen({
  onBack,
  showToast,
  grantRolls,
  addCoins
}) {
  const [claimed, setClaimed] = useState([]);
  const claim = (i, reward) => {
    setClaimed(c => [...c, i]);
    if (reward.kind === 'roll' && grantRolls) grantRolls(reward.amt || 0);else if (reward.kind === 'coin' && addCoins) addCoins(reward.amt || 0);
    showToast('招待報酬を受け取りました！');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "screen sheet-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onBack
  }, "← 戻る"), /*#__PURE__*/React.createElement("span", {
    className: "ghost-label"
  }, "👥 友達を招待")), /*#__PURE__*/React.createElement("div", {
    className: "invite-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "invite-code"
  }, "招待コード： ", /*#__PURE__*/React.createElement("b", null, "NINJA-7F3K")), /*#__PURE__*/React.createElement("button", {
    className: "big-btn green-btn",
    onClick: () => showToast('リンクをコピーしました')
  }, "招待リンクをコピー")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-scroll"
  }, INVITE_MILES.map((m, i) => {
    const isClaimed = claimed.includes(i);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "invite-mile " + (m.done ? 'reached' : '')
    }, /*#__PURE__*/React.createElement("span", {
      className: "im-check"
    }, m.done ? '✅' : '⬜'), /*#__PURE__*/React.createElement("span", {
      className: "im-label"
    }, m.label), /*#__PURE__*/React.createElement("span", {
      className: "im-reward"
    }, /*#__PURE__*/React.createElement(RewardChip, {
      r: m.reward
    })), /*#__PURE__*/React.createElement("button", {
      className: "tier-btn " + (m.done && !isClaimed ? 'ready' : ''),
      disabled: !m.done || isClaimed,
      onClick: () => claim(i, m.reward)
    }, isClaimed ? '✓' : m.done ? '受取' : '🔒'));
  })));
}

/* ============================================================
   SHOP — 課金ショップ（モック）
   ============================================================ */
const SHOP_PACKS = [{
  id: 's',
  title: '見習いパック',
  price: '¥120',
  coins: 100000,
  rolls: 20,
  tag: ''
}, {
  id: 'm',
  title: '忍者パック',
  price: '¥610',
  coins: 600000,
  rolls: 120,
  tag: '人気'
}, {
  id: 'l',
  title: '大名パック',
  price: '¥3,060',
  coins: 3500000,
  rolls: 700,
  tag: 'お得'
}, {
  id: 'vip',
  title: 'VIP（月額）',
  price: '¥980',
  coins: 0,
  rolls: 0,
  tag: '広告除去+日替ボーナス'
}];
function ShopScreen({
  onBack,
  onBuyPack,
  coins,
  shopOffers,
  shopBought,
  ownedPieces,
  onBuyPiece,
  kobanItems,
  onBuyKoban,
  charLevels = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "screen sheet-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mini-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    onClick: onBack
  }, "← 戻る"), /*#__PURE__*/React.createElement("span", {
    className: "ghost-label"
  }, "🛒 Shinobi Mart"), /*#__PURE__*/React.createElement("span", {
    className: "shop-coins"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Small.png',
    className: "sc-koban",
    fallback: /*#__PURE__*/React.createElement("span", null, "🪙")
  }), " ", fmt(coins))), /*#__PURE__*/React.createElement("div", {
    className: "sheet-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shop-sec-title"
  }, "🧩 日替りピース"), /*#__PURE__*/React.createElement("span", {
    className: "shop-sec-note"
  }, "毎日入れ替わり・各1回")), /*#__PURE__*/React.createElement("div", {
    className: "piece-grid"
  }, shopOffers.map(id => {
    const ch = CHAR_BY_ID[id];
    if (!ch) return null;
    const rk = CHAR_RANKS[ch.rank];
    const price = CHAR_SHOP_PRICE[ch.rank];
    const bought = shopBought.includes(id);
    const pieces = ownedPieces[id] || 0;
    const unlocked = pieces >= CHAR_PIECE_GOAL; // 解放済み（旧 done）。解放後もピースは強化素材として購入可
    const lv = charLevels[id] || 1;
    const maxed = unlocked && lv >= CHAR_MAX_LEVEL; // Lv最大＝ピースが完全に無駄になるため購入不可
    const poor = coins < price.coins;
    const disabled = bought || maxed;
    return /*#__PURE__*/React.createElement("div", {
      key: id,
      className: "piece-offer " + (bought ? 'bought ' : '') + (maxed ? 'maxed' : ''),
      style: {
        '--rk': rk.color
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "po-face"
    }, /*#__PURE__*/React.createElement(Img, {
      src: charThumb(id),
      className: "po-img",
      fallback: /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 34
        }
      }, "🧙")
    }), /*#__PURE__*/React.createElement("span", {
      className: "char-rank-tag",
      style: {
        background: rk.color
      }
    }, rk.short)), unlocked && /*#__PURE__*/React.createElement("span", {
      className: "po-owned-badge"
    }, "✅ 解放済 Lv", lv), /*#__PURE__*/React.createElement("div", {
      className: "po-name"
    }, ch.name), /*#__PURE__*/React.createElement("div", {
      className: "po-amt"
    }, unlocked ? `強化かけら +${price.pieces}` : `かけら +${price.pieces}`), /*#__PURE__*/React.createElement("button", {
      className: "po-buy " + (disabled ? 'disabled' : poor ? 'poor' : 'buy'),
      disabled: disabled,
      onClick: () => onBuyPiece(id)
    }, bought ? '購入済み' : maxed ? 'Lv最大' : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'Koban_Small.png',
      className: "po-koban",
      fallback: /*#__PURE__*/React.createElement("span", null, "🪙")
    }), fmt(price.coins))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shop-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shop-sec-title"
  }, "🪙 こばんショップ"), /*#__PURE__*/React.createElement("span", {
    className: "shop-sec-note"
  }, "各1回／日")), /*#__PURE__*/React.createElement("div", {
    className: "koban-grid"
  }, kobanItems.map(it => {
    const poor = coins < it.coins;
    const bought = shopBought.includes(it.id);
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      className: "koban-item " + (bought ? 'bought' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "ki-label"
    }, it.sub, " ", it.label), /*#__PURE__*/React.createElement("button", {
      className: "po-buy " + (bought ? 'disabled' : poor ? 'poor' : 'buy'),
      disabled: bought,
      onClick: () => onBuyKoban(it)
    }, bought ? '購入済み' : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
      src: IMG + 'Koban_Small.png',
      className: "po-koban",
      fallback: /*#__PURE__*/React.createElement("span", null, "🪙")
    }), fmt(it.coins))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shop-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shop-sec-title"
  }, "💎 パック")), /*#__PURE__*/React.createElement("div", {
    className: "shop-grid"
  }, SHOP_PACKS.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "shop-pack"
  }, p.tag && /*#__PURE__*/React.createElement("span", {
    className: "pack-tag"
  }, p.tag), /*#__PURE__*/React.createElement("div", {
    className: "pack-title"
  }, p.title), /*#__PURE__*/React.createElement("div", {
    className: "pack-contents"
  }, p.coins > 0 && /*#__PURE__*/React.createElement("div", null, "🪙 ", fmt(p.coins)), p.rolls > 0 && /*#__PURE__*/React.createElement("div", null, "🎲 ", p.rolls), p.id === 'vip' && /*#__PURE__*/React.createElement("div", null, "👑 特典")), /*#__PURE__*/React.createElement("button", {
    className: "big-btn small gold-btn",
    onClick: () => onBuyPack(p)
  }, p.price)))))));
}

/* ============================================================
   MENU — ナビゲーション
   ============================================================ */
const MENU_ITEMS = [{
  screen: 'castle',
  icon: '🏯',
  img: 'Icon_Village.png',
  label: '村建設'
}, {
  screen: 'characters',
  icon: '🥷',
  img: 'Char_maneki_1.png',
  label: '仲間'
}, {
  screen: 'collection',
  icon: '📖',
  img: 'Icon_Card.png',
  label: 'コレクション'
}, {
  screen: 'clan',
  icon: '🗡️',
  img: 'Icon_Clan.png',
  label: '一族レイド'
}, {
  screen: 'season',
  icon: '🎫',
  img: 'Icon_Event.png',
  label: 'シーズン'
}, {
  screen: 'invite',
  icon: '👥',
  img: 'Icon_Invite.png',
  label: '招待'
}, {
  screen: 'shop',
  icon: '🛒',
  img: 'Icon_Shop.png',
  label: 'ショップ'
}];
function MenuOverlay({
  onPick,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "menu-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "menu-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "menu-title"
  }, "メニュー"), /*#__PURE__*/React.createElement("div", {
    className: "menu-grid"
  }, MENU_ITEMS.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.screen,
    className: "menu-item",
    onClick: () => onPick(m.screen)
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + m.img,
    className: "mi-icon-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "mi-icon"
    }, m.icon)
  }), /*#__PURE__*/React.createElement("span", {
    className: "mi-label"
  }, m.label)))), /*#__PURE__*/React.createElement("button", {
    className: "big-btn small green-btn",
    onClick: onClose
  }, "閉じる")));
}

/* ============================================================
   MULTIPLIER OVERLAY — ゾロ目（Jackpot等）のコイン×倍率演出
   ============================================================ */
// ジャックポット6報酬のアイコン（label→画像）。無い場合はemojiにフォールバック。
const JACKPOT_ICON = {
  '小判雨': {
    img: IMG + 'Koban_Small.png',
    emoji: '🪙'
  },
  'お宝箱': {
    img: IMG + 'TreasureBox_Open.png',
    emoji: '🎁'
  },
  '大当たり': {
    img: IMG + 'Koban_Large.png',
    emoji: '💰'
  },
  'レア確定': {
    img: IMG + 'Icon_Card.png',
    emoji: '🃏'
  },
  '忍者召喚': {
    img: IMG + 'Chara_NinjaFox.png',
    emoji: '🦊'
  },
  '超JP': {
    img: IMG + 'Icon_Crown.png',
    emoji: '👑'
  }
};
function JackpotTile({
  item,
  win
}) {
  const ic = JACKPOT_ICON[item.label] || {};
  return /*#__PURE__*/React.createElement("div", {
    className: "jp-tile" + (win ? " win" : "")
  }, /*#__PURE__*/React.createElement(Img, {
    src: ic.img,
    className: "jpt-ico",
    fallback: /*#__PURE__*/React.createElement("span", {
      className: "jpt-ico jpt-emoji"
    }, ic.emoji || '⭐')
  }), /*#__PURE__*/React.createElement("div", {
    className: "jpt-text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "jpt-name"
  }, item.label), /*#__PURE__*/React.createElement("div", {
    className: "jpt-mult"
  }, item.sub, item.treasure ? ' 🎁' : '')));
}
function MultiplierOverlay({
  base,
  result,
  summon = null,
  boxReward = null,
  pool,
  betMult = 1,
  onDone
}) {
  // ジャックポットは6種の報酬から抽選。当選(result)は確定済み。
  // どの報酬が並ぶか見えるよう「縦スロットリール」で高速回転→減速→当選タイルを中央の当たりラインに停止。
  const items = pool && pool.length ? pool : [result];
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
  const disp = useCountUp(total, 1600, phase === 'total');
  const doneRef = useRef(false);
  const timersRef = useRef([]);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(total);
  };
  useEffect(() => {
    const T = timersRef.current;
    // 1) transformを効かせるため一拍おいてから finalY へ（fast→減速→着地）
    T.push(setTimeout(() => {
      setSpinning(true);
      setOffset(finalY);
    }, 30));
    // 回転中の控えめなチッ音
    const tick = setInterval(() => SFX.tap(), 110);
    T.push(setTimeout(() => clearInterval(tick), 2600));
    // 2) 回転完了 → 着地
    T.push(setTimeout(() => {
      setPhase('land');
      SFX.jackpot();
    }, 2780));
    // 3) 着地の強調のあと payout を表示
    T.push(setTimeout(() => setPhase('total'), 3680));
    // 4) 自動で受け取り（tapでも可）
    T.push(setTimeout(finish, 3680 + 4500));
    return () => {
      clearInterval(tick);
      T.forEach(clearTimeout);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "mult-overlay jackpot",
    onClick: () => {
      if (phase === 'total') finish();
    },
    style: {
      backgroundImage: `url("${IMG}BG_Jackpot.png")`
    }
  }, phase !== 'spin' && /*#__PURE__*/React.createElement("div", {
    className: "mult-flash"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mult-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mult-label"
  }, "🎉 ジャックポット！", phase === 'spin' && /*#__PURE__*/React.createElement("span", {
    className: "mult-sub2"
  }, "…どの報酬？")), /*#__PURE__*/React.createElement("div", {
    className: "jp-slot " + phase
  }, /*#__PURE__*/React.createElement("div", {
    className: "jp-slot-line"
  }), /*#__PURE__*/React.createElement("div", {
    className: "jp-reel",
    style: {
      transform: `translateY(${offset}px)`,
      transition: spinning ? 'transform 2.7s cubic-bezier(.12,.75,.2,1)' : 'none'
    }
  }, displayItems.map((it, k) => /*#__PURE__*/React.createElement(JackpotTile, {
    key: k,
    item: it,
    win: phase !== 'spin' && k === winIdx
  })))), phase === 'total' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mult-base"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Koban_Small.png',
    className: "mb-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, "🪙")
  }), " ", fmt(base)), /*#__PURE__*/React.createElement("div", {
    className: "mult-x"
  }, "× ", mult, betMult > 1 ? ` × ${betMult}` : '', result.treasure ? ' ＋🎁' : ''), /*#__PURE__*/React.createElement("div", {
    className: "mult-total gold-text"
  }, "= +", fmt(disp), " 🪙"), summon && /*#__PURE__*/React.createElement("div", {
    className: "jp-summon " + summon.char.rank
  }, /*#__PURE__*/React.createElement(Img, {
    src: charThumb(summon.char.id),
    className: "jp-summon-ico",
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 30
      }
    }, "🥷")
  }), /*#__PURE__*/React.createElement("span", {
    className: "jp-summon-txt"
  }, "仲間召喚！ ", /*#__PURE__*/React.createElement("b", null, summon.char.name), /*#__PURE__*/React.createElement("br", null), "かけら +", summon.amount)), boxReward && /*#__PURE__*/React.createElement("div", {
    className: "jp-boxreward"
  }, /*#__PURE__*/React.createElement("div", {
    className: "jp-box-head"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'TreasureBox_Open.png',
    className: "jp-box-ico",
    fallback: /*#__PURE__*/React.createElement("span", null, "🎁")
  }), "宝箱の中身"), /*#__PURE__*/React.createElement("div", {
    className: "jp-box-tile " + boxReward.type
  }, boxReward.type === 'card' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
    src: boxReward.card.img,
    className: "jp-box-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 28
      }
    }, "🎴")
  }), /*#__PURE__*/React.createElement("span", {
    className: "jp-box-cap"
  }, boxReward.card.gold ? '★' : '', "カード")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Img, {
    src: charThumb(boxReward.char.id),
    className: "jp-box-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 28
      }
    }, "🥷")
  }), /*#__PURE__*/React.createElement("span", {
    className: "jp-box-cap"
  }, boxReward.char.name, /*#__PURE__*/React.createElement("br", null), "かけら +", boxReward.amount)))), /*#__PURE__*/React.createElement("div", {
    className: "mult-tap"
  }, "タップで受け取る"))));
}

/* ============================================================
   SHIELD OVERLAY — シールドぞろ目の獲得演出（青・盾スラム＋ピル充填）
   ============================================================ */
function ShieldOverlay({
  onDone
}) {
  const [phase, setPhase] = useState('in'); // in → fill
  useEffect(() => {
    SFX.shield();
    const t1 = setTimeout(() => setPhase('fill'), 520);
    const t2 = setTimeout(() => onDone(), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "shield-overlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shield-flash"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shield-rays"
  }), /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Effect_Shield.png',
    className: "shield-fx",
    fallback: /*#__PURE__*/React.createElement("div", null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "shield-inner"
  }, /*#__PURE__*/React.createElement(Img, {
    src: IMG + 'Icon_Shield.png',
    className: "shield-big",
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 120
      }
    }, "🛡️")
  }), /*#__PURE__*/React.createElement("div", {
    className: "shield-title"
  }, "シールド ぞろ目！"), /*#__PURE__*/React.createElement("div", {
    className: "shield-pips"
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: phase === 'fill' ? 'on' : '',
    style: {
      transitionDelay: i * 170 + 'ms'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shield-sub"
  }, "🛡️ 次の攻撃を防ぐ")));
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
  useEffect(() => {
    lsSet('ndm_stage', stage);
  }, [stage]);
  // 村の建築状況はApp側で保持（建築画面を離れて戻ってもリセットしない）＆ localStorageに建物レベルのみ永続化
  const [castleVillage, setCastleVillage] = useState(() => {
    const qs = new URLSearchParams(window.location.search);
    const qStage = parseInt(qs.get('stg'), 10);
    const useQuery = !!qStage || qs.has('castleclear');
    const st = qStage || lsGet('ndm_stage', 1);
    const base = themedVillage(st, {
      max: qs.has('castleclear')
    });
    if (useQuery) return base; // URLパラメータ指定時は保存データを無視
    const saved = lsGet('ndm_village', null); // { stage, levels: {id: level} }
    if (saved && saved.stage === st && saved.levels) {
      return base.map(it => ({
        ...it,
        level: Math.min(saved.levels[it.id] ?? it.level, it.stages.length - 1)
      }));
    }
    return base;
  });
  useEffect(() => {
    lsSet('ndm_village', {
      stage,
      levels: Object.fromEntries(castleVillage.map(it => [it.id, it.level]))
    });
  }, [castleVillage, stage]);
  const [rolls, setRolls] = useState(50);
  const [rollsMax] = useState(50);
  const [opponent, setOpponent] = useState(() => {
    const o = makeOpponent(OPP_BY_KEY[new URLSearchParams(window.location.search).get('opp')] || OPP_BY_KEY.tanaka);
    const qsp = new URLSearchParams(window.location.search);
    if (qsp.has('oppshield')) o.shields = parseInt(qsp.get('oppshield'), 10);
    return o;
  });

  // ?screen=bonus|attackSelect|attackResult|steal|castle — jump straight to a screen (dev/preview)
  const qp = new URLSearchParams(window.location.search);
  const initScreen = qp.get('screen') || 'main';
  const initFlow = {
    bonus: {
      trigger: qp.get('trigger') || 'attack'
    },
    attackSelect: {
      bonusResult: BONUS_DICE_TABLES.attack[5]
    },
    attackResult: {
      attackResult: {
        success: true,
        coinGain: 75000,
        partLabel: '武家屋敷'
      }
    },
    steal: {
      stealMultiplier: 2
    }
  }[initScreen] || {};
  const [screen, setScreen] = useState(initScreen);
  const [flow, setFlow] = useState(initFlow);
  const [zorumeFace, setZorumeFace] = useState(null);
  const [multFx, setMultFx] = useState(null); // {base, mult} ジャックポット等の倍率演出
  const [shieldFx, setShieldFx] = useState(false); // シールドぞろ目の獲得演出
  const [toast, setToast] = useState('');
  const [night, setNight] = useState(qp.has('night'));
  // collection / season / cards
  const [ownedCards, setOwnedCards] = useState({}); // {cardId: count}
  const ownedRef = useRef({}); // 所持カードの同期ミラー（カードドロップの即時判定用）
  useEffect(() => {
    ownedRef.current = ownedCards;
  }, [ownedCards]);
  const [claimedSets, setClaimedSets] = useState([]);
  const [seasonXP, setSeasonXP] = useState(0);
  const [claimedTiers, setClaimedTiers] = useState([]);
  const [cardPopup, setCardPopup] = useState(null); // {card, isNew}
  const [tickets, setTickets] = useState(1); // レイドチケット（ゾロ目小判で入手・レイドで消費）
  // キャラ（仲間）：ピース所持数・装備中キャラ。localStorage 永続。
  const [ownedCharPieces, setOwnedCharPieces] = useState(() => lsGet('ndm_char_pieces', {}));
  const ownedPiecesRef = useRef(ownedCharPieces);
  useEffect(() => {
    ownedPiecesRef.current = ownedCharPieces;
    lsSet('ndm_char_pieces', ownedCharPieces);
  }, [ownedCharPieces]);
  const [equippedChar, setEquippedChar] = useState(() => lsGet('ndm_char_equipped', null));
  useEffect(() => {
    lsSet('ndm_char_equipped', equippedChar);
  }, [equippedChar]);
  // キャラのレベル（ピース購入で最大Lv5まで強化。討伐戦の攻撃力・装備効果に反映）。localStorage 永続。
  const [charLevels, setCharLevels] = useState(() => lsGet('ndm_char_levels', {}));
  useEffect(() => {
    lsSet('ndm_char_levels', charLevels);
  }, [charLevels]);
  // 討伐戦専用の編成（最大4体）。localStorage 永続。
  const [raidParty, setRaidParty] = useState(() => lsGet('ndm_raid_party', []));
  useEffect(() => {
    lsSet('ndm_raid_party', raidParty);
  }, [raidParty]);
  const eff = activeEffect(equippedChar, charLevels[equippedChar] || 1); // 装備キャラの有効 effect（レベル反映）
  const effRef = useRef(eff);
  effRef.current = eff; // フロー/タイマー内での参照用
  const [charPopup, setCharPopup] = useState(null); // {char, pending} 新キャラ入手演出（pending=ステージ未到達で解放待ち）
  // Shinobi Mart のピース日替り（4種・各1回）。日付が変われば再抽選。
  const [charShop, setCharShop] = useState(() => {
    const today = todayStr();
    const saved = lsGet('ndm_charshop', null);
    if (saved && saved.date === today && Array.isArray(saved.offers)) return saved;
    const stg = parseInt(new URLSearchParams(window.location.search).get('stg'), 10) || 1;
    return {
      date: today,
      offers: buildDailyOffers(stg, today),
      bought: []
    };
  });
  useEffect(() => {
    lsSet('ndm_charshop', charShop);
  }, [charShop]);
  // レイド進行はApp側で保持（画面を離れて戻ってもボスHPがリセットされない）。10体ローテーション・localStorage 永続。
  const RAID_DEFAULT = {
    boss: 1,
    hp: 100,
    awaitingUnlock: false,
    allDone: false,
    claimedBosses: [],
    milestonesHit: [],
    log: '一族で強敵を討伐せよ！'
  };
  const [raid, setRaid] = useState(() => {
    const s = lsGet('ndm_raid', null);
    return s && Number.isInteger(s.boss) ? {
      ...RAID_DEFAULT,
      ...s
    } : RAID_DEFAULT;
  });
  useEffect(() => {
    lsSet('ndm_raid', raid);
  }, [raid]);
  const [bet, setBet] = useState(1); // ロールポイント倍率（1〜3）：消費ロール＆報酬に同倍率
  const betRef = useRef(1);
  betRef.current = bet; // フロー中の報酬計算で参照（stale closure回避）
  const [auto, setAuto] = useState(qp.has('auto')); // オートロール（App 側で保持：画面遷移で MainRoll が再マウントされても維持）
  // ダイスのロール演出スタイル：'3d'（立体・既定）/ 'toss'（下から飛ばす）/ 'classic'（回転）。いつでも切替可（localStorage保持）
  const [rollAnim, setRollAnim] = useState(() => {
    try {
      return localStorage.getItem('ndm_rollanim') || qp.get('rollanim') || '3d';
    } catch (e) {
      return qp.get('rollanim') || '3d';
    }
  });
  const toggleRollAnim = useCallback(() => setRollAnim(a => {
    const order = ['3d', 'toss', 'classic'];
    const nx = order[(order.indexOf(a) + 1) % order.length];
    try {
      localStorage.setItem('ndm_rollanim', nx);
    } catch (e) {}
    return nx;
  }), []);
  const coinsRef = useRef(coins);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // 討伐戦：報酬受取後、次ボスの解放待ち（awaitingUnlock）だった場合は村ステージが追いついた瞬間に出現させる。
  // ClanRaidScreen が非マウントでも進行させる必要があるため App 側に置く。
  useEffect(() => {
    setRaid(r => {
      if (r.awaitingUnlock && !r.allDone && stage >= r.boss + 1) {
        return {
          ...r,
          boss: r.boss + 1,
          hp: 100,
          awaitingUnlock: false,
          milestonesHit: [],
          log: `ボス${r.boss + 1}が出現した！`
        };
      }
      return r;
    });
  }, [stage]);
  const showToast = useCallback(msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 1700);
  }, []);
  const go = useCallback((s, data = {}) => {
    setFlow(data);
    setScreen(s);
  }, []);

  // animated coin add
  const addCoins = useCallback(delta => {
    const from = coinsRef.current,
      to = from + delta,
      dur = 700;
    let start = null;
    const step = now => {
      if (start === null) start = now;
      const t = Math.max(0, Math.min(1, (now - start) / dur));
      const eased = 1 - Math.pow(1 - t, 3);
      setCoins(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);
  const spendCoins = useCallback(n => setCoins(c => Math.max(0, c - n)), []);
  const grantShields = useCallback(n => setShields(s => Math.min(3, s + n)), []);
  const grantRolls = useCallback(n => setRolls(r => r + n), []);
  const grantTickets = useCallback(n => setTickets(t => t + n), []);
  const spendTicket = useCallback(() => setTickets(t => Math.max(0, t - 1)), []);
  const useRolls = useCallback(n => {
    setRolls(r => Math.max(0, r - n));
    setSeasonXP(x => x + n);
  }, []);
  const nextStage = useCallback(() => {
    setStage(s => Math.min(MAX_STAGE, s + 1));
    const sh = effRef.current.startShields || 0; // 石亀など：ステージ開始時シールド+
    if (sh) grantShields(sh);
  }, [grantShields]);

  // ---- collection / season / shop handlers ----
  // カード獲得はキュー方式：複数枚（例：スティール宝箱×N）を順番にポップアップ表示する
  const cardQueueRef = useRef([]);
  const cardShowingRef = useRef(false);
  const pumpCards = useCallback(() => {
    if (cardShowingRef.current) return;
    const next = cardQueueRef.current.shift();
    if (!next) {
      setCardPopup(null);
      return;
    }
    cardShowingRef.current = true;
    setCardPopup(next);
    SFX.card();
    setTimeout(() => {
      cardShowingRef.current = false;
      setCardPopup(null);
      setTimeout(pumpCards, 200);
    }, 1900);
  }, []);
  // n枚ドロップ。goldChanceで宝箱などのGOLD確率を上げられる。
  // ownedRef で現在の所持数を同期参照し、drops を同期的に確定させてからキューに積む
  // （setOwnedCards の updater 内で drops を組むと setTimeout 経由のバッチで遅延し、pump 時に空になるため）。
  const enqueueCards = useCallback((n = 1, goldChance = 0.12) => {
    const owned = {
      ...ownedRef.current
    };
    const drops = Array.from({
      length: n
    }, () => {
      const card = dropRandomCard(goldChance);
      const isNew = !(owned[card.id] > 0);
      owned[card.id] = (owned[card.id] || 0) + 1;
      return {
        card,
        isNew
      };
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
    const owned = {
      ...ownedRef.current
    };
    owned[card.id] = (owned[card.id] || 0) + 1;
    ownedRef.current = owned;
    setOwnedCards(owned);
    SFX.card();
    return card;
  }, []);

  // キャラのピース付与。source='box'|'jackpot'。解放済みからランダム、pieceBonusで増量。
  // 100枚到達で入手演出（charPopup）。boxes回など複数口はまとめて回す。
  const grantCharPieces = useCallback((source, draws = 1) => {
    const owned = {
      ...ownedPiecesRef.current
    };
    let last = null,
      gained = 0,
      completed = null;
    for (let i = 0; i < draws; i++) {
      const ch = pickCharForPieces(stageRef.current, owned);
      if (!ch) break;
      let amt = piecesFor(ch.rank, source);
      amt = Math.round(amt * (1 + (effRef.current.pieceBonus || 0)));
      const cur = owned[ch.id] || 0;
      const nx = cur + amt; // 100到達後も貯まる（レベルアップ素材として使うため上限なし）
      owned[ch.id] = nx;
      last = ch;
      gained = amt;
      if (cur < CHAR_PIECE_GOAL && nx >= CHAR_PIECE_GOAL) completed = ch;
    }
    if (!last) return;
    ownedPiecesRef.current = owned;
    setOwnedCharPieces(owned);
    if (completed) {
      // grantCharPieces の抽選プールは常に unlockStage<=stage 済みなので pending は基本発生しないが、念のため判定を揃える。
      const pending = completed.unlockStage > stageRef.current;
      setCharPopup({
        char: completed,
        pending
      });
      SFX.stage();
      setTimeout(() => setCharPopup(null), 2600);
    } else {
      showToast(`🧩 ${last.name}のピース +${gained}`);
      SFX.coin();
    }
  }, [showToast]);
  const equipChar = useCallback(id => {
    setEquippedChar(prev => {
      if (prev === id) return null; // 同じキャラを再タップで解除（常に許可）
      const c = CHAR_BY_ID[id];
      const complete = (ownedPiecesRef.current[id] || 0) >= CHAR_PIECE_GOAL;
      const stageOk = c && c.unlockStage <= stageRef.current;
      if (!c || !complete || !stageOk) return prev; // 装備不可（未コンプ／ステージ未到達）なら無視
      return id;
    });
    SFX.tap();
  }, []);

  // ピース（100枚コンプ後の余剰）を消費してキャラをレベルアップ（最大Lv5）。討伐戦の攻撃力・装備効果に反映。
  const levelUpChar = useCallback(id => {
    const c = CHAR_BY_ID[id];
    if (!c) return;
    const pieces = ownedPiecesRef.current[id] || 0;
    const lv = charLevels[id] || 1;
    if (pieces < CHAR_PIECE_GOAL) return;
    if (lv >= CHAR_MAX_LEVEL) {
      showToast('最大レベルです');
      return;
    }
    const cost = charLevelCost(c.rank, lv);
    if (pieces - CHAR_PIECE_GOAL < cost) {
      showToast('かけらが足りません');
      return;
    }
    const owned = {
      ...ownedPiecesRef.current,
      [id]: pieces - cost
    };
    ownedPiecesRef.current = owned;
    setOwnedCharPieces(owned);
    setCharLevels(m => ({
      ...m,
      [id]: lv + 1
    }));
    SFX.stage();
    showToast(`⬆️ ${c.name} Lv${lv + 1}！`);
  }, [charLevels, showToast]);

  // 討伐編成（最大4体）の選択/解除
  const toggleRaidParty = useCallback(id => {
    setRaidParty(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const c = CHAR_BY_ID[id];
      const owned = c && (ownedPiecesRef.current[id] || 0) >= CHAR_PIECE_GOAL && c.unlockStage <= stageRef.current;
      if (!owned || prev.length >= RAID_PARTY_MAX) return prev;
      return [...prev, id];
    });
    SFX.tap();
  }, []);

  // 指定キャラに固定枚数のピースを加算（ショップ購入・スティール・ジャックポット召喚用）。100到達で入手演出。
  // ジャックポット召喚（rollCompanionSummon）はステージ未到達キャラも対象になり得るため pending 判定が必要。
  const addPiecesTo = useCallback((charId, amt) => {
    const owned = {
      ...ownedPiecesRef.current
    };
    const cur = owned[charId] || 0;
    const nx = cur + amt; // 100到達後も貯まる（レベルアップ素材として使うため上限なし）
    owned[charId] = nx;
    ownedPiecesRef.current = owned;
    setOwnedCharPieces(owned);
    if (cur < CHAR_PIECE_GOAL && nx >= CHAR_PIECE_GOAL) {
      const c = CHAR_BY_ID[charId];
      const pending = c.unlockStage > stageRef.current;
      setCharPopup({
        char: c,
        pending
      });
      SFX.stage();
      setTimeout(() => setCharPopup(null), 2600);
    }
  }, []);
  // スティール宝箱の中身を付与（カードは所持数へ加算・仲間はかけら加算）。演出はスティール画面側で完結済みなのでポップアップは出さない（仲間コンプ時のみ祝う）。
  const grantStealRewards = useCallback(rewards => {
    if (!rewards || !rewards.length) return;
    const owned = {
      ...ownedRef.current
    };
    let addedCard = false;
    rewards.forEach(r => {
      if (r.type === 'card' && r.card) {
        owned[r.card.id] = (owned[r.card.id] || 0) + 1;
        addedCard = true;
      }
    });
    if (addedCard) {
      ownedRef.current = owned;
      setOwnedCards(owned);
    }
    rewards.forEach(r => {
      if (r.type === 'char' && r.char) addPiecesTo(r.char.id, r.amount);
    }); // addPiecesTo はコンプ時のみポップアップ
  }, [addPiecesTo]);
  // Shinobi Mart: ピース購入（こばん・その日1回）
  const buyCharPieces = useCallback(charId => {
    if (charShop.bought.includes(charId)) return;
    const ch = CHAR_BY_ID[charId];
    const price = CHAR_SHOP_PRICE[ch.rank];
    if (coinsRef.current < price.coins) {
      showToast('コインが足りません');
      return;
    }
    spendCoins(price.coins);
    SFX.coin();
    addPiecesTo(charId, price.pieces);
    setCharShop(s => ({
      ...s,
      bought: [...s.bought, charId]
    }));
    showToast(`🧩 ${ch.name}のかけら +${price.pieces}`);
  }, [charShop, spendCoins, showToast, addPiecesTo]);
  // Shinobi Mart: こばんで消耗品購入（何度でも）
  const buyKoban = useCallback(item => {
    if (charShop.bought.includes(item.id)) return; // こばん商品も日替り・各1回
    if (coinsRef.current < item.coins) {
      showToast('コインが足りません');
      return;
    }
    spendCoins(item.coins);
    SFX.coin();
    if (item.rolls) grantRolls(item.rolls);
    if (item.shields) grantShields(item.shields);
    if (item.tickets) grantTickets(item.tickets);
    setCharShop(s => ({
      ...s,
      bought: [...s.bought, item.id]
    }));
    showToast(`${item.label} を購入！`);
  }, [charShop, spendCoins, grantRolls, grantShields, grantTickets, showToast]);

  // ---- デバッグ：ショップ ----
  const debugResetShop = useCallback(() => {
    // 購入済みをクリア（当日分を再購入可能に）
    setCharShop(s => ({
      ...s,
      bought: []
    }));
    showToast('🐞 ショップの購入状態をリセット');
  }, [showToast]);
  const debugRerollShop = useCallback(() => {
    // ラインナップを再抽選（ランダム4種）＋購入状態クリア
    const pool = CHARACTERS.filter(c => c.unlockStage <= stageRef.current).map(c => c.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    setCharShop(s => ({
      ...s,
      offers: pool.slice(0, 4),
      bought: []
    }));
    showToast('🐞 ショップを再ロール');
  }, [showToast]);
  const claimSet = useCallback(set => {
    if (claimedSets.includes(set.id)) return;
    setClaimedSets(c => [...c, set.id]);
    addCoins(set.reward.coins);
    grantRolls(set.reward.rolls);
    showToast(`${set.name} コンプ！ 🎲${set.reward.rolls} 💰${fmt(set.reward.coins)}`);
  }, [claimedSets, addCoins, grantRolls, showToast]);
  const claimTier = useCallback(i => {
    if (claimedTiers.includes(i)) return;
    setClaimedTiers(c => [...c, i]);
    const r = SEASON_TIERS[i];
    if (r.kind === 'roll') grantRolls(r.amt || 10);else if (r.kind === 'coin') addCoins(r.amt || 0);else if (r.kind === 'shield') grantShields(r.amt || 1);
    showToast('シーズン報酬を受け取りました！');
  }, [claimedTiers, grantRolls, addCoins, grantShields, showToast]);
  const buyPack = useCallback(p => {
    if (p.coins) addCoins(p.coins);
    if (p.rolls) grantRolls(p.rolls);
    showToast(`${p.title} を付与しました`);
  }, [addCoins, grantRolls, showToast]);
  const game = {
    coins,
    shields,
    stage,
    rolls,
    rollsMax,
    opponent,
    useRolls,
    bet
  };

  // ---- flow handlers ----
  const onZorume = useCallback(faceId => {
    if (faceId === 'shield') {
      setShieldFx(true);
      return;
    } // 専用の獲得演出（付与は演出完了時）
    setZorumeFace(faceId); // shows overlay; onComplete routes to bonus
  }, []);
  const onZorumeComplete = useCallback(() => {
    const f = zorumeFace;
    setZorumeFace(null);
    if (f === 'coin') {
      go('bonus', {
        trigger: 'coin'
      }); // 小判ゾロ目のみボーナスルーレット
    } else if (f === 'attack') {
      go('attackSelect', {
        bonusResult: rollBonusDice('attack')
      }); // Attackはミニゲーム直行
    } else if (f === 'steal') {
      go('steal', {}); // Stealはミニゲーム直行
    } else if (f === 'jackpot') {
      const res = rollBonusDice('jackpot'); // Jackpotは報酬スロット演出（どの報酬かを見せる）
      const summon = res.companion ? rollCompanionSummon() : null; // 仲間召喚：どの仲間のかけらを何枚もらえるか事前確定
      // 宝箱面（お宝箱/大当たり/レア確定）は箱の中身（カード or 仲間のかけら）も必ず付与。以前はコインに畳み込むだけで「何も出ない」ように見えていた。
      // レア確定はGOLDカード率を高める。超JPは仲間召喚が主報酬なので箱は付けない。
      const boxReward = res.treasure && !res.companion ? rollStealBoxReward(stage, res.rare ? 0.9 : 0.45, effRef.current.pieceBonus, ownedCharPieces) : null;
      setMultFx({
        base: coinBaseForStage(stage),
        result: res,
        summon,
        boxReward
      });
    } else {
      go('main');
    }
  }, [zorumeFace, go, stage]);
  const onBonusComplete = useCallback(result => {
    const trigger = flow.trigger;
    const base = coinBaseForStage(stage);
    if (trigger === 'coin') {
      const gain = Math.round(base * result.multiplier * betRef.current * effRef.current.coinMult);
      addCoins(gain);
      // 獲得額の「式」はボーナス画面で表示済み。ここではチケット入手のみ通知。
      if (Math.random() < 0.4) {
        grantTickets(1);
        showToast('レイドチケット🎟️入手！');
      }
      go('main');
    } else if (trigger === 'jackpot') {
      const jm = effRef.current.coinMult * (1 + effRef.current.jackpotBonus); // 龍神など
      const gain = Math.round((base * result.coinMultiplier + (result.treasure ? 50000 : 0)) * betRef.current * jm);
      addCoins(gain);
      showToast(`${result.label}！ +${fmt(gain)} 🪙${result.treasure ? ' 💎' : ''}`);
      go('main');
      // ジャックポットはキャラのピースも多めに付与（宝/仲間面はさらに1口）
      const draws = 1 + (result.treasure || result.companion ? 1 : 0);
      setTimeout(() => grantCharPieces('jackpot', draws), 450);
    } else if (trigger === 'attack') {
      go('attackSelect', {
        bonusResult: result
      });
    } else {
      go('main');
    }
  }, [flow.trigger, stage, addCoins, showToast, go, grantTickets, grantCharPieces]);

  // AttackSelect が建物ごとに演出（コイン噴出/破壊 or シールド防御）を終えてから成否を渡してくる。
  const onAttackResolve = useCallback((part, success) => {
    const br = flow.bonusResult;
    const damage = br?.damage || 1; // 破壊する棟数（ボーナスダイス由来）
    const rate = br?.coinRate || 0.25; // 成功時の獲得率（ボーナスダイス由来）
    const b = betRef.current;
    const e = effRef.current; // 装備キャラ効果
    if (!success) {
      setOpponent(o => ({
        ...o,
        shields: Math.max(0, o.shields - 1)
      })); // シールドが1枚防ぐ
      go('attackResult', {
        attackResult: {
          success: false,
          coinGain: Math.floor(opponent.coins * 0.07 * e.attackMult) * b,
          partLabel: part.label,
          damage
        }
      });
    } else {
      go('attackResult', {
        attackResult: {
          success: true,
          coinGain: Math.floor(opponent.coins * rate * e.attackMult) * b,
          partLabel: part.label,
          damage,
          rate
        }
      });
    }
  }, [flow.bonusResult, opponent, go]);

  // 対戦が片付くたびに次の対戦相手へ入れ替える（大金持ち〜初心者からランダム）
  const rotateOpponent = useCallback(() => setOpponent(o => pickOpponent(o.key)), []);
  const onAttackNext = useCallback(() => {
    addCoins(flow.attackResult.coinGain);
    rotateOpponent();
    go('main');
  }, [flow.attackResult, addCoins, go, rotateOpponent]);
  const onStealReceive = useCallback((total, rewards = []) => {
    if (total > 0) {
      addCoins(total);
      showToast(`+${fmt(total)} コイン獲得！`);
    }
    rotateOpponent();
    go('main');
    // 宝箱の中身（カード or 仲間かけら）はスティール画面でリビュー済み。ここでは付与のみ（ポップアップなし）。
    if (rewards && rewards.length) setTimeout(() => grantStealRewards(rewards), 300);
  }, [addCoins, showToast, go, rotateOpponent, grantStealRewards]);
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, screen === 'main' && /*#__PURE__*/React.createElement(MainRoll, {
    game: game,
    addCoins: addCoins,
    grantShields: grantShields,
    grantRolls: grantRolls,
    showToast: showToast,
    go: go,
    onZorume: onZorume,
    onCardDrop: onCardDrop,
    dropCard: dropCardSilent,
    onShop: () => go('shop'),
    tickets: tickets,
    bet: bet,
    setBet: setBet,
    night: night,
    onToggleNight: () => setNight(n => !n),
    auto: auto,
    setAuto: setAuto,
    rollAnim: rollAnim,
    onToggleRollAnim: toggleRollAnim,
    paused: !!multFx || shieldFx || !!zorumeFace,
    equipped: equippedChar,
    freeRollChance: eff.freeRollChance,
    cardDropBonus: eff.cardDropBonus,
    onResetShop: debugResetShop,
    onRerollShop: debugRerollShop,
    onDebugTickets: () => {
      grantTickets(5);
      showToast('🎟️ チケット +5（デバッグ）');
    }
  }), screen === 'bonus' && /*#__PURE__*/React.createElement(BonusRoll, {
    trigger: flow.trigger,
    stage: stage,
    bet: bet,
    onComplete: onBonusComplete
  }), screen === 'attackSelect' && /*#__PURE__*/React.createElement(AttackSelect, {
    opponent: opponent,
    bonusResult: flow.bonusResult,
    stage: stage,
    ignoreShield: eff.ignoreShield,
    onCancel: () => go('main'),
    onResolve: onAttackResolve
  }), screen === 'attackResult' && /*#__PURE__*/React.createElement(AttackResult, {
    result: flow.attackResult,
    onNext: onAttackNext,
    opponentName: opponent.name
  }), screen === 'steal' && /*#__PURE__*/React.createElement(StealScreen, {
    opponentName: opponent.name,
    opponentCoins: opponent.coins,
    opponentImg: opponent.img,
    betMult: bet,
    onReceive: onStealReceive,
    stealMult: eff.stealMult,
    autoLastSpot: eff.stealLastSpot,
    stage: stage,
    pieceBonus: eff.pieceBonus,
    ownedPieces: ownedCharPieces
  }), screen === 'castle' && /*#__PURE__*/React.createElement(CastleScreen, {
    game: game,
    spendCoins: spendCoins,
    grantRolls: grantRolls,
    showToast: showToast,
    onBack: () => go('main'),
    onNextStage: nextStage,
    village: castleVillage,
    setVillage: setCastleVillage,
    buildDiscount: eff.buildDiscount,
    headStart: eff.headStartLevels
  }), screen === 'collection' && /*#__PURE__*/React.createElement(CollectionScreen, {
    owned: ownedCards,
    claimed: claimedSets,
    onClaim: claimSet,
    onBack: () => go('main'),
    showToast: showToast
  }), screen === 'characters' && /*#__PURE__*/React.createElement(CharactersScreen, {
    ownedPieces: ownedCharPieces,
    equipped: equippedChar,
    onEquip: equipChar,
    onBack: () => go('main'),
    stage: stage,
    charLevels: charLevels,
    onLevelUp: levelUpChar
  }), screen === 'clan' && /*#__PURE__*/React.createElement(ClanRaidScreen, {
    onBack: () => go('main'),
    addCoins: addCoins,
    grantRolls: grantRolls,
    showToast: showToast,
    tickets: tickets,
    spendTicket: spendTicket,
    raid: raid,
    setRaid: setRaid,
    raidParty: raidParty,
    charLevels: charLevels,
    stage: stage,
    onEditParty: () => go('raidParty')
  }), screen === 'raidParty' && /*#__PURE__*/React.createElement(RaidPartyScreen, {
    ownedPieces: ownedCharPieces,
    charLevels: charLevels,
    party: raidParty,
    onToggle: toggleRaidParty,
    onBack: () => go('clan'),
    stage: stage
  }), screen === 'season' && /*#__PURE__*/React.createElement(SeasonScreen, {
    xp: seasonXP,
    claimed: claimedTiers,
    onClaim: claimTier,
    onBack: () => go('main')
  }), screen === 'invite' && /*#__PURE__*/React.createElement(InviteScreen, {
    onBack: () => go('main'),
    showToast: showToast,
    grantRolls: grantRolls,
    addCoins: addCoins
  }), screen === 'shop' && /*#__PURE__*/React.createElement(ShopScreen, {
    onBack: () => go('main'),
    onBuyPack: buyPack,
    coins: coins,
    shopOffers: charShop.offers,
    shopBought: charShop.bought,
    ownedPieces: ownedCharPieces,
    onBuyPiece: buyCharPieces,
    kobanItems: KOBAN_SHOP,
    onBuyKoban: buyKoban,
    charLevels: charLevels
  }), cardPopup && /*#__PURE__*/React.createElement("div", {
    className: "card-popup",
    key: cardPopup.card.id + (cardPopup.isNew ? '-n' : '-d')
  }, /*#__PURE__*/React.createElement("div", {
    className: "cp-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cp-head"
  }, cardPopup.isNew ? '🎴 新カード獲得！' : '🎴 カード獲得'), /*#__PURE__*/React.createElement(CardFace, {
    card: cardPopup.card,
    owned: true
  }))), charPopup && /*#__PURE__*/React.createElement("div", {
    className: "card-popup char-win",
    key: 'char-' + charPopup.char.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "cp-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cp-head"
  }, charPopup.pending ? '🧩 かけらコンプ！' : '🎉 新しい仲間！'), /*#__PURE__*/React.createElement("div", {
    className: "char-pop-face",
    style: {
      '--rk': CHAR_RANKS[charPopup.char.rank].color
    }
  }, /*#__PURE__*/React.createElement(Img, {
    src: charThumb(charPopup.char.id),
    className: "char-pop-img",
    fallback: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 70
      }
    }, "🧙")
  })), /*#__PURE__*/React.createElement("div", {
    className: "char-pop-name"
  }, charPopup.char.name), /*#__PURE__*/React.createElement("div", {
    className: "char-pop-rank",
    style: {
      color: CHAR_RANKS[charPopup.char.rank].color
    }
  }, CHAR_RANKS[charPopup.char.rank].label), /*#__PURE__*/React.createElement("div", {
    className: "char-pop-desc"
  }, charPopup.pending ? `ステージ${charPopup.char.unlockStage}で仲間になる` : charPopup.char.desc))), zorumeFace && /*#__PURE__*/React.createElement(ZorumeOverlay, {
    faceId: zorumeFace,
    onComplete: onZorumeComplete
  }), multFx && /*#__PURE__*/React.createElement(MultiplierOverlay, {
    base: multFx.base,
    result: multFx.result,
    summon: multFx.summon,
    boxReward: multFx.boxReward,
    pool: BONUS_DICE_TABLES.jackpot,
    betMult: bet,
    onDone: total => {
      const summon = multFx.summon;
      const boxReward = multFx.boxReward;
      setMultFx(null);
      const g = Math.round(total * eff.coinMult * (1 + eff.jackpotBonus));
      addCoins(g);
      showToast(`ジャックポット！ +${fmt(g)} 🪙`);
      if (summon) setTimeout(() => {
        addPiecesTo(summon.char.id, summon.amount);
        showToast(`🧩 仲間召喚！ ${summon.char.name}のかけら +${summon.amount}`);
      }, 450);
      if (boxReward) setTimeout(() => {
        grantStealRewards([boxReward]);
        showToast(boxReward.type === 'card' ? `🎁 宝箱：${boxReward.card.gold ? '★GOLD ' : ''}カード獲得！` : `🎁 宝箱：${boxReward.char.name}のかけら +${boxReward.amount}`);
      }, 700);
    }
  }), shieldFx && /*#__PURE__*/React.createElement(ShieldOverlay, {
    onDone: () => {
      setShieldFx(false);
      grantShields(3);
    }
  }), /*#__PURE__*/React.createElement(Toast, {
    msg: toast
  }));
}

/* ============================================================
   LOADING — 起動時に全画像をプリロード（スプラッシュ＋進捗バー）
   ============================================================ */
function LoadingScreen({
  onDone
}) {
  const [pct, setPct] = useState(0);
  const imgsRef = useRef([]); // 参照を保持しないとGCされ onload が発火しない
  useEffect(() => {
    const list = typeof window !== 'undefined' && Array.isArray(window.NDM_IMAGES) ? window.NDM_IMAGES : [];
    if (!list.length) {
      onDone();
      return;
    }
    let loaded = 0,
      done = false;
    const t0 = Date.now();
    // 100%到達後も含め、最低でも約1.1秒はスプラッシュを見せる（一瞬で消えるチラつき防止）
    const finish = () => {
      if (done) return;
      done = true;
      setTimeout(onDone, Math.max(300, 1100 - (Date.now() - t0)));
    };
    // 全アセットのロードが完了する（=100%）までローディング画面を抜けない。
    // 各画像は onload / onerror のどちらかが必ず発火するため loaded は必ず list.length に到達する。
    const bump = () => {
      loaded++;
      setPct(Math.round(loaded / list.length * 100));
      if (loaded >= list.length) finish();
    };
    imgsRef.current = list.map(src => {
      const img = new Image();
      img.onload = bump;
      img.onerror = bump;
      img.src = src;
      return img;
    });
    // 応答が返らず固まった接続に備えた最終手段のみ（通常は発火しない・十分長め）。
    const safety = setTimeout(finish, 90000);
    return () => clearTimeout(safety);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "loading-screen",
    style: {
      backgroundImage: `url("${IMG}BG_Splash.png")`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "load-dim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "load-title"
  }, "NINJA", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "lt-2"
  }, "DICE MASTER")), /*#__PURE__*/React.createElement("div", {
    className: "load-sub"
  }, "忍者ダイスマスター"), /*#__PURE__*/React.createElement("div", {
    className: "load-bottom"
  }, /*#__PURE__*/React.createElement("div", {
    className: "load-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "load-fill",
    style: {
      width: pct + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "load-pct"
  }, "読み込み中… ", pct, "%")));
}
function Root() {
  const [ready, setReady] = useState(false);
  return ready ? /*#__PURE__*/React.createElement(App, null) : /*#__PURE__*/React.createElement(LoadingScreen, {
    onDone: () => setReady(true)
  });
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Root, null));
