import re

path = r"c:\Users\ethan.wang18\Desktop\my-blog\content\blog\activation-functions.md"

text = open(path, encoding="utf-8").read()

mapping = {
    "神经元中的激活函数": "/images/activate-function-0.png",
    "激活函数分类": "/images/activate-function-1.png",
    "Sigmoid 函数及其导数": "/images/activate-function-2.jpeg",
    "Tanh 函数": "/images/activate-function-3.png",
    "ReLU 函数及其导数": "/images/activate-function-4.png",
    "Leaky ReLU 与 PReLU": "/images/activate-function-5.png",
    "Swish 函数": "/images/activate-function-6.png",
    "GELU 函数": "/images/activate-function-7.png",
    "激活函数总结对比表": "/images/activate-function-8.png",
}

for alt, correct_src in mapping.items():
    # Match the image shortcode containing this alt text, capture its src
    pattern = rf'({{< image src=")/images/activate-function-[0-9]+\.(png|jpeg)(" alt="{re.escape(alt)}"[^>]*>)'
    text = re.sub(pattern, rf'\1{correct_src}\3', text)

open(path, "w", encoding="utf-8").write(text)
print("Fixed all image src paths.")
