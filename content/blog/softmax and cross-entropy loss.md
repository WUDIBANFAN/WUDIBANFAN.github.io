+++
date = '2026-07-10T10:00:00+08:00'
draft = false
title = 'softmax回归与交叉熵损失'
categories = ['Deep Learning Fundamentals']
tags = ['Softmax回归', '交叉熵损失', '多分类']
+++

本文介绍 Softmax 回归与交叉熵损失，涵盖原理、Python 实现与可视化，以及基于 PyTorch 在 Iris 数据集上的多分类示例。

<!--more-->

Softmax 回归是机器学习中一种适用于多分类问题的分类算法，可视为逻辑回归在多分类场景下的推广。它通过线性模型将输入特征映射到各类别的得分上，并利用 Softmax 函数将这些得分转换为概率分布，最终使用交叉熵损失函数对模型进行优化。

## 一、Softmax 回归

**Softmax 回归（Softmax Regression）是什么？** Softmax 回归是一种多分类算法，通过线性模型将输入特征映射到每个类别的得分上，并使用 Softmax 函数将这些得分转换为概率分布，从而实现对多类别数据的分类。

![softmax1](/images/softmax1.png)

**Softmax 函数是什么？** Softmax 函数是一种在多分类问题中广泛使用的激活函数，尤其常用于神经网络的输出层。它的作用是将原始的类别评分（也称为 logits）转换为概率分布。

具体来说，给定一个包含任意实数值的向量，Softmax 函数会将这些值转换为正数且和为 1 的概率分布，每个值对应一个类别的概率——这正是指数函数的魅力所在。

![softmax2](/images/softmax2.png)

在 Python 中实现 Softmax 函数并进行可视化，可以通过以下步骤完成。首先编写 Softmax 函数的实现，然后生成示例数据来应用该函数，并使用 Matplotlib 库可视化结果。

![softmax3](/images/softmax3.png)

```python
import numpy as np
import matplotlib.pyplot as plt

# Softmax函数实现
def softmax(logits):
    exp_logits = np.exp(logits - np.max(logits, axis=-1, keepdims=True))  # 为了数值稳定性减去最大值
    return exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)

# 生成示例数据
logits = np.array([[2.0, 1.0, 0.1],
                   [1.0, 3.0, 2.0],
                   [0.1, 2.0, 4.0]])

# 计算Softmax概率
probabilities = softmax(logits)

# 打印结果
print("Logits:")
print(logits)
print("Probabilities:")
print(probabilities)

# 可视化Softmax输出
labels = ['Class 1', 'Class 2', 'Class 3']
fig, ax = plt.subplots()

# 对于每个输入向量，绘制对应的概率分布
for i, probs in enumerate(probabilities):
    ax.bar(labels, probs, label=f'Input {i+1}')

ax.set_xlabel('Classes')
ax.set_ylabel('Probabilities')
ax.set_title('Softmax Probabilities')
ax.legend()

# 显示图表
plt.show()
```

**Softmax 回归的损失函数是什么？** Softmax 回归的损失函数通常是交叉熵损失（Cross Entropy Loss）。在多分类问题中，Softmax 函数将模型的输出转换为概率分布，而交叉熵损失函数则用来衡量预测的概率分布与真实标签之间的差异——这正是对数函数的魅力所在。

下面的 Python 代码实现了交叉熵损失函数的计算，并通过可视化展示了对于一个三分类问题，当真实标签为第 0 类时，交叉熵损失如何随着第 0 类预测概率的变化而变化。

