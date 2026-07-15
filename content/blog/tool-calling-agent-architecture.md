+++
date = '2026-07-15T23:00:00+08:00'
draft = false
title = 'Tool Calling 与 AI Agent 架构演进'
categories = ['Agent Development']
tags = ['AI Agent', 'Tool Calling', 'Function Calling', 'MCP', 'Multi-Agent', 'ReAct', ' Autonomous Agent']
description = '系统梳理 Tool Calling 原理、Agent 架构三阶段演进、Tool Calling 系统设计、Tool Calling vs Function Calling 对比，涵盖工程实践中的安全性、稳定性与可观测性设计。'
+++

<!--more-->

---

## 一、Agent 架构的三阶段演进

### 1.1 阶段一：Tool-Calling（工具调用）

这是 Agent 的雏形阶段。大模型通过 Function Calling 能力调用外部 API，完成特定任务。

```python
# 典型的 Tool-Calling 实现
response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气",
            "parameters": {...}
        }
    }]
)
```

**特点**：
- 单次调用，无状态
- 依赖人工编排流程
- 适合简单、确定性任务

**局限**：无法处理复杂多步骤任务，缺乏自主决策能力。

### 1.2 阶段二：ReAct / Chain-of-Thought（推理-行动链）

ReAct（Reasoning + Acting）范式让模型能够"边想边做"，通过思考-观察-行动的循环逐步完成任务。

```text
Thought: 用户想了解北京的天气，我需要调用天气 API
Action: get_weather
Action Input: {"city": "北京"}
Observation: {"temperature": 25, "condition": "晴"}
Thought: 已经获取到天气信息，可以回复用户了
Final Answer: 北京今天天气晴朗，气温25度...
```

**关键改进**：
- 引入推理步骤，可解释性增强
- 支持多轮工具调用
- 错误时可自我纠正

**2026 年新进展**：
- OpenAI 的 Structured Output 让 ReAct 更稳定
- Claude 3.7 的 Extended Thinking 提升复杂推理能力
- DeepSeek-R2 在推理效率上取得突破

### 1.3 阶段三：Autonomous Agent（自主智能体）

当前最前沿的架构形态。Agent 具备完整的心智模型：

| 能力 | 说明 |
|------|------|
| **规划（Planning）** | 将复杂任务分解为可执行的子任务 |
| **记忆（Memory）** | 维护短期工作记忆和长期知识库 |
| **工具（Tools）** | 动态选择和组合工具 |
| **反思（Reflection）** | 评估执行结果并迭代优化 |
| **协作（Collaboration）** | 与其他 Agent 协同工作 |

```python
# 简化的 Autonomous Agent 架构
class AutonomousAgent:
    def __init__(self):
        self.memory = MemoryManager()       # 记忆管理
        self.planner = TaskPlanner()        # 任务规划器
        self.tool_registry = ToolRegistry() # 工具注册中心
        self.reflection = ReflectionEngine() # 反思引擎

    async def execute(self, goal: str):
        # 1. 规划任务
        plan = self.planner.create_plan(goal)

        # 2. 执行并迭代
        for step in plan.steps:
            result = await self.execute_step(step)
            self.memory.add_observation(result)

            # 3. 反思与调整
            if self.reflection.needs_adjustment():
                plan = self.planner.replan(plan)

        return self.memory.get_final_result()
```

---

## 二、2026 年 Agent 核心技术栈

### 2.1 Multi-Agent 架构模式

单一 Agent 的能力有限，Multi-Agent 系统通过角色分工实现复杂任务协作。

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| 分层协作 | 管理者 Agent + 执行者 Agent | 复杂项目管理 |
| 对等协作 | 多个 Agent 平等协商 | 创意生成、头脑风暴 |
| 流水线 | Agent A → Agent B → Agent C | 数据处理、内容生产 |
| 竞争择优 | 多个 Agent 生成方案，择优采纳 | 代码生成、方案设计 |

**实践案例**：在内容生产场景中，采用"编辑-写手-审核"三层架构：
- 编辑 Agent：理解需求，制定写作大纲
- 写手 Agent：根据大纲生成具体内容
- 审核 Agent：检查质量、事实准确性、风格一致性

### 2.2 记忆管理系统

记忆是 Agent 持续学习的基础。

**记忆分层**：

| 层级 | 说明 | 存储方式 |
|------|------|----------|
| 工作记忆 | 当前任务上下文 | 滑动窗口维护 |
| 短期记忆 | 会话级历史 | 向量数据库 |
| 长期记忆 | 用户偏好、领域知识 | 定期更新 |

```python
# 使用 Mem0 进行记忆管理
from mem0 import Memory

memory = Memory()

# 存储记忆
memory.add("用户喜欢简洁的技术文章", user_id="user_123")

# 检索相关记忆
related_memories = memory.search("写作风格", user_id="user_123")
```

**2026 年新趋势**：

#### GraphRAG：知识图谱增强的检索

传统 RAG 是"文档片段 → 向量相似度 → 检索"，缺乏对实体关系的理解。**GraphRAG** 在向量检索之上叠加了一层知识图谱：

```
文档输入 → 实体识别 → 关系抽取 → 构建知识图谱（Entity→Relation→Entity）
                                          ↓
用户 Query → 实体链接 → 子图检索 → 结合向量检索 → 生成答案
```

**核心思路**：

