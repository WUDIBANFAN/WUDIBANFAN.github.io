+++
date = '2026-07-10T14:12:00+08:00'
draft = false
title = '多层感知机'
categories = ['Deep Learning Fundamentals']
tags = ['多层感知机', 'MLP', '激活函数', '过拟合', 'Dropout', '权重衰减', '反向传播', '数值稳定性']
+++

MLP是第一个真正的深度网络，本文梳理了隐藏层与非线性激活函数，正则化（权重衰减、暂退法）、数值稳定性与初始化、环境与分布偏移。

<!--more-->

## 一、多层感知机（MLP）

### 1.1 为什么需要隐藏层

线性模型（如 Softmax 回归）只能表达仿射变换，隐含了"单调性"假设：某个特征增大，输出一定同向变化。这在很多场景下不成立：

- 收入与还款概率相关但不线性（收入 0→5 万的影响，远大于 100 万→105 万）；
- 体温与死亡率呈 U 形（高于/低于 37℃ 风险走向相反）；
- 图像分类中，单个像素强度与"猫/狗"几乎无单调关系。

解决方法：在网络中加入一个或多个**全连接隐藏层**，把前 `L-1` 层看作"表示"，最后一层看作线性预测器。这种架构称为**多层感知机（Multilayer Perceptron, MLP）**。

从几何视角理解会更好：线性模型的决策边界永远是一个超平面（一条直线、一个平面在高维空间的推广），它只能把空间"一刀切"。而现实中的类别边界往往非常复杂——比如"猫"和"狗"在像素空间中的分布是高度交缠的，没有任何一个超平面能干净地分开。隐藏层的作用，本质上就是**先在低维输入空间学出一组新的、更有判别力的特征（表示），再在这些特征之上做线性分类**。也就是说，前几层负责"把数据变换到一个更容易分类的空间"，最后一层负责"画那条分界线"。这也是为什么深度学习常被形容为"表示学习（representation learning）"——模型自己学会了用什么特征去做判断，而不再依赖人工设计的特征。

这里还有一个常见的误区值得强调：**网络的"深度"和"宽度"不是一回事**。深度指层数，宽度指每层的神经元个数。很多人直觉上觉得"神经元越多、容量越大"，但理论上单隐藏层只要足够宽就能逼近任意函数（见 1.3 通用近似定理），实践中却几乎没人这么做——原因有三：(1) 宽而浅的网络参数量爆炸式增长，训练效率极低；(2) 深而窄的网络能用更少的总参数表达同样复杂的函数，每一层只做一点点非线性变换，层层叠加反而更容易优化；(3) 层级结构天然契合很多真实数据的组合性质（比如图像先识别边缘→纹理→部件→物体）。

> 若只有线性层堆叠，仿射函数的仿射函数仍是仿射函数，等价于单层线性模型，没有任何增益。想想 `softmax + 隐藏层 = MLP` 这个关系即可。换句话说，**没有非线性激活函数的"多层"网络，在数学上和"单层"完全等价**，多加的层数只是徒增计算量。

{{< image src="/images/MLP1.png" alt="一个单隐藏层的多层感知机，具有5个隐藏单元" caption="图：单隐藏层 MLP 架构，4 个输入节点、5 个隐藏单元、3 个输出节点" >}}

单隐藏层 MLP 的矩阵形式（`X` 为 `n×d`，`H` 为 `n×h`，`O` 为 `n×q`）：

```text
H = X W^{(1)} + b^{(1)}
O = H W^{(2)} + b^{(2)}
```

若不加非线性，上式可合并为 `O = X(W^{(1)}W^{(2)}) + (b^{(1)}W^{(2)} + b^{(2)})`，又退化成线性模型。注意这里的合并是关键：两次矩阵乘法 `XW⁽¹⁾` 和 `HW⁽²⁾` 可以合并成一次 `X(W⁽¹⁾W⁽²⁾)`，所以无论堆多少层线性变换，最终都只是"一个"线性变换。这正说明了——**非线性不是锦上添花，而是 MLP 之所以为"深度"模型的必要条件**。


### 1.2 激活函数（关键）

在隐藏层后逐元素施加**非线性激活函数**，使 MLP 无法退化成线性模型：

```text
H = σ(X W^{(1)} + b^{(1)})
O = H W^{(2)} + b^{(2)}
```

激活函数的输出称为"活性值（activations）"。σ 通常按元素操作（一次计算一个样本的一个神经元），大多数激活函数都如此。

为什么必须"按元素"操作也很关键：如果激活函数是像矩阵乘法那样把整层神经元混合在一起，那它本质上又是一次线性变换，又无法提供非线性。按元素（逐点）作用意味着每个神经元独立地通过一个一维非线性函数，正是这种"逐点的非线性"把每层变成非线性的，又避免了引入相邻神经元之间的纠缠。

**如何在这三个激活函数之间做选择？** 有一条清晰的现代经验法则：
- **隐藏层默认用 ReLU**（及其变体如 Leaky ReLU、PReLU、GELU）。理由后文（8.1 节）会解释——sigmoid 和 tanh 在输入绝对值较大时梯度趋近于 0，多层叠加后极易梯度消失，而 ReLU 在正区间梯度恒为 1，能让信号顺畅地反向传播；同时它计算上只是一次 `max` 比较，没有任何指数运算，速度极快。
- **sigmoid 主要用在输出端**：当我们需要把输出解释为"概率"，且类别互斥时，sigmoid（二分类）或 softmax（多分类）是自然的封装。但在隐藏层里，sigmoid 的"饱和区梯度消失"是致命短板。
- **tanh 偶尔用于特定架构**（如早期 RNN、某些归一化场景），因为它关于原点对称的输出在均值上更利于后续层的稳定，但同样有梯度消失问题，现代深度网络里已基本被 ReLU 系取代。

下面先看三个激活函数的公式与性质，再用代码把它们画出来。

**ReLU**（修正线性单元）——最受欢迎，实现简单、导数友好：

```text
ReLU(x) = max(x, 0)
```

- 仅保留正元素，负元素置 0；
- 导数：输入为负时为 0，为正时为 1，在 0 处不可导（默认取 0）；
- 优点：不做指数运算、速度快，且缓解了梯度消失。

```python
import torch
from d2l import torch as d2l

x = torch.arange(-8.0, 8.0, 0.1, requires_grad=True)
y = torch.relu(x)
d2l.plot(x.detach(), y.detach(), 'x', 'relu(x)', figsize=(5, 2.5))

y.backward(torch.ones_like(x), retain_graph=True)
d2l.plot(x.detach(), x.grad, 'x', 'grad of relu', figsize=(5, 2.5))
```

{{< image src="/images/MLP2.png" alt="ReLU 函数" caption="图：ReLU 函数图像，正区间线性增长，负区间恒为零" >}}
{{< image src="/images/MLP3.png" alt="ReLU 的梯度" caption="图：ReLU 函数的梯度，正区间恒为 1，负区间恒为 0" >}}

**sigmoid**——把输入压缩到 `(0, 1)`，可视为 Softmax 的特例，常用于二分类输出层：

```text
sigmoid(x) = 1 / (1 + exp(-x))
导数 = sigmoid(x) * (1 - sigmoid(x))
```

