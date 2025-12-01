import { Client, Message as WbotMessage, MessageMedia } from "whatsapp-web.js";
import path from "path";
import fs from "fs";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { verifyMessage } from "./wbotMessageListener";
import ShowDialogChatBotsServices from "../DialogChatBotsServices/ShowDialogChatBotsServices";
import ShowQueueService from "../QueueService/ShowQueueService";
import ShowChatBotServices from "../ChatBotServices/ShowChatBotServices";
import DeleteDialogChatBotsServices from "../DialogChatBotsServices/DeleteDialogChatBotsServices";
import ShowChatBotByChatbotIdServices from "../ChatBotServices/ShowChatBotByChatbotIdServices";
import CreateDialogChatBotsServices from "../DialogChatBotsServices/CreateDialogChatBotsServices";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import formatBody from "../../helpers/Mustache";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import Chatbot from "../../models/Chatbot";
import User from "../../models/User";
import { getIO } from "../../libs/socket";

type Session = Client & {
  id?: number;
};

const isNumeric = (value: string) => /^-?\d+$/.test(value);

export const deleteAndCreateDialogStage = async (
  contact: Contact,
  chatbotId: number,
  ticket: Ticket
) => {
  try {
    await DeleteDialogChatBotsServices(contact.id);
    
    // Buscar el chatbot por su ID (no por chatbotId padre)
    const bot = await Chatbot.findByPk(chatbotId);
    
    if (!bot) {
      console.error(`[deleteAndCreateDialogStage] Chatbot ${chatbotId} no encontrado`);
      await ticket.update({ isBot: false });
      return;
    }
    
    console.log(`[deleteAndCreateDialogStage] Creando dialog stage:`, {
      contactId: contact.id,
      chatbotId: bot.id,
      queueId: bot.queueId,
      parentChatbotId: bot.chatbotId
    });
    
    return await CreateDialogChatBotsServices({
      awaiting: 1,
      contactId: contact.id,
      chatbotId: bot.id, // Guardar el ID del chatbot actual
      queueId: bot.queueId
    });
  } catch (error) {
    console.error(`[deleteAndCreateDialogStage] Error:`, error);
    await ticket.update({ isBot: false });
  }
};

const sendMessage = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket,
  body: string
) => {
  const sentMessage = await wbot.sendMessage(
    `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
    formatBody(body, ticket)
  );
  verifyMessage(sentMessage, ticket, contact);
};

const sendDialog = async (
  choosenQueue: Chatbot,
  wbot: Session,
  contact: Contact,
  ticket: Ticket
) => {
  console.log(`[sendDialog] Iniciando para chatbot ${choosenQueue.id}`);
  const showChatBots = await ShowChatBotServices(choosenQueue.id);
  
  console.log(`[sendDialog] Chatbot cargado:`, {
    id: showChatBots.id,
    name: showChatBots.name,
    hasGreeting: !!showChatBots.greetingMessage,
    hasMedia: !!showChatBots.mediaPath,
    optionsCount: showChatBots.options?.length || 0,
    options: showChatBots.options?.map(o => ({ id: o.id, name: o.name }))
  });
  
  const messageTarget = `${contact.number}@${ticket.isGroup ? "g.us" : "c.us"}`;
  
  // Construir mensaje completo: saludo + opciones
  let fullMessage = "";
  
  if (choosenQueue.greetingMessage) {
    fullMessage = choosenQueue.greetingMessage;
  }
  
  // Agregar opciones al mismo mensaje si existen
  if (showChatBots.options && showChatBots.options.length > 0) {
    let options = "";
    
    showChatBots.options.forEach((option, index) => {
      options += `🔹 *${index + 1}* - ${option.name}\n`;
    });
    
    // Si ya hay un mensaje de saludo, agregar las opciones con separación
    if (fullMessage) {
      fullMessage += `\n\n${options}`;
    } else {
      fullMessage = options;
    }
    
    console.log(`[sendDialog] Agregadas ${showChatBots.options.length} opciones al mensaje`);
  } else {
    console.log(`[sendDialog] No hay subopciones para mostrar`);
  }
  
  // Agregar opción de volver SIEMPRE (incluso si no hay subopciones)
  fullMessage += `\n\n*#* *Para volver al menu principal*`;
  
  // Enviar mensaje completo (saludo + opciones juntos)
  if (fullMessage) {
    const body = `\u200e${fullMessage}`;
    const formattedBody = formatBody(body, ticket);
    
    console.log(`[sendDialog] Enviando mensaje completo`);
    const sentMessage = await wbot.sendMessage(messageTarget, formattedBody);
    await verifyMessage(sentMessage, ticket, contact);
  }

  // Enviar multimedia si existe (separado)
  if (choosenQueue.mediaPath) {
    try {
      console.log(`[sendDialog] Intentando enviar multimedia:`, choosenQueue.mediaPath);
      const publicPath = path.resolve(__dirname, "..", "..", "..", "public");
      const mediaPath = path.join(publicPath, choosenQueue.mediaPath);
      
      console.log(`[sendDialog] Ruta completa del archivo:`, mediaPath);
      console.log(`[sendDialog] Archivo existe?:`, fs.existsSync(mediaPath));
      
      if (fs.existsSync(mediaPath)) {
        console.log(`[sendDialog] Creando MessageMedia desde archivo...`);
        const media = MessageMedia.fromFilePath(mediaPath);
        
        console.log(`[sendDialog] MessageMedia creado:`, {
          mimetype: media.mimetype,
          filename: media.filename,
          dataLength: media.data?.length || 0
        });
        
        const sentMedia = await wbot.sendMessage(messageTarget, media, { 
          sendAudioAsVoice: true 
        });
        await verifyMessage(sentMedia, ticket, contact);
        console.log(`[sendDialog] Multimedia enviada exitosamente`);
      } else {
        console.error(`[sendDialog] ERROR: Archivo no existe en la ruta:`, mediaPath);
      }
    } catch (mediaError) {
      console.error("[sendDialog] Error enviando multimedia:", mediaError);
      console.error("[sendDialog] Stack:", mediaError.stack);
    }
  } else {
    console.log(`[sendDialog] No hay multimedia configurada para este chatbot`);
  }
  
  console.log(`[sendDialog] Completado para chatbot ${choosenQueue.id}`);
};

const backToMainMenu = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket
) => {
  const { queues, greetingMessage } = await ShowWhatsAppService(wbot.id!);
  let options = "";

  queues.forEach((option, index) => {
    options += `🔹 *${index + 1}* - ${option.name}\n`;
  });

  const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);
  await sendMessage(wbot, contact, ticket, body);

  await UpdateTicketService({
    ticketData: { queueId: null },
    ticketId: ticket.id
  });

  const deleteDialog = await DeleteDialogChatBotsServices(contact.id);
  return deleteDialog;
};

