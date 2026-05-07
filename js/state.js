'use strict';

const State = {
  player: {
    hp:     100,
    maxHp:  100,
    isDead: false,
  },

  stage: {
    current:    1,
    enemyIndex: 0,
    frozen:     false,
    maxReached: 1,
  },

  enemy: null,

  resources: {
    drops:         0,
    stones:        0,
    fragments:     0,
    artifacts:     [],
    normalKills:   0,
    pendingStones: 0,
  },

  upgrades: {
    // 기본 강화 (전리품)
    basicHp:       0,
    basicGunAtk:   0,
    basicCrit:     0,
    basicCritDmg:  0,
    basicAtkSpeed: 0,
    basicGunSlot:  0,
    // 강화석 강화
    stoneHp:       0,
    stoneGunAtk:   0,
    stoneCrit:     0,
    stoneCritDmg:  0,
    stoneAtkSpeed: 0,
    stoneGunSlot:  0,
    stoneDrop:     0,
    stoneExp:      0,
  },

  guns: {
    equipped: [],
    queue:    [],  // 획득 대기 총기 목록
  },

  lastSaveTime: 0,

  computed: {
    maxHp:         100,
    gunSlots:      1,
    gunAtkBonus:   0,
    gunAtkMult:    1.0,
    critBonus:     0,
    critDmgBonus:  0,
    atkSpeedBonus: 0,
    dropMult:      1.0,
    expMult:       1.0,
  },

  init() {
    this.guns.equipped = [Object.assign({}, C.DEFAULT_GUN)];
    this.guns.queue    = [];
    this.recalculate();
    this.player.hp    = this.computed.maxHp;
    this.player.maxHp = this.computed.maxHp;
    this.lastSaveTime = Date.now();
  },

  recalculate() {
    const u = this.upgrades;
    const c = this.computed;

    c.maxHp = C.PLAYER_BASE_HP
      + u.basicHp  * C.BASIC_HP_PER_LEVEL
      + u.stoneHp  * C.STONE_HP_PER_LEVEL;
    c.maxHp = Math.floor(c.maxHp * this._artifactMult('art_hp'));

    c.gunSlots = C.PLAYER_BASE_GUN_SLOTS
      + u.basicGunSlot
      + u.stoneGunSlot;

    c.gunAtkBonus   = u.basicGunAtk  * C.BASIC_GUN_ATK_PER_LEVEL;
    c.gunAtkMult    = (1 + u.stoneGunAtk * C.STONE_GUN_ATK_MULT_PER_LEVEL)
                    * this._artifactMult('art_atk');

    c.critBonus     = u.basicCrit   * C.BASIC_CRIT_PER_LEVEL
                    + u.stoneCrit   * C.STONE_CRIT_PER_LEVEL
                    + this._artifactFlat('art_crit', 500);

    c.critDmgBonus  = u.basicCritDmg  * C.BASIC_CRIT_DMG_PER_LEVEL
                    + u.stoneCritDmg  * C.STONE_CRIT_DMG_PER_LEVEL
                    + this._artifactFlat('art_critdmg', 25);

    c.atkSpeedBonus = u.basicAtkSpeed  * C.BASIC_ATK_SPEED_PER_LEVEL
                    + u.stoneAtkSpeed  * C.STONE_ATK_SPEED_PER_LEVEL
                    + this._artifactFlat('art_speed', 5);

    c.dropMult      = (1 + u.stoneDrop * C.STONE_DROP_PER_LEVEL)
                    * this._artifactMult('art_drop');

    c.expMult       = 1 + u.stoneExp * C.STONE_EXP_PER_LEVEL;
  },

  syncGunSlots() {
    const target = this.computed.gunSlots;
    while (this.guns.equipped.length < target) this.guns.equipped.push(null);
    while (this.guns.equipped.length > target) this.guns.equipped.pop();
  },

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

  // 총기 1정 예상 DPS
  getGunDPS(gun) {
    const s = this.getGunStats(gun);
    if (!s) return 0;
    const avgDmg = s.attack * (1 + (s.critChance / 10000) * (s.critDmg / 100));
    return avgDmg * (60 / s.attackInterval);
  },

  getTotalDPS() {
    return this.guns.equipped.reduce((sum, g) => sum + (g ? this.getGunDPS(g) : 0), 0);
  },

  _artifactLevel(id) {
    const a = this.resources.artifacts.find(x => x.id === id);
    return a ? a.level : 0;
  },
  _artifactMult(id) {
    const lvl  = this._artifactLevel(id);
    const base = { art_hp: 0.20, art_atk: 0.15, art_drop: 0.25 };
    return 1 + lvl * (base[id] || 0);
  },
  _artifactFlat(id, perLvl) {
    return this._artifactLevel(id) * perLvl;
  },
};
