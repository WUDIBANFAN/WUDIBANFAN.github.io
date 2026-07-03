+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = '学习率 Warmup 预热策略笔记'
categories = ['Hyperparameters Tuning']
tags = ['深度学习', 'Learning Rate', 'Warmup']
+++

关于深度学习中 Warmup 预热策略的整理，包括为什么需要预热、Constant 和 Gradual 两种方式、以及常见的 Linear/Cosine Warmup 方法。

<!--more-->

## 一、什么是 Warmup

Warmup（预热）这个概念最早在 ResNet 论文里提出。简单说就是：训练刚开始时不直接用预设的大学习率，而是先用一个很小的学习率跑一段时间，让模型"适应"一下，再切回正常学习率。

为什么需要这样做？因为训练刚开始的时候，模型权重是随机初始化的，梯度方向非常不稳定。如果一上来就用大学习率，很容易让训练发散或震荡。先小步走几步，等模型稍微稳定了再加速。

## 二、学习率设定的几个要点

在聊 Warmup 之前，先说一下学习率本身的一些经验：

| 学习率 | 可能的结果 |
|--------|-----------|
| 太小 | 收敛极慢，或者根本不收敛 |
| 太大 | 在最优解附近来回跳，或者直接发散 |
| 适中 | 正常收敛 |

虽然理论上学习率过大/过小都会收敛，只是速度不同，但实际上经常出现学习率不对就完全不收敛的情况——目前还没有一个通用理论能完全解释清楚。

一些实践经验：

- **初始学习率**：不需要一上来就追求最优精度，先选一个收敛速度快、精度可接受的 lr，快速迭代调其他参数
- **样本量变化**：数据量不变时一般不用调 lr；如果扩充了数据集，需要重新评估
- **后期降低**：训练后期把 lr 降下来更容易找到局部最优，可以同时增大 batch size 让训练更稳定
- **babysitting 策略**：盯着验证集的精度曲线，精度不涨了就手动降 lr，再继续跑
- **常见取值**：`1e-05`、`2e-05`、`5e-05`；从头训练可以从 `0.01` 开始试

## 三、Warmup 的两种实现方式

### Constant Warmup

最简单的做法：前 N 个 steps 用小学习率，达到某个条件后直接切成大学习率。

Yann LeCun 团队的 ResNet 论文里就用了这个方法：110 层的 ResNet 在 CIFAR-10 上训练时，先用 `lr=0.01` 训练到训练误差低于 80%（大约 400 steps），然后切到 `lr=0.1` 继续训练。

**缺点**：学习率从很小突然跳到大，切换瞬间训练误差可能会突然增大。

![Constant Warmup](/images/warmup-1.png)

### Gradual Warmup

2018 年 Facebook 提出了改进方案：不要突然跳，而是每个 step 线性增大一点点，平滑地从最小 lr 过渡到目标 lr。

核心逻辑很简单：

```python
import numpy as np

warmup_steps = 2500
init_lr = 0.1
max_steps = 15000

for train_steps in range(max_steps):
    if train_steps < warmup_steps:
        # 预热阶段：线性增长
        warmup_percent = train_steps / warmup_steps
        learning_rate = init_lr * warmup_percent
    else:
        # 预热结束后开始衰减
        learning_rate = learning_rate ** 1.0001  # 近似指数衰减
```

这个实现的好处是过渡完全平滑，不会在切换点产生 loss 跳变。

## 四、三种常见 Warmup 方法

### Constant Warmup

lr 从极小值线性增长到预设值后保持不变。

![Constant Warmup](/images/warmup-1.png)

### Linear Warmup

lr 从极小值线性增长到预设值后，再线性减小回去。整体是一个三角波形状。

![Linear Warmup](/images/warmup-2.png)

### Cosine Warmup

当前大模型训练的事实标准。lr 先线性预热到目标值，然后按余弦函数平滑衰减。前半段下降慢、后半段加速下降，末端平滑趋近于 0。

![Cosine Warmup](/images/warmup-3.png)

三种方法放在一起对比：

![Warmup 对比](/images/warmup-4.png)

## 五、实际训练中的配置

在目前的深度学习框架里，Warmup 基本上和 Cosine Annealing 绑定使用，已成标配：

```python
from transformers import get_cosine_schedule_with_warmup

scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=1000,      # 预热步数，通常为总步数的 1%~5%
    num_training_steps=100000    # 总训练步数
)
```

或者用 PyTorch 原生：

```python
from torch.optim.lr_scheduler import CosineAnnealingLR

# 先手动实现 warmup 的增长阶段，再接入 CosineAnnealingLR
scheduler = CosineAnnealingLR(optimizer, T_max=100000, eta_min=1e-6)
```

## 六、我的理解

Warmup 本质上是在解决"冷启动"的问题。模型刚开始训练时跟一张白纸差不多，直接上大学习率就像刚学车就踩地板油——容易失控。先慢慢加速，等方向稳了再放开跑，这个直觉挺好理解的。

结合之前写过的学习率调度笔记来看，完整的训练学习率策略是：

> **Warmup（预热加速）→ Cosine Annealing（余弦衰减）→ 末端小幅微调**

这个组合在现在的 LLM 预训练和多模态大模型里几乎成了标配，覆盖了 90% 以上的场景。
