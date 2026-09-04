// 挑战模式相关逻辑和服务

import { selectRandomOperator } from './gameLogic';
import { normalizeOperatorName } from '../utils/nameUtils';
import { loadPuzzleImage } from './puzzleService';

/**
 * 生成挑战题目
 * @param {Array} operators - 可用干员列表
 * @param {Object} settings - 挑战设置
 * @param {Function} progressCallback - 进度回调
 * @returns {Promise<Array>} 题目列表
 */
export async function generateChallengeQuestions(operators, settings, progressCallback = () => {}) {
  const { gameMode, questionCount, starFilter } = settings;

  // 星级筛选
  let availableOperators = operators;
  if (starFilter && !starFilter.every(Boolean)) {
    availableOperators = operators.filter(op => {
      const star = (parseInt(op.稀有度, 10) || 0) + 1;
      return starFilter[star - 1];
    });
  }

  if (availableOperators.length < questionCount) {
    throw new Error(`可用干员数量不足，需要 ${questionCount} 个，但只有 ${availableOperators.length} 个`);
  }
  
  const questions = [];
  const usedOperators = new Set();
  
  progressCallback(0.1);
  
  // 支持 URL 参数强制指定第一题目标干员：?target=银灰
  const forceTargetParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('target')
    : null;
  
  // 生成题目
  for (let i = 0; i < questionCount; i++) {
    let targetOperator;
    
    // 第一题：如果 URL 参数指定了干员且可用，优先使用
    if (i === 0 && forceTargetParams) {
      const found = availableOperators.find(op => op.干员 === forceTargetParams || normalizeOperatorName(op.干员) === normalizeOperatorName(forceTargetParams));
      if (found && !usedOperators.has(found.干员)) {
        targetOperator = found;
        console.log(`[调试] 挑战模式URL参数强制目标干员: ${found.干员}`);
      } else {
        console.warn(`[调试] URL参数指定的干员 "${forceTargetParams}" 不可用，回退随机`);
      }
    }
    
    // 如果没指定强制目标或不可用，随机选择（不重复）
    if (!targetOperator) {
      do {
        targetOperator = selectRandomOperator(availableOperators);
      } while (usedOperators.has(targetOperator.干员));
    }
    
    usedOperators.add(targetOperator.干员);
    
    const question = {
      id: `q_${i + 1}`,
      targetOperator,
      gameMode,
      questionIndex: i
    };
    
    // 小头/真·小头模式：折中方案只预加载第 1 题，
    // 后续题目由 ChallengeBoard 在答题期间逐题后台预加载（lookahead=1）
    if ((gameMode === 'puzzle' || gameMode === 'truePuzzle') && i === 0) {
      try {
        // sessionId 与 ChallengeGameWrapper 传入组件的 gameSessionId 保持一致，
        // 保证 selectRandomArt / integralCache 在组件加载时能命中预加载结果
        const preloadResult = await preloadPuzzleAssets(targetOperator, `challenge_${question.id}`, settings.includeSkinArts);
        question.puzzleAssets = preloadResult;
      } catch (error) {
        console.warn(`预加载第 1 题的图片失败:`, error);
        // 继续生成题目，但不包含预加载资源
      }
    }
    
    questions.push(question);
    progressCallback(0.1 + (i + 1) / questionCount * 0.9);
  }
  
  console.log(`成功生成 ${questions.length} 道挑战题目`);
  return questions;
}

/**
 * 预加载小头模式资源
 * @param {Object} operator - 目标干员
 * @param {string} sessionId - 会话ID
 * @returns {Promise<Object>} 预加载结果
 */
export async function preloadPuzzleAssets(operator, sessionId, includeSkinArts = true) {
  try {
    // 加载拼图图片
    const puzzleResult = await loadPuzzleImage(
      operator,
      600,
      600,
      window.innerWidth,
      sessionId,
      null,
      includeSkinArts
    );
    
    return {
      puzzleImageUrl: puzzleResult.puzzleImageUrl,
      scaledWidth: puzzleResult.scaledWidth,
      scaledHeight: puzzleResult.scaledHeight,
      integralData: puzzleResult.integralData,
      originalImageData: puzzleResult.originalImageData,
      selectedArt: puzzleResult.selectedArt
    };
  } catch (error) {
    console.error('预加载拼图资源失败:', error);
    throw error;
  }
}