- 输入为 0 时导数最大（0.25），远离 0 时导数趋于 0（易梯度消失），故隐藏层已较少使用。

```python
y = torch.sigmoid(x)
d2l.plot(x.detach(), y.detach(), 'x', 'sigmoid(x)', figsize=(5, 2.5))

x.grad.data.zero_()
y.backward(torch.ones_like(x), retain_graph=True)
d2l.plot(x.detach(), x.grad, 'x', 'grad of sigmoid', figsize=(5, 2.5))
```

{{< image src="/images/MLP4.png" alt="sigmoid 函数" caption="图：sigmoid 函数图像，将输入平滑压缩到 (0, 1) 区间" >}}
{{< image src="/images/MLP5.png" alt="sigmoid 的梯度" caption="图：sigmoid 的梯度，在输入为零处达到最大值 0.25，两端快速衰减至零（易梯度消失）" >}}

**tanh**（双曲正切）——把输入压缩到 `(-1, 1)`，关于原点对称：

```text
tanh(x) = (1 - exp(-2x)) / (1 + exp(-2x))
导数 = 1 - tanh^2(x)
```

- 输入接近 0 时导数接近最大值 1；输入远离 0 时导数趋于 0。可看作"平滑版的阶跃函数"/sigmoid 的中心对称版本。

```python
y = torch.tanh(x)
d2l.plot(x.detach(), y.detach(), 'x', 'tanh(x)', figsize=(5, 2.5))

x.grad.data.zero_()
y.backward(torch.ones_like(x), retain_graph=True)
d2l.plot(x.detach(), x.grad, 'x', 'grad of tanh', figsize=(5, 2.5))
```

把三者放在一起比较，会发现一个共同的规律：**激活函数的"非线性强度"和它的"梯度健康度"往往是矛盾的**。阶跃函数（纯非线性）几乎处处梯度为 0，完全无法训练；sigmoid/tanh 把信号压缩进一个有界区间，在两端饱和、梯度消失；ReLU 在正区间"放弃"了非线性（梯度恒为 1）只在负区间置零，却恰恰换来了最健康的梯度流。这也是现代激活函数设计的核心权衡——**不要为了追求非线性而牺牲梯度的可传播性**。

还有一点值得注意：ReLU 不是"完美"的。它的负区间恒为 0 会带来两个副作用：一是训练初期大量神经元可能"死掉"（永远输出 0、梯度永远为 0，永远不再更新），二是输出不再是零均值。这正是 Leaky ReLU（负区间给一个小斜率）、PReLU（斜率可学习）、ELU、GELU 等变体被提出的原因——它们都在"保留 ReLU 优点的同时，缓解死亡神经元问题"。不过对入门而言，理解 ReLU 本身已经足够，这些变体是后续按需了解的内容。

{{< image src="/images/MLP6.png" alt="tanh 函数" caption="图：tanh 函数图像，将输入平滑压缩到 (-1, 1) 区间，关于原点对称" >}}
{{< image src="/images/MLP7.png" alt="tanh 的梯度" caption="图：tanh 的梯度，在输入为零处达到最大值 1，两端快速衰减至零（同样存在梯度消失）" >}}

### 1.3 通用近似定理与超参数

- **通用近似定理**：即使只有一个隐藏层，给定足够多的神经元和正确的权重，MLP 可以逼近任意函数。但这不意味着应总用单隐藏层；实践中，用**更深（而非更宽）**的网络更易逼近复杂函数。
- **超参数**：隐藏层层数、各隐藏层大小（常取 2 的幂，如 256，便于内存对齐与寻址）。

对"通用近似定理"需要避免两个常见误解。第一，**"能逼近"不等于"能高效地学到"**：定理只保证"存在"一组权重可以逼近任意函数，但没说用梯度下降能找到这组权重，也没说需要的神经元数量是合理的。第二，**"能逼近任意函数"也不意味着模型会泛化**：一个足够宽的单隐藏层网络完全可以把训练集"背下来"（插值），但在没见过的数据上可能一塌糊涂。所以通用近似定理更多是"给我们信心 MLP 的表达能力足够"，而不是"告诉我们该怎么训练"。

关于"隐藏层大小常取 2 的幂"（如 64、128、256），这主要是一个工程惯例而非理论要求：GPU 等硬件在做矩阵运算时会把数据分块（tile）成 2 的幂大小的块，取 2 的幂能让内存对齐更整齐、寻址更高效；现代框架对此已相当鲁棒，取 200 还是 256 对最终精度几乎无影响，只是 256 这类数字读起来更"规整"。真正需要认真调的超参是**隐藏层数量**和**每层大小是否匹配数据复杂度**——太小会欠拟合（学不动），太大容易过拟合（记数据），这正引出下一章的模型选择问题。

## 二、MLP 的从零实现（Fashion-MNIST）

在正式写代码前，先说清楚"从零实现"的目的。d2l 故意让我们手动定义 `W1, b1, W2, b2` 并手写 `net` 函数，是为了把 MLP 的**计算过程彻底拆开给你看**：前向就是一次矩阵乘、加偏置、过激活、再过一次矩阵乘。理解了从零版本，再看高级 API 的 `nn.Sequential` 才会知道每一行在干什么，而不是把它当黑箱。所以这一章的"手写代码"本身就是学习材料。

Fashion-MNIST 是 MNIST 的"现代替代品"：同样是 28×28 灰度图，但内容是衣服鞋帽（T 恤、裤子、靴子等 10 类），比手写数字更难一点，更适合检验模型。数据集：28×28=784 像素灰度图，10 类；单隐藏层含 256 个隐藏单元（这两个都是超参数，你可以之后改 128、512 对比效果）。

数据集：28×28=784 像素灰度图，10 类；单隐藏层含 256 个隐藏单元（这两个都是超参数）。

### 2.1 初始化模型参数

```python
import torch
from torch import nn
from d2l import torch as d2l

batch_size = 256
train_iter, test_iter = d2l.load_data_fashion_mnist(batch_size)

num_inputs, num_outputs, num_hiddens = 784, 10, 256
W1 = nn.Parameter(torch.randn(num_inputs, num_hiddens, requires_grad=True) * 0.01)
b1 = nn.Parameter(torch.zeros(num_hiddens, requires_grad=True))
W2 = nn.Parameter(torch.randn(num_hiddens, num_outputs, requires_grad=True) * 0.01)
b2 = nn.Parameter(torch.zeros(num_outputs, requires_grad=True))
params = [W1, b1, W2, b2]
```

### 2.2 激活函数与模型

```python
def relu(X):
    a = torch.zeros_like(X)
    return torch.max(X, a)

def net(X):
    X = X.reshape((-1, num_inputs))
    H = relu(X @ W1 + b1)      # "@" 表示矩阵乘法
    return (H @ W2 + b2)
```

### 2.3 损失函数与训练

```python
loss = nn.CrossEntropyLoss(reduction='none')

num_epochs, lr = 10, 0.1
updater = torch.optim.SGD(params, lr=lr)
d2l.train_ch3(net, train_iter, test_iter, loss, num_epochs, updater)

d2l.predict_ch3(net, test_iter)
```