| 步骤 | 说明 |
|------|------|
| 离线建图 | 对知识库文档做 NER（命名实体识别）和关系抽取，构建实体-关系-实体的图结构 |
| 查询时实体链接 | 识别 Query 中的核心实体，在图谱中定位起始节点 |
| 子图检索 | 从起始节点出发，沿关系边遍历 1~2 跳，提取相关子图 |
| 融合生成 | 将子图中的结构化关系与向量检索的文本片段一起送入 LLM |

**与传统 RAG 的区别**：

| 维度 | 传统 RAG | GraphRAG |
|------|----------|----------|
| 检索单元 | 文本块（chunk） | 实体 + 关系 + 文本块 |
| 推理能力 | 字面/语义相似度 | 多跳关系推理 |
| 适用场景 | 独立知识点查询 | 需要跨实体关联推理的复杂问题 |

> 例：Query "特斯拉创始人现在在哪家公司任职？"
> - 传统 RAG 可能只召回包含"特斯拉"的文档片段，无法回答"创始人现在在哪"
> - GraphRAG 通过 `特斯拉 --[创始人]--> Elon Musk --[现任职]--> SpaceX/X` 的关系链直接推理出答案

#### NER 与关系抽取怎么实现？

GraphRAG 的前提是能从非结构化文档中提取实体和关系。这需要两条技术路线配合：

**1. NER（命名实体识别）**

NER 的目标是从文本中识别出具有特定类型的实体，并标注其类别。

```
输入文本：
"马斯克于2002年创立了SpaceX，总部位于加州霍桑市。"

NER 输出：
马斯克    → [PER] 人物
2002年    → [DATE] 日期
SpaceX    → [ORG] 机构
加州霍桑市 → [LOC] 地点
```

实现方式有三种演进路线：

| 方式 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **规则/词典** | 用正则表达式、地名/人名词典匹配 | 快、无训练成本 | 召回率低，无法处理新词 |
| **传统模型** | CRF / BiLSTM-CRF 序列标注 | 比规则强、可泛化 | 需要标注数据训练 |
| **LLM 提取** | 直接让大模型识别实体和类型 | 零样本、泛化强、能处理复杂语境 | 速度慢、成本高 |

LLM 方式的 Prompt 示例：

```python
ner_prompt = """
你是一个命名实体识别专家。请从以下文本中提取所有命名实体，并标注其类型。

文本：{text}

输出格式（JSON）：
{{
  "entities": [
    {{"text": "马斯克", "type": "PERSON", "start": 0, "end": 3}},
    {{"text": "SpaceX", "type": "ORG", "start": 12, "end": 17}}
  ]
}}
"""
```

**2. 关系抽取（Relation Extraction）**

NER 只知道"有哪些实体"，但不知道实体之间有什么联系。关系抽取负责识别实体对之间的语义关系。

```
NER 输出：
  马斯克 [PER]    SpaceX [ORG]

关系抽取输出：
  (马斯克, 创立, SpaceX)   ← 三元组 (Subject, Relation, Object)
```

实现方式：

| 方式 | 原理 | 适用场景 |
|------|------|----------|
| **基于规则** | 人工编写关系模式（如"X 创立了 Y" → 创立关系） | 高精度、低召回 |
| **监督学习模型** | BERT + 分类头，输入实体对，输出关系类别 | 有标注数据时效果好 |
| **LLM + Few-shot** | 给大模型几个关系抽取示例，让它对新文本抽取 | 零样本、泛化强 |

LLM 方式的 Prompt 示例：

```python
re_prompt = """
你是一个关系抽取专家。请从以下文本中提取实体之间的关系。

文本：{text}
已知实体：{entities}

请输出三元组 (Subject, Relation, Object)，关系类型包括：
创始人、投资、收购、任职于、总部位于、成立时间等。

示例：
文本："马斯克于2002年创立了SpaceX"
输出：{{"triples": [["马斯克", "创立", "SpaceX"], ["SpaceX", "成立时间", "2002年"]]}}
"""
```

**3. 从抽取到建图的完整流程**

```python
class GraphRAGBuilder:
    def __init__(self, llm):
        self.llm = llm
        self.graph = KnowledgeGraph()

    def build_from_documents(self, documents):
        for doc in documents:
            # Step 1: NER — 提取实体
            entities = self.llm.extract(ner_prompt.format(text=doc.text))

            # Step 2: 关系抽取 — 提取实体间关系
            triples = self.llm.extract(re_prompt.format(
                text=doc.text,
                entities=entities
            ))

            # Step 3: 消歧与合并
            # "马斯克" 和 "Elon Musk" 指向同一实体
            for s, r, o in triples:
                s = self.graph.resolve_entity(s)  # 实体消歧
                o = self.graph.resolve_entity(o)
                self.graph.add_triple(s, r, o)  # 写入图谱

        # Step 4（可选）：生成社区摘要
        # 用图聚类算法（如 Leiden）将图谱划分为多个社区，
        # 用 LLM 为每个社区生成摘要，便于多跳推理
        self.graph.build_community_summaries()
```

**4. 实体消歧（Entity Resolution）**

同名实体需要合并，同义实体也需要识别。这一步在建图时至关重要：

| 场景 | 问题 | 解决方案 |
|------|------|----------|
| 同名不同人 | "李彦宏"可能指百度创始人，也可能指同名的其他人 | 用上下文属性区分（任职公司、领域等） |
| 异名同一人 | "马斯克"、"Elon Musk"、"Musk" 指向同一个人 | 别名表 + 向量相似度匹配 |
| 缩写歧义 | "AI" 可能是人工智能，也可能是 Adobe Illustrator | 用上下文消歧 |
| 代词指代 | "马斯克创立了 SpaceX。他同时管理着 X。"——"他"指马斯克 | 共指消解（Coreference Resolution） |

