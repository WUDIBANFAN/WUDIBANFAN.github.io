+++
date = '2026-07-02T12:00:00+08:00'
draft = false
title = '学习率调度（Learning Rate Scheduling）'
categories = ['Hyperparameters Tuning']
tags = ['Learning Rate', 'Cosine Annealing', 'Warmup', '深度学习']
+++


> 深度学习训练中最核心的超参之一

---

**【写在前面】**
学习率调度是大模型训练中除 warmup 外最关键的调优维度。一个好的调度策略能让模型收敛更快、最终精度更高、训练更稳定。作为研究生，理解每种策略的原理和适用场景比死记硬背参数重要得多。

---

## 一、为什么需要学习率调度？

### 1.1 直觉理解
- 训练初期：权重是随机的，需要大步长快速找到 loss 下降方向
- 训练中期：需要适中步长，持续有效地降低 loss
- 训练后期：接近最优解，需要小步长精细搜索，避免在最优点附近震荡

### 1.2 数学直觉
- 优化问题往往是非凸的，loss landscape 存在大量局部极小和鞍点
- 固定学习率会导致：
  - (a) 太大 → 在最优点附近来回跳，无法收敛
  - (b) 太小 → 收敛极慢，且容易陷入局部极小
- 调度策略的本质：动态调整步长，平衡"探索"与"利用"

---

## 二、Warmup（学习率预热）

### 2.1 为什么需要 Warmup
- 训练刚开始时，模型权重是随机初始化的，梯度方向不稳定
- 如果一开始就用大学习率，容易导致梯度爆炸或模型发散
- Warmup 让学习率从小线性增长到目标值，给优化器一个"适应期"

### 2.2 实现方式
- Linear Warmup：lr 从 0（或很小的值）线性增长到 base_lr
- 通常设置 `warmup_steps` 为总训练步数的 1%~5%
- 例如：总训练 100k 步，warmup 设 1000~5000 步

### 2.3 代码示例（PyTorch 风格）

```python
# 使用 HuggingFace 风格的 scheduler
from transformers import get_cosine_schedule_with_warmup

scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=1000,
    num_training_steps=100000
)
```

### 2.4 通用标配组合
> **Warmup（线性预热） + CosineAnnealingLR（余弦退火）**

这是当前大模型训练的事实标准，覆盖 90% 以上的场景。

---

## 三、CosineAnnealingLR（余弦退火）

### 3.1 原理
学习率按余弦函数从最大值平滑衰减到 0（或最小值）：

```
lr(t) = lr_min + 0.5 * (lr_max - lr_min) * (1 + cos(pi * t / T))
```

其中 `t` 为当前步数，`T` 为总步数。

### 3.2 曲线特征
- 前半段：下降缓慢，保持在较高水平 → 充分探索
- 后半段：加速下降，迅速逼近最小值 → 精细收敛
- 终端：平滑趋近于 0，非常稳定，没有突变

### 3.3 为什么大模型偏爱 CosineAnnealingLR
1. **无突变**：StepLR 在衰减点学习率突然砍半，可能造成 loss 跳变
2. **末端平滑**：训练后期学习率极小时仍能稳定下降，不会震荡
3. **与 DeepSpeed 兼容好**：ZeRO 优化器的状态更新与平滑的 lr 配合更稳定
4. **与其他技巧兼容**：梯度裁剪、EMA 等对平滑 lr 更友好

### 3.4 PyTorch 使用

```python
from torch.optim.lr_scheduler import CosineAnnealingLR

scheduler = CosineAnnealingLR(
    optimizer,
    T_max=100000,      # 总步数（一个完整周期）
    eta_min=1e-6       # 最小学习率，一般为 base_lr 的 1/100 或更小
)
```

### 3.5 调参建议
- `eta_min` 不要设为 0，一般 `1e-6 ~ 1e-7`，给训练后期留一点微调空间
- 配合 warmup 使用时，先线性预热到 peak_lr，再走余弦曲线下降
- 适用于：LLM 预训练、多模态大模型、大规模视觉模型

