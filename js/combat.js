'use strict';

const Combat = {
  intervalId:  null,
  TICK_MS:     100,        // 게임 틱 간격

  gunTimers:   [],         // 각 총기의 공격 타이머 (초 단위)
  enemyTimer:  0,          // 적 공격 타이머 (초 단위)
  paused:      false,      // 오버레이 표시 중 일시정지

  log:         [],

  start() {
    this.intervalId = setInterval(() => this._tick(), this.TICK_MS);
  },

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  },

  _tick() {
    if (this.paused || State.player.isDead) return;

    if (!State.enemy) this._spawnEnemy();

    const dt = this.TICK_MS / 1000;

    // 총기 공격
    const guns = State.guns.equipped;
    for (let i = 0; i < guns.length; i++) {
      const gun = guns[i];
      if (!gun) continue;
      if (this.gunTimers[i] == null) this.gunTimers[i] = 0;

      this.gunTimers[i] += dt;
      const stats    = State.getGunStats(gun);
      const interval = stats.attackInterval / 60;  // 틱 간격(초)

      if (this.gunTimers[i] >= interval) {
        this.gunTimers[i] -= interval;
        this._gunAttack(gun, stats);
        if (!State.enemy) break;  // 적이 죽으면 중단
      }
    }

    // 적 공격 (1초마다)
    if (State.enemy) {
      this.enemyTimer += dt;
      if (this.enemyTimer >= 1.0) {
        this.enemyTimer -= 1.0;
        this._enemyAttack();
      }
    }

    UI.renderCombat();
  },

  _gunAttack(gun, stats) {
    if (!State.enemy) return;

    const isCrit = Math.random() * 10000 < stats.critChance;
    let dmg = stats.attack;
    if (isCrit) dmg *= (1 + stats.critDmg / 100);
    dmg = Math.max(1, Math.floor(dmg));

    State.enemy.hp -= dmg;

    if (isCrit) {
      this._log(`<span class="log-crit">${gun.name}: ${fmtN(dmg)} (크리!)</span>`);
    }

    if (State.enemy.hp <= 0) {
      State.enemy.hp = 0;
      this._onEnemyDeath();
    }
  },

  _enemyAttack() {
    if (!State.enemy || State.player.isDead) return;
    const dmg = Math.max(1, State.enemy.attack);
    State.player.hp -= dmg;
    State.player.hp = Math.max(0, State.player.hp);

    if (State.player.hp <= 0) {
      this._onPlayerDeath();
    }
  },

  _onEnemyDeath() {
    const e = State.enemy;
    this._giveRewards(e);
    this._log(`<span class="log-clear">${e.name} 처치!</span>`);

    Save.save();

    State.stage.enemyIndex++;

    if (State.stage.enemyIndex >= C.ENEMIES_PER_STAGE) {
      this._onStageClear();
    } else {
      State.enemy = null;
      this.enemyTimer = 0;
      this._spawnEnemy();
    }
  },

  _onStageClear() {
    const s = State.stage;

    // 보스 처치 후 HP 전회복
    State.player.hp = State.player.maxHp;

    // 최고 스테이지 갱신
    if (s.current > s.maxReached) s.maxReached = s.current;

    // 총기 드롭 체크
    if (Math.random() < C.BOSS_GUN_DROP_CHANCE) {
      const gun = this._generateGun(s.current);
      this._offerGun(gun);
    }

    // 다음 스테이지 (frozen 아닌 경우)
    if (!s.frozen) {
      s.current++;
    }
    s.enemyIndex = 0;
    State.enemy  = null;
    this.enemyTimer = 0;
    this.gunTimers  = [];

    this._log(`<span class="log-clear">── 스테이지 클리어! ──</span>`);
    Save.save();
    UI.renderUpgrades();
  },

  _onPlayerDeath() {
    State.player.hp = 0;

    // 고정 모드에서 죽으면 스테이지를 1 낮추고 자동 재시작 (오버레이 없음)
    if (State.stage.frozen) {
      const prev = State.stage.current;
      State.stage.current    = Math.max(1, State.stage.current - 1);
      State.stage.enemyIndex = 0;
      State.player.hp        = State.player.maxHp;
      State.enemy            = null;
      this.enemyTimer        = 0;
      this.gunTimers         = [];
      this._log(`<span class="log-death">고정 모드 사망: ${prev}스테이지 → ${State.stage.current}스테이지</span>`);
      Save.save();
      return;
    }

    State.player.isDead = true;
    this._log(`<span class="log-death">── 사망 ──</span>`);
    Save.save();
    UI.showDeathOverlay();
  },

  _giveRewards(enemy) {
    const mult = State.computed.dropMult;

    // 전리품
    let base = 1;
    if (enemy.type === 'miniboss') base = 3;
    if (enemy.type === 'boss')     base = 8;
    const drops = Math.max(1, Math.floor(base * mult));
    State.resources.drops += drops;
    this._log(`<span class="log-drop">+${fmtN(drops)} 전리품</span>`);

    // 강화석 누적 (환생 정산용)
    if (enemy.type === 'normal') {
      State.resources.normalKills++;
      if (State.resources.normalKills >= C.STONE_KILLS_PER_STONE) {
        State.resources.normalKills -= C.STONE_KILLS_PER_STONE;
        State.resources.pendingStones += 1;
      }
    } else if (enemy.type === 'miniboss') {
      State.resources.pendingStones += C.STONE_PER_MINIBOSS;
    } else if (enemy.type === 'boss') {
      State.resources.pendingStones += C.STONE_PER_BOSS;
    }

    // 중보스/보스 처치 후 HP 전회복
    if (enemy.type === 'miniboss' || enemy.type === 'boss') {
      State.player.hp = State.player.maxHp;
    }
  },

  _spawnEnemy() {
    const s    = State.stage;
    const idx  = s.enemyIndex;

    let type = 'normal';
    if (idx === 4) type = 'miniboss';
    if (idx === 9) type = 'boss';

    const stg    = s.current;
    let hp       = Math.floor(C.ENEMY_BASE_HP  * Math.pow(C.ENEMY_HP_SCALE,  stg - 1));
    let atk      = Math.max(1, Math.floor(C.ENEMY_BASE_ATK * Math.pow(C.ENEMY_ATK_SCALE, stg - 1)));

    if (type === 'miniboss') { hp  = Math.floor(hp  * C.MINIBOSS_HP_MULT);  atk = Math.floor(atk * C.MINIBOSS_ATK_MULT); }
    if (type === 'boss')     { hp  = Math.floor(hp  * C.BOSS_HP_MULT);      atk = Math.floor(atk * C.BOSS_ATK_MULT);     }

    const names = {
      normal:   `몬스터 (${stg}-${idx + 1})`,
      miniboss: `중보스 ★ (${stg}스테이지)`,
      boss:     `보스 ★★ (${stg}스테이지)`,
    };

    State.enemy = { hp, maxHp: hp, attack: atk, type, name: names[type] };
  },

  // ── 총기 생성 ──
  _generateGun(stage) {
    // 등급 가중치: 스테이지가 높을수록 희귀 등급 확률 증가
    const bonus   = Math.min(Math.floor((stage - 1) / 5), 4);
    const weights = [50 - bonus * 5, 30, 15 + bonus * 2, 4 + bonus, 1 + bonus];
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    let grade = 0;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { grade = i; break; }
      grade = i;
    }

    const namePrefixes = ['낡은', '표준', '강화', '특수', '전설적인'];
    const nameTypes    = ['권총', '소총', '산탄총', '저격총', '레일건'];

    const baseAtk      = Math.floor(8  + stage * 3  + grade * 12);
    const baseInterval = Math.max(10, 60 - grade * 8);
    const baseCrit     = grade * 400;
    const baseCritDmg  = 150 + grade * 25;

    return {
      id:             `gun_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name:           `${namePrefixes[grade]} ${nameTypes[grade]}`,
      grade,
      attack:         baseAtk + Math.floor(Math.random() * Math.ceil(baseAtk * 0.2)),
      attackInterval: baseInterval + Math.floor(Math.random() * 10),
      critChance:     baseCrit  + Math.floor(Math.random() * 200),
      critDmg:        baseCritDmg + Math.floor(Math.random() * 30),
      isDefault:      false,
    };
  },

  _offerGun(gun) {
    State.guns.pendingGun = gun;
    this.paused = true;
    UI.showGunAcquireOverlay(gun);
  },

  // ── 환생 ──
  doRebirth() {
    // 강화석 정산
    State.resources.stones        += State.resources.pendingStones;
    State.resources.pendingStones  = 0;
    State.resources.normalKills    = 0;
    State.resources.drops          = 0;
    // fragments / artifacts 유지

    // 기본 강화 초기화
    State.upgrades.basicHp      = 0;
    State.upgrades.basicGunAtk  = 0;
    State.upgrades.basicGunSlot = 0;

    // 총기 리셋 (기본 권총만)
    State.guns.equipped   = [Object.assign({}, C.DEFAULT_GUN)];
    State.guns.pendingGun = null;

    // 스테이지 리셋
    State.stage.current    = 1;
    State.stage.enemyIndex = 0;
    State.stage.frozen     = false;

    State.recalculate();
    State.syncGunSlots();

    State.player.isDead = false;
    State.player.maxHp  = State.computed.maxHp;
    State.player.hp     = State.player.maxHp;

    State.enemy        = null;
    this.enemyTimer    = 0;
    this.gunTimers     = [];
    this.paused        = false;

    UI.hideDeathOverlay();
    UI.renderUpgrades();
    Save.save();
    this._log('환생! 새로운 시작...');
  },

  // 진행 멈춤 (사망 후 이전 스테이지 재시작)
  doContinue() {
    State.stage.current    = Math.max(1, State.stage.current - 1);
    State.stage.enemyIndex = 0;
    State.stage.frozen     = true;
    State.player.isDead    = false;
    State.player.hp        = State.player.maxHp;
    State.enemy            = null;
    this.enemyTimer        = 0;
    this.gunTimers         = [];
    this.paused            = false;

    UI.hideDeathOverlay();
    UI.renderFreezeBtn();
    this._log('진행 멈춤 모드로 재시작');
  },

  // ── 복귀 연산 (오프라인 보상) ──
  calcOfflineRewards(elapsedSec) {
    if (elapsedSec < 5) return;
    if (!State.enemy) return;

    const dps = State.getTotalDPS();
    if (dps <= 0) return;

    const e        = State.enemy;
    const killTime = e.maxHp / dps;
    if (killTime <= 0) return;

    const kills    = Math.floor(elapsedSec / killTime);
    if (kills <= 0) return;

    const base     = e.type === 'boss' ? 8 : e.type === 'miniboss' ? 3 : 1;
    const drops    = Math.floor(kills * base * C.OFFLINE_REWARD_MULT * State.computed.dropMult);
    State.resources.drops += drops;

    // 강화석 누적도 계산
    if (e.type === 'normal') {
      const totalNormalKills = kills + State.resources.normalKills;
      const newStones        = Math.floor(totalNormalKills / C.STONE_KILLS_PER_STONE);
      State.resources.normalKills        = totalNormalKills % C.STONE_KILLS_PER_STONE;
      State.resources.pendingStones     += newStones;
    }

    this._log(`오프라인 보상: +${fmtN(drops)} 전리품 (${kills}킬, ${Math.floor(elapsedSec)}초)`);
  },

  _log(html) {
    this.log.unshift(html);
    if (this.log.length > C.LOG_MAX) this.log.pop();
  },
};