> 完整的建图链路：`文档 → NER（找实体） → 关系抽取（找关系） → 实体消歧（去重合并） → 写入图谱`。这条链路的质量直接决定了 GraphRAG 的推理效果。

#### Episodic Memory：情景记忆

传统 Agent 记忆大多是基于语义的抽象知识（如"用户喜欢简洁风格"）。**Episodic Memory** 模拟人类情景记忆，存储具体事件而非抽象知识。

| 记忆类型 | 存储内容 | 检索方式 | 示例 |
|----------|----------|----------|------|
| 语义记忆 | 抽象知识、用户偏好 | 关键词/语义相似 | "用户偏好简洁文章" |
| 情景记忆 | 具体事件、完整上下文 | 时间/情境匹配 | "上周二用户让我写一篇关于 RAG 的技术博客，要求面向工程师，最终采纳了第三版" |

**工作原理**：

```python
class EpisodicMemory:
    def __init__(self):
        self.episodes = []  # 按时间顺序存储完整事件

    def add_episode(self, event):
        """存储一个完整的情景事件"""
        episode = {
            "timestamp": event.time,
            "context": event.context,       # 当时对话的完整上下文
            "action": event.action,         # 执行了什么操作
            "outcome": event.outcome,       # 结果如何
            "user_feedback": event.feedback  # 用户反馈
        }
        self.episodes.append(episode)

    def recall(self, current_context):
        """根据当前情境检索相似的历史情景"""
        # 通过情境相似度匹配，而非简单的关键词匹配
        return self._similarity_search(current_context, self.episodes)
```

**核心价值**：
- **避免重复犯错**：遇到类似情境时，Agent 可以回忆"上次这样做失败了"，从而选择不同策略
- **保持个性一致性**：记住与用户的具体交互历史，而非只存抽象偏好
- **支持长期学习**：通过回顾历史情景，Agent 可以总结经验模式，逐步改进行为策略

### 2.3 任务规划与执行

**规划策略演进**：

| 策略 | 说明 |
|------|------|
| Zero-shot Planning | 直接让模型生成计划（简单但不稳定） |
| Few-shot Planning | 提供示例计划（提升一致性） |
| Hierarchical Planning | 先粗粒度规划，再细粒度展开 |
| Adaptive Planning | 根据执行反馈动态调整计划 |

**关键算法**：

#### Tree of Thoughts (ToT)：多路径搜索最优解

传统 Chain-of-Thought 是单链推理——一条路走到黑。**ToT** 把推理过程建模为一棵搜索树，在每个节点生成多个候选想法，评估后选择最优路径继续展开。

```
                    问题
                   /    |    \
              想法A   想法B   想法C      ← 分支：生成多个候选
              / \      |      / \
           评估  评估  评估  评估  评估   ← 评估：打分/剪枝
            ↓    ↓     ↓     ↓    ↓
          继续展开  剪枝  继续  剪枝  剪枝
              ↓           ↓
            想法A1       想法C1
              ↓           ↓
            ...         最终答案 ✓
```

**与 CoT 的核心区别**：

| 维度 | Chain-of-Thought (CoT) | Tree of Thoughts (ToT) |
|------|------------------------|------------------------|
| 推理结构 | 单条链（线性） | 树形（多分支） |
| 候选生成 | 每步生成一个想法 | 每步生成多个候选想法 |
| 回溯能力 | 无，一条路走到黑 | 可以剪枝、回溯、换路径 |
| 评估机制 | 无中间评估 | 每个节点评估状态价值 |
| 适用场景 | 简单推理、数学题 | 复杂规划、创意写作、24点游戏 |

**核心步骤**：
1. **分解（Decompose）**：将问题拆成多个推理步骤
2. **生成（Generate）**：在每个步骤生成多个候选想法
3. **评估（Evaluate）**：对每个想法打分，判断是否值得继续
4. **搜索（Search）**：使用 BFS / DFS / 束搜索遍历想法树，找到最优路径

> 例：24 点游戏（用 1, 5, 5, 6 凑出 24）
> - CoT 可能一开始选了 `(5+1)×6=36`，发现不对就卡住了
> - ToT 会同时尝试多条路径：`(5-1)×6=24` ✓、`(5+5)×6=60` ✗ 剪枝，最终找到正确解

#### LLM+P：经典规划算法增强

大模型擅长"理解"但不擅长"精确规划"——尤其在需要多步依赖、约束满足的任务上容易出错。**LLM+P** 让 LLM 负责翻译，经典规划器负责执行。

```
用户自然语言问题
       ↓
  LLM 翻译为 PDDL（Planning Domain Definition Language）问题
       ↓
  经典规划器（如 Fast Downward）求解 → 得到精确的步骤序列
       ↓
  LLM 将步骤序列翻译回自然语言
       ↓
  返回用户
```

**为什么需要 LLM+P**：

| 问题 | 纯 LLM | LLM+P |
|------|--------|-------|
| 多步依赖推理 | 容易漏步、跳步 | 规划器保证完整性和正确性 |
| 约束满足 | 经常违反约束 | 规划器内置约束求解 |
| 最优性 | 无法保证最优 | 经典规划器可求最优解 |
| 自然语言理解 | 强 | 强（LLM 负责） |
| 形式化推理 | 弱 | 强（规划器负责） |

