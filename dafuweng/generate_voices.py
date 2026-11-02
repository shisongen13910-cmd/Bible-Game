#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《天路同行：圣经大富翁》离线真人级角色配音包一键生成脚本 (generate_voices.py) - v2 断点续传与防限流版
更新改进：
1. 自动跳过已成功生成的 MP3（刚才已生成的 40 个文件无需重复下载，直接补齐剩余 8 个）
2. 限制并发数为 3（Semaphore），防止同时发起 48 个连接被微软接口限流断开
3. 修复路加 (luke) 的 "+0Hz" 参数及跨区音源兼容性，并加入自动重试机制
"""

import asyncio
import os

try:
    import edge_tts
except ImportError:
    print("❌ 未检测到 edge-tts 库！请先在终端运行：pip install edge-tts")
    exit(1)

OUTPUT_DIR = "voices"

# 8位圣经男性角色专属声线配置
VOICE_PROFILES = {
    "abraham": {
        "name": "亚伯拉罕（信心之父·苍老浑厚）",
        "voice": "zh-CN-YunjianNeural",
        "rate_pos": "-10%", "pitch_pos": "-12Hz",
        "rate_neg": "-16%", "pitch_neg": "-16Hz",
        "positive": [
            "仰望天上的众星，耶和华必预备一切！",
            "凭着信心踏上应许之地，神的赐福何其广大！",
            "筑起祭坛求告主名，万族必因这信蒙福！"
        ],
        "negative": [
            "这迦南地的饥荒甚大，求主坚固仆人的脚步……",
            "虽然眼下遭遇亏损，但我深信神的应许永不落空。",
            "漫漫旷野路途不易，仍当专心仰望那召我的主。"
        ]
    },
    "moses": {
        "name": "摩西（律法与领路人·威严深沉）",
        "voice": "zh-CN-YunjianNeural",
        "rate_pos": "-4%",  "pitch_pos": "-6Hz",
        "rate_neg": "-12%", "pitch_neg": "-10Hz",
        "positive": [
            "不要惧怕，只管站住，看耶和华今日向我们所要施行的救恩！",
            "云柱火柱在前引导，旷野的磐石也必流出活水！",
            "耶和华是我的力量，是我的诗歌，他也成了我的拯救！"
        ],
        "negative": [
            "这百姓的担子何其沉重，求主赐下恩典与忍耐……",
            "旷野的路途甚是艰难，但求主的同在不离开我们。",
            "求你指教我们怎样数算自己的日子，好得着智慧的心。"
        ]
    },
    "david": {
        "name": "大卫（合神心意的王·清亮激昂青年声）",
        "voice": "zh-CN-YunxiNeural",
        "rate_pos": "+8%",  "pitch_pos": "+8Hz",
        "rate_neg": "-4%",  "pitch_neg": "+2Hz",
        "positive": [
            "哈利路亚！我的心哪，你要弹琴称颂耶和华的圣名！",
            "耶和华是我的牧者，我必不致缺乏，福杯满溢！",
            "靠着万军之耶和华的名，我们必在佳美之处得着产业！"
        ],
        "negative": [
            "我的心哪，你为何忧闷？应当仰望神，我还要称赞他！",
            "虽然行过死荫的幽谷，我也不怕遭害，因为你与我同在。",
            "神啊，求你为我造清洁的心，使我里面重新有正直的灵！"
        ]
    },
    "solomon": {
        "name": "所罗门（智慧与圣殿之王·尊贵端庄男中音）",
        "voice": "zh-CN-YunyangNeural",
        "rate_pos": "-4%",  "pitch_pos": "-4Hz",
        "rate_neg": "-10%", "pitch_neg": "-8Hz",
        "positive": [
            "敬畏耶和华是智慧的开端，愿这宏伟圣殿充满主的荣光！",
            "若不是耶和华建造房屋，建造的人就枉然劳力！",
            "智慧与富足皆从主而来，当以甘心乐意的心建造圣所！"
        ],
        "negative": [
            "虚空的虚空……世上的钱财果然如飞鸟展翅飞去。",
            "凡事都有定期，今日虽有亏损，他日必再得饱足。",
            "人的筹算在乎心，惟有耶和华指引人脚下的道路。"
        ]
    },
    "peter": {
        "name": "彼得（教会磐石·豪爽热忱渔夫）",
        "voice": "zh-CN-YunjianNeural",
        "rate_pos": "+6%",  "pitch_pos": "+2Hz",
        "rate_neg": "-2%",  "pitch_neg": "-3Hz",
        "positive": [
            "你是基督，是永生神的儿子！在这磐石上教会必稳固建立！",
            "主啊，你有永生之道，我们还归从谁呢？必竭力牧养群羊！",
            "金银我虽有限，但奉拿撒勒人耶稣的名，圣工必大得复兴！"
        ],
        "negative": [
            "主啊，救我！我不该只看眼前的风浪而小信软弱……",
            "务要谨守警醒，在患难试炼中更当坚固弟兄们的心！",
            "暂时的受挫算不得什么，信心经过试验比金子更显宝贵！"
        ]
    },
    "paul": {
        "name": "保罗（外邦人的使徒·刚毅果敢）",
        "voice": "zh-CN-YunyangNeural",
        "rate_pos": "+6%",  "pitch_pos": "+2Hz",
        "rate_neg": "-2%",  "pitch_neg": "-2Hz",
        "positive": [
            "忘记背后，努力面前的，向着标竿直跑，把福音传到地极！",
            "我靠着那加给我力量的，凡事都能做！众教会大得造就！",
            "这福音本是神的大能，感谢主为我们开了传道的宽大之门！"
        ],
        "negative": [
            "我素常知道怎样处丰富，也知道怎样处卑贱，主恩够我用的！",
            "我们四面受敌，却不被困住；打倒了，却不至死亡！",
            "为福音的缘故受些亏损算不得什么，万事都互相效力！"
        ]
    },
    "barnabas": {
        "name": "巴拿巴（劝慰子·温暖宽厚男声）",
        "voice": "zh-CN-YunxiNeural",
        "rate_pos": "-2%",  "pitch_pos": "-4Hz",
        "rate_neg": "-8%",  "pitch_neg": "-6Hz",
        "positive": [
            "看哪，弟兄和睦同居是何等的善，何等的美！",
            "施比受更为有福，愿主的恩惠与劝慰常与众教会同在！",
            "看见神所赐的恩典，我心里欢喜，愿大家都恒久靠主！"
        ],
        "negative": [
            "甘心乐意地支持同工的事工，天父必在暗中察看并报答！",
            "弟兄们不要灰心，我们在善事上若不丧志，到了时候必有收成。",
            "彼此担当重担，就能成全基督的律法，愿平安归与你们！"
        ]
    },
    "luke": {
        "name": "路加（博学医者与史家·儒雅书卷气男声）",
        "voice": "zh-CN-YunxiNeural",
        "rate_pos": "-3%",  "pitch_pos": "+3Hz",
        "rate_neg": "-7%",  "pitch_neg": "-2Hz",
        "positive": [
            "从起头都详细考察了，按着次序记载，使人知晓所学之道都是确实的！",
            "天天考查圣经，要晓得这道是与不是，真理必使会众得自由！",
            "主的道日见兴旺，越发广传，门徒的数目在各城大大加增！"
        ],
        "negative": [
            "经上的教训博大精深，看来我还需要更加详尽地考究一番……",
            "行医与宣教皆需耐心，暂时的耗损阻挡不了福音的脚步。",
            "不要惊慌，把这一切事存在心里反复思想，主必亲自引领。"
        ]
    }
}

# 限制同时最多 3 个音频合成请求，防止被微软服务器限流
sem = asyncio.Semaphore(3)

async def synthesize_single(char_id, mood_key, idx, text, voice_name, rate, pitch):
    filename = f"{char_id}_{mood_key}_{idx}.mp3"
    filepath = os.path.join(OUTPUT_DIR, filename)

    # 断点续传：如果文件已经存在且大于 1KB，直接跳过
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1024:
        print(f"  ⏭️ 已存在跳过: {filepath}")
        return

    async with sem:
        for attempt in range(1, 4):
            try:
                communicate = edge_tts.Communicate(text=text, voice=voice_name, rate=rate, pitch=pitch)
                await communicate.save(filepath)
                print(f"  ✅ 已生成: {filepath}  ({voice_name} | {rate}, {pitch})")
                await asyncio.sleep(0.15)
                return
            except Exception as e:
                print(f"  ⚠️ 第 {attempt} 次尝试生成 {filename} 失败 ({e})，正在重试...")
                await asyncio.sleep(0.8 * attempt)

        # 若带音高偏置仍失败，使用默认标准参数保底生成
        communicate = edge_tts.Communicate(text=text, voice="zh-CN-YunyangNeural")
        await communicate.save(filepath)
        print(f"  ✅ 保底生成成功: {filepath}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("🎙️ 开始检查并补齐《天路同行：圣经大富翁》48 句角色专属男声 MP3...")
    tasks = []
    for char_id, cfg in VOICE_PROFILES.items():
        for idx, quote in enumerate(cfg["positive"]):
            tasks.append(synthesize_single(
                char_id, "pos", idx, quote,
                cfg["voice"], cfg["rate_pos"], cfg["pitch_pos"]
            ))
        for idx, quote in enumerate(cfg["negative"]):
            tasks.append(synthesize_single(
                char_id, "neg", idx, quote,
                cfg["voice"], cfg["rate_neg"], cfg["pitch_neg"]
            ))
    await asyncio.gather(*tasks)
    print("\n🎉 全部 48 个角色语音文件已 100% 准备就绪（位于 ./voices/ 文件夹下）！")
    print("👉 现在打开或刷新游戏网页，即可体验完整的真人级男声配音！")

if __name__ == "__main__":
    asyncio.run(main())
