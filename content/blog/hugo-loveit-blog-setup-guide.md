+++
date = '2026-07-02T11:17:03+08:00'
draft = false
title = '从零搭建 Hugo + LoveIt 博客并部署到 GitHub Pages'
categories = ['Blog']
tags = ['Hugo', 'GitHub Pages', 'LoveIt']
+++

记录从零开始用 Hugo + LoveIt 主题搭建个人技术博客，并自动部署到 GitHub Pages 的完整过程。

<!--more-->

## 环境准备

### Hugo 安装（Windows）

下载 Hugo extended 版本（必须带 `extended`，否则图片处理、公式渲染会异常）：

- 从 [GitHub Releases](https://github.com/gohugoio/hugo/releases) 下载 `hugo_extended_0.163.3_windows-amd64.zip`
- 解压 `hugo.exe` 到固定目录，如 `C:\Users\ethan.wang18\Desktop\wangcefile\hugo\`

将 Hugo 所在目录加入系统环境变量 `Path`，关闭所有终端后重新打开，验证：

```powershell
hugo version
```

正常输出 `hugo v0.163.3-xxx+extended windows/amd64` 即安装成功。

### 新建站点

```powershell
cd C:\Users\ethan.wang18\Desktop
hugo new site my-blog
cd my-blog
```

### 安装 LoveIt 主题

国内网络环境建议使用加速代理克隆：

```powershell
git clone https://mirror.ghproxy.com/https://github.com/dillonzq/LoveIt themes/LoveIt
```

> 务必确保文件夹名称为 `LoveIt`（大小写敏感），后续 `hugo.toml` 中配置 `theme = "LoveIt"` 必须与此一致。

## 核心配置 hugo.toml

### 语法注意事项

- TOML 中同一区块 `[params]` 只能出现一次，重复会导致解析失败
- Hugo v0.158+ 废弃 `languageCode`，改用 `[site].locale`
- 修改配置后本地服务自动重载，无需重启

### 完整配置

```toml
baseURL = "https://WUDIBANFAN.github.io/"
title = "WangCe's Tech Notes"
theme = "LoveIt"

[site]
locale = "en"

[params]
  readingTime = true
  wordCount = true
  copyright = "2026 WangCe All Rights Reserved"

[params.author]
  name = "WUDIBANFAN"
  github = "https://github.com/WUDIBANFAN"

[[menu.main]]
name = "Home"
url = "/"
weight = 1

[[menu.main]]
name = "Blog"
url = "/blog/"
weight = 2

[[menu.main]]
name = "Tags"
url = "/tags/"
weight = 3

[[menu.main]]
name = "Categories"
url = "/categories/"
weight = 4

[[menu.main]]
name = "Search"
url = "/search/"
weight = 5
```

## 自定义首页

创建 `content/_index.md` 控制首页展示内容。需注意：主题默认占位文字 "This is my cool site" 并不在此文件中，排查路径详见下一节。

```markdown
---
title: "Welcome to My Tech Notes"
date: 2026-07-02
draft: false
---
# Hello World
This is my personal technical blog.
```

### 去除 "This is my cool site" 占位文字

该文字是主题模板内置的默认值，修改方式：

1. 在项目根目录新建 `layouts` 文件夹
2. 复制 `themes/LoveIt/layouts/index.html` 到 `layouts/index.html`
3. 打开复制后的文件，全局搜索 `This is my cool site`，删除对应代码行即可

## 一、本地预览验证

在博客根目录下启动本地服务：

```powershell
cd C:\Users\ethan.wang18\Desktop\my-blog
hugo server -D
```

浏览器打开 `http://localhost:1313`，确认以下两处修改生效：

- 页面左上角标题显示：**WangCe's Tech Notes**
- 页面底部版权信息：**2026 WangCe**

> `-D` 参数会包含草稿文章（`draft: true`），按 `Ctrl + C` 停止服务。

确认无误后，继续下一步推送仓库。

## 二、绑定 GitHub 仓库，上传博客全部源码

在 `C:\Users\ethan.wang18\Desktop\my-blog` 目录下，依次执行以下命令：

```powershell
# 初始化 Git 仓库（仅首次运行）
git init

# 关联远端 WUDIBANFAN.github.io 仓库
git remote add origin https://github.com/WUDIBANFAN/WUDIBANFAN.github.io.git

# 创建 main 主分支
git checkout -b main

# 打包所有文件
git add .

# 提交更新记录
git commit -m "Complete blog config, rename copyright to WangCe"

# 推送到 GitHub 远端仓库
git push origin main
```

推送完成后，打开浏览器访问仓库页面 `https://github.com/WUDIBANFAN/WUDIBANFAN.github.io`，刷新确认所有博客文件已上传成功。

### Git 指令含义详解

| 指令 | 作用 |
|------|------|
| `git init` | 在当前文件夹初始化本地 Git 仓库，生成隐藏的 `.git` 目录，用于追踪所有文件的修改历史与版本记录，是一切 Git 操作的基础 |
| `git remote add origin <URL>` | 给本地仓库绑定远端 GitHub 仓库地址，`origin` 是远端仓库的默认别名（可理解为仓库地址的快捷方式），后续推送、拉取都用 `origin` 指代这个地址 |
| `git checkout -b main` | 创建并切换到名为 `main` 的主分支，与 GitHub 默认主分支名保持一致，避免因分支名不匹配导致部署失败 |
| `git add .` | 将当前目录下所有新增、修改过的文件加入「暂存区」，`.` 代表全部文件，只有加入暂存区的文件才会被纳入版本记录 |
| `git commit -m "..."` | 将暂存区的文件正式提交到本地仓库，生成一条永久版本记录。引号内是提交说明，方便后续回溯历史 |
| `git push origin main` | 把本地 `main` 分支的所有版本记录推送到远端 `origin` 仓库的 `main` 分支，执行后本地所有源码、配置、文章即完整同步到 GitHub |

## 三、配置 GitHub Actions 自动部署

推送代码后 GitHub 会自动构建静态网站并发布，后续只需 `git push` 即可更新网站。

### 3.1 创建自动化配置文件

在项目根目录新建 `.github/workflows` 文件夹：

```powershell
mkdir -p .github/workflows
```

新建文件 `.github/workflows/deploy.yml`，粘贴以下完整代码：

```yaml
name: Build & Deploy Hugo Blog
on:
  push:
    branches: [ main ]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: "0.163.3"
    steps:
      - name: Checkout code
        uses: actions/checkout@v6
        with:
          submodules: recursive
          fetch-depth: 0
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: ${{ env.HUGO_VERSION }}
          extended: true
      - name: Build static site
        run: hugo --gc --minify
      - name: Upload pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: ./public
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 3.2 推送自动化配置到 GitHub

```powershell
git add .github/workflows/deploy.yml
git commit -m "Add auto deploy workflow for GitHub Pages"
git push origin main
```

## 四、GitHub 后台开启 Pages 自动发布

1. 打开仓库页面 `https://github.com/WUDIBANFAN/WUDIBANFAN.github.io`
2. 点击顶部 **Settings** 标签
3. 左侧菜单栏找到 **Pages**
4. **Source** 选项选择 **GitHub Actions**，保存设置

等待约 2 分钟自动构建完成，外网访问地址：

```
https://WUDIBANFAN.github.io
```

至此，首次搭建全部完成。后续日常只需写文章 + `git push` 即可自动更新。

---

## 五、后续日常写笔记流程

打开一个新的 PowerShell 窗口（不要占用 `hugo server` 的窗口），依次执行：

### Step 1：新建文章

```powershell
cd C:\Users\ethan.wang18\Desktop\my-blog

# 使用完整 Hugo 路径（最稳定）
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe new blog/Your-Article-Title.md
```

文件自动生成在 `content/blog/` 目录下。文件名会成为文章 URL 的一部分，建议用英文 + 连字符。

### Step 2：编辑文章

打开生成的 `.md` 文件，编辑 Front Matter：

```toml
+++
date = '2026-07-02T11:17:03+08:00'
draft = true            # ← 写完内容后改为 false
title = '文章标题'
categories = ['Blog']   # 手动添加分类
tags = ['Tag1', 'Tag2'] # 手动添加标签
+++

这里开始写 Markdown 正文...
```

| 字段 | 含义 |
|------|------|
| `title` | 文章标题（支持中文） |
| `draft` | `true` = 草稿，本地可见但外网隐藏；发布上线需改为 `false` |
| `categories` | 文章分类，手动添加 |
| `tags` | 文章标签，手动添加 |

写完后用 Markdown 语法撰写正文。保存后在浏览器访问 `http://localhost:1313` 预览效果（需确保 `hugo server -D` 正在运行）。

### Step 3：发布上线

确认文章无误后，**将 `draft: true` 改为 `draft: false`**，然后推送：

```powershell
git add .
git commit -m "New post: 文章标题"
git push origin main
```

> 如果 `git push` 报网络错误（`Could not connect to server`），先配置代理再重试：
> ```powershell
> git config --local http.proxy http://127.0.0.1:7890
> git config --local https.proxy http://127.0.0.1:7890
> git push origin main
> ```

推送后等待 **1-3 分钟**，网站自动同步新笔记。

### Step 4：验证上线

1. 打开 `https://github.com/WUDIBANFAN/WUDIBANFAN.github.io`
2. 点击 **Actions** 标签，确认 `Build & Deploy Hugo Blog` 工作流绿色通过
3. 访问 `https://wudibanfan.github.io` 确认新文章已上线

> **注意**：如果 Actions 已跑完但网页显示的还是旧版本（比如代码块折叠没展开、样式不对等），很可能是浏览器缓存了旧的 CSS/JS 文件。使用 `Ctrl + F5` 强制刷新（跳过缓存），通常能解决问题。移动端浏览器可以在设置中清除缓存后重新打开。

---

## 六、迁移到另一台电脑

核心结论：**项目本身的所有配置文件完全不需要修改。** 博客源码、主题、文章、部署脚本都和设备无关，新电脑只需装好运行环境，拉取仓库即可直接使用。

### 无需修改的项目内容

以下内容都已提交到 GitHub 仓库，克隆下来直接复用：

- `hugo.toml` - 全站配置（标题、菜单、版权、语言等）
- `themes/LoveIt/` - 主题文件（已提交进仓库，无需重新下载）
- `content/` - 所有文章、首页内容
- `.github/workflows/deploy.yml` - 自动部署脚本
- 所有静态资源、自定义模板

### 新电脑仅需准备

新电脑不需要修改任何项目内文件，只需安装两款基础工具：

1. **Git** - 用于拉取、推送仓库代码，需配置好 GitHub 账号认证（Token 或 SSH 密钥）
2. **Hugo Extended** - 建议与当前版本保持一致（v0.163.3 extended），避免版本差异导致构建异常

### 完整迁移步骤

在新电脑上打开 PowerShell：

```powershell
# 克隆 GitHub 仓库到本地
git clone https://github.com/WUDIBANFAN/WUDIBANFAN.github.io.git

# 进入项目文件夹
cd WUDIBANFAN.github.io

# 启动本地预览，和原电脑效果完全一致
hugo server -D
```

修改完文章后，照常执行 `git add` → `git commit` → `git push origin main` 即可同步到外网，操作和原电脑完全一致。

### 可选微调项

- 如果新电脑 Hugo 版本差异较大，可能出现少量语法废弃警告，一般不影响构建，尽量保持大版本一致即可
- 如果新电脑需要推送代码，需配置 Git 全局用户名和邮箱（属于 Git 全局环境配置，不修改博客项目的任何文件）：
  ```powershell
  git config --global user.name "WUDIBANFAN"
  git config --global user.email "your-email@example.com"
  ```

---

以上是从环境搭建、配置修改、本地验证、GitHub 仓库绑定、自动部署配置、日常写笔记推送上线到跨电脑迁移的完整流程。后续计划加入评论系统、CDN 加速等功能，持续更新。
