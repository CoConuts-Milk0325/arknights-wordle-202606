<template>
  <div class="true-puzzle-board">
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
      <template v-else>
        <div class="attempts-counter">
          已猜次数: {{ guesses.length }} / {{ maxGuesses }}
        </div>
      </template>
    </div>

    <!-- 提示信息 -->
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

    <!-- 图像区域 + 加载状态 -->
    <div ref="containerRef" class="image-area" :class="{ loading: loadingImage }">
      <canvas ref="canvasRef" class="puzzle-canvas" />
      <div v-if="loadingImage" class="image-loading-indicator">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p class="loading-text">{{ loadingStatus }}</p>
          <div class="loading-progress">
            <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
          </div>
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

    <!-- 重新开始按钮 -->
    <div class="game-controls">
      <button v-if="gameOver || gameWon || userGaveUp" @click="$emit('reset')" class="reset-button">
        重新开始
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { getImagePath, getOperatorAvatarFile } from '../utils/imageUtils';
import { selectRandomArt } from '../logic/puzzleService';

export default {
  name: 'TruePuzzleBoard',
  props: {
    targetOperator: { type: Object, required: true },
    maxGuesses: { type: Number, required: true },
    gameOver: { type: Boolean, required: true },
    gameWon: { type: Boolean, required: true },
    userGaveUp: { type: Boolean, default: false },
    guesses: { type: Array, required: true },
    gameSessionId: { type: String, default: '' },
    puzzleHintInterval: { type: Number, default: 3 },
    includeSkinArts: { type: Boolean, default: true },
    preloadedAssets: { type: Object, default: null },
    customTexts: {
      type: Object,
      default: () => ({
        winMessage: '恭喜你猜对了！',
        gameOverMessage: '游戏结束！',
        giveUpMessage: '你已放弃游戏！'
      })
    }
  },
  emits: ['reset'],
  setup(props) {
    const canvasRef = ref(null);
    const containerRef = ref(null);
    const loadedImage = ref(null);
    const selectedArt = ref('');
    const loadingImage = ref(true);
    const loadingStatus = ref('初始化中...');
    const loadingProgress = ref(0);
    const wrongGuessCount = ref(0);
    const loaded = ref(false);
    const canvasSize = ref({ w: 500, h: 500 });

    // 图像显示尺寸（自适应）

    // ========== 提示系统（与 PuzzleBoard 一致） ==========
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

    // ========== 图像加载 ==========
    const artUrl = computed(() => {
      if (!selectedArt.value) return '';
      return getImagePath(selectedArt.value);
    });

    async function loadImage() {
      loadingImage.value = true;
      loadingStatus.value = '正在选择立绘...';
      loadingProgress.value = 5;

      const art = selectRandomArt(props.targetOperator, props.gameSessionId, props.includeSkinArts);
      if (!art) return;
      selectedArt.value = art;

      loadingStatus.value = '正在加载图片...';
      loadingProgress.value = 15;

      const url = getImagePath(art);
      let img = new Image();
      img.crossOrigin = 'anonymous';
      try {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
      } catch {
        // 不加 crossOrigin 再试一次
        try {
          img = new Image();
          img.src = url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
        } catch {
          console.error('图片加载失败:', url);
          loadingStatus.value = '图片加载失败';
          loadingImage.value = false;
          return;
        }
      }
      loadedImage.value = img;
      loadingProgress.value = 60;
      loadingStatus.value = '图片加载完成';

      loadedImage.value = img;
      loaded.value = true;

      loadingStatus.value = '正在初始化...';
      loadingProgress.value = 80;

      updateCanvasSize();
      await nextTick();
      renderCanvas();

      loadingProgress.value = 100;
      loadingStatus.value = '初始化完成！';
      // 短暂显示完成状态后隐藏加载指示器
      await new Promise(r => setTimeout(r, 200));
      loadingImage.value = false;
    }

    // ========== 渲染：固定窗口 + 图片缩放（不变形） ==========
    const imageZoom = computed(() => {
      // 猜对/猜完时显示全图
      if (props.gameWon || props.gameOver || props.userGaveUp) return 1;
      // 缩放倍数线性递减，随猜错次数逐步缩小
      const maxZoom = 3;
      const step = (maxZoom - 1) / (props.maxGuesses || 6);
      return Math.max(1, maxZoom - wrongGuessCount.value * step);
    });

    const visiblePercent = computed(() => {
      if (props.gameWon || props.gameOver || props.userGaveUp) return 100;
      const z = imageZoom.value;
      // 窗口占画布 60%，可见比例 ≈ (0.6/zoom)^2 * 100
      return Math.round(36 / (z * z));
    });

    function renderCanvas() {
      const canvas = canvasRef.value;
      if (!canvas || !loadedImage.value) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = loadedImage.value;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const cw = canvasSize.value.w;
      const ch = canvasSize.value.h;
      const zoom = imageZoom.value;

      // 全图模式
      if (props.gameWon || props.gameOver || props.userGaveUp) {
        ctx.clearRect(0, 0, cw, ch);
        const fitScale = Math.min(cw / iw, ch / ih);
        ctx.drawImage(img, 0, 0, iw, ih, (cw - iw * fitScale) / 2, (ch - ih * fitScale) / 2, iw * fitScale, ih * fitScale);
        return;
      }

      // 固定窗口：居中占画布 60%
      const winW = cw * 0.6;
      const winH = ch * 0.6;
      const winX = (cw - winW) / 2;
      const winY = (ch - winH) / 2;

      // 随机裁剪中心点（种子固定，一局内不变）
      const seed = hashStr(props.targetOperator.干员 + '_' + props.gameSessionId);
      const biased = (v) => {
        const b = v < 0.5 ? 0.5 * Math.pow(v * 2, 0.55) : 1 - 0.5 * Math.pow((1 - v) * 2, 0.55);
        return 0.15 + b * 0.7;
      };
      const cx = biased((seed % 997) / 997);
      const cy = biased(((seed >> 4) % 997) / 997);

      // 图片适配画布的尺寸
      const fitScale = Math.min(cw / iw, ch / ih);
      const baseW = iw * fitScale;
      const baseH = ih * fitScale;

      // 放大后的尺寸，使裁剪中心对齐窗口中心
      const zoomW = baseW * zoom;
      const zoomH = baseH * zoom;
      const imgX = winX + winW / 2 - zoomW * cx;
      const imgY = winY + winH / 2 - zoomH * cy;

      // 清除旧帧 + 画新图
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, iw, ih, imgX, imgY, zoomW, zoomH);
    }

    // 简单哈希函数（种子）
    function hashStr(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash);
    }

    // ========== 监听 ==========
    watch(() => props.guesses.length, () => {
      // 计算错误次数 = 总猜测次数（排除最后一次正确的）
      const lastCorrect = props.gameWon ? 1 : 0;
      wrongGuessCount.value = Math.max(0, props.guesses.length - lastCorrect);
      if (loaded.value) nextTick(renderCanvas);
    });

    watch(() => props.targetOperator, () => {
      wrongGuessCount.value = 0;
      loaded.value = false;
      loadedImage.value = null;
      if (props.targetOperator) nextTick(loadImage);
    });

    watch(() => props.gameWon, (val) => {
      if (val && loaded.value) nextTick(renderCanvas);
    });
    watch(() => props.gameOver, (val) => {
      if (val && loaded.value) nextTick(renderCanvas);
    });

    function updateCanvasSize() {
      if (!containerRef.value) return;
      const maxW = Math.min(containerRef.value.clientWidth, 600);
      const img = loadedImage.value;
      if (img) {
        const ratio = img.naturalHeight / img.naturalWidth;
        const w = maxW;
        const h = Math.round(w * ratio);
        canvasSize.value = { w, h };
      } else {
        canvasSize.value = { w: maxW, h: maxW };
      }
      const canvas = canvasRef.value;
      if (canvas) {
        canvas.width = canvasSize.value.w;
        canvas.height = canvasSize.value.h;
      }
    }

    function getOperatorAvatar(op) {
      const file = getOperatorAvatarFile(op.干员, op.稀有度);
      return getImagePath(file);
    }

    onMounted(() => {
      updateCanvasSize();
      window.addEventListener('resize', () => {
        updateCanvasSize();
        if (loaded.value) nextTick(renderCanvas);
      });
      if (props.targetOperator) loadImage();
    });

    return {
      canvasRef,
      containerRef,
      imageZoom,
      visiblePercent,
      displayedHints,
      puzzleHints,
      artUrl: artUrl,
      loadedImage,
      loadingImage,
      loadingStatus,
      loadingProgress,
      canvasSize,
      getOperatorAvatar
    };
  }
};
</script>

<style scoped>
.true-puzzle-board {
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

.attempts-counter {
  font-size: 14px;
  opacity: 0.8;
}

/* 提示信息（照搬小头模式） */
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

.image-area {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  width: 100%;
  max-width: 600px;
}

.image-area.loading {
  min-height: 300px;
}

.puzzle-canvas {
  display: block;
  width: 100%;
  height: auto;
}

/* 已猜干员列表（照搬小头模式） */
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

.loading-progress {
  width: 200px;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary, #3498db), #6dd5fa);
  border-radius: 3px;
  transition: width 0.3s ease;
}
</style>
