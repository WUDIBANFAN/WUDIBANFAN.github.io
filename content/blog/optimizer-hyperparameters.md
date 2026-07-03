+++
date = '2026-07-02T12:00:00+08:00'
draft = false
title = '优化器超参调优（Optimizer Hyperparameters）'
categories = ['Hyperparameters Tuning']
tags = ['深度学习', '优化器', 'AdamW']
+++

系统整理了 AdamW 优化器的 Weight Decay、Betas、梯度裁剪、梯度累积等核心参数的调优经验。

<!--more-->

> AdamW + 梯度控制 + 梯度累积

---

**【写在前面】**
优化器是大模型训练的"方向盘"。AdamW 是当前 Transformer 模型的标配，但很少有人真正理解它的每个参数在做什么。这节笔记从原理到实践，把每个参数掰开揉碎，目标是让你面试时能讲清楚，实验时能调得准。

---

## 一、AdamW 核心原理（快速回顾）

### 1.1 Adam vs AdamW
- **Adam**：在梯度更新中同时使用动量（一阶矩）和自适应学习率（二阶矩）
- **AdamW**：将 weight decay 从梯度更新中解耦，直接在权重上施加衰减

关键区别：
- Adam 的 weight decay 实际上被 Adam 的自适应机制"污染"了
- AdamW 解耦后，weight decay 与学习率调度无关，正则化更纯粹
- 实验结果：**AdamW 泛化能力显著优于 Adam**

### 1.2 更新公式（简略版）

```
m_t = beta1*m_{t-1} + (1-beta1)*g_t         （一阶矩，动量）
v_t = beta2*v_{t-1} + (1-beta2)*g_t^2       （二阶矩，自适应）
m_hat = m_t / (1-beta1^t)                   （偏差修正）
v_hat = v_t / (1-beta2^t)
w_t = w_{t-1} - lr*m_hat/(sqrt(v_hat)+eps) - lr*lambda*w_{t-1}
                                              ↑ AdamW 的 weight decay 在最后独立施加
```

---

## 二、Weight Decay（权重衰减）

### 2.1 本质
Weight Decay 就是 L2 正则化在优化器层面的实现，强制权重向 0 靠近，防止权重过大导致过拟合。

### 2.2 为什么对 Transformer 至关重要
- Transformer 参数量巨大（动辄数亿到数千亿）
- 大量参数 → 容易过拟合（尤其训练数据不够多时）
- 合适的 `weight_decay` 是控制泛化能力的最直接手段

### 2.3 取值指南

| weight_decay | 效果 | 适用场景 |
|-------------|------|---------|
| 0 | 无正则化 | 不推荐（几乎必过拟合）|
| 0.01 ~ 0.05 | 轻度正则化 | fine-tuning 预训练模型 |
| 0.05 ~ 0.1 | 标准正则化 | 大模型从头训练 |
| 0.1 ~ 0.5 | 强正则化 | 小数据集、严重过拟合 |

### 2.4 调参经验
- 小模型（<100M 参数）：`weight_decay` 可以稍大（0.05~0.1）
- 大模型（>1B 参数）：`weight_decay` 略小（0.01~0.05），因为参数多本身有一定正则化效果
- 数据增强做得好的话，`weight_decay` 可以适当降低
- 与 dropout 配合：weight_decay + dropout 双管齐下效果最好

### 2.5 注意事项
- **bias 和 LayerNorm 的参数通常不施加 weight decay**
- 需要区分参数组，只对 weight 施加 decay：

```python
# 推荐的分组方式
decay_params = []
no_decay_params = []
for name, param in model.named_parameters():
    if param.ndim <= 1 or 'bias' in name or 'norm' in name:
        no_decay_params.append(param)
    else:
        decay_params.append(param)

optimizer = AdamW([
    {'params': decay_params, 'weight_decay': 0.05},
    {'params': no_decay_params, 'weight_decay': 0.0}
], lr=1e-4)
```

---

## 三、Betas（动量系数）

### 3.1 参数含义
- **beta1**：一阶矩（动量）衰减系数，控制历史梯度的影响
- **beta2**：二阶矩（自适应学习率尺度）衰减系数，控制梯度方差的影响

### 3.2 默认值 vs 大模型调优
- PyTorch 默认：`betas=(0.9, 0.999)`
- 大模型推荐：`betas=(0.9, 0.95)` 或 `(0.9, 0.98)`

### 3.3 为什么大模型要调小 beta2

**直觉理解**：
- beta2 控制"梯度方差的历史窗口"
- `beta2=0.999` → 窗口约 1000 步（非常长），对历史梯度极其敏感
- `beta2=0.95`  → 窗口约 20 步（很短），主要关注近期梯度

**大模型训练特点**：
- 损失面复杂多变，梯度分布不稳定
- 过长的历史窗口会让二阶矩估计"反应迟钝"
- 降低 beta2 让自适应学习率更"敏捷"，能更快响应梯度变化

这也是为什么 **LLaMA、GPT-3 等大模型官方实现都用 beta2=0.95**。

### 3.4 调参经验
- 从头训练大模型：**beta2 选 0.95**，更稳定
- Fine-tuning：beta2 保持 0.999 即可
- beta1 一般不动，0.9 非常稳定

---

## 四、Epsilon（eps）

### 4.1 作用
防止分母为 0（除数加入极小值），数值稳定性参数。

