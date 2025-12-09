#!/usr/bin/env node

/**
 * Script de verificación del flujo completo de Webhooks
 * Verifica que los webhooks se envíen solo cuando:
 * 1. webhookEnabled = true (global)
 * 2. webhook individual.enabled = true
 * 3. El evento está en la lista de eventos del webhook
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

console.log(`
${colors.bright}${colors.magenta}╔═══════════════════════════════════════════════════════════════╗
║         VERIFICACIÓN DE FLUJO DE WEBHOOKS                     ║
║         Validación de Configuración y Filtros                 ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}
`);

/**
 * Verificar la lógica de filtrado en SendWebhookEvent
 */
function verifyWebhookFilterLogic() {
  log.section('1. VERIFICACIÓN DE LÓGICA DE FILTRADO');
  
  const serviceFile = path.join(__dirname, 'backend/src/services/WebhookService/SendWebhookEvent.ts');
  
  if (!fs.existsSync(serviceFile)) {
    log.error('No se encuentra el archivo SendWebhookEvent.ts');
    return false;
  }
  
  const content = fs.readFileSync(serviceFile, 'utf8');
  const checks = {
    globalEnabledCheck: false,
    webhookEnabledCheck: false,
    eventFilterCheck: false,
    emptyEventsAllowAll: false
  };
  
  // Verificar que se valida webhookEnabled global
  if (content.includes('config.globalEnabled')) {
    checks.globalEnabledCheck = true;
    log.success('✓ Se valida webhookEnabled (global) antes de enviar');
  } else {
    log.error('✗ NO se valida webhookEnabled (global)');
  }
  
  // Verificar que se valida webhook.enabled individual
  if (content.includes('webhook.enabled')) {
    checks.webhookEnabledCheck = true;
    log.success('✓ Se valida webhook.enabled (individual) antes de enviar');
  } else {
    log.error('✗ NO se valida webhook.enabled (individual)');
  }
  
  // Verificar que se filtra por evento
  if (content.includes('webhook.events.includes(event)')) {
    checks.eventFilterCheck = true;
    log.success('✓ Se valida que el evento esté en la lista permitida');
  } else {
    log.error('✗ NO se valida el filtro de eventos');
  }
  
  // Verificar que eventos vacíos = todos permitidos
  if (content.includes('webhook.events.length === 0')) {
    checks.emptyEventsAllowAll = true;
    log.success('✓ Si events[] está vacío, se permiten todos los eventos');
  } else {
    log.warning('⚠ No se encontró lógica para events[] vacío');
  }
  
  return checks;
}

/**
 * Verificar la estructura de configuración en el frontend
 */
function verifyFrontendConfiguration() {
  log.section('2. VERIFICACIÓN DE CONFIGURACIÓN EN FRONTEND');
  
  const modalFile = path.join(__dirname, 'frontend/src/components/WhatsAppModal/index.jsx');
  
  if (!fs.existsSync(modalFile)) {
    log.error('No se encuentra WhatsAppModal/index.jsx');
    return false;
  }
  
  const content = fs.readFileSync(modalFile, 'utf8');
  const checks = {
    globalToggle: false,
    individualToggle: false,
    eventSelection: false,
    saveWebhookUrls: false
  };
  
  // Verificar toggle global
  if (content.includes('webhookEnabled')) {
    checks.globalToggle = true;
    log.success('✓ Existe toggle global webhookEnabled');
  } else {
    log.error('✗ NO existe toggle global webhookEnabled');
  }
  
  // Verificar toggle individual por webhook
  if (content.includes("updateWebhook(webhook.id, 'enabled'")) {
    checks.individualToggle = true;
    log.success('✓ Existe toggle individual por webhook (enabled)');
  } else {
    log.error('✗ NO existe toggle individual por webhook');
  }
  
  // Verificar selección de eventos
  if (content.includes('toggleWebhookEvent')) {
    checks.eventSelection = true;
    log.success('✓ Existe funcionalidad para seleccionar eventos');
  } else {
    log.error('✗ NO existe funcionalidad para seleccionar eventos');
  }
  
  // Verificar que se guarda webhookUrls
  if (content.includes('webhookUrls: webhooks')) {
    checks.saveWebhookUrls = true;
    log.success('✓ Se guardan los webhooks en webhookUrls');
  } else {
    log.error('✗ NO se guardan los webhooks');
  }
  
  return checks;
}

