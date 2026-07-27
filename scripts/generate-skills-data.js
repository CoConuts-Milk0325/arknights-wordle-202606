/**
 * generate-skills-data.js
 *
 * Reads the skill list markdown file and produces two JSON files:
 *   - frontend/public/data/skills.json          (operator -> skills array)
 *   - frontend/public/data/skills-reverse.json  (skill name -> operator name)
 *
 * Source format (D:\代码\技能图标\技能清单.md):
 *   **OperatorName**：
 *   一技能：SkillName
 *   二技能：SkillName
 *   三技能：SkillName
 */

const fs = require('fs');
const path = require('path');

// ---- Configuration ----
const INPUT_FILE = 'D:\\代码\\技能图标\\技能清单.md';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'frontend', 'public', 'data');
const OUTPUT_SKILLS = path.join(OUTPUT_DIR, 'skills.json');
const OUTPUT_REVERSE = path.join(OUTPUT_DIR, 'skills-reverse.json');

// ---- Regex patterns ----
// Matches "**OperatorName**：" (full-width colon) — the operator header
const OPERATOR_RE = /^\*\*(.+?)\*\*[：:]\s*$/;
// Matches "一技能：SkillName", "二技能：SkillName", "三技能：SkillName"
const SKILL_LINE_RE = /^[一二三]技能[：:]\s*(.+?)\s*$/;

// ---- Main ----
function main() {
  // Read source file
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split(/\r?\n/);

  const skills = {};       // { operatorName: [{序号, 技能名}, ...] }
  const reverse = {};      // { skillName: operatorName }

  let currentOperator = null;

  for (const line of lines) {
    const opMatch = line.match(OPERATOR_RE);
    if (opMatch) {
      currentOperator = opMatch[1].trim();
      if (!skills[currentOperator]) {
        skills[currentOperator] = [];
      }
      continue;
    }

    const skillMatch = line.match(SKILL_LINE_RE);
    if (skillMatch && currentOperator) {
      const skillName = skillMatch[1].trim();
      // Determine the skill number based on the Chinese prefix
      let skillNumber;
      if (line.startsWith('一技能')) {
        skillNumber = 1;
      } else if (line.startsWith('二技能')) {
        skillNumber = 2;
      } else if (line.startsWith('三技能')) {
        skillNumber = 3;
      }

      skills[currentOperator].push({
        序号: skillNumber,
        技能名: skillName,
      });

      // Reverse lookup: skill name -> operator name
      // Used for toast messages ("这是X的技能"), not for correctness checking
      reverse[skillName] = currentOperator;
    }
  }

  // Write skills.json (operator -> skills)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_SKILLS, JSON.stringify(skills, null, 2), 'utf-8');

  // Write skills-reverse.json (skill name -> operator)
  fs.writeFileSync(OUTPUT_REVERSE, JSON.stringify(reverse, null, 2), 'utf-8');

  // Summary
  const operatorCount = Object.keys(skills).length;
  const skillCount = Object.keys(reverse).length;

  console.log(`Skills data generation complete.`);
  console.log(`  Operators processed: ${operatorCount}`);
  console.log(`  Skills processed:    ${skillCount}`);
  console.log(`  Output files:`);
  console.log(`    ${OUTPUT_SKILLS}`);
  console.log(`    ${OUTPUT_REVERSE}`);
}

main();
