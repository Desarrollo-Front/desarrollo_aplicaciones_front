#!/bin/bash

# 🚀 Script de deploy del frontend a AWS S3
# Autor: Manu 💻

BUCKET_NAME="manu-frontend-website-32010f8f"
BUILD_DIR="dist"

echo "🧹 Limpiando build anterior..."
rm -rf $BUILD_DIR

echo "🏗️ Generando nuevo build..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Error al generar el build. Abortando."
  exit 1
fi

echo "☁️ Subiendo archivos al bucket S3: $BUCKET_NAME ..."
aws s3 sync $BUILD_DIR/ s3://$BUCKET_NAME --delete


if [ $? -eq 0 ]; then
  echo "✅ Deploy exitoso!"
  echo "🌍 Sitio disponible en:"
  echo "   http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
else
  echo "❌ Error al subir archivos al bucket."
fi
