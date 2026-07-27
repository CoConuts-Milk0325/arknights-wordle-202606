<template>
  <div class="challenge-game-wrapper">
    <!-- 搜索输入 -->
    <div class="challenge-search">
      <guess-input
        :operators="filteredOperators"
        :disabled="gameOver || gameWon"
        :guessedOperators="guesses"
        @submit="handleGuess"
        class="challenge-input"
      />
    </div>

    <!-- 游戏板 -->
    <div v-if="settings.gameMode === 'puzzle'" class="puzzle-wrapper">
      <puzzle-board
        :operators="operators"
        :targetOperator="question.targetOperator"
        :maxGuesses="settings.maxGuesses"
        :gameOver="gameOver"
        :gameWon="gameWon"
        :userGaveUp="false"
        :guesses="guesses"
        :gameSessionId="`challenge_${question.id}`"
        :puzzleHintInterval="3"
        :include-skin-arts="settings.includeSkinArts"
        :preloadedAssets="preloadedAssets"
        class="challenge-puzzle-board"
      />
    </div>

    <div v-else-if="settings.gameMode === 'truePuzzle'" class="puzzle-wrapper">
      <true-puzzle-board
        :target-operator="question.targetOperator"
        :max-guesses="settings.maxGuesses"
        :game-over="gameOver"
        :game-won="gameWon"
        :user-gave-up="false"
        :guesses="guesses"
        :game-session-id="`challenge_${question.id}`"
        :puzzle-hint-interval="3"
        :include-skin-arts="settings.includeSkinArts"
        :is-challenge="true"
        class="challenge-puzzle-board"
      />
    </div>

    <div v-else-if="settings.gameMode === 'skill'" class="puzzle-wrapper">
      <skill-board
        :target-operator="question.targetOperator"
        :max-guesses="settings.maxGuesses"
        :game-over="gameOver"
        :game-won="gameWon"
        :user-gave-up="false"
        :guesses="guesses"
        :game-session-id="`challenge_${question.id}`"
        :puzzle-hint-interval="3"
        :preloaded-assets="{ skillData: skillData }"
        :is-challenge="true"
        class="challenge-puzzle-board"
      />
    </div>

    <div v-else class="normal-wrapper">
      <game-board
        :operatorData="operators"
        :guesses="guesses"
        :comparisons="comparisons"
        :targetOperator="question.targetOperator"
        :gameOver="gameOver"
        :gameWon="gameWon"
        :maxGuesses="settings.maxGuesses"
        :userGaveUp="false"
        :potentialMode="'满潜'"
        :trustMode="'满信赖'"
        :selectedTagGroup="getSelectedTagGroup()"
        :isChallenge="true"
        class="challenge-game-board"
      />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import GuessInput from './GuessInput.vue';
import GameBoard from './GameBoard.vue';
import PuzzleBoard from './PuzzleBoard.vue';
import TruePuzzleBoard from './TruePuzzleBoard.vue';
import SkillBoard from './SkillBoard.vue';

export default {
  name: 'ChallengeGameWrapper',
  components: {
    GuessInput,
    GameBoard,
    PuzzleBoard,
    TruePuzzleBoard,
    SkillBoard
  },
  props: {
    question: {
      type: Object,
      required: true
    },
    settings: {
      type: Object,
      required: true
    },
    operators: {
      type: Array,
      required: true
    },
    guesses: {
      type: Array,
      default: () => []
    },
    comparisons: {
      type: Array,
      default: () => []
    },
    gameOver: {
      type: Boolean,
      default: false
    },
    gameWon: {
      type: Boolean,
      default: false
    },
    preloadedAssets: {
      type: Object,
      default: null
    },
    skillData: {
      type: Object,
      default: null
    }
  },
  emits: ['guess'],
  setup(props, { emit }) {
    // 过滤干员
    const filteredOperators = computed(() => {
      const sf = props.settings.starFilter;
      if (!sf || sf.every(Boolean)) return props.operators;
      return props.operators.filter(op => {
        const star = (parseInt(op.稀有度, 10) || 0) + 1;
        return sf[star - 1];
      });
    });

    // 处理猜测
    const handleGuess = (operatorName) => {
      emit('guess', operatorName);
    };

    // 获取选中的标签组
    const getSelectedTagGroup = () => {
      const tagMap = {
        easy: {
          id: 'easy',
          tags: ['性别', '星级', '职业', '国家', '种族', '源石技艺适应性', '身高', '感染状态', '出生日期', '标签']
        },
        hard: {
          id: 'hard',
          tags: ['星级', '满级攻击', '满级生命', '满级防御', '满级法术抗性', '攻击间隔', '上线年份', '标签']
        }
      };
      return tagMap[props.settings.gameMode] || tagMap.easy;
    };

    return {
      filteredOperators,
      handleGuess,
      getSelectedTagGroup
    };
  }
};
</script>

<style scoped>
.challenge-game-wrapper {
  width: 100%;
}

.challenge-search {
  margin-bottom: 1.5rem;
}

.challenge-input {
  width: 100%;
}

.challenge-result-mini {
  text-align: center;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  font-weight: 600;
}

.result-success {
  background: rgba(40, 167, 69, 0.15);
  border: 1px solid #28a745;
  color: #28a745;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.result-fail {
  background: rgba(220, 53, 69, 0.15);
  border: 1px solid #dc3545;
  color: #dc3545;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.result-icon {
  font-size: 1.2rem;
}

.puzzle-wrapper,
.normal-wrapper {
  width: 100%;
}

.challenge-puzzle-board,
.challenge-game-board {
  width: 100%;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .challenge-search {
    margin-bottom: 1rem;
  }
  
  .challenge-result-mini {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
}
</style>