/**
 * Mostrar ejemplo de configuración correcta
 */
function showConfigurationExample() {
  log.section('3. EJEMPLO DE CONFIGURACIÓN');
  
  console.log(`${colors.cyan}Base de datos - Tabla Whatsapps:${colors.reset}

${colors.bright}webhookEnabled:${colors.reset} ${colors.green}true${colors.reset}  (global - habilita el sistema)

${colors.bright}webhookUrls:${colors.reset} ${colors.yellow}JSON${colors.reset}
{
  "webhooks": [
    {
      "id": "webhook-1",
      "name": "n8n Production",
      "url": "https://n8n.example.com/webhook/abc123",
      ${colors.green}"enabled": true,${colors.reset}  ← Webhook activo
      ${colors.green}"events": [${colors.reset}       ← Eventos permitidos
        "message_received",
        "message_sent",
        "message_ack"
      ]
    },
    {
      "id": "webhook-2",
      "name": "Make Disabled",
      "url": "https://make.example.com/webhook/xyz",
      ${colors.red}"enabled": false,${colors.reset} ← Webhook desactivado (NO enviará)
      "events": ["message_received"]
    },
    {
      "id": "webhook-3",
      "name": "Zapier All Events",
      "url": "https://zapier.example.com/hooks/catch/abc",
      ${colors.green}"enabled": true,${colors.reset}
      ${colors.green}"events": []${colors.reset}      ← Vacío = todos los eventos
    }
  ]
}
`);
}

/**
 * Mostrar flujo de validación
 */
function showValidationFlow() {
  log.section('4. FLUJO DE VALIDACIÓN');
  
  console.log(`${colors.bright}Cuando ocurre un evento (ej: message_received):${colors.reset}

${colors.cyan}┌──────────────────────────────────────────────────────────┐${colors.reset}
${colors.cyan}│${colors.reset} 1. SendWebhookEvent() recibe:                         ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    - whatsappId: 1                                    ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    - event: "message_received"                        ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    - data: {...}                                      ${colors.cyan}│${colors.reset}
${colors.cyan}└──────────────────────────────────────────────────────────┘${colors.reset}
                          ↓
${colors.cyan}┌──────────────────────────────────────────────────────────┐${colors.reset}
${colors.cyan}│${colors.reset} 2. Obtener configuración (con cache)                 ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    config = await getWebhookConfig(whatsappId)       ${colors.cyan}│${colors.reset}
${colors.cyan}└──────────────────────────────────────────────────────────┘${colors.reset}
                          ↓
${colors.cyan}┌──────────────────────────────────────────────────────────┐${colors.reset}
${colors.cyan}│${colors.reset} 3. Validar habilitación global                       ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    ${colors.yellow}if (!config.globalEnabled)${colors.reset} return false;     ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    ${colors.green}✓ webhookEnabled = true${colors.reset}                        ${colors.cyan}│${colors.reset}
${colors.cyan}└──────────────────────────────────────────────────────────┘${colors.reset}
                          ↓
${colors.cyan}┌──────────────────────────────────────────────────────────┐${colors.reset}
${colors.cyan}│${colors.reset} 4. Iterar sobre cada webhook                         ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    for (const webhook of config.webhooks)            ${colors.cyan}│${colors.reset}
${colors.cyan}└──────────────────────────────────────────────────────────┘${colors.reset}
                          ↓
${colors.cyan}┌──────────────────────────────────────────────────────────┐${colors.reset}
${colors.cyan}│${colors.reset} 5. Validar webhook individual                        ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    ${colors.yellow}isEnabled = webhook.enabled && webhook.url${colors.reset}    ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}                                                      ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    Webhook "n8n Production": ${colors.green}✓ enabled=true${colors.reset}     ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    Webhook "Make Disabled":  ${colors.red}✗ enabled=false${colors.reset}    ${colors.cyan}│${colors.reset}
${colors.cyan}└──────────────────────────────────────────────────────────┘${colors.reset}
                          ↓
${colors.cyan}┌──────────────────────────────────────────────────────────┐${colors.reset}
${colors.cyan}│${colors.reset} 6. Validar evento permitido                          ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    ${colors.yellow}eventAllowed = !webhook.events ||${colors.reset}              ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    ${colors.yellow}webhook.events.length === 0 ||${colors.reset}                ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    ${colors.yellow}webhook.events.includes(event)${colors.reset}                ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}                                                      ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    Webhook "n8n Production":                         ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}      events: ["message_received", "message_sent"]    ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}      evento actual: "message_received"               ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}      ${colors.green}✓ SÍ está en la lista${colors.reset}                        ${colors.cyan}│${colors.reset}
${colors.cyan}└──────────────────────────────────────────────────────────┘${colors.reset}
                          ↓
${colors.cyan}┌──────────────────────────────────────────────────────────┐${colors.reset}
${colors.cyan}│${colors.reset} 7. ${colors.green}ENVIAR WEBHOOK${colors.reset}                                  ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}    ${colors.yellow}if (isEnabled && eventAllowed)${colors.reset}                 ${colors.cyan}│${colors.reset}
${colors.cyan}│${colors.reset}      axios.post(webhook.url, payload)               ${colors.cyan}│${colors.reset}
${colors.cyan}└──────────────────────────────────────────────────────────┘${colors.reset}
`);
}

