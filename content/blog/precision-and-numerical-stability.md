+++
date = '2026-07-02T12:00:00+08:00'
draft = false
title = '精度与数值稳定（Precision & Numerical Stability）'
categories = ['Hyperparameters Tuning']
tags = ['BF16', 'FP16', '混合精度', 'Gradient Checkpointing', '深度学习']
+++


> FP16/BF16 · Loss Scaling · Gradient Checkpointing

---

**【写在前面】**
算力有限、显存有限是研究生的日常。混合精度训练和梯度检查点是两条"省钱省资源"的技术路线——前者加速训练，后者压缩显存。这节笔记讲清楚什么时候用什么、为什么、怎么配。

---

## 一、混合精度训练总览

### 1.1 为什么需要混合精度
- **FP32**（32 位浮点）：精度高，但慢、占显存
- **FP16**（16 位浮点）：快、省显存，但表示范围小（容易下溢/上溢）
- **BF16**（Brain Float 16）：快、省显存、表示范围与 FP32 相同

> 混合精度 = 关键层用 FP32 + 大部分计算用 FP16/BF16

### 1.2 数值格式对比

| 格式 | 总位数 | 指数位 | 尾数位 | 表示范围 | 精度 |
|------|-------|--------|--------|---------|------|
| FP32 | 32 | 8 | 23 | ~3.4e38 | 高 |
| FP16 | 16 | 5 | 10 | ~65504 | 中 |
| BF16 | 16 | 8 | 7 | ~3.4e38 | 低 |

- BF16 的关键优势：**指数位与 FP32 相同 → 表示范围相同**
- FP16 的致命问题：最大只能表示 65504，大梯度直接溢出

---

## 二、BF16 vs FP16：为什么 A800 优先 BF16

### 2.1 FP16 的三大问题
1. **梯度下溢**：小于 6e-8 的值直接变 0 → 梯度消失
2. **梯度上溢**：大于 65504 的值变 inf → 梯度爆炸
3. **需要 Loss Scaling**：手动放大 loss 让梯度进入 FP16 可表示范围，训练复杂

### 2.2 BF16 为什么是 A800 的"银弹"
- A800（基于 Ampere 架构）原生支持 BF16 张量核心计算
- BF16 的指数位 = FP32（8 位），表示范围相同
- **不需要 Loss Scaling！**因为梯度不会超出表示范围
- 计算速度与 FP16 基本相同（同一代硬件）
- 唯一的代价：尾数只有 7 位，精度略低于 FP16（实践中影响很小）

### 2.3 什么时候必须用 FP16
- 硬件不支持 BF16 的旧 GPU（V100 及之前的卡不支持 BF16）
- 某些算子（自定义 CUDA kernel）只实现 FP16
- 对尾数精度要求极高的特定任务（极罕见）

### 2.4 PyTorch 中的混合精度实现

```python
from torch.cuda.amp import autocast, GradScaler

# BF16 模式（推荐，A800 使用）
with autocast(dtype=torch.bfloat16):
    output = model(input)
    loss = criterion(output, target)
# BF16 不需要 GradScaler，直接 backward
loss.backward()

# FP16 模式
scaler = GradScaler()
with autocast(dtype=torch.float16):
    output = model(input)
    loss = criterion(output, target)
scaler.scale(loss).backward()
scaler.step(optimizer)
scaler.update()
```

### 2.5 DeepSpeed 中的混合精度配置

BF16 模式：
```json
{
  "bf16": {
    "enabled": true
  }
}
```

FP16 模式：
```json
{
  "fp16": {
    "enabled": true,
    "initial_scale_power": 16,
    "loss_scale_window": 1000,
    "hysteresis": 2,
    "min_loss_scale": 1
  }
}
```

---

## 三、Loss Scaling（仅 FP16 需要）

### 3.1 为什么需要 Loss Scaling
FP16 能表示的最小正数是 ~6e-8。在大模型训练中：
- 有些梯度值可能小于这个阈值
- → 直接变成 0（下溢）
- → 这些参数的权重永远不会更新
- → 训练卡住

**解决方案**：把 loss 放大（如 ×1024），梯度也随之放大，不再下溢；更新权重前再把梯度缩小回来。

### 3.2 静态 vs 动态 Loss Scaling

**静态（不推荐）**：
- 手动设一个固定 scale（如 1024）
- 梯度有溢出风险：scale 定小了不管用，定大了可能自己溢出

**动态（推荐）**：
- 自动检测是否有梯度溢出（`grad == inf` 或 `NaN`）
- 没有溢出 → 适度增大 scale（×2）
- 发生溢出 → 减小 scale（÷2），跳过本次更新
- 经过一段时间的调整，scale 会收敛到合适值

