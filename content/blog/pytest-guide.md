+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = 'Pytest 从入门到企业实战'
categories = ['Dev Tools']
tags = ['Python', 'Pytest', '测试']
+++

关于 Pytest 的学习笔记，从最基础的安装运行，到 Fixture、参数化、conftest、Allure 报告，再到 Requests 接口自动化，基本覆盖了工作中会用到的全部内容。

<!--more-->

## 快速入门

### 安装与验证

```bash
pip install pytest
pytest --version
```

### 第一个 Demo

```bash
mkdir pytest_demo && cd pytest_demo
```

`calculator.py`：
```python
def add(a, b):
    return a + b

def divide(a, b):
    return a / b
```

`test_calculator.py`：
```python
import pytest
from calculator import add, divide

def test_add():
    assert add(2, 3) == 5

def test_divide():
    assert divide(10, 2) == 5

def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

运行：
```bash
pytest        # 简洁
pytest -v     # 详细
```

输出：
```
test_calculator.py::test_add PASSED
test_calculator.py::test_divide PASSED
test_calculator.py::test_divide_by_zero PASSED
```

### 参数化测试

不需要为每组测试数据写一个测试函数：

```python
import pytest
from calculator import add

@pytest.mark.parametrize(
    "a,b,expected",
    [
        (1, 2, 3),
        (2, 3, 5),
        (10, 20, 30),
    ]
)
def test_add_param(a, b, expected):
    assert add(a, b) == expected
```

输出：
```
test_add_param[1-2-3] PASSED
test_add_param[2-3-5] PASSED
test_add_param[10-20-30] PASSED
```

pytest 最大的优点之一：断言失败时**自动展示实际值和期望值的对比**，不需要额外写日志：

```
E       assert 5 == 6
E       +  where 5 = add(2, 3)
```

## 一、Fixture（测试夹具）

Fixture 是 pytest 的核心功能，相当于 Java 里的 `@Before`/`@After` 或者 unittest 的 `setUp()`/`tearDown()`。作用是测试前准备数据、测试后清理环境、多个测试共享资源。

### 基本用法

```python
import pytest

@pytest.fixture
def login():
    """模拟登录，返回 token"""
    print("执行登录")
    token = "abcdefg"
    return token

def test_order(login):
    print(f"获取token: {login}")
    assert login == "abcdefg"

def test_user(login):
    print(f"获取token: {login}")
    assert len(login) > 0
```

执行 `pytest -s`（`-s` 不截断 print 输出）：

```
执行登录
获取token:abcdefg
执行登录
获取token:abcdefg
```

默认每个测试函数都会执行一次 Fixture（scope=function）。

### 生命周期 scope

| scope | 触发时机 | 典型场景 |
|-------|---------|---------|
| `function`（默认）| 每个测试函数执行一次 | 一般测试 |
| `module` | 整个 `.py` 文件执行一次 | 同一模块共享数据 |
| `session` | 整个测试进程执行一次 | 数据库连接、浏览器驱动、Redis 连接 |

```python
@pytest.fixture(scope="module")
def login():
    print("登录系统")
    return "token"
```

### Yield 用法（前置 + 后置）

```python
import pytest

@pytest.fixture
def db():
    print("连接数据库")
    yield "db对象"    # 测试执行到此处
    print("关闭数据库")

def test_a(db):
    print("执行测试")
```

输出顺序：连接数据库 → 执行测试 → 关闭数据库

## 二、Parametrize（参数化）

### 基本用法

```python
@pytest.mark.parametrize(
    "a,b,result",
    [(1, 2, 3), (2, 3, 5), (10, 20, 30)]
)
def test_add(a, b, result):
    assert a + b == result
```

### 字典参数（接口测试常用）

```python
data = [
    {"username": "admin", "password": "123456"},
    {"username": "root",  "password": "123456"},
]

@pytest.mark.parametrize("case", data)
def test_login(case):
    print(case)
```

### 从 YAML 文件读取（企业项目常用）

`login.yaml`：
```yaml
- username: admin
  password: "123456"
- username: root
  password: "123456"
```

```python
import yaml

with open("login.yaml") as f:
    data = yaml.safe_load(f)

