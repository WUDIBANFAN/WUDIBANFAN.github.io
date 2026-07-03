+++
date = '2026-07-02T12:00:00+08:00'
draft = false
title = '数据与正则化（Data & Regularization）'
categories = ['Hyperparameters Tuning']
tags = ['深度学习', '正则化', '数据增强']
+++

整理了 Dropout/DropPath、EMA、数据增强、MixUp/CutMix 和类别均衡等正则化与数据层面的技巧。

<!--more-->

> Dropout/DropPath · EMA · 数据增强 · 类别均衡

---

**【写在前面】**
模型过拟合是深度学习的"头号敌人"，尤其在 Occ 体素任务中，数据量有限但模型参数量大，过拟合几乎是必然的。正则化和数据增强是两把对抗过拟合的利器，这节笔记把核心技巧讲透。

---

## 一、Dropout 与 DropPath

### 1.1 Dropout 原理
训练时以概率 p 随机"丢弃"（置零）一部分神经元，迫使每个神经元学习更鲁棒、不依赖特定其他神经元的特征。

### 1.2 Transformer 中的 Dropout 位置
1. **Attention Dropout**：注意力权重上随机置零
2. **Hidden Dropout**：FFN 隐层输出上随机置零
3. **Embedding Dropout**：输入 embedding 上随机置零

典型配置：
- `attention_dropout = 0.1`
- `hidden_dropout = 0.1`
- `embedding_dropout = 0.0`（一般不做，破坏语义）

### 1.3 DropPath（Stochastic Depth）
随机"跳过"整个 Transformer 层（将整层输出置为 0，走残差直接传递），相比 Dropout 是更粗粒度的正则化。

> **本质**：训练时随机丢弃整层，相当于隐式训练了不同深度的子网络（类似 ensemble）。

### 1.4 为什么大模型需要 DropPath
- 层数越多，越容易过拟合
- DropPath 迫使浅层也能学到有用特征（不能依赖深层"兜底"）
- 对深层 Transformer（24 层以上）效果特别显著

### 1.5 DropPath 的取值策略
通常不是所有层统一概率，而是**线性递增**：

```
drop_path_rate(l) = drop_path_rate_max × (l / total_layers)
```

直觉：浅层特征更重要（后面层都依赖它），丢弃概率小；深层特征更抽象/冗余，丢弃概率大。

```python
# 常见实现
drop_path_rates = [rate * (i / (depth - 1)) for i in range(depth)]
```

典型值：
| 模型规模 | drop_path_rate |
|---------|---------------|
| 小模型（12 层）| 0.1 |
| 大模型（24 层）| 0.1~0.2 |
| 超大模型（48 层+）| 0.2~0.3 |

### 1.6 注意事项
- 推理时关闭所有 Dropout/DropPath
- 训练模式：`model.train()` → 启用
- 推理模式：`model.eval()` → 禁用
- Dropout 和 weight_decay 有协同效应，可以同时使用

---

## 二、EMA（指数移动平均模型权重）

### 2.1 什么是 EMA
训练过程中维护一套"平滑版"的模型权重：

```
ema_weight = decay × ema_weight + (1 - decay) × current_weight
```

`decay` 通常非常接近 1（如 0.999~0.9999），意味新权重只有微小贡献。

### 2.2 为什么 EMA 能涨点
训练中的单步权重有噪声（随机梯度带来的抖动），EMA 通过对多步权重做加权平滑，得到更稳定的"共识"权重。

> 类比：10 个人同时画一条直线，取所有人的平均比单人的更直。EMA 就是"取多次迭代的平均权重"。

### 2.3 为什么感知任务（检测/分割/Occ）中 EMA 提升显著
- 感知任务对细节敏感（如小物体边界）
- 训练后期的权重波动会反映在预测结果的不稳定上
- EMA 平滑后，预测结果更一致，精度自然上涨

### 2.4 实现

```python
class EMAModel:
    def __init__(self, model, decay=0.9999):
        self.model = model
        self.decay = decay
        self.shadow = {}
        # 深拷贝初始权重
        for name, param in model.named_parameters():
            if param.requires_grad:
                self.shadow[name] = param.data.clone()
    
    def update(self):
        for name, param in self.model.named_parameters():
            if param.requires_grad:
                new_val = (self.decay * self.shadow[name] 
                          + (1 - self.decay) * param.data)
                self.shadow[name] = new_val.clone()
    
    def apply_shadow(self):
        # 推理前：用 EMA 权重替换模型权重
        for name, param in self.model.named_parameters():
            if name in self.shadow:
                param.data.copy_(self.shadow[name])
```

### 2.5 调参建议
| decay | 适应速度 | 使用场景 |
|-------|---------|---------|
| 0.999 | 快速适应 | 短训练（<10 epochs）|
| **0.9999** | **标准** | **长训练（数十 epochs）** |
| 0.99999 | 极慢适应 | 超大模型长时间训练 |

- 训练初期可设较小 decay（热身），后期增大

---

## 三、数据增强（Data Augmentation）

### 3.1 为什么数据增强是"免费午餐"
- 不增加标注成本
- 不增加模型参数
- 不增加推理开销
- 效果 ≈ 数据量翻倍
- **防止过拟合最经济的手段**

### 3.2 图像增强（视觉模型必备）

**(1) 几何变换**：
- 随机翻转（RandomFlip）：水平/垂直翻转，最基础最有效
- 随机裁剪（RandomCrop/RandomResizedCrop）：截取子区域
- 随机旋转（RandomRotation）：±10~30 度
- 随机缩放（RandomScale）：0.8~1.2 倍

**(2) 颜色变换**：
- 色彩抖动（ColorJitter）：亮度、对比度、饱和度、色调微调
- 随机灰度（RandomGrayscale）：模拟黑白场景
- 高斯模糊（GaussianBlur）：模拟运动模糊或失焦

