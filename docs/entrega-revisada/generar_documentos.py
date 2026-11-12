"""Regenera el informe académico completo y sus índices desde fuentes locales."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/entrega-revisada'

if __name__ == '__main__':
    subprocess.run([sys.executable, str(OUT / 'preparar_informe_academico.py')], cwd=ROOT, check=True)
    subprocess.run(['/usr/bin/python3', str(OUT / 'exportar_formato_academico.py')], cwd=ROOT, check=True)
