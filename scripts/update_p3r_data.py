# scripts/update_p3r_data.py
import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'frontend', 'public', 'data')
OPERATORS_JSON = os.path.join(DATA_DIR, 'operators.json')
SKILLS_MD = r'D:\代码\技能图标\技能清单.md'

NEW_OPERATORS = [
    {
        "干员": "虎狼丸",
        "职业": "近卫",
        "稀有度": "0",
        "标志": "S.E.E.S.",
        "团队": "S.E.E.S.",
        "干员外文名": "Koromaru",
        "干员名jp": "",
        "情报编号": "PS38",
        "位置": "近战位",
        "标签": "爆发 控场",
        "特性": "普通攻击连续造成两次伤害，且不受部署数量限制，但再部署时间极长",
        "干员序号": "428",
        "子职业": "剑豪",
        "阵营": "S.E.E.S.",
        "国家": "罗德岛",
        "组织": None,
        "皮肤1名称": "飞越甜蜜之城",
        "皮肤2名称": None,
        "皮肤3名称": None,
        "皮肤4名称": None,
        "皮肤5名称": None,
        "皮肤6名称": None,
        "皮肤7名称": None,
        "皮肤8名称": None,
        "皮肤9名称": None,
        "皮肤10名称": None,
        "出身地": "未录入",
        "种族": "佩洛兽亲（据称）",
        "性别": "未录入",
        "物理强度": None,
        "战场机动": None,
        "生理耐受": None,
        "战术规划": None,
        "战斗技巧": None,
        "源石技艺适应性": None,
        "身高": "未录入",
        "出生日期": "未录入",
        "感染状态": "非感染者",
        "获得方式": "来自：女神异闻录3 Reload （ペルソナ３ リロード，游戏，日本） （©ATLUS ©SEGA） ※联动干员不加入关系网，即使其拥有档案编号或归属于已有的阵营；计入个人名片干员招募数，但不计入招募进度百分比、不影响阵营图标点亮状态。\xa0月行水上活动获得",
        "上线时间": "2026年9月4日 12:00",
        "满级生命": "904",
        "满级攻击": "242",
        "满级防御": "125",
        "满级法术抗性": "0",
        "再部署时间": "200s",
        "部署费用": "3",
        "阻挡数": "2",
        "攻击速度": "1.3s",
        "潜能加成": "`",
        "信赖加成": "0,30,30"
    },
    {
        "干员": "岳羽由加莉",
        "职业": "辅助",
        "稀有度": "4",
        "标志": "S.E.E.S.",
        "团队": "S.E.E.S.",
        "干员外文名": "Yukari Takeba",
        "干员名jp": "",
        "情报编号": "PS34",
        "位置": "远程位",
        "标签": "输出 支援",
        "特性": "可以使用触发型效果协助作战",
        "干员序号": "429",
        "子职业": "游击手",
        "阵营": "S.E.E.S.",
        "国家": "罗德岛",
        "组织": None,
        "皮肤1名称": "戍卫晨昏",
        "皮肤2名称": None,
        "皮肤3名称": None,
        "皮肤4名称": None,
        "皮肤5名称": None,
        "皮肤6名称": None,
        "皮肤7名称": None,
        "皮肤8名称": None,
        "皮肤9名称": None,
        "皮肤10名称": None,
        "出身地": "未录入",
        "种族": "未录入",
        "性别": "女",
        "物理强度": None,
        "战场机动": None,
        "生理耐受": None,
        "战术规划": None,
        "战斗技巧": None,
        "源石技艺适应性": None,
        "身高": "159cm",
        "出生日期": "10月19日",
        "感染状态": "非感染者",
        "获得方式": "来自：女神异闻录3 Reload （ペルソナ３ リロード，游戏，日本） （©ATLUS ©SEGA） ※联动干员不加入关系网，即使其拥有档案编号或归属于已有的阵营；计入个人名片干员招募数，但不计入招募进度百分比、不影响阵营图标点亮状态。\xa0石白深蓝之夜圣城春日学生寻访",
        "上线时间": "2026年9月4日 12:00",
        "满级生命": "1510",
        "满级攻击": "775",
        "满级防御": "200",
        "满级法术抗性": "10",
        "再部署时间": "70s",
        "部署费用": "14→16",
        "阻挡数": "1",
        "攻击速度": "2.1s",
        "潜能加成": "cost,re_deploy,atk,re_deploy,cost\\`-1,-4,30,-6,-1",
        "信赖加成": "300,30,0"
    },
    {
        "干员": "埃癸斯",
        "职业": "狙击",
        "稀有度": "4",
        "标志": "S.E.E.S.",
        "团队": "S.E.E.S.",
        "干员外文名": "Aegis",
        "干员名jp": "",
        "情报编号": "PS37",
        "位置": "远程位",
        "标签": "群攻",
        "特性": "部署后起飞，起飞后只攻击空中敌人；技能开启时降落且攻击造成群体物理伤害",
        "干员序号": "430",
        "子职业": "裂空炮手",
        "阵营": "S.E.E.S.",
        "国家": "罗德岛",
        "组织": None,
        "皮肤1名称": "静思真谛",
        "皮肤2名称": None,
        "皮肤3名称": None,
        "皮肤4名称": None,
        "皮肤5名称": None,
        "皮肤6名称": None,
        "皮肤7名称": None,
        "皮肤8名称": None,
        "皮肤9名称": None,
        "皮肤10名称": None,
        "出身地": "未录入",
        "种族": "未录入",
        "性别": "女",
        "物理强度": None,
        "战场机动": None,
        "生理耐受": None,
        "战术规划": None,
        "战斗技巧": None,
        "源石技艺适应性": None,
        "身高": "163cm",
        "出生日期": "未录入",
        "感染状态": "非感染者",
        "获得方式": "来自：女神异闻录3 Reload （ペルソナ３ リロード，游戏，日本） （©ATLUS ©SEGA） ※联动干员不加入关系网，即使其拥有档案编号或归属于已有的阵营；计入个人名片干员招募数，但不计入招募进度百分比、不影响阵营图标点亮状态。\xa0石白深蓝之夜圣城春日学生寻访",
        "上线时间": "2026年9月4日 12:00",
        "满级生命": "1586",
        "满级攻击": "882",
        "满级防御": "219",
        "满级法术抗性": "0",
        "再部署时间": "70s",
        "部署费用": "20→22",
        "阻挡数": "1",
        "攻击速度": "2.1s",
        "潜能加成": "cost,re_deploy,atk,cost\\`-1,-4,33,-1",
        "信赖加成": "100,60,0"
    },
    {
        "干员": "结城理",
        "职业": "特种",
        "稀有度": "5",
        "标志": "S.E.E.S.",
        "团队": "S.E.E.S.",
        "干员外文名": "Makoto Yuki",
        "干员名jp": "",
        "情报编号": "PS33",
        "位置": "近战位",
        "标签": "输出 快速复活 治疗",
        "特性": "受到致命伤时不撤退，切换成<替身>作战（替身阻挡数为0），持续20秒后自身再次替换<替身>",
        "干员序号": "431",
        "子职业": "傀儡师",
        "阵营": "S.E.E.S.",
        "国家": "罗德岛",
        "组织": None,
        "皮肤1名称": "见证荣光",
        "皮肤2名称": None,
        "皮肤3名称": None,
        "皮肤4名称": None,
        "皮肤5名称": None,
        "皮肤6名称": None,
        "皮肤7名称": None,
        "皮肤8名称": None,
        "皮肤9名称": None,
        "皮肤10名称": None,
        "出身地": "未录入",
        "种族": "未录入",
        "性别": "男",
        "物理强度": None,
        "战场机动": None,
        "生理耐受": None,
        "战术规划": None,
        "战斗技巧": None,
        "源石技艺适应性": None,
        "身高": "未录入",
        "出生日期": "未录入",
        "感染状态": "非感染者",
        "获得方式": "来自：女神异闻录3 Reload （ペルソナ３ リロード，游戏，日本） （©ATLUS ©SEGA） ※联动干员不加入关系网，即使其拥有档案编号或归属于已有的阵营；计入个人名片干员招募数，但不计入招募进度百分比、不影响阵营图标点亮状态。\xa0石白深蓝之夜圣城春日学生寻访",
        "上线时间": "2026年9月4日 12:00",
        "满级生命": "2805",
        "满级攻击": "785",
        "满级防御": "305",
        "满级法术抗性": "0",
        "再部署时间": "70s",
        "部署费用": "14→14→16",
        "阻挡数": "2",
        "攻击速度": "1.2s",
        "潜能加成": "cost,atk,cost\\`-1,34,-1",
        "信赖加成": "200,40,0"
    }
]

