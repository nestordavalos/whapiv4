import { restartWbot } from "../../libs/wbot";
import { logger } from "../../utils/logger";

const RestartWhatsAppService = async (whatsappId: string): Promise<void> => {
  const whatsappIDNumber: number = parseInt(whatsappId, 10);

  try {
    await restartWbot(whatsappIDNumber);
    logger.info(`WhatsApp session for ID ${whatsappId} has been restarted.`);
  } catch (error) {
    logger.error(
      `Failed to restart WhatsApp session: ${(error as Error).message}`
    );
    throw error;
  }
};

export default RestartWhatsAppService;
