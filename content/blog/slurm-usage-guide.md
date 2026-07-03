+++
date = '2026-07-03T12:00:00+08:00'
draft = false
title = 'SLURM 集群使用完全指南'
categories = ['Dev Tools']
tags = ['SLURM', 'HPC', 'GPU', '集群', '命令行']
+++

SLURM 集群上申请 GPU、提交训练任务、管理会话的完整操作记录，从交互式调试到后台长期训练全覆盖。

<!--more-->

## 一、基础概念

SLURM 是高性能计算集群的作业调度系统，管理 GPU 资源的分配。几个核心概念：

| 概念 | 说明 |
|------|------|
| 分区（partition）| GPU 队列，如 `A800` 表示 A800 显卡队列 |
| 作业（job）| 一次资源申请，有唯一 JOBID |
| 节点（node）| 集群中的一台物理机器，如 `gpu8015` |
| 任务（task）| 作业中的单个进程 |

## 二、交互式申请 GPU（srun）

以下命令申请完直接进入计算节点终端，适合调试代码。

### 通用参数

```
-p A800             指定使用 A800 显卡分区
-n 1                启动 1 个任务
--cpus-per-task     每个任务分配的 CPU 核心数
--mem-per-cpu=20g   每个 CPU 核心分配 20GB 内存
--gres=gpu:a800:N   申请 N 张 A800 显卡
--pty /bin/bash     分配资源后直接打开交互式 bash 终端
```

### 2 卡 A800

```bash
srun -p A800 -n 1 --cpus-per-task=12 --mem-per-cpu=20g --gres=gpu:a800:2 --pty /bin/bash
```

### 4 卡 A800（排除特定节点）

```bash
srun -p A800 -n 1 --exclude=gpu8018 --cpus-per-task=24 --mem-per-cpu=20g --gres=gpu:a800:4 --pty /bin/bash
```

### 8 卡 A800

```bash
srun -p A800 -n 1 --cpus-per-task=48 --mem-per-cpu=20g --gres=gpu:a800:8 --pty /bin/bash
```

## 三、资源查看命令

### squeue — 查看作业队列

```bash
# 查看所有排队 + 运行中的作业
squeue

# 只看自己的任务
squeue -u 你的用户名

# 只看指定分区
squeue -p A800

# 自定义输出格式
squeue -u 你的用户名 -o "%.10i %.20j %.8T %.10M %.10l"
```

输出字段含义：

| 字段 | 含义 |
|------|------|
| JOBID | 作业 ID |
| PARTITION | 分区名 |
| NAME | 作业名 |
| ST | 状态（R=运行, PD=排队, CG=正在结束） |
| TIME | 已运行时间 |
| NODELIST | 分配的节点 |

### sinfo — 查看集群状态

```bash
# 查看所有分区的节点状态
sinfo

# 查看指定分区
sinfo -p A800

# 更详细的信息
sinfo -o "%P %.10n %.6D %.8T %.10c %.10m %.10G"
```

关键字段：
- `STATE`：`idle` = 空闲可用，`alloc` = 已分配，`drain` = 维护中
- `NODES(A/I/O/T)`：可用/空闲/其他/总计节点数

### 查看 GPU 使用情况

进入计算节点后：

```bash
nvidia-smi                # 查看 GPU 信息
nvidia-smi -l 1           # 每秒刷新 GPU 状态
watch -n 1 nvidia-smi     # 持续监控
```

### 查看自己的资源使用

```bash
# 查看自己的 CPU 和内存使用
top -u 你的用户名

# 查看磁盘使用
du -sh ~               # 家目录占用
df -h                  # 各分区剩余空间
```

## 四、任务附着命令（sattach）

**作用**：重新接入已经提交运行的交互式任务，防止 SSH 断开后会话丢失。

```bash
# 基础附着
sattach JOBID.0
# 例：sattach 1707535.0

# 带终端 pty 附着（推荐）
sattach --pty JOBID.0
# 例：sattach --pty 1707535.0
```

断连后可以重新连回原来的 GPU 环境，不用重新申请资源。

### 实操技巧：防止误操作释放显卡

