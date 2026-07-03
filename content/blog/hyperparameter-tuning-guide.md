+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = '深度学习超参数调整（Hyperparameter Tuning）完全指南'
categories = ['Hyperparameters Tuning']
tags = ['深度学习', '超参数', '调优']
+++

详解神经网络中各类超参数的含义、选择策略，以及实际训练中的调参方法论。

<!--more-->

## 一、什么是超参数

在机器学习/深度学习模型中，有两类参数：

| 类型 | 定义 | 例子 | 是否自动更新 |
|------|------|------|-------------|
| 模型参数（parameters）| 模型内部可学习的数值 | 权重、偏置 | 被优化器自动更新 |
| 超参数（hyperparameters）| 训练前由人设定的控制变量 | 学习率、batch size、网络深度 | 不会自动更新，需人为选择 |

超参数调整就是"如何最优地训练神经网络"的艺术与科学，目标就是寻找一组最优的超参数，使模型表现最好。常见自动调参方法包括：随机搜索、网格搜索、贝叶斯优化等。

## 二、神经网络包含哪些超参数

神经网络超参数通常分为三类：网络参数、优化参数、正则化参数。

### 网络结构参数

| 类别 | 超参数 | 常见选项/作用 |
|------|--------|-------------|
| 层类型 | 卷积层、全连接层、循环层、注意力层 | 决定网络结构 |
| 层数 | 1,2,…n | 控制深度和表达能力 |
| 神经元/通道数 | 卷积核数量、全连接节点数 | 决定每层容量 |
| 卷积核大小 | 3×3, 5×5, 7×7 | 控制局部感受野 |
| 激活函数 | ReLU, LeakyReLU, GELU, Sigmoid, Tanh | 引入非线性 |
| 层间连接 | 串接、残差、跳跃、注意力 | 控制信息流和梯度传播 |
| 池化 | 最大池化、平均池化、步长 | 降维和特征不变性 |
| 嵌入维度 | Embedding size | 决定特征表示维度 |
| 注意力参数 | 多头数量、Transformer 层数 | 控制全局信息交互 |

### 优化参数

| 类别 | 超参数 | 常见选项 |
|------|--------|---------|
| 学习率 | lr | 固定、衰减、cosine annealing、warm-up |
| 优化器 | 类型 | SGD, Adam, AdamW, RMSProp |
| 批次大小 | batch size | 16, 32, 64, 128... |
| 训练轮数 | epochs | 控制训练迭代次数 |
| 动量 | momentum | 0~1，平滑梯度更新 |
| 梯度裁剪 | clip threshold | 防止梯度爆炸 |
| 损失函数参数 | Focal Loss γ、α | 调整损失敏感度 |

### 正则化参数

| 类别 | 超参数 | 作用 |
|------|--------|------|
| 权重衰减 | L2 正则化系数 | 降低过拟合 |
| 丢弃率 | Dropout 0~1 | 随机屏蔽神经元 |
| 数据增强 | 翻转、裁剪、旋转、颜色扰动 | 提升泛化能力 |
| 早停 | patience | 防止训练过度拟合 |
| EMA | 指数移动平均权重 | 平滑模型参数 |

![超参数分类总览](/images/hyper-tuning-1.png)

## 三、如何选择激活函数

| 场景 | 推荐 |
|------|------|
| 二分类输出层 | Sigmoid（配合 Binary Cross-entropy） |
| 隐藏层（不确定时）| ReLU（首选） |
| 死神经元问题 | Leaky ReLU |
| 大模型/Transformer | GELU |

**ReLU 的优势**：负值区域导数为 0，带来稀疏激活效果，训练更快且缓解梯度消失，但可能导致死神经元问题。

**Leaky ReLU**：允许负值有一个很小的斜率（如 0.01），避免神经元完全不更新。

![常见激活函数对比](/images/hyper-tuning-2.png)

## 四、如何调整 Batch Size

### 大 Batch vs 小 Batch

