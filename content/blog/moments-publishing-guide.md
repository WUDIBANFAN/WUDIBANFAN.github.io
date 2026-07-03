+++
date = '2026-07-01T20:00:00+08:00'
draft = false
title = 'Moments 图文发布设计'
categories = ['Blog']
tags = ['Blog', 'Hugo', 'Moments']
+++

记录在 Moments 栏目中创建一篇图文笔记的完整流程，包含 Front Matter 字段、封面图放置、本地预览与发布。

<!--more-->

## 一、Moments 栏目简介

Moments 是一个轻量级日常记录栏目，采用双列网格（小红书风格）展示。每条 Moment 包含封面图、日期、地点和简短文字，适合记录生活中的碎片片段，与 Blog 的技术长文互补。

## 二、Front Matter 字段一览

Moments 文章使用以下专属 Front Matter 字段：

| 字段            | 必填 | 说明                   | 示例                          |
| ------------- | -- | -------------------- | --------------------------- |
| `title`       | 是  | 短文标题                 | `"新键盘到了"`                   |
| `date`        | 是  | 发布日期                 | `"2026-07-03"`              |
| `location`    | 否  | 记录地点                 | `"实验室"`                     |
| `cover`       | 否  | 封面图路径（相对于 `static/`） | `"/img/moments/coffee.jpg"` |
| `description` | 否  | 正文摘要，卡片底部展示          | `"下午三点，冲了杯咖啡..."`           |

> 与 Blog 文章不同，Moments **不需要** `categories`、`tags`、`draft` 字段。全部 Moment 统一归属 Moments 栏目。

## 三、创建一篇 Moment

### 3.1 创建 md 文件

在 `content/moments/` 目录下新建一个 `.md` 文件，文件名用英文 + 连字符命名（会成为 URL 的一部分）：

```
content/moments/
├── _index.md              ← 栏目首页配置（不要动）
├── afternoon-coffee.md    ← 你的新 Moment
├── weekend-hiking.md
└── night-coding.md
```

### 3.2 编写 Front Matter 与正文

完整模板如下：

```toml
+++
title = "午后咖啡与论文"
date = "2026-07-03"
location = "实验室"
cover = "/img/moments/coffee-lab.jpg"
description = "下午三点，冲了一杯手冲咖啡，继续啃 MMDetection 源码。阳光透过窗户洒在桌上，感觉今天能搞定那个 bug。"
+++
```

字段逐一说明：

- **title**：卡片虽不直接显示标题，但会用于浏览器标签页和 SEO。
- **date**：显示在卡片信息行的日期，格式 `YYYY-MM-DD`。
- **location**：显示在日期后面，用 `·` 分隔。不填则不显示。
- **cover**：封面大图路径。图片需先放入 `static/img/moments/`，引用路径为 `/img/moments/文件名.jpg`。不填则显示灰色占位图。
- **description**：卡片底部的正文摘要，限制 120 字内，超出自动截断。

### 3.3 不需要正文内容

与 Blog 文章不同，Moments 不需要在 `<!--more-->` 后写长文正文。`description` 即是全部展示内容。如果写了正文，详情页也会渲染出来，但列表卡片只显示 `description`。

### 3.4 完整示例

```markdown
+++
title = "雨后散步"
date = "2026-07-04"
location = "校园小径"
cover = "/img/moments/rain-walk.jpg"
description = "下了场小雨，空气里有泥土的味道。路过操场时看到彩虹，停下拍了一张。"
+++
```

保存文件后启动预览即可在 Moments 页面看到新卡片。

## 四、添加封面图

### 4.1 图片存放位置

所有 Moments 封面图统一放在：

```
static/img/moments/
```

### 4.2 图片命名建议

用英文 + 连字符，尽量描述图片内容：

```
# 好的命名
coffee-lab.jpg
rain-walk.jpg
hiking-trail.jpg

# 避免的命名
IMG_20260703_153021.jpg
微信图片_20260703.jpg
```

### 4.3 图片尺寸建议

封面图在卡片中按 `4:3` 比例裁剪展示，建议上传前统一处理为 `800x600` 或 `1200x900` 像素，避免图片过大导致页面加载慢。

## 五、本地预览

```powershell
cd C:\Users\ethan.wang18\Desktop\my-blog
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe server -D
```

浏览器打开 `http://localhost:1313/moments/` 即可看到 Moments 双列网格页面。

## 六、发布推送

确认效果无误后，按常规流程提交推送：

```powershell
cd C:\Users\ethan.wang18\Desktop\my-blog

# 查看改动
git status

# 暂存所有改动（md 文件 + 图片）
git add .

# 提交
git commit -m "Moments: 午后咖啡与论文"

# 推送
git push origin main
```

推送后去 [Actions 页面](https://github.com/WUDIBANFAN/WUDIBANFAN.github.io/actions) 手动触发部署，等待构建完成即可。

## 七、Moments vs Blog 对比速查

| 对比项          | Blog                                       | Moments                                         |
| ------------ | ------------------------------------------ | ----------------------------------------------- |
| 目录           | `content/blog/`                            | `content/moments/`                              |
| 用途           | 技术长文、教程、复盘                                 | 日常碎碎念、生活片段                                      |
| Front Matter | `title` `date` `categories` `tags` `draft` | `title` `date` `location` `cover` `description` |
| 封面图          | 不展示                                        | 顶部大图（4:3 比例）                                    |
| 正文           | 需要写正文，用 `<!--more-->` 分割摘要                 | `description` 即全文，可选写正文                         |
| 列表布局         | 单列卡片列表                                     | 双列网格（小红书风格）                                     |
| 分类归属         | 按 `categories` 分类                          | 统一归 Moments 栏目                                  |
| 图片存放         | `static/images/`                           | `static/img/moments/`                           |

