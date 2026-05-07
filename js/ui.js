'use strict';

const UI = {
  _activeTab:     'basic',
  _lastDrops:     -1,
  _lastStones:    -1,
  _lastQueueLen:  -1,
  _upgradesDirty: true,

  // ── 전투 렌더링 (틱마다) ──
  renderCombat() {
    const p   = State.player;
    const e   = State.enemy;
    const s   = State.stage;
    const res = State.resources;

    // 리소스 바
    document.getElementById('stage-display').textContent =
      `${s.current}-${s.enemyIndex + 1}${s.frozen ? ' [고정]' : ''}`;
    document.getElementById('max-stage-display').textContent = s.maxReached;
    document.getElementById('drops-display').textContent     = fmtN(res.drops);
    document.getElementById('stones-display').textContent    = fmtN(res.stones);
    document.getElementById('fragments-display').textContent = fmtN(res.fragments);
    document.getElementById('dps-display').textContent       = fmtN(Math.floor(State.getTotalDPS()));

    // 플레이어 HP
    const pPct = Math.max(0, p.hp / p.maxHp * 100);
    document.getElementById('player-hp-bar').style.width = pPct + '%';
    document.getElementById('player-hp-text').textContent =
      `${fmtN(Math.max(0, Math.floor(p.hp)))} / ${fmtN(p.maxHp)}`;

    // 적 HP
    if (e) {
      document.getElementById('enemy-name').textContent     = e.name;
      document.getElementById('enemy-hp-bar').style.width  = Math.max(0, e.hp / e.maxHp * 100) + '%';
      document.getElementById('enemy-hp-text').textContent =
        `${fmtN(Math.max(0, Math.ceil(e.hp)))} / ${fmtN(e.maxHp)}`;
      document.getElementById('enemy-atk-text').textContent = `공격력: ${fmtN(e.attack)} / 초`;
    } else {
      document.getElementById('enemy-name').textContent     = '이동 중...';
      document.getElementById('enemy-hp-bar').style.width  = '0%';
      document.getElementById('enemy-hp-text').textContent = '';
      document.getElementById('enemy-atk-text').textContent = '';
    }

    // 전투 로그
    document.getElementById('combat-log').innerHTML = Combat.log.join('<br>');

    // 업그레이드 패널 (재화 변동 시)
    const drops  = res.drops;
    const stones = res.stones;
    const qLen   = State.guns.queue.length;
    if (drops !== this._lastDrops || stones !== this._lastStones ||
        qLen !== this._lastQueueLen || this._upgradesDirty) {
      this._lastDrops    = drops;
      this._lastStones   = stones;
      this._lastQueueLen = qLen;
      this._upgradesDirty = false;
      this.renderUpgrades();
      this.renderGuns();
    }
  },

  // ── 총기 슬롯 + 대기열 ──
  renderGuns() {
    // 장착 슬롯
    const slotsEl = document.getElementById('gun-slots');
    const guns    = State.guns.equipped;
    const slots   = State.computed.gunSlots;
    let html = '';
    for (let i = 0; i < slots; i++) {
      const g = guns[i];
      if (g) {
        const s   = State.getGunStats(g);
        const col = C.GRADE_COLORS[g.grade];
        html += `
          <div class="gun-slot grade-${g.grade}">
            <div class="gun-name" style="color:${col}">[${C.GRADE_NAMES[g.grade]}] ${g.name}</div>
            <div class="gun-stats">
              공격력 ${fmtN(Math.floor(s.attack))} &nbsp;|&nbsp;
              ${(60 / s.attackInterval).toFixed(2)}회/초<br>
              크리 ${(s.critChance / 100).toFixed(1)}% / ${s.critDmg}% &nbsp;|&nbsp;
              DPS ${fmtN(Math.floor(State.getGunDPS(g)))}
            </div>
          </div>`;
      } else {
        html += `<div class="gun-slot empty-slot">슬롯 ${i + 1} — 비어있음</div>`;
      }
    }
    slotsEl.innerHTML = html;

    // 총기 대기열
    this._renderGunQueue();
  },

  _renderGunQueue() {
    let section = document.getElementById('gun-queue-section');
    const queue = State.guns.queue;

    if (!section) {
      section = document.createElement('div');
      section.id = 'gun-queue-section';
      document.getElementById('guns-panel').appendChild(section);
    }

    if (queue.length === 0) {
      section.innerHTML = '';
      return;
    }

    let html = `<div class="gun-queue-header">
      획득 대기
      <span class="gun-queue-badge">${queue.length}</span>
    </div>`;

    queue.forEach((gun, qIdx) => {
      const s       = State.getGunStats(gun);
      const newDPS  = State.getGunDPS(gun);
      const col     = C.GRADE_COLORS[gun.grade];

      // 장착 총기와 DPS 비교
      let compareHtml = '';
      State.guns.equipped.forEach((eq, si) => {
        if (!eq) {
          compareHtml += `<span>슬롯${si+1}: 비어있음</span> `;
        } else {
          const eqDPS = State.getGunDPS(eq);
          const diff  = newDPS - eqDPS;
          const cls   = diff > 0 ? 'better' : diff < 0 ? 'worse' : 'equal';
          const sign  = diff > 0 ? '+' : '';
          compareHtml += `<span class="${cls}">슬롯${si+1}: ${sign}${fmtN(Math.floor(diff))} DPS</span> `;
        }
      });

      // 슬롯 선택 버튼
      let slotBtns = '';
      State.guns.equipped.forEach((eq, si) => {
        const label = eq ? `S${si+1}:${C.GRADE_NAMES[eq.grade][0]}` : `S${si+1}:빈`;
        slotBtns += `<button class="slot-select-btn${si === 0 ? ' selected' : ''}"
          data-qidx="${qIdx}" data-slot="${si}">${label}</button>`;
      });

      const fragYield = gun.grade + 1;
      html += `
        <div class="gun-queue-item">
          <div class="gun-queue-item-header">
            <span style="color:${col};font-weight:bold">[${C.GRADE_NAMES[gun.grade]}] ${gun.name}</span>
            <div class="gun-queue-item-actions">
              <button class="btn btn-sm btn-blue queue-equip-btn" data-qidx="${qIdx}">장착</button>
              <button class="btn btn-sm btn-gray queue-discard-btn" data-qidx="${qIdx}">해체(+${fragYield})</button>
            </div>
          </div>
          <div class="gun-stats">
            공격력 ${fmtN(Math.floor(s.attack))} | ${(60/s.attackInterval).toFixed(2)}회/초 |
            크리 ${(s.critChance/100).toFixed(1)}%/${s.critDmg}% | DPS ${fmtN(Math.floor(newDPS))}
          </div>
          <div class="gun-compare">${compareHtml}</div>
          <div class="gun-slot-select-row">${slotBtns}</div>
        </div>`;
    });

    section.innerHTML = html;

    // 슬롯 선택 토글
    section.querySelectorAll('.slot-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = btn.dataset.qidx;
        section.querySelectorAll(`.slot-select-btn[data-qidx="${qIdx}"]`)
               .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // 장착 버튼
    section.querySelectorAll('.queue-equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.qidx);
        const selected = section.querySelector(`.slot-select-btn[data-qidx="${qIdx}"].selected`);
        const slot     = selected ? parseInt(selected.dataset.slot) : 0;
        this._equipQueuedGun(qIdx, slot);
      });
    });

    // 해체 버튼
    section.querySelectorAll('.queue-discard-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._discardQueuedGun(parseInt(btn.dataset.qidx));
      });
    });
  },

  _equipQueuedGun(qIdx, slot) {
    const gun = State.guns.queue[qIdx];
    if (!gun) return;

    const old = State.guns.equipped[slot];
    if (old && !old.isDefault) {
      const frags = old.grade + 1;
      State.resources.fragments += frags;
      Combat._log(`${old.name} 해체: +${frags} 총기 조각`);
      this._checkFragments();
    }

    State.guns.equipped[slot] = { ...gun };
    State.guns.queue.splice(qIdx, 1);
    Combat._log(`${gun.name} [슬롯 ${slot + 1}] 장착!`);
    this._upgradesDirty = true;
    Save.save();
  },

  _discardQueuedGun(qIdx) {
    const gun = State.guns.queue[qIdx];
    if (!gun) return;
    const frags = gun.grade + 1;
    State.resources.fragments += frags;
    State.guns.queue.splice(qIdx, 1);
    Combat._log(`${gun.name} 해체: +${frags} 총기 조각`);
    this._checkFragments();
    this._upgradesDirty = true;
    Save.save();
  },

  _checkFragments() {
    if (State.resources.fragments >= C.GUN_FRAGMENTS_FOR_ARTIFACT) {
      Combat._log(`총기 조각 ${C.GUN_FRAGMENTS_FOR_ARTIFACT}개! [유물] 탭에서 제작하세요.`);
    }
  },

  // ── 강화 패널 ──
  renderUpgrades() {
    const content = document.getElementById('upgrade-content');
    let html = '';

    if (this._activeTab === 'basic')         html = this._buildBasicUpgrades();
    else if (this._activeTab === 'stone')     html = this._buildStoneUpgrades();
    else if (this._activeTab === 'artifacts') html = this._buildArtifacts();

    content.innerHTML = html;

    // +1 버튼
    content.querySelectorAll('.upgrade-btn[data-key][data-mode="1"]').forEach(btn => {
      btn.addEventListener('click', () => {
        Upgrades.buy(btn.dataset.key);
        this._upgradesDirty = true;
      });
    });

    // MAX 버튼
    content.querySelectorAll('.upgrade-btn[data-key][data-mode="max"]').forEach(btn => {
      btn.addEventListener('click', () => {
        Upgrades.buyMax(btn.dataset.key);
        this._upgradesDirty = true;
      });
    });

    // 유물 제작 버튼
    const craftBtn = document.getElementById('craft-artifact-btn');
    if (craftBtn) {
      craftBtn.addEventListener('click', () => {
        this._craftArtifact();
        this._upgradesDirty = true;
      });
    }
  },

  _buildBasicUpgrades() {
    const u = State.upgrades;
    const d = State.resources.drops;
    const items = [
      { key: 'basicHp',       name: '플레이어 HP 성장',   level: u.basicHp,       desc: `+${C.BASIC_HP_PER_LEVEL} 최대 HP`,                         avail: d },
      { key: 'basicGunAtk',   name: '총기 공격력 강화',   level: u.basicGunAtk,   desc: `+${C.BASIC_GUN_ATK_PER_LEVEL} 전체 총기 공격력`,            avail: d },
      { key: 'basicCrit',     name: '크리티컬 확률 증가', level: u.basicCrit,     desc: `+${(C.BASIC_CRIT_PER_LEVEL/100).toFixed(0)}% 크리확`,        avail: d },
      { key: 'basicCritDmg',  name: '크리티컬 데미지 강화', level: u.basicCritDmg, desc: `+${C.BASIC_CRIT_DMG_PER_LEVEL}% 크리뎀`,                   avail: d },
      { key: 'basicAtkSpeed', name: '총기 공격 속도 강화', level: u.basicAtkSpeed, desc: `공격 간격 -${C.BASIC_ATK_SPEED_PER_LEVEL} (빠르게)`,        avail: d },
      { key: 'basicGunSlot',  name: '총기 슬롯 추가',     level: u.basicGunSlot,  desc: '+1 총기 장착 슬롯',                                          avail: d, max: C.BASIC_MAX_GUN_SLOTS },
    ];
    return this._buildList(items, '전리품');
  },

  _buildStoneUpgrades() {
    const u = State.upgrades;
    const s = State.resources.stones;
    const items = [
      { key: 'stoneHp',       name: 'HP 강화',              level: u.stoneHp,       desc: `+${C.STONE_HP_PER_LEVEL} 최대 HP`,                           avail: s },
      { key: 'stoneGunAtk',   name: '총기 공격력 강화',     level: u.stoneGunAtk,   desc: `+${(C.STONE_GUN_ATK_MULT_PER_LEVEL*100).toFixed(0)}% 공격력`, avail: s },
      { key: 'stoneCrit',     name: '크리티컬 확률 증가',   level: u.stoneCrit,     desc: `+${(C.STONE_CRIT_PER_LEVEL/100).toFixed(0)}% 크리확`,         avail: s },
      { key: 'stoneCritDmg',  name: '크리티컬 데미지 강화', level: u.stoneCritDmg,  desc: `+${C.STONE_CRIT_DMG_PER_LEVEL}% 크리뎀`,                     avail: s },
      { key: 'stoneAtkSpeed', name: '총기 공격 속도 강화',  level: u.stoneAtkSpeed, desc: `공격 간격 -${C.STONE_ATK_SPEED_PER_LEVEL} (빠르게)`,          avail: s },
      { key: 'stoneGunSlot',  name: '총기 슬롯 추가',       level: u.stoneGunSlot,  desc: '+1 총기 장착 슬롯', avail: s, max: C.STONE_MAX_GUN_SLOTS },
      { key: 'stoneDrop',     name: '전리품 획득량 증가',   level: u.stoneDrop,     desc: `+${(C.STONE_DROP_PER_LEVEL*100).toFixed(0)}% 전리품`,          avail: s },
      { key: 'stoneExp',      name: '경험치 획득량 증가',   level: u.stoneExp,      desc: `+${(C.STONE_EXP_PER_LEVEL*100).toFixed(0)}% 경험치 (예정)`,   avail: s },
    ];
    return this._buildList(items, '강화석');
  },

  _buildList(items, currency) {
    return items.map(item => {
      const canBuy = Upgrades.canBuy(item.key);
      const cost   = Upgrades.getCost(item.key);
      const def    = Upgrades._defs[item.key];
      const maxed  = def.max != null && item.level >= def.max;

      // MAX 버튼: 몇 번 살 수 있는지 계산
      let maxCount = 0;
      if (!maxed) {
        let tmpRes = item.avail;
        let tmpLvl = item.level;
        while (true) {
          if (def.max != null && tmpLvl >= def.max) break;
          const c = Math.floor(def.base * Math.pow(def.mult, tmpLvl));
          if (tmpRes < c) break;
          tmpRes -= c;
          tmpLvl++;
          maxCount++;
        }
      }

      return `
        <div class="upgrade-item${canBuy ? ' can-buy' : ''}${maxed ? ' maxed' : ''}">
          <div class="upgrade-name">${item.name} <span class="upgrade-level">Lv.${item.level}</span></div>
          <div class="upgrade-desc">${item.desc}</div>
          <div class="upgrade-btn-row">
            <button class="upgrade-btn" data-key="${item.key}" data-mode="1"
              ${(canBuy && !maxed) ? '' : 'disabled'}>
              +1<br><span style="font-size:9px">${maxed ? 'MAX' : fmtN(cost) + ' ' + currency}</span>
            </button>
            <button class="upgrade-btn max-btn" data-key="${item.key}" data-mode="max"
              ${(maxCount > 0) ? '' : 'disabled'}>
              MAX<br><span style="font-size:9px">${maxCount > 0 ? `×${maxCount}` : '—'}</span>
            </button>
          </div>
        </div>`;
    }).join('');
  },

  _buildArtifacts() {
    const frags = State.resources.fragments;
    const arts  = State.resources.artifacts;
    const need  = C.GUN_FRAGMENTS_FOR_ARTIFACT;

    let html = `<div class="artifact-frags-bar">
      총기 조각 ${fmtN(frags)} / ${fmtN(need)}
      ${frags >= need ? `<button id="craft-artifact-btn" class="btn btn-blue btn-sm" style="margin-left:8px">유물 제작</button>` : ''}
    </div>`;

    if (arts.length === 0) {
      html += `<div class="empty-msg">아직 유물이 없습니다.<br>총기 조각 ${need}개를 모아 제작하세요.</div>`;
    } else {
      html += arts.map(a => `
        <div class="artifact-item">
          <div class="artifact-name">${a.name} <span class="upgrade-level">Lv.${a.level}</span></div>
          <div class="artifact-desc">${a.effect}</div>
        </div>`).join('');
    }
    return html;
  },

  _craftArtifact() {
    if (State.resources.fragments < C.GUN_FRAGMENTS_FOR_ARTIFACT) return;
    State.resources.fragments -= C.GUN_FRAGMENTS_FOR_ARTIFACT;

    const pool = C.ARTIFACT_POOL;
    const art  = pool[Math.floor(Math.random() * pool.length)];
    const ex   = State.resources.artifacts.find(a => a.id === art.id);
    if (ex) {
      ex.level++;
      Combat._log(`유물 레벨업: ${ex.name} Lv.${ex.level}`);
    } else {
      State.resources.artifacts.push({ ...art, level: 1 });
      Combat._log(`새 유물 획득: ${art.name}`);
    }
    State.recalculate();
    State.player.maxHp = State.computed.maxHp;
    Save.save();
  },

  // ── 진행 멈춤 버튼 ──
  renderFreezeBtn() {
    const btn = document.getElementById('freeze-btn');
    if (State.stage.frozen) {
      btn.textContent = '진행 멈춤 해제';
      btn.classList.add('btn-active');
    } else {
      btn.textContent = '진행 멈춤';
      btn.classList.remove('btn-active');
    }
  },

  // ── 사망 오버레이 ──
  showDeathOverlay() {
    document.getElementById('pending-stones-text').textContent =
      fmtN(State.resources.pendingStones);
    document.getElementById('death-overlay').classList.remove('hidden');
  },

  hideDeathOverlay() {
    document.getElementById('death-overlay').classList.add('hidden');
  },

  setActiveTab(tab) {
    this._activeTab     = tab;
    this._upgradesDirty = true;
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab));
    this.renderUpgrades();
  },
};
