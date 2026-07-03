+++
date = '2026-07-03T12:00:00+08:00'
draft = false
title = 'MMDetection 2.x CPU 内存泄漏 OOM 问题复盘与根治'
categories = ['Hyperparameters Tuning']
tags = ['MMDetection', 'OOM', 'PyTorch', 'DataLoader', 'Debug']
+++

记录了 MMDetection 2.x 训练 NuScenes 数据集时 CPU 内存持续上涨最终 OOM 的完整排查过程与最终方案。

<!--more-->

## 一、问题现象

MMDetection 2.x 训练 NuScenes 数据集，开启多进程数据加载（`num_workers > 0`）时：
- CPU 内存持续上涨，无法回收
- 最终触发 OOM 崩溃

对应官方已知问题：MMDet [#7786](https://github.com/open-mmlab/mmdetection/issues/7786)  fork 多进程内存泄漏。

## 二、根本原因

问题根因不在 MMDet，属于 **PyTorch + Linux fork 多进程机制的固有缺陷**：

- `fork` 创建子进程时会拷贝父进程**虚拟内存**
- 数据集存在大量 Python 对象时，会频繁触发 **COW（写时复制）**
- 产生不可逆、持续累积的内存副本，造成只增不减的内存泄漏

且当前场景**无法使用 `spawn` 模式规避**：NuScenes 数据集过大，无法 pickle 序列化，spawn 直接报错。

## 三、最终落地全套修复

### 1. 兜底缓解优化

| 配置项 | 文件/行号 | 改动 | 作用 |
|--------|----------|------|------|
| 限制 OpenCV 线程 | `train.py` L29 | `cv2.setNumThreads(8→1)` | 杜绝多 Worker 线程爆炸 |
| 持久化 Worker | `builder.py` L120 | `persistent_workers=True` | 跨 Epoch 复用进程，减少 fork 频次 |
| 限制 OMP/MKL 线程 | `builder.py` L140 | `worker_init_fn` 限制 | 防止子进程科学计算线程膨胀 |
| 保留 fork 模式 | `train.py` L320 | 不切 spawn | 适配大数据集不可 pickle 的场景 |

### 2. 核心根治方案

训练命令添加：

```bash
data.workers_per_gpu=0
```

- **原理**：完全不创建 DataLoader 子进程，数据加载全部在主进程完成，从源头消灭 fork 行为，彻底杜绝 COW 内存泄漏
- **代价**：单进程加载数据，CPU 读取速度小幅下降
- **收益**：训练全程 CPU 内存稳定，彻底解决 OOM
- **场景适配**：4GPU + batch_size=4 配置下，训练瓶颈为 GPU 计算，CPU 加载速度损失可完全忽略

## 四、社区方案演进

### MMDet v2.x（mmcv 1.7.2）

官方无可用根治方案：
- spawn 不支持大数据集
- 内存 Hook 仅能监控无法修复
- 社区所有方案（持久化 Worker、list 转 array、关闭 OpenCV 多线程）均为缓解手段

### MMDet v3.x / MMEngine

仅做优化缓解：
- 默认开启持久化 Worker
- 统一管理 DataLoader 生命周期
- 新增内存监控
- 未改动底层 fork+COW 机制，大数据集仍存在内存泄漏

### PyTorch 底层

持续修复 DataLoader 细节 Bug，但 fork + 多 Worker + 大量 Python 数据集对象的泄漏问题是机制性缺陷，**无法彻底修复**。

## 五、结论

1. MMDet 2.x + 大尺寸数据集场景下，`workers_per_gpu=0` 是**唯一稳定、可根治 OOM** 的方案
2. 线程限制、持久化 Worker 为必备辅助配置，进一步压低内存、规避线程爆炸
3. 宁可牺牲少量数据加载速度，优先保证训练全程稳定无崩
