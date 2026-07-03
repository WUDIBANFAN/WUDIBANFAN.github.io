+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = 'Claude Code 插件对接 DeepSeek 接口排错笔记'
categories = ['Dev Tools']
tags = ['Claude Code', 'DeepSeek', 'VSCode', 'AI', '配置']
+++

记录 Claude Code VSCode 插件对接 DeepSeek Anthropic 兼容接口时遇到的配置问题及完整解决方案。

<!--more-->

## 一、原始配置存在的 3 个核心问题

### 1. 鉴权变量名称不合法

自定义密钥变量名为 `Nio_claude`，插件仅识别 `ANTHROPIC_AUTH_TOKEN`，自定义名称无法被读取，直接造成鉴权失败。

### 2. 模型名称格式不匹配

DeepSeek 的 Anthropic 兼容接口要求模型 ID 必须携带后缀，`deepseek-v4-pro` 需要修改为 `deepseek-v4-pro[1m]`，否则会返回模型不存在。

### 3. 配置层级单一，注入不稳定

仅在 VSCode 插件内配置环境变量，插件底层二进制程序会优先读取用户目录下的全局配置文件，仅靠插件配置会出现环境变量不生效。

## 二、修正后的配置内容

### 1. VSCode settings.json（插件配置）

```json
{
    "claudeCode.preferredLocation": "panel",
    "claudeCode.environmentVariables": [
        {
            "name": "ANTHROPIC_AUTH_TOKEN",
            "value": "sk-c5d04aba0e634dd68119c0f5ff036cfb"
        },
        {
            "name": "ANTHROPIC_BASE_URL",
            "value": "https://api.deepseek.com/anthropic"
        },
        {
            "name": "ANTHROPIC_MODEL",
            "value": "deepseek-v4-pro[1m]"
        },
        {
            "name": "ANTHROPIC_DEFAULT_OPUS_MODEL",
            "value": "deepseek-v4-pro[1m]"
        },
        {
            "name": "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
            "value": "1"
        },
        {
            "name": "CLAUDE_CODE_LEAN_SYSTEM_PROMPT",
            "value": "false"
        }
    ],
    "claudeCode.selectedModel": "deepseek-v4-pro[1m]"
}
```

### 2. 全局兜底配置（必加）

文件路径：

- Linux 远程 SSH：`~/.claude/settings.json`
- Windows 本地：`%USERPROFILE%\.claude\settings.json`

```json
{
    "env": {
        "ANTHROPIC_AUTH_TOKEN": "sk-c5d04aba0e634dd68119c0f5ff036cfb",
        "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
        "ANTHROPIC_MODEL": "deepseek-v4-pro[1m]",
        "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1m]",
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
        "CLAUDE_CODE_LEAN_SYSTEM_PROMPT": "false"
    },
    "model": "deepseek-v4-pro[1m]"
}
```

## 三、关键兼容优化项

关闭精简系统提示：新增环境变量 `CLAUDE_CODE_LEAN_SYSTEM_PROMPT=false`，用来解决 `400 unknown variant system` 协议报错，适配 DeepSeek 的 Anthropic 接口格式。

## 四、生效操作步骤

1. 保存两份配置文件
2. 完全关闭 VSCode，SSH 远程需要断开连接后重新登录
3. 在 Claude Code 面板执行 `/logout` 清理旧会话
4. 终端执行校验命令：

```bash
env | grep ANTHROPIC
```

能正常打印出地址、密钥、模型三个变量，代表环境注入成功。

## 五、核心总结

1. 鉴权密钥必须使用插件内置变量名 `ANTHROPIC_AUTH_TOKEN`，禁止自定义命名
2. DeepSeek 兼容接口的模型名称必须补充 `[1m]` 后缀
3. 采用 VSCode 插件配置 + 用户目录全局配置双层结构，避免变量注入失效
4. 关闭精简系统提示词，规避协议字段不匹配问题

> DeepSeek 开放平台的 API 名称只是为了方便用户识别，而不需要体现在 VSCode 的 Claude Code 配置文件中。
