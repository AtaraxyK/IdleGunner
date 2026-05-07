'use strict';

const Save = {
  KEY: 'idleTown_v1',

  save() {
    State.lastSaveTime = Date.now();
    const data = {
      ver:       1,
      saveTime:  State.lastSaveTime,
      player:    { ...State.player },
      stage:     { ...State.stage },
      enemy:     State.enemy ? { ...State.enemy } : null,
      resources: {
        ...State.resources,
        artifacts: State.resources.artifacts.map(a => ({ ...a })),
      },
      upgrades:  { ...State.upgrades },
      guns: {
        equipped: State.guns.equipped.map(g => g ? { ...g } : null),
      },
    };
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  load() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return false;

    try {
      const d = JSON.parse(raw);
      if (!d || d.ver !== 1) return false;

      Object.assign(State.player,    d.player);
      Object.assign(State.stage,     d.stage);
      State.enemy = d.enemy || null;
      Object.assign(State.resources, d.resources);
      Object.assign(State.upgrades,  d.upgrades);

      if (d.guns?.equipped) {
        State.guns.equipped = d.guns.equipped;
      }

      State.recalculate();
      State.syncGunSlots();
      State.lastSaveTime = d.saveTime || Date.now();

      // 오프라인 보상
      const elapsed = (Date.now() - d.saveTime) / 1000;
      Combat.calcOfflineRewards(elapsed);

      return true;
    } catch (e) {
      console.error('Load failed:', e);
      return false;
    }
  },

  reset() {
    localStorage.removeItem(this.KEY);
  },
};
