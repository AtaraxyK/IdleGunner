'use strict';

const Upgrades = {
  _defs: {
    // 기본 강화 (전리품)
    basicHp:       { res: 'drops',  base: C.BASIC_HP_BASE_COST,        mult: C.BASIC_HP_COST_MULT        },
    basicGunAtk:   { res: 'drops',  base: C.BASIC_GUN_ATK_BASE_COST,   mult: C.BASIC_GUN_ATK_COST_MULT   },
    basicCrit:     { res: 'drops',  base: C.BASIC_CRIT_BASE_COST,      mult: C.BASIC_CRIT_COST_MULT      },
    basicCritDmg:  { res: 'drops',  base: C.BASIC_CRIT_DMG_BASE_COST,  mult: C.BASIC_CRIT_DMG_COST_MULT  },
    basicAtkSpeed: { res: 'drops',  base: C.BASIC_ATK_SPEED_BASE_COST, mult: C.BASIC_ATK_SPEED_COST_MULT },
    basicGunSlot:  { res: 'drops',  base: C.BASIC_GUN_SLOT_BASE_COST,  mult: C.BASIC_GUN_SLOT_COST_MULT,  max: C.BASIC_MAX_GUN_SLOTS },
    // 강화석 강화
    stoneHp:       { res: 'stones', base: C.STONE_HP_BASE_COST,        mult: C.STONE_HP_COST_MULT        },
    stoneGunAtk:   { res: 'stones', base: C.STONE_GUN_ATK_BASE_COST,   mult: C.STONE_GUN_ATK_COST_MULT   },
    stoneCrit:     { res: 'stones', base: C.STONE_CRIT_BASE_COST,      mult: C.STONE_CRIT_COST_MULT      },
    stoneCritDmg:  { res: 'stones', base: C.STONE_CRIT_DMG_BASE_COST,  mult: C.STONE_CRIT_DMG_COST_MULT  },
    stoneAtkSpeed: { res: 'stones', base: C.STONE_ATK_SPEED_BASE_COST, mult: C.STONE_ATK_SPEED_COST_MULT },
    stoneGunSlot:  { res: 'stones', base: C.STONE_GUN_SLOT_BASE_COST,  mult: C.STONE_GUN_SLOT_COST_MULT,  max: C.STONE_MAX_GUN_SLOTS },
    stoneDrop:     { res: 'stones', base: C.STONE_DROP_BASE_COST,      mult: C.STONE_DROP_COST_MULT      },
    stoneExp:      { res: 'stones', base: C.STONE_EXP_BASE_COST,       mult: C.STONE_EXP_COST_MULT       },
  },

  getCost(key) {
    const def = this._defs[key];
    return Math.floor(def.base * Math.pow(def.mult, State.upgrades[key]));
  },

  canBuy(key) {
    const def = this._defs[key];
    const lvl = State.upgrades[key];
    if (def.max != null && lvl >= def.max) return false;
    return State.resources[def.res] >= this.getCost(key);
  },

  buy(key) {
    if (!this.canBuy(key)) return false;
    const def = this._defs[key];
    State.resources[def.res] -= this.getCost(key);
    State.upgrades[key]++;
    this._apply();
    return true;
  },

  // 가진 재화로 가능한 최대치까지 구매
  buyMax(key) {
    let count = 0;
    while (this.canBuy(key)) {
      const def = this._defs[key];
      State.resources[def.res] -= this.getCost(key);
      State.upgrades[key]++;
      count++;
    }
    if (count > 0) this._apply();
    return count;
  },

  _apply() {
    State.recalculate();
    State.syncGunSlots();
    State.player.maxHp = State.computed.maxHp;
    Save.save();
  },
};