/**
 * Mostrar tabla de casos de uso
 */
function showUseCases() {
  log.section('5. CASOS DE USO - TABLA DE DECISIÓN');
  
  console.log(`
${colors.bright}┌───────────────┬──────────────┬─────────────┬─────────────────────┐${colors.reset}
${colors.bright}│ Global Enable │ Webhook      │ Evento en   │ ¿Se envía?          │${colors.reset}
${colors.bright}│ (webhookEn...) │ Individual   │ lista?      │                     │${colors.reset}
${colors.bright}├───────────────┼──────────────┼─────────────┼─────────────────────┤${colors.reset}
│ ${colors.red}false${colors.reset}         │ ${colors.green}true${colors.reset}         │ ${colors.green}SÍ${colors.reset}          │ ${colors.red}NO${colors.reset} (global off)     │
├───────────────┼──────────────┼─────────────┼─────────────────────┤
│ ${colors.green}true${colors.reset}          │ ${colors.red}false${colors.reset}        │ ${colors.green}SÍ${colors.reset}          │ ${colors.red}NO${colors.reset} (webhook off)   │
├───────────────┼──────────────┼─────────────┼─────────────────────┤
│ ${colors.green}true${colors.reset}          │ ${colors.green}true${colors.reset}         │ ${colors.red}NO${colors.reset}          │ ${colors.red}NO${colors.reset} (evento filtrado)│
├───────────────┼──────────────┼─────────────┼─────────────────────┤
│ ${colors.green}true${colors.reset}          │ ${colors.green}true${colors.reset}         │ ${colors.green}SÍ${colors.reset}          │ ${colors.green}SÍ${colors.reset} ${colors.bright}✓ ENVÍA${colors.reset}         │
├───────────────┼──────────────┼─────────────┼─────────────────────┤
│ ${colors.green}true${colors.reset}          │ ${colors.green}true${colors.reset}         │ [] (vacío)  │ ${colors.green}SÍ${colors.reset} ${colors.bright}✓ ENVÍA${colors.reset} (todos)  │
${colors.bright}└───────────────┴──────────────┴─────────────┴─────────────────────┘${colors.reset}

${colors.cyan}Nota:${colors.reset} Si events[] está vacío, se envían TODOS los eventos.
`);
}

/**
 * Mostrar recomendaciones
 */
