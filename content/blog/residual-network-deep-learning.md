+++
date = '2026-07-13T19:00:00+08:00'
draft = false
title = '残差网络（ResNet）：让深度神经网络真正走向深度'
categories = \['Deep Learning Fundamentals']
tags = \['深度学习', 'ResNet', '残差连接', 'CNN', '网络退化', 'Skip Connection']
+++

深层网络易出现梯度消失与性能退化，难以训练。残差连接引入跨层直通链路，支撑超深网络稳定训练，有效提升模型表征能力。

<!--more-->

***

## 一、从"深度"说起

神经网络又被称为深度学习，从名字就能看出"深度"的重要性。所谓深度，就是指神经网络中隐藏层的个数或层数。从理论上讲，层数越深，网络能够学习的特征就越抽象、越复杂，表达能力也就越强。

但实际情况却并非如此简单。在残差连接被发明之前，神经网络的层数一度被限制在 20 层左右。一旦层数太深，网络反而无法正常训练了。这在很大程度上限制了神经网络的表达能力，甚至让人们对深度学习的潜力产生了怀疑。

残差连接的发明彻底改变了这一局面。它让神经网络迅速突破了 100 层的大关，带来了前所未有的表达能力，可以说真正让神经网络走向了繁荣时代。

***

## 二、CNN 架构演进：层数越来越深

要理解残差连接的重要性，我们需要先回顾一下 CNN 架构的演进历史。这段历史清晰地展示了"加深网络"这条路线的发展脉络。

### 2.1 LeNet-5（1998）

杨立昆（Yann LeCun）发布的 LeNet 第五版本，奠定了 CNN 的基础范式：**卷积 + 池化 + 全连接**。这个网络大约只有 5 层，虽然结构简单，但已经能够识别支票和信封上的手写数字，具有实际的商业应用价值。

### 2.2 AlexNet（2012）

AlexNet 在 ImageNet 大赛上横空出世，最大的突破是**使用 GPU 做训练**，大大加速了计算过程。网络层数提升到了 8 层，图像识别错误率从 26% 骤降到 15%，领先第二名约 10 个百分点，震惊了整个学术界。

### 2.3 VGGNet（2014）

VGGNet 将网络做得更深，达到了 16 层甚至 19 层。研究者发现，使用更小的卷积核（3×3）堆叠，比使用大卷积核效果更好，同时参数量也更可控。错误率进一步下降，证明了"加深网络"的有效性。

### 2.4 GoogLeNet（2014）

GoogLeNet（Inception）大约有 22 层，图像识别 Top-5 错误率降到了 6.67%。它引入了 Inception 模块，通过多尺度卷积并行处理，在增加深度的同时控制了计算量。

### 2.5 演进规律

从早期 CNN 的演进可以清晰地看到一个规律：**层数越深，网络能够表达的视觉概念就越复杂，图像识别的错误率就越低**。这让研究者们相信，继续加深网络是正确的方向。

***

## 三、网络退化：层数越深反而越差？

既然层数越深效果越好，那继续加深网络层数不就行了？然而，当研究者们尝试将网络加深到 50 层以上时，却发现了一个令人震惊的现象。

**实验结果显示**：20 层的 CNN 反而比 56 层的训练效果更好，而且这个现象不仅在测试集上出现，在训练集上也是如此。这完全违背了"网络越深表达能力越强"的直觉。

### 3.1 这不是过拟合

很多人第一反应是：层数越深效果越差，这是过拟合吗？

**答案是：不是过拟合。**

过拟合的典型特征是训练集和测试集的表现出现分化：

- 训练集上越训越好，损失持续下降
- 测试集上先好后差，损失先降后升
- 两者表现明显不一致

但这正是过拟合的"反义词"——网络在训练集和测试集上都表现糟糕。

### 3.2 这是网络退化

研究者们将这种现象命名为**网络退化（Degradation）**。其典型特征是：

- 随着层数加深，训练集上的错误率反而上升
- 测试集上的错误率同样上升
- 整个网络的学习能力在"退化"

这听起来非常反常识。让我们仔细思考一下：

> 假设一个浅层网络已经把错误率降到了 10%。如果在它后面新加一些层，即使这些新层"什么都不干"——输入是 X，输出还是 X（这叫恒等映射）——那整个网络的效果应该至少和浅层网络一样好才对。怎么会层数越深，效果反而越差呢？

### 3.3 为什么恒等映射这么难？

问题的关键在于：**对于深度神经网络，"什么都不做"（恒等映射）其实是一个非常难的学习任务**。

网络中的每一层都包含复杂的运算：卷积操作、BatchNorm 归一化、ReLU 非线性激活等。这些运算组合在一起，形成了一个高度非线性的变换。要让经过这么多层复杂运算后的输出恰好等于输入，对网络权重的要求极高。

换句话说，网络需要通过精细调整数百万个参数，使得最终输出"恰好"与输入相等。这比让网络学习一个有用的特征映射还要难。