> MLP 的训练流程与 Softmax 回归完全一致，只是模型多了带激活函数的隐藏层。手动实现简单网络容易，但层数很多时会很麻烦（参数命名、记录都很繁琐）。

## 三、MLP 的简洁实现

利用高级 API（`nn.Sequential`）只需几行：

```python
import torch
from torch import nn
from d2l import torch as d2l

net = nn.Sequential(
    nn.Flatten(),
    nn.Linear(784, 256),
    nn.ReLU(),
    nn.Linear(256, 10)
)

def init_weights(m):
    if type(m) == nn.Linear:
        nn.init.normal_(m.weight, std=0.01)
net.apply(init_weights)

batch_size, lr, num_epochs = 256, 0.1, 10
loss = nn.CrossEntropyLoss(reduction='none')
trainer = torch.optim.SGD(net.parameters(), lr=lr)
train_iter, test_iter = d2l.load_data_fashion_mnist(batch_size)
d2l.train_ch3(net, train_iter, test_iter, loss, num_epochs, trainer)
```

> 与 Softmax 回归简洁实现相比，唯一区别是多了 2 个全连接层（隐藏层 + 输出层），隐藏层带 ReLU。这种模块化设计让训练逻辑可复用。

## 四、模型选择、欠拟合与过拟合

### 4.1 训练误差与泛化误差

- **训练误差**：模型在训练集上的误差。
- **泛化误差**：模型在未见过的数据上的期望误差（无法精确计算，只能用独立测试集估计）。
- 目标：发现能泛化的模式，而非"记住"训练数据（不要做成"那是鲍勃！我记得他！他有痴呆症！"）。

要真正理解欠拟合与过拟合，得先理解机器学习里最核心的一对概念——**偏差（bias）与方差（variance）**。它们刻画了"误差从哪里来"：
- **偏差**衡量模型在"假设空间"里选错了方向：比如真实规律是二次曲线，你却只用直线去拟合，那无论怎么调参数都差一大截，这就是高偏差，表现为**欠拟合**。
- **方差**衡量模型对训练数据的微小变化有多敏感：换一组训练样本，模型就学到完全不同的规律，说明它把训练集上的噪声也当成了规律，这就是高方差，表现为**过拟合**。
- 二者之和（再加一个不可避免的数据本身噪声，叫"不可约误差"）构成了总误差。理想状态是找到偏差与方差的折中（tradeoff）：模型既要够灵活（偏差低），又不能被数据噪声带跑（方差低）。

所以"训练误差低但验证误差高"这句话的深层含义是：**模型方差太大**。它把训练集的特殊性当成了普适规律。而"训练误差和验证误差都高"则意味着**模型偏差太大**，连训练集都没学好。

注意一个反直觉的事实：**训练误差低本身不是问题，甚至往往是好事**。在深度学习里，表现最好的模型通常在训练集上几乎能拟合到完美，真正要盯的是验证误差有没有跟着降下来。我们优化的是"验证误差"这个最终指标，而不是"训练误差要足够高"之类。这正是正则化（下一章）发挥作用的地方——它不追求提高训练误差，而是让模型在"记住训练数据"和"留出泛化能力"之间取得平衡。

影响泛化的因素：
1. 可调整参数数量（自由度）越大，越易过拟合；
2. 参数取值范围越大，越易过拟合；
3. 训练样本越少，越易过拟合（过拟合一个百万样本集需要极其灵活的模型）。

### 4.2 模型选择

- **验证集**：用于调超参数（隐藏层数、隐藏单元数、激活函数等），绝不能用测试集做模型选择（否则会过拟合测试集，无法判断）。
- **K 折交叉验证**：数据稀缺时，把训练集分成 K 个不重叠子集，轮流用 K-1 个训练、1 个验证，最后对 K 次结果取平均。

### 4.3 欠拟合 vs 过拟合

- **欠拟合**：训练误差和验证误差都高，且差距小 → 模型太简单，表达能力不足。
- **过拟合**：训练误差明显低于验证误差 → 模型太复杂，记住了训练数据噪声。
- 注意：过拟合不总是坏事，深度学习中最好的预测模型往往在训练数据上表现远好于验证数据；我们更关心验证误差本身。

{{< image src="/images/MLP8.png" alt="模型复杂度对欠拟合和过拟合的影响" caption="图：模型复杂度与训练/泛化损失的关系——复杂度不足导致欠拟合（两者都高），过高导致过拟合（训练低、泛化高）" >}}


**多项式回归实验**（直观验证）：用 `y = 5 + 1.2x - 3.4 x²/2! + 5.6 x³/3! + ε` 生成数据（ε~N(0,0.1)），训练集/测试集各 100 样本。

这个实验的精妙之处在于：它把"模型复杂度"这件事变得**可以精确控制**。我们让数据由三次多项式生成，然后分别用"三次（匹配真实复杂度）""一次（太简单）""二十次（太复杂）"三个模型去拟合同一批数据。由于真实函数、噪声都已知，我们可以清晰地看到复杂度不对齐时会发生什么——这正是抽象理论（偏差/方差）在可控环境下的具体演出。

- **三阶多项式拟合（正常）**：模型复杂度与真实函数匹配，训练/测试损失都低，学到的权重接近真实值 `[5, 1.2, -3.4, 5.6]`。这说明只要"假设空间"包含了真实规律，模型就能同时学好训练集和测试集。
- **线性函数拟合（欠拟合）**：无法拟合非线性模式，训练损失居高不下。即便训练集再大、训再久也没用——瓶颈在"模型能力"而非"数据量"，这是高偏差的典型特征。
- **高阶多项式拟合（过拟合）**：训练损失可降到很低，但测试损失很高——复杂模型被噪声带偏。注意这里高阶模型"能力足够"甚至"过剩"，它能把训练集的每一个噪声点都穿过去，代价是学出的曲线在两点之间剧烈震荡，对测试数据完全失效。

从这三组对比可以提炼出一条最实用的经验法则：**判断欠拟合还是过拟合，只需要盯着"训练误差"和"验证误差"这两个数**。二者都高 → 欠拟合（加复杂度）；训练低、验证高且差距大 → 过拟合（加正则化或减少复杂度）。后面所有正则化手段（权重衰减、dropout）都是为"过拟合"这一种情况准备的，而"欠拟合"只能靠更强的模型解决。

