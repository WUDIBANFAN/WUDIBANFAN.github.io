+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = 'Claude Code 插件对接 DeepSeek 接口排错笔记'
categories = ['Dev Tools']
tags = ['AI工具', 'VSCode', 'DeepSeek']
+++

记录了在 VSCode 中使用 Claude Code 插件对接 DeepSeek 的 Anthropic 兼容接口时踩的坑和最终解决方案。

<!--more-->

## 一、背景

Claude Code 是 Anthropic 官方推出的 VSCode AI 编程插件，原生对接 Claude 系列模型。由于某些原因（账号限制、网络、成本等），希望通过 Anthropic 兼容接口将后端切换到 DeepSeek 的模型。DeepSeek 开放平台提供了 `/anthropic` 兼容端点，但在实际配置过程中遇到了几个卡点。

## 二、遇到的 3 个问题

### 1. 鉴权变量名不生效

最开始自定义的密钥环境变量名为 `Nio_claude`，但配置完成后始终无法连接。排查后发现，Claude Code 插件**仅识别固定名称 `ANTHROPIC_AUTH_TOKEN`**，自定义的变量名无法被读取，鉴权直接失败。这一点在官方文档没有明确说明，是从插件的环境变量白名单反推出来的。

### 2. 模型 ID 需要加后缀

DeepSeek 的 API 页面显示的模型名为 `deepseek-v4-pro`，但配置这个名称会返回"模型不存在"（404）。查了 DeepSeek 的 Anthropic 兼容文档后发现，通过该接口访问时，模型 ID 必须带 `[1m]` 后缀，完整写法是 `deepseek-v4-pro[1m]`。这个后缀是兼容模式所要求的格式，不能省略。

### 3. 环境变量注入层级不够

仅在 VSCode 的 `settings.json` 中配置了插件级别的环境变量，但在某些情况下变量不会传递到底层的 CLI 二进制程序。原因是 Claude Code 的底层二进制会**优先读取用户目录下的全局配置文件**（`~/.claude/settings.json`），仅靠插件级别的配置无法保证变量在所有场景下生效。

## 三、最终配置

### 插件配置（VSCode settings.json）

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

### 全局兜底配置（必加，否则部分场景不生效）

文件位置：
- **Linux SSH 远程**：`~/.claude/settings.json`
- **Windows 本地**：`%USERPROFILE%\.claude\settings.json`

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

### 额外兼容配置

新增环境变量 `CLAUDE_CODE_LEAN_SYSTEM_PROMPT=false`，用于解决对接 DeepSeek 时出现的 `400 unknown variant system` 协议报错。这个错误是因为 DeepSeek 的 Anthropic 兼容接口不支持精简版系统提示词格式，关闭后走标准 prompt 协议即可正常通信。

## 四、配置生效步骤

1. 保存上述两份配置文件
2. **完全关闭 VSCode**（SSH 远程连接需断开后重新登录）
3. 在 Claude Code 面板执行 `/logout` 清理上一次的会话缓存
4. 终端执行校验：

```bash
env | grep ANTHROPIC
```

正确输出示例：

```
ANTHROPIC_AUTH_TOKEN=sk-c5d04aba0e634dd68119c0f5ff036cfb
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
ANTHROPIC_MODEL=deepseek-v4-pro[1m]
```

三个变量全部打印出来即表示环境注入成功。

## 五、开发中使用体验

配置完成后流畅度还可以，基本响应速度与直接使用 DeepSeek 官方 API 一致。有一点值得注意：DeepSeek 开放平台展示的 API 名称只是为了让用户在控制台方便识别，不需要出现在 VSCode 的配置文件里——配置文件中用的是 Anthropic 兼容接口的变量名体系，与 DeepSeek 控制台的模型展示名是两套命名。

### 踩坑总结

- **变量名**：必须用 `ANTHROPIC_AUTH_TOKEN`，别自己起名字，插件不认
- **模型后缀**：`[1m]` 不能省，这是兼容接口的格式要求
- **双层配置**：插件配置 + 用户目录全局配置，缺一不可，否则部分场景变量注入失败
- **精简 prompt**：`CLAUDE_CODE_LEAN_SYSTEM_PROMPT=false` 必须关，否则协议不兼容
