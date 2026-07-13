+++
date = '2026-07-12T18:00:00+08:00'
draft = false
title = '残差网络（ResNet）：让深度神经网络真正走向深度'
categories = ['Deep Learning Fundamentals']
tags = [ 'ResNet', 'Residual Connection', 'CNN',  'Skip Connection']
+++

深层网络易出现梯度消失与性能退化，难以训练。残差连接引入跨层直通链路，支撑超深网络稳定训练，有效提升模型表征能力。

<!--more-->
神经网络的核心优势在于 "深度"—— 层数越深，表达能力越强。但在残差连接被发明之前，神经网络层数一度被限制在 20 层左右。为什么层数太深反而训练不好？残差连接是如何解决这个问题的？笔记从 CNN 架演进讲起，深入解析残差网络的原理与实现。
---

## 一、从"深度"说起

神经网络又被称为深度学习。从名字就能看出"深度"的重要性。

**所谓深度**，就是指神经网络中隐藏层的个数或层数。理论上，层数越深，表达能力越强。但实际情况呢？

在残差连接被发明之前，神经网络的层数一度被限制在 **20 层左右**。层数太深就无法训练了，这很大程度上限制了神经网络的表达能力，甚至让人们对神经网络的能力产生怀疑。

残差连接发明之后，神经网络迅速突破了 **100 层**，带来了更强的表达能力，可以说让神经网络走向了繁荣。

---

## 二、CNN 架构演进：层数越来越深

### 2.1 LeNet-5（1998）

杨立昆（Yann LeCun）发布的 LeNet 第五版本，奠定了 CNN 的基础范式：

**卷积 + 池化 + 全连接**

大约 5 层左右，用于识别支票和信封上的手写数字。

### 2.2 AlexNet（2012）

在 ImageNet 大赛上诞生，最大意义是**使用 GPU 做训练**。网络层数提升到 **8 层**，图像识别错误率从 26% 降到 15%，领先第二名约 10 个百分点。

### 2.3 VGGNet（2014）

网络更深，达到 **16 层甚至 19 层**，错误率进一步下降。

### 2.4 GoogLeNet（2014）

大约 **22 层**，图像识别 Top-5 错误率降到 6.67%。

### 2.5 演进规律

从早期 CNN 演进可以看出规律：层数越深，能够表达的视觉概念就越复杂，图像识别错误率就越低。

---

## 三、网络退化：层数越深反而越差？

既然层数越深效果越好，那继续加深网络层数不就行了？

**但实验结果令人震惊**：20 层的 CNN 反而比 56 层的训练效果更好，无论在训练集还是测试集上都如此。

### 3.1 这不是过拟合

很多人第一反应是：层数越深效果越差，这是过拟合吗？

**不是。**

过拟合的典型特征是：
- 训练集上越训越好
- 测试集上先好后差
- 训练集和测试集表现**不一致**

### 3.2 这是网络退化

网络退化的典型特征：
- 随着层数加深，训练集和测试集**表现都差**
- 网络能力在退化，而非过拟合

这听起来很反常识：

> 一个浅层网络已经把错误率降到 10% 了，新加的层即使什么都不干（恒等映射：输入 X，输出还是 X），效果也应该和浅层一样。怎么会层数越深效果越差呢？

### 3.3 为什么恒等映射很难？

对于深度神经网络，"什么都不做"（恒等映射）是一个非常难的任务。

网络层包含卷积、BatchNorm、ReLU 等复杂变换，要让输出恰好等于输入，对权重的要求极高——需要经过复杂运算才能让两者"恰好相等"。

---

## 四、残差连接的核心思路

残差连接的思路很简单：

> **不要学完整的输出，而是学输出和输入之间的差距（残差）。**

### 4.1 类比：打高尔夫

假设离球洞 350 米：

- **普通思路**：一杆直接打进洞（学完整映射）
- **残差思路**：每次只学"离目标还差多少"

第一杆打 300 米，还差 50 米；第二杆学 45 米，还差 5 米……每一杆只学差距，渐渐地就能拟合。

这正是机器学习中 **Boosting（梯度提升）** 的核心思路：每个模型学的是预测值和真实值之间的差距。

### 4.2 残差连接公式

普通网络：

$$F(x) = \text{输出}$$

残差网络：

$$F(x) = H(x) - x$$

其中 $H(x)$ 是真实输出，$x$ 是输入。

最终输出：

$$H(x) = F(x) + x$$

网络只学 $F(x)$（残差），即"对输入的修正量"。

### 4.3 为什么学习残差更容易？

如果输入和输出已经很接近，残差 $F(x) \approx 0$。

让网络输出接近 0 很简单：把所有卷积层权重初始化为接近 0 即可。这比让输出恰好等于输入容易得多。

---

## 五、ResNet 架构详解

### 5.1 整体结构

```
输入图像 → Steam（初始卷积） → Stage 1 → Stage 2 → Stage 3 → 全局平均池化 → 全连接 → 输出
```

每个 Stage 包含多个残差块（Residual Block）。

### 5.2 Basic Block（基础残差块）