/**
 * 计算单题得分
 * @param {boolean} isCorrect - 是否答对
 * @param {number} timeUsed - 使用时间（秒）
 * @param {number} guessCount - 猜测次数
 * @param {Object} settings - 挑战设置
 * @returns {number} 得分
 */
export function calculateChallengeScore(isCorrect, timeUsed, guessCount, settings) {
  if (!isCorrect) return 0;
  
  const { maxGuesses } = settings;
  
  // 基础分数
  let baseScore = 1000;
  
  // 时间效率奖励（基于实际用时，无论是否有时间限制）
  let timeBonus = 0;
  if (timeUsed > 0) {
    // 用时越短，奖励越高
    if (timeUsed <= 10) {
      timeBonus = 300; // 10秒内完成
    } else if (timeUsed <= 30) {
      timeBonus = 200; // 30秒内完成
    } else if (timeUsed <= 60) {
      timeBonus = 100; // 1分钟内完成
    } else if (timeUsed <= 120) {
      timeBonus = 50;  // 2分钟内完成
    } else {
      timeBonus = 0;   // 超过2分钟无奖励
    }
  } else {
    timeBonus = 100; // 无时间记录时的基础奖励
  }
  
  // 猜测次数奖励（猜测次数越少，奖励越高）
  const guessBonus = Math.floor(((maxGuesses - guessCount + 1) / maxGuesses) * 400);
  
  // 六星限制奖励（仅选中6星时加分）
  const isOnlySixStar = settings.starFilter &&
    settings.starFilter.every((v, i) => i === 5 ? v : !v);
  const sixStarBonus = isOnlySixStar ? 150 : 0;
  
  // 一击必中奖励
  const perfectBonus = guessCount === 1 ? 300 : 0;
  
  // 效率奖励（替代难度奖励，基于表现而非模式）
  let efficiencyBonus = 0;
  if (guessCount === 1) {
    efficiencyBonus = 200; // 一击必中额外奖励
  } else if (guessCount <= Math.ceil(maxGuesses / 3)) {
    efficiencyBonus = 150; // 高效猜测
  } else if (guessCount <= Math.ceil(maxGuesses / 2)) {
    efficiencyBonus = 100; // 中效猜测
  }
  
  const totalScore = baseScore + timeBonus + guessBonus + sixStarBonus + perfectBonus + efficiencyBonus;
  return Math.max(0, Math.floor(totalScore));
}

/**
 * 计算总成绩和等级
 * @param {Array} results - 所有题目结果
 * @param {Object} settings - 挑战设置
 * @returns {Object} 成绩统计
 */
export function calculateFinalStats(results, settings) {
  const totalQuestions = results.length;
  const correctAnswers = results.filter(r => r.isCorrect).length;
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalTime = results.reduce((sum, r) => sum + r.timeUsed, 0);
  const averageTime = totalTime / totalQuestions;
  
  // 计算准确率
  const accuracy = (correctAnswers / totalQuestions) * 100;
  
  // 计算等级
  const grade = calculateGrade(accuracy, totalScore, settings);
  
  // 计算排名（简单模拟）
  const ranking = calculateRanking(totalScore, settings);
  
  return {
    totalQuestions,
    correctAnswers,
    totalScore,
    totalTime,
    averageTime,
    accuracy,
    grade,
    ranking,
    perfectScore: totalQuestions * calculateMaxPossibleScore(settings)
  };
}

/**
 * 计算等级
 * @param {number} accuracy - 准确率
 * @param {number} totalScore - 总分
 * @param {Object} settings - 挑战设置
 * @returns {Object} 等级信息
 */
function calculateGrade(accuracy, totalScore, settings) {
  const maxPossibleScore = settings.questionCount * calculateMaxPossibleScore(settings);
  const scoreRatio = totalScore / maxPossibleScore;
  
  if (accuracy === 100 && scoreRatio >= 0.9) {
    return { level: 'S+', name: '传说', color: '#ff6b35' };
  } else if (accuracy >= 90 && scoreRatio >= 0.8) {
    return { level: 'S', name: '大师', color: '#ffc107' };
  } else if (accuracy >= 80 && scoreRatio >= 0.7) {
    return { level: 'A', name: '专家', color: '#28a745' };
  } else if (accuracy >= 70 && scoreRatio >= 0.6) {
    return { level: 'B', name: '熟练', color: '#17a2b8' };
  } else if (accuracy >= 60 && scoreRatio >= 0.5) {
    return { level: 'C', name: '入门', color: '#6c757d' };
  } else {
    return { level: 'D', name: '新手', color: '#dc3545' };
  }
}

