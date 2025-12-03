import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";

import makeStyles from '@mui/styles/makeStyles';
import { IconButton, CircularProgress } from "@mui/material";
import { MoreVert, Replay, Sync } from "@mui/icons-material";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import CancelIcon from '@mui/icons-material/Cancel';
import Tooltip from '@mui/material/Tooltip';
import { toast } from "react-toastify";

const useStyles = makeStyles(theme => ({
	actionButtons: {
		marginRight: 5,
		flex: "none",
		alignSelf: "center",
		marginLeft: "auto",
		display: "flex",
		alignItems: "center",
		gap: 4,
	},
	actionButton: {
		padding: 6,
		borderRadius: 8,
		transition: "all 0.2s ease",
		"&:hover": {
			transform: "scale(1.05)",
		},
	},
	returnButton: {
		color: theme.palette.primary.main,
	},
	closeButton: {
		color: theme.palette.error.main,
	},
	reopenButton: {
		color: theme.palette.success.main,
	},
	syncButton: {
		color: theme.palette.info.main,
	},
	moreButton: {
		color: theme.palette.text.secondary,
	},
	syncSpinner: {
		color: theme.palette.info.main,
	},
}));

const TicketActionButtons = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const [anchorEl, setAnchorEl] = useState(null);
	const [loading, setLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const ticketOptionsMenuOpen = Boolean(anchorEl);
	const { user } = useContext(AuthContext);

	const handleOpenTicketOptionsMenu = e => {
		setAnchorEl(e.currentTarget);
	};

	const handleCloseTicketOptionsMenu = e => {
		setAnchorEl(null);
	};

	const handleSyncMessages = async () => {
		setSyncing(true);
		try {
			const { data } = await api.post(`/messages/${ticket.id}/sync`, null, {
				params: { limit: 100 }
			});
			
			if (data.synced > 0) {
				toast.success(`${data.message}`);
				// Los mensajes se actualizan automáticamente via socket
			} else {
				toast.info(data.message);
			}
		} catch (err) {
			toastError(err);
		} finally {
			setSyncing(false);
		}
	};

	const handleUpdateTicketStatus = async (e, status, userId, isFinished) => {
		setLoading(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				status: status,
				userId: userId || null,
				isFinished: isFinished,
				ticketData: ticket

			});

			setLoading(false);
			if (status === "open") {
				history.push(`/tickets/${ticket.id}`);
			} else {
				history.push("/tickets");
			}
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	return (
		<div className={classes.actionButtons}>
			{/* Botón de sincronizar mensajes - disponible en todos los estados */}
			<Tooltip title={i18n.t("messagesList.header.buttons.sync") || "Sincronizar mensajes"}>
				<span>
					<IconButton 
						disabled={syncing || loading} 
						className={`${classes.actionButton} ${classes.syncButton}`}
						onClick={handleSyncMessages}
						size="small"
					>
						{syncing ? (
							<CircularProgress size={18} className={classes.syncSpinner} />
						) : (
							<Sync fontSize="small" />
						)}
					</IconButton>
				</span>
			</Tooltip>

			{ticket.status === "closed" && (
				<Tooltip title={i18n.t("messagesList.header.buttons.reopen")}>
					<IconButton 
						disabled={loading} 
						className={`${classes.actionButton} ${classes.reopenButton}`}
						onClick={e => handleUpdateTicketStatus(e, "open", user?.id, false)}
						size="small"
					>
						<Replay fontSize="small" />
					</IconButton>
				</Tooltip>
			)}
			{ticket.status === "open" && (
				<>
					<Tooltip title={i18n.t("messagesList.header.buttons.return")}>
						<IconButton 
							disabled={loading} 
							className={`${classes.actionButton} ${classes.returnButton}`}
							onClick={e => handleUpdateTicketStatus(e, "pending", null, false)}
							size="small"
						>
							<UndoRoundedIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title={i18n.t("messagesList.header.buttons.resolve")}>
						<IconButton 
							disabled={loading} 
							className={`${classes.actionButton} ${classes.closeButton}`}
							onClick={e => handleUpdateTicketStatus(e, "closed", user?.id, true)}
							size="small"
						>
							<CancelIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<IconButton 
						disabled={loading} 
						className={`${classes.actionButton} ${classes.moreButton}`}
						onClick={handleOpenTicketOptionsMenu}
						size="small"
					>
						<MoreVert fontSize="small" />
					</IconButton>
					<TicketOptionsMenu
						ticket={ticket}
						anchorEl={anchorEl}
						menuOpen={ticketOptionsMenuOpen}
						handleClose={handleCloseTicketOptionsMenu}
					/>
				</>
			)}
			
			{/* {ticket.status === "pending" && (
				<Tooltip title={i18n.t("messagesList.header.buttons.accept")}>
					<IconButton loading={loading} style={{ marginRight: 20 }} onClick={e => handleUpdateTicketStatus(e, "open", user?.id)} color="primary">
						<CheckCircleIcon />
					</IconButton>
				</Tooltip>
			)} */}
				
			
		</div>
	);
};

export default TicketActionButtons;