```python
import math
import numpy as np
import torch
from torch import nn
from d2l import torch as d2l

max_degree = 20
n_train, n_test = 100, 100
true_w = np.zeros(max_degree)
true_w[0:4] = np.array([5, 1.2, -3.4, 5.6])

features = np.random.normal(size=(n_train + n_test, 1))
np.random.shuffle(features)
poly_features = np.power(features, np.arange(max_degree).reshape(1, -1))
for i in range(max_degree):
    poly_features[:, i] /= math.gamma(i + 1)   # gamma(n) = (n-1)!
labels = np.dot(poly_features, true_w)
labels += np.random.normal(scale=0.1, size=labels.shape)

true_w, features, poly_features, labels = [torch.tensor(x, dtype=torch.float32)
                                           for x in [true_w, features, poly_features, labels]]

def evaluate_loss(net, data_iter, loss):
    metric = d2l.Accumulator(2)
    for X, y in data_iter:
        out = net(X)
        y = y.reshape(out.shape)
        l = loss(out, y)
        metric.add(l.sum(), l.numel())
    return metric[0] / metric[1]

def train(train_features, test_features, train_labels, test_labels, num_epochs=400):
    loss = nn.MSELoss(reduction='none')
    input_shape = train_features.shape[-1]
    net = nn.Sequential(nn.Linear(input_shape, 1, bias=False))
    batch_size = min(10, train_labels.shape[0])
    train_iter = d2l.load_array((train_features, train_labels.reshape(-1, 1)), batch_size)
    test_iter = d2l.load_array((test_features, test_labels.reshape(-1, 1)), batch_size, is_train=False)
    trainer = torch.optim.SGD(net.parameters(), lr=0.01)
    animator = d2l.Animator(xlabel='epoch', ylabel='loss', yscale='log',
                            xlim=[1, num_epochs], ylim=[1e-3, 1e2], legend=['train', 'test'])
    for epoch in range(num_epochs):
        d2l.train_epoch_ch3(net, train_iter, loss, trainer)
        if epoch == 0 or (epoch + 1) % 20 == 0:
            animator.add(epoch + 1, (evaluate_loss(net, train_iter, loss),
                                     evaluate_loss(net, test_iter, loss)))
    print('weight: ', net[0].weight.data.numpy())

# 三阶（正常）
train(poly_features[:n_train, :4], poly_features[n_train:, :4], labels[:n_train], labels[n_train:])
# 线性（欠拟合）
train(poly_features[:n_train, :2], poly_features[n_train:, :2], labels[:n_train], labels[n_train:])
# 高阶（过拟合）
train(poly_features[:n_train, :], poly_features[n_train:, :], labels[:n_train], labels[n_train:], num_epochs=1500)
```

## 五、权重衰减（L2 正则化）

最直接的正则化手段之一：在损失中加入权重向量的 L2 范数惩罚项，迫使权重保持较小。

```text
新目标 = 原损失 + (λ / 2) · ‖w‖²
```

- `λ = 0`：恢复原损失；`λ` 越大，对权重的约束越强。
- 等价的小批量 SGD 更新：`w ← (1 - ηλ) w − η·(批量梯度)`，故称"权重衰减"。
- L2（岭回归）让权重在大量特征上均匀分布；L1（套索回归）会把部分权重压到 0，实现特征选择。

**为什么"把权重变小"就能防过拟合？** 这是理解权重衰减的关键。直觉上，过拟合的模型往往是"对输入极其敏感"的——输入稍微变一点，输出就剧烈变化，说明模型在训练集某些点附近拟合出了非常陡峭的函数。这种陡峭来自权重里某些分量特别大。L2 惩罚项会**惩罚大的权重**，客观上逼迫模型学出"更平滑、更平缓"的函数：权重小 → 输出对输入的微小扰动不敏感 → 不容易被训练集噪声带偏 → 泛化更好。换句话说，正则化是在"偏好简单/平滑的模型"这一归纳偏置（inductive bias）下做选择。

另一个等价视角是**贝叶斯先验**：L2 正则相当于假设"权重服从零均值的高斯先验"，训练时我们既想拟合数据、又不想偏离这个先验太远，`λ` 就是"对先验的信心"。`λ` 越大，越相信先验、模型越保守。

需要注意两点现实细节：(1) 通常只对**权重**做衰减、**不对偏置**做衰减，因为偏置只是个平移项，对模型复杂度贡献很小，没必要约束它；(2) `λ` 是另一个超参数，需要靠验证集来选——`λ` 太小没效果（仍过拟合），太大又欠拟合（把模型压得太简单）。后面 Kaggle 实战里的 `weight_decay` 就是这个 `λ`，会用 K 折交叉验证来挑。

**下面用"高维线性回归"演示这种效果最直观**：故意把特征数（200）设得远大于样本数（20），让模型极易过拟合；对比 `λ=0`（无正则化）和 `λ=3`（有权重衰减）时权重范数与测试误差的差异。

### 5.1 从零实现（高维线性回归演示）

```python
%matplotlib inline
import torch
from torch import nn
from d2l import torch as d2l

n_train, n_test, num_inputs, batch_size = 20, 100, 200, 5
true_w, true_b = torch.ones((num_inputs, 1)) * 0.01, 0.05
train_data = d2l.synthetic_data(true_w, true_b, n_train)
train_iter = d2l.load_array(train_data, batch_size)
test_data = d2l.synthetic_data(true_w, true_b, n_test)
test_iter = d2l.load_array(test_data, batch_size, is_train=False)

def init_params():
    w = torch.normal(0, 1, size=(num_inputs, 1), requires_grad=True)
    b = torch.zeros(1, requires_grad=True)
    return [w, b]

def l2_penalty(w):
    return torch.sum(w.pow(2)) / 2

def train(lambd):
    w, b = init_params()
    net, loss = lambda X: d2l.linreg(X, w, b), d2l.squared_loss
    num_epochs, lr = 100, 0.003
    animator = d2l.Animator(xlabel='epochs', ylabel='loss', yscale='log',
                            xlim=[5, num_epochs], legend=['train', 'test'])
    for epoch in range(num_epochs):
        for X, y in train_iter:
            l = loss(net(X), y) + lambd * l2_penalty(w)
            l.sum().backward()
            d2l.sgd([w, b], lr, batch_size)
        if (epoch + 1) % 5 == 0:
            animator.add(epoch + 1, (d2l.evaluate_loss(net, train_iter, loss),
                                     d2l.evaluate_loss(net, test_iter, loss)))
    print('w的L2范数是：', torch.norm(w).item())

train(lambd=0)   # 无正则化：严重过拟合，w 的 L2 范数很大（约 13.7）
train(lambd=3)   # 权重衰减：测试误差下降，w 的 L2 范数显著减小（约 0.36）
```

### 5.2 简洁实现

框架把权重衰减集成进优化器（`weight_decay`），无需额外计算开销：

```python
def train_concise(wd):
    net = nn.Sequential(nn.Linear(num_inputs, 1))
    for param in net.parameters():
        param.data.normal_()
    loss = nn.MSELoss(reduction='none')
    num_epochs, lr = 100, 0.003
    # 只对权重做衰减，偏置不衰减
    trainer = torch.optim.SGD([
        {"params": net[0].weight, 'weight_decay': wd},
        {"params": net[0].bias}], lr=lr)
    animator = d2l.Animator(xlabel='epochs', ylabel='loss', yscale='log',
                            xlim=[5, num_epochs], legend=['train', 'test'])
    for epoch in range(num_epochs):
        for X, y in train_iter:
            trainer.zero_grad()
            l = loss(net(X), y)
            l.mean().backward()
            trainer.step()
        if (epoch + 1) % 5 == 0:
            animator.add(epoch + 1, (d2l.evaluate_loss(net, train_iter, loss),
                                     d2l.evaluate_loss(net, test_iter, loss)))
    print('w的L2范数：', net[0].weight.norm().item())

train_concise(0)
train_concise(3)
```

> 实践中默认在深层网络的所有层上应用权重衰减（简单启发式）。正则化就是在损失中加惩罚项以降低模型复杂度。

