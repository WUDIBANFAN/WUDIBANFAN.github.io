+++
date = '2026-07-03T12:00:00+08:00'
draft = false
title = 'ms-swift 大模型微调框架使用笔记'
categories = ['Hyperparameters Tuning']
tags = ['大模型', '微调', 'ms-swift']
+++

关于魔搭社区 ms-swift 框架的学习记录，涵盖了环境搭建、SFT 微调、LoRA 训练、推理部署的完整流程。

<!--more-->

## 一、ms-swift 简介

ms-swift 是魔搭社区（ModelScope）提供的大模型与多模态大模型微调部署框架，支持 600+ 纯文本大模型与 400+ 多模态大模型的训练、推理、评测、量化与部署。

支持的模型包括：Qwen3、InternLM3、GLM4.5、Mistral、DeepSeek-R1、Llama4 以及 Qwen3-VL、InternVL3.5、MiniCPM-V-4 等多模态模型。

核心能力：
- **轻量训练**：LoRA、QLoRA、DoRA、LoRA+、Adapter 等
- **分布式训练**：DDP、DeepSpeed ZeRO、FSDP、Megatron 并行
- **强化学习**：GRPO、DAPO、GSPO、CHORD、RLOO、Reinforce++ 等
- **推理加速**：vLLM、SGLang、LMDeploy
- **模型量化**：AWQ、GPTQ、FP8、BNB

## 二、环境搭建

### 安装 Conda 并激活

```bash
# 在当前终端中激活 conda 功能
source /opt/anaconda3/etc/profile.d/conda.sh
```

### 创建数据与环境目录

```bash
mkdir -p /data3/wangce/envs
mkdir -p /data3/wangce/swift
```

### 创建 Python 环境

```bash
conda create --prefix=/data3/wangce/envs/swift-env python=3.11 -y
conda config --append envs_dirs /data3/wangce/envs/
```

### 安装 ms-swift

```bash
conda activate swift-env
pip install ms-swift -U
```

运行环境推荐：

| 组件 | 推荐版本 |
|------|---------|
| Python | 3.12 |
| CUDA | 12.8/13.0 |
| PyTorch | 2.8.0/2.11.0 |
| transformers | 4.57.6 |

## 三、快速开始：SFT 微调

**10 分钟在单卡 3090 上对 Qwen3-4B 进行自我认知微调**：

```bash
CUDA_VISIBLE_DEVICES=0 \
swift sft \
    --model Qwen/Qwen3-4B-Instruct-2507 \
    --tuner_type lora \
    --dataset 'AI-ModelScope/alpaca-gpt4-data-zh#500' \
              'AI-ModelScope/alpaca-gpt4-data-en#500' \
              'swift/self-cognition#500' \
    --torch_dtype bfloat16 \
    --num_train_epochs 1 \
    --per_device_train_batch_size 1 \
    --per_device_eval_batch_size 1 \
    --learning_rate 1e-4 \
    --lora_rank 8 \
    --lora_alpha 32 \
    --target_modules all-linear \
    --gradient_accumulation_steps 16 \
    --eval_steps 50 \
    --save_steps 50 \
    --save_total_limit 2 \
    --logging_steps 5 \
    --max_length 2048 \
    --output_dir /data3/wangce/training_output/qwen3-4b-lora-v1 \
    --warmup_ratio 0.05 \
    --dataloader_num_workers 4 \
    --model_author swift \
    --model_name swift-robot
```

### 关键参数说明

| 参数 | 说明 |
|------|------|
| `--model` | 模型 ID 或本地路径 |
| `--tuner_type lora` | 使用 LoRA 轻量微调 |
| `--dataset` | 训练数据集，`#500` 表示只用 500 条 |
| `--lora_rank 8` | LoRA 秩，越大微调能力越强但参数越多 |
| `--output_dir` | 训练输出保存路径 |
| `--model_author/--model_name` | 仅 self-cognition 数据集生效 |

> 小贴士：
> - 数据集自动下载，无需手动配置
> - 修改 `--model` 即可换其他模型训练
> - 默认使用 ModelScope 下载模型和数据集，用 `--use_hf true` 切换 HuggingFace

## 四、推理

训练完成后使用以下命令推理：

```bash
CUDA_VISIBLE_DEVICES=0 \
swift infer \
    --adapters /data3/wangce/training_output/qwen3-4b-lora-v1/v1-xxx/checkpoint-50 \
    --stream true \
    --temperature 0 \
    --max_new_tokens 2048
```

| 参数 | 说明 |
|------|------|
| `--adapters` | 训练保存的 checkpoint 路径 |
| `--stream true` | 流式输出，像打字机逐字显示 |
| `--temperature 0` | 确定性输出，每次回答完全一致 |
| `--max_new_tokens` | 限制单次最多生成 token 数 |

使用 vLLM 加速推理：

```bash
CUDA_VISIBLE_DEVICES=0 \
swift infer \
    --adapters output/vx-xxx/checkpoint-xxx \
    --stream true \
    --merge_lora true \
    --infer_backend vllm \
    --vllm_max_model_len 8192 \
    --temperature 0 \
    --max_new_tokens 2048
```

## 五、LoRA 训练定制

```bash
CUDA_VISIBLE_DEVICES=1 \
swift sft \
    --model Qwen/Qwen3-4B-Instruct-2507 \
    --tuner_type lora \
    --dataset 'AI-ModelScope/alpaca-gpt4-data-zh#500' \
              'AI-ModelScope/alpaca-gpt4-data-en#500' \
              'swift/self-cognition#500' \
    --torch_dtype bfloat16 \
    --num_train_epochs 1 \
    --per_device_train_batch_size 1 \
    --per_device_eval_batch_size 1 \
    --learning_rate 1e-4 \
    --lora_rank 8 \
    --lora_alpha 32 \
    --target_modules all-linear \
    --gradient_accumulation_steps 16 \
    --eval_steps 50 \
    --save_steps 50 \
    --save_total_limit 2 \
    --logging_steps 5 \
    --max_length 2048 \
    --output_dir /data3/wangce/training_output \
    --system 'You are a helpful assistant.' \
    --warmup_ratio 0.05 \
    --dataset_num_proc 4 \
    --dataloader_num_workers 4 \
    --model_author swift \
    --model_name swift-robot
```

## 六、模型推送

```bash
CUDA_VISIBLE_DEVICES=0 \
swift export \
    --adapters output/vx-xxx/checkpoint-xxx \
    --push_to_hub true \
    --hub_model_id '<your-model-id>' \
    --hub_token '<your-sdk-token>' \
    --use_hf false
```

## 七、支持的训练方法一览

| 训练方法 | 全参数 | LoRA | 多模态 |
|---------|--------|------|--------|
| 预训练 | ✅ | ✅ | ✅ |
| 指令微调 | ✅ | ✅ | ✅ |
| GRPO | ✅ | ✅ | ✅ |
| DPO | ✅ | ✅ | ✅ |
| KTO | ✅ | ✅ | ✅ |
| Reward Model | ✅ | ✅ | ✅ |
| Embedding | ✅ | ✅ | ✅ |
| 序列分类 | ✅ | ✅ | ✅ |

ms-swift 覆盖了预训练、微调、RLHF、推理、评测、量化、部署的全链路，是当前大模型训练领域最全面的开源框架之一。

![ms-swift Web-UI](/images/swift---1.png)
