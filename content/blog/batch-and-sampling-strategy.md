+++
date = '2026-07-02T12:00:00+08:00'
draft = false
title = 'Batch 与采样策略（Batch & Sampling Strategy）'
categories = ['Hyperparameters Tuning']
tags = ['Batch Size', 'DataLoader', '采样策略', '深度学习']
+++

# Batch 与采样策略（Batch & Sampling Strategy）

> Batch Size 权衡 · 重采样 · DataLoader 优化

---

**【写在前面】**
Batch Size 和采样策略直接影响训练的收敛速度、显存占用和最终精度。但很多人只关注"batch 调多大"，却忽略了采样策略和数据加载效率。这节笔记把完整链条讲清楚。

---

## 一、Batch Size 的核心权衡

### 1.1 大 Batch vs 小 Batch

**大 Batch 的优势**：
1. 梯度估计更准确（方差小）：每个 step 的梯度是 batch 内样本的均值
2. GPU 利用率高：大矩阵运算能填满 Tensor Core
3. 训练更稳定：loss 曲线更平滑，不易被个别噪声样本带偏

**大 Batch 的劣势**：
1. 泛化能力可能下降（"大 batch 泛化问题"）：梯度太"平滑"，缺少噪声探索，容易收敛到尖锐的局部极小
2. 消耗更多显存
3. 每个 epoch 的更新步数少（`total_steps = 数据量 / batch_size`）

> 小 Batch 的优劣正好相反。

### 1.2 经验取值

| 任务类型 | 推荐 effective batch size |
|---------|-------------------------|
| 图像分类 | 256 ~ 2048 |
| 目标检测 | 16 ~ 64（图像较大）|
| 分割/Occ | 8 ~ 64（3D 体素更大）|
| LLM 预训练 | 1024 ~ 4096 |
| LLM SFT | 64 ~ 256 |

### 1.3 "大 Batch 泛化问题"的应对
如果必须用大 batch：
- 配合更强的数据增强
- 配合更长的 warmup
- 配合 weight decay
- 使用更长时间训练（更多 epoch）
- 学习率适当调整（不必严格线性缩放）

---

## 二、Batch Size 与学习率联动

### 2.1 回顾线性缩放法则

```
scaled_lr = base_lr × (new_batch / base_batch)
```

### 2.2 实际操作步骤

1. 确定单卡能容纳的 batch size
2. 确定目标 effective batch size
3. 计算 `gradient_accumulation_steps = target_batch / (per_gpu_batch × num_gpus)`
4. 按 scaling rule 调整学习率

**例子**：
- 单卡 batch=2, 8 卡, 目标 effective_batch=64
- → `accum_steps = 64 / (2×8) = 4`
- → 原 lr=1e-4 → 新 lr=1e-4 × 4 = 4e-4（如果 scaling 成立）

### 2.3 什么情况下不缩放
- 使用 LayerNorm 或 GroupNorm（BatchNorm 依赖 batch 大小）
- 在 fine-tuning 阶段（预训练权重已经稳定）
- 当 effective batch 超过一定阈值（如 4096），继续放大效果不大

---

## 三、采样策略（重采样 & 均衡采样）

### 3.1 问题：数据分布不均衡
自动驾驶数据集常见问题：
- 直行场景占比远大于转弯/变道
- 晴天占比远大于雨天/夜晚
- 空场景占比远大于有障碍物场景

> 天然采样 → 模型主要学到直行+晴天+空场景 → 长尾场景表现差

### 3.2 多轮重采样（Over-sampling）
**策略**：频繁采样稀有场景，降低常见场景的采样权重

实现方式：
1. 维护每个场景类型的采样概率
2. 稀有场景概率高、常见场景概率低
3. 但不要完全平衡（会让常见场景精度下降太多）

```python
# 计算采样权重
scene_counts = Counter(scene_types)
total = sum(scene_counts.values())
# 反比于频率，但做平滑
weights = {s: (total / count) ** 0.5 for s, count in scene_counts.items()}
# 编译采样器
sampler = WeightedRandomSampler(
    weights=[weights[s] for s in scene_types],
    num_samples=len(dataset),
    replacement=True
)
```

### 3.3 均衡场景分布的其他方法
1. **分层采样（Stratified Sampling）**：将数据集按场景类型分层，每层等量采样
2. **课程学习（Curriculum Learning）**：先学简单场景，逐步加入困难场景
3. **数据集拼接（Dataset Concatenation）**：多个数据集合并，手动调整比例

---

## 四、DataLoader 优化

### 4.1 GPU 等待空闲问题

**典型瓶颈**：
```
GPU 计算 → 完成 → 等待下一批数据 → GPU 空闲
```

**理想状态**：
```
GPU 计算 → 完成 → 下一批已备好 → 立即开始 → GPU 不空闲
```

### 4.2 workers_per_gpu（num_workers）配置
- 设为 0：主进程加载数据（巨慢，GPU 大量空闲）
- 设为 4：4 个子进程并行加载
- 设为 8：8 个子进程（CPU 核心够就用）
- **一般建议**：CPU 核心数的 1/4~1/2，常见 4~8

DeepSpeed 配置：
```json
{
  "train_micro_batch_size_per_gpu": 2,
  "dataloader_num_workers": 4
}
```

### 4.3 Prefetch（预加载）

```python
dataloader = DataLoader(
    dataset,
    batch_size=bs,
    num_workers=4,
    prefetch_factor=2,    # 每个 worker 提前加载 2 个 batch
    pin_memory=True       # 将数据锁页到 CPU，加速传输到 GPU
)
```

- `prefetch_factor=2`：worker 在 GPU 用当前 batch 时提前准备下 2 个
- `pin_memory=True`：CPU 端数据用锁页内存，GPU 拷贝更快（**几乎必开**）

### 4.4 其他加速技巧

1. **避免 Python 开销**：
   - 数据增强尽量用 torchvision 的 GPU 端操作
   - 复杂的预处理在 Dataset 的 `__getitem__` 中做好

2. **使用 DALI（NVIDIA Data Loading Library）**：
   - 把数据解码和增强放到 GPU 上
   - 极大加速图像/视频数据加载

3. **预处理缓存**：
   - 对固定变换结果做缓存
   - 适合数据增强强度不高的场景

### 4.5 DataLoader 性能调优 Checklist

- [ ] `num_workers` 是否 > 0（至少 4）
- [ ] `pin_memory` 是否开启
- [ ] `prefetch_factor` 是否设置（≥2）
- [ ] 训练日志中 GPU 利用率是否 > 90%
- [ ] 如果 GPU 利用率低，增大 `num_workers` 或 `prefetch_factor`
- [ ] 如果 CPU 瓶颈，考虑 DALI 或预处理缓存

---

## 五、Batch 与采样策略实战总结

### 5.1 8 卡 A800 训练推荐配置
- `per_gpu_batch = 2`（显存约束）
- `effective_batch = 64`（2×8×4）
- 学习率按 scaling rule 同步放大
- DataLoader `workers = 4`，`pin_memory=True`，`prefetch_factor=2`

### 5.2 采样策略推荐
- Occ 体素任务：开启多轮重采样（场景/类别均衡）
- 分类任务：WeightedRandomSampler 处理类别不平衡
- 检测/分割：场景级分层采样

### 5.3 一句话总结
> Batch Size 不是越大越好，而是在显存允许的前提下兼顾速度与泛化；采样策略和 DataLoader 优化则是"不起眼但很致命"的细节——做对了训练快 30%，做错了 GPU 有一半时间在等数据。
