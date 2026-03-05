#!/bin/bash

# Script de Prueba Rápida de APIs
# Verificar conectividad básica del backend

BASE_URL="http://localhost:8080"

echo "========================================="
echo "  Verificación Rápida del Backend"
echo "========================================="
echo ""

# Test 1: Verificar que el servidor responde
echo "1. Verificando conectividad del servidor..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/queue/list")
if [ "$response" -eq 401 ] || [ "$response" -eq 403 ]; then
    echo "   ✓ Servidor respondiendo (requiere autenticación - esperado)"
elif [ "$response" -eq 200 ]; then
    echo "   ✓ Servidor respondiendo correctamente"
else
    echo "   ✗ Servidor no responde correctamente (HTTP $response)"
fi

echo ""
echo "========================================="
echo ""
echo "Para continuar con las pruebas completas:"
echo "1. Obtén tu API Token desde el panel de administración"
echo "   (Configuraciones > API Token)"
echo ""
echo "2. Edita el archivo test-apis.sh y reemplaza:"
echo "   API_TOKEN=\"YOUR_API_TOKEN_HERE\""
echo ""
echo "3. Ejecuta:"
echo "   bash test-apis.sh"
echo ""
echo "========================================="
