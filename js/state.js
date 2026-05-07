'use strict';

const State = {
  player: {
    hp:     100,
    maxHp:  100,
    isDead: false,
  },

  stage: {
    current:    1,
    enemyIndex: 0,   // 0~9 (0번=1번째 적)
    frozen:     false,
    maxReached: 1,
  },

  enemy: null,  // 현재 적 객체

  resources: {
    drops:         0,
    stones:        0,
    fragments:     0,
    artifacts:     [],
    // 강화석 누적 추적 (환생 시 정산)
    normalKills:   0,   // 일반 몬스터 처치 수 (강화석 정산용)
    pendingStones: 0,   // 환생 시 지급될 강화석
  },

  upgrades: {
    // 기본 강화 (전리품)
    basicHp:      0,
    basicGunAtk:  0,
    basicGunSlot: 0,
    // 강화석 강화
    stoneHp:       0,
    stoneGunAtk:   0,
    stoneCrit:     0,
    stoneCritDmg:  0,
    stoneAtkSpeed: 0,
    stoneGunSlot:  0,
    stoneDropBonus:0,
  },

  guns: {
    equipped:   [],   // null or gun object, length = computed.gunSlots
    pendingGun: null, // 획득 대기 중인 총기
  },

  // 오프라인 계산용 저장 타임스탬프
  lastSaveTime: 0,

  // ── 계산된 스탯 (recalculate() 후 갱신) ──
  computed: {
    maxHp:          100,
    gunSlots:       1,
    gunAtkBonus:    0,    // flat
    gunAtkMult:     1.0,  // ×
    critBonus:      0,    // 10000 기준
    critDmgBonus:   0,    // %
    atkSpeedBonus:  0,    // attackInterval 감소
    dropMult:       1.0,
  },

  init() {
    const gun = Object.assign({}, C.DEFAULT_GUN);
    this.guns.equipped = [gun];
    this.recalculate();
    this.player.hp    = this.computed.maxHp;
    this.player.maxHp = this.computed.maxHp;
    this.lastSaveTime = Date.now();
  },

  recalculate() {
    const u = this.upgrades;
    const c = this.computed;

    c.maxHp = C.PLAYER_BASE_HP
      + u.basicHp     * C.BASIC_HP_PER_LEVEL
      + u.stoneHp     * C.STONE_HP_PER_LEVEL;

    // 유물 HP 보너스
    const artHp = this._artifactMult('art_hp');
    c.maxHp = Math.floor(c.maxHp * artHp);

    c.gunSlots = C.PLAYER_BASE_GUN_SLOTS
      + u.basicGunSlot
      + u.stoneGunSlot;

    c.gunAtkBonus   = u.basicGunAtk * C.BASIC_GUN_ATK_PER_LEVEL;
    c.gunAtkMult    = (1 + u.stoneGunAtk * C.STONE_GUN_ATK_MULT_PER_LEVEL)
                    * this._artifactMult('art_atk');
    c.critBonus     = u.stoneCrit    * C.STONE_CRIT_PER_LEVEL
                    + this._artifactFlat('art_crit', 500);
    c.critDmgBonus  = u.stoneCritDmg * C.STONE_CRIT_DMG_PER_LEVEL
                    + this._artifactFlat('art_critdmg', 25);
    c.atkSpeedBonus = u.stoneAtkSpeed * C.STONE_ATK_SPEED_PER_LEVEL
                    + this._artifactFlat('art_speed', 5);
    c.dropMult      = (1 + u.stoneDropBonus * C.STONE_DROP_BONUS_PER_LEVEL)
                    * this._artifactMult('art_drop');
  },

  // 장착 슬롯 수 변동 시 배열 길이 동기화
  syncGunSlots() {
    const target = this.computed.gunSlots;
    while (this.guns.equipped.length < target) this.guns.equipped.push(null);
    while (this.guns.equipped.length > target) this.guns.equipped.pop();
  },

  // 총기 1정의 실효 스탯 반환
  getGunStats(gun) {
    if (!gun) return null;
    const c = this.computed;
    return {
      attack:         Math.max(0, (gun.attack + c.gunAtkBonus) * c.gunAtkMult),
      attackInterval: Math.max(C.MIN_ATTACK_INTERVAL, gun.attackInterval - c.atkSpeedBonus),
      critChance:     Math.min(10000, gun.critChance + c.critBonus),
      critDmg:        gun.critDmg + c.critDmgBonus,
    };
  },

  // 전체 총기 합산 DPS (복귀 연산용)
  getTotalDPS() {
    let dps = 0;
    for (const gun of this.guns.equipped) {
      if (!gun) continue;
      const s = this.getGunStats(gun);
      const avgDmg        = s.attack * (1 + (s.critChance / 10000) * (s.critDmg / 100));
      const attacksPerSec = 60 / s.attackInterval;
      dps += avgDmg * attacksPerSec;
    }
    return dps;
  },

  // ── 내부 유물 헬퍼 ──
  _artifactLevel(id) {
    const a = this.resources.artifacts.find(x => x.id === id);
    return a ? a.level : 0;
  },
  _artifactMult(id) {
    const lvl = this._artifactLevel(id);
    const base = { art_hp: 0.20, art_atk: 0.15, art_drop: 0.25 };
    return 1 + lvl * (base[id] || 0);
  },
  _artifactFlat(id, perLvl) {
    return this._artifactLevel(id) * perLvl;
  },
};