| 特性 | 小 Batch | 大 Batch |
|------|---------|---------|
| 训练速度 | 较慢 | 较快（GPU 利用率高） |
| 梯度噪声 | 高 → 有利于跳出局部最优 | 低 → 轨迹平滑 |
| 泛化能力 | 更好 | 可能下降 |
| 收敛所需 epoch | 较少 | 较多 |

### 经验取值

一般用 32/64 的倍数调整。当显存不够时，可以通过**梯度累积**模拟更大的 batch：

```
有效 batch = train_batch_size × gradient_accumulate_every
```

![Batch Size 影响](/images/hyper-tuning-3.png)

## 五、如何调整学习率

学习率是模型的首要且最主要的参数之一。扩散模型通常对学习率比较敏感，`1e-4` 是常见的起始值。

学习率与模型损失的关系曲线由三个区域组成：

1. **太慢区**：学习率过小，几乎不学习
2. **最陡下降区**：最佳或接近最佳的学习率
3. **发散区**：学习率过大，loss 开始震荡或发散

![学习率与 Loss 关系](/images/hyper-tuning-4.png)

### 推荐策略

- 迭代前期：学习率较大，步长长，快速梯度下降
- 迭代后期：逐步减小学习率，减小步长，更容易接近最优解

![训练 Loss 曲线](/images/hyper-tuning-5.png)

## 六、实战示例

以下是一个 Diffusion Model 的训练部署：

```python
train_batch_size = 16
train_lr = 1e-4
train_num_steps = 100000
gradient_accumulate_every = 1
ema_update_every = 16
ema_decay = 0.995
adam_betas = (0.9, 0.99)

# optimizer & scheduler
self.opt = Adam(diffusion_model.parameters(), lr=train_lr, betas=adam_betas)
self.scheduler = CosineAnnealingLR(self.opt, T_max=10000, eta_min=0)
```

### 关键参数解读

| 参数 | 值 | 含义 |
|------|-----|------|
| `train_lr = 1e-4` | 学习率 | Diffusion 常见起始值 |
| `train_num_steps = 100000` | 总步数 | 太少→未充分训练，太多→可能过拟合 |
| `gradient_accumulate_every = 1` | 梯度累积 | 每步更新一次，不做累积 |
| `ema_decay = 0.995` | EMA 衰减 | 接近 1 → 更平滑，保留长期历史 |
| `adam_betas = (0.9, 0.99)` | Adam 动量 | 对生成模型训练稳定性较好 |

### CosineAnnealingLR 公式

```math
lr_t = η_min + ½(lr_initial − η_min)(1 + cos(tπ / T_max))
```

- 初期快速收敛，中期慢慢减小学习率防止过冲
- 有助于生成模型的稳定性和收敛质量

![Cosine Annealing 示意图](/images/hyper-tuning-6.png)

## 七、为什么 Validation Loss 会升高

| 原因 | 解释 |
|------|------|
| 过拟合 | 训练集学得太细，验证集误差变大 |
| 学习率过高 | 参数更新震荡，导致 loss 波动 |
| 验证集随机性 | Diffusion loss 里有随机噪声采样，存在波动 |
| batch size 太小 | 统计不稳定导致波动 |
| 模型 capacity 大 | 参数多时过拟合更明显 |

**Diffusion 训练的特性**：每步随机采样 noise level，Loss 本身带随机性，会自然震荡，不会线性下降，是波浪式下降。

![Loss 震荡阶段分析](/images/hyper-tuning-7.png)

## 八、总结

1. 超参数分为**网络结构、优化、正则化**三大类
2. 激活函数默认选 ReLU，有死神经元换 Leaky ReLU
3. Batch size 在显存允许下尽量大，配合梯度累积
4. 学习率从 `1e-4` 或 `5e-4` 开始 sweep，配合 Cosine Annealing + Warmup
5. Diffusion 模型不要只看 loss，最终要看**生成效果**
