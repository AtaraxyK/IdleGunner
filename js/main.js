'use strict';

// ── 숫자 표기 (1000=1A, 1000A=1B, ...) ──
function fmtN(n) {
  n = Math.floor(n);
  if (n < 1000) return n.toString();

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function getSuffix(idx) {
    if (idx < 26) return LETTERS[idx];
    return LETTERS[Math.floor((idx - 26) / 26)] + LETTERS[(idx - 26) % 26];
  }

  let val = n, exp = 0;
  while (val >= 1000) { val /= 1000; exp++; }

  const suffix = getSuffix(exp - 1);
  const numStr = val >= 100 ? Math.floor(val).toString()
               : val >= 10  ? val.toFixed(1)
               :               val.toFixed(2);
  return numStr + suffix;
}

// ── 진입점 ──
window.addEventListener('DOMContentLoaded', () => {
  State.init();

  if (!Save.load()) {
    State.init();
  }

  Combat.start();
  UI.renderUpgrades();
  UI.renderGuns();
  UI.renderFreezeBtn();

  // 탭
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => UI.setActiveTab(btn.dataset.tab));
  });

  // 진행 멈춤 토글
  document.getElementById('freeze-btn').addEventListener('click', () => {
    State.stage.frozen = !State.stage.frozen;
    UI.renderFreezeBtn();
    Combat._log(`진행 멈춤 ${State.stage.frozen ? '활성화' : '해제'}`);
    Save.save();
  });

  // 사망 오버레이 — 진행 멈춤
  document.getElementById('continue-btn').addEventListener('click', () => {
    Combat.doContinue();
  });

  // 사망 오버레이 — 환생
  document.getElementById('rebirth-btn').addEventListener('click', () => {
    Combat.doRebirth();
  });

  // 주기적 저장
  setInterval(() => Save.save(), C.SAVE_INTERVAL_MS);

  // 탭 전환 시 오프라인 보상
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