**PDDL 示例**：

```lisp
;; Domain: 积木世界
(define (domain blocks)
  (:requirements :strips :typing)
  (:predicates (on ?x - block ?y - block)
              (clear ?x - block)
              (handempty))
  (:action pick-up
    :parameters (?x - block)
    :precondition (and (clear ?x) (handempty))
    :effect (and (not (clear ?x)) (not (handempty)) (holding ?x)))
)
```

> LLM 将"把红色积木放到蓝色积木上"翻译为 PDDL 问题，规划器计算出 `pick_up(red) → put_down(red, blue)` 的精确步骤序列，保证物理约束不被违反。

#### Reflexion：自我反思改进

**Reflexion** 让 Agent 在执行失败后进行自我反思，将反思结论存入记忆，指导下一次尝试避免重复错误。

```
任务执行循环：
  第1轮：尝试 → 失败 → 反思："失败原因是参数格式错误，应使用 JSON 而非纯文本"
                              ↓ 存入反思记忆
  第2轮：尝试（参考上一轮反思）→ 失败 → 反思："参数格式已修正，但遗漏了必填字段 keyword"
                                          ↓ 追加反思记忆
  第3轮：尝试（参考前两轮反思）→ 成功 ✓
```

**与 ReAct 的区别**：

| 维度 | ReAct | Reflexion |
|------|-------|-----------|
| 失败后行为 | 重新推理一次 | 先反思失败原因，再带着教训重试 |
| 记忆利用 | 仅当前上下文 | 跨轮次的长期反思记忆 |
| 改进能力 | 无积累，可能重复犯错 | 逐步改进，避免重复犯错 |
| 适用场景 | 单轮任务 | 需要多次尝试的复杂任务 |

**核心循环**：

```python
class ReflexionAgent:
    def __init__(self):
        self.reflection_memory = []  # 反思记忆库

    def execute_with_reflection(self, task, max_attempts=3):
        for attempt in range(max_attempts):
            # 1. 执行任务（带上历史反思记忆）
            result = self.execute(task, context=self.reflection_memory)

            if result.success:
                return result

            # 2. 失败后反思
            reflection = self.reflect(task, result, self.reflection_memory)

            # 3. 存入反思记忆，供下一轮参考
            self.reflection_memory.append(reflection)

        return None  # 超过最大尝试次数
```

> **核心价值**：将"失败"从纯粹的负面信号转化为可复用的学习素材，让 Agent 具备了"吃一堑长一智"的能力。

### 2.4 工具使用与编排

**2026 年新标准**：
- **MCP (Model Context Protocol)**：Anthropic 推出的开放标准，统一工具定义格式
- **Function Schema 自动生成**：从代码注释/API 文档自动生成工具定义
- **动态工具发现**：Agent 根据任务需求自动发现可用工具

```json
// MCP 格式的工具定义
{
  "name": "code_analyzer",
  "description": "分析代码质量和复杂度",
  "inputSchema": {
    "type": "object",
    "properties": {
      "code": {"type": "string"},
      "language": {"type": "string"}
    },
    "required": ["code", "language"]
  }
}
```

---

## 三、Tool Calling 的本质与原理

### 3.1 为什么 LLM 需要工具？

LLM 本质上是一个"文本生成器"，有三大先天缺陷，必须通过工具来弥补：

| 缺陷 | 痛点 | 对应工具 |
|------|------|-----------|
| 无法获取实时信息 | 知识截止于训练结束的那一天 | 搜索引擎、天气 API、股票接口 |
| 数学与逻辑短板 | 基于概率预测下一个字，做算术题经常瞎编（幻觉） | 计算器、Python 解释器 |
| 无法与世界交互 | 只能生成文字，不能真正地"做事" | 发邮件 API、数据库写入接口、智能家居控制器 |

> 如果说 LLM 是一个博学的"大脑"，那么 Tool Calling 就是给它装上了"手"和"眼睛"。

### 3.2 双重依赖关系

Tool Calling 是**模型自身能力与推理引擎接口支持相结合**的产物，两者缺一不可。

**大模型的基础能力**：
- 识别用户意图中需要外部操作的部分
- 生成结构化工具调用请求（函数名 + 参数）
- 根据工具执行结果生成最终的自然语言回复

> 不同模型在此项能力上表现有差异。例如早期 DeepSeek-R1 不太支持 Tool Calling，而 DeepSeek V3.1 则具备了很好的能力。

**推理引擎的接口支持**：
- 接收工具定义：允许开发者以结构化方式向模型声明可用工具
- 引导模型输出：通过特定的提示模板将用户查询和工具定义信息组织成模型输入
- 解析模型响应：提供后处理模块从模型输出中识别并提取工具调用指令

### 3.3 完整工作流程

```text
用户问题
   ↓
模型理解用户意图
   ↓
判断是否需要调用工具
   ↓
选择合适的 Tool
   ↓
生成 Tool 调用参数
   ↓
参数校验与兜底
   ↓
执行 Tool / 调用服务端接口
   ↓
处理工具返回结果
   ↓
将结果送入模型
   ↓
模型生成最终回答
```

**关键认知**：LLM 永远不会自己执行代码。当触发 Function Call 时，LLM 只是生成了一个文本指令（JSON）。真正执行代码的，依然是你的 Python/Java 后端。