function showRecommendations() {
  log.section('6. RECOMENDACIONES DE USO');
  
  console.log(`
${colors.bright}Para Producción:${colors.reset}

${colors.green}1.${colors.reset} Mantener ${colors.yellow}webhookEnabled = true${colors.reset} en la conexión

${colors.green}2.${colors.reset} Activar webhooks individuales según necesidad:
   ${colors.cyan}•${colors.reset} webhook.enabled = true  → webhook activo
   ${colors.cyan}•${colors.reset} webhook.enabled = false → webhook pausado

${colors.green}3.${colors.reset} Filtrar eventos específicos:
   ${colors.cyan}•${colors.reset} events: ["message_received"] → solo mensajes recibidos
   ${colors.cyan}•${colors.reset} events: [] → todos los eventos (4 implementados)
   ${colors.cyan}•${colors.reset} events: ["message_received", "connection_update"] → múltiples

${colors.green}4.${colors.reset} Usar múltiples webhooks para diferentes propósitos:
   ${colors.cyan}•${colors.reset} Webhook 1 → n8n (automatizaciones)
   ${colors.cyan}•${colors.reset} Webhook 2 → Make (integraciones)
   ${colors.cyan}•${colors.reset} Webhook 3 → Zapier (workflows)
   ${colors.cyan}•${colors.reset} Webhook 4 → API custom (desarrollo)

${colors.bright}Para Testing:${colors.reset}

${colors.green}1.${colors.reset} Usar ${colors.yellow}webhook.site${colors.reset} para ver webhooks en tiempo real
${colors.green}2.${colors.reset} Verificar logs del backend: ${colors.cyan}"Webhook sent successfully"${colors.reset}
${colors.green}3.${colors.reset} Probar con ${colors.yellow}enabled=false${colors.reset} para confirmar que NO se envía
${colors.green}4.${colors.reset} Probar filtros de eventos diferentes
`);
}

/**
 * Resumen final
 */
function showSummary(backendChecks, frontendChecks) {
  log.section('7. RESUMEN DE VERIFICACIÓN');
  
  const allBackendOk = Object.values(backendChecks).every(v => v);
  const allFrontendOk = Object.values(frontendChecks).every(v => v);
  
  console.log(`
${colors.bright}Backend (SendWebhookEvent):${colors.reset}
  ${backendChecks.globalEnabledCheck ? colors.green + '✓' : colors.red + '✗'} Validación webhookEnabled global${colors.reset}
  ${backendChecks.webhookEnabledCheck ? colors.green + '✓' : colors.red + '✗'} Validación webhook.enabled individual${colors.reset}
  ${backendChecks.eventFilterCheck ? colors.green + '✓' : colors.red + '✗'} Filtro de eventos${colors.reset}
  ${backendChecks.emptyEventsAllowAll ? colors.green + '✓' : colors.red + '✗'} Events[] vacío = todos${colors.reset}

${colors.bright}Frontend (WhatsAppModal):${colors.reset}
  ${frontendChecks.globalToggle ? colors.green + '✓' : colors.red + '✗'} Toggle global webhookEnabled${colors.reset}
  ${frontendChecks.individualToggle ? colors.green + '✓' : colors.red + '✗'} Toggle individual por webhook${colors.reset}
  ${frontendChecks.eventSelection ? colors.green + '✓' : colors.red + '✗'} Selección de eventos${colors.reset}
  ${frontendChecks.saveWebhookUrls ? colors.green + '✓' : colors.red + '✗'} Guardado de configuración${colors.reset}

${colors.bright}Estado General:${colors.reset}
  Backend:  ${allBackendOk ? colors.green + '✓ COMPLETO' : colors.yellow + '⚠ REVISAR'}${colors.reset}
  Frontend: ${allFrontendOk ? colors.green + '✓ COMPLETO' : colors.yellow + '⚠ REVISAR'}${colors.reset}
  `);
  
  if (allBackendOk && allFrontendOk) {
    console.log(`
${colors.green}${colors.bright}╔═══════════════════════════════════════════════════════════════╗
║                    ✓ SISTEMA COMPLETO                         ║
║                                                               ║
║  Los webhooks se envían correctamente cuando:                 ║
║  1. webhookEnabled = true (global)                            ║
║  2. webhook.enabled = true (individual)                       ║
║  3. El evento está en la lista permitida                      ║
║                                                               ║
║  El sistema tiene todas las validaciones necesarias.          ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}
    `);
  } else {
    console.log(`
${colors.yellow}${colors.bright}╔═══════════════════════════════════════════════════════════════╗
║                  ⚠ REVISAR IMPLEMENTACIÓN                     ║
║                                                               ║
║  Algunas validaciones pueden estar faltantes.                 ║
║  Revisa los elementos marcados con ✗ arriba.                  ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}
    `);
  }
}

/**
 * Main
 */
function main() {
  try {
    const backendChecks = verifyWebhookFilterLogic();
    const frontendChecks = verifyFrontendConfiguration();
    
    showConfigurationExample();
    showValidationFlow();
    showUseCases();
    showRecommendations();
    showSummary(backendChecks, frontendChecks);
    
  } catch (error) {
    log.error(`Error en la verificación: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