NEW_SKILLS_MARKDOWN = """
**埃癸斯**：
一技能：启动狂宴模式
二技能：全弹发射

**结城理**：
一技能：俄耳甫斯的竖琴
二技能：塔纳托斯的囚锁
三技能：开辟明日的剑刃

**岳羽由加莉**：
一技能：龙卷箭
二技能：明镜止水
"""

def update_operators():
    with open(OPERATORS_JSON, 'r', encoding='utf-8') as f:
        ops = json.load(f)
    print(f"Original operators count: {len(ops)}")
    
    existing_names = set(o['干员'] for o in ops)
    for new_op in NEW_OPERATORS:
        if new_op['干员'] in existing_names:
            ops = [o for o in ops if o['干员'] != new_op['干员']]
        ops.append(new_op)
        
    print(f"Updated operators count: {len(ops)}")
    
    with open(OPERATORS_JSON, 'w', encoding='utf-8') as f:
        json.dump(ops, f, ensure_ascii=False, indent=2)
    print(f"Saved {OPERATORS_JSON}")
    
    # Sync to other copies
    for extra in [r'D:\代码\operators.json', r'D:\代码\技能图标\operators.json']:
        if os.path.exists(os.path.dirname(extra)):
            try:
                with open(extra, 'w', encoding='utf-8') as f:
                    json.dump(ops, f, ensure_ascii=False, indent=2)
                print(f"Synced to {extra}")
            except Exception as e:
                print(f"Sync error {extra}: {e}")

def update_skills_md():
    if not os.path.exists(SKILLS_MD):
        print(f"File {SKILLS_MD} does not exist, skipping markdown update.")
        return
        
    with open(SKILLS_MD, 'r', encoding='utf-8') as f:
        content = f.read()

    # Avoid duplicating if already present
    modified = False
    for op_name, block in [
        ('埃癸斯', '\n**埃癸斯**：\n一技能：启动狂宴模式\n二技能：全弹发射\n'),
        ('结城理', '\n**结城理**：\n一技能：俄耳甫斯的竖琴\n二技能：塔纳托斯的囚锁\n三技能：开辟明日的剑刃\n'),
        ('岳羽由加莉', '\n**岳羽由加莉**：\n一技能：龙卷箭\n二技能：明镜止水\n')
    ]:
        if f'**{op_name}**' not in content:
            content += block
            modified = True
            print(f"Added {op_name} to {SKILLS_MD}")
            
    if modified:
        with open(SKILLS_MD, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Saved {SKILLS_MD}")

if __name__ == '__main__':
    update_operators()
    update_skills_md()