## 六、暂退法（Dropout）

### 6.1 重新审视过拟合：偏差-方差权衡

线性模型偏差高（只能表示一小类函数）、方差低（不同随机样本结果相似）。深度神经网络位于另一端，能学习特征交互，但即使样本远多于特征也可能过拟合（2017 年有研究在随机标记图像上训练，网络能完美拟合训练集，泛化差距高达 90%）。泛化性质的数学基础仍是开放问题。

换句话说，深度网络的"能力太强"本身就是双刃剑：它既包含了能完美拟合数据的复杂函数，也包含了大量能死记硬背训练噪声的脆弱函数。训练的目标变成——**在这么大的假设空间里，正好挑中那个既拟合数据又泛化的函数**。正则化就是给这个挑选过程加"引导"。

### 6.2 扰动的稳健性

"好"的模型应对输入微小变化不敏感（平滑性）。1995 年 Bishop 证明：带输入噪声的训练等价于 Tikhonov 正则化。2014 年 Srivastava 等人将此思想用于网络内部层——在前向传播中给每层注入噪声，这就是**暂退法（Dropout）**：每次迭代把当前层一些节点置零，破坏神经元间的"共适应性"（类比有性生殖破坏基因共适应）。

把 dropout 的直觉讲透一点：普通训练里，某个神经元可能"偷懒"地依赖旁边某个特定神经元才能输出正确结果——两个神经元形成了一种脆弱的"共适应（co-adaptation）"：A 负责某种特征、B 只在 A 激活时才工作。一旦部署时 B 没接到预期的 A 信号，整个预测就崩了。dropout 的逻辑是：**每次迭代都随机让一部分神经元"休假"**，逼着剩下的神经元不能依赖任何特定搭档，必须各自学到更鲁棒、更独立的特征。这就像有性生殖通过基因重组打破基因间的过度特化依赖、提升种群适应力——Srivastava 原文正是用这个生物学类比来说明 dropout 的动机。

### 6.3 实践中的 Dropout

每个中间活性值 `h` 以暂退概率 `p` 被替换为随机变量 `h'`：

```text
h' = 0      概率为 p
h' = h/(1-p) 其他情况
```

这样期望值 `E[h'] = h` 保持不变（无偏）。通常**测试时不使用 dropout**（不需要标准化；少数研究用测试时 dropout 估计预测不确定性）。

这里有个容易混淆的点值得单独说：**为什么训练时要除以 `(1-p)`？** 因为训练时随机丢弃了比例为 `p` 的神经元，活性值的整体"规模"变小了（只有 `1-p` 比例的神经元在活动）。如果不做这个缩放，训练出来的权重在测试时（所有神经元都在）会输出一个"过大"的值，导致训练和测试的分布不一致。除以 `(1-p)` 的作用，正是让"保留下来的那部分活性值"在期望上等于没丢弃时的活性值，从而**保持训练和测试时该层输出的均值一致**。这也是为什么 dropout 在训练时叫"带缩放的随机失活"、测试时直接关掉——两阶段要匹配。

实践中还有一个经验规律：**靠近输入的层用更小的 dropout 概率，靠近输出的层用更大的**。因为靠前的层特征来自数据本身、信息宝贵，丢弃太狠会直接丢掉输入信息；靠后的层是抽象的高层表示、冗余度高，可以丢得狠一些。下面代码里 `dropout1=0.2, dropout2=0.5` 就是这个思路。

{{< image src="/images/MLP9.png" alt="dropout 前后的多层感知机" caption="图：Dropout 效果示意——左为标准五隐藏单元网络，右为随机丢弃两个神经元后的稀疏网络" >}}


### 6.4 从零实现

```python
import torch
from torch import nn
from d2l import torch as d2l

def dropout_layer(X, dropout):
    assert 0 <= dropout <= 1
    if dropout == 1:
        return torch.zeros_like(X)
    if dropout == 0:
        return X
    mask = (torch.rand(X.shape) > dropout).float()
    return mask * X / (1.0 - dropout)

# 测试：暂退概率分别为 0、0.5、1
X = torch.arange(16, dtype=torch.float32).reshape((2, 8))
print(dropout_layer(X, 0.))
print(dropout_layer(X, 0.5))
print(dropout_layer(X, 1.))

# 双隐藏层 MLP，每层 256 单元
num_inputs, num_outputs, num_hiddens1, num_hiddens2 = 784, 10, 256, 256
dropout1, dropout2 = 0.2, 0.5   # 靠近输入的层 dropout 概率更低

class Net(nn.Module):
    def __init__(self, num_inputs, num_outputs, num_hiddens1, num_hiddens2, is_training=True):
        super(Net, self).__init__()
        self.num_inputs = num_inputs
        self.training = is_training
        self.lin1 = nn.Linear(num_inputs, num_hiddens1)
        self.lin2 = nn.Linear(num_hiddens1, num_hiddens2)
        self.lin3 = nn.Linear(num_hiddens2, num_outputs)
        self.relu = nn.ReLU()
    def forward(self, X):
        H1 = self.relu(self.lin1(X.reshape((-1, self.num_inputs))))
        if self.training:
            H1 = dropout_layer(H1, dropout1)
        H2 = self.relu(self.lin2(H1))
        if self.training:
            H2 = dropout_layer(H2, dropout2)
        return self.lin3(H2)

net = Net(num_inputs, num_outputs, num_hiddens1, num_hiddens2)
num_epochs, lr, batch_size = 10, 0.5, 256
loss = nn.CrossEntropyLoss(reduction='none')
train_iter, test_iter = d2l.load_data_fashion_mnist(batch_size)
trainer = torch.optim.SGD(net.parameters(), lr=lr)
d2l.train_ch3(net, train_iter, test_iter, loss, num_epochs, trainer)
```

### 6.5 简洁实现

```python
net = nn.Sequential(
    nn.Flatten(),
    nn.Linear(784, 256),
    nn.ReLU(),
    nn.Dropout(dropout1),
    nn.Linear(256, 256),
    nn.ReLU(),
    nn.Dropout(dropout2),
    nn.Linear(256, 10)
)

def init_weights(m):
    if type(m) == nn.Linear:
        nn.init.normal_(m.weight, std=0.01)
net.apply(init_weights)

trainer = torch.optim.SGD(net.parameters(), lr=lr)
d2l.train_ch3(net, train_iter, test_iter, loss, num_epochs, trainer)
```

> Dropout 只在训练期间使用；常与权重衰减结合。它把活性值 `h` 替换为期望值为 `h` 的随机变量。

## 七、前向传播、反向传播和计算图

### 7.1 前向传播

前向传播（forward pass）：按顺序（输入层→输出层）计算和存储每层结果。以带 L2 正则化的单隐藏层网络为例（隐藏层无偏置）：

```text
z = W^{(1)} x          # 中间变量
h = φ(z)               # 隐藏激活
o = W^{(2)} h          # 输出层变量
L = l(o, y)            # 单个样本损失
s = (λ/2)(‖W^{(1)}‖²_F + ‖W^{(2)}‖²_F)   # 正则项（Frobenius 范数）
J = L + s              # 目标函数
```

### 7.2 计算图

