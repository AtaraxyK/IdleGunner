'use strict';

// ── 숫자 표기 (문서 기준: 1000=1A, 1000A=1B, ...) ──
function fmtN(n) {
  n = Math.floor(n);
  if (n < 1000) return n.toString();

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function getSuffix(idx) {
    if (idx < 26) return LETTERS[idx];
    const first  = Math.floor((idx - 26) / 26);
    const second = (idx - 26) % 26;
    return LETTERS[first] + LETTERS[second];
  }

  let val = n;
  let exp = 0;
  while (val >= 1000) { val /= 1000; exp++; }

  const suffix = getSuffix(exp - 1);
  let numStr;
  if (val >= 100)     numStr = Math.floor(val).toString();
  else if (val >= 10) numStr = val.toFixed(1);
  else                numStr = val.toFixed(2);

  // 999.99A를 넘으면 올림 방지 (소수점 표시 시 1000 이상 되지 않게)
  return numStr + suffix;
}

// ── 진입점 ──
window.addEventListener('DOMContentLoaded', () => {
  State.init();

  const loaded = Save.load();
  if (!loaded) {
    State.init();
  }

  Combat.start();
  UI.renderUpgrades();
  UI.renderGuns();
  UI.renderFreezeBtn();

  // 탭 버튼
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => UI.setActiveTab(btn.dataset.tab));
  });

  // 진행 멈춤 버튼
  document.getElementById('freeze-btn').addEventListener('click', () => {
    State.stage.frozen = !State.stage.frozen;
    UI.renderFreezeBtn();
    Combat._log(`진행 멈춤 ${State.stage.frozen ? '활성화' : '해제'}`);
    Save.save();
  });

  // 사망 오버레이
  document.getElementById('continue-btn').addEventListener('click', () => {
    Combat.doContinue();
  });

  document.getElementById('rebirth-btn').addEventListener('click', () => {
    Combat.doRebirth();
  });

  // 총기 획득 오버레이 - 장착
  document.getElementById('gun-equip-btn').addEventListener('click', () => {
    const gun = State.guns.pendingGun;
    if (!gun) { UI.hideGunAcquireOverlay(); return; }

    const selected = document.querySelector('.slot-select-btn.selected');
    const slot = selected ? parseInt(selected.dataset.slot) : 0;

    // 기존 총기 해체 처리
    const oldGun = State.guns.equipped[slot];
    if (oldGun && !oldGun.isDefault) {
      const frags = oldGun.grade + 1;
      State.resources.fragments += frags;
      Combat._log(`${oldGun.name} 해체: +${frags} 총기 조각`);
      _checkArtifactCraft();
    }

    State.guns.equipped[slot] = { ...gun };
    Combat._log(`${gun.name} [슬롯 ${slot + 1}] 장착!`);
    UI.hideGunAcquireOverlay();
    UI.renderGuns();
    UI._upgradesDirty = true;
    Save.save();
  });

  // 총기 획득 오버레이 - 해체
  document.getElementById('gun-discard-btn').addEventListener('click', () => {
    const gun = State.guns.pendingGun;
    if (gun) {
      const frags = gun.grade + 1;
      State.resources.fragments += frags;
      Combat._log(`${gun.name} 해체: +${frags} 총기 조각`);
      _checkArtifactCraft();
    }
    UI.hideGunAcquireOverlay();
    UI._upgradesDirty = true;
    Save.save();
  });

  // 주기적 저장
  setInterval(() => Save.save(), C.SAVE_INTERVAL_MS);

  // 탭 전환 시 오프라인 보상 계산
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const elapsed = (Date.now() - State.lastSaveTime) / 1000;
      Combat.calcOfflineRewards(elapsed);
      State.lastSaveTime = Date.now();
    } else {
      Save.save();
    }
  });
});

// 총기 조각 100개 달성 시 자동 알림 (제작은 수동)
function _checkArtifactCraft() {
  if (State.resources.fragments >= C.GUN_FRAGMENTS_FOR_ARTIFACT) {
    Combat._log(`총기 조각 ${C.GUN_FRAGMENTS_FOR_ARTIFACT}개 달성! [유물] 탭에서 제작하세요.`);
    UI._upgradesDirty = true;
  }
}