---

## 四、CosineAnnealingWarmRestarts（余弦退火带热重启）

### 4.1 原理
在 CosineAnnealingLR 基础上，周期性地将学习率"拉回"到最大值，形成多个余弦周期：

```
lr(t) = lr_min + 0.5 * (lr_max - lr_min) * (1 + cos(pi * t_i / T_i))
```

每个周期 `T_i` 结束后，lr 重置回 `lr_max`，开始新一轮下降。

### 4.2 核心思想：跳出局部极小
- 训练中模型可能陷入某个 loss 盆地（局部极小）
- 突然拉高学习率 → 给优化器一个"冲击" → 有可能跳出当前盆地
- 跳出来后在新区域重新下降 → 可能找到更好的解

### 4.3 适用场景
（比普通 Cosine 用的少，但特定场景效果好）
1. Occupancy Network / 3D 体素预测：loss landscape 多峰，需要跳出
2. 大 VLA（Vision-Language-Action）感知模型：任务复杂，易陷入局部解
3. 训练数据分布不均匀时：周期性重启可以重新适应不同数据

### 4.4 PyTorch 使用

```python
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts

scheduler = CosineAnnealingWarmRestarts(
    optimizer,
    T_0=10000,         # 第一个周期的长度（步数）
    T_mult=2,          # 每个周期长度倍增因子（T_i = T_0 * T_mult^i）
    eta_min=1e-6
)
```

### 4.5 调参建议
- `T_0` 不宜太小（至少几千步），否则频繁重启会破坏已学到的知识
- `T_mult` 设为 1 表示等长周期，设为 2 表示周期越来越长（推荐）
- 训练结束时如果正值深降阶段，效果最好
- 注意：重启瞬间 loss 可能有微小跳变，这是正常的

---

## 五、Linear Decay（线性衰减）

### 5.1 原理
学习率从 peak_lr 线性下降到 end_lr：

```
lr(t) = peak_lr + (end_lr - peak_lr) * t / T
```

### 5.2 为什么 LLM 标配 Linear Decay
1. **简单可控**：只有两个参数（起点和终点），调参简单
2. **稳定**：匀速下降，没有意外行为
3. **符合 scaling law 直觉**：大模型训练每个 token "同等重要"
4. **业界验证**：GPT、LLaMA、Llama 2/3 等主流 LLM 都使用

### 5.3 与 Cosine 的对比

| 特性 | Linear Decay | CosineAnnealing |
|------|-------------|-----------------|
| 初期下降速度 | 匀速 | 缓慢 |
| 末期下降速度 | 匀速 | 加速 |
| 末端行为 | 直接到达 end_lr | 平滑趋于 eta_min |
| 调参难度 | 简单 | 一般 |
| LLM 使用率 | 最高 | 次高 |

### 5.4 PyTorch 使用

```python
from torch.optim.lr_scheduler import LinearLR

scheduler = LinearLR(
    optimizer,
    start_factor=1.0,       # 起始倍率（相对于 base_lr）
    end_factor=0.1,         # 结束倍率（base_lr * 0.1）
    total_iters=90000       # 衰减总步数
)
```

### 5.5 调参建议
- `end_lr` 通常设为 `peak_lr` 的 1/10（如 peak=1e-3, end=1e-4）
- 多模态自动驾驶模型（如 UniDriveVLA）广泛使用
- 配合 warmup 使用，整体呈"上升→匀速下降"的梯形

---

## 六、StepLR（阶梯下降）

### 6.1 原理
每隔固定步数或 epoch，学习率乘以一个衰减因子（通常 0.1 或 0.5）：

```
lr = lr * gamma   (每 step_size 步执行一次)
```