### 3.4 实现 Tool Calling 的两种方式

| 方式 | 做法 | 优缺点 |
|------|------|--------|
| **Prompt Engineering（ReAct 模式）** | 在 System Prompt 里写死规则，让模型按格式输出 | 早期模型常用；非常不稳定，模型经常忘记格式 |
| **Function Calling（函数调用）** | 直接把工具定义（JSON Schema）传给模型 API | 现代模型原生能力；经过专门训练，能稳定输出结构化 JSON |

> Function Call 是实现 Tool Calling 的最佳实践。

---

## 四、Tool Calling 代码实战

### 4.1 OpenAI 原生 API 实现

```python
from openai import OpenAI
import json

client = OpenAI()

# 1. 定义工具列表
tools = [
    {
        "type": "function",
        "name": "get_horoscope",
        "description": "Get today's horoscope for an astrological sign.",
        "parameters": {
            "type": "object",
            "properties": {
                "sign": {
                    "type": "string",
                    "description": "An astrological sign like Taurus or Aquarius",
                },
            },
            "required": ["sign"],
        },
    },
]

def get_horoscope(sign):
    return f"{sign}: Next Tuesday you will befriend a baby otter."

# 2. 发起请求
input_list = [
    {"role": "user", "content": "What is my horoscope? I am an Aquarius."}
]

response = client.responses.create(
    model="gpt-5",
    tools=tools,
    input=input_list,
)

# 3. 执行工具调用
input_list += response.output
for item in response.output:
    if item.type == "function_call":
        if item.name == "get_horoscope":
            horoscope = get_horoscope(json.loads(item.arguments))
            # 4. 将结果送回模型
            input_list.append({
                "type": "function_call_output",
                "call_id": item.call_id,
                "output": json.dumps({"horoscope": horoscope})
            })

# 5. 模型生成最终回答
response = client.responses.create(
    model="gpt-5",
    instructions="Respond only with a horoscope generated by a tool.",
    tools=tools,
    input=input_list,
)
print(response.output_text)
```

### 4.2 LangChain Native 方式（推荐）

利用 LangChain 封装好的接口，代码最简洁，兼容性最好。

```python
from langchain_core.tools import tool
from src.llm.gemini_chat_model import get_gemini_llm

# 1. 定义工具（使用 @tool 装饰器）
@tool
def multiply(a: int, b: int) -> int:
    """Multiplies two integers."""
    return a * b

# 2. 初始化 LLM
llm = get_gemini_llm()

# 3. 绑定工具（Native Function Calling）
llm_with_tools = llm.bind_tools([multiply])

# 4. 执行
response = llm_with_tools.invoke("What is 123 multiplied by 456?")

# 5. 检查是否触发了 Function Call
if response.tool_calls:
    for tool_call in response.tool_calls:
        logger.info(f"Tool Name: {tool_call['name']}")
        logger.info(f"Arguments: {tool_call['args']}")

        # 执行工具
        if tool_call['name'] == 'multiply':
            result = multiply.invoke(tool_call['args'])
            logger.info(f"Tool Execution Result: {result}")
```

**关键解析**：
- `@tool` 装饰器：自动提取函数的 docstring 和类型注解，转换为 LLM 能理解的 JSON Schema
- `llm.bind_tools()`：将 Python 函数列表转换为特定 LLM 提供商所需的 API 格式
- `response.tool_calls`：标准的 Python 字典/对象，不需要解析原始 JSON 字符串

### 4.3 Manual / ReAct 方式（手动 Prompt）

Function Calling 技术出现之前的做法，通过 Prompt 教 LLM 如何调用工具。

```python
react_system_prompt = """
You are a helpful assistant. You have access to the following tools:

1. multiply: Multiplies two integers. Input should be two numbers separated by a comma.

To use a tool, please use the following format exactly:

Thought: Do I need to use a tool? Yes
Action: multiply
Action Input: 5, 4
Observation: [Tool output will be placed here]

If you do not need to use a tool, just answer the question directly.
"""
```

**痛点**：
- 非常消耗 Token，模型很容易不遵守格式
- 手动解析逻辑非常脆弱，必须用字符串匹配和正则表达式去"猜测"模型意图

### 4.4 Google Native SDK 方式

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)

