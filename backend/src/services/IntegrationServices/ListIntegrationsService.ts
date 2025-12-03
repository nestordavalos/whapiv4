import Integration from "../../models/Integration";

const ListIntegrationsService = async (): Promise<Integration[]> => {
  const integrations = await Integration.findAll();
  return integrations;
};

export default ListIntegrationsService;
