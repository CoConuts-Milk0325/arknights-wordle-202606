<template>
  <div class="puzzle-board">
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

    <!-- （1）提示信息：在没有结束且没有猜对的情况下，每隔 puzzleHintInterval 次错误猜测，显示一条新提示 -->
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

    <!-- 图片 / 马赛克显示区域 -->
    <!-- 如果放弃或用完次数但没猜中，则沿用旧的“最终图片”逻辑 -->
    <div v-if="(userGaveUp || (gameOver && !gameWon)) && !loadingImage" class="final-image-container">
      <img
        v-if="puzzleImageUrl"
        :src="puzzleImageUrl"
        :alt="targetOperator.干员"
        class="final-image"
        :style="{ maxWidth: '100%', width: scaledWidth + 'px', maxHeight: scaledHeight + 'px' }"
        loading="eager"
        :key="`final-lost-${gameSessionId}`"
      />
    </div>

    <!-- 如果猜对，显示重叠的马赛克和原图 -->
    <div v-else-if="gameWon && !loadingImage" class="final-overlay-container">
      <div class="overlay-mosaic">
        <!-- 马赛克图层，渲染到canvas -->
        <canvas
          ref="mosaicCanvas"
          :width="scaledWidth"
          :height="scaledHeight"
          class="mosaic-layer"
        ></canvas>
      </div>
      <div class="overlay-original">
        <!-- 原图图层，透明度适中 -->
        <img
          v-if="puzzleImageUrl"
          :src="puzzleImageUrl"
          :alt="targetOperator.干员"
          class="original-layer"
          :style="{ width: scaledWidth + 'px', height: scaledHeight + 'px' }"
          loading="eager"
          :key="`final-won-${gameSessionId}`"
        />
      </div>
    </div>

    <!-- 如果游戏还在进行，正常显示马赛克（canvas） -->
    <div v-else-if="!loadingImage" class="mosaic-container" :style="{ maxWidth: '100%', width: scaledWidth + 'px', height: scaledHeight + 'px' }">
      <canvas
        ref="mosaicCanvas"
        :width="scaledWidth"
        :height="scaledHeight"
      ></canvas>
    </div>

    <!-- 图片正在加载 -->
    <div v-else class="image-loading-indicator">
      <div class="loading-content">
        <div v-if="!loadingStatus.includes('失败')" class="loading-spinner"></div>
        <p class="loading-text">{{ loadingStatus }}</p>
        <div v-if="!loadingStatus.includes('失败')" class="loading-progress">
          <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <button 
          v-if="loadingStatus.includes('失败')" 
          @click="handleRetry"
          class="retry-button"
        >
          重新加载
        </button>
      </div>
    </div>

    <!-- 已猜的干员列表 -->
    <div
      class="guesses-container"
      v-if="guesses.length > 0"
    >
      <h4>已猜的干员：</h4>
      <div class="guess-list">
        <div
          v-for="(op, idx) in guesses"
          :key="idx"
          class="guess-item"
          :class="op.干员 === targetOperator.干员 ? 'correct' : 'incorrect'"
        >
          <img
            :src="getOperatorAvatar(op)"
            :alt="op.干员"
            class="guess-avatar"
          />
          <span class="guess-name">{{ op.干员 }}</span>
        </div>
      </div>
    </div>

    <!-- 重新开始按钮 -->
    <div class="game-controls">
      <button
        v-if="gameOver || gameWon || userGaveUp"
        @click="handleReset"
        class="reset-button"
      >
        重新开始
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { getOperatorAvatarFile, getImagePath } from '../utils/imageUtils';
import {
  loadPuzzleImage,
  initBlocks,
  refineRandomBlocks,
  renderMosaic
} from '../logic/puzzleService';