申请到 GPU 并进入节点后，可以多开几个 SSH 窗口直连该节点：

```bash
# 先查你的交互式任务 JOBID
squeue -u 你的用户名

# 新开终端，直接 SSH 到节点
ssh gpu8015    # 假设 SLURM 分配的节点是 gpu8015
```

打开 3~4 个窗口同时连在一个节点上。**只有所有窗口全部执行 exit 退出，srun 交互式任务才会结束，显卡才会释放。** 哪怕手滑关掉一两个窗口，剩下的窗口依然保持连接，任务不会中断。

配合 nohup 使用更安全：

```bash
nohup python train.py > train.log 2>&1 &
```

`nohup` 让进程与终端会话解绑，即使终端断开训练也在继续。

## 五、批量任务提交（sbatch）

sbatch 是非交互式批量任务提交方式，**适合正式长时间训练**。

### 与 srun 的区别

| | srun | sbatch |
|------|------|------|
| 模式 | 前台交互 | 后台批量 |
| 窗口关闭 | 任务终止 | 任务继续 |
| 适用场景 | 调试代码 | 正式训练 |
| 输出 | 终端直接显示 | 写到文件 |

### 编写提交脚本

`run.sh`：

```bash
#!/bin/bash
#SBATCH -p A800                    # 分区
#SBATCH -n 1                       # 任务数
#SBATCH --cpus-per-task=24         # CPU 核心数
#SBATCH --mem-per-cpu=20g          # 每核内存
#SBATCH --gres=gpu:a800:4          # GPU 数量和型号
#SBATCH -o train_%j.out            # 标准输出文件（%j = JOBID）
#SBATCH -e train_%j.err            # 错误输出文件
#SBATCH --job-name=my_train        # 作业名

# 激活环境
source /opt/anaconda3/etc/profile.d/conda.sh
conda activate my_env

# 运行训练
cd /path/to/project
python train.py
```

提交：

```bash
sbatch run.sh
```

### 管理 sbatch 任务

```bash
# 查看自己的批量任务
squeue -u 你的用户名

# 取消任务
scancel JOBID
scancel -u 你的用户名        # 取消该用户所有任务

# 查看已完成任务信息
sacct -j JOBID
sacct -u 你的用户名 -S 2026-07-01  # 查看 7月1日之后的任务

# 查看任务详细信息
scontrol show job JOBID
```

### 任务依赖

```bash
# 任务 B 在任务 A 完成后才开始
sbatch --dependency=afterok:任务A_JOBID run_b.sh

# 任务 B 在任务 A 完成（无论成败）后开始
sbatch --dependency=afterany:任务A_JOBID run_b.sh
```

## 六、文件传输

```bash
# 从本地传到集群
scp 本地文件 用户名@集群地址:目标路径

# 从集群下载到本地
scp 用户名@集群地址:远端路径 本地路径

# 传整个目录
scp -r 本地目录 用户名@集群地址:目标路径

# rsync（支持断点续传）
rsync -avP 本地文件 用户名@集群地址:目标路径
```

## 七、常用操作速查

```bash
# 查看排队中的任务数
squeue -p A800 | grep PD | wc -l

# 查看空闲 GPU 数量
sinfo -p A800 -o "%n %t %G" | grep idle

# 查看自己的 GPU 使用历史
sacct -u 你的用户名 --format=JobID,Start,End,Elapsed,State -S 2026-07-01

# 查看节点的详细状态
scontrol show node gpu8001

# 挂起任务（需管理员权限）
scontrol hold JOBID

# 释放挂起任务
scontrol release JOBID

# 重新排队正在运行的任务
scontrol requeue JOBID
```

## 八、我的实操建议

1. **调试阶段**用 `srun` 交互式进节点，快速迭代
2. **正式训练**改用 `sbatch` 后台提交，关了终端也不怕
3. **网络断连**用 `sattach --pty JOBID.0` 重新接入
4. **多开窗口**防手滑，SSH 直连节点防止意外退出释放显卡
5. `squeue -u 用户名` 和 `nvidia-smi` 是最常用的两个查看命令
