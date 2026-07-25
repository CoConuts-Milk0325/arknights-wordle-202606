# 星级筛选功能设计

## 概述

在难度设置（TagSelector 区域）和挑战模式设置中，将原有的"只猜六星"复选框替换为完整的星级筛选组件，支持按 1-6 星多选过滤干员。

## 交互方案：快捷预设 + 芯片

星级筛选组件由三部分组成：

1. **快捷预设按钮行**：提供常用筛选快捷操作
2. **星级芯片行**：逐个点选开关
3. **状态提示文字**：显示当前选中结果

### 快捷预设按钮

| 预设 | 行为 |
|------|------|
| 全部 | 全选 1-6 星，清空自定义状态 |
| 仅六星 | 只选中 ★6 |
| 五星+ | 只选中 ★5, ★6 |

点击预设按钮后，星级芯片同步更新。用户点击芯片时会自动取消预设选中状态（预设按钮和芯片互斥）。

### 星级芯片

- 6 个按钮，依次为 ★1 ~ ★6
- 配色使用 `RARITY_COLORS`：1★/2★ 灰、3★ 蓝、4★ 黄、5★ 橙、6★ 红
- 默认全部选中
- 点击切换选中/未选中状态

### 状态提示文字

位于芯片行下方，动态显示：

| 状态 | 显示文字 |
|------|----------|
| 全部选中 | "当前选中: 全部星级" |
| 部分选中 | "当前选中: 6星" / "当前选中: 5星, 6星" |
| 单选 | "当前选中: 6星" |
| 全不选 | "当前未选中任何星级"（灰色） |

## 数据结构

```js
// 星级筛选状态
const starFilter = ref([true, true, true, true, true, true])
// 索引 0→1★, 1→2★, ..., 5→6★

// 快捷预设状态（null 表示无预设选中 / 自定义状态）
const starPreset = ref('all') // 'all' | 'six' | 'fivePlus' | null
```

## 筛选逻辑

```js
const filteredOperators = computed(() => {
  // 全部选中 → 不过滤
  if (starFilter.value.every(Boolean)) return operatorData.value
  // 按星级过滤
  return operatorData.value.filter(op => {
    const star = parseInt(op.稀有度, 10) + 1  // 稀有度0→1★, ..., 5→6★
    return starFilter.value[star - 1]
  })
})
```

## 受影响的文件

| 文件 | 改动内容 |
|------|----------|
| `frontend/src/App.vue` | 替换 `onlySixStar` 为星级筛选组件更新 `filteredOperators` 逻辑，模板中替换 checkbox |
| `frontend/src/components/ChallengeBoard.vue` | 替换 `onlySixStar` toggle 为星级筛选组件更新设置对象，传递给生成题目逻辑 |
| `frontend/src/logic/challengeService.js` | `generateChallengeQuestions` 接收 `starFilter` 参数用于过滤干员池 |
| `frontend/src/logic/gameLogic.js` | `filterByOnlySixStar` 不再使用，添加新的 `filterByStars(operators, starFilter)` |

## 数据持久化

- **普通模式**：`starFilter` 保存到 cookie，格式为 `[true,true,true,true,true,true]` 的 JSON 数组。旧 `onlySixStar`（boolean）cookie 迁移规则：`true` → `[false,false,false,false,false,true]`，`false`/无 → `[true,true,true,true,true,true]`
- **挑战模式**：`starFilter` 保存在 `challengeSettings` 对象中，不持久化

## 同步关系

普通模式和挑战模式的星级筛选各自独立，互不影响。