计算图（computation graph）是把数学计算过程可视化为一张有向无环图（DAG）：**正方形节点代表变量（数据、参数、中间结果），圆形节点代表操作（矩阵乘法、激活函数、损失计算等），有向边代表数据流动方向**。正向传播将输入 `x` 从左到右逐层变换为损失 `J`，反向传播则沿相反方向将梯度从损失逐层传回各个参数。以 7.1 节的单隐藏层网络为例，图中可以清晰看到：输入 `x` 先经线性变换 `W⁽¹⁾` 得到 `z`，再经激活 `φ` 得隐藏表示 `h`，最后再经一次线性变换 `W⁽²⁾` 输出 `o`；每个中间变量（`z, h, o`）都作为后续操作的输入。理解计算图的关键在于——**每个节点的梯度只依赖它下游节点的梯度乘上本节点的局部导数**，反向传播本质上就是在这张图上做一次逆向拓扑遍历，每一步的计算量很小，但整体复杂度仅与图的规模成正比。

{{< image src="/images/MLP10.png" alt="前向传播的计算图" caption="图：单隐藏层 MLP 的前向传播计算图，正方形为变量（数据/参数/中间结果），圆形为操作符（矩阵乘法、激活、损失）" >}}


### 7.3 反向传播（链式法则）

反向传播（backpropagation）：根据链式法则，按相反顺序（输出层→输入层）遍历网络计算梯度，并存储中间变量的偏导数。对单隐藏层网络，关键梯度：

```text
∂J/∂L = 1,   ∂J/∂s = 1
∂J/∂o = ∂L/∂o
∂s/∂W^{(1)} = λW^{(1)},   ∂s/∂W^{(2)} = λW^{(2)}
∂J/∂W^{(2)} = (∂J/∂o) hᵀ + λW^{(2)}
∂J/∂h = W^{(2)}ᵀ (∂J/∂o)
∂J/∂z = (∂J/∂h) ⊙ φ'(z)          # ⊙ 按元素乘法（激活按元素）
∂J/∂W^{(1)} = (∂J/∂z) xᵀ + λW^{(1)}
```

理解这套公式的关键，不在于背下每个偏导，而在于看清**反向传播的本质是"链式法则 + 动态规划"**。注意看 `∂J/∂h = W⁽²⁾ᵀ (∂J/∂o)` 和 `∂J/∂z = (∂J/∂h) ⊙ φ'(z)` 这两行：要算第 1 层的梯度，必须先知道"传回来的误差信号" `∂J/∂o` 和 `∂J/∂h`——也就是说，梯度是从输出层往回一层一层"流"的，每一层只需要在上一层传回的梯度上，乘上自己对输入的导数。这正是链式法则的递归结构：把"对最终损失的敏感度"逐层分解到每个参数上。

而"动态规划"体现在：**每个中间梯度只算一次就被下游复用**，不必为每条路径重复求导。一个深层网络里，从损失到某个早期权重存在指数级条路径，如果朴素地沿每条路径分别求导，计算量会爆炸；反向传播用一次反向遍历就把所有梯度算完，复杂度仅与网络规模成线性。这也是为什么它能训练成百上千层的网络——计算上是高效的。

### 7.4 训练时前向与反向互相依赖

- 前向传播依赖当前参数值（由最近一次反向传播更新得到）；反向传播依赖前向传播存下的中间值（如 `h`）。
- 因此训练时交替进行前向/反向，利用梯度更新参数。
- 反向传播**复用了前向传播存储的中间值**，导致训练比预测需要更多内存（显存）；中间值大小与层数、批量大小大致成正比，更深的网络 + 更大的批量更易内存不足（OOM）。

把"前向存值、反向用值"这件事再展开一点，它对实际训练有非常直接的工程含义。前向传播时算出来的 `z, h, o` 等中间结果，在反向传播时都要被拿来当已知量（`φ'(z)`、`hᵀ` 等），所以在训练阶段这些张量必须**保留在显存里**直到反向结束。而纯预测（推理）时，我们根本不需要梯度，中间值算完即弃，显存占用小得多——这就是为什么同一张显卡"能推理的 batch 比能训练的 batch 大得多"。当你遇到 OOM（显存不足）时，最有效的两个办法往往就是：减小 `batch_size`，或减小网络层数/宽度（从而降低每层要存的中间值大小）。这也是诸如"梯度检查点（gradient checkpointing）"这类节省显存技术的出发点——用"重算"换"少存"。

## 八、数值稳定性和模型初始化

初始化方案对保持数值稳定性至关重要，选择不当会导致**梯度爆炸**或**梯度消失**。

### 8.1 梯度消失与梯度爆炸

对 `L` 层网络 `o = f_L ∘ … ∘ f_1(x)`，关于第 `l` 层参数 `W^(l)` 的梯度是 `L-l` 个矩阵 `M^(L)…M^(l+1)` 与梯度向量 `v^(l)` 的乘积，易受数值下溢影响，且矩阵特征值可能极小或极大：

- **梯度消失**：参数更新过小，几乎不移动，模型无法学习。经典原因是 **sigmoid**：当输入很大/很小时其梯度趋于 0，经过多层连乘后整个梯度可能消失。这也是 ReLU 系列成为默认选择的原因。
- **梯度爆炸**：参数更新过大，破坏稳定收敛。例如连续乘 100 个方差=1 的随机矩阵，数值会爆炸到 ~1e24。

```python
x = torch.arange(-8.0, 8.0, 0.1, requires_grad=True)
y = torch.sigmoid(x)
y.backward(torch.ones_like(x))
d2l.plot(x.detach().numpy(), [y.detach().numpy(), x.grad.numpy()],
         legend=['sigmoid', 'gradient'], figsize=(4.5, 2.5))

# 梯度爆炸演示
M = torch.normal(0, 1, size=(4, 4))
for i in range(100):
    M = torch.mm(M, torch.normal(0, 1, size=(4, 4)))
print(M)   # 元素量级可达 1e24
```

**打破对称性**：神经网络参数化有排列对称性（隐藏单元间可重排）。若把某层所有权重初始化为同一常数 `c`，前向时各隐藏单元得到相同激活，反向时得到相同梯度，迭代后权重仍相同，永远无法打破对称、等价于只有 1 个单元。**随机初始化**是训练前打破对称性的关键（Dropout 正则化也能打破）。

### 8.2 参数初始化

- **默认初始化**：框架默认随机初始化，对中等难度问题通常有效。
- **Xavier 初始化**（Glorot & Bengio, 2010）：让每层的输出方差不受输入数量影响、梯度方差不受输出数量影响。对全连接层输出 `o = Σ w_ij x_j`，要求 `nin σ² = 1`（前向）且 `nout σ² = 1`（反向），折中得：

```text
σ = √(2 / (nin + nout))      # 高斯分布方差
U(-√(6/(nin+nout)), √(6/(nin+nout)))   # 均匀分布对应区间
```

> 虽然推导假设"无非线性"，但 Xavier 在实践中被证明有效。更深的网络也可借助精心设计的初始化训练极深模型。

