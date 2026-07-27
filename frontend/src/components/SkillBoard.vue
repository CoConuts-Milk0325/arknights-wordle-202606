<template>
  <div class="skill-board">
    <!-- 游戏状态区 -->
    <div class="game-status">
      <template v-if="gameWon">
        <div class="status-message win">
          <span>{{ customTexts.winMessage }}答案是 {{ targetOperator.干员 }}</span>
        </div>
      </template>
      <template v-else-if="userGaveUp">
        <div class="status-message lose">
          <span>{{ customTexts.giveUpMessage }}正确答案是 {{ targetOperator.干员 }}</span>
        </div>
      </template>
      <template v-else-if="gameOver">
        <div class="status-message lose">
          <span>{{ customTexts.gameOverMessage }}正确答案是 {{ targetOperator.干员 }}</span>
        </div>
      </template>
    </div>

    <!-- 提示信息（与原版完全一致） -->
    <div v-if="displayedHints.length > 0 && !gameWon && !gameOver && !userGaveUp" class="puzzle-hints">
      <div class="hints-header">
        <span class="hints-icon">💡</span>
        <h3 class="hints-title">提示信息</h3>
        <span class="hints-count">{{ displayedHints.length }}/{{ puzzleHints.length }}</span>
      </div>
      <div class="hints-grid">
        <div v-for="(hint, idx) in displayedHints" :key="idx" class="hint-card">
          <div class="hint-label">{{ hint.label }}</div>
          <div class="hint-value">{{ hint.value() }}</div>
        </div>
      </div>
    </div>

    <!-- 技能图标区 -->
    <div ref="containerRef" class="image-area" :class="{ loading: loadingImage }">
      <img v-if="skillIconUrl && !loadingImage" :src="skillIconUrl" :alt="selectedSkill?.技能名" class="skill-icon-image" />
      <div v-if="loadingImage" class="image-loading-indicator">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p class="loading-text">加载技能图标中...</p>
        </div>
      </div>
    </div>

    <!-- 已猜的干员列表 -->
    <div class="guesses-container" v-if="guesses.length > 0">
      <h4>已猜的干员：</h4>
      <div class="guess-list">
        <div v-for="(op, idx) in guesses" :key="idx" class="guess-item" :class="op.干员 === targetOperator.干员 ? 'correct' : 'incorrect'">
          <img :src="getOperatorAvatar(op)" :alt="op.干员" class="guess-avatar" />
          <span class="guess-name">{{ op.干员 }}</span>
        </div>
      </div>
    </div>

    <!-- 重新开始按钮（挑战模式不显示） -->
    <div v-if="!isChallenge" class="game-controls">
      <button v-if="gameOver || gameWon || userGaveUp" @click="$emit('reset')" class="reset-button">
        重新开始
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { getImagePath, getOperatorAvatarFile } from '../utils/imageUtils';

