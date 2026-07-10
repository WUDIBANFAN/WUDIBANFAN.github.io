import os, shutil

src_dir = r"c:\Users\ethan.wang18\Desktop\my-blog\static\images"

# Current state (after previous swaps) and target 0-based numbering:
# 0.png = neuron (keep)
# 1.png = duplicate neuron (delete)
# 2.png -> 1.png (classification tree)
# 3.jpeg -> 2.jpeg (sigmoid)
# 4.png -> 3.png (tanh)
# 5.png -> 4.png (relu)
# 6.png -> 5.png (leaky relu)
# 7.png -> 6.png (swish)
# 8.png -> 7.png (gelu)
# 9.png -> 8.png (summary table)

# Delete duplicate neuron at 1.png
os.remove(os.path.join(src_dir, "activate-function-1.png"))
print("Deleted duplicate activate-function-1.png")

# First, rename all shifting files to temp names to avoid collisions
renames = [
    ("activate-function-2.png", "activate-function-1.png"),
    ("activate-function-3.jpeg", "activate-function-2.jpeg"),
    ("activate-function-4.png", "activate-function-3.png"),
    ("activate-function-5.png", "activate-function-4.png"),
    ("activate-function-6.png", "activate-function-5.png"),
    ("activate-function-7.png", "activate-function-6.png"),
    ("activate-function-8.png", "activate-function-7.png"),
    ("activate-function-9.png", "activate-function-8.png"),
]

for old, new in renames:
    os.rename(os.path.join(src_dir, old), os.path.join(src_dir, old + ".tmp"))

for old, new in renames:
    os.rename(os.path.join(src_dir, old + ".tmp"), os.path.join(src_dir, new))
    print(f"Renamed: {old} -> {new}")

print("Done.")
