# 塔罗牌图 · 生成规格

由 `tools/gen_tarot_spec.py` 从牌组数据自动生成，改牌组后重跑即可同步。

## 硬规格

| 项 | 值 |
| --- | --- |
| 尺寸 | 400 × 716 px（比例 1 : 1.79） |
| 格式 | WebP（其余格式需自行转换） |
| 位置 | `public/tarot/`，文件名严格按下表 |
| 数量 | 79（22 大阿尔卡纳 + 56 小阿尔卡纳 + 1 牌背） |
| 方向 | 全部正立；倒位由代码旋转，不要生成倒置图 |

## 风格提示词（每张都带上这段后缀）

`Rider-Waite-Smith tarot card art, vertical card composition, vintage woodcut engraving, muted gold and ink palette, centered figure, ornate thin border, no text, no watermark`

## 清单

| # | 文件名 | 中文名 | English | 主体提示词 |
| --- | --- | --- | --- | --- |
| 1 | `major_00.webp` | 愚者 | The Fool | The Fool tarot card |
| 2 | `major_01.webp` | 魔术师 | The Magician | The Magician tarot card |
| 3 | `major_02.webp` | 女祭司 | The High Priestess | The High Priestess tarot card |
| 4 | `major_03.webp` | 皇后 | The Empress | The Empress tarot card |
| 5 | `major_04.webp` | 皇帝 | The Emperor | The Emperor tarot card |
| 6 | `major_05.webp` | 教皇 | The Hierophant | The Hierophant tarot card |
| 7 | `major_06.webp` | 恋人 | The Lovers | The Lovers tarot card |
| 8 | `major_07.webp` | 战车 | The Chariot | The Chariot tarot card |
| 9 | `major_08.webp` | 力量 | Strength | Strength tarot card |
| 10 | `major_09.webp` | 隐者 | The Hermit | The Hermit tarot card |
| 11 | `major_10.webp` | 命运之轮 | Wheel of Fortune | Wheel of Fortune tarot card |
| 12 | `major_11.webp` | 正义 | Justice | Justice tarot card |
| 13 | `major_12.webp` | 倒吊人 | The Hanged Man | The Hanged Man tarot card |
| 14 | `major_13.webp` | 死神 | Death | Death tarot card |
| 15 | `major_14.webp` | 节制 | Temperance | Temperance tarot card |
| 16 | `major_15.webp` | 恶魔 | The Devil | The Devil tarot card |
| 17 | `major_16.webp` | 高塔 | The Tower | The Tower tarot card |
| 18 | `major_17.webp` | 星星 | The Star | The Star tarot card |
| 19 | `major_18.webp` | 月亮 | The Moon | The Moon tarot card |
| 20 | `major_19.webp` | 太阳 | The Sun | The Sun tarot card |
| 21 | `major_20.webp` | 审判 | Judgement | Judgement tarot card |
| 22 | `major_21.webp` | 世界 | The World | The World tarot card |
| 23 | `minor_wands_01.webp` | 权杖王牌 | Ace of Wands | Ace of Wands tarot card |
| 24 | `minor_wands_02.webp` | 权杖二 | Two of Wands | Two of Wands tarot card |
| 25 | `minor_wands_03.webp` | 权杖三 | Three of Wands | Three of Wands tarot card |
| 26 | `minor_wands_04.webp` | 权杖四 | Four of Wands | Four of Wands tarot card |
| 27 | `minor_wands_05.webp` | 权杖五 | Five of Wands | Five of Wands tarot card |
| 28 | `minor_wands_06.webp` | 权杖六 | Six of Wands | Six of Wands tarot card |
| 29 | `minor_wands_07.webp` | 权杖七 | Seven of Wands | Seven of Wands tarot card |
| 30 | `minor_wands_08.webp` | 权杖八 | Eight of Wands | Eight of Wands tarot card |
| 31 | `minor_wands_09.webp` | 权杖九 | Nine of Wands | Nine of Wands tarot card |
| 32 | `minor_wands_10.webp` | 权杖十 | Ten of Wands | Ten of Wands tarot card |
| 33 | `minor_wands_11.webp` | 权杖侍从 | Page of Wands | Page of Wands tarot card |
| 34 | `minor_wands_12.webp` | 权杖骑士 | Knight of Wands | Knight of Wands tarot card |
| 35 | `minor_wands_13.webp` | 权杖王后 | Queen of Wands | Queen of Wands tarot card |
| 36 | `minor_wands_14.webp` | 权杖国王 | King of Wands | King of Wands tarot card |
| 37 | `minor_cups_01.webp` | 圣杯王牌 | Ace of Cups | Ace of Cups tarot card |
| 38 | `minor_cups_02.webp` | 圣杯二 | Two of Cups | Two of Cups tarot card |
| 39 | `minor_cups_03.webp` | 圣杯三 | Three of Cups | Three of Cups tarot card |
| 40 | `minor_cups_04.webp` | 圣杯四 | Four of Cups | Four of Cups tarot card |
| 41 | `minor_cups_05.webp` | 圣杯五 | Five of Cups | Five of Cups tarot card |
| 42 | `minor_cups_06.webp` | 圣杯六 | Six of Cups | Six of Cups tarot card |
| 43 | `minor_cups_07.webp` | 圣杯七 | Seven of Cups | Seven of Cups tarot card |
| 44 | `minor_cups_08.webp` | 圣杯八 | Eight of Cups | Eight of Cups tarot card |
| 45 | `minor_cups_09.webp` | 圣杯九 | Nine of Cups | Nine of Cups tarot card |
| 46 | `minor_cups_10.webp` | 圣杯十 | Ten of Cups | Ten of Cups tarot card |
| 47 | `minor_cups_11.webp` | 圣杯侍从 | Page of Cups | Page of Cups tarot card |
| 48 | `minor_cups_12.webp` | 圣杯骑士 | Knight of Cups | Knight of Cups tarot card |
| 49 | `minor_cups_13.webp` | 圣杯王后 | Queen of Cups | Queen of Cups tarot card |
| 50 | `minor_cups_14.webp` | 圣杯国王 | King of Cups | King of Cups tarot card |
| 51 | `minor_swords_01.webp` | 宝剑王牌 | Ace of Swords | Ace of Swords tarot card |
| 52 | `minor_swords_02.webp` | 宝剑二 | Two of Swords | Two of Swords tarot card |
| 53 | `minor_swords_03.webp` | 宝剑三 | Three of Swords | Three of Swords tarot card |
| 54 | `minor_swords_04.webp` | 宝剑四 | Four of Swords | Four of Swords tarot card |
| 55 | `minor_swords_05.webp` | 宝剑五 | Five of Swords | Five of Swords tarot card |
| 56 | `minor_swords_06.webp` | 宝剑六 | Six of Swords | Six of Swords tarot card |
| 57 | `minor_swords_07.webp` | 宝剑七 | Seven of Swords | Seven of Swords tarot card |
| 58 | `minor_swords_08.webp` | 宝剑八 | Eight of Swords | Eight of Swords tarot card |
| 59 | `minor_swords_09.webp` | 宝剑九 | Nine of Swords | Nine of Swords tarot card |
| 60 | `minor_swords_10.webp` | 宝剑十 | Ten of Swords | Ten of Swords tarot card |
| 61 | `minor_swords_11.webp` | 宝剑侍从 | Page of Swords | Page of Swords tarot card |
| 62 | `minor_swords_12.webp` | 宝剑骑士 | Knight of Swords | Knight of Swords tarot card |
| 63 | `minor_swords_13.webp` | 宝剑王后 | Queen of Swords | Queen of Swords tarot card |
| 64 | `minor_swords_14.webp` | 宝剑国王 | King of Swords | King of Swords tarot card |
| 65 | `minor_pentacles_01.webp` | 星币王牌 | Ace of Pentacles | Ace of Pentacles tarot card |
| 66 | `minor_pentacles_02.webp` | 星币二 | Two of Pentacles | Two of Pentacles tarot card |
| 67 | `minor_pentacles_03.webp` | 星币三 | Three of Pentacles | Three of Pentacles tarot card |
| 68 | `minor_pentacles_04.webp` | 星币四 | Four of Pentacles | Four of Pentacles tarot card |
| 69 | `minor_pentacles_05.webp` | 星币五 | Five of Pentacles | Five of Pentacles tarot card |
| 70 | `minor_pentacles_06.webp` | 星币六 | Six of Pentacles | Six of Pentacles tarot card |
| 71 | `minor_pentacles_07.webp` | 星币七 | Seven of Pentacles | Seven of Pentacles tarot card |
| 72 | `minor_pentacles_08.webp` | 星币八 | Eight of Pentacles | Eight of Pentacles tarot card |
| 73 | `minor_pentacles_09.webp` | 星币九 | Nine of Pentacles | Nine of Pentacles tarot card |
| 74 | `minor_pentacles_10.webp` | 星币十 | Ten of Pentacles | Ten of Pentacles tarot card |
| 75 | `minor_pentacles_11.webp` | 星币侍从 | Page of Pentacles | Page of Pentacles tarot card |
| 76 | `minor_pentacles_12.webp` | 星币骑士 | Knight of Pentacles | Knight of Pentacles tarot card |
| 77 | `minor_pentacles_13.webp` | 星币王后 | Queen of Pentacles | Queen of Pentacles tarot card |
| 78 | `minor_pentacles_14.webp` | 星币国王 | King of Pentacles | King of Pentacles tarot card |
| 79 | `back.webp` | 牌背 | Card Back | Card Back tarot card |