# 配置模型参数
my_config = types.GenerateContentConfig(
    tools=[multiply],
    tool_config=types.ToolConfig(
        function_calling_config=types.FunctionCallingConfig(
            mode=types.FunctionCallingConfigMode.ANY  # 强制模型使用工具
        )
    )
)
```

**关键点**：
- `tools=[multiply]`：Google SDK 能直接接受 Python 函数，内部自动反射生成 JSON Schema
- `mode=ANY`：强制模式，不管用户问什么，必须调用工具。默认是 `AUTO`（模型自己决定）

---

## 五、Tool Calling 系统设计

### 5.1 核心组成模块

| 模块 | 作用 |
|------|------|
| Tool Schema | 定义工具的输入、输出、描述、参数约束 |
| Intent Router | 判断用户问题是否需要调用工具 |
| Tool Selector | 选择最合适的工具 |
| Parameter Generator | 由模型生成工具参数 |
| Parameter Validator | 校验参数合法性 |
| Tool Executor | 实际执行工具逻辑 |
| Error Handler | 处理调用失败、参数错误、业务异常 |
| Result Parser | 解析工具返回结果 |
| Feedback Loop | 记录调用结果，用于后续优化 |

**核心设计目标**：
1. **准确性**：模型能正确判断什么时候调用工具、调用哪个工具
2. **安全性**：防止模型调用危险工具、越权操作
3. **稳定性**：工具调用失败、参数错误、网络异常时系统不能崩溃
4. **可观测性**：能记录、排查、优化每一次工具调用过程
5. **可扩展性**：方便新增工具，不需要大幅改动核心流程

### 5.2 Tool Schema 设计

Schema 本质上是给模型看的"工具说明书"，告诉模型：
- 这个工具是做什么的
- 什么时候应该调用它
- 需要传入哪些参数
- 每个参数是什么类型、哪些必填、有什么约束
- 工具返回结果长什么样

**标准 Tool Schema 结构**：

```json
{
  "tool_name": "search_products",
  "description": "根据商品名称、分类、价格区间搜索商品",
  "purpose": "当用户需要查找商品、比较商品、询问商品价格时使用",
  "input_schema": {
    "type": "object",
    "properties": {
      "keyword": {
        "type": "string",
        "description": "商品名称或关键词"
      },
      "category": {
        "type": "string",
        "description": "商品分类，如手机、电脑、服装"
      },
      "min_price": {
        "type": "number",
        "description": "最低价格",
        "minimum": 0
      },
      "max_price": {
        "type": "number",
        "description": "最高价格，不能小于 min_price",
        "minimum": 0
      }
    },
    "required": ["keyword"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "success": {"type": "boolean"},
      "code": {"type": "integer"},
      "message": {"type": "string"},
      "data": {
        "type": "object",
        "properties": {
          "total": {"type": "integer"},
          "items": {"type": "array"}
        }
      }
    }
  }
}
```

**输入 Schema 设计要点**：

| 要点 | 说明 |
|------|------|
| 参数类型必须明确 | string / number / integer / boolean / array / object |
| 必须明确必填参数 | `required` 字段标注哪些参数不可缺失 |
| 参数描述要清晰 | 不能只写类型，要加 description 说明具体含义 |
| 参数要加约束 | 如 `minimum: 0`，方便后续参数校验 |

**输出 Schema 建议包含三类字段**：

| 字段类型 | 示例 | 作用 |
|------|------|------|
| 状态字段 | `code`、`success`、`message` | 判断工具调用是否成功 |
| 业务数据字段 | `items`、`user`、`order` | 承载实际返回内容 |
| 分页字段 | `page`、`page_size`、`total` | 处理大量结果 |

### 5.3 工具调用失败处理

**常见失败场景**：

| 失败类型 | 原因 |
|----------|------|
| 网络超时 | 工具服务不可达 |
| 参数错误 | 模型生成的参数不合法 |
| 业务失败 | 库存不足、订单不存在、权限不足 |
| 限流失败 | 接口被限流 |
| 系统异常 | 服务报错、数据库异常 |
| 结果为空 | 工具没有返回有效数据 |

**失败处理原则**：

1. **不要把原始错误直接丢给用户**：用户应看到"当前搜索服务暂时繁忙，请稍后再试"，而不是"调用工具失败：timeout"
2. **区分系统错误和业务错误**：

| 类型 | 示例 | 处理方式 |
|------|------|----------|
| 系统错误 | 超时、500、网络异常 | 提示稍后重试，可降级 |
| 业务错误 | 商品不存在、余额不足 | 按业务提示处理 |
| 参数错误 | 价格为负数、缺少关键词 | 重新询问用户或自动补全 |
| 权限错误 | 无操作权限 | 提示权限不足 |

**失败处理策略**：

| 策略 | 适用场景 | 注意事项 |
|------|----------|----------|
| **重试** | 网络超时、临时性错误 | 最多 1~3 次；写操作不建议自动重试 |
| **降级** | 工具不可用时 | 实时库存查询 → 返回"暂时无法获取"；商品搜索 → 热门推荐 |
| **用户友好提示** | 所有失败场景 | 不暴露技术细节，给出可操作建议 |
| **记录失败日志** | 每次失败 | 记录 user_query、tool_name、error_type、retry_count 等 |

### 5.4 工具参数错误兜底

**参数校验内容**：

| 校验类型 | 示例 |
|----------|------|
| 必填校验 | keyword 是否缺失 |
| 类型校验 | price 是否为数字 |
| 范围校验 | min_price 是否小于 0 |
| 格式校验 | 手机号、邮箱、日期格式 |
| 逻辑校验 | min_price 是否大于 max_price |
| 枚举校验 | category 是否在允许分类中 |

**兜底策略**：

| 策略 | 说明 | 注意事项 |
|------|------|----------|
| 自动修正 | 识别明显格式问题并修正 | 涉及金额、订单等敏感字段要谨慎 |
| 重新询问用户 | 参数缺失或不明确时 | 让用户补充信息 |
| 使用默认值 | 业务允许时 | page=1, page_size=10 等，必须符合业务逻辑 |
| 限制模型重试 | 参数错误后让模型重新生成 | 最多重试 1~2 次，避免无限循环 |

### 5.5 危险工具安全机制

**工具权限分级**：

| 等级 | 类型 | 示例 | 处理方式 |
|------|------|------|----------|
| L1 查询工具 | 只读 | 商品搜索、订单查询 | 可相对开放 |
| L2 业务操作 | 有状态变化 | 下单、收藏 | 需要用户确认 |
| L3 资金敏感 | 涉及钱 | 退款、扣款 | 强校验、二次确认 |
| L4 高危操作 | 破坏性操作 | 删除数据、修改配置 | 禁止或人工审批 |

**安全设计要点**：

1. **二次确认**：写操作不能模型一说调用就直接执行，必须弹出确认框
2. **工具调用白名单**：模型不能随意调用所有工具
3. **参数合法性校验**：order_id 是否属于当前用户、退款金额是否合理等
4. **敏感操作审计日志**：所有高危操作记录完整审计日志

```python
# 工具权限控制
class ToolPolicy:
    def check_permission(self, tool_name, context):
        if tool_name in self.sensitive_tools:
            return context.user_role == "admin"
        return True

