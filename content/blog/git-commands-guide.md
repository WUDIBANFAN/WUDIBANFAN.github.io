+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = 'Git 常用指令速查'
categories = ['Dev Tools']
tags = ['Git', '版本控制', '命令行', '开发工具']
+++

记录了日常开发中 Git 仓库克隆、分支切换、代码拉取的全流程指令，方便新环境或换电脑时快速查。

<!--more-->

## 场景一：全新克隆仓库

从零开始，拿到仓库地址后在新机器上拉代码：

```bash
cd ~/你的工作目录

# 克隆仓库
git clone 仓库地址

# 进入仓库，拉取所有分支信息
cd 仓库名
git fetch origin

# 切换到目标分支
git checkout 目标分支名
```

## 场景二：本地已有代码，关联远端仓库

如果本地已经有代码目录（但没有 `.git`），需要初始化并关联：

```bash
# 初始化本地 Git 仓库
git init

# 关联远端仓库（origin 是远端别名，可以自定义）
git remote add origin 仓库地址
# 例：git remote add origin https://github.com/user/repo.git

# 拉取远端所有分支信息
git fetch origin

# 基于远端分支创建本地分支并切换过去
git checkout -b 本地分支名 origin/远端分支名
```

### git remote 常用操作

```bash
git remote -v                # 查看当前关联的远端仓库地址
git remote add 别名 地址      # 添加新的远端
git remote remove 别名        # 删除远端关联
```

## 场景三：分支切换与拉取

### 情况 1：已经在目标分支上

```bash
git pull
```

自动拉取当前分支远端最新代码并合并到本地。

### 情况 2：刚创建本地分支，还没绑定远端

```bash
# 先设置上游跟踪
git branch --set-upstream-to=origin/分支名 本地分支名

# 再拉取
git pull
```

### 情况 3：强制覆盖本地改动（慎用）

当本地改乱了，想直接丢弃本地修改，用远端最新代码覆盖：

```bash
git fetch origin
git reset --hard origin/分支名
```

> `reset --hard` 会丢弃所有本地未提交的修改，操作前确认没有需要保留的代码。

## 场景四：日常工作流

```bash
# 拉取最新代码
git pull

# ... 写代码 ...

# 查看有哪些改动
git status

# 添加所有改动
git add .

# 提交
git commit -m "做了什么改动"

# 推送到远端
git push origin 分支名
```

## 常用辅助命令

| 命令 | 作用 |
|------|------|
| `git status` | 查看工作区状态 |
| `git log --oneline -5` | 查看最近 5 条提交 |
| `git diff` | 查看具体改了什么 |
| `git branch` | 查看本地分支列表 |
| `git branch -a` | 查看所有分支（含远端） |
| `git stash` | 暂存当前改动 |
| `git stash pop` | 恢复暂存的改动 |
| `git checkout -b 新分支` | 创建并切换到新分支 |

## 我的常用组合

新环境上手一般就三类操作，记熟这几条就够了：

**克隆仓库并切分支**：
```bash
git clone 地址 && cd 仓库名 && git fetch origin && git checkout 目标分支
```

**日常提交**：
```bash
git add . && git commit -m "xxx" && git push origin main
```

**同步远端（覆盖本地）**：
```bash
git fetch origin && git reset --hard origin/main
```
