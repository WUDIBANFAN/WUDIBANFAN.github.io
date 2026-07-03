+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = 'Git 常用指令速查'
categories = ['Dev Tools']
tags = ['Git', '开发工具']
+++

日常开发中用得最多的 Git 指令整理，按场景分类，方便遇到问题或换新环境时快速查阅。

<!--more-->

## 一、基础配置

新电脑上装完 Git 后第一件事——配好用户名和邮箱，否则每次提交都会有警告。

```bash
# 全局配置（对所有仓库生效）
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

# 只对当前仓库生效（不加 --global）
git config user.name "你的名字"

# 查看当前配置
git config --list
git config user.name
git config user.email

# 配置代理（公司内网常用）
git config --global http.proxy http://proxy.公司地址:端口
git config --global https.proxy http://proxy.公司地址:端口

# 取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy

# 配置换行符处理（Windows 开发建议）
git config --global core.autocrlf true    # Windows
git config --global core.autocrlf input   # Mac/Linux
```

### 配置别名（简化命令）

在 `~/.gitconfig` 里加：

```ini
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    lg = log --oneline --graph --all -10
    last = log -1 HEAD
    unstage = reset HEAD --
    undo = reset --soft HEAD~1
```

## 二、仓库操作

### 从零开始

```bash
# 在当前目录初始化 Git 仓库
git init

# 克隆远端仓库
git clone https://github.com/用户名/仓库名.git
git clone git@github.com:用户名/仓库名.git   # SSH 方式

# 克隆指定分支
git clone -b 分支名 仓库地址
```

### 关联远端仓库

```bash
# 查看当前关联的远端
git remote -v

# 添加远端（origin 是惯用别名）
git remote add origin 仓库地址

# 修改远端地址
git remote set-url origin 新地址

# 删除远端关联
git remote remove origin

# 一个仓库关联多个远端
git remote add upstream 上游仓库地址
```

## 三、日常修改与提交

这是一天中用得最频繁的几个命令。

```bash
# 查看工作区状态（必看）
git status

# 查看具体改了什么
git diff                # 工作区 vs 暂存区
git diff --staged       # 暂存区 vs 上次提交
git diff HEAD           # 工作区 vs 上次提交（全部改动）
git diff 分支1..分支2    # 两个分支的差异

# 查看某个文件改了什么
git diff 文件名
```

### add 的各种用法

```bash
# 添加所有改动
git add .

# 添加指定文件
git add 文件名1 文件名2

# 添加指定目录
git add src/

# 交互式添加（逐块选择）
git add -p

# 只添加已跟踪文件的改动（不包括新建文件）
git add -u
```

### commit

```bash
# 提交（-m 后跟提交说明）
git commit -m "做了什么改动"

# 提交所有已跟踪文件的改动（跳过 add）
git commit -am "做了什么改动"   # 注意：新文件还是要先 add

# 修改上一次提交（还没有 push 的前提下）
git commit --amend -m "新的提交说明"

# 修改上一次提交，不改说明
git commit --amend --no-edit

# 空提交（触发 CI/CD 等场景）
git commit --allow-empty -m "触发构建"
```

### 撤销操作

```bash
# 撤销工作区改动（恢复到上次提交的状态）
git checkout -- 文件名
git restore 文件名              # 新版 Git 推荐

# 把已 add 的文件移出暂存区
git reset HEAD 文件名
git restore --staged 文件名     # 新版 Git 推荐

# 撤销最近一次 commit（保留改动在暂存区）
git reset --soft HEAD~1

# 撤销最近一次 commit（保留改动在工作区）
git reset --mixed HEAD~1

# 撤销最近一次 commit（完全丢弃）
git reset --hard HEAD~1

# 回到某个历史版本（不要在当前工作分支用 --hard）
git reset --hard 提交ID
```

## 四、分支管理

```bash
# 查看本地分支
git branch

# 查看所有分支（含远端）
git branch -a

# 查看分支 + 最近一次提交
git branch -v

# 查看已合并/未合并的分支
git branch --merged
git branch --no-merged

# 创建分支
git branch 新分支名

# 创建并切换到新分支
git checkout -b 新分支名

# 切换分支
git checkout 分支名
git switch 分支名            # 新版 Git 推荐

# 基于远端分支创建本地分支
git checkout -b 本地分支名 origin/远端分支名

# 重命名分支
git branch -m 旧名 新名

# 删除分支
git branch -d 分支名         # 安全删除（已合并的）
git branch -D 分支名         # 强制删除
```

## 五、合并与变基

### merge（合并）

```bash
# 把目标分支合并到当前分支
git merge 目标分支

# 合并时禁止快进（保留分支历史）
git merge --no-ff 目标分支

# 取消正在进行的合并
git merge --abort
```

### rebase（变基）

```bash
# 把当前分支的提交"嫁接"到目标分支最新提交之后
git rebase 目标分支

# 交互式变基（合并提交、修改提交说明等）
git rebase -i HEAD~3        # 处理最近 3 个提交
git rebase -i 起始提交ID    # 从指定提交开始

# 取消正在进行的变基
git rebase --abort

# 跳过当前冲突的提交
git rebase --skip
```

### merge vs rebase 的选择