@pytest.mark.parametrize("case", data)
def test_login(case):
    # case 就是字典：{"username": "admin", "password": "123456"}
    pass
```

## 三、conftest.py

conftest.py 是 pytest 的全局配置钩子文件，放在项目目录下即可自动生效，**不需要 import**。

```
project/
├── conftest.py       # 作用于整个项目
├── test_user.py
└── order/
    ├── conftest.py   # 仅作用于 order 目录
    └── test_order.py
```

### 公共 Fixture

`conftest.py`：
```python
import pytest

@pytest.fixture
def login():
    token = "abcdefg"
    return token

@pytest.fixture(scope="session")
def db_connection():
    """数据库连接，整个测试进程只连一次"""
    conn = create_db_connection()
    yield conn
    conn.close()
```

任何 `test_*.py` 文件里直接用就行：
```python
def test_user(login):
    assert login == "abcdefg"
```

## 四、pytest.ini（项目级配置）

```ini
[pytest]
addopts = -vs              # 默认参数
testpaths = ./tests        # 测试文件目录
python_files = test_*.py   # 测试文件匹配规则
python_classes = Test*     # 测试类匹配规则
python_functions = test_*  # 测试函数匹配规则
```

| 配置项 | 说明 |
|--------|------|
| `addopts = -vs` | `-v` 详细输出，`-s` 不截断 print |
| `testpaths` | pytest 自动在这个目录下找测试 |
| `python_files` | 只有匹配这个规则的文件才被识别为测试文件 |

## 五、Allure 测试报告

### 安装

```bash
pip install allure-pytest
```

### 执行并生成报告

```bash
# 跑测试，输出原始结果
pytest --alluredir=./result

# 生成 HTML 报告
allure generate result -o report --clean

# 浏览器打开
allure open report
```

### 报告增强

```python
import allure

@allure.title("用户登录测试")
@allure.feature("登录模块")
@allure.story("用户名密码登录")
def test_login():
    pass

@allure.step("输入用户名")
def input_username():
    pass

@allure.step("输入密码")
def input_password():
    pass
```

报告中会按 Feature → Story 层级组织用例，每个 step 都有单独的执行记录。

## 六、Requests + Pytest 接口自动化

企业里最常见的组合：pytest + requests + allure + yaml。

### 登录接口示例

```python
import requests

def test_login():
    url = "http://api.xxx.com/login"
    data = {"username": "admin", "password": "123456"}
    r = requests.post(url, json=data)
    assert r.status_code == 200
    assert r.json()["code"] == 0
```

### 用 Fixture 管理 Token

```python
import pytest
import requests

@pytest.fixture(scope="session")
def token():
    """登录一次，整个测试会话共用 token"""
    r = requests.post(
        "http://api.xxx.com/login",
        json={"username": "admin", "password": "123456"}
    )
    return r.json()["token"]

def test_userinfo(token):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get("http://api.xxx.com/userinfo", headers=headers)
    assert r.status_code == 200
    assert "username" in r.json()
```

### 用 conftest.py 统一管理

```python
# conftest.py
import pytest
import requests

@pytest.fixture(scope="session")
def base_url():
    return "http://api.xxx.com"

@pytest.fixture(scope="session")
def token(base_url):
    r = requests.post(f"{base_url}/login",
        json={"username": "admin", "password": "123456"})
    return r.json()["token"]
```

## 七、推荐的项目结构

```
pytest_project/
├── common/                # 工具类
│   ├── request_util.py    # 封装 requests
│   └── yaml_util.py       # 封装 yaml 读取
├── config/
│   └── config.yaml        # 项目配置（url、账号等）
├── data/                  # 测试数据
│   ├── login.yaml
│   └── user.yaml
├── testcases/             # 测试用例
│   ├── test_login.py
│   └── test_user.py
├── reports/               # 测试报告输出
├── conftest.py            # 全局 Fixture
├── pytest.ini             # 项目配置
└── requirements.txt
```

日常执行：
```bash
pytest                               # 快速跑全部
pytest -v -k "login"                 # 只跑含 login 关键字的用例
pytest --alluredir=result            # 出报告
allure generate result -o report --clean
```
