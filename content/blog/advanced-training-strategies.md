+++
date = '2026-07-02T12:00:00+08:00'
draft = false
title = '进阶训练策略（Advanced Training Strategies）'
categories = ['Hyperparameters Tuning']
tags = ['Two-Stage Training', 'Layer Decay', 'Early Stopping', '深度学习']
+++


> Two-Stage Training · LR Layer Decay · Early Stopping · 权重初始化

---

**【写在前面】**
前面的笔记覆盖了训练的基础功，这节是"进阶篇"。当你有了稳定的训练流程后，这些技巧往往是从 "SOTA-2%" 追到 "SOTA" 的关键。每一种都是学术界和工业界反复验证过的涨点手段。

---

## 一、Two-Stage 训练策略（两阶段训练）

### 1.1 核心思想
大感知模型通常由两部分组成：
- 预训练的**"视觉主干网络"**（VLM Encoder / ResNet / ViT）
- 任务特定的**"解码器/头"**（Occ Decoder / Detection Head / Segmentation Head）

**Two-Stage 策略**：
- **Stage 1**：冻结主干，只训练解码器
- **Stage 2**：解冻全部，全模型微调

### 1.2 为什么这样做

**Stage 1 的动机**：
- 主干网络是预训练的（如 CLIP / DINOv2 / EVA），已经学到通用的视觉表征
- 解码器是随机初始化的，需要先"追上"主干的知识水平
- 如果一开始全模型训练，解码器的巨大梯度会"污染"预训练好的主干权重
- 暂冻主干 → 保护预训练知识 → 让解码器稳定收敛

**Stage 2 的动机**：
- 解码器收敛后，主干和解码器"对齐"了
- 此时解冻主干，让整个模型针对下游任务做联合优化
- 学习率需要大幅降低（避免破坏预训练知识）

### 1.3 实现细节

```python
# Stage 1: 冻结主干，只训练 head
for name, param in model.named_parameters():
    if 'backbone' in name or 'encoder' in name:
        param.requires_grad = False  # 冻结

optimizer = AdamW(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=1e-3  # head 可以用较大 lr
)
# 训练 N1 个 epoch

# Stage 2: 全模型微调
for param in model.parameters():
    param.requires_grad = True

optimizer = AdamW([
    {'params': model.backbone.parameters(), 'lr': 1e-5},   # 主干小 lr
    {'params': model.head.parameters(), 'lr': 1e-4}        # head 中 lr
], weight_decay=0.05)
# 训练 N2 个 epoch（通常 N2 < N1）
```

### 1.4 适用场景
1. VLM 作为主干 + 特定任务解码器（Occ/Detection/Seg）
2. 多模态大模型（文本主干冻结 + 视觉/动作头训练）
3. UniDriveVLA 类模型（已有强预训练，下游微调）

### 1.5 Stage 切换时机
- 观察 Stage 1 的验证指标：当 val loss 趋于平缓时切换
- 或者预设固定比例（如 Stage1 占 60% 训练，Stage2 占 40%）
- **Stage 2 的学习率一般设为 Stage 1 的 1/10 或更低**

### 1.6 变体：渐进式解冻（Progressive Unfreezing）
不是一次性解冻全部主干，而是从浅到深逐层解冻：
- 第 1 轮：只训练 head
- 第 2 轮：解冻最后 1 层 backbone + head
- 第 3 轮：解冻最后 2 层 backbone + head
- ...

比一次性解冻更稳定，但实现更繁琐。

---

## 二、学习率分层衰减（LR Layer Decay）

### 2.1 核心思想
不同层的学习率不同：
- **浅层**（靠近输入）：用小学习率，**保护通用特征**
- **深层**（靠近输出）：用大学习率，**鼓励任务特化**

### 2.2 为什么需要分层
- 浅层学到的是低级通用特征（边缘、纹理、颜色）→ 几乎所有任务都需要
- 深层学到的是高级语义特征 → 需要针对当前任务调整
- Fine-tuning 时如果不做分层：
  - lr 太大 → 浅层通用特征被破坏，过拟合
  - lr 太小 → 深层学不到任务特定信息，拟合不充分

