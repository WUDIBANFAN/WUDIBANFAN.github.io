+++
date = '2026-07-01T18:00:00+08:00'
draft = false
title = '博客写作与发布全流程记录'
categories = ['Blog']
tags = ['Blog', 'Hugo', 'GitHub']
+++

这份笔记记录我从创建文章、插入图片/链接、推送到 GitHub、以及换电脑后如何继续写作的完整流程。

<!--more-->

## 一、新建一篇文章

### 1.1 用 Hugo 命令创建（推荐）

打开 PowerShell，进入博客目录：

```powershell
cd C:\Users\ethan.wang18\Desktop\my-blog
```

用 Hugo 命令新建文章：

```powershell
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe new blog/your-article-name.md
```

文件名建议用英文 + 连字符，因为文件名会成为 URL 的一部分。比如：

```powershell
# 好的命名
hugo new blog/docker-usage-guide.md
hugo new blog/python-logging-best-practices.md

# 不好的命名
hugo new blog/笔记123.md
hugo new blog/文章.md
```

生成的文件在 `content/blog/` 目录下，用 VSCode 或任意编辑器打开即可编辑。

### 1.2 手动创建

也可以直接在 `content/blog/` 目录下新建 `.md` 文件，手动写 Front Matter。

## 二、文章 Front Matter（元信息）

每篇文章开头都要有一段 `+++` 包裹的 TOML 元信息，这是我当前用到的完整模板：

```toml
+++
date = '2026-07-01T18:00:00+08:00'
draft = false
title = '文章标题'
categories = ['分类名']
tags = ['标签1', '标签2', '标签3']
+++

这里开始是文章正文……
```

### 各字段说明

| 字段 | 说明 | 示例 |
|------|------|------|
| `date` | 发布日期时间 | `'2026-07-03T18:00:00+08:00'` |
| `draft` | `true`=草稿（不发布），`false`=发布 | 写完确认后改为 `false` |
| `title` | 文章标题，支持中文 | `'Pytest 从入门到企业实战'` |
| `categories` | 分类，决定文章出现在哪个分类页 | `['Blog']` |
| `tags` | 标签，多个标签用逗号分隔 | `['Hugo', 'Markdown', '教程']` |

### 当前已有的分类

| 分类 | 说明 |
|------|------|
| `Blog` | 博客搭建、写作相关 |
| `Hyperparameters Tuning` | 模型训练调优 |
| `Dev Tools` | 工程开发工具 |
| `LLM Fine-tuning` | 大模型微调框架 |

如果现有分类都不合适，直接在 `categories` 里写一个新的分类名，Hugo 会自动生成对应的分类页面。

### 关于 Summary（卡片摘要）

文章正文在 `<!--more-->` 之前的内容会作为博客列表页的卡片摘要显示。如果没有 `<!--more-->`，Hugo 会自动取前 70 个词作为摘要。建议每篇文章都手动加一个摘要分割标记：

```markdown
这是摘要内容，会显示在博客列表的卡片中。

<!--more-->

这里是正文剩余部分，点击"Read more"后才能看到。
```

## 三、Markdown 写作规范

### 3.1 标题层级

```markdown
## 二级标题（文章中最大的标题）
### 三级标题
#### 四级标题
```

> 注意：不要用 `# 一级标题`，因为在 LoveIt 主题中文章标题已由 Front Matter 的 `title` 渲染，正文中再用 `#` 会重复。

### 3.2 文字样式

```markdown
**加粗文字**
*斜体文字*
`行内代码`
> 引用块
```

### 3.3 列表

```markdown
- 无序列表项 1
- 无序列表项 2

1. 有序列表项 1
2. 有序列表项 2
```

### 3.4 代码块

``````markdown
```python
def hello():
    print("Hello, World!")
```

```bash
pip install ms-swift -U
```

```json
{
    "name": "example",
    "version": "1.0.0"
}
```
``````

### 3.5 表格

```markdown
| 列1 | 列2 | 列3 |
|------|------|------|
| 内容 | 内容 | 内容 |
| 内容 | 内容 | 内容 |
```

### 3.6 插入链接

```markdown
[链接文字](https://example.com)

# 外部链接在新窗口打开
[GitHub](https://github.com)

# 引用内部文章
[我的另一篇笔记](/blog/slurm-usage-guide/)
```

### 3.7 插入图片

**第一步**：把图片文件放到 `static/images/` 目录下。

比如把截图保存为 `static/images/example-screenshot.png`。

**第二步**：在文章中这样引用：

```markdown
![图片描述](/images/example-screenshot.png)
```

图片引用路径相对于 `static/` 目录。`static/images/example.png` 对应引用路径 `/images/example.png`。

完整例子：

```markdown
## 配置界面

以下是 Claude Code 插件的配置截图：

![Claude Code 配置界面](/images/claude-code-config.png)

配置完成后点击保存即可生效。
```

> **图片命名**：建议用英文 + 连字符命名，清晰描述图片内容，如 `hyper-tuning-1.png`、`warmup-cosine.png`。