这就解释了为什么层数加深会导致效果变差：**网络被迫学习一个极其困难的恒等映射，而不是专注于学习有用的特征**。随着层数增加，这个问题的严重程度也随之加剧。

***

## 四、残差连接的核心思路

面对网络退化问题，何凯明等人提出了一个巧妙而简单的解决方案：残差连接。

核心思路是：

> **不要让网络学习完整的输出映射，而是学习输出与输入之间的差距（残差）。**

### 4.1 直观理解：打高尔夫球

假设你站在离球洞 350 米的地方打球：

- **普通网络的思路**：试图一杆直接把球打进洞——这相当于学习"输入到输出的完整映射"，难度极高。
- **残差网络的思路**：每次只学"离目标还差多少"——第一杆打 300 米，还差 50 米；第二杆学打 45 米，还差 5 米；第三杆学打 4 米……每一杆只需要学"差距"，渐渐就能接近目标。

这正是机器学习中 **Boosting（梯度提升树）** 的核心思想：每个弱学习器只学习预测值与真实值之间的差距（残差），通过多个弱学习器的接力，逐渐逼近目标。

### 4.2 数学表达

普通网络的学习目标是：

$$y = F(x)$$

网络需要学习从输入 $x$ 到输出 $y$ 的完整映射。

残差网络将其改写为：

$$y = F(x) + x$$

即：

$$F(x) = y - x$$

网络只需要学习 $F(x)$，也就是**残差**——"输出与输入之间的差距"。

### 4.3 为什么学习残差更容易？

关键洞察在于：如果输入 $x$ 已经接近目标输出 $y$，那么残差 $F(x) = y - x$ 就接近于 0。

**让网络输出接近 0 非常简单**：只需要把所有卷积层的权重初始化为接近 0，输出就会接近 0。这远比让网络输出恰好等于输入要容易得多。

换句话说：

- 学习恒等映射：需要精细调整参数，使复杂运算后输出等于输入——极难
- 学习残差（接近 0）：只需让权重接近 0 即可——非常简单

这就是残差连接的核心优势：**把一个困难的学习任务，转化为一个简单的学习任务**。

***

## 五、ResNet 架构详解

理解了残差连接的原理后，我们来看看它在 ResNet 中是如何具体实现的。

### 5.1 整体结构

ResNet 的整体架构与传统 CNN 类似：

```
输入图像 → Stem（初始卷积） → Stage 1 → Stage 2 → Stage 3 → 全局平均池化 → 全连接 → 输出
```

每个 Stage 包含多个残差块（Residual Block），残差块内部实现了残差连接。

### 5.2 Basic Block（基础残差块）

对于较浅的网络（如 ResNet-18、ResNet-34），使用的是 Basic Block：

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

**关键设计要点**：

- 主路径学习的是残差 $F(x)$，而非完整映射
- 通过 skip connection（跳跃连接/捷径连接）把输入 $x$ 直接传到输出端
- 主路径输出与跳跃连接相加后，再进行 ReLU 激活

### 5.3 下采样时的处理

当进入新的 Stage 时，通常需要：

- 空间尺寸减半（通过 stride=2 实现）
- 通道数翻倍（增加特征表达能力）

此时，跳跃连接的输入 $x$ 与主路径输出的尺寸不匹配，需要对 $x$ 也做相应变换：

```python
if stride != 1 or in_channels != out_channels:
    shortcut = nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride)
    shortcut = nn.BatchNorm2d(out_channels)
```

使用 1×1 卷积调整通道数，同时通过 stride 调整空间尺寸。

### 5.4 Bottleneck（瓶颈结构）

对于深层网络（ResNet-50、ResNet-101、ResNet-152），使用 Bottleneck 结构来降低计算量：

```
输入：256×56×56
  │
  ↓
1×1 卷积，通道降到 64 → 64×56×56  （压缩）
  │
  ↓
3×3 卷积，stride=1/2 → 64×56×56 或 64×28×28  （特征提取）
  │
  ↓
1×1 卷积，通道升回 256 → 256×56×56 或 256×28×28  （恢复）
```

**为什么叫 Bottleneck？** 因为结构呈"瓶颈"形状：中间细（64 通道），两头粗（256 通道）。

**计算量对比**（以 256 通道为例）：

- 两个 3×3 卷积：$2 \times 3 \times 3 \times 256 \times 256 \approx 1.18 \times 10^6$ 次运算
- Bottleneck：$1 \times 1 \times 256 \times 64 + 3 \times 3 \times 64 \times 64 + 1 \times 1 \times 64 \times 256 \approx 0.07 \times 10^6$ 次运算

Bottleneck 将计算量降低了约 **17 倍**，使得超深网络的训练变得可行。

***

## 六、全局平均池化（Global Average Pooling）

在最后一个 Stage 之后，ResNet 使用全局平均池化替代传统的展平操作。

### 6.1 作用

