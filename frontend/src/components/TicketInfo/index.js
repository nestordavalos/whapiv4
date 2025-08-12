import React from "react";

import { Avatar, CardHeader } from "@mui/material";

//import { i18n } from "../../translate/i18n";

const TicketInfo = ({ contact, ticket, onClick }) => {
	return (
		<CardHeader
			onClick={onClick}
			style={{ cursor: "pointer", height: "55px" }}
			titleTypographyProps={{ noWrap: true }}
			subheaderTypographyProps={{ noWrap: true }}
			avatar={<Avatar style={{ height: 40, width: 40, borderRadius: 4, }}src={contact.profilePicUrl} alt="contact_image" />}
			title={`${contact.name} | #Conversación Nº ${ticket.id}`}
			subheader={
				ticket.user &&
				`Asignado A: ${ticket.user.name} ${ticket.queue ? ' | Sector: ' + ticket.queue.name : ' | Sector: Sin Sector'}
				${ticket.whatsapp? '| Whatsapp: ' + ticket.whatsapp.name : ' | Whatsapp: Sin Whatsapp'}`
			}
		/>
	);
};

export default TicketInfo;