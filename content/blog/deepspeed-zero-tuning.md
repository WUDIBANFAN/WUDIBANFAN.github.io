+++
date = '2026-07-02T12:00:00+08:00'
draft = false
title = 'DeepSpeed ZeRO 训练专项调优'
categories = ['Hyperparameters Tuning']
tags = ['DeepSpeed', 'ZeRO', '分布式训练', '深度学习']
+++


> 从 Stage1 到 Stage3，8 卡 A800 环境

---

**【写在前面】**
DeepSpeed 是微软开源的大模型分布式训练框架，ZeRO（Zero Redundancy Optimizer）是其核心技术。这条笔记从 ZeRO 三种 Stage 的原理讲起，覆盖通信优化、显存卸载、配置调优，目标是让你能在 8 卡 A800 环境上把训练跑得又快又稳。

---

## 一、为什么需要 ZeRO

### 1.1 大模型训练的显存瓶颈
以 7B 参数模型用 AdamW + FP32 训练为例：
- 模型参数：7B × 4 bytes = **28 GB**
- 优化器状态（AdamW 动量和方差）：28 × 2 = **56 GB**  ← 优化器最大头
- 梯度：**28 GB**
- 激活值：额外 **30~100 GB**

> 总计：**~140~200 GB**！单卡 A800 只有 80 GB 显存，远远不够。

### 1.2 ZeRO 的核心思路
**传统数据并行**：每个 GPU 上保存完整的优化器状态、梯度、参数副本 → 极大的显存冗余

**ZeRO**：把这些状态分布到不同 GPU 上，消除冗余：
- **Stage 1**：切分优化器状态
- **Stage 2**：切分优化器状态 + 梯度
- **Stage 3**：切分优化器状态 + 梯度 + 参数

---

## 二、ZeRO Stage 详解

### 2.1 Stage 1：仅切分优化器状态（最常用）

**原理**：
- 优化器状态（AdamW m、v）被均匀切分到各 GPU
- 每个 GPU 只存 `1/N` 的优化器状态（N=GPU 数）
- 参数和梯度仍完全复制保存

**显存节省**：
- 优化器状态：从 N× → 1×（每卡节省最明显）
- 参数和梯度：不节省

**8 卡 A800 场景**：
- 优化器状态从 8 份复制 → 每卡 1 份（节省 8 倍优化器显存）
- 训练速度快，通信量最小
- 适合 8 卡单机场景（NCCL 通信带宽高，Stage1 瓶颈不在通信）

### 2.2 Stage 2：切分优化器 + 梯度

**原理**：
- 在 Stage1 基础上，梯度也被切分
- 每个 GPU 只存与自己优化器分片对应的梯度
- 梯度计算后立即 Reduce-Scatter（边 reduce 边分发）

**显存节省**：
- 比 Stage1 额外节省梯度显存（每卡 1/N）
- 通信量略多于 Stage1

**适用场景**：
- 模型更大、Stage1 显存仍不够
- 或者希望用更大的 batch size

### 2.3 Stage 3：切分优化器 + 梯度 + 参数

**原理**：
- 参数也被切分到各 GPU
- 每个 GPU 只持有 1/N 的参数
- 前向/反向计算时按需从其他 GPU 通信获取参数

**显存节省**：
- 最大化节省显存（几乎均分到所有卡）
- 理论上可以训练任意大的模型

**代价**：
- 通信量远大于 Stage1/2
- 每层计算都需要跨卡收集参数 → 训练速度显著下降
- 8 卡单机场景通常不需要 Stage3（带宽足够但通信开销仍大）

### 2.4 三种 Stage 对比总结

| 特性 | Stage 1 | Stage 2 | Stage 3 |
|-----|---------|---------|---------|
| 优化器显存 | 1/N | 1/N | 1/N |
| 梯度显存 | N/N | 1/N | 1/N |
| 参数显存 | N/N | N/N | 1/N |
| 通信量 | 最少 | 中等 | 最大 |
| 训练速度 | 最快 | 较快 | 较慢 |
| 推荐场景 | 8卡单机 | 扩展到更多卡 | 模型极大 |

