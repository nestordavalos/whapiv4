import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { IconButton } from "@material-ui/core";
import { MoreVert, Replay } from "@material-ui/icons";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import UndoRoundedIcon from '@material-ui/icons/UndoRounded';
import CancelIcon from '@material-ui/icons/Cancel';
import Tooltip from '@material-ui/core/Tooltip';

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
	moreButton: {
		color: theme.palette.text.secondary,
	},
}));

const TicketActionButtons = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const [anchorEl, setAnchorEl] = useState(null);
	const [loading, setLoading] = useState(false);
	const ticketOptionsMenuOpen = Boolean(anchorEl);
	const { user } = useContext(AuthContext);

	const handleOpenTicketOptionsMenu = e => {
		setAnchorEl(e.currentTarget);
	};

	const handleCloseTicketOptionsMenu = e => {
		setAnchorEl(null);
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
							onClick={e => handleUpdateTicketStatus(e, "closed", user?.id, false)}
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