### 2.3 实现方式

```python
def get_layer_decay_param_groups(model, base_lr, layer_decay_rate):
    """
    layer_decay_rate: 衰减因子，如 0.9
    第 i 层 lr = base_lr * (layer_decay_rate)^(depth - i - 1)
    最后一层 lr = base_lr（最大）
    第一层 lr = base_lr * layer_decay_rate^(depth-1)（最小）
    """
    layers = list(model.encoder.layers)  # Transformer layers
    depth = len(layers)
    
    param_groups = []
    for i, layer in enumerate(layers):
        lr = base_lr * (layer_decay_rate ** (depth - i - 1))
        param_groups.append({
            'params': layer.parameters(),
            'lr': lr
        })
    
    # head 学习率最大
    param_groups.append({
        'params': model.head.parameters(),
        'lr': base_lr
    })
    
    return param_groups

optimizer = AdamW(
    get_layer_decay_param_groups(model, base_lr=5e-4, layer_decay_rate=0.9),
    weight_decay=0.05
)
```

### 2.4 典型参数

| layer_decay_rate | 效果 | 场景 |
|-----------------|------|------|
| 0.95 | 轻微分层，接近统一 lr | 数据集与预训练相似 |
| **0.90** | **中等分层，标准值** | **一般 fine-tuning** |
| 0.85 | 较强分层 | 任务与预训练差异大 |
| 0.80 | 强分层 | 全新任务，极少用 |

### 2.5 实践经验
- BEiT、BEiT-3、EVA 等视觉大模型 fine-tuning 标准使用 layer decay
- 与 Two-Stage 结合：Stage 2 中再引入 layer decay
- `layer_decay_rate` 越小 → 浅层越受保护 → 越不容易过拟合

---

## 三、早停（Early Stopping）

### 3.1 核心思想
在训练过程中持续监控验证集指标，当指标不再提升时停止训练，防止过拟合，并自动选出最佳 checkpoint。

### 3.2 为什么大模型也需要早停
- 大模型容量大，训练太久必然过拟合
- 尤其下游任务数据量有限时，过拟合来得更早
- 早停 = 自动确定最优训练轮数

### 3.3 实现

```python
class EarlyStopping:
    def __init__(self, patience=5, min_delta=0.001, mode='max'):
        self.patience = patience      # 容忍多少个 epoch 不涨
        self.min_delta = min_delta    # 最小提升阈值
        self.mode = mode              # 'max' 指标越大越好, 'min' 越小越好
        self.counter = 0
        self.best_score = None
        self.best_epoch = 0
    
    def __call__(self, score, epoch, model, save_path):
        if self.best_score is None:
            self.best_score = score
            self._save(model, save_path)
            return False
        
        if self.mode == 'max':
            improved = score > self.best_score + self.min_delta
        else:
            improved = score < self.best_score - self.min_delta
        
        if improved:
            self.best_score = score
            self.best_epoch = epoch
            self.counter = 0
            self._save(model, save_path)  # 保存最佳模型
            return False  # 不停止
        else:
            self.counter += 1
            if self.counter >= self.patience:
                print(f"Early stopping at epoch {epoch}")
                return True  # 停止训练
            return False
    
    def _save(self, model, path):
        torch.save(model.state_dict(), path)
```

### 3.4 监控指标选择
- 分类任务：val accuracy / val F1
- 检测任务：val mAP / val NDS
- Occ/分割任务：val mIoU / val NDS
- 多任务：选择主要指标，或用加权平均

### 3.5 调参建议
- `patience=5~10`（别太小，允许指标正常波动）
- `min_delta=0.001~0.005`（别太大，否则忽略真实提升）
- 配合学习率调度：早停前降低 lr 再冲一波
- 不要只依赖早停，还是要设计合理的 total_epochs

---

## 四、权重初始化（Weight Initialization）

