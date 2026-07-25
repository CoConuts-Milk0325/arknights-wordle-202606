# 星级筛选功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Replace the binary "只猜六星" checkbox with a multi-select star filter (1-6★) in both normal mode and challenge mode, with quick presets and status text.

**Architecture:** Template-level star filter component embedded in App.vue (settings panel) and ChallengeBoard.vue (setup page). Filter state is an array of 6 booleans + a preset string. Filtered operators computed property uses inline `Array.filter()`.

**Tech Stack:** Vue 3 Composition API, plain CSS

---

### Task 1: App.vue — Replace onlySixStar with starFilter

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/logic/gameLogic.js` (only to remove unused export)

- [ ] **Step 1: Add starFilter state, starPreset, and helper functions**

In the setup script section, find where `onlySixStar` is defined (line ~396) and replace it:

```js
// 替换 onlySixStar
const onlySixStar = ref(false);

// 改为：
// 星级筛选状态 [1★, 2★, 3★, 4★, 5★, 6★]
const starFilter = ref([true, true, true, true, true, true]);
const starPreset = ref('all'); // 'all' | 'six' | 'fivePlus' | null

function applyStarPreset(preset) {
  starPreset.value = preset;
  if (preset === 'all') starFilter.value = [true, true, true, true, true, true];
  else if (preset === 'six') starFilter.value = [false, false, false, false, false, true];
  else if (preset === 'fivePlus') starFilter.value = [false, false, false, false, true, true];
}

function toggleStar(index) {
  starFilter.value[index] = !starFilter.value[index];
  // 用户手动点击芯片时，取消预设选中
  starPreset.value = null;
}

const starFilterText = computed(() => {
  const selected = [];
  starFilter.value.forEach((v, i) => { if (v) selected.push(`${i + 1}星`); });
  if (selected.length === 6) return '当前选中: 全部星级';
  if (selected.length === 0) return '当前未选中任何星级';
  return `当前选中: ${selected.join(', ')}`;
});
```

- [ ] **Step 2: Update filteredOperators**

Replace the existing `filteredOperators` computed (line ~428):

```js
const filteredOperators = computed(() => {
  // 全部选中 → 不过滤
  if (starFilter.value.every(Boolean)) return operatorData.value;
  return operatorData.value.filter(op => {
    const star = (parseInt(op.稀有度, 10) || 0) + 1;
    return starFilter.value[star - 1];
  });
});
```

- [ ] **Step 3: Update initFromCookies for cookie migration**

Find the `initFromCookies` function (line ~486) and update the `onlySixStar` loading:

```js
// 替换这段：
if (typeof settings.onlySixStar === 'boolean') {
  onlySixStar.value = settings.onlySixStar;
}

// 改为：
if (settings.starFilter && Array.isArray(settings.starFilter)) {
  starFilter.value = settings.starFilter;
} else if (typeof settings.onlySixStar === 'boolean') {
  // 旧 cookie 迁移
  if (settings.onlySixStar) {
    starFilter.value = [false, false, false, false, false, true];
    starPreset.value = 'six';
  } else {
    starFilter.value = [true, true, true, true, true, true];
    starPreset.value = 'all';
  }
}
```

- [ ] **Step 4: Update cookie saving**

Find the save settings object (around line ~515-531) and replace `onlySixStar`:

```js
// 替换：
onlySixStar: onlySixStar.value,
// 改为：
starFilter: starFilter.value,
```

- [ ] **Step 5: Remove old watch on onlySixStar**

Find the `watch(onlySixStar, ...)` block (line ~543) and remove or replace it:

```js
// 替换为：
watch(starFilter, () => {
  resetGame();
}, { deep: true });
```

- [ ] **Step 6: Replace template — remove old checkbox, add star filter UI**

Find the old checkbox template (around line ~126 and ~187 — the "只猜六星" checkbox appears twice):

Remove both instances of:
```html
<label>
  <input type="checkbox" v-model="onlySixStar" />
  只猜六星
