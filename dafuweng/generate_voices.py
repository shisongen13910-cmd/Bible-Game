#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《天路同行：圣经大富翁》480句离线真人级角色配音包一键生成脚本 (generate_voices.py) - v3 完整版
功能特性：
1. 自动读取并解析同目录下的 prayers.js（8位角色 × 2种情绪 × 30句 = 480句）
2. 断点续传：自动跳过 ./voices/ 目录下已存在且大小正常的 MP3 文件（原有的 48 个文件直接保留跳过）
3. 防限流并发控制：限制最大并发数为 3（Semaphore），内置 3 次自动重试与保底合成机制
"""

import asyncio
import os
import re
import sys

try:
    import edge_tts
except ImportError:
    print("❌ 未检测到 edge-tts 库！请先在终端运行：pip install edge-tts")
    sys.exit(1)

OUTPUT_DIR = "voices"
PRAYERS_JS_PATH = "prayers.js"

# 8位圣经男性角色专属声线配置
VOICE_PROFILES = {
    "abraham": {
        "name": "亚伯拉罕（信心之父·苍老浑厚）",
        "voice": "zh-CN-YunjianNeural",
        "rate_pos": "-10%", "pitch_pos": "-12Hz",
        "rate_neg": "-16%", "pitch_neg": "-16Hz"
    },
    "moses": {
        "name": "摩西（律法与领路人·威严深沉）",
        "voice": "zh-CN-YunjianNeural",
        "rate_pos": "-4%",  "pitch_pos": "-6Hz",
        "rate_neg": "-12%", "pitch_neg": "-10Hz"
    },
    "david": {
        "name": "大卫（合神心意的王·清亮激昂青年声）",
        "voice": "zh-CN-YunxiNeural",
        "rate_pos": "+8%",  "pitch_pos": "+8Hz",
        "rate_neg": "-4%",  "pitch_neg": "+2Hz"
    },
    "solomon": {
        "name": "所罗门（智慧与圣殿之王·尊贵端庄男中音）",
        "voice": "zh-CN-YunyangNeural",
        "rate_pos": "-4%",  "pitch_pos": "-4Hz",
        "rate_neg": "-10%", "pitch_neg": "-8Hz"
    },
    "peter": {
        "name": "彼得（教会磐石·豪爽热忱渔夫）",
        "voice": "zh-CN-YunjianNeural",
        "rate_pos": "+6%",  "pitch_pos": "+2Hz",
        "rate_neg": "-2%",  "pitch_neg": "-3Hz"
    },
    "paul": {
        "name": "保罗（外邦人的使徒·刚毅果敢）",
        "voice": "zh-CN-YunyangNeural",
        "rate_pos": "+6%",  "pitch_pos": "+2Hz",
        "rate_neg": "-2%",  "pitch_neg": "-2Hz"
    },
    "barnabas": {
        "name": "巴拿巴（劝慰子·温暖宽厚男声）",
        "voice": "zh-CN-YunxiNeural",
        "rate_pos": "-2%",  "pitch_pos": "-4Hz",
        "rate_neg": "-8%",  "pitch_neg": "-6Hz"
    },
    "luke": {
        "name": "路加（博学医者与史家·儒雅书卷气男声）",
        "voice": "zh-CN-YunxiNeural",
        "rate_pos": "-3%",  "pitch_pos": "+3Hz",
        "rate_neg": "-7%",  "pitch_neg": "-2Hz"
    }
}


def parse_prayers_js(filepath):
    """
    稳健解析 prayers.js 中的每个角色的 positive 与 negative 台词列表，
    不依赖严格的 JSON 格式，支持 JS 注释与尾随逗号。
    """
    if not os.path.exists(filepath):
        print(f"❌ 找不到 {filepath}！请确保 prayers.js 与本脚本在同一目录下。")
        sys.exit(1)

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 移除单行与多行注释
    content = re.sub(r"/\*[\s\S]*?\*/", "", content)
    content = re.sub(r"//.*", "", content)

    prayers_data = {}
    for char_id in VOICE_PROFILES.keys():
        # 匹配角色块：char_id: { ... positive: [ ... ], negative: [ ... ] }
        char_pattern = re.compile(
            rf"\b{char_id}\s*:\s*\{{([\s\S]*?)\n\s*\}}",
            re.MULTILINE
        )
        char_match = char_pattern.search(content)
        if not char_match:
            print(f"⚠️ 警告：在 {filepath} 中未找到角色 {char_id} 的词库配置！")
            continue

        char_block = char_match.group(1)

        pos_match = re.search(r"positive\s*:\s*\[([\s\S]*?)\]", char_block)
        neg_match = re.search(r"negative\s*:\s*\[([\s\S]*?)\]", char_block)

        pos_list = re.findall(r'"([^"]+)"', pos_match.group(1)) if pos_match else []
        neg_list = re.findall(r'"([^"]+)"', neg_match.group(1)) if neg_match else []

        prayers_data[char_id] = {
            "positive": pos_list,
            "negative": neg_list
        }

    return prayers_data


# 限制同时最多 3 个音频合成请求，防止被微软服务器限流断开
sem = asyncio.Semaphore(3)

# 统计计数器
stats = {
    "skipped": 0,
    "generated": 0,
    "failed": 0
}


async def synthesize_single(char_id, mood_key, idx, text, voice_name, rate, pitch, total_count):
    filename = f"{char_id}_{mood_key}_{idx}.mp3"
    filepath = os.path.join(OUTPUT_DIR, filename)

    # 断点续传：如果文件已经存在且大于 1KB，直接跳过
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1024:
        stats["skipped"] += 1
        print(f"  ⏭️ [{stats['skipped'] + stats['generated']}/{total_count}] 已存在跳过: {filename}")
        return

    async with sem:
        for attempt in range(1, 4):
            try:
                communicate = edge_tts.Communicate(
                    text=text,
                    voice=voice_name,
                    rate=rate,
                    pitch=pitch
                )
                await communicate.save(filepath)
                stats["generated"] += 1
                done_num = stats["skipped"] + stats["generated"]
                print(f"  ✅ [{done_num}/{total_count}] 已生成: {filename} ({voice_name} | {rate}, {pitch})")
                await asyncio.sleep(0.15)
                return
            except Exception as e:
                print(f"  ⚠️ 第 {attempt} 次尝试生成 {filename} 失败 ({e})，正在重试...")
                await asyncio.sleep(0.8 * attempt)

        # 若带音高偏置仍失败，使用默认标准参数保底生成
        try:
            communicate = edge_tts.Communicate(text=text, voice="zh-CN-YunyangNeural")
            await communicate.save(filepath)
            stats["generated"] += 1
            done_num = stats["skipped"] + stats["generated"]
            print(f"  ✅ [{done_num}/{total_count}] 保底生成成功: {filename}")
        except Exception as e:
            stats["failed"] += 1
            print(f"  ❌ 最终生成失败: {filename} ({e})")


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("📖 正在读取 prayers.js 祷告词库...")
    prayers_data = parse_prayers_js(PRAYERS_JS_PATH)

    tasks = []
    for char_id, cfg in VOICE_PROFILES.items():
        char_quotes = prayers_data.get(char_id, {"positive": [], "negative": []})
        pos_quotes = char_quotes["positive"]
        neg_quotes = char_quotes["negative"]

        print(f"  👤 {cfg['name']}: 积极 {len(pos_quotes)} 句 / 消极 {len(neg_quotes)} 句")

        for idx, quote in enumerate(pos_quotes):
            tasks.append((
                char_id, "pos", idx, quote,
                cfg["voice"], cfg["rate_pos"], cfg["pitch_pos"]
            ))

        for idx, quote in enumerate(neg_quotes):
            tasks.append((
                char_id, "neg", idx, quote,
                cfg["voice"], cfg["rate_neg"], cfg["pitch_neg"]
            ))

    total_count = len(tasks)
    print(f"\n🎙️ 开始检查并合成共 {total_count} 句角色专属男声 MP3（并发数=3，支持断点续传）...\n")

    coroutines = [
        synthesize_single(c_id, m_key, i, txt, v_name, r, p, total_count)
        for (c_id, m_key, i, txt, v_name, r, p) in tasks
    ]
    await asyncio.gather(*coroutines)

    print("\n" + "=" * 58)
    print(f"🎉 语音包处理完毕！总计: {total_count} 个文件")
    print(f"   ⏭️ 已存在跳过: {stats['skipped']} 个")
    print(f"   ✅ 本次新生成: {stats['generated']} 个")
    if stats["failed"] > 0:
        print(f"   ❌ 失败未生成: {stats['failed']} 个（可再次运行本脚本自动补齐）")
    print("👉 现在打开或刷新游戏网页，即可体验全部 480 句真人级男声配音！")
    print("=" * 58)


if __name__ == "__main__":
    asyncio.run(main())