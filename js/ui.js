'use strict';

const UI = {
  _activeTab:      'basic',
  _lastDrops:      -1,
  _lastStones:     -1,
  _upgradesDirty:  true,

  // ── 전투 관련 렌더링 (틱마다 호출) ──
  renderCombat() {
    const p = State.player;
    const e = State.enemy;

    // 리소스 바
    const drops   = State.resources.drops;
    const stones  = State.resources.stones;
    const frags   = State.resources.fragments;
    const dps     = State.getTotalDPS();
    const stg     = State.stage;

    document.getElementById('stage-display').textContent =
      `${stg.current}-${stg.enemyIndex + 1}${stg.frozen ? ' [고정]' : ''}`;
    document.getElementById('max-stage-display').textContent = stg.maxReached;
    document.getElementById('drops-display').textContent    = fmtN(drops);
    document.getElementById('stones-display').textContent   = fmtN(stones);
    document.getElementById('fragments-display').textContent = fmtN(frags);
    document.getElementById('dps-display').textContent      = fmtN(Math.floor(dps));

    // 플레이어 HP
    const pPct = Math.max(0, (p.hp / p.maxHp) * 100);
    document.getElementById('player-hp-bar').style.width = pPct + '%';
    document.getElementById('player-hp-text').textContent =
      `${fmtN(Math.max(0, Math.floor(p.hp)))} / ${fmtN(p.maxHp)}`;

    // 적 HP
    if (e) {
      const ePct = Math.max(0, (e.hp / e.maxHp) * 100);
      document.getElementById('enemy-name').textContent    = e.name;
      document.getElementById('enemy-hp-bar').style.width = ePct + '%';
      document.getElementById('enemy-hp-text').textContent =
        `${fmtN(Math.max(0, Math.ceil(e.hp)))} / ${fmtN(e.maxHp)}`;
      document.getElementById('enemy-atk-text').textContent = `공격력: ${fmtN(e.attack)} / 초`;
    } else {
      document.getElementById('enemy-name').textContent     = '이동 중...';
      document.getElementById('enemy-hp-bar').style.width   = '0%';
      document.getElementById('enemy-hp-text').textContent  = '';
      document.getElementById('enemy-atk-text').textContent = '';
    }

    // 전투 로그
    document.getElementById('combat-log').innerHTML = Combat.log.join('<br>');

    // 업그레이드 구매 가능 여부 변경 시 재렌더
    if (drops !== this._lastDrops || stones !== this._lastStones || this._upgradesDirty) {
      this._lastDrops  = drops;
      this._lastStones = stones;
      this._upgradesDirty = false;
      this.renderUpgrades();
    }

    // 총기 슬롯 (틱마다 갱신하면 무겁지만, 작은 게임이라 OK)
    this.renderGuns();
  },

  // ── 총기 슬롯 ──
  renderGuns() {
    const container = document.getElementById('gun-slots');
    const guns = State.guns.equipped;
    const slots = State.computed.gunSlots;

    // 간단히 innerHTML 재생성 (슬롯 수가 적으므로 성능 문제 없음)
    let html = '';
    for (let i = 0; i < slots; i++) {
      const gun = guns[i];
      if (gun) {
        const s    = State.getGunStats(gun);
        const col  = C.GRADE_COLORS[gun.grade];
        const atkPerSec = (60 / s.attackInterval).toFixed(2);
        html += `
          <div class="gun-slot grade-${gun.grade}">
            <div class="gun-name" style="color:${col}">[${C.GRADE_NAMES[gun.grade]}] ${gun.name}</div>
            <div class="gun-stats">
              공격력 ${fmtN(Math.floor(s.attack))} &nbsp;|&nbsp;
              ${atkPerSec}회/초 &nbsp;|&nbsp;
              크리 ${(s.critChance / 100).toFixed(1)}% / ${s.critDmg}%
            </div>
          </div>`;
      } else {
        html += `<div class="gun-slot empty-slot">슬롯 ${i + 1} — 비어있음</div>`;
      }
    }
    container.innerHTML = html;
  },

  // ── 강화 패널 ──
  renderUpgrades() {
    const tab     = this._activeTab;
    const content = document.getElementById('upgrade-content');
    let html = '';

    if (tab === 'basic')     html = this._buildBasicUpgrades();
    else if (tab === 'stone') html = this._buildStoneUpgrades();
    else if (tab === 'artifacts') html = this._buildArtifacts();

    content.innerHTML = html;

    content.querySelectorAll('.upgrade-btn[data-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        Upgrades.buy(btn.dataset.key);
        this._upgradesDirty = true;
      });
    });

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
      {
        key:   'basicHp',
        name:  '플레이어 HP 성장',
        level: u.basicHp,
        desc:  `+${C.BASIC_HP_PER_LEVEL} 최대 HP`,
        currency: '전리품',
        avail: d,
      },
      {
        key:   'basicGunAtk',
        name:  '총기 공격력 성장',
        level: u.basicGunAtk,
        desc:  `+${C.BASIC_GUN_ATK_PER_LEVEL} 전체 총기 공격력`,
        currency: '전리품',
        avail: d,
      },
      {
        key:   'basicGunSlot',
        name:  '총기 슬롯 추가',
        level: u.basicGunSlot,
        desc:  '+1 총기 장착 슬롯',
        currency: '전리품',
        avail: d,
        max:   C.BASIC_MAX_GUN_SLOTS,
      },
    ];
    return this._buildList(items);
  },

  _buildStoneUpgrades() {
    const u = State.upgrades;
    const s = State.resources.stones;

    const items = [
      { key: 'stoneHp',        name: 'HP 강화',              level: u.stoneHp,        desc: `+${C.STONE_HP_PER_LEVEL} 최대 HP`,                      currency: '강화석', avail: s },
      { key: 'stoneGunAtk',    name: '총기 공격력 강화',      level: u.stoneGunAtk,    desc: `+${(C.STONE_GUN_ATK_MULT_PER_LEVEL*100).toFixed(0)}% 공격력`, currency: '강화석', avail: s },
      { key: 'stoneCrit',      name: '크리티컬 확률',         level: u.stoneCrit,      desc: `+${(C.STONE_CRIT_PER_LEVEL/100).toFixed(0)}% 크리확`,    currency: '강화석', avail: s },
      { key: 'stoneCritDmg',   name: '크리티컬 데미지',       level: u.stoneCritDmg,   desc: `+${C.STONE_CRIT_DMG_PER_LEVEL}% 크리뎀`,                currency: '강화석', avail: s },
      { key: 'stoneAtkSpeed',  name: '총기 공격 속도',        level: u.stoneAtkSpeed,  desc: `공격 간격 -${C.STONE_ATK_SPEED_PER_LEVEL} (빠르게)`,     currency: '강화석', avail: s },
      { key: 'stoneGunSlot',   name: '총기 슬롯 추가',        level: u.stoneGunSlot,   desc: '+1 총기 장착 슬롯', currency: '강화석', avail: s, max: C.STONE_MAX_GUN_SLOTS },
      { key: 'stoneDropBonus', name: '전리품 획득량 증가',    level: u.stoneDropBonus, desc: `+${(C.STONE_DROP_BONUS_PER_LEVEL*100).toFixed(0)}% 전리품`, currency: '강화석', avail: s },
    ];
    return this._buildList(items);
  },

  _buildList(items) {
    return items.map(item => {
      const canBuy  = Upgrades.canBuy(item.key);
      const cost    = Upgrades.getCost(item.key);
      const def     = Upgrades._defs[item.key];
      const maxed   = def.max != null && item.level >= def.max;
      return `
        <div class="upgrade-item${canBuy ? ' can-buy' : ''}${maxed ? ' maxed' : ''}">
          <div class="upgrade-name">${item.name} <span class="upgrade-level">Lv.${item.level}</span></div>
          <div class="upgrade-desc">${item.desc}</div>
          <button class="upgrade-btn" data-key="${item.key}" ${(canBuy && !maxed) ? '' : 'disabled'}>
            ${maxed ? 'MAX' : `${fmtN(cost)} ${item.currency}`}
          </button>
        </div>`;
    }).join('');
  },

  _buildArtifacts() {
    const frags = State.resources.fragments;
    const arts  = State.resources.artifacts;
    const need  = C.GUN_FRAGMENTS_FOR_ARTIFACT;

    let html = `<div class="artifact-frags-bar">
      총기 조각 ${fmtN(frags)} / ${fmtN(need)}
      ${frags >= need ? `<button id="craft-artifact-btn" class="btn btn-blue" style="margin-left:10px;padding:3px 10px">유물 제작</button>` : ''}
    </div>`;

    if (arts.length === 0) {
      html += `<div class="empty-msg">아직 유물이 없습니다.<br>총기 조각 ${need}개를 모아 유물을 제작하세요.</div>`;
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
    const frags = State.resources.fragments;
    if (frags < C.GUN_FRAGMENTS_FOR_ARTIFACT) return;
    State.resources.fragments -= C.GUN_FRAGMENTS_FOR_ARTIFACT;

    const pool = C.ARTIFACT_POOL;
    const art  = pool[Math.floor(Math.random() * pool.length)];
    const existing = State.resources.artifacts.find(a => a.id === art.id);
    if (existing) {
      existing.level++;
      Combat._log(`유물 레벨업: ${existing.name} Lv.${existing.level}`);
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

  // ── 총기 획득 오버레이 ──
  showGunAcquireOverlay(gun) {
    const s   = State.getGunStats(gun);
    const col = C.GRADE_COLORS[gun.grade];

    document.getElementById('new-gun-info').innerHTML = `
      <div style="color:${col};font-weight:bold">[${C.GRADE_NAMES[gun.grade]}] ${gun.name}</div>
      <div>공격력: ${fmtN(Math.floor(s.attack))}</div>
      <div>공격속도: ${(60 / s.attackInterval).toFixed(2)}회/초 (간격 ${s.attackInterval})</div>
      <div>크리 확률: ${(s.critChance / 100).toFixed(1)}%  /  크리 데미지: ${s.critDmg}%</div>`;

    // 슬롯 선택 버튼
    const slotSel = document.getElementById('gun-slot-select');
    slotSel.innerHTML = '';
    State.guns.equipped.forEach((g, i) => {
      const btn = document.createElement('button');
      btn.className = 'slot-select-btn' + (i === 0 ? ' selected' : '');
      btn.dataset.slot = i;
      btn.textContent = g
        ? `슬롯 ${i + 1}: [${C.GRADE_NAMES[g.grade]}] ${g.name} (공격력 ${fmtN(Math.floor(State.getGunStats(g).attack))})`
        : `슬롯 ${i + 1}: 비어있음`;
      btn.addEventListener('click', () => {
        slotSel.querySelectorAll('.slot-select-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      slotSel.appendChild(btn);
    });

    const fragYield = gun.grade + 1;
    document.getElementById('discard-frags-text').textContent = `(+${fragYield} 조각)`;

    document.getElementById('gun-acquire-overlay').classList.remove('hidden');
  },

  hideGunAcquireOverlay() {
    document.getElementById('gun-acquire-overlay').classList.add('hidden');
    State.guns.pendingGun = null;
    Combat.paused = false;
  },

  setActiveTab(tab) {
    this._activeTab = tab;
    this._upgradesDirty = true;
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab));
    this.renderUpgrades();
  },
};
