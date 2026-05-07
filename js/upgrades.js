'use strict';

const Upgrades = {
  // 업그레이드 정의 테이블
  _defs: {
    // key: { resource, baseCost, costMult, maxLevel }
    basicHp:       { res: 'drops',  base: C.BASIC_HP_BASE_COST,        mult: C.BASIC_HP_COST_MULT        },
    basicGunAtk:   { res: 'drops',  base: C.BASIC_GUN_ATK_BASE_COST,   mult: C.BASIC_GUN_ATK_COST_MULT   },
    basicGunSlot:  { res: 'drops',  base: C.BASIC_GUN_SLOT_BASE_COST,  mult: C.BASIC_GUN_SLOT_COST_MULT,  max: C.BASIC_MAX_GUN_SLOTS },
    stoneHp:       { res: 'stones', base: C.STONE_HP_BASE_COST,        mult: C.STONE_HP_COST_MULT        },
    stoneGunAtk:   { res: 'stones', base: C.STONE_GUN_ATK_BASE_COST,   mult: C.STONE_GUN_ATK_COST_MULT   },
    stoneCrit:     { res: 'stones', base: C.STONE_CRIT_CHANCE_BASE_COST, mult: C.STONE_CRIT_CHANCE_COST_MULT },
    stoneCritDmg:  { res: 'stones', base: C.STONE_CRIT_DMG_BASE_COST,  mult: C.STONE_CRIT_DMG_COST_MULT  },
    stoneAtkSpeed: { res: 'stones', base: C.STONE_ATK_SPEED_BASE_COST, mult: C.STONE_ATK_SPEED_COST_MULT },
    stoneGunSlot:  { res: 'stones', base: C.STONE_GUN_SLOT_BASE_COST,  mult: C.STONE_GUN_SLOT_COST_MULT,  max: C.STONE_MAX_GUN_SLOTS },
    stoneDropBonus:{ res: 'stones', base: C.STONE_DROP_BONUS_BASE_COST,mult: C.STONE_DROP_BONUS_COST_MULT },
  },

  getCost(key) {
    const def = this._defs[key];
    const lvl = State.upgrades[key];
    return Math.floor(def.base * Math.pow(def.mult, lvl));
  },

  canBuy(key) {
    const def  = this._defs[key];
    const lvl  = State.upgrades[key];
    if (def.max != null && lvl >= def.max) return false;
    const cost = this.getCost(key);
    return State.resources[def.res] >= cost;
  },

  buy(key) {
    if (!this.canBuy(key)) return;
    const def  = this._defs[key];
    const cost = this.getCost(key);
    State.resources[def.res] -= cost;
    State.upgrades[key]++;
    State.recalculate();
    State.syncGunSlots();
    State.player.maxHp = State.computed.maxHp;
    Save.save();
  },
};