典型参数（轻量化）：

```python
from torchvision import transforms
transform = transforms.Compose([
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, 
                           saturation=0.2, hue=0.1),
    transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
])
```

### 3.3 体素 Occ 任务特有的增强

体素 Occupancy 任务输入是 3D 空间，增强方式不同：

1. **坐标随机扰动**：
   - 对标定误差/传感器噪声的模拟
   - 体素坐标加入随机高斯噪声（`std=1~5cm`）

2. **体素随机丢弃/遮挡**：
   - 模拟激光雷达部分遮挡场景
   - 随机 mask 掉 5%~20% 的体素

3. **随机平移/旋转**：
   - 点云做小幅刚性变换

4. **GT-A 采样（Ground Truth Augmentation）**：
   - 把其他场景的真值物体"粘贴"到当前帧
   - 增加稀有类别出现频率
   - 对于 Occ 任务中的小物体检测极其有效

### 3.4 增强强度控制
"增强强度"是一个连续谱：
- 太弱：效果不明显，仍然过拟合
- **适中：最佳泛化能力**
- 太强：训练数据失真，模型学不到有效特征

> 经验法则：增强后的图像人眼仍然能辨认出原物体 → 强度合适

---

## 四、MixUp 与 CutMix

### 4.1 MixUp 原理
将两张样本按比例混合：

```
x_mix = lambda * x_a + (1-lambda) * x_b
y_mix = lambda * y_a + (1-lambda) * y_b
```

`lambda` 从 `Beta(alpha, alpha)` 采样，alpha 通常 0.2~0.5。

### 4.2 CutMix 原理
在一张图上随机切一块，用另一张的对应区域填充，标签按面积比例混合。

### 4.3 对多模态输入的特殊考虑
多模态模型（如 UniDriveVLA）有图像 + LiDAR + 文本等多路输入，MixUp/CutMix 需要保证**所有模态同步混合**：

- 图像 MixUp → 对应的 LiDAR 点云也按相同 lambda 混合
- 跨模态不一致会导致模型学到错误关联
- 建议对每个 batch 内的样本 pair 做同时混合

### 4.4 适用与不适用场景

**适用**：
- 分类任务：效果显著，几乎是标配
- 感知任务（检测/分割/Occ）：谨慎使用，可涨点但可能引入伪影

**不适用**：
- 文本生成（GPT 类）：混合语义无意义
- 强化学习：状态空间混合无物理意义

### 4.5 调参建议
- `alpha=0.2`（弱混合）适合大模型
- `alpha=0.5`（中等混合）适合小模型
- 训练早期可以用，后期关闭（让模型在纯净数据上精细收敛）

---

## 五、类别均衡加权（Class Weighting）

### 5.1 Occ 体素任务的核心痛点
在 Occupancy 预测中，体素类别分布极度不均衡：
- "空"类别占比 **> 95%**
- "路面"占比 **~3%**
- "车辆/行人/小物体"占比 **< 1%**

> 如果不做均衡，模型会学到"全都预测为空"也能得到 95% 准确率，但对小物体的预测完全失败。

### 5.2 解决方案：Class Weight 加权 Loss

```python
# 统计训练集中各类别出现频率
class_counts = [空_数量, 路面_数量, 车辆_数量, 行人_数量, ...]
# 计算权重（反比于频率）
class_weights = 1.0 / (class_counts / class_counts.sum())
# 归一化
class_weights = class_weights / class_weights.sum()

# 在损失函数中使用
criterion = nn.CrossEntropyLoss(weight=class_weights)
```

### 5.3 其他均衡策略

**(1) Focal Loss**：
针对容易分类的样本降低 loss 权重，让模型更关注难样本（通常是小物体）

```
FL(p_t) = -alpha_t * (1-p_t)^gamma * log(p_t)
```

gamma=2 时，p=0.9 的样本 loss 缩小到原来的 1/100

**(2) Oversampling / Undersampling**：
- 过采样稀有类别样本，降采样常见类别样本
- 但可能引入冗余/浪费数据

**(3) 损失函数组合**：
- CrossEntropy + DiceLoss（分割常用）或 Lovasz-Softmax
- 多损失函数联合优化

### 5.4 调参经验
- 先用 `class_weight` 做 baseline
- 效果不够好时尝试 Focal Loss（`gamma=2, alpha=0.25`）
- Occ 任务常用组合：**weighted CE + Lovasz-Softmax**
- 计算 class_weight 时注意不要过度补偿（权重比 >100:1 可能导致不稳定）

---

## 六、综合正则化策略建议

针对 Occ 体素任务的正则化组合推荐（按优先级）：

### 高优先级（必须做）
- [ ] Dropout + DropPath（`attention_drop=0.1`, `drop_path_rate=0.1~0.2`）
- [ ] 类别均衡加权（class_weight 或 Focal Loss）
- [ ] 基础图像增强（翻转 + 色彩抖动）
- [ ] Weight Decay（AdamW, wd=0.05）

### 中优先级（强烈推荐）
- [ ] EMA（decay=0.9999）
- [ ] 体素坐标扰动
- [ ] GT-A 采样

### 低优先级（可选，视情况）
- [ ] MixUp / CutMix
- [ ] 体素随机遮挡

---

## 七、总结

正则化和数据增强是大模型训练的"护城河"，没有它们模型再大也过拟合。核心记忆点：

- **DropPath** 对深层 Transformer 尤其重要
- **EMA** 是推理涨点的"瑞士军刀"，几乎无成本
- **Occ 任务必须做类别均衡**，否则小物体永远预测不出来
- **数据增强**是唯一不增加推理成本的优化手段
