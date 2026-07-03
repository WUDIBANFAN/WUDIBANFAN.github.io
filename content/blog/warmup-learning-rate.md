+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = '学习率 Warmup 预热策略详解'
categories = ['Hyperparameters Tuning']
tags = ['Warmup', 'Learning Rate', '深度学习', '训练技巧']
+++

详细讲解深度学习中 Warmup 预热策略的原理、类型、代码实现，以及学习率设定的关键考量。

<!--more-->

## 一、Warmup 定义

Warmup（预热）是在 ResNet 论文中提出的一种学习率预热方法。它在训练开始时先使用一个较小的学习率，训练一定 epochs 或 steps 后，再切换到预设的大学习率进行训练。

## 二、学习率相关

### 学习率设定的理论

| 情况 | 理论上 | 实际上 |
|------|--------|--------|
| 学习率过小 | 收敛过慢 | 不收敛 |
| 学习率过大 | 错过局部最优 | 不收敛 |

还没有通用理论来解释为什么会造成这种情况。

### 设定学习率的方法

1. **初始阶段**：选择一个合适的学习率——不一定是能取得最好精度的学习率，而是精度虽有些下降但收敛速度更快的学习率。这样可以省下时间去调其他参数。

2. **样本容量影响**：样本容量不变的情况下一般不需要再调整学习率；若扩充了样本容量，则需要重新考虑。

3. **最终阶段降低学习率**（babysitting）：在验证集上精度不再提升时降低学习率，更容易找到局部最优。可以同时增加 batch size 使训练更稳定。

4. **常见学习率取值**：`1e-05`，`2e-05`，`5e-05`。从头训练可以从 `0.01` 开始试。

## 三、Warmup 的作用

### Constant Warmup

由于刚开始训练时，模型的权重是随机初始化的，此时若选择一个较大的学习率，可能带来模型的不稳定（振荡）。选择 Warmup 预热学习率的方式，可以使开始训练的几个 epochs 内学习率较小，模型慢慢趋于稳定后再用预设学习率训练，收敛速度更快，效果更佳。

**Example**：ResNet 论文中使用 110 层 ResNet 在 CIFAR-10 上训练时，先用 0.01 的学习率训练直到训练误差低于 80%（约 400 steps），然后使用 0.1 的学习率进行训练。

### Gradual Warmup

Constant warmup 的不足：从很小的学习率一下跃变为较大的学习率可能导致训练误差突然增大。Facebook 在 2018 年提出了 Gradual Warmup 来解决这个问题——从最小学习率开始，每个 step 线性增大，直到达到预设的最大学习率。

Gradual Warmup 的实现逻辑：

```python
import numpy as np

warmup_steps = 2500
init_lr = 0.1
max_steps = 15000
learning_rate = init_lr

for train_steps in range(max_steps):
    if warmup_steps and train_steps < warmup_steps:
        warmup_percent_done = train_steps / warmup_steps
        warmup_learning_rate = init_lr * warmup_percent_done
        learning_rate = warmup_learning_rate
    else:
        # 预热结束后，学习率衰减
        learning_rate = learning_rate ** 1.0001  # 近似指数衰减
```

## 四、常见 Warmup 方法

### 4.1 Constant Warmup

学习率从非常小的数值线性增加到预设值后保持不变：

![Constant Warmup](/images/warmup-1.png)

### 4.2 Linear Warmup

学习率从非常小的数值线性增加到预设值后，再线性减小：

![Linear Warmup](/images/warmup-2.png)

### 4.3 Cosine Warmup

学习率先从很小的数值线性增加到预设学习率，然后按照 cos 函数值进行衰减：

![Cosine Warmup](/images/warmup-3.png)

### Warmup 方法对比

![Warmup 对比](/images/warmup-4.png)

## 五、总结

1. Warmup 是解决训练初期模型不稳定的有效方法
2. **Constant warmup**：简单但可能在切换时产生误差跳变
3. **Gradual warmup**：平滑过渡，更推荐使用
4. 常用组配：**Linear Warmup + Cosine Annealing**（大模型训练事实标准）
5. Warmup 步数通常设为总步数的 1%~5%