### 4.1 为什么权重初始化重要
不恰当的初始化会导致：
1. **梯度消失**：激活值/梯度在深层逐渐趋于 0
2. **梯度爆炸**：激活值/梯度在深层指数级增长
3. **激活坍缩**：输出集中到某个值，网络失效

### 4.2 Transformer 初始化方案

**Xavier/Glorot 初始化**（均匀/正态）：
- 用于没有非线性激活的层（如 Attention 投影层）
- 保持前向和反向传播方差一致

**Kaiming/He 初始化**（正态）：
- 用于 ReLU 激活后的层

**小方差正态初始化（Truncated Normal）**：
- 标准 Transformer 实现常用
- `std = 0.02`，截断到 ±2σ 范围

```python
def init_transformer_weights(module):
    if isinstance(module, nn.Linear):
        # 线性层用小方差正态
        torch.nn.init.trunc_normal_(module.weight, std=0.02)
        if module.bias is not None:
            torch.nn.init.zeros_(module.bias)
    elif isinstance(module, nn.LayerNorm):
        # LayerNorm 用 1 和 0
        torch.nn.init.ones_(module.weight)
        torch.nn.init.zeros_(module.bias)
    elif isinstance(module, nn.Embedding):
        # Embedding 用小方差正态
        torch.nn.init.normal_(module.weight, std=0.02)

model.apply(init_transformer_weights)
```

### 4.3 深层模型的特殊处理
对于 24 层以上的深层 Transformer，建议减小初始化方差：

```python
# 层数越深，初始化方差越小
def get_init_std(layer_idx, total_layers, base_std=0.02):
    # 深层用更小方差，防止激活累积放大
    return base_std / math.sqrt(2 * (layer_idx + 1) / total_layers)
```

或者使用 T-Fixup 等无需 warmup 的初始化方案（学术方向，工业较少用）。

### 4.4 预训练权重加载
- 加载预训练权重后，未匹配的层需要合理初始化
- 新增的 head/decoder 层建议用 Xavier 或截断正态
- **不要对预训练权重做二次初始化！**

### 4.5 初始化验证（Diagnostics）

```python
# 验证初始化是否合理
with torch.no_grad():
    x = torch.randn(2, 3, 224, 224)  # 样例输入
    y = model(x)
    print(f"Output mean: {y.mean():.4f}, std: {y.std():.4f}")
```

期望：`mean ≈ 0`, `std` 适中（0.1~2.0）
- 如果 std→0：梯度消失风险
- 如果 std→∞：梯度爆炸风险

---

## 五、综合策略建议

针对 UniDriveVLA 类大感知模型的进阶训练管线：

### Stage 1（冻结主干）
- [ ] 冻结 VLM encoder
- [ ] 只训练 Occ decoder/head
- [ ] lr = 1e-3（head 可以用大 lr）
- [ ] 训练至收敛（约 30%~50% 总 epochs）
- [ ] 使用早停监控 val NDS

### Stage 2（全模型微调）
- [ ] 解冻全部参数
- [ ] 使用 LR Layer Decay（`layer_decay_rate=0.9`）
- [ ] lr = 1e-4（base），浅层 lr = 1e-4×0.9^depth
- [ ] 训练至收敛或早停
- [ ] 配合 EMA 保存最终权重

### 通用设置
- [ ] 权重初始化：新增 head 用 trunc_normal(std=0.02)
- [ ] LayerNorm/bias 初始化为 1/0
- [ ] 全程监控 val 指标，保存最佳 checkpoint

---

## 六、总结

这些进阶技巧的核心思想是**"精细化控制"**：
- **Two-Stage** → 保护预训练知识，分段优化
- **LR Layer Decay** → 不同层不同 lr，浅层保守深层激进
- **Early Stopping** → 自动找最优 checkpoint，不过拟合
- **权重初始化** → 从源头保证训练稳定性

> 每个技巧单独用效果有限，组合使用才能真正从 95% 追到 98%。
