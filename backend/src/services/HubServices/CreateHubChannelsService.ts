import { Op } from "sequelize";
import { IChannel } from "../../controllers/ChannelHubController";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  channels: IChannel[];
}

interface Response {
  whatsapps: Whatsapp[];
}

const CreateChannelsService = async ({
  channels
}: Request): Promise<Response> => {
  const mappedChannels = channels.map(channel => ({
    ...channel,
    id: undefined,
    type: channel.channel,
    qrcode: channel.id,
    status: "CONNECTED"
  }));

  const whatsapps: Whatsapp[] = [];

  for (const channel of mappedChannels) {
    // Avoid duplicate constraint by reusing existing by name or qrcode
    const existing = await Whatsapp.findOne({
      where: {
        [Op.or]: [{ name: channel.name }, { qrcode: channel.qrcode }]
      }
    });

    if (existing) {
      await existing.update(channel);
      whatsapps.push(existing);
    } else {
      const created = await Whatsapp.create(channel);
      whatsapps.push(created);
    }
  }

  return { whatsapps };
};

export default CreateChannelsService;