### 6.2 为什么大模型不推荐
1. **衰减突变**：lr 瞬间跳变，可能导致 loss spike
2. **对 batch size 敏感**：不同 batch 对突变敏感度不同
3. **不够平滑**：Transformer 深层结构对 lr 突变尤其敏感
4. **需要手动设置衰减时机**，不够自动化

### 6.3 仍然适用的场景
- 传统 CNN（ResNet、VGG 等）：网络结构简单，对 lr 突变不敏感
- 小规模分类任务
- 作为 baseline 快速验证

### 6.4 PyTorch 使用

```python
from torch.optim.lr_scheduler import StepLR

scheduler = StepLR(
    optimizer,
    step_size=30,    # 每 30 个 epoch 衰减一次
    gamma=0.1        # 衰减为原来的 0.1 倍
)
```

---

## 七、学习率缩放规则（多卡训练必读）

### 7.1 线性缩放法则（Linear Scaling Rule）
当使用多 GPU 数据并行训练时，batch size 随 GPU 数量线性增加，学习率也应同步线性放大：

```
scaled_lr = base_lr × num_gpus
```

或者更精确地：

```
scaled_lr = base_lr × (total_batch_size / base_batch_size)
```

### 7.2 为什么需要缩放
- 多卡时 effective batch size = per_gpu_batch × num_gpus
- 大 batch 下梯度估计更准确（方差更小），可以用更大步长
- 不缩放 = 浪费算力，收敛极慢
- 过度缩放 = 训练不稳定，可能发散

### 7.3 实际例子
假设单卡实验：`lr=1e-4, batch_size=2`，现在用 8 卡训练，保持每卡 batch=2：

- **方案 A（保持每卡 batch，同步缩放 lr）**：
  - `scaled_lr = 1e-4 × 8 = 8e-4`
  - `effective_batch = 2 × 8 = 16`

- **方案 B（放大每卡 batch）**：
  - 每卡 batch=8，则 effective_batch=64
  - `scaled_lr = 1e-4 × (64/2) = 3.2e-3`

> ⚠️ 注意：lr 不能无限放大，超过临界值会导致发散。

### 7.4 经验法则
- 2~4 卡：线性缩放基本成立
- 8 卡：线性缩放通常有效，但峰值 lr 可能需略微降低
- 16+ 卡：可能需要 gradual warmup 或 sqrt scaling（`lr ∝ sqrt(N)`）

### 7.5 注意事项
- A800/H800 8 卡训练一定要同步放大学习率
- 放大 lr 后 warmup 步数也要适当增加
- 梯度裁剪阈值可能需要随之调整

---

## 八、学习率调参实战 Checklist

- [ ] 确定 base_lr：从 `1e-4` 或 `5e-4` 开始 sweep
- [ ] 确定调度策略：大模型默认 **Cosine + Warmup**
- [ ] 设置 warmup 步数：总步数的 **1%~5%**
- [ ] 设置最小学习率：`eta_min = base_lr / 100`
- [ ] 多卡时按线性法则缩放 lr
- [ ] 观察 loss 曲线：
  - loss 下降平滑 → lr 合适
  - loss 剧烈震荡 → lr 过大
  - loss 下降过慢 → lr 过小
  - loss 突然跳变（非重启点）→ 检查梯度爆炸
- [ ] 如有条件，做 lr sweep（如 1e-5, 5e-5, 1e-4, 5e-4, 1e-3）

---

## 九、总结

| 策略 | 适用场景 | 大模型推荐度 |
|------|---------|------------|
| CosineAnnealingLR + Warmup | 通用大模型训练 | ★★★★★（首选）|
| Linear Decay + Warmup | LLM、多模态自动驾驶 | ★★★★★ |
| CosineAnnealingWarmRestarts | Occ、VLA 感知模型 | ★★★★ |
| StepLR | 传统 CNN | ★★ |

学习率调度看似简单，实则是大模型训练的基础功。掌握核心原理，在实际项目中灵活选用，是研究生从"跑代码"到"懂训练"的关键一步。