```python
import numpy as np
import matplotlib.pyplot as plt

# 交叉熵损失函数实现
def cross_entropy_loss(y_true, y_pred):
    """
    计算交叉熵损失
    :param y_true: 真实标签的独热编码（numpy数组）
    :param y_pred: 预测概率（numpy数组）
    :return: 交叉熵损失值
    """
    # 确保y_pred中的值不会为0或太小，以避免log(0)的情况
    epsilon = 1e-15
    y_pred = np.clip(y_pred, epsilon, 1. - epsilon)

    # 计算交叉熵损失
    loss = -np.sum(y_true * np.log(y_pred))
    return loss

# 生成模拟数据
num_classes = 3  # 类别数
num_samples = 100  # 样本数

# 随机生成真实标签（独热编码）
y_true = np.zeros((num_samples, num_classes))
for i in range(num_samples):
    class_idx = np.random.randint(0, num_classes)
    y_true[i, class_idx] = 1

# 生成预测概率（随机但确保每行和为1）
y_pred_raw = np.random.rand(num_samples, num_classes)
y_pred = y_pred_raw / y_pred_raw.sum(axis=1, keepdims=True)

# 为了可视化，只选择一个样本并改变其预测概率
sample_idx = 0
y_true_sample = y_true[sample_idx]
y_pred_sample = y_pred[sample_idx].copy()

# 初始化可视化数据
prob_values = np.linspace(epsilon, 1 - epsilon, 100)  # 避免log(0)
loss_values = []

# 计算不同预测概率下的损失值
for prob in prob_values:
    # 假设真实标签是第0类（为了简化，只考虑一个类）
    y_pred_sample[0] = prob
    y_pred_sample[1:] = (1 - prob) / (num_classes - 1)  # 简化：均匀分布剩余概率
    # 确保和为1
    y_pred_sample = y_pred_sample / y_pred_sample.sum()

    # 计算损失
    loss = cross_entropy_loss(y_true_sample, y_pred_sample)
    loss_values.append(loss)

# 可视化
plt.plot(prob_values, loss_values, label='Cross Entropy Loss')
plt.xlabel('Predicted Probability for Class 0')
plt.ylabel('Loss')
plt.title('Cross Entropy Loss vs Predicted Probability')
plt.legend()
plt.grid(True)
plt.show()
```

![softmax4](/images/softmax4.png)

## 二、示例代码

下面展示如何使用 PyTorch 框架实现 Softmax 回归模型，对 Iris 数据集进行三分类任务。完整流程包括数据预处理、模型训练、损失可视化、测试集预测以及混淆矩阵的打印与可视化。

- **加载和预处理数据**：使用 `sklearn.datasets` 加载 Iris 数据集，并使用 `StandardScaler` 进行标准化。
- **定义 Softmax 回归模型**：创建一个简单的线性模型，在前向传播中返回输出（Softmax 函数在损失函数中自动应用）。
- **训练模型**：使用随机梯度下降（SGD）优化器和交叉熵损失函数训练模型，并记录每个 epoch 的损失值。
- **可视化损失值**：使用 Matplotlib 绘制损失值随 epoch 变化的曲线。
- **评估模型**：在测试集上进行预测，并使用混淆矩阵评估模型性能，混淆矩阵也使用 Matplotlib 进行可视化。

```python
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt

# 加载数据集
iris = load_iris()
X, y = iris.data, iris.target

# 数据标准化
scaler = StandardScaler()
X = scaler.fit_transform(X)

# 转换为PyTorch张量
X_tensor = torch.tensor(X, dtype=torch.float32)
y_tensor = torch.tensor(y, dtype=torch.long)

# 划分数据集
X_train, X_test, y_train, y_test = train_test_split(X_tensor, y_tensor, test_size=0.2, random_state=42)

# 创建数据加载器
train_dataset = TensorDataset(X_train, y_train)
train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)

# 定义Softmax回归模型
class SoftmaxRegression(nn.Module):
    def __init__(self, input_dim, num_classes):
        super(SoftmaxRegression, self).__init__()
        self.linear = nn.Linear(input_dim, num_classes)

    def forward(self, x):
        return self.linear(x)  # Softmax在CrossEntropyLoss中自动应用

# 初始化
input_dim = X.shape[1]
num_classes = len(set(y))
model = SoftmaxRegression(input_dim, num_classes)
criterion = nn.CrossEntropyLoss()
optimizer = optim.SGD(model.parameters(), lr=0.01)

# 训练并记录损失
num_epochs = 100
losses = []
for epoch in range(num_epochs):
    model.train()
    running_loss = 0.0
    for inputs, labels in train_loader:
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        running_loss += loss.item()
    epoch_loss = running_loss / len(train_loader)
    losses.append(epoch_loss)

# 可视化损失值
plt.plot(losses)
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.title('Softmax Regression Loss Over Epochs')
plt.grid(True)
plt.show()

# 在测试集上进行预测
model.eval()
with torch.no_grad():
    y_pred_probs = model(X_test).detach().numpy()
    y_pred = np.argmax(y_pred_probs, axis=1)

# 打印混淆矩阵
cm = confusion_matrix(y_test.numpy(), y_pred)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=iris.target_names)
disp.plot(cmap=plt.cm.Blues)
plt.title('Confusion Matrix')
plt.show()

# 打印混淆矩阵的数值
print("Confusion Matrix:")
print(cm)
```

![softmax5](/images/softmax5.png)
![softmax5](/images/softmax5.jpeg)
![softmax6](/images/softmax6.jpeg)