</label>
```

Add the new star filter UI in a suitable location (e.g. replacing where the checkbox was, or near the TagSelector). Use something like:

```html
<div class="star-filter-section">
  <div class="star-filter-label">星级筛选:</div>
  <div class="star-filter-presets">
    <button :class="['preset-btn', { active: starPreset === 'all' }]" @click="applyStarPreset('all')">全部</button>
    <button :class="['preset-btn', { active: starPreset === 'six' }]" @click="applyStarPreset('six')">仅六星</button>
    <button :class="['preset-btn', { active: starPreset === 'fivePlus' }]" @click="applyStarPreset('fivePlus')">五星+</button>
  </div>
  <div class="star-filter-chips">
    <button
      v-for="(_, index) in starFilter"
      :key="index"
      :class="['star-chip', { active: starFilter[index] }]"
      :style="{ '--star-color': rarityColors[String(index + 1)] }"
      @click="toggleStar(index)"
    >
      {{ index + 1 }}★
    </button>
  </div>
  <div class="star-filter-status" :class="{ empty: starFilterText.includes('未选中') }">
    {{ starFilterText }}
  </div>
</div>
```

Add rarityColors reference:
```js
import { RARITY_COLORS } from './config/constants';
// In setup:
const rarityColors = RARITY_COLORS;
```

- [ ] **Step 7: Add CSS for star filter**

Add styles after existing styles:

```css
.star-filter-section {
  margin: 12px 0;
  padding: 0 4px;
}
.star-filter-label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-text);
}
.star-filter-presets {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.preset-btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: var(--color-text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.preset-btn.active {
  background: rgba(52, 152, 219, 0.25);
  border-color: var(--color-primary);
}
.star-filter-chips {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
}
.star-chip {
  width: 40px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.4;
}
.star-chip.active {
  opacity: 1;
  border-color: var(--star-color, var(--color-primary));
  background: color-mix(in srgb, var(--star-color, var(--color-primary)) 25%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--star-color, var(--color-primary)) 30%, transparent);
}
.star-filter-status {
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.7;
}
.star-filter-status.empty {
  color: #e74c3c;
}
```

- [ ] **Step 8: Add `starFilter`, `starPreset`, `applyStarPreset`, `toggleStar`, `starFilterText`, `rarityColors` to return object**

Ensure these are all included in the `setup` return block (around line ~730):

```js
return {
  // ... existing ...
  starFilter,
  starPreset,
  applyStarPreset,
  toggleStar,
  starFilterText,
  rarityColors,
  // ... existing ...
}
```

- [ ] **Step 9: Remove unused imports and exports**

Also delete `filterByOnlySixStar` from gameLogic.js if it's no longer used:

```js
// gameLogic.js - delete or comment out:
// export function filterByOnlySixStar(operators) {
//   return operators.filter(op => op.星级 === 6);
// }
```

And remove the import from App.vue:
```js
// Remove:
// import { filterByOnlySixStar } from './logic/gameLogic';
```

### Task 2: ChallengeBoard.vue — Replace onlySixStar toggle

**Files:**
- Modify: `frontend/src/components/ChallengeBoard.vue`

- [ ] **Step 1: Replace onlySixStar in challengeSettings with starFilter**

In the setup section where `challengeSettings` is defined (line ~274):

```js
// 替换：
const challengeSettings = ref({
  gameMode: 'easy',
  questionCount: 5,
  timePerQuestion: 300,
  maxGuesses: 6,
  onlySixStar: false,     // ← 替换这行
  potentialMode: '满潜',
  trustMode: '满信赖',
  puzzleHintInterval: 3
});

// 改为：
const challengeSettings = ref({
  gameMode: 'easy',
  questionCount: 5,
  timePerQuestion: 300,
  maxGuesses: 6,
  starFilter: [true, true, true, true, true, true],
  starPreset: 'all',
  potentialMode: '满潜',
  trustMode: '满信赖',
  puzzleHintInterval: 3
});
```

- [ ] **Step 2: Add star filter helper functions**

In the setup function:

```js
function applyChallengeStarPreset(preset) {
  challengeSettings.value.starPreset = preset;
  if (preset === 'all') challengeSettings.value.starFilter = [true, true, true, true, true, true];
  else if (preset === 'six') challengeSettings.value.starFilter = [false, false, false, false, false, true];
  else if (preset === 'fivePlus') challengeSettings.value.starFilter = [false, false, false, false, true, true];
}

function toggleChallengeStar(index) {
  challengeSettings.value.starFilter[index] = !challengeSettings.value.starFilter[index];
  challengeSettings.value.starPreset = null;
}

const challengeStarFilterText = computed(() => {
  const sf = challengeSettings.value.starFilter;
  const selected = [];
  sf.forEach((v, i) => { if (v) selected.push(`${i + 1}星`); });
  if (selected.length === 6) return '当前选中: 全部星级';
  if (selected.length === 0) return '当前未选中任何星级';
  return `当前选中: ${selected.join(', ')}`;
});
```

- [ ] **Step 3: Replace template — swap "只猜六星" toggle for star filter UI**

Find the `只猜六星` button (around line ~77-87) and replace the entire `.param-item` with:

```html
<div class="param-item star-filter-item">
  <label class="param-label">星级筛选</label>
  <div class="star-filter-presets">
    <button :class="['preset-btn', { active: challengeSettings.starPreset === 'all' }]" @click="applyChallengeStarPreset('all')">全部</button>
    <button :class="['preset-btn', { active: challengeSettings.starPreset === 'six' }]" @click="applyChallengeStarPreset('six')">仅六星</button>
    <button :class="['preset-btn', { active: challengeSettings.starPreset === 'fivePlus' }]" @click="applyChallengeStarPreset('fivePlus')">五星+</button>
  </div>
  <div class="star-filter-chips">
    <button
      v-for="(_, index) in challengeSettings.starFilter"
      :key="index"
      :class="['star-chip', { active: challengeSettings.starFilter[index] }]"
      :style="{ '--star-color': rarityColors[String(index + 1)] }"
      @click="toggleChallengeStar(index)"
    >
      {{ index + 1 }}★
    </button>
  </div>
  <div class="star-filter-status" :class="{ empty: challengeStarFilterText.includes('未选中') }">
    {{ challengeStarFilterText }}
  </div>
</div>
```

- [ ] **Step 4: Add RARITY_COLORS import**

```js
import { RARITY_COLORS } from '../config/constants';
// In setup:
const rarityColors = RARITY_COLORS;
```

- [ ] **Step 5: starFilter already passed via settings object**

`generateChallengeQuestions` already receives the full `challengeSettings` as the second parameter (`settings`), so `starFilter` is automatically available as `settings.starFilter` inside the function. No change needed at the call site.

- [ ] **Step 6: Add CSS**

Add the same `.star-filter-presets`, `.star-chip`, etc. CSS classes as in Task 1 (can be duplicated).

### Task 3: challengeService.js — Use starFilter from settings

**Files:**
- Modify: `frontend/src/logic/challengeService.js`

- [ ] **Step 1: Read starFilter from settings and filter operator pool**

The function signature is `generateChallengeQuestions(operators, settings, progressCallback)`. Find where random operators are selected for answer generation, and add filtering at the top of the function:

```js
export async function generateChallengeQuestions(operators, settings, progressCallback = () => {}) {
  // 星级筛选
  let pool = operators;
  if (settings.starFilter && !settings.starFilter.every(Boolean)) {
    pool = operators.filter(op => {
      const star = (parseInt(op.稀有度, 10) || 0) + 1;
      return settings.starFilter[star - 1];
    });
  }
  // 后续代码用 pool 替代 operators
  ...
}
```

- [ ] **Step 2: Ensure rest of function uses pool**

Find where the function selects random operators (e.g. `operators[Math.floor(Math.random() * operators.length)]`) and verify it uses `pool` instead.

### Task 4: Start dev server for preview

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && npm run serve
```