把"为何初始化如此重要"放到更大的图景里看：梯度消失/爆炸的危害，不只是"训练慢一点"，而是**模型直接学不动或发散**。如果前向时信号逐层被压到 0（消失），那深层几乎收不到任何来自输入的信息，等于白堆了层数；如果逐层被放大到溢出（爆炸），`loss` 变成 `nan`、`inf`，训练当场崩溃。所以初始化要解决的，就是让信号和梯度在正向、反向两个方向上**都保持稳定的量级**。这个思想后来被推广成更系统的初始化方案（如 He / Kaiming 初始化，针对 ReLU 把方差再放大一倍），核心一脉相承——**根据激活函数和传播方向，把每层的方差"校准"到不增不减**。

另外要澄清一个常见疑问：**初始化和之前讲的正则化（权重衰减、dropout）是完全不同的事**。正则化是关于"训练过程中怎么约束模型以防过拟合"，而初始化是关于"训练开始前参数该取什么值以保证数值健康"。二者解决的是不同阶段的问题，缺一不可：再好的正则化，如果初始权重让梯度直接消失，模型也训不起来。

## 九、环境和分布偏移

训练集与测试集往往**不来自同一分布**，这是许多机器学习部署失败的根源。

先点破一个隐秘的前提：前面所有关于"训练误差≈泛化误差""用验证集选模型"的讨论，都**暗含了一个假设——训练数据和未来要预测的数据是从同一个分布独立同分布（i.i.d.）采样来的**。教科书和竞赛里这个假设通常成立，但**真实世界几乎处处打破它**：用户行为在变、设备换了、季节过了、数据来源迁移了。一旦训练和部署的分布不同，你在验证集上精心调出的"最优模型"，上线后可能一败涂地——而这一切在离线评估里完全看不出来。所以"分布偏移"不是边角知识，而是决定一个模型能不能真正有用的核心问题。本章给出它的分类与应对思路。

### 9.1 分布偏移的类型

假设训练分布 `p_S(x,y)`、测试分布 `p_T(x,y)`，若没有任何关于两者关系的假设，就无法学到分类器。关键在于：**偏移到底发生在联合分布的哪一部分**，这决定了该用哪种纠正手段。

- **协变量偏移（covariate shift）**：输入分布 `P(x)` 随时间改变，但条件分布 `P(y|x)` 不变（x 导致 y 时的自然假设）。例：训练用真实猫狗照片，测试用卡通图。
- **标签偏移（label shift）**：标签边缘分布 `P(y)` 改变，但类条件分布 `P(x|y)` 不变（y 导致 x 时合理）。例：疾病诊断，症状由疾病引起，疾病流行率随时间变化。
- **概念偏移（concept shift）**：标签的定义变化。例：精神疾病诊断标准、软饮名称（美国各地"汽水/Pop/Coke"叫法不同）、机器翻译因地点不同译法不同。

{{< image src="/images/MLP11.png" alt="区分猫和狗的训练数据" caption="图：训练集——真实猫狗照片，同一输入分布采样" >}}
{{< image src="/images/MLP12.png" alt="区分猫和狗的测试数据" caption="图：测试集——卡通猫狗图片，输入分布已发生显著变化（协变量偏移典型场景）" >}}



### 9.2 偏移示例

- **医学诊断**：用大学生血样作健康对照，与真实病人对比，分类器可能因年龄/激素等无关因素轻易区分，遇到极端协变量偏移。
- **自动驾驶**：用游戏渲染引擎合成数据训练"路沿检测器"，路沿被渲染成相同简单纹理，检测器只学到了这个"特征"，上路即灾难。美军坦克检测也曾把"有/无阴影的树"当成了判别特征（清晨 vs 中午拍摄）。
- **非平稳分布**：广告模型不更新（不知道 iPad 上市）、垃圾邮件过滤器遭遇新话术、冬天有效的推荐系统圣诞节后仍推圣诞帽。

### 9.3 分布偏移纠正

- **经验风险** `min_f (1/n) Σ l(f(x_i), y_i)` 用于近似**真实风险** `E_{p(x,y)}[l(f(x), y)]`（总体通常不可得）。
- **协变量偏移纠正**：若 `p(x)` 与 `q(x)` 不同但 `p(y|x)=q(y|x)`，用重要性权重 `β_i = p(x_i)/q(x_i)` 做加权经验风险最小化；可用对数几率回归区分两个分布来估计 `β_i = exp(h(x_i))`，再将权重代入训练（注意需目标分布中每点 `p(x)>0`）。
- **标签偏移纠正**：权重为标签似然比 `β_i = p(y_i)/q(y_i)`；可通过现成分类器的混淆矩阵 `C` 解线性系统 `C p(y) = 平均预测` 估计测试集标签分布。
- **概念偏移纠正**：极端的概念偏移（如任务定义彻底改变）往往只能重新收集标签训练；缓慢的概念偏移可通过用新数据更新现有网络权重来适应。

### 9.4 学习问题的分类法

- **批量学习**：用一组训练数据训练后部署，基本不再更新。
- **在线学习**：逐个样本学习，先观测 `x` 做估计，再观测 `y` 得奖励/损失，循环改进模型。
- **老虎机（bandits）**：行动空间有限，可获得更强最优性保证。
- **控制**：环境会记住我们的行为（如 PID 控制器），需对环境建模。
- **强化学习**：强调基于环境行动以最大化预期利益（围棋、星际争霸、自动驾驶）。

### 9.5 公平、责任与透明

部署决策系统不仅是优化预测模型，还涉及伦理：精度很少是合适衡量标准（不同错误成本不同）；需警惕"失控反馈循环"（如预测性警务把巡逻分配到犯罪率高地区→发现更多犯罪→模型更偏向该地区）。

## 十、实战：Kaggle 房价预测

以 Kaggle "房价预测"竞赛（Ames 市 2006–2010 房价，特征比波士顿房价数据集更多）串联所学知识：数据预处理、模型设计、超参数选择。

{{< image src="/images/MLP13.png" alt="Kaggle 房价预测" caption="图：Kaggle 房价预测竞赛页面，基于 Ames 市 2006–2010 年房屋销售数据，包含 79 个特征变量" >}}

### 10.1 下载与缓存数据集

d2l 提供 `download` / `download_extract` / `download_all`，并用 `DATA_HUB` 字典管理 url 与 sha-1 校验，命中缓存避免重复下载。

### 10.2 读取数据集

```python
import numpy as np
import pandas as pd
import torch
from torch import nn
from d2l import torch as d2l

DATA_HUB['kaggle_house_train'] = (DATA_URL + 'kaggle_house_pred_train.csv',
                                   '585e9cc93e70b39160e7921475f9bcd7d31219ce')
DATA_HUB['kaggle_house_test']  = (DATA_URL + 'kaggle_house_pred_test.csv',
                                   'fa19780a7b011d9b009e8bff8e99922a8ee2eb90')

train_data = pd.read_csv(download('kaggle_house_train'))
test_data  = pd.read_csv(download('kaggle_house_test'))
# 训练集 (1460, 81)，测试集 (1459, 80)；第1列 Id 不携带预测信息，删除
all_features = pd.concat((train_data.iloc[:, 1:-1], test_data.iloc[:, 1:]))
```

### 10.3 数据预处理

