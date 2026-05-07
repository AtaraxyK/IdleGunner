'use strict';

const C = {
  // ── 적 스탯 스케일링 ──
  ENEMY_BASE_HP:        15,
  ENEMY_BASE_ATK:       2,
  ENEMY_HP_SCALE:       1.18,
  ENEMY_ATK_SCALE:      1.10,
  MINIBOSS_HP_MULT:     3,
  MINIBOSS_ATK_MULT:    1.5,
  BOSS_HP_MULT:         5,
  BOSS_ATK_MULT:        2,
  ENEMIES_PER_STAGE:    10,

  // ── 플레이어 기본값 ──
  PLAYER_BASE_HP:        100,
  PLAYER_BASE_GUN_SLOTS: 1,

  // ── 기본 권총 ──
  DEFAULT_GUN: {
    id:             'default',
    name:           '기본 권총',
    grade:          0,
    attack:         5,
    attackInterval: 60,   // 낮을수록 빠름. 60 = 1초당 1회
    critChance:     0,    // 0~10000 (10000 = 100%)
    critDmg:        150,  // % (150 → 피해의 1.5배)
    isDefault:      true,
  },

  // ── 등급 ──
  GRADE_NAMES:  ['기본', '일반', '희귀', '영웅', '전설'],
  GRADE_COLORS: ['#888', '#4caf50', '#2196f3', '#9c27b0', '#ffd700'],

  // ══════════════════════════════════════
  // 기본 강화 비용 (몬스터 전리품)
  // ══════════════════════════════════════
  BASIC_HP_BASE_COST:          10,
  BASIC_HP_COST_MULT:          1.4,
  BASIC_HP_PER_LEVEL:          20,

  BASIC_GUN_ATK_BASE_COST:     15,
  BASIC_GUN_ATK_COST_MULT:     1.4,
  BASIC_GUN_ATK_PER_LEVEL:     2,

  BASIC_CRIT_BASE_COST:        20,
  BASIC_CRIT_COST_MULT:        1.5,
  BASIC_CRIT_PER_LEVEL:        100,   // +1% 크리확 (out of 10000)

  BASIC_CRIT_DMG_BASE_COST:    20,
  BASIC_CRIT_DMG_COST_MULT:    1.5,
  BASIC_CRIT_DMG_PER_LEVEL:    8,     // +8% 크리뎀

  BASIC_ATK_SPEED_BASE_COST:   25,
  BASIC_ATK_SPEED_COST_MULT:   1.5,
  BASIC_ATK_SPEED_PER_LEVEL:   2,     // attackInterval -2

  BASIC_GUN_SLOT_BASE_COST:    400,
  BASIC_GUN_SLOT_COST_MULT:    10,
  BASIC_MAX_GUN_SLOTS:         2,

  // ══════════════════════════════════════
  // 강화석 강화 비용
  // ══════════════════════════════════════
  STONE_HP_BASE_COST:            3,
  STONE_HP_COST_MULT:            1.5,
  STONE_HP_PER_LEVEL:            30,

  STONE_GUN_ATK_BASE_COST:       2,
  STONE_GUN_ATK_COST_MULT:       1.5,
  STONE_GUN_ATK_MULT_PER_LEVEL:  0.05,  // +5% 공격력

  STONE_CRIT_BASE_COST:          4,
  STONE_CRIT_COST_MULT:          1.6,
  STONE_CRIT_PER_LEVEL:          200,   // +2% 크리확

  STONE_CRIT_DMG_BASE_COST:      4,
  STONE_CRIT_DMG_COST_MULT:      1.6,
  STONE_CRIT_DMG_PER_LEVEL:      10,    // +10% 크리뎀

  STONE_ATK_SPEED_BASE_COST:     5,
  STONE_ATK_SPEED_COST_MULT:     1.7,
  STONE_ATK_SPEED_PER_LEVEL:     3,     // attackInterval -3

  STONE_GUN_SLOT_BASE_COST:      30,
  STONE_GUN_SLOT_COST_MULT:      12,
  STONE_MAX_GUN_SLOTS:           2,

  STONE_DROP_BASE_COST:          3,
  STONE_DROP_COST_MULT:          1.5,
  STONE_DROP_PER_LEVEL:          0.10,  // +10% 전리품

  STONE_EXP_BASE_COST:           3,
  STONE_EXP_COST_MULT:           1.5,
  STONE_EXP_PER_LEVEL:           0.10,  // +10% 경험치 (마을 시스템 연동 예정)

  // ── 강화석 보상 ──
  STONE_KILLS_PER_STONE:  5,
  STONE_PER_MINIBOSS:     1,
  STONE_PER_BOSS:         2,

  // ── 총기 ──
  BOSS_GUN_DROP_CHANCE:        0.20,
  GUN_FRAGMENTS_FOR_ARTIFACT:  100,
  MIN_ATTACK_INTERVAL:         5,

  // ── 오프라인 ──
  OFFLINE_REWARD_MULT: 0.80,

  // ── 저장 주기 ──
  SAVE_INTERVAL_MS: 5000,

  // ── 전투 로그 ──
  LOG_MAX: 10,

  // ── 유물 풀 ──
  ARTIFACT_POOL: [
    { id: 'art_hp',      name: '강철 심장',     effect: '최대 HP +20%' },
    { id: 'art_atk',     name: '전투의 각인',   effect: '총기 공격력 +15%' },
    { id: 'art_crit',    name: '날카로운 눈',   effect: '크리티컬 확률 +5%' },
    { id: 'art_speed',   name: '빠른 손',       effect: '공격 간격 -5' },
    { id: 'art_drop',    name: '약탈자의 가방', effect: '전리품 획득량 +25%' },
    { id: 'art_critdmg', name: '파괴의 인장',   effect: '크리티컬 데미지 +25%' },
  ],
};