---

## 三、8 卡 A800 推荐配置

### 3.1 首选：ZeRO Stage 1

**原因**：
- 8 卡单机 NCCL NVLink/NVSwitch 通信带宽极大（600GB/s+）
- 优化器状态是最大的显存冗余（2 倍于参数）
- 省掉了优化器冗余后显存通常就够用了
- 通信量最小 → 训练最快

### 3.2 DeepSpeed 配置文件（Stage 1）

```json
{
  "train_batch_size": 64,
  "gradient_accumulation_steps": 4,
  "optimizer": {
    "type": "AdamW",
    "params": {
      "lr": 8e-4,
      "betas": [0.9, 0.95],
      "eps": 1e-8,
      "weight_decay": 0.05
    }
  },
  "scheduler": {
    "type": "WarmupDecayLR",
    "params": {
      "warmup_min_lr": 0,
      "warmup_max_lr": 8e-4,
      "warmup_num_steps": 1000,
      "total_num_steps": 100000
    }
  },
  "zero_optimization": {
    "stage": 1,
    "reduce_bucket_size": 5e8,
    "allgather_bucket_size": 5e8
  },
  "bf16": {
    "enabled": true
  },
  "gradient_clipping": 1.0,
  "steps_per_print": 100
}
```

**关键参数说明**：
- `reduce_bucket_size`：梯度通信时每次打包的大小（byte）
  - 越大 → 通信次数少，单次通信大 → 适合高带宽环境
  - 8 卡 A800 建议 **5e8（500MB）**，充分利用带宽
- `allgather_bucket_size`：参数收集时打包大小，同上

---

## 四、通信优化（NCCL 调优）

### 4.1 通信与计算重叠（Overlap）
训练可以分为两步：
1. 前向+反向计算（GPU 密集计算）
2. 梯度跨卡通信（NCCL 通信）

默认串行执行（算完再通信），可以重叠执行提升效率。

### 4.2 DeepSpeed 配置通信重叠

```json
{
  "zero_optimization": {
    "stage": 1,
    "overlap_comm": true,
    "contiguous_gradients": true,
    "reduce_bucket_size": 5e8
  }
}
```

- `overlap_comm`：梯度通信与反向传播计算重叠
- `contiguous_gradients`：将梯度拷贝到连续缓冲区，加速通信

### 4.3 梯度预取（Gradient Prefetching）
- 在等待 NCCL 通信完成时，提前加载下一批梯度
- 仅 Stage 3 支持
- 将通信等待时间"隐藏"起来

### 4.4 NCCL 环境变量优化（8 卡 A800 环境）

```bash
# NCCL 使用 InfiniBand 或 NVLink（自动检测最佳路径）
export NCCL_SOCKET_IFNAME=ib0          # InfiniBand 网卡名
export NCCL_IB_DISABLE=0               # 启用 InfiniBand
export NCCL_NET_GDR_LEVEL=5            # GPU Direct RDMA
export NCCL_DEBUG=INFO                 # 调试信息（正式训练可关）

# 通信算法选择
export NCCL_ALGO=Ring                  # Ring AllReduce，通用高效
```

> 注意：单机 8 卡通过 NVSwitch 互联，不需要特别配置网络相关参数，NCCL 会自动走 NVSwitch 路径。

---

## 五、显存卸载（Offloading）

### 5.1 优化器状态卸载到 CPU
当 GPU 显存依然不够时，将优化器状态放到 CPU 内存：

```json
{
  "zero_optimization": {
    "stage": 2,
    "offload_optimizer": {
      "device": "cpu",
      "pin_memory": true,
      "buffer_count": 4,
      "fast_init": true
    }
  }
}
```

