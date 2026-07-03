+++
date = '2026-07-02T18:00:00+08:00'
draft = false
title = 'Pytest 从入门到企业实战'
categories = ['Dev Tools']
tags = ['Pytest', 'Python', '测试', '自动化', 'Allure']
+++

Pytest 学习文档，从入门到企业实战，涵盖 Fixture、Parametrize、conftest.py、pytest.ini、Allure 测试报告及 Requests + Pytest 接口自动化。

<!--more-->

## 快速入门

### 1. 安装 pytest

```bash
pip install pytest
pytest --version
```

### 2. 创建项目

```bash
mkdir pytest_demo && cd pytest_demo
touch calculator.py test_calculator.py
```

### 3. 编写业务代码

`calculator.py`：

```python
def add(a, b):
    return a + b

def divide(a, b):
    return a / b
```

### 4. 编写测试代码

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

这里演示了：
- 普通断言 `assert`
- 异常校验 `pytest.raises()`

### 5. 执行测试

```bash
pytest       # 简洁输出
pytest -v    # 详细输出
```

pytest 最强大的地方之一：断言失败时会自动展示实际值和期望值。

### 6. 参数化测试（实际项目很常用）

```python
import pytest
from calculator import add

@pytest.mark.parametrize(
    "a,b,expected",
    [(1, 2, 3), (2, 3, 5), (10, 20, 30)]
)
def test_add_param(a, b, expected):
    assert add(a, b) == expected
```

## 一、Fixture（测试夹具）

Fixture 是 pytest 最核心的功能之一。作用：
- 测试前准备数据
- 测试后清理环境
- 多个测试共享资源

### 最简单的 Fixture

```python
import pytest

@pytest.fixture
def login():
    print("执行登录")
    token = "abcdefg"
    return token

def test_order(login):
    print(f"获取token:{login}")
    assert login == "abcdefg"
```

### Fixture 生命周期

| scope | 含义 |
|-------|------|
| `function`（默认）| 每个测试执行一次 |
| `module` | 当前文件只执行一次 |
| `session` | 整个项目执行一次 |

常用于：数据库连接、浏览器驱动、Redis 连接。

### Yield 用法

```python
import pytest

@pytest.fixture
def db():
    print("连接数据库")
    yield "db对象"
    print("关闭数据库")

def test_a(db):
    print("执行测试")
```

输出：连接数据库 → 执行测试 → 关闭数据库

## 二、Parametrize（参数化）

```python
import pytest

@pytest.mark.parametrize(
    "a,b,result",
    [(1,2,3), (2,3,5), (10,20,30)]
)
def test_add(a, b, result):
    assert a + b == result
```

### 从 YAML 读取（企业项目常用）

```yaml
# login.yaml
- username: admin
  password: 123456
- username: root
  password: 123456
```

```python
import yaml

with open("login.yaml") as f:
    data = yaml.safe_load(f)

@pytest.mark.parametrize("case", data)
def test_login(case):
    print(case)
```

## 三、conftest.py

Pytest 全局配置文件，主要用途：公共 Fixture、Hook 函数、测试初始化。

```
project/
├── conftest.py       # 作用于整个项目
├── user/
│   ├── conftest.py   # 仅作用于 user 目录
│   └── test_user.py
└── order/
    └── test_order.py
```

无需 import，Pytest 自动发现。

## 四、pytest.ini

```ini
[pytest]
addopts = -vs
testpaths = ./tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

| 配置项 | 说明 |
|--------|------|
| `addopts = -vs` | 默认参数，等同 `pytest -vs` |
| `testpaths = tests` | 测试目录 |
| `python_files = test_*.py` | 测试文件匹配规则 |

## 五、Allure 测试报告

```bash
pip install allure-pytest

# 执行测试
pytest --alluredir=./result

# 生成报告
allure generate result -o report --clean

# 打开
allure open report
```

### 添加标题和步骤

```python
import allure

@allure.title("用户登录测试")
@allure.step("输入用户名")
def test_login():
    pass
```

## 六、Requests + Pytest 接口自动化

企业最常见组合：pytest + requests + allure + yaml

### 登录接口测试

```python
import requests

def test_login():
    url = "http://api.xxx.com/login"
    data = {"username":"admin", "password":"123456"}
    r = requests.post(url, json=data)
    assert r.status_code == 200
    assert r.json()["code"] == 0
```

### Fixture 保存 Token

```python
import pytest
import requests

@pytest.fixture(scope="session")
def token():
    r = requests.post(
        "http://api.xxx.com/login",
        json={"username":"admin", "password":"123456"}
    )
    return r.json()["token"]

def test_userinfo(token):
    headers = {"token": token}
    r = requests.get("http://api.xxx.com/userinfo", headers=headers)
    assert r.status_code == 200
```

## 七、企业级项目结构（推荐）

```
pytest_project/
├── common/
│   ├── request_util.py
│   └── yaml_util.py
├── config/
│   └── config.yaml
├── data/
│   ├── login.yaml
│   └── user.yaml
├── testcases/
│   ├── test_login.py
│   └── test_user.py
├── reports/
├── conftest.py
├── pytest.ini
└── requirements.txt
```

执行：

```bash
pytest
pytest --alluredir=result
allure generate result -o report --clean
```