# 输入过滤
from guardrails import Guard
guard = Guard().use_many(
    ToxicLanguage(),
    PromptInjection(),
    PII()
)
```

### 5.6 服务端统一分发架构

**不建议直接暴露所有 Tool 给模型**，原因：
1. 模型可能误选危险工具
2. 模型可能生成错误参数
3. 模型无法处理复杂权限
4. 工具数量太多会干扰模型判断
5. 不利于日志、限流、权限控制

**推荐架构**：

```text
用户问题
   ↓
模型生成 Tool Call 请求
   ↓
服务端 Tool Manager 接收请求
   ↓
权限校验 → 参数校验 → 路由到具体工具执行器
   ↓
调用业务服务 / 接口
   ↓
返回结果 → 模型生成回答
```

**Tool Manager 职责**：

| 职责 | 说明 |
|------|------|
| 工具路由 | 根据 tool_name 找到对应执行器 |
| 权限校验 | 判断用户是否允许调用该工具 |
| 参数校验 | 检查参数是否合法 |
| 限流控制 | 防止频繁调用 |
| 失败重试 | 处理网络异常 |
| 日志记录 | 记录每次调用 |
| 结果封装 | 统一返回格式 |
| 安全拦截 | 阻止高危操作 |

> 模型只需要知道"调用哪个工具、传什么参数"，不需要知道工具的内部实现、接口地址、鉴权 Token、数据库连接等。

---

## 六、Tool Calling vs Function Calling 对比

### 6.1 基础定义

**Function Calling（函数调用）**：最早由 OpenAI 提出，狭义定义是模型识别用户意图，输出结构化 JSON，调用预先定义好的程序函数（本地代码函数）。

> 诞生初衷：让大模型可以调用代码内的函数，解决大模型无法实时获取外部数据、执行计算的问题。

**Tool Calling（工具调用）**：是 Function Calling 的泛化、升级概念。把"本地函数"抽象成通用"工具（Tool）"，工具不再局限于代码函数，可以是 HTTP 接口、数据库查询、第三方 API、外部服务、Agent 子任务、插件等任意外部能力。

### 6.2 核心差异对照表

| 对比维度 | Function Calling | Tool Calling |
|----------|-----------------|--------------|
| **调用对象** | 程序内部的本地函数（Python 函数、Java 方法等） | 通用外部工具：HTTP 接口、微服务、第三方 API、数据库、插件、子 Agent、脚本等 |
| **部署形态** | 函数和调度程序在同一进程/服务内部；直接内存调用，无网络 | 工具独立部署，大多跨进程、跨机器、通过网络请求调用 |
| **Schema 范围** | 只描述函数入参（输入为主），一般不定义输出结构 | 完整定义：工具用途、触发条件、输入/输出 Schema、权限、限流规则、错误码 |
| **执行控制权** | 代码直接调用函数，逻辑紧耦合 | 由独立的 Tool Manager 工具调度层统一分发、鉴权、参数校验、失败重试、安全拦截 |
| **适用场景** | 轻量化本地能力：计算器、简单数据处理、内置小功能 | 复杂分布式系统：RAG 检索、订单查询、支付、第三方 API、多 Agent 协同 |
| **安全边界** | 弱；函数直接本地执行，缺少统一拦截层 | 强；天然支持权限分级、危险操作拦截、二次确认、审计日志 |
| **扩展能力** | 新增函数需要修改代码、重启服务 | 新增工具仅需要注册 Schema，无需改动核心调度链路，支持动态注册工具 |

### 6.3 通俗理解

**Function Calling 场景**：你本地 Python 程序里写了一个函数，模型输出 JSON，程序解析后**直接在内存调用这个本地函数**。

**Tool Calling 场景**：工具是独立部署的 HTTP 接口，模型输出工具调用指令后，请求**服务端 Tool 调度中心**，调度中心做权限校验、参数校验后转发 HTTP 请求到商品搜索服务。**即使底层接口内部实现是一个函数，整体架构依然是 Tool Calling**。

### 6.4 常见误区澄清

| 误区 | 纠正 |
|------|------|
| "一个是老名词，一个是新名词，二者完全一样" | API 层面厂商命名迭代只是表层；架构设计上二者耦合度、管控能力、适用范围有清晰分界线 |
| "Function Calling 不能调用远程接口" | 技术上可以，但狭义 Function Calling 的原始设计目标不是远程调用，没有配套的调度、安全、治理能力 |
| "Tool Calling 不能调用本地函数" | 可以。Tool 可以注册本地函数实现，区别在于是否通过统一调度层做标准化治理 |
| "OpenAI 的 Function Calling 现在改名 Tool Calling 了？" | API 层面只是接口名称变更；底层设计思想也升级了，理念向通用 Tool 架构靠拢 |

### 6.5 从属关系

**Function Calling 是 Tool Calling 的子集**：
- 所有 Function Calling 都可以叫作 Tool Calling
- 但 Tool Calling 不一定是 Function Calling
- 生产环境分布式系统使用的、带调度管理层的方案，统一称作 Tool Calling

---

## 七、工程实践：从 Demo 到生产

### 7.1 可靠性保障

Agent 的不确定性是生产部署的最大障碍。

```python
def safe_execute(agent, task):
    try:
        return agent.execute(task)
    except AgentError:
        # 回退到规则引擎
        return rule_based_handler(task)
