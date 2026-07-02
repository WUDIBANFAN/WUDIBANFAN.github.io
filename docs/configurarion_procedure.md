# Hugo LoveIt 博客搭建完整配置笔记 README
## 项目基础信息
- Hugo 版本：v0.163.3 extended（Windows amd64 扩展版，必须带 extended，支持图片/LaTeX渲染）
- 主题：LoveIt（文件夹名严格为 `LoveIt`，大小写敏感，不可写成 Lovelt）
- 本地目录：`C:\Users\ethan.wang18\Desktop\my-blog`
- Hugo程序路径：`C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe`
- GitHub Pages 地址：`https://WUDIBANFAN.github.io/`
- 站点名称：WangCe's Tech Notes
- 语言配置：英文 en

---
## 一、Hugo 安装与环境配置（Windows）
### 1. 下载对应安装包
打开发布资产页，点击【显示全部38个资产】，下载：
`hugo_extended_0.163.3_windows-amd64.zip`
⚠️ 必须带 `extended`，普通版缺失图片处理、公式渲染功能，博客会样式异常。

### 2. 文件存放规范
解压 `hugo.exe` 至目录：`C:\Users\ethan.wang18\Desktop\wangcefile\hugo\`
禁止嵌套多层文件夹，保证路径下直接存在 `hugo.exe`。

### 3. 环境变量PATH配置（解决`hugo`命令无法识别）
1. 快捷键 `Win + R`，输入 `sysdm.cpl` 回车，打开「系统属性」
2. 切换【高级】标签 → 右下角【环境变量】
3. 在**系统变量(S)**区域找到 `Path`，点击【编辑】
4. 新建条目，填入路径：
`C:\Users\ethan.wang18\Desktop\wangcefile\hugo`
5. 所有弹窗全部点击确定保存，**完全关闭所有PowerShell再重新打开终端**。

### 4. 命令校验方式
#### 全局命令（PATH配置成功后）
```powershell
hugo version
```
#### 全局PATH失效时，使用完整路径执行（应急永久可用）
```powershell
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe version
```
成功输出版本号 `hugo v0.163.3-xxx+extended windows/amd64` 即安装完成。

### 常见报错说明
1. `无法将“hugo”项识别为 cmdlet`：PATH未配置/终端未重启/路径填写错误
2. 双击`hugo.exe`弹出提示：Hugo是命令行工具，**禁止双击打开**，必须在PowerShell执行命令。

---
## 二、初始化博客项目 & 安装LoveIt主题
### 1. 新建博客站点
```powershell
# 切换到桌面目录
cd C:\Users\ethan.wang18\Desktop
# 创建博客项目文件夹 my-blog
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe new site my-blog
# 进入博客根目录
cd my-blog
```

### 2. 下载LoveIt主题（Github直连超时解决方案）
#### 方案A：国内加速git克隆（推荐）
```powershell
git clone https://mirror.ghproxy.com/https://github.com/dillonzq/LoveIt themes/LoveIt
```
#### 方案B：手动下载压缩包（无git环境使用）
1. 加速下载地址：`https://mirror.ghproxy.com/https://github.com/dillonzq/LoveIt/archive/refs/heads/master.zip`
2. 解压压缩包，将文件夹重命名为 `LoveIt`
3. 放入目录：`my-blog/themes/LoveIt/`
⚠️ 目录层级要求：`themes/LoveIt` 内直接包含 `archetypes/assets/layouts` 等文件夹，不可二次嵌套。

### 3. 主题加载报错处理
报错：`module "Lovelt" not found`
- 原因：配置内主题名和文件夹名拼写不一致（大小写/字母错误）
- 修复：`hugo.toml` 内配置 `theme = "LoveIt"`，和文件夹名严格匹配。

---
## 三、核心配置文件 `hugo.toml` 完整标准模板
### 语法避坑规则
1. TOML 同一区块 `[params]` 只能出现**一次**，重复写会报 `table params already exists` 配置解析失败；
2. Hugo v0.158+ 废弃 `languageCode`，改用 `[site].locale` 消除WARN警告；
3. 所有配置修改保存后，本地服务自动重载页面，无需重启命令。

### 完整可用配置（直接覆盖原文件全部内容）
```toml
# 外网部署根域名（GitHub Pages地址）
baseURL = "https://WUDIBANFAN.github.io/"
# 站点全局标题（页面左上角导航栏文字）
title = "WangCe's Tech Notes"
# 绑定主题文件夹名称，必须和themes内文件夹名完全一致
theme = "LoveIt"

# 新版Hugo语言配置，替代废弃的languageCode
[site]
locale = "en"

# 全局页面参数
[params]
  # 开启文章阅读时长统计
  readingTime = true
  # 开启文章字数统计
  wordCount = true
  # 网站底部版权信息
  copyright = "2026 WANGCE All Rights Reserved"

# 作者信息（侧边栏展示Github、昵称）
[params.author]
  name = "WANGCE"
  github = "https://github.com/WUDIBANFAN"

# 顶部导航菜单栏配置，weight控制排序数字越小越靠前
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

### 配置修改对应效果对照表
| 修改项 | 作用位置 |
| ---- | ---- |
| `title = "WangCe's Tech Notes"` | 浏览器标签、页面左上角站点标题（解决My cool site） |
| `copyright = "2026 WANGCE All Rights Reserved"` | 页面最底部版权文字 |
| `[site].locale = "en"` | 全站UI系统文字切换英文，消除languageCode废弃警告 |
| `theme = "LoveIt"` | 加载主题，拼写错误会直接启动失败 |
| `[params.author]` | 侧边栏展示作者昵称、Github跳转链接 |

---
## 四、首页自定义 `content/_index.md`
### 文件作用
控制首页中间大标题、首页介绍正文内容，**不包含占位文字 This is my cool site**。
### 标准模板内容
```markdown
---
title: "Welcome to My Tech Notes"
date: 2026-07-02
draft: false
---
# Hello World
This is my personal technical blog, storing study notes about AI, vehicle engineering, programming and cloud operations.

