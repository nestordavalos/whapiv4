import React, { useState, useEffect, useRef, useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import ListItem from "@material-ui/core/ListItem";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";
import UndoRoundedIcon from '@material-ui/icons/UndoRounded';
import { i18n } from "../../translate/i18n";
import DoneIcon from '@material-ui/icons/Done';
import { IconButton } from "@material-ui/core";
import api from "../../services/api";
import CancelIcon from '@material-ui/icons/Cancel';
import MarkdownWrapper from "../MarkdownWrapper";
import { Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";
import { Can } from "../../components/Can";
import receiveIcon from "../../assets/receive.png";
import sendIcon from "../../assets/send.png";

const useStyles = makeStyles(theme => ({
	ticket: {
		position: "relative",
		display: "flex",
		padding: "10px 16px",
		margin: "0",
		borderRadius: "0",
		transition: "background-color 0.1s ease",
		backgroundColor: theme.palette.background.paper,
		borderLeft: "3px solid transparent",
		"&:hover": {
			backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : "#f7f7f7",
		},
		"&.Mui-selected": {
			backgroundColor: theme.palette.mode === 'dark' ? 'rgba(33,150,243,0.15)' : "#e8f4fd",
			borderLeft: `3px solid ${theme.palette.primary.main}`,
		},
	},

	pendingTicket: {
		cursor: "pointer",
		backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,193,7,0.08)' : "#fffef7",
		"&:hover": {
			backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,193,7,0.12)' : "#fffaeb",
		},
	},

	noTicketsDiv: {
		display: "flex",
		height: "100px",
		margin: 40,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},

	noTicketsText: {
		textAlign: "center",
		color: "rgb(104, 121, 146)",
		fontSize: "14px",
		lineHeight: "1.4",
	},

	noTicketsTitle: {
		textAlign: "center",
		fontSize: "16px",
		fontWeight: "600",
		margin: "0px",
	},

	contactNameWrapper: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "baseline",
		marginBottom: "2px",
		gap: "8px",
	},

	lastMessageTime: {
		fontSize: "0.72rem",
		color: theme.palette.text.secondary,
		fontWeight: 400,
		whiteSpace: "nowrap",
		marginLeft: "auto",
	},

	closedBadge: {
		alignSelf: "center",
		justifySelf: "flex-end",
		marginRight: 32,
		marginLeft: "auto",
	},

	contactLastMessage: {
		flexWrap: "wrap",
	},

	newMessagesCount: {
		alignSelf: "center",
		marginLeft: "4px",
		display: "flex",
		alignItems: "center",
		"& .MuiBadge-badge": {
			fontWeight: 700,
			minWidth: "18px",
			height: "18px",
			padding: "0 5px",
			fontSize: "0.7rem",
		},
	},

	bottomButton: {
		position: "relative",
		borderRadius: "8px",
		padding: "6px",
		transition: "all 0.2s ease",
		"&:hover": {
			transform: "scale(1.1)",
			backgroundColor: "rgba(0,0,0,0.08)",
		},
	},

	badgeStyle: {
		color: "white",
		backgroundColor: green[500],
	},

	acceptButton: {
		position: "absolute",
		left: "50%",
	},

	ticketQueueColor: {
		display: "none",
	}, Tag: {
		position: "absolute",
		marginRight: 5,
		right: 20,
		bottom: 30,
		backgroundColor: theme.palette.background.default,
		color: theme.palette.primary.main,
		border: "1px solid #CCC",
		padding: 1,
		paddingLeft: 5,
		paddingRight: 5,
		borderRadius: 10,
		fontSize: "0.9em"
	},
	Radiusdot: {
		display: "inline-flex",
		flexWrap: "wrap",
		gap: "4px",
		marginTop: "3px",
		alignItems: "center",
		"& .MuiBadge-badge": {
			borderRadius: "3px",
			position: "static",
			height: "auto",
			minHeight: "16px",
			padding: "1px 5px",
			whiteSpace: "nowrap",
			fontSize: "0.68rem",
			fontWeight: 500,
			transform: "none",
			border: "none",
			boxShadow: "none",
			opacity: 0.9,
		},
	},
}));