```

**关键措施**：
- **确定性回退**：关键步骤提供规则兜底
- **人机协同（Human-in-the-loop）**：关键决策点引入人工确认
- **执行追踪与可观测性**：使用 LangSmith / Langfuse 追踪 Agent 执行链路，记录每个 Thought-Action-Observation 循环，建立 Agent 性能指标（成功率、平均步数、延迟）

### 7.2 成本控制

| 策略 | 效果 | 实现方式 |
|------|------|----------|
| 模型路由 | 降本 40-60% | 简单任务用小模型，复杂任务用大模型 |
| 响应缓存 | 降本 20-30% | 缓存常见查询的响应 |
| 批量处理 | 降本 30-50% | 合并多个小请求为批量请求 |
| 早期终止 | 避免无效开销 | 设置最大步数、超时时间 |

### 7.3 安全与对齐

| 风险类型 | 说明 | 防护措施 |
|----------|------|----------|
| 工具滥用 | Agent 调用敏感 API | 工具权限控制、白名单 |
| 提示注入 | 恶意输入操控 Agent 行为 | Guardrails 输入过滤 |
| 数据泄露 | Agent 泄露用户隐私信息 | PII 检测、输出过滤 |

### 7.4 常见优化手段

1. **工具数量控制**：不要一次性给模型太多工具，根据用户问题动态过滤
2. **工具描述优化**：写清工具作用、使用场景、不使用场景、必填参数、返回结果
3. **增加 Few-Shot 示例**：给模型几个正确调用示例
4. **增加工具调用历史**：在上下文中保留已调用的工具、参数和结果
5. **增加结果摘要**：工具返回结果过多时，先做摘要再送入模型

### 7.5 排查 Prompt 问题 vs 模型能力问题

| 判断标准 | 结论 |
|----------|------|
| 所有模型都犯同一个错误 | 大概率是 Prompt / Schema 问题 |
| 小模型失败，大模型成功 | 主要是模型能力问题 |
| Prompt 模糊导致模型犹豫 | Prompt 问题 |

**排查步骤**：
1. 检查用户问题是否清晰
2. 检查 Prompt 是否明确
3. 检查 Tool Schema 是否清楚
4. 检查模型生成参数是否符合预期
5. 检查是否缺少示例
6. 换模型测试
7. 加日志定位失败原因
8. 判断是 Prompt 问题还是模型能力问题
9. 针对性优化

---

## 八、常见误区（Myth Busting）

| 误区 | 真相 |
|------|------|
| LLM 只要联网就能自己调用工具 | LLM 必须由开发者显式地提供工具定义，并在代码中显式地执行工具。它自己没有手 |
| Function Call 只能调用 Python 函数 | Function Call 只是输出文本指令，后端可以用 Python、Java、Go 甚至 Shell 脚本来执行 |
| 模型会无条件执行任何工具 | 模型会根据 Prompt 和上下文判断，但这也带来安全风险（Prompt Injection）。千万不要给 LLM 一个 `delete_database()` 的工具而不加权限控制 |

---

## 九、技术演进路线

| 阶段 | 特点 |
|------|------|
| **ReAct 时代** | 靠 Prompt 苦苦支撑，极不稳定 |
| **Native Function Calling** | 模型微调，稳定性大增，成为行业标准 |
| **Agents（智能体）** | 能够自主规划、连续多轮调用工具，完成复杂任务 |
| **MCP（Model Context Protocol）** | 未来的通用标准，像 USB 协议一样定义数据和工具的接口标准，让 AI 能即插即用地连接任何系统 |

---

## 十、未来展望

### 技术趋势

- **Agent 即服务（AaaS）**：标准化 Agent 托管平台
- **跨 Agent 通信协议**：不同厂商 Agent 互联互通
- **边缘 Agent**：轻量化模型支持端侧部署
- **多模态 Agent**：统一处理文本、图像、音频、视频

### 应用场景拓展

| 领域 | 应用 |
|------|------|
| 软件工程 | 从代码补全到全自动开发 |
| 科学研究 | 文献综述、实验设计、数据分析 |
| 个人助理 | 真正理解用户的数字管家 |
| 创意产业 | 协同创作、风格迁移、内容生成 |

---

## 十一、总结

> **Tool Calling 的设计核心不是"让模型会调用函数"，而是设计一套可控、安全、稳定、可观测的工具调用链路。**

核心要点：
1. Schema 要清晰
2. 参数要校验
3. 失败要兜底
4. 危险操作要拦截
5. 服务端要统一分发
6. 每一次调用都要可追踪

Agentic AI 正在重新定义人机交互的边界。从简单的 Tool-Calling 到自主决策的 Agent，这不仅是技术架构的演进，更是 AI 能力本质的跃迁。成功的 Agent 系统不是追求完全自主，而是建立有效的人机协作机制。