All notes are written in Markdown, auto deployed to GitHub Pages.
```
### 页面占位文字 This is my cool site 去除方案
该文字为主题模板内置占位符，不在 `_index.md` 内：
1. 在项目根目录新建文件夹 `layouts`
2. 复制 `themes/LoveIt/layouts/index.html` 至 `layouts/index.html`
3. 打开复制后的文件，全局搜索 `This is my cool site`，删除对应代码行，保存后页面自动刷新消失。

---
## 五、本地预览启动 & 日常操作命令
### 1. 启动本地预览服务（核心命令）
```powershell
# 进入博客根目录
cd C:\Users\ethan.wang18\Desktop\my-blog
# 启动本地服务器，-D 参数加载草稿文章（draft:true）
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe server -D
```
- 启动成功标识：终端输出 `Web Server is available at http://localhost:1313/`
- 浏览器访问地址：`http://localhost:1313`
- 停止服务：在运行服务的PowerShell窗口按下 `Ctrl + C`
- 自动重载：修改配置、md文章后，网页无需手动刷新自动更新。

### 2. 新建博客文章命令（新开PowerShell窗口执行，不要占用服务窗口）
```powershell
# 新建一篇博客笔记，文件自动生成在 content/blog/ 目录
C:\Users\ethan.wang18\Desktop\wangcefile\hugo\hugo.exe new blog/Your-Article-Title.md
```
### 文章发布规则
打开生成的 `.md` 文件，头部 `draft: true` 代表草稿，本地可见、外网部署会隐藏；
发布上线需修改为 `draft: false`。

---
## 六、GitHub 源码推送 & 自动部署配置
### 1. 初始化Git仓库（仅首次搭建执行）
```powershell
# 确保当前目录为 my-blog
git init
# 关联远端GitHub Pages仓库
git remote add origin https://github.com/WUDIBANFAN/WUDIBANFAN.github.io.git
# 创建main主分支
git checkout -b main
# 打包所有修改文件
git add .
# 提交更新记录，引号内填写本次修改说明
git commit -m "Complete blog config, rename copyright to WANGCE"
# 推送代码至GitHub远端仓库
git push origin main
```

### 2. 配置GitHub Actions自动部署（推送代码自动构建静态网站）
1. 在博客根目录创建自动化文件夹与文件：`.github/workflows/deploy.yml`
2. `deploy.yml` 完整脚本：
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
3. 推送自动化配置至仓库
```powershell
git add .github/workflows/deploy.yml
git commit -m "Add auto deploy workflow for GitHub Pages"
git push origin main
```
4. GitHub后台开启Pages自动部署
打开仓库页面 → Settings → Pages → Source 选择【GitHub Actions】保存。
5. 外网访问地址：`https://WUDIBANFAN.github.io`，推送代码后等待1~3分钟自动更新网站。

### 3. 日常更新笔记推送流程
写完文章/修改配置后，一键同步外网：
```powershell
git add .
git commit -m "Add new note: 笔记名称"
git push origin main
```

---
## 七、高频报错完整排查清单
1. `hugo : 无法将“hugo”项识别为 cmdlet`
   - 原因：PATH环境变量未配置/终端未重启/路径填写错误
   - 临时方案：全程使用完整路径 `C:\xxx\hugo.exe` 执行命令
2. `module "Lovelt" not found`
   - 原因：配置 `theme = "Lovelt"` 和文件夹 `LoveIt` 拼写大小写不匹配
   - 修复：统一为 `theme = "LoveIt"`
3. `unmarshal failed: toml: table params already exists`
   - 原因：hugo.toml 文件内重复出现 `[params]` 代码块
   - 修复：合并所有参数至单个 `[params]`，删除重复区块，使用本文完整模板覆盖
4. WARN `deprecated: languageCode`
   - 原因：新版Hugo废弃旧语法
   - 修复：删除 `languageCode = "en"`，改用 `[site].locale = "en"`
5. 本地页面空白、无样式
   - 排查：确认下载的是带 `extended` 的Hugo安装包；主题文件夹层级正确；theme配置拼写无误。

---
## 八、后续拓展规划
1. 批量导入OneNote笔记：导出Markdown文件，放入 `content/blog/`，图片资源存放至 `static/assets/`，修正图片路径后预览推送。
2. 侧边栏美化、评论系统、CDN加速：仅生产环境（外网部署）生效，本地开发环境默认关闭。
3. 搜索功能、标签分类：主题内置，顶部导航栏已配置入口，写完文章自动生成。