export default {
  name: 'SkillBoard',
  props: {
    targetOperator: { type: Object, required: true },
    maxGuesses: { type: Number, required: true },
    gameOver: { type: Boolean, required: true },
    gameWon: { type: Boolean, required: true },
    userGaveUp: { type: Boolean, default: false },
    guesses: { type: Array, required: true },
    gameSessionId: { type: String, default: '' },
    puzzleHintInterval: { type: Number, default: 3 },
    preloadedAssets: { type: Object, default: null },
    customTexts: {
      type: Object,
      default: () => ({
        winMessage: '恭喜你猜对了！',
        gameOverMessage: '游戏结束！',
        giveUpMessage: '你已放弃游戏！'
      })
    },
    isChallenge: {
      type: Boolean,
      default: false
    }
  },
  emits: ['reset'],
  setup(props) {
    const containerRef = ref(null);
    const loadingImage = ref(true);
    const selectedSkill = ref(null);
    const skillIconUrl = ref('');
    const wrongGuessCount = ref(0);
    const loaded = ref(false);

    // ========== 提示系统（与原版 TruePuzzleBoard 完全一致） ==========
    const puzzleHints = computed(() => [
      { label: '职业', value: () => props.targetOperator?.职业 || '' },
      { label: '星级', value: () => (props.targetOperator ? (parseInt(props.targetOperator.稀有度, 10) + 1) + '星' : '') },
      { label: '性别', value: () => props.targetOperator?.性别 || '' },
      { label: '种族', value: () => props.targetOperator?.种族 || '' },
      { label: '出身地', value: () => props.targetOperator?.出身地 || '' },
    ]);

    const displayedHints = computed(() => {
      const incorrectCount = wrongGuessCount.value;
      const maxHints = Math.floor(incorrectCount / props.puzzleHintInterval);
      return puzzleHints.value.slice(0, maxHints);
    });

    // ========== 技能图标加载 ==========
    async function loadSkillIcon() {
      loadingImage.value = true;

      const skillData = props.preloadedAssets?.skillData;
      if (!skillData || !skillData[props.targetOperator.干员]) {
        loadingImage.value = false;
        return;
      }

      const operatorSkills = skillData[props.targetOperator.干员];
      const randomIndex = Math.floor(Math.random() * operatorSkills.length);
      const skill = operatorSkills[randomIndex];
      selectedSkill.value = skill;

      skillIconUrl.value = getImagePath(`技能_${skill.技能名}.png`);

      await nextTick();
      await new Promise(r => setTimeout(r, 200));
      loadingImage.value = false;
      loaded.value = true;
    }

    // ========== 监听 ==========
    watch(() => props.guesses.length, () => {
      const lastCorrect = props.gameWon ? 1 : 0;
      wrongGuessCount.value = Math.max(0, props.guesses.length - lastCorrect);
    });

    watch(() => props.targetOperator, () => {
      wrongGuessCount.value = 0;
      loaded.value = false;
      selectedSkill.value = null;
      skillIconUrl.value = '';
      if (props.targetOperator) nextTick(loadSkillIcon);
    });

    function getOperatorAvatar(op) {
      const file = getOperatorAvatarFile(op.干员, op.稀有度);
      return getImagePath(file);
    }

    onMounted(() => {
      if (props.targetOperator) loadSkillIcon();
    });

    return {
      containerRef,
      skillIconUrl,
      selectedSkill,
      loadingImage,
      displayedHints,
      puzzleHints,
      getOperatorAvatar
    };
  }
};
</script>

<style scoped>
.skill-board {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.game-status {
  width: 100%;
  text-align: center;
}

.status-message {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
}
.status-message.win {
  background: rgba(40, 167, 69, 0.15);
  border: 1px solid #28a745;
  color: #28a745;
}
.status-message.lose {
  background: rgba(220, 53, 69, 0.15);
  border: 1px solid #dc3545;
  color: #dc3545;
}

/* 提示信息（与原版完全一致） */
.puzzle-hints {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 0.75rem;
}
.hints-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.hints-icon {
  font-size: 1.2em;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}
.hints-title {
  margin: 0;
  font-weight: 600;
  font-size: 16px;
  color: var(--color-text);
  flex: 1;
}
.hints-count {
  background: var(--color-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.hints-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}
.hint-card {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  transition: all 0.3s ease;
}
[data-theme="dark"] .hint-card {
  background: rgba(100, 181, 246, 0.08);
  border: 1px solid rgba(100, 181, 246, 0.2);
}
.hint-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.hint-label {
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.hint-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* 技能图标展示区 */
.image-area {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  width: 100%;
  max-width: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: rgba(0,0,0,0.02);
}

.image-area.loading {
  min-height: 200px;
}

.skill-icon-image {
  display: block;
  width: 128px;
  height: 128px;
  object-fit: contain;
  margin: 32px auto;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

/* 已猜干员列表（与原版完全一致） */
.guesses-container {
  margin-top: 16px;
  width: 100%;
}
.guesses-container h4 {
  margin-bottom: 10px;
}
.guess-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
.guess-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}
.guess-item.correct {
  background-color: rgba(76, 175, 80, 0.15);
}
.guess-avatar {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 50%;
  background-color: #eee;
}
.guess-name {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text);
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.reset-button {
  padding: 0.75rem 2rem;
  border-radius: 8px;
  border: 1px solid var(--color-primary);
  background: rgba(52, 152, 219, 0.15);
  color: var(--color-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-button:hover {
  background: rgba(52, 152, 219, 0.25);
  transform: translateY(-1px);
}

/* 加载指示器 */
.image-loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
}

.loading-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.1);
  border-top: 4px solid var(--color-primary, #3498db);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: var(--color-text);
  opacity: 0.7;
}
</style>