export default {
  name: 'PuzzleBoard',
  props: {
    operators: {
      type: Array,
      required: true
    },
    targetOperator: {
      type: Object,
      required: true
    },
    maxGuesses: {
      type: Number,
      required: true
    },
    gameOver: {
      type: Boolean,
      required: true
    },
    gameWon: {
      type: Boolean,
      required: true
    },
    userGaveUp: {
      type: Boolean,
      default: false
    },
    guesses: {
      type: Array,
      required: true
    },
    gameSessionId: {
      type: String,
      required: true
    },
    initialGridSize: {
      type: Object,
      default: () => ({ rows: 4, cols: 4 })
    },
    refinementCount: {
      type: Number,
      default: 9
    },
    refinementFactor: {
      type: Object,
      default: () => ({ rows: 2, cols: 2 })
    },
    puzzleHintInterval: {
      type: Number,
      default: 3
    },
    includeSkinArts: {
      type: Boolean,
      default: true
    },
    customArtSelector: {
      type: Function,
      default: null
    },
    customTexts: {
      type: Object,
      default: () => ({
        winMessage: '恭喜你猜对了！',
        gameOverMessage: '游戏结束！',
        giveUpMessage: '你已放弃游戏！'
      })
    },
    customHints: {
      type: Function,
      default: null
    }
  },
  emits: ['reset'],
  setup(props, { emit }) {
    const loadingImage = ref(true);
    const puzzleImageUrl = ref('');
    const scaledWidth = ref(0);
    const scaledHeight = ref(0);
    const integralData = ref(null);
    const originalImageData = ref(null); // 存储原始图像数据
    const blocks = ref([]);
    const areaRefinementLevels = ref({});
    const mosaicCanvas = ref(null);
    const initialViewportWidth = ref(window.innerWidth);
    
    // 用于防止竞态条件的组件实例ID和操作标识
    const componentId = ref(`puzzle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    let currentInitPromise = null;
    let currentTargetOperator = null;
    let initTimeout = null;
    const retryCount = ref(0);
    const MAX_RETRIES = 2;
    
    // 加载状态
    const loadingStatus = ref('初始化中...');
    const loadingProgress = ref(0);
    

    // 生成随机化且智能的提示列表
    const generatePuzzleHints = () => {
      // 如果有自定义提示函数，使用它
      if (props.customHints && typeof props.customHints === 'function') {
        return props.customHints(props.targetOperator);
      }

      const allHints = [
        {
          label: '星级',
          value: () => props.targetOperator?.星级 || '?',
          shouldShow: () => true // 星级总是可用，除非限制了六星
        },
        {
          label: '职业',
          value: () => props.targetOperator?.职业 || '?',
          shouldShow: () => true
        },
        {
          label: '种族',
          value: () => props.targetOperator?.种族 || '?',
          shouldShow: () => true
        },
        {
          label: '阵营',
          value: () => props.targetOperator?.阵营 || '?',
          shouldShow: () => true
        },
        {
          label: '性别',
          value: () => props.targetOperator?.性别 || '?',
          shouldShow: () => true
        },
        {
          label: '身高',
          value: () => props.targetOperator?.身高 ? `${props.targetOperator.身高}cm` : '?',
          shouldShow: () => props.targetOperator?.身高
        },
        {
          label: '感染状态',
          value: () => props.targetOperator?.感染状态 || '?',
          shouldShow: () => props.targetOperator?.感染状态
        },
        {
          label: '出生地',
          value: () => props.targetOperator?.出生地 || '?',
          shouldShow: () => props.targetOperator?.出生地 && props.targetOperator.出生地 !== props.targetOperator.阵营
        }
      ];

      // 过滤掉不应该显示的提示
      let availableHints = allHints.filter(hint => hint.shouldShow());
      
      // 如果开启了六星限制，移除星级提示（因为答案肯定是6星）
      const filteredOperators = props.operators;
      const onlySixStar = filteredOperators.length > 0 && filteredOperators.every(op => op.星级 === 6);
      if (onlySixStar) {
        availableHints = availableHints.filter(hint => hint.label !== '星级');
      }

      // 随机打乱顺序
      for (let i = availableHints.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableHints[i], availableHints[j]] = [availableHints[j], availableHints[i]];
      }

      return availableHints;
    };

    const puzzleHints = ref([]);

    // （C）根据已经失败（错误）次数，计算该显示到第几条提示
    const hintIndex = computed(() => {
      if (props.gameWon || props.gameOver || props.userGaveUp) {
        return 0; // 游戏结束后不再增显提示
      }
      // count how many incorrect guesses so far
      const incorrectCount = props.guesses.filter(g => g.干员 !== props.targetOperator.干员).length;
      // 每 props.puzzleHintInterval 次错误猜测解锁一条提示
      const idx = Math.floor(incorrectCount / props.puzzleHintInterval);
      // 不可超过 puzzleHints 数量
      return Math.min(idx, puzzleHints.value.length);
    });

    // 实际要显示的提示
    const displayedHints = computed(() => {
      return puzzleHints.value.slice(0, hintIndex.value);
    });

    function getOperatorAvatar(op) {
      const file = getOperatorAvatarFile(op.干员, op.稀有度);
      return getImagePath(file);
    }

    // 初始化Puzzle - 防止竞态条件
    watch(
      () => props.targetOperator,
      async (newVal, oldVal) => {
        // 如果新值和旧值相同，不执行任何操作
        if (newVal === oldVal) return;
        
        if (newVal && newVal.干员) {
          console.log(`[${componentId.value}] 目标干员变更为:`, newVal.干员);
          currentTargetOperator = newVal;
          // 重新生成提示列表
          puzzleHints.value = generatePuzzleHints();
          await initPuzzle();
        }
      },
      { immediate: true }
    );

    // 每次新增一次猜测且游戏还在继续时，做一次细化
    watch(
      () => props.guesses.length,
      async (newLen, oldLen) => {
        if (newLen > oldLen) {
          // 如果游戏已经结束或猜对，则不细化了
          if (props.gameOver || props.gameWon || props.userGaveUp) return;
          const lastGuess = props.guesses[newLen - 1];
          // 只有当猜错时，才做细化
          if (lastGuess.干员 !== props.targetOperator.干员) {
            await refineAndRender();
          }
        }
      }
    );


    // 如果在猜的过程中直接 gameOver 或 guessCorrect，需要触发一次渲染
    watch(
      () => [props.gameOver, props.gameWon, props.userGaveUp],
      async ([over, won, gaveUp], [oldOver, oldWon, oldGaveUp]) => {
        // 只要状态变化，就刷新一下
        if (!loadingImage.value) {
          await nextTick();
          renderMosaicIfNeeded();
        }
      }
    );

    async function initPuzzle() {
      const targetOp = props.targetOperator;
      if (!targetOp || !targetOp.干员) {
        console.warn(`[${componentId.value}] initPuzzle: 无效的目标干员`);
        loadingImage.value = false;
        return;
      }

      // 取消之前的初始化操作和超时
      if (currentInitPromise) {
        console.log(`[${componentId.value}] 取消之前的初始化操作`);
      }
      if (initTimeout) {
        clearTimeout(initTimeout);
        initTimeout = null;
      }

      loadingImage.value = true;
      loadingStatus.value = '准备加载图片...';
      loadingProgress.value = 0;
      console.log(`[${componentId.value}] 开始初始化谜题，目标干员: ${targetOp.干员}`);
      
      // 设置超时机制 (30秒)
      initTimeout = setTimeout(() => {
        if (loadingImage.value && props.targetOperator === targetOp) {
          console.error(`[${componentId.value}] 初始化超时`);
          handleInitTimeout(targetOp);
        }
      }, 30000);
      
      // 创建新的初始化Promise
      currentInitPromise = (async () => {
        // 模拟进度更新
        loadingStatus.value = '正在加载图片...';
        loadingProgress.value = 10;
        
        const result = await loadPuzzleImage(
          targetOp,
          600,
          600,
          initialViewportWidth.value,
          props.gameSessionId,
          props.customArtSelector,
          props.includeSkinArts
        );
        
        loadingStatus.value = '图片加载完成';
        loadingProgress.value = 50;
        
        return result;
      })();

      try {
        const result = await currentInitPromise;
        
        // 验证操作仍然有效（目标干员没有改变）
        if (props.targetOperator !== targetOp) {
          console.log(`[${componentId.value}] 目标干员已改变，忽略此次初始化结果`);
          return;
        }

        // 验证返回的结果是否与期望的干员匹配
        if (result.operatorName !== targetOp.干员) {
          console.error(`[${componentId.value}] 图片加载结果不匹配！期望: ${targetOp.干员}, 实际: ${result.operatorName}`);
          throw new Error(`图片加载结果不匹配: 期望 ${targetOp.干员}, 实际 ${result.operatorName}`);
        }

        loadingStatus.value = '正在初始化游戏区块...';
        loadingProgress.value = 70;

        puzzleImageUrl.value = result.puzzleImageUrl;
        scaledWidth.value = result.scaledWidth;
        scaledHeight.value = result.scaledHeight;
        integralData.value = result.integralData;
        originalImageData.value = result.originalImageData; // 存储原始图像数据
        
        
        console.log(`[${componentId.value}] 已加载干员 ${result.operatorName} 的立绘: ${result.selectedArt}`);

        blocks.value = initBlocks(
          scaledWidth.value,
          scaledHeight.value,
          props.initialGridSize,
          integralData.value,
          0.01,
          originalImageData.value
        );
        
        loadingStatus.value = '正在设置游戏状态...';
        loadingProgress.value = 90;

        areaRefinementLevels.value = {};
        for (let r = 0; r < props.initialGridSize.rows; r++) {
          for (let c = 0; c < props.initialGridSize.cols; c++) {
            areaRefinementLevels.value[`${r},${c}`] = 0;
          }
        }

        loadingStatus.value = '初始化完成！';
        loadingProgress.value = 100;
        
        console.log(`[${componentId.value}] 谜题初始化完成，立绘URL: ${result.puzzleImageUrl}`);
        
        // 短暂延迟让用户看到100%完成
        await new Promise(resolve => setTimeout(resolve, 300));
        
        loadingImage.value = false;
        await nextTick();

        // 二次验证：确保仍然是正确的目标干员
        if (props.targetOperator === targetOp) {
          // 初次渲染马赛克
          if (!props.gameOver && !props.gameWon && !props.userGaveUp) {
            renderMosaicIfNeeded();
          } else if (props.gameWon) {
            // 如果开局就满足 gameWon（极少情况），也给它渲染一下
            renderMosaicIfNeeded();
          }
        } else {
          console.warn(`[${componentId.value}] 渲染时发现目标干员已改变，跳过渲染`);
        }
      } catch (err) {
        // 检查是否因为目标干员改变导致的取消
        if (props.targetOperator !== targetOp) {
          console.log(`[${componentId.value}] 初始化被取消（目标干员已改变）`);
        } else {
          console.error(`[${componentId.value}] 初始化 Puzzle 出错:`, err);
          // 显示错误提示给用户
          loadingStatus.value = '加载失败，请重试';
          loadingProgress.value = 0;
          
          // 3秒后自动重置加载状态
          setTimeout(() => {
            if (loadingImage.value) {
              loadingImage.value = false;
            }
          }, 3000);
        }
        
        // 确保加载状态被重置
        if (props.targetOperator === targetOp) {
          loadingImage.value = false;
        }
      } finally {
        currentInitPromise = null;
        if (initTimeout) {
          clearTimeout(initTimeout);
          initTimeout = null;
        }
      }
    }

    function handleInitTimeout(targetOp) {
      console.error(`[${componentId.value}] 初始化超时，尝试重试...`);
      
      if (retryCount.value < MAX_RETRIES) {
        retryCount.value++;
        loadingStatus.value = `加载超时，正在重试 (${retryCount.value}/${MAX_RETRIES})...`;
        loadingProgress.value = 0;
        
        // 延迟重试
        setTimeout(() => {
          if (props.targetOperator === targetOp) {
            initPuzzle();
          }
        }, 1000);
      } else {
        // 达到最大重试次数
        loadingStatus.value = '加载失败，请手动重试';
        loadingProgress.value = 0;
        loadingImage.value = false;
        retryCount.value = 0;
      }
    }

    function renderMosaicIfNeeded() {
      const canvas = mosaicCanvas.value;
      if (!canvas || !integralData.value) return;
      const ctx = canvas.getContext('2d');
      
      // 计算游戏级别（基于已猜次数）
      const gameLevel = Math.min(5, Math.max(1, props.guesses.length + 1));
      
      renderMosaic(ctx, blocks.value, integralData.value, scaledWidth.value, scaledHeight.value, gameLevel);
    }

    async function refineAndRender() {
      refineRandomBlocks(
        blocks.value,
        areaRefinementLevels.value,
        props.refinementCount,
        props.refinementFactor,
        props.initialGridSize,
        integralData.value,
        scaledWidth.value,
        scaledHeight.value,
        0.01,
        originalImageData.value
      );
      await nextTick();
      renderMosaicIfNeeded();
    }

    function handleReset() {
      emit('reset');
    }

    function handleRetry() {
      retryCount.value = 0;
      initPuzzle();
    }

    // 处理窗口大小变化以响应式调整Canvas尺寸
    let resizeTimeout = null;
    const handleResize = () => {
      // 防抖：避免频繁触发
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        // 更新初始视口宽度
        initialViewportWidth.value = window.innerWidth;
        
        // 如果游戏正在进行且有Canvas，重新渲染
        if (!loadingImage.value && integralData.value && mosaicCanvas.value) {
          nextTick(() => {
            renderMosaicIfNeeded();
          });
        }
      }, 150);
    };

    onMounted(() => {
      // 添加窗口大小变化监听
      window.addEventListener('resize', handleResize, { passive: true });
    });

    onBeforeUnmount(() => {
      // 清理监听器和超时
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    });

    return {
      loadingImage,
      loadingStatus,
      loadingProgress,
      puzzleImageUrl,
      scaledWidth,
      scaledHeight,
      mosaicCanvas,
      getOperatorAvatar,
      handleReset,
      handleRetry,
      displayedHints,
      puzzleHints
    };
  }
};
</script>

<style>
.puzzle-board {
  margin-top: 20px;
  width: 100%;
  box-sizing: border-box;
  padding: 0;
  color: var(--color-text);
}

.game-status {
  text-align: center;
  margin-bottom: 10px;
  width: 100%;
}

.status-message {
  padding: 12px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 18px;
  word-wrap: break-word;
  white-space: normal;
  max-width: 600px;
  margin: 0 auto;
}
.win {
  background-color: var(--color-win-bg);
  color: var(--color-win-text);
}
.lose {
  background-color: var(--color-lose-bg);
  color: var(--color-lose-text);
}
.attempts-counter {
  font-size: 18px;
  color: var(--color-text);
  font-weight: 500;
}

/* 提示信息 */
.puzzle-hints {
  background: linear-gradient(135deg, 
    rgba(52, 152, 219, 0.1), 
    rgba(155, 89, 182, 0.1)
  );
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .puzzle-hints {
  background: linear-gradient(135deg, 
    rgba(100, 181, 246, 0.12), 
    rgba(139, 92, 246, 0.08)
  );
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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

/* 图片正在加载 */
.image-loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background-color: rgba(255,255,255,0.05);
  border-radius: 4px;
  margin: 10px 0;
  font-size: 16px;
  color: #666;
}

/* 马赛克容器 */
.mosaic-container {
  position: relative;
  margin: 0 auto;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: #f5f5f5;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1/1;
}

.mosaic-container canvas {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

/* 猜对后，重叠显示容器 */
.final-overlay-container {
  position: relative;
  margin: 20px auto;
  width: 100%;
  aspect-ratio: 1/1;
  border-radius: 6px;
  overflow: visible;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.overlay-mosaic {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  overflow: hidden;
}

.overlay-original {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  overflow: hidden;
}

.mosaic-layer {
  display: block;
  border: none;
  border-radius: 6px;
  width: 100% !important;
  height: 100% !important;
}

.original-layer {
  opacity: 0.85;
  border: none;
  border-radius: 6px;
  transition: opacity 0.3s ease;
  object-fit: fill;
  width: 100% !important;
  height: 100% !important;
}

.final-overlay-container:hover .original-layer {
  opacity: 1.0;
}


/* 备用方案：对于不支持aspect-ratio的浏览器 */
@supports not (aspect-ratio: 1/1) {
  .mosaic-container,
  .final-overlay-container {
    position: relative;
    height: 0;
    padding-bottom: 100%; /* 1:1 aspect ratio */
  }
  
  .mosaic-container canvas,
  .mosaic-layer,
  .original-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

/* 保留旧的对比容器样式以防需要 */
.final-compare-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  align-items: flex-start;
  margin-top: 20px;
  width: 100%;
  max-width: none;
}
.final-compare-left,
.final-compare-right {
  flex: 0 0 auto;
  text-align: center;
  position: relative;
}

.final-compare-left canvas,
.final-compare-right img {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

/* 统一的图片样式 */
.final-image-container {
  text-align: center;
  margin-top: 20px;
  width: 100%;
}
.final-image {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  max-width: 100%;
  height: auto;
}

/* 猜过的干员列表 */
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
.correct {
  background-color: rgba(76, 175, 80, 0.15);
}
/* .incorrect {
  background-color: rgba(189, 189, 189, 0.15);
} */
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

/* 控制按钮 */
.game-controls {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
.reset-button {
  padding: 10px 24px;
  font-size: 16px;
  font-weight: 500;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color var(--transition-duration);
}
.reset-button:hover {
  background-color: var(--color-primary-hover);
}

@media (max-width: 768px) {
  .puzzle-hints {
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .hints-header {
    margin-bottom: 8px;
  }
  
  .hints-title {
    font-size: 14px;
  }
  
  .hints-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 6px;
  }
  
  .hint-card {
    padding: 8px;
  }
  
  .hint-label {
    font-size: 10px;
    margin-bottom: 3px;
  }
  
  .hint-value {
    font-size: 12px;
  }
  
  .final-compare-container {
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }
  .guess-list {
    justify-content: center;
  }
  .guess-item {
    width: 70px;
  }
}

/* 确保桌面端保持左右布局 */
@media (min-width: 769px) {
  .final-compare-container {
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 40px;
    max-width: 1200px;
    margin: 20px auto;
    flex-wrap: nowrap;
  }
  .final-compare-left,
  .final-compare-right {
    flex: 0 0 auto;
    max-width: none;
    width: auto;
  }
  
  /* 确保canvas和img有相同的尺寸 */
  .final-compare-left canvas {
    max-width: 500px;
    max-height: 500px;
    width: auto;
    height: auto;
  }
  
  .final-compare-right img {
    max-width: 500px;
    max-height: 500px;
    width: auto;
    height: auto;
  }
}

/* 加载指示器样式 */
.loading-content {
  text-align: center;
  max-width: 300px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--color-text);
}

.loading-progress {
  width: 100%;
  height: 8px;
  background-color: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.retry-button {
  margin-top: 15px;
  padding: 10px 20px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: var(--color-primary-hover);
}
</style>
