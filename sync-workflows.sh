#!/bin/bash
set -e

# ⚠️ Asegurate de no tener cambios sin commitear
git fetch origin

BASE="origin/develop"
FILES=(
  ".github/workflows/preview.yml"
  ".github/workflows/ci.yml"
)

# 👉 todas las ramas que vi en tu screenshot
branches=(
  "feature/Login"
  "fix/Pagos-Listav2"
  "feature/Gateway"
  "fix/Pagos-Lista"
  "feature/Disputas"
  "feature/Facturas"
  "feature/Intenciones"
  "feature/Pagos-Detalle"
  "feature/Pagos-Lista"
  "feature/tu-feature"
)

for br in "${branches[@]}"; do
  echo "=== Actualizando $br ==="
  if ! git switch "$br"; then
    echo "   (salteada: no existe localmente)"; continue
  fi

  # Traigo workflows desde develop
  changed=false
  for f in "${FILES[@]}"; do
    if git cat-file -e "$BASE":"$f" 2>/dev/null; then
      git checkout "$BASE" -- "$f" && changed=true
    fi
  done

  if $changed && ! git diff --quiet -- .github/workflows; then
    git add .github/workflows
    git commit -m "ci: sync workflows from develop (CI + Preview)"
    git push origin HEAD
    echo "   ✅ pusheado, se van a re-correr los checks"
  else
    echo "   ℹ️ no había cambios en workflows para $br"
  fi
done

# Volver a la rama donde estabas
git switch -