假设最后一个 Stage 输出的特征图尺寸为 $C \times H \times W$（C 个通道，每个通道是一个 H×W 的特征图）。全局平均池化对每个通道求平均值，将每个特征图压缩成一个标量：

```
输入：C × H × W（C 个特征图）
输出：C × 1 × 1（C 个数字）
```

### 6.2 优点

- **大幅减少参数量**：传统方法需要先展平（$C \times H \times W$ 个节点），再接全连接层，参数量巨大。全局平均池化后只有 C 个节点，后续全连接层参数量大幅降低。
- **正则化效果**：平均操作引入了一定随机性，有助于防止过拟合。
- **对空间位置不敏感**：无论目标出现在图像的哪个位置，都能被正确识别。

***

## 七、残差连接与 Transformer

残差连接的影响远不止于 CNN。它是 Transformer 架构的核心组件之一。

在 Transformer 中，每个子层（如 Self-Attention、Feed-Forward Network）外面都包裹着：

```
Add & Norm
```

- **Add**：残差连接，即 $output = x + \text{SubLayer}(x)$
- **Norm**：层归一化（LayerNorm 或 RMSNorm）

可以说，理解残差连接是理解 Transformer 以及几乎所有现代深度学习架构的基础。无论是 BERT、GPT 系列，还是最近的 LLaMA、Mistral 等大模型，残差连接都是不可或缺的组成部分。

***

## 八、代码实现要点

### 8.1 Basic Block 实现

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class BasicBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        # 第一层卷积：可能需要下采样
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, 
                               stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        
        # 第二层卷积：保持尺寸不变
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, 
                               stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        
        # 跳跃连接：如果尺寸或通道数变化，需要调整
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, 
                          stride=stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )
    
    def forward(self, x):
        # 主路径：两次卷积 + BatchNorm + ReLU
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        
        # 残差连接：加上跳跃连接
        out += self.shortcut(x)
        
        # 最后再做 ReLU
        out = F.relu(out)
        return out
```

### 8.2 ResNet 整体结构

```python
class ResNet(nn.Module):
    def __init__(self, block, num_blocks, num_classes=10):
        super().__init__()
        self.in_channels = 16
        
        # Stem 阶段：初始特征提取
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, stride=1, 
                               padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(16)
        
        # 三个 Stage，通道数递增，尺寸递减
        self.layer1 = self._make_layer(block, 16, num_blocks[0], stride=1)
        self.layer2 = self._make_layer(block, 32, num_blocks[1], stride=2)
        self.layer3 = self._make_layer(block, 64, num_blocks[2], stride=2)
        
        # 全局平均池化 + 全连接分类器
        self.avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(64, num_classes)
    
    def _make_layer(self, block, out_channels, num_blocks, stride):
        layers = []
        # 第一个 block 可能需要下采样
        layers.append(block(self.in_channels, out_channels, stride))
        self.in_channels = out_channels
        
        # 后续 block 保持尺寸不变
        for _ in range(1, num_blocks):
            layers.append(block(out_channels, out_channels, stride=1))
        
        return nn.Sequential(*layers)
    
    def forward(self, x):
        # Stem
        out = F.relu(self.bn1(self.conv1(x)))
        
        # 三个 Stage
        out = self.layer1(out)
        out = self.layer2(out)
        out = self.layer3(out)
        
        # 全局平均池化 + 全连接
        out = self.avg_pool(out)
        out = out.view(out.size(0), -1)
        out = self.fc(out)
        return out
```

***

## 九、总结

### 残差连接解决什么问题？

**深度神经网络的退化问题**——层数过深时，网络学习能力反而下降，训练集和测试集效果都变差。

### 核心思路是什么？

> **让网络学习在已有基础上的增量（残差），而不是从零开始学习完整映射。**

如果输入已经接近目标，只需学习微小的修正量，这比学习完整的输出要容易得多。

### 一句话概括

> **残差连接让深层网络可以方便地学习恒等映射，从而突破层数限制，实现真正意义上的"深度"学习。**

***

## 十、影响与意义

ResNet 论文自 2015 年发表以来，被引用次数已超过 **20 万次**，是人工智能领域被引用最多的论文之一，甚至超过了 Transformer 的开山之作《Attention Is All You Need》。

**深远影响**：

- 图像分类错误率降至 **3.57%**，首次超越人类水平（约 5%）
- 网络层数从 20 多层突破到 **152 层**，甚至可以达到 1000 层以上
- 残差连接成为深度学习的"标配"，从 CNN 到 Transformer，从计算机视觉到自然语言处理，几乎所有现代深度学习架构都在使用

**值得骄傲的是**：ResNet 的四位作者都是华人，其中何凯明教授的贡献尤为卓著。这项成果是中国学者对人工智能领域的重大贡献。

***

## 参考

- [Deep Residual Learning for Image Recognition (CVPR 2015)](https://arxiv.org/abs/1512.03385)
- 何凯明、张祥雨、任少卿、孙剑，微软亚洲研究院

