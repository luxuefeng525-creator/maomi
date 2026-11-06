# 第三方来源与许可

本仓库部分技能在结构与措辞上参考、改编自下列开源项目。正文已重写为中文并做了取舍，但凡有实质借用，按原项目许可在此署名。

## Matt Pocock — `skills`

- 仓库：https://github.com/mattpocock/skills （包名 `mattpocock-skills`，v1.3.2）
- 许可：**MIT**，Copyright (c) 2026 Matt Pocock
- 关联技能：

| 本仓库技能 | 上游文件 | 借用程度 |
|---|---|---|
| `skills/grilling` | `skills/productivity/grilling/SKILL.md` | **改编**：核心方法与部分英文原文保留 |
| `skills/diagnose` | `skills/engineering/diagnosing-bugs/SKILL.md` | **改编**：诊断环的阶段划分与埋点/接缝措辞沿用 |
| `skills/tdd` | `skills/engineering/tdd/SKILL.md` | 参考改写：红绿垂直切片、反模式分类 |
| `skills/to-spec` | `skills/engineering/to-spec/SKILL.md` | 参考改写：综合而非再访谈、seam 定稿即合约 |
| `skills/to-tickets` | `skills/engineering/to-tickets/SKILL.md` | 参考改写：曳光弹工单、前置边、扩张—收缩 |
| `skills/domain-modeling` | `skills/engineering/domain-modeling/SKILL.md` | 参考改写：深模块、信息隐藏 |
| `skills/research` | `skills/engineering/research/SKILL.md` | 参考改写：来源分级、只用高等级来源下结论 |
| `skills/handoff` | `skills/productivity/handoff/SKILL.md` | 参考改写：交接单字段、引用而非复制 |
| `skills/grill-me` | 同上（`grilling` 别名） | 别名封装 |

### MIT 许可全文

```
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 未包含的第三方技能

`docx` / `pdf` / `pptx` / `xlsx` 等带专有许可的技能**未引入**本仓库，故不在署名范围内。若日后引入，需单独记录其许可条款。

## 说明

署名范围以**实际文本比对**为依据（与上游 SKILL.md 做 40 字符片段重叠检测），未与上游有实质重叠的技能不列入。若后续再改编上游内容，请同步更新本文件。