### 3.3 DeepSpeed 中的动态 Loss Scale 参数
- `initial_scale_power`：初始 scale = 2^16 = 65536，够大但不是离谱大
- `loss_scale_window`：连续 1000 步没溢出 → scale ×2
- `hysteresis`：连续 2 步溢出 → scale ÷2
- `min_loss_scale`：scale 最小不低于 1

### 3.4 BF16 为什么不需要
因为 BF16 与 FP32 表示范围相同，梯度的数值范围天然合适，不需要放大缩小。**这就是 A800 用 BF16 的核心优势。**

---

## 四、Gradient Checkpointing（梯度检查点）

### 4.1 核心思想：用计算换显存
- 正常训练：前向传播保存所有中间激活值 → 反向传播使用
- 激活检查点：前向传播只保存"检查点"的激活值 → 反向传播时重新计算中间层

### 4.2 为什么大模型需要它
- Transformer 的显存消耗主要在中间激活值，不是参数本身
- 例如：一个 7B 模型的参数约 28GB（BF16），但训练时激活值可能占 60GB+
- Gradient Checkpointing 可以将激活显存降低 **50%~70%**
- 代价：额外 **20%~30%** 的计算量（重新计算前向）

### 4.3 实现方式

PyTorch 原生方式：

```python
from torch.utils.checkpoint import checkpoint

# 对 Transformer 编码器/解码器层使用
def forward(self, x):
    for layer in self.layers:
        x = checkpoint(layer, x, use_reentrant=False)
    return x
```

HuggingFace 通用接口：

```python
model.gradient_checkpointing_enable()
```

### 4.4 DeepSpeed 配置

```json
{
  "activation_checkpointing": {
    "partition_activations": true,
    "cpu_checkpointing": true,
    "number_checkpoints": null,
    "contiguous_memory_optimization": true,
    "synchronize_checkpoint_boundary": false
  }
}
```

关键参数：
- `partition_activations`：在模型并行时跨卡分片激活值
- `cpu_checkpointing`：把检查点卸载到 CPU 内存（极度省 GPU 显存）
- `contiguous_memory_optimization`：内存碎片整理，提升效率

### 4.5 调参建议
- 默认在 Transformer 每一层做 checkpoint（对 encoder/decoder layer）
- **不要在最后的 head/decoder 层做 checkpoint**，那里激活值不大
- 如果显存仍然不够，开 `cpu_checkpointing`（慢但省）
- `use_reentrant=False`（PyTorch 2.0+ 推荐，避免重入 bug）

---

## 五、其他数值稳定技巧

### 5.1 LayerNorm 位置
- **Pre-LN**（LayerNorm 在 Attention/FFN 之前）：训练更稳定，主流方案
- **Post-LN**（LayerNorm 在之后）：数值容易不稳定，大模型基本不用
- 确认你的 Transformer 用的是 Pre-LN

### 5.2 初始化的影响
- 不合适的初始化可能导致深层激活坍缩或爆炸
- Transformer 推荐 Xavier 初始化或小方差正态初始化
- 对于深层模型（>24 层），可以减小初始化方差（如 0.02/std_per_layer）

### 5.3 NaN/Inf 监控

```python
# 定期检查
for name, param in model.named_parameters():
    if torch.isnan(param).any() or torch.isinf(param).any():
        print(f"NaN/Inf detected in {name}")
```

出现 NaN/Inf 的常见原因：
1. 学习率过大 → 降低 lr 或加大 warmup
2. 梯度爆炸 → 降低 max_norm 或加大梯度裁剪
3. 除零 → 检查 loss 计算中的分母
4. FP16 下溢 → 增大 eps 或换 BF16

---

## 六、精度与性能权衡总结

| 方案 | 训练速度 | 显存占用 | 精度损失 | 适用卡型 |
|-----|---------|---------|---------|---------|
| FP32（基准）| 1× | 1× | 0 | 任何 |
| FP16 + Loss Scale | 1.5~2× | 0.5× | 极小 | V100/A100 |
| **BF16（推荐）** | **1.5~2×** | **0.5×** | **极小** | **A800/A100** |
| BF16 + Grad Checkpoint | 1.2~1.5× | 0.2~0.3× | 极小 | A800/A100 |

### 核心结论
- 有 A800 → **无脑 BF16**，关掉 Loss Scaling，开启 Gradient Checkpointing
- 有 V100 → FP16 + 动态 Loss Scaling + Gradient Checkpointing
- 显存不够 → 先开 Gradient Checkpointing，再考虑减小 batch