> **图片居中与标题**：使用 LoveIt 主题的 `{{< image >}}` shortcode 替代标准 Markdown 图片语法，可自动居中并带标题：
>
> ```markdown
> {{< image src="/images/example.png" alt="图片描述" caption="图：图片标题说明" >}}
> ```
>
> `src` 为图片路径（相对于 `static/`），`alt` 为无障碍替代文本，`caption` 为图片下方显示的标题。

### 3.8 分割线

```markdown
---
```

## 四、本地预览

写完文章后，启动本地预览服务检查效果：

```powershell
cd C:\Users\ethan.wang18\Desktop\my-blog
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe server -D
```

浏览器打开 `http://localhost:1313`，可以看到包括草稿在内的全部文章。修改 `.md` 文件保存后浏览器会自动刷新。

> 注意：有时可能会因为浏览器缓存问题导致本地加载后浏览器内容更新不及时（尤其是图片类文件），多按几次ctrl+shift+r即可。

确认一切无误后，**把文章头部的 `draft: true` 改为 `draft: false`**。

## 五、推送到 GitHub

### 5.1 配置代理（公司网络需要）

```powershell
git config --local http.proxy http://proxy.nevint.com:8080
git config --local https.proxy http://proxy.nevint.com:8080
```

### 5.2 提交并推送

```powershell
cd C:\Users\ethan.wang18\Desktop\my-blog

# 查看有哪些改动
git status

# 添加所有改动
git add .

# 提交（写清楚做了什么）
git commit -m "New post: 文章标题"

# 推送到 GitHub
git push origin main
```

### 5.3 触发 Actions 部署

推送到 GitHub 后，进入 [Actions 页面](https://github.com/WUDIBANFAN/WUDIBANFAN.github.io/actions)：

1. 左侧点 **Build & Deploy Hugo Blog**
2. 右侧点 **Run workflow** → 选择 main 分支 → 点绿色按钮
3. 等待黄色圆圈变绿色对勾
4. 1-2 分钟后访问 `https://wudibanfan.github.io` 看效果

> 有时 Actions 跑完了但网页显示旧版本，按 `Ctrl + F5` 强制刷新浏览器缓存即可。

## 六、换电脑后继续写作

### 6.1 新电脑环境准备

只需要两样东西：

- **Git**：用于拉取、推送仓库代码
- **Hugo Extended**：与当前版本保持一致（v0.163.3 extended）

Hugo 下载地址：https://github.com/gohugoio/hugo/releases

### 6.2 配置 Git 身份

```bash
git config --global user.name "WUDIBANFAN"
git config --global user.email "your-email@example.com"
```

### 6.3 克隆博客仓库

```bash
# 克隆到本地
git clone https://github.com/WUDIBANFAN/WUDIBANFAN.github.io.git

# 进入目录
cd WUDIBANFAN.github.io
```

仓库里已经包含了所有文章、主题、配置、Workflow，不需要额外下载或配置任何东西。

### 6.4 本地预览

```bash
# 在新电脑上启动 Hugo（需要先下载 Hugo 并放对位置）
hugo server -D
```

浏览器打开 `http://localhost:1313` 即可看到与原来电脑完全一致的博客。

### 6.5 新电脑上写文章并发布

```bash
# 1. 拉取最新代码（先同步别人或自己之前在其他设备上的改动）
git pull origin main

# 2. 新建文章
hugo new blog/your-new-article.md

# 3. 编辑文章...

# 4. 提交并推送
git add .
git commit -m "New post: 文章标题"
git push origin main
```

### 6.6 多设备协作注意事项

如果两台设备都写文章，操作顺序很重要：

```bash
# 每次开始写之前，先拉取远端最新代码
git pull origin main

# 写文章、提交
git add .
git commit -m "xxx"

# 推送
git push origin main
```

如果两台设备同时改了同一个文件再推送，Git 会报冲突。这种情况在单个人写博客的场景下很少发生（除非真的是两台设备同时改了同一篇文章），万一遇到冲突，优先保留内容更全的版本即可。

## 七、日常工作流速查

```bash
# 每次打开博客目录后的完整流程

cd C:\Users\ethan.wang18\Desktop\my-blog

# 1. 拉取最新（如果有其他设备更新过）
git pull origin main

# 2. 新建文章（如果需要）
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe new blog/文章名.md

# 3. 启动预览（如果需要边写边看效果）
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe server -D

# 4. 确认完成后，改 draft: true → draft: false

# 5. 配代理（公司网络）
git config --local http.proxy http://proxy.nevint.com:8080
git config --local https.proxy http://proxy.nevint.com:8080

# 6. 推送到 GitHub
git add .
git commit -m "New post: 文章标题"
git push origin main

# 7. 去 Actions 手动触发构建
# https://github.com/WUDIBANFAN/WUDIBANFAN.github.io/actions
```

## 八、目录结构速查

```
my-blog/
├── content/blog/          ← 所有文章放在这里
│   ├── _index.md          ← Blog 页面配置
│   ├── xxx.md             ← 文章文件
│   └── yyy.md
├── static/images/         ← 所有图片放在这里
│   └── example.png
├── assets/css/_custom.scss ← 自定义 CSS 样式
├── layouts/section.html   ← Blog 列表页模板
├── hugo.toml              ← 全站配置文件
└── .github/workflows/deploy.yml ← 自动部署脚本
```
