+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = 'Git 常用指令速查'
categories = ['Dev Tools']
tags = ['Git', '版本控制', '命令行', '开发工具']
+++

Git 常用操作指令速查，涵盖仓库克隆、分支管理、代码拉取与推送。

<!--more-->

## 一、全新克隆仓库（推荐）

退出当前目录，执行克隆命令：

```bash
cd ~/wangce_pytest
git clone 你的仓库地址
```

克隆完成后，进入仓库目录，再执行切换分支命令：

```bash
cd 仓库名
git fetch origin
git checkout tianxu_medium_smoke
```

## 二、已有代码，初始化并关联远程

```bash
# 1. 初始化 git 仓库
git init

# 2. 关联远程仓库
git remote add origin 你的仓库地址

# 3. 拉取远端所有分支
git fetch origin

# 4. 切换到目标分支
git checkout -b tianxu_medium_smoke origin/tianxu_medium_smoke
```

## 三、拉取代码

### 情况 1：已经成功切换到分支

```bash
git pull
```

自动拉取当前分支（`tianxu_medium_smoke`）远端最新代码并合并。

### 情况 2：刚创建本地分支，还没有跟踪远程分支

先绑定远程追踪，再拉取代码：

```bash
git branch --set-upstream-to=origin/tianxu_medium_smoke tianxu_medium_smoke
git pull
```

### 情况 3：干净拉取远端完整代码（覆盖本地改动，谨慎使用）

```bash
git fetch origin
git reset --hard origin/tianxu_medium_smoke
```

## 四、最简完整流程（一次性执行）

```bash
git fetch origin
git checkout tianxu_medium_smoke
git pull
```
