import moment from "moment";
import * as Sentry from "@sentry/node";
import { Op } from "sequelize";
import { logger } from "../../utils/logger";
import Ticket from "../../models/Ticket";
// import Whatsapp from "../../models/Whatsapp"
import { getIO } from "../../libs/socket";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import formatBody from "../../helpers/Mustache";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";

// import Tag from "../../models/Tag";

export const ClosedAllOpenTickets = async (): Promise<void> => {
  const io = getIO();
  // @ts-ignore: Unreachable code error
  const closeTicket = async (
    ticket: Ticket,
    useNPS: boolean,
    currentStatus: any
  ) => {
    if (currentStatus === "nps") {
      await ticket.update({
        status: "closed",
        userId: ticket.userId || null,
        queueId: ticket.queueId || null,
        unreadMessages: 0
      });
    } else if (currentStatus === "open") {
      await ticket.update({
        status: useNPS ? "nps" : "closed",
        userId: ticket.userId || null,
        queueId: ticket.queueId || null,
        unreadMessages: 0
      });
    } else {
      await ticket.update({
        status: "closed",
        userId: ticket.userId || null,
        queueId: ticket.queueId || null,
        unreadMessages: 0
      });
    }
  };

  try {
    const whatsappCache = new Map<
      number,
      Awaited<ReturnType<typeof ShowWhatsAppService>>
    >();
    const batchSize = 200;
    let cursor: number | null = null;

    const loadTickets = async () => {
      const whereCondition: any = { status: "open" };

      if (cursor !== null) {
        whereCondition.id = { [Op.gt]: cursor };
      }

      const tickets = await Ticket.findAll({
        where: whereCondition,
        order: [["id", "ASC"]],
        limit: batchSize
      });

      return tickets;
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const tickets = await loadTickets();

      if (!tickets.length) {
        break;
      }

      cursor = tickets[tickets.length - 1].id;

      // eslint-disable-next-line no-restricted-syntax
      for (const ticket of tickets) {
        try {
          if (!ticket.whatsappId) {
            // eslint-disable-next-line no-continue
            continue;
          }

          let whatsapp = whatsappCache.get(ticket.whatsappId);

          if (!whatsapp) {
            whatsapp = await ShowWhatsAppService(ticket.whatsappId);
            whatsappCache.set(ticket.whatsappId, whatsapp);
          }

          const ticketBody = ticket;
          const horasFecharAutomaticamente = whatsapp?.timeInactiveMessage;
          const useNPS = whatsapp?.useNPS;
          const sendIsInactive = whatsapp?.sendInactiveMessage;
          const messageInactive = whatsapp?.inactiveMessage;
          const { fromMe } = ticket;
          const { isMsgGroup } = ticket;
          const ticketTraking = await FindOrCreateATicketTrakingService({
            ticketId: ticket.id,
            whatsappId: whatsapp.id,
            userId: ticket.userId
          });

          // Define horario para fechar automaticamente ticket aguardando avaliação. Tempo default: 10 minutos
          if (ticketTraking) {
            const dataLimiteNPS = new Date();
            dataLimiteNPS.setMinutes(dataLimiteNPS.getMinutes() - 10);
            if (
              ticketTraking.finishedAt === null &&
              ticketTraking.ratingAt === null &&
              ticketTraking.closedAt !== null &&
              ticketTraking.closedAt < dataLimiteNPS
            ) {
              closeTicket(ticket, useNPS, ticket.status);

              await ticketTraking.update({
                closedAt: moment().toDate(),
                finishedAt: moment().toDate()
              });

              io.to("open").emit("ticket", {
                action: "delete",
                ticket,
                ticketId: ticket.id
              });
            }
          }

          // @ts-ignore: Unreachable code error
          if (
            horasFecharAutomaticamente &&
            horasFecharAutomaticamente !== "" &&
            // @ts-ignore: Unreachable code error
            horasFecharAutomaticamente !== "0" &&
            Number(horasFecharAutomaticamente) > 0
          ) {
            const dataLimite = new Date();

            if (Number(horasFecharAutomaticamente) < 1) {
              dataLimite.setMinutes(
                dataLimite.getMinutes() -
                  Number(horasFecharAutomaticamente) * 60
              );
            } else {
              dataLimite.setHours(
                dataLimite.getHours() - Number(horasFecharAutomaticamente)
              );
            }

            // console.log(dataLimite + " TEMPO FECHAMENTO " + horasFecharAutomaticamente)

            if (ticket.status === "open" && fromMe && !isMsgGroup) {
              const dataUltimaInteracaoChamado = new Date(ticket.updatedAt);

              if (dataUltimaInteracaoChamado < dataLimite) {
                if (
                  sendIsInactive &&
                  ticket.status === "open" &&
                  messageInactive
                ) {
                  const body = formatBody(
                    `\u200e${messageInactive}`,
                    ticketBody
                  );
                  await SendWhatsAppMessage({ body, ticket: ticketBody });
                }

                closeTicket(ticket, useNPS, ticket.status);

                io.to("open").emit("ticket", {
                  action: "delete",
                  ticket,
                  ticketId: ticket.id
                });
              }
            }
          }
        } catch (err) {
          Sentry.captureException(err);
          logger.error(err);
        }
      }
    }
  } catch (e: any) {
    logger.error(e);
  }
};