const TicketListItem = ({ handleChangeTab, ticket }) => {
	const classes = useStyles();
	const theme = useTheme();
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const { ticketId } = useParams();
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);
	const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);
	const [tag, setTag] = useState([]);

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			const fetchTicket = async () => {
				try {
					const { data } = await api.get("/tickets/" + ticket.id);

					setTag(data?.contact?.tags);

				} catch (err) {
				}
			};
			fetchTicket();
		}, 500);
		return () => {
			if (delayDebounceFn !== null) {
				clearTimeout(delayDebounceFn);
			}
		};
	}, [ticket.id]);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const ContactTag = ({ tag }) => {
		return (
			<span
				style={{
					backgroundColor: tag.color,
					padding: "1px 5px",
					borderRadius: "3px",
					fontSize: "0.68rem",
					fontWeight: 500,
					color: "white",
					display: "inline-flex",
					alignItems: "center",
					whiteSpace: "nowrap",
					opacity: 0.9,
				}}
			>
				{tag.name}
			</span>
		)
	}

	const handleAcepptTicket = async id => {
		setLoading(true);
		try {
			await api.put(`/tickets/${id}`, {
				status: "open",
				userId: user?.id,
			});
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
		if (isMounted.current) {
			setLoading(false);
		}
		handleChangeTab(null, "open");
		history.push(`/tickets/${id}`);
	}; const queueName = selectedTicket => {
		let name = null;
		let color = null;
		user.queues.forEach(userQueue => {
			if (userQueue.id === selectedTicket.queueId) {
				name = userQueue.name;
				color = userQueue.color;
			}
		});
		return {
			name,
			color
		};
	}
	const handleOpenAcceptTicketWithouSelectQueue = () => {
		setAcceptTicketWithouSelectQueueOpen(true);
	};

	const handleReopenTicket = async id => {
		setLoading(true);
		try {
			await api.put(`/tickets/${id}`, {
				status: "open",
				userId: user?.id,
			});
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
		if (isMounted.current) {
			setLoading(false);
		}
		history.push(`/tickets/${id}`);
	};

	const handleViewTicket = async id => {
		setLoading(true);
		try {
			await api.put(`/tickets/${id}`, {
				status: "pending",
			});
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
		if (isMounted.current) {
			setLoading(false);
		}
		history.push(`/tickets/${id}`);
	};

	const handleClosedTicket = async id => {
		setLoading(true);
		try {
			await api.put(`/tickets/${id}`, {
				status: "closed",
				userId: user?.id,
			});
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
		if (isMounted.current) {
			setLoading(false);
		}
		history.push(`/tickets/${id}`);
	};

	const handleSelectTicket = id => {
		history.push(`/tickets/${id}`);
	};

	// Nome do atendente
	const [uName, setUserName] = useState(null);

	// if (ticket.status === "pending" || ticket.status === "closed") {
	if (ticket.status === "pending") {	

	} else {

		const fetchUserName = async () => {
			try {
				const { data } = await api.get("/users/" + ticket.userId, {
				});
				setUserName(data['name']);
			} catch (err) {
				// toastError(err);
			}
		};
		fetchUserName();
	};

	const viewConection = user.viewConection === 'enabled';
	const viewSector = user.viewSector === 'enabled';
	const viewName = user.viewName === 'enabled';
	const viewTags = user.viewTags === 'enabled';

	return (
		<React.Fragment key={ticket.id}>
			<AcceptTicketWithouSelectQueue
				modalOpen={acceptTicketWithouSelectQueueOpen}
				onClose={(e) => setAcceptTicketWithouSelectQueueOpen(false)}
				ticketId={ticket.id}
			/>
			<ListItem
				dense
				button
				onClick={e => {
					// if (ticket.status === "pending") return;
					handleSelectTicket(ticket.id);
				}}
				selected={ticketId && +ticketId === ticket.id}
				className={clsx(classes.ticket, {
					[classes.pendingTicket]: (ticket.status === "pending"),
				})}
				style={{
					display: "flex",
					alignItems: "flex-start",
					gap: "8px",
					padding: "8px 12px",
				}}
			>
				<Tooltip
					arrow
					placement="right"
					title={ticket.queue?.name || queueName(ticket)?.name || i18n.t("ticketsList.items.queueless")}
				>
					<span
						style={{ backgroundColor: ticket.queue?.color || queueName(ticket)?.color || "#7C7C7C" }}
						className={classes.ticketQueueColor}
					></span>
				</Tooltip>
				
				<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
					{/* LÍNEA 1: Conexión con icono (izq) + Sector y Agente badges (der) */}
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						{/* Izquierda: Conexión con icono WhatsApp */}
						{viewConection && ticket.whatsappId && (
						<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
							<img src="https://cdn-icons-png.flaticon.com/512/124/124034.png" alt="WhatsApp" width="14px" height="14px" />
							<Typography
								component="span"
								style={{
									fontSize: "0.7rem",
									color: theme.palette.text.secondary,
									fontWeight: 400,
								}}
							>
									{ticket.whatsapp?.name || i18n.t("userModal.form.user")}
								</Typography>
							</div>
						)}

						{/* Derecha: Badges Sector y Agente */}
						<span className={classes.Radiusdot}>
							{viewSector && ticket.queueId && (
								<Tooltip title={i18n.t("messageVariablesPicker.vars.queue")}>
									<Badge
										className={classes.Radiusdot}
										overlap="rectangular"
										style={{
											backgroundColor: ticket.queue?.color || "#7C7C7C",
											color: "white"
										}}
										badgeContent={ticket.queue?.name || "No sector"}
									/>
								</Tooltip>
							)}

							{viewName && (
								<Can
									role={user.profile}
									perform="drawer-admin-items:view"
									yes={() => (
										<>
											{uName && uName !== "" && (
												<Tooltip title={i18n.t("messageVariablesPicker.vars.user")}>
													<Badge
														className={classes.Radiusdot}
														overlap="rectangular"
														style={{
															backgroundColor: "#2c3e50",
															color: "white",
														}}
														badgeContent={uName}
													/>
												</Tooltip>
											)}
										</>
									)}
								/>
							)}
						</span>
					</div>

					{/* LÍNEA 2: Avatar + Nombre/Número del contacto */}
					<div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
						<Avatar style={{
							height: 36,
							width: 36,
							borderRadius: "4px",
							flexShrink: 0,
						}}
							src={ticket?.contact?.profilePicUrl} />
						
						<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0px" }}>
						<Typography
							noWrap
							component="span"
							variant="body2"
							style={{
								fontWeight: 700,
								color: theme.palette.text.primary,
								fontSize: "0.9rem",
							}}
						>
							{ticket.contact.name}
						</Typography>
						
						{/* LÍNEA 3: Mensaje + Fecha/Hora */}
							<div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
								<Typography
									noWrap
									component="span"
									variant="body2"
									style={{
										color: theme.palette.text.secondary,
										fontSize: "0.82rem",
										display: "flex",
										alignItems: "center",
										gap: "4px",
										flex: 1,
									}}
								>
									{(() => {
										if (ticket.lastMessage) {
											if (ticket.lastMessage.includes("🢅") === true) {
												return (
													<img src={sendIcon} alt="Msg Enviada" width="12px" />
												)
											} else if (ticket.lastMessage.includes("🢇") === true) {
												return (
													<img src={receiveIcon} alt="Msg Recebida" width="12px" />
												)
											}
										}
									})()}
									{ticket.lastMessage ? (
										<MarkdownWrapper>{ticket.lastMessage
											.replace("🢇", "")
											.replace("🢅", "")}</MarkdownWrapper>
									) : (
										<span></span>
									)}
								</Typography>

								<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
									{/* Fecha/Hora */}
									{ticket.lastMessage && (
										<Typography
											className={classes.lastMessageTime}
											component="span"
											variant="body2"
											style={{ whiteSpace: "nowrap" }}
										>
											{isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
												<>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
											) : (
												<>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
											)}
										</Typography>
									)}
									
									<Badge
										className={classes.newMessagesCount}
										badgeContent={ticket.unreadMessages}
										overlap="rectangular"
										classes={{
											badge: classes.badgeStyle,
										}} />
								</div>
							</div>
						</div>
					</div>

					{/* LÍNEA 4: Etiquetas (izq) + Botones (der) */}
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
						{/* Izquierda: Etiquetas */}
						{viewTags && tag?.length > 0 ? (
							<div style={{ 
								display: "flex", 
								flexWrap: "wrap", 
								gap: "4px", 
								alignItems: "center",
								flex: 1,
								minWidth: 0,
							}}>
								{tag.map((tag) => (
									<ContactTag tag={tag} key={`ticket-contact-tag-${ticket.id}-${tag.id}`} />
								))}
							</div>
						) : (
							<div style={{ flex: 1 }}></div>
						)}
						
						{/* Derecha: Botones lado a lado */}
						<div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
							{(ticket.status === "pending" && (ticket.queue === null || ticket.queue === undefined)) && (
								<Tooltip title={i18n.t("ticketsList.items.accept")}>
									<IconButton
										className={classes.bottomButton}
										color="primary"
										size="small"
										onClick={e => {
											e.stopPropagation();
											handleOpenAcceptTicketWithouSelectQueue();
										}}
										disabled={loading}>
										<DoneIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							)}
							{ticket.status === "pending" && ticket.queue !== null && (
								<Tooltip title={i18n.t("ticketsList.items.accept")}>
									<IconButton
										className={classes.bottomButton}
										color="primary"
										size="small"
										onClick={e => {
											e.stopPropagation();
											handleAcepptTicket(ticket.id);
										}}>
										<DoneIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							)}
							{ticket.status === "open" && (
								<>
									<Tooltip title={i18n.t("ticketsList.items.return")}>
										<IconButton
											className={classes.bottomButton}
											color="primary"
											size="small"
											onClick={e => {
												e.stopPropagation();
												handleViewTicket(ticket.id, handleChangeTab);
											}}>
											<UndoRoundedIcon fontSize="small" />
										</IconButton>
									</Tooltip>
									<Tooltip title={i18n.t("ticketsList.items.close")}>
										<IconButton
											className={classes.bottomButton}
											color="primary"
											size="small"
											onClick={e => {
												e.stopPropagation();
												handleClosedTicket(ticket.id);
											}}>
											<CancelIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								</>
							)}
							{ticket.status === "closed" && (
								<Tooltip title={i18n.t("ticketsList.items.reopen")}>
									<IconButton
										className={classes.bottomButton}
										color="primary"
										size="small"
										onClick={e => {
											e.stopPropagation();
											handleReopenTicket(ticket.id);
										}}>
										<UndoRoundedIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							)}
						</div>
					</div>
				</div>
			</ListItem>
			<Divider component="li" style={{ margin: 0, borderColor: theme.palette.divider }} />
		</React.Fragment>
	);
};

export default TicketListItem;