| 场景 | 推荐 |
|------|------|
| 合并公共分支到自己的分支 | `rebase`（保持历史线性） |
| 把自己的分支合并到公共分支 | `merge --no-ff`（保留合并记录） |
| 整理自己分支的提交历史 | `rebase -i` |
| 不确定怎么选 | 用 `merge`，安全第一 |

### 解决冲突

```bash
# 出现冲突时，git status 会列出冲突文件
git status

# 编辑冲突文件，找到 <<<<<<< 和 >>>>>>> 标记
# 手动处理完后：

git add 已解决冲突的文件
git commit        # merge 场景
# 或
git rebase --continue   # rebase 场景

# 放弃合并/变基，回到操作前状态
git merge --abort
git rebase --abort
```

## 六、暂存与储藏

写了一半的代码不想提交但又需要切分支时用。

```bash
# 暂存当前所有改动
git stash

# 暂存 + 添加说明
git stash save "说明文字"

# 暂存未跟踪的文件
git stash -u

# 查看暂存列表
git stash list

# 恢复最近一次暂存（保留 stash）
git stash apply

# 恢复最近一次暂存（删除 stash）
git stash pop

# 恢复指定 stash
git stash apply stash@{2}

# 删除所有暂存
git stash clear

# 只暂存部分文件
git stash push 文件名1 文件名2
```

## 七、查看历史

```bash
# 查看提交历史
git log

# 简洁一行版
git log --oneline

# 最近 N 条
git log -5
git log --oneline -10

# 图形化显示分支（推荐）
git log --oneline --graph --all -10

# 查看某个文件的提交历史
git log -- 文件名
git log -p -- 文件名        # 附带每次改动的 diff

# 查看谁改了什么
git blame 文件名

# 搜索提交说明
git log --grep="关键词"

# 搜索代码变更
git log -S"代码片段"
```

### 查看某次提交的详情

```bash
# 查看提交详情
git show 提交ID

# 只看改了什么文件
git show --stat 提交ID

# 查看最近一次提交
git show HEAD
```

## 八、标签

```bash
# 打轻量标签
git tag v1.0.0

# 打附注标签（推荐）
git tag -a v1.0.0 -m "版本说明"

# 查看所有标签
git tag

# 推送标签到远端
git push origin v1.0.0
git push origin --tags      # 推送所有标签

# 删除标签
git tag -d v1.0.0           # 本地删除
git push origin --delete v1.0.0   # 远端删除
```

## 九、远端同步

```bash
# 拉取远端最新信息（不会合并）
git fetch origin

# 拉取并合并
git pull
git pull origin 分支名

# 以 rebase 方式拉取（保持历史线性）
git pull --rebase

# 推送
git push origin 分支名
git push -u origin 分支名   # 首次推送 + 设置上游跟踪

# 强制推送（⚠️ 慎用！会覆盖远端历史）
git push --force origin 分支名
git push --force-with-lease origin 分支名   # 更安全的强制推送

# 删除远端分支
git push origin --delete 分支名

# 查看本地分支与远端的关系
git branch -vv
```

### 设置上游跟踪

```bash
# 推送时设置
git push -u origin 分支名

# 手动设置
git branch --set-upstream-to=origin/远端分支名 本地分支名

# 之后直接 git pull / git push 即可，不需要指定远端和分支名
```

## 十、版本回退与恢复

```bash
# 查看操作历史（可以找到丢失的提交）
git reflog

# 用 rebase 丢掉最近几个提交（危险）
git reset --hard HEAD~3

# 反做某个提交（生成一个新提交来撤销）
git revert 提交ID

# 从 reflog 恢复"丢失"的提交
git checkout -b 恢复分支名 提交ID
```

## 十一、子模块

```bash
# 添加子模块
git submodule add 仓库地址 路径

# 克隆含子模块的仓库
git clone --recursive 仓库地址

# 更新子模块
git submodule update --init --recursive

# 查看子模块状态
git submodule status
```

## 十二、.gitignore 文件

常见忽略规则：

```gitignore
# 依赖
node_modules/
vendor/

# 编译产物
dist/
build/
public/

# 环境变量
.env
.env.local

# 系统文件
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# 日志
*.log

# Hugo 构建
public/
resources/
.hugo_build.lock
```

```bash
# 让 .gitignore 立即生效（清除缓存）
git rm -r --cached .
git add .
git commit -m "Apply .gitignore"
```

## 十三、我的日常使用组合

```bash
# 克隆仓库并切换到指定分支
git clone 地址 && cd 仓库名 && git checkout 目标分支

# 日常提交流程
git status               # 先看一眼改了什么
git add .                # 全部加入暂存区
git commit -m "xxx"      # 提交
git push origin main     # 推送

# 同步远端最新代码（覆盖本地，慎用）
git fetch origin && git reset --hard origin/main

# 切分支干活
git checkout -b feat/xxx
# 干完活推送
git push -u origin feat/xxx

# 清理已合并的分支
git branch --merged | grep -v "main\|master" | xargs git branch -d

# 撤销还没 push 的上一次提交
git reset --soft HEAD~1

# 暂存当前工作去处理紧急 bug
git stash && git checkout main && git pull
# 处理完回来继续
git checkout feat/xxx && git stash pop
```
