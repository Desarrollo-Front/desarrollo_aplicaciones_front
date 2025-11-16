import subprocess
import sys

result = subprocess.run(
    ['npm', 'run', 'test:ci'],
    cwd=r'c:\Users\juamb\Desktop\Front\desarrollo_aplicaciones_front',
    capture_output=True,
    text=True,
    timeout=120
)

print("STDOUT:")
print(result.stdout)
print("\nSTDERR:")
print(result.stderr)
print("\nReturn code:", result.returncode)