/**
 * 计算最大可能得分
 * @param {Object} settings - 挑战设置
 * @returns {number} 单题最大得分
 */
function calculateMaxPossibleScore(settings) {
  // 假设最佳情况：1猜中，用时最少
  return calculateChallengeScore(true, 1, 1, settings);
}

/**
 * 计算排名（模拟）
 * @param {number} totalScore - 总分
 * @param {Object} settings - 挑战设置
 * @returns {Object} 排名信息
 */
function calculateRanking(totalScore, settings) {
  const maxScore = settings.questionCount * calculateMaxPossibleScore(settings);
  const percentage = (totalScore / maxScore) * 100;
  
  // 简单的排名模拟
  if (percentage >= 95) {
    return { percentile: 99, description: '超越了99%的挑战者' };
  } else if (percentage >= 90) {
    return { percentile: 95, description: '超越了95%的挑战者' };
  } else if (percentage >= 80) {
    return { percentile: 85, description: '超越了85%的挑战者' };
  } else if (percentage >= 70) {
    return { percentile: 70, description: '超越了70%的挑战者' };
  } else if (percentage >= 60) {
    return { percentile: 50, description: '超越了50%的挑战者' };
  } else {
    return { percentile: 25, description: '还有很大提升空间' };
  }
}

/**
 * 生成分享码
 * @param {Object} challengeData - 挑战数据
 * @returns {string} 分享码
 */
export function generateShareCode(challengeData) {
  const { settings } = challengeData;
  
  // 构建分享数据
  const shareData = {
    v: 1, // 版本号
    m: settings.gameMode, // 游戏模式
    q: settings.questionCount, // 题目数量
    t: settings.timePerQuestion, // 单题时间
    g: settings.maxGuesses, // 最大猜测次数
    s: (settings.starFilter && settings.starFilter.every((v, i) => i === 5 ? v : !v)) ? 1 : 0, // 六星限制
    // 可以选择是否包含具体题目
    // targets: results.map(r => r.targetOperator.干员)
  };
  
  // 编码为base64
  const encoded = btoa(JSON.stringify(shareData));
  return `AW${encoded}`.replace(/[+/=]/g, char => {
    return { '+': '-', '/': '_', '=': '' }[char];
  });
}

/**
 * 解析分享码
 * @param {string} shareCode - 分享码
 * @returns {Object|null} 解析结果
 */
export function parseShareCode(shareCode) {
  try {
    if (!shareCode.startsWith('AW')) {
      throw new Error('无效的分享码格式');
    }
    
    const encoded = shareCode.slice(2).replace(/[-_]/g, char => {
      return { '-': '+', '_': '/' }[char];
    });
    
    // 补充padding
    const padded = encoded + '='.repeat((4 - encoded.length % 4) % 4);
    
    const decoded = atob(padded);
    const shareData = JSON.parse(decoded);
    
    // 验证版本
    if (shareData.v !== 1) {
      throw new Error('不支持的分享码版本');
    }
    
    return {
      gameMode: shareData.m,
      questionCount: shareData.q,
      timePerQuestion: shareData.t,
      maxGuesses: shareData.g,
      starFilter: shareData.s === 1 ? [false, false, false, false, false, true] : [true, true, true, true, true, true],
      targets: shareData.targets || null
    };
  } catch (error) {
    console.error('解析分享码失败:', error);
    return null;
  }
}

/**
 * 生成二维码数据
 * @param {string} shareCode - 分享码
 * @returns {string} 二维码数据URL
 */
export function generateQRCodeData(shareCode) {
  // 构建分享URL
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?challenge=${shareCode}`;
  
  return shareUrl;
}

/**
 * 从URL参数中读取挑战
 * @returns {Object|null} 挑战设置
 */
export function loadChallengeFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const challengeCode = urlParams.get('challenge');
  
  if (challengeCode) {
    return parseShareCode(challengeCode);
  }
  
  return null;
}