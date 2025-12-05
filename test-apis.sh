#!/bin/bash

# Script de Verificación de APIs - WhatsApp Integration
# =====================================================

BASE_URL="http://localhost:8080"
API_TOKEN="YOUR_API_TOKEN_HERE"  # <-- REEMPLAZAR CON TU TOKEN REAL

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verificación de APIs WhatsApp v4${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Función para hacer requests y mostrar resultados
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local content_type=$5
    
    echo -e "${YELLOW}Testing:${NC} $description"
    echo -e "${BLUE}Endpoint:${NC} $method $endpoint"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: ${content_type:-application/json}" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ SUCCESS${NC} (HTTP $http_code)"
        echo -e "Response: $(echo $body | head -c 200)..."
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo -e "Response: $body"
    fi
    echo -e "\n${BLUE}----------------------------------------${NC}\n"
}

# ==========================================
# 1. API ORIGINAL (/api)
# ==========================================

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  API Original (/api)${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

# Test 1: Listar Colas
test_endpoint "GET" "/api/queue/list" \
    "Listar todas las colas disponibles"

# ==========================================
# 2. API V1 - TICKETS (/api/v1/tickets)
# ==========================================

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  API v1 - TICKETS${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

# Test 2: Listar todos los tickets
test_endpoint "GET" "/api/v1/tickets" \
    "Listar todos los tickets"

# Test 3: Listar tickets abiertos
test_endpoint "GET" "/api/v1/tickets?status=open&limit=5" \
    "Listar tickets con estado 'open' (límite 5)"

# Test 4: Listar tickets pendientes
test_endpoint "GET" "/api/v1/tickets?status=pending&limit=5" \
    "Listar tickets con estado 'pending' (límite 5)"

# Test 5: Listar tickets cerrados
test_endpoint "GET" "/api/v1/tickets?status=closed&limit=5" \
    "Listar tickets con estado 'closed' (límite 5)"

# ==========================================
# 3. API V1 - CONNECTIONS (/api/v1/connections)
# ==========================================

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  API v1 - CONNECTIONS${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

# Test 6: Listar conexiones
test_endpoint "GET" "/api/v1/connections" \
    "Listar todas las conexiones de WhatsApp"

# ==========================================
# 4. VALIDACIÓN DE ESTRUCTURA DE RESPUESTAS
# ==========================================

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Validación de Estructura de Respuestas${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Verificando estructura de respuesta de tickets...${NC}"
tickets_response=$(curl -s -X GET \
    "$BASE_URL/api/v1/tickets?limit=1" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json")

if echo "$tickets_response" | grep -q '"tickets"'; then
    echo -e "${GREEN}✓${NC} Campo 'tickets' presente"
else
    echo -e "${RED}✗${NC} Campo 'tickets' ausente"
fi

if echo "$tickets_response" | grep -q '"count"'; then
    echo -e "${GREEN}✓${NC} Campo 'count' presente"
else
    echo -e "${RED}✗${NC} Campo 'count' ausente"
fi

if echo "$tickets_response" | grep -q '"hasMore"'; then
    echo -e "${GREEN}✓${NC} Campo 'hasMore' presente"
else
    echo -e "${RED}✗${NC} Campo 'hasMore' ausente"
fi

echo -e "\n${BLUE}----------------------------------------${NC}\n"

# ==========================================
# 5. PRUEBAS DE AUTENTICACIÓN
# ==========================================

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Pruebas de Autenticación${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Testing:${NC} Request sin token de autenticación"
no_auth_response=$(curl -s -w "\n%{http_code}" -X GET \
    "$BASE_URL/api/v1/tickets")

http_code=$(echo "$no_auth_response" | tail -n1)

if [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ]; then
    echo -e "${GREEN}✓ SUCCESS${NC} - La API rechaza correctamente requests sin autenticación (HTTP $http_code)"
else
    echo -e "${RED}✗ WARNING${NC} - La API no rechaza requests sin autenticación (HTTP $http_code)"
fi

echo -e "\n${BLUE}----------------------------------------${NC}\n"

echo -e "${YELLOW}Testing:${NC} Request con token inválido"
invalid_auth_response=$(curl -s -w "\n%{http_code}" -X GET \
    "$BASE_URL/api/v1/tickets" \
    -H "Authorization: Bearer INVALID_TOKEN_12345")

http_code=$(echo "$invalid_auth_response" | tail -n1)

if [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ]; then
    echo -e "${GREEN}✓ SUCCESS${NC} - La API rechaza correctamente tokens inválidos (HTTP $http_code)"
else
    echo -e "${RED}✗ WARNING${NC} - La API no rechaza tokens inválidos (HTTP $http_code)"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  Verificación Completada${NC}"
echo -e "${BLUE}========================================${NC}\n"

# ==========================================
# 6. RESUMEN DE ENDPOINTS DISPONIBLES
# ==========================================

echo -e "${GREEN}RESUMEN DE ENDPOINTS DISPONIBLES:${NC}\n"

echo -e "${BLUE}API Original (/api):${NC}"
echo "  • POST   /api/send              - Enviar mensaje"
echo "  • GET    /api/queue/list        - Listar colas"
echo ""

echo -e "${BLUE}API v1 - Tickets (/api/v1/tickets):${NC}"
echo "  • GET    /api/v1/tickets                      - Listar tickets"
echo "  • GET    /api/v1/tickets/:ticketId            - Obtener ticket"
echo "  • POST   /api/v1/tickets                      - Crear ticket"
echo "  • PUT    /api/v1/tickets/:ticketId            - Actualizar ticket"
echo ""

echo -e "${BLUE}API v1 - Messages (/api/v1/tickets/:ticketId/messages):${NC}"
echo "  • GET    /api/v1/tickets/:ticketId/messages        - Listar mensajes"
echo "  • POST   /api/v1/tickets/:ticketId/messages        - Enviar mensaje de texto"
echo "  • POST   /api/v1/tickets/:ticketId/messages/media  - Enviar mensaje con multimedia"
echo "  • POST   /api/v1/tickets/:ticketId/messages/media-url - Enviar multimedia desde URL"
echo "  • POST   /api/v1/messages/:messageId/reply         - Responder mensaje"
echo ""

echo -e "${BLUE}API v1 - Direct Send (/api/v1/send):${NC}"
echo "  • POST   /api/v1/send - Enviar mensaje directo a número"
echo ""

echo -e "${BLUE}API v1 - Contacts (/api/v1/contacts):${NC}"
echo "  • GET    /api/v1/contacts/:number     - Obtener contacto"
echo "  • POST   /api/v1/contacts             - Crear/actualizar contacto"
echo "  • POST   /api/v1/contacts/validate    - Validar número en WhatsApp"
echo ""

echo -e "${BLUE}API v1 - Connections (/api/v1/connections):${NC}"
echo "  • GET    /api/v1/connections                 - Listar conexiones"
echo "  • GET    /api/v1/connections/:connectionId   - Estado de conexión"
echo ""

echo -e "\n${YELLOW}NOTA:${NC} Recuerda reemplazar 'YOUR_API_TOKEN_HERE' en la línea 7 del script con tu token real."
echo -e "${YELLOW}      Puedes obtener el token en: Configuraciones > API Token${NC}\n"
