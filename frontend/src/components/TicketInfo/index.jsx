import React from "react";

import { Avatar, Typography, Chip, Tooltip } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

const useStyles = makeStyles((theme) => ({
	ticketInfoContainer: {
		display: "flex",
		alignItems: "center",
		gap: 10,
		padding: "4px 8px",
		cursor: "pointer",
		minWidth: 0,
		flex: 1,
		[theme.breakpoints.down('md')]: {
			gap: 8,
			padding: "4px 0",
		},
	},
	avatar: {
		height: 40,
		width: 40,
		borderRadius: 8,
		flexShrink: 0,
		[theme.breakpoints.down('md')]: {
			height: 32,
			width: 32,
			borderRadius: 6,
		},
	},
	infoContent: {
		display: "flex",
		flexDirection: "column",
		gap: 2,
		minWidth: 0,
		flex: 1,
		overflow: "hidden",
	},
	titleRow: {
		display: "flex",
		alignItems: "center",
		gap: 8,
		minWidth: 0,
	},
	contactName: {
		fontWeight: 700,
		fontSize: "0.9rem",
		color: theme.palette.text.primary,
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
		lineHeight: 1.3,
		[theme.breakpoints.down('md')]: {
			fontSize: "0.8rem",
		},
	},
	ticketNumber: {
		fontSize: "0.75rem",
		color: theme.palette.primary.main,
		fontWeight: 600,
		[theme.breakpoints.down('md')]: {
			display: "none",
		},
	},
	metaRow: {
		display: "flex",
		flexWrap: "wrap",
		gap: 6,
		alignItems: "center",
	},
	chip: {
		height: 20,
		fontSize: "0.68rem",
		"& .MuiChip-label": {
			padding: "0 6px",
		},
		"& .MuiChip-icon": {
			marginLeft: 4,
			fontSize: "0.85rem",
		},
		[theme.breakpoints.down('md')]: {
			height: 18,
			fontSize: "0.62rem",
			"& .MuiChip-label": {
				padding: "0 4px",
			},
			"& .MuiChip-icon": {
				fontSize: "0.75rem",
			},
		},
	},
	userChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(44,62,80,0.6)" : "#e5e7eb",
		color: theme.palette.text.primary,
	},
	queueChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(33,150,243,0.2)" : "#e7f1ff",
		color: theme.palette.primary.main,
	},
	connectionChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(76,175,80,0.18)" : "#ecfdf5",
		color: theme.palette.success.main,
	},
}));

const TicketInfo = ({ contact, ticket, onClick }) => {
	const classes = useStyles();

	return (
		<div className={classes.ticketInfoContainer} onClick={onClick}>
			<Avatar
				className={classes.avatar}
				src={contact.profilePicUrl}
				alt="contact_image"
			/>
			<div className={classes.infoContent}>
				<div className={classes.titleRow}>
					<Typography component="span" className={classes.contactName}>
						{contact.name}
					</Typography>
					<Typography component="span" className={classes.ticketNumber}>
						| #Conversación Nº {ticket.id}
					</Typography>
				</div>
				<div className={classes.metaRow}>
					{ticket.user && (
						<Tooltip title="Asignado A">
							<Chip
								icon={<PersonOutlineIcon />}
								label={ticket.user.name}
								size="small"
								className={`${classes.chip} ${classes.userChip}`}
							/>
						</Tooltip>
					)}
					{ticket.queue && (
						<Tooltip title="Sector">
							<Chip
								icon={<BusinessCenterIcon />}
								label={ticket.queue.name}
								size="small"
								className={`${classes.chip} ${classes.queueChip}`}
							/>
						</Tooltip>
					)}
					{ticket.whatsapp && (
						<Tooltip title="Whatsapp">
							<Chip
								icon={<WhatsAppIcon />}
								label={ticket.whatsapp.name}
								size="small"
								className={`${classes.chip} ${classes.connectionChip}`}
							/>
						</Tooltip>
					)}
				</div>
			</div>
		</div>
	);
};

export default TicketInfo;