### 4.2 取值
- PyTorch 默认：`1e-8`
- 大多数场景：`1e-8` 足够，不需要调整
- 混合精度训练（FP16）：可以适当增大到 `1e-7` 或 `1e-6`，防止精度下溢

### 4.3 何时需要调整
- 训练中出现 NaN：尝试增大 eps（`1e-7`）
- BF16 训练：`1e-8` 通常 OK
- FP16 训练：建议 `1e-7`

---

## 五、梯度裁剪（Gradient Clipping）

### 5.1 为什么需要梯度裁剪
大模型 = 深层网络 → 梯度在反向传播中容易逐层累积 → **梯度爆炸 → loss NaN**

梯度爆炸的根本原因：
- 深层 Transformer 链式求导时梯度会指数级放大
- BatchNorm/LayerNorm 只能缓解，不能根除
- 训练初期尤其容易发生

### 5.2 两种裁剪方式

**(1) 按范数裁剪（推荐）**

```python
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
```
- 计算所有参数的全局 L2 范数
- 如果超过 max_norm，等比例缩放到 max_norm
- 保持了梯度的"方向"，只限制了"大小"

**(2) 按值裁剪（较少用）**

```python
torch.nn.utils.clip_grad_value_(model.parameters(), clip_value=1.0)
```
- 每个梯度元素独立裁剪到 [-clip_value, clip_value]
- 可能改变梯度方向，不太推荐

### 5.3 max_norm 取值指南

| max_norm | 效果 | 场景 |
|----------|------|------|
| 0.5 | 强限制 | 训练极不稳定时 |
| **1.0** | **标准值** | **大模型训练首选** |
| 2.0~5.0 | 弱限制 | 训练稳定时放宽 |
| 不设 | 无限制 | 仅小模型/已验证稳定 |

### 5.4 调参经验
- 先设 **1.0**，观察训练是否稳定
- 如果仍然出现 NaN → 降低到 0.5
- 如果梯度范数一直远小于 max_norm → 可以放宽
- 配合 warmup：warmup 阶段梯度方差大，裁剪更重要

### 5.5 监控技巧

```python
# 训练循环中监控梯度范数
total_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
# 记录 total_norm 到日志中，观察其分布
```

如果 `total_norm` 频繁达到 `max_norm` 值 → 说明裁剪在频繁生效 → 考虑调整 lr 或 max_norm

---

## 六、梯度累积（Gradient Accumulation）

### 6.1 核心思想
不每步更新权重，而是累积多个 micro-batch 的梯度后再更新：

```
effective_batch = batch_size_per_gpu × num_gpus × grad_accum_steps
```

### 6.2 为什么用梯度累积
- **问题**：想用大 batch 训练，但显存放不下
- **解法**：把大 batch 拆成多个小 batch，梯度累加后一次性更新

### 6.3 代价与收益

**收益**：
- 不增加显存，获得大 batch 效果
- 大 batch → 梯度估计更准确 → 训练更稳定
- 减少 optimizer step 次数 → 通信开销降低

**代价**：
- 训练速度变慢（原来 1 次 forward/backward + 1 次 update，变成 N 次 forward/backward + 1 次 update）
- 过度累积可能导致收敛变慢（更新频率太低）

### 6.4 实现（PyTorch 风格）

```python
accumulation_steps = 4
optimizer.zero_grad()

for i, batch in enumerate(dataloader):
    loss = model(batch) / accumulation_steps  # 关键：loss 要除
    loss.backward()
    
    if (i + 1) % accumulation_steps == 0:
        optimizer.step()
        optimizer.zero_grad()
```

> ⚠️ 注意：loss 必须除以 accumulation_steps，因为 `.backward()` 会累加梯度

### 6.5 与 BatchNorm 的兼容问题
- BatchNorm 在 micro-batch 上计算的统计量不准
- 解决方案：
  1. 使用 SyncBatchNorm（多卡同步统计量）
  2. 使用 LayerNorm 代替 BatchNorm（Transformer 标配 LayerNorm，天然兼容）
  3. 使用 GroupNorm

### 6.6 调参建议
- `accumulation_steps` 常见值：1, 2, 4, 8, 16
- 总 effective batch 不宜过大（一般 64~4096），太大反而影响泛化
- `accumulation_steps × per_gpu_batch × num_gpus = 目标 batch`
- 如果用了梯度累积，记得学习率也按 effective batch 缩放

---

## 七、优化器超参调优实战 Checklist

- [ ] 选 **AdamW**（不要用原始 Adam）
- [ ] 划分参数组：**bias/Norm 不做 weight_decay**
- [ ] `weight_decay`：大模型从头训练 0.05~0.1，fine-tuning 0.01~0.05
- [ ] `betas`：大模型用 **(0.9, 0.95)**，小模型/微调用 (0.9, 0.999)
- [ ] `eps`：FP16 用 1e-7，BF16 用 1e-8
- [ ] 梯度裁剪：`max_norm=1.0` 起步
- [ ] 梯度累积：显存不够时启用，`accu_steps` 从 2 开始尝试
- [ ] 监控梯度范数，确保训练稳定

---

## 八、总结

优化器调参不是玄学，每个参数背后都有明确的数学含义和实践经验：

- **Weight Decay** → 控制过拟合，Transformer 必调
- **beta2** → 控制自适应学习率的"敏感度"，大模型调小更稳
- **Gradient Clipping** → 防止梯度爆炸，安全底线
- **Gradient Accumulation** → 突破显存限制，变相扩大 batch

> 理解原理 + 对照实践 + 观察 loss 曲线 → 调出好参数。