```python
# 1) 数值特征标准化（零均值、单位方差）后缺失值自然变为 0
numeric_features = all_features.dtypes[all_features.dtypes != 'object'].index
all_features[numeric_features] = all_features[numeric_features].apply(
    lambda x: (x - x.mean()) / (x.std()))
all_features[numeric_features] = all_features[numeric_features].fillna(0)

# 2) 离散特征独热编码（如 MSZoning → MSZoning_RL / MSZoning_RM）
all_features = pd.get_dummies(all_features, dummy_na=True)   # (2919, 331)

# 3) 转成张量
n_train = train_data.shape[0]
train_features = torch.tensor(all_features[:n_train].values, dtype=torch.float32)
test_features  = torch.tensor(all_features[n_train:].values, dtype=torch.float32)
train_labels = torch.tensor(train_data.SalePrice.values.reshape(-1, 1), dtype=torch.float32)
```

> 标准化有两个好处：方便优化；因不知哪些特征相关，避免惩罚对某些特征的系数偏大。

### 10.4 训练与对数 RMSE

房价关注**相对**误差。官方评价用对数均方根误差：`√(1/n Σ (log y_i − log ŷ_i)²)`。

```python
loss = nn.MSELoss()
in_features = train_features.shape[1]

def get_net():
    return nn.Sequential(nn.Linear(in_features, 1))

def log_rmse(net, features, labels):
    clipped_preds = torch.clamp(net(features), 1, float('inf'))   # 取对数前把 <1 的值置 1
    rmse = torch.sqrt(loss(torch.log(clipped_preds), torch.log(labels)))
    return rmse.item()

def train(net, train_features, train_labels, test_features, test_labels,
          num_epochs, learning_rate, weight_decay, batch_size):
    train_ls, test_ls = [], []
    train_iter = d2l.load_array((train_features, train_labels), batch_size)
    optimizer = torch.optim.Adam(net.parameters(), lr=learning_rate, weight_decay=weight_decay)
    for epoch in range(num_epochs):
        for X, y in train_iter:
            optimizer.zero_grad()
            l = loss(net(X), y)
            l.backward()
            optimizer.step()
        train_ls.append(log_rmse(net, train_features, train_labels))
        if test_labels is not None:
            test_ls.append(log_rmse(net, test_features, test_labels))
    return train_ls, test_ls
```

> 这里用 **Adam** 优化器（对初始学习率不那么敏感）。先训练线性模型作 baseline/健全性检查。

### 10.5 K 折交叉验证（模型选择）

```python
def get_k_fold_data(k, i, X, y):
    assert k > 1
    fold_size = X.shape[0] // k
    X_train, y_train = None, None
    for j in range(k):
        idx = slice(j * fold_size, (j + 1) * fold_size)
        X_part, y_part = X[idx, :], y[idx]
        if j == i:
            X_valid, y_valid = X_part, y_part
        elif X_train is None:
            X_train, y_train = X_part, y_part
        else:
            X_train = torch.cat([X_train, X_part], 0)
            y_train = torch.cat([y_train, y_part], 0)
    return X_train, y_train, X_valid, y_valid

def k_fold(k, X_train, y_train, num_epochs, learning_rate, weight_decay, batch_size):
    train_l_sum, valid_l_sum = 0, 0
    for i in range(k):
        data = get_k_fold_data(k, i, X_train, y_train)
        net = get_net()
        train_ls, valid_ls = train(net, *data, num_epochs, learning_rate, weight_decay, batch_size)
        train_l_sum += train_ls[-1]
        valid_l_sum += valid_ls[-1]
        if i == 0:
            d2l.plot(list(range(1, num_epochs + 1)), [train_ls, valid_ls],
                     xlabel='epoch', ylabel='rmse', xlim=[1, num_epochs],
                     legend=['train', 'valid'], yscale='log')
        print(f'折{i + 1}，训练log rmse {float(train_ls[-1]):f}, 验证log rmse {float(valid_ls[-1]):f}')
    return train_l_sum / k, valid_l_sum / k

k, num_epochs, lr, weight_decay, batch_size = 5, 100, 5, 0, 64
train_l, valid_l = k_fold(k, train_features, train_labels, num_epochs, lr, weight_decay, batch_size)
print(f'{k}-折验证: 平均训练log rmse: {float(train_l):f}, 平均验证log rmse: {float(valid_l):f}')
```

> 若某组超参数训练误差很低但 K 折验证误差高得多，说明过拟合。要监控训练/验证误差两个数字：欠拟合说明可上更强模型，过拟合说明可用正则化。需调的超参数：`num_epochs, lr, weight_decay, batch_size` 这四个。

### 10.6 提交预测

选定超参数后，用全部数据训练，应用到测试集，生成 `submission.csv` 上传 Kaggle。

```python
def train_and_pred(train_features, test_features, train_labels, test_data,
                   num_epochs, lr, weight_decay, batch_size):
    net = get_net()
    train_ls, _ = train(net, train_features, train_labels, None, None,
                        num_epochs, lr, weight_decay, batch_size)
    print(f'训练log rmse ：{float(train_ls[-1]):f}')
    preds = net(test_features).detach().numpy()
    test_data['SalePrice'] = pd.Series(preds.reshape(1, -1)[0])
    submission = pd.concat([test_data['Id'], test_data['SalePrice']], axis=1)
    submission.to_csv('submission.csv', index=False)

train_and_pred(train_features, test_features, train_labels, test_data,
               num_epochs, lr, weight_decay, batch_size)
```

## 小结

- **MLP** 在输入/输出层之间加入全连接隐藏层 + 非线性激活函数（ReLU 默认首选，sigmoid/tanh 也可用），突破线性模型表达能力的限制；训练流程与 Softmax 回归一致。
- **正则化防过拟合**：权重衰减（L2）限制权重大小；暂退法（Dropout）在前向传播中随机丢弃神经元、破坏共适应性，仅训练时使用。
- **数值稳定**：小心初始化避免梯度消失（sigmoid 易触发）与梯度爆炸；随机初始化打破对称性；Xavier 初始化保持方差稳定；ReLU 缓解梯度消失。
- **前向/反向传播**：前向存中间值、反向用链式法则复用，故训练比预测更耗内存。
- **分布偏移**：警惕协变量/标签/概念偏移；训练与部署分布可能不同，需监控实时系统。
- **实战**：Kaggle 房价预测串起数据预处理（缺失值、标准化、独热编码）、对数 RMSE、K 折交叉验证与提交全流程。

### 一条贯穿全章的主线

如果把这一章串成一句话，可以这样记：**多层感知机 = "线性模型的堆叠 + 非线性激活"，而让它真正好用的是一整套"让训练稳定、让结果泛化"的工程纪律**。具体来说：激活函数提供非线性（否则多层等于一层）；前向/反向传播给出了高效求出所有梯度的算法；初始化与激活函数的选择共同保证了梯度既能流得动（不消失）也不爆掉（不爆炸）；而权重衰减、dropout 这类正则化则在你把模型做得足够强之后，把"过拟合训练数据"的风险压下去。最后别忘了，模型训得再漂亮，只要训练/部署的分布悄悄变了（分布偏移），一切归零——所以真实系统永远要靠监控和持续更新兜底。这六个环节环环相扣：少任何一个，深度网络要么训不起来，要么训出来不泛化。