**参数说明**：
- `device: "cpu"` → 优化器状态放在 CPU 内存
- `pin_memory`：CPU 锁页内存，加速 CPU↔GPU 数据传输
- `buffer_count`：预分配的通信缓冲区数量
- `fast_init`：快速初始化优化器

### 5.2 参数卸载到 CPU（Stage 3 特有）

```json
{
  "zero_optimization": {
    "stage": 3,
    "offload_param": {
      "device": "cpu",
      "pin_memory": true
    },
    "offload_optimizer": {
      "device": "cpu",
      "pin_memory": true
    }
  }
}
```

### 5.3 卸载的代价与收益
- **收益**：GPU 显存大幅降低（可以训练更大的模型）
- **代价**：CPU↔GPU 数据传输是瓶颈，训练速度可能降低 50%+
- **仅在显存实在不够时启用**

### 5.4 NVMe 卸载（极端省显存）
- 把优化器状态卸载到 NVMe SSD（比 CPU 内存慢，但比无卸载快）
- 极其罕见，仅在单卡训练大模型且 CPU 内存也不够时使用

---

## 六、8 卡 A800 完整配置示例

```json
{
  "train_batch_size": 64,
  "train_micro_batch_size_per_gpu": 2,
  "gradient_accumulation_steps": 4,
  
  "optimizer": {
    "type": "AdamW",
    "params": {
      "lr": 8e-4,
      "betas": [0.9, 0.95],
      "eps": 1e-8,
      "weight_decay": 0.05
    }
  },
  
  "scheduler": {
    "type": "WarmupDecayLR",
    "params": {
      "warmup_min_lr": 0,
      "warmup_max_lr": 8e-4,
      "warmup_num_steps": 1000,
      "total_num_steps": 100000
    }
  },
  
  "zero_optimization": {
    "stage": 1,
    "overlap_comm": true,
    "contiguous_gradients": true,
    "reduce_bucket_size": 5e8,
    "allgather_bucket_size": 5e8
  },
  
  "bf16": {
    "enabled": true
  },
  
  "gradient_clipping": 1.0,
  
  "activation_checkpointing": {
    "partition_activations": false,
    "number_checkpoints": null,
    "contiguous_memory_optimization": false
  },
  
  "steps_per_print": 100,
  "wall_clock_breakdown": false
}
```

**解读**：
- `per_gpu_batch=2, ×8卡, ×4 accum = effective_batch=64`
- Stage 1（最快）+ BF16（A800 原生命令）+ gradient checkpointing
- 这是一个兼顾速度与显存的均衡配置

---

## 七、常见问题排查

### 7.1 OOM（Out of Memory）
按顺序排查：
1. 降低 per_gpu_batch（如 2→1），增大 gradient_accumulation_steps 保持总 batch 不变
2. 开启 activation checkpointing
3. 开启 offload_optimizer（CPU 卸载）
4. 从 Stage 1 → Stage 2 → Stage 3

### 7.2 训练速度慢
按顺序排查：
1. 确认 DataLoader workers > 0（建议 4~8）
2. 确认 GPU 利用率（`nvidia-smi` 持续 > 90%）
3. 降低 gradient_accumulation_steps（减少冗余前向）
4. 检查是否启用了不必要的 CPU offload
5. Stage 3 换 Stage 1/2

### 7.3 通信慢（NCCL timeout 或慢速）
1. 检查 InfiniBand/NVLink 连接正常
2. 确认 `reduce_bucket_size` 设置合理（5e8）
3. 开启 `overlap_comm`

---

## 八、总结

**8 卡 A800 训练大模型的最优路径**：
> Stage 1 + BF16 + Gradient Checkpointing + Overlap Comm

**核心原则**：
- 尽量用低 Stage（Stage 1 > Stage 2 > Stage 3）
- 能不 offload 就不 offload（通信开销大）
- BF16 是 A800 最大的硬件红利
- 通信与计算重叠是"白送"的加速
