#!/bin/bash

# Script de verificación de mejoras implementadas
# Ejecutar desde: backend/

echo "🔍 Verificando mejoras implementadas..."
echo ""

# Verificar archivos modificados
echo "✅ Archivos corregidos:"
files=(
  "src/services/QueueService/UpdateQueueService.ts"
  "src/services/QueueService/ListQueuesService.ts"
  "src/services/QueueService/DeleteQueueService.ts"
  "src/config/upload.ts"
  "src/services/WbotServices/SendWhatsAppMedia.ts"
  "src/controllers/MessageController.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (NO ENCONTRADO)"
  fi
done

echo ""
echo "🆕 Archivos nuevos:"
new_files=(
  "src/utils/fileCleanup.ts"
  "src/services/FileCleanupService.ts"
)

for file in "${new_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (NO ENCONTRADO)"
  fi
done

echo ""
echo "📦 Verificando dependencias necesarias..."

# Verificar package.json tiene node-cron
if grep -q '"node-cron"' package.json; then
  echo "  ✓ node-cron instalado"
else
  echo "  ✗ node-cron NO encontrado - ejecutar: npm install node-cron"
fi

if grep -q '"@types/node-cron"' package.json; then
  echo "  ✓ @types/node-cron instalado"
else
  echo "  ⚠️  @types/node-cron NO encontrado (opcional)"
fi

echo ""
echo "🔨 Para compilar y probar:"
echo "  npm run build"
echo "  npm run dev"
echo ""
echo "📚 Revisa ANALISIS_Y_MEJORAS.md para más detalles"