用于较浅的网络（18/34 层）：

```
输入 x ─────────────────────────────────┐
  │                                      │
  ↓                                      │
卷积 3×3, stride=1                       │
  │                                      │
  ↓                                      │
BatchNorm + ReLU                         │
  │                                      │
  ↓                                      │
卷积 3×3                                 │
  │                                      │
  ↓                                      │
BatchNorm                                │
  │                                      │
  ↓                                      │
  ├──────────────────────────────────────┤
  ↓                                      ↓
               F(x) + x（相加）
                      │
                      ↓
                    ReLU
                      │
                      ↓
                    输出
```

**关键点**：
- 学习的是残差 $F(x)$
- 通过 skip connection（跳跃连接）把输入 $x$ 直接传过来
- 相加后再做 ReLU 激活

### 5.3 下采样处理

进入新的 Stage 时，需要：
- 空间尺寸减半（stride=2）
- 通道数翻倍

此时输入 $x$ 和残差 $F(x)$ 尺寸不匹配，需要对 $x$ 也做下采样：

```python
if stride != 1 or in_channels != out_channels:
    shortcut = nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride)
    shortcut = nn.BatchNorm2d(out_channels)
```

### 5.4 Bottleneck（瓶颈结构）

用于深层网络（50/101/152 层），目的是**降低计算量**。

```
输入：256×56×56
  │
  ↓
1×1 卷积，通道降到 64 → 64×56×56
  │
  ↓
3×3 卷积，stride=1/2 → 64×56×56 或 64×28×28
  │
  ↓
1×1 卷积，通道升回 256 → 256×56×56 或 256×28×28
```

**特点**：中间细两头粗，像瓶颈，所以叫 Bottleneck。

**计算量对比**（以 256 通道为例）：
- 两个 3×3 卷积：$2 \times 3 \times 3 \times 256 \times 256 \approx 1.18 \times 10^6$
- Bottleneck：$1 \times 1 \times 256 \times 64 + 3 \times 3 \times 64 \times 64 + 1 \times 1 \times 64 \times 256 \approx 0.07 \times 10^6$

计算量降低约 **17 倍**。

---

## 六、全局平均池化（Global Average Pooling）

最后一个 Stage 输出的是一组高层特征图（如 512×7×7）。

全局平均池化的作用：**把每个通道压缩成一个数字**。

```
输入：C × H × W（C 个特征图）
输出：C × 1 × 1（C 个数字）
```

具体操作：对每个通道求平均值，得到一个标量。

**优点**：
- 大幅减少参数量（无需展平大量节点）
- 引入一定随机性，起到正则化效果

---

## 七、残差连接与 Transformer

残差连接不仅用于 CNN，更是 Transformer 的核心组件。

Transformer 每个子层都有：

```
Add & Norm
```

- **Add**：残差连接，即 $x + F(x)$
- **Norm**：LayerNorm 或 RMSNorm

理解残差连接，是理解 Transformer 乃至所有深度神经网络的基础。

---

## 八、代码实现要点

### 8.1 Basic Block

```python
class BasicBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )
    
    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)  # 残差连接
        out = F.relu(out)
        return out
```

### 8.2 ResNet 整体结构

```python
class ResNet(nn.Module):
    def __init__(self, block, num_blocks, num_classes=10):
        super().__init__()
        self.in_channels = 16
        
        # Steam 阶段
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(16)
        
        # 三个 Stage
        self.layer1 = self._make_layer(block, 16, num_blocks[0], stride=1)
        self.layer2 = self._make_layer(block, 32, num_blocks[1], stride=2)
        self.layer3 = self._make_layer(block, 64, num_blocks[2], stride=2)
        
        # 全局平均池化 + 全连接
        self.avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(64, num_classes)
    
    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.layer1(out)
        out = self.layer2(out)
        out = self.layer3(out)
        out = self.avg_pool(out)
        out = out.view(out.size(0), -1)
        out = self.fc(out)
        return out
```

---

## 九、总结

### 残差连接解决什么问题？

**深度神经网络的退化问题**——层数过深反而效果变差。

### 核心思路

> 让网络学习**在已有基础上的增量（残差）**，而不是从零开始学习完整映射。

### 一句话概括

> **残差连接让深层网络可以方便地学习恒等映射，从而突破层数限制。**

---

## 十、影响与意义

ResNet 论文被引用次数超过 **20 万次**，是人工智能领域被引用最多的论文之一（甚至超过 Transformer 的《Attention Is All You Need》）。

**影响力**：
- 图像分类错误率降到 **3.57%**，超越人类水平（约 5%）
- 网络层数从 20 多层突破到 **152 层**
- 不仅用于 CNN，更是 Transformer、大模型、强化学习等所有深度学习架构的基础组件

**值得骄傲的是**：ResNet 的四位作者都是华人，其中何凯明教授贡献卓著。

---

## 参考

- [Deep Residual Learning for Image Recognition (CVPR 2015)](https://arxiv.org/abs/1512.03385)
- 何凯明等，微软亚洲研究院