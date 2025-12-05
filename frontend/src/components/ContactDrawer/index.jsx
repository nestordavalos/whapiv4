import React, { useState } from "react";

import makeStyles from '@mui/styles/makeStyles';
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Drawer from "@mui/material/Drawer";
import Link from "@mui/material/Link";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";

import { i18n } from "../../translate/i18n";

import ContactModal from "../ContactModal";
import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import MarkdownWrapper from "../MarkdownWrapper";
import { TagsContainer } from "../TagsContainer";
import ModalImageContatc from "./ModalImage";
import CopyToClipboard from "../CopyToClipboard";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
	},
	drawerPaper: {
		width: drawerWidth,
		display: "flex",
		borderLeft: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.paper,
		boxShadow: "-4px 0 15px rgba(0,0,0,0.05)",
	},
	header: {
		display: "flex",
		borderBottom: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.paper,
		alignItems: "center",
		padding: "12px 16px",
		minHeight: "56px",
		justifyContent: "flex-start",
		gap: 12,
	},
	closeButton: {
		padding: 6,
		borderRadius: 8,
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
	},
	headerTitle: {
		fontWeight: 700,
		fontSize: "1rem",
		color: theme.palette.text.primary,
	},
	content: {
		display: "flex",
		backgroundColor: theme.palette.background.default,
		flexDirection: "column",
		padding: "16px",
		height: "100%",
		overflowY: "auto",
		gap: 16,
		...theme.scrollbarStyles,
	},

	contactHeader: {
		display: "flex",
		padding: "20px 16px",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		borderRadius: 12,
		backgroundColor: theme.palette.background.paper,
		border: `1px solid ${theme.palette.divider}`,
	},

	avatarWrapper: {
		position: "relative",
		"& img": {
			width: 120,
			height: 120,
			borderRadius: 16,
			objectFit: "cover",
			border: `3px solid ${theme.palette.primary.main}`,
			boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
		},
	},

	contactName: {
		fontWeight: 700,
		fontSize: "1.1rem",
		color: theme.palette.text.primary,
		display: "flex",
		alignItems: "center",
		gap: 6,
		textAlign: "center",
	},

	contactInfoRow: {
		display: "flex",
		alignItems: "center",
		gap: 8,
		padding: "8px 12px",
		borderRadius: 8,
		backgroundColor: theme.palette.background.default,
		width: "100%",
		justifyContent: "center",
	},

	contactInfoIcon: {
		color: theme.palette.primary.main,
		fontSize: "1.1rem",
	},

	contactInfoText: {
		fontSize: "0.9rem",
		color: theme.palette.primary.main,
		fontWeight: 500,
		"& a": {
			color: theme.palette.primary.main,
			textDecoration: "none",
			"&:hover": {
				textDecoration: "underline",
			},
		},
	},

	editButton: {
		marginTop: 4,
		borderRadius: 8,
		textTransform: "none",
		fontWeight: 600,
		padding: "8px 24px",
	},

	sectionCard: {
		padding: 16,
		display: "flex",
		flexDirection: "column",
		gap: 12,
		borderRadius: 12,
		backgroundColor: theme.palette.background.paper,
		border: `1px solid ${theme.palette.divider}`,
	},
	
	sectionTitle: {
		fontWeight: 600,
		fontSize: "0.85rem",
		color: theme.palette.text.secondary,
		textTransform: "uppercase",
		letterSpacing: "0.5px",
	},

	extraInfoItem: {
		padding: 12,
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.default,
	},

	extraInfoLabel: {
		fontSize: "0.7rem",
		color: theme.palette.text.secondary,
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: "0.3px",
		display: "flex",
		alignItems: "center",
		gap: 4,
		marginBottom: 4,
	},

	extraInfoValue: {
		fontSize: "0.9rem",
		color: theme.palette.text.primary,
	},

	tagsSection: {
		borderRadius: 12,
		backgroundColor: theme.palette.background.paper,
		border: `1px solid ${theme.palette.divider}`,
		overflow: "hidden",
	},
}));

const ContactDrawer = ({ open, handleDrawerClose, contact, loading }) => {
	const classes = useStyles();

	const [modalOpen, setModalOpen] = useState(false);

	return (
		<Drawer
			className={classes.drawer}
			variant="persistent"
			anchor="right"
			open={open}
			PaperProps={{ style: { position: "absolute" } }}
			BackdropProps={{ style: { position: "absolute" } }}
			ModalProps={{
				container: document.getElementById("drawer-container"),
				style: { position: "absolute" },
			}}
			classes={{
				paper: classes.drawerPaper,
			}}
		>
			<div className={classes.header}>
				<IconButton
					className={classes.closeButton}
					size="small"
					onClick={handleDrawerClose}
					aria-label={i18n.t("contactDrawer.buttons.close") || "Cerrar"}
				>
					<CloseIcon fontSize="small" />
				</IconButton>
				<Typography className={classes.headerTitle}>
					{i18n.t("contactDrawer.header")}
				</Typography>
			</div>
			{loading ? (
				<ContactDrawerSkeleton classes={classes} />
			) : (
				<div className={classes.content}>
					{/* Card principal del contacto */}
					<Paper elevation={0} className={classes.contactHeader}>
						<div className={classes.avatarWrapper}>
							<ModalImageContatc imageUrl={contact.profilePicUrl} />
						</div>
						<Typography className={classes.contactName}>
							{contact.name}
							<CopyToClipboard content={contact.name} color="primary" />
						</Typography>
						
						{/* Teléfono */}
						<div className={classes.contactInfoRow}>
							<PhoneIcon className={classes.contactInfoIcon} />
							<Typography className={classes.contactInfoText}>
								<Link href={`tel:${contact.number}`}>{contact.number}</Link>
							</Typography>
							<CopyToClipboard content={contact.number} color="primary" />
						</div>

						{/* Email */}
						{contact.email && (
							<div className={classes.contactInfoRow}>
								<EmailIcon className={classes.contactInfoIcon} />
								<Typography className={classes.contactInfoText}>
									<Link href={`mailto:${contact.email}`}>{contact.email}</Link>
								</Typography>
								<CopyToClipboard content={contact.email} color="primary" />
							</div>
						)}

						<Button
							variant="outlined"
							color="primary"
							size="small"
							className={classes.editButton}
							onClick={() => setModalOpen(true)}
						>
							{i18n.t("contactDrawer.buttons.edit")}
						</Button>
					</Paper>

					{/* Tags */}
					<div className={classes.tagsSection}>
						<TagsContainer contact={contact} />
					</div>

					{/* Información extra */}
					{contact?.extraInfo?.length > 0 && (
						<Paper elevation={0} className={classes.sectionCard}>
							<Typography className={classes.sectionTitle}>
								{i18n.t("contactDrawer.extraInfo")}
							</Typography>
							{contact.extraInfo.map(info => (
								<div key={info.id} className={classes.extraInfoItem}>
									<InputLabel className={classes.extraInfoLabel}>
										{info.name}
										<CopyToClipboard content={info.value} color="primary" />
									</InputLabel>
									<Typography component="div" className={classes.extraInfoValue}>
										<MarkdownWrapper>{info.value}</MarkdownWrapper>
									</Typography>
								</div>
							))}
						</Paper>
					)}

					<ContactModal
						open={modalOpen}
						onClose={() => setModalOpen(false)}
						contactId={contact.id}
					/>
				</div>
			)}
		</Drawer>
	);
};

export default ContactDrawer;