export const sayChatbot = async (
  queueId: number,
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  msg: WbotMessage
): Promise<any> => {
  const selectedOption = msg.body;
  if (!queueId && selectedOption && msg.fromMe) return;

  // SIEMPRE verificar # primero, antes de cualquier otra lógica
  if (selectedOption === "#") {
    console.log("[ChatBotListener] Usuario solicitó volver al menú principal con #");
    const backTo = await backToMainMenu(wbot, contact, ticket);
    return backTo;
  }

  const getStageBot = await ShowDialogChatBotsServices(contact.id);

  if (!getStageBot) {
    console.log("[ChatBotListener] No hay dialog existente - mostrando menú del queue");
    
    // Cargar el queue
    const queue = await ShowQueueService(queueId);
    
    // Construir el menú con las opciones del chatbot
    let optionsMessage = queue.greetingMessage || "Seleccione una opción:";
    optionsMessage += "\n\n";
    
    queue.chatbots.forEach((chatbot, index) => {
      optionsMessage += `🔹 *${index + 1}* - ${chatbot.name}\n`;
    });
    
    optionsMessage += "\n\n*#* *Para volver al menu principal*";
    
    const body = formatBody(`\u200e${optionsMessage}`, ticket);
    await sendMessage(wbot, contact, ticket, body);
    
    console.log("[ChatBotListener] Menú del queue enviado. Esperando selección del usuario.");
    
    // Crear un dialog temporal con queueId para indicar que estamos esperando selección
    await CreateDialogChatBotsServices({
      awaiting: 1,
      contactId: contact.id,
      queueId: queueId
    });
    
    return;
  }

  if (getStageBot) {
    // Si el dialog tiene solo queueId (sin chatbotId), procesamos la selección del queue
    if (getStageBot.queueId && !getStageBot.chatbotId) {
      console.log("[ChatBotListener] Procesando selección del queue");
      
      const queue = await ShowQueueService(getStageBot.queueId);
      const choosenQueue = queue.chatbots[+selectedOption - 1];
      
      if (!choosenQueue) {
        console.log("[ChatBotListener] Opción inválida");
        await DeleteDialogChatBotsServices(contact.id);
        return;
      }
      
      if (!choosenQueue.greetingMessage) {
        console.log("[ChatBotListener] Opción sin mensaje de bienvenida");
        await DeleteDialogChatBotsServices(contact.id);
        return;
      }

      if (choosenQueue.isAgent) {
        console.log("[ChatBotListener] Transfiriendo a agente:", choosenQueue.name);
        const getUserByName = await User.findOne({
          where: {
            name: choosenQueue.name
          }
        });
        
        if (getUserByName) {
          await ticket.update({
            userId: getUserByName.id,
            status: "open",
            isBot: false
          });
          
          await ticket.reload({
            include: [
              { model: Contact, as: "contact" },
              { model: User, as: "user" }
            ]
          });
          
          await DeleteDialogChatBotsServices(contact.id);
          
          const io = getIO();
          io.to(ticket.status)
            .to(ticket.id.toString())
            .emit("ticket", {
              action: "update",
              ticket
            });
          
          console.log("[ChatBotListener] Transferido a agente", getUserByName.name);
          return;
        }
      }
      
      // Continuar con el flujo normal - actualizar dialog y enviar mensaje
      await deleteAndCreateDialogStage(contact, choosenQueue.id, ticket);
      const send = await sendDialog(choosenQueue, wbot, contact, ticket);
      return send;
    }
    
    // Si el dialog tiene chatbotId, procesamos la selección de subopciones
    const selected = isNumeric(selectedOption) ? selectedOption : 1;
    
    console.log("[ChatBotListener] getStageBot:", {
      contactId: contact.id,
      chatbotId: getStageBot.chatbotId,
      selectedOption,
      selected
    });
    
    try {
      const bots = await ShowChatBotServices(getStageBot.chatbotId);
      
      console.log("[ChatBotListener] Chatbot padre cargado:", {
        id: bots.id,
        name: bots.name,
        chatbotId: bots.chatbotId,
        queueId: bots.queueId,
        hasOptions: !!bots.options,
        optionsLength: bots.options?.length || 0,
        optionsDetails: bots.options?.map(o => ({ 
          id: o.id, 
          name: o.name, 
          chatbotId: o.chatbotId,
          queueId: o.queueId 
        }))
      });
      
      const choosenQueue = bots.options[+selected - 1]
        ? bots.options[+selected - 1]
        : bots.options[0];
        
      if (!choosenQueue) {
        console.log("[ChatBotListener] No hay subopciones disponibles");
        
        // Si el chatbot actual es agente Y existe el usuario, transferir
        if (bots.isAgent) {
          console.log("[ChatBotListener] Chatbot marcado como agente:", bots.name);
          const getUserByName = await User.findOne({
            where: {
              name: bots.name
            }
          });
          
          if (getUserByName) {
            console.log("[ChatBotListener] Usuario encontrado - transfiriendo al agente");
            await ticket.update({
              userId: getUserByName.id,
              status: "open",
              isBot: false
            });
            
            await ticket.reload({
              include: [
                { model: Contact, as: "contact" },
                { model: User, as: "user" }
              ]
            });
            
            await DeleteDialogChatBotsServices(contact.id);
            
            const io = getIO();
            io.to(ticket.status)
              .to(ticket.id.toString())
              .emit("ticket", {
                action: "update",
                ticket
              });
            
            console.log("[ChatBotListener] Transferido exitosamente al agente", getUserByName.name);
            return;
          } else {
            console.log("[ChatBotListener] ADVERTENCIA: Usuario", bots.name, "no existe - continuando con flujo normal");
          }
        }
        
        // Si tiene mensaje, enviarlo (fin del flujo)
        if (bots.greetingMessage) {
          console.log("[ChatBotListener] Enviando mensaje del chatbot actual (sin subopciones)");
          await sendDialog(bots, wbot, contact, ticket);
          return;
        }
        
        // No hay configuración - fin del flujo
        console.log("[ChatBotListener] No hay configuración disponible - fin del flujo");
        return;
      }
      
      if (!choosenQueue.greetingMessage) {
        console.log("[ChatBotListener] Opción sin mensaje de bienvenida");
        await DeleteDialogChatBotsServices(contact.id);
        return;
      }

      if (choosenQueue) {
        if (choosenQueue.isAgent) {
          console.log("[ChatBotListener] Transfiriendo a agente (subopción):", choosenQueue.name);
          const getUserByName = await User.findOne({
            where: {
              name: choosenQueue.name
            }
          });
          
          if (getUserByName) {
            // Actualizar ticket
            await ticket.update({
              userId: getUserByName.id,
              status: "open",
              isBot: false
            });
            
            // Recargar ticket con todas las relaciones
            await ticket.reload({
              include: [
                { model: Contact, as: "contact" },
                { model: User, as: "user" }
              ]
            });
            
            // Limpiar dialog
            await DeleteDialogChatBotsServices(contact.id);
            
            // Emitir evento de actualización al frontend
            const io = getIO();
            io.to(ticket.status)
              .to(ticket.id.toString())
              .emit("ticket", {
                action: "update",
                ticket
              });
            
            console.log("[ChatBotListener] Transferido a agente", getUserByName.name, "- chatbot finalizado");
            return;
          }
        }
        
        // Continuar con el flujo normal - actualizar dialog y enviar mensaje
        await deleteAndCreateDialogStage(contact, choosenQueue.id, ticket);
        const send = await sendDialog(choosenQueue, wbot, contact, ticket);
        return send;
      }
    } catch (error) {
      console.error("[ChatBotListener] Error procesando subopción:", {
        error: error.message,
        chatbotId: getStageBot.chatbotId,
        contactId: contact.id
      });
      // Si falla, volver al menú principal
      await DeleteDialogChatBotsServices(contact.id);
      const backTo = await backToMainMenu(wbot, contact, ticket);
      return backTo;
    }
  }
  console.log();
};
