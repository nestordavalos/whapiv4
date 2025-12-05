import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { useTheme } from "@mui/material/styles";
import makeStyles from '@mui/styles/makeStyles';
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import { IconButton, Tooltip } from "@mui/material";
import ButtonBase from "@mui/material/ButtonBase";
import DoneIcon from "@mui/icons-material/Done";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import CancelIcon from "@mui/icons-material/Cancel";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import MarkdownWrapper from "../MarkdownWrapper";
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
		padding: "12px !important",
		margin: "0 0 8px 0 !important",
		borderRadius: 12,
		border: `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
		backgroundColor: theme.palette.background.paper,
		alignItems: "flex-start",
		gap: 10,
		transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
		overflow: "hidden",
		boxShadow: theme.palette.mode === "dark"
			? "0 2px 8px rgba(0,0,0,0.2)"
			: "0 1px 3px rgba(0,0,0,0.08)",
		"&:hover": {
			boxShadow: theme.palette.mode === "dark"
				? "0 8px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)"
				: "0 8px 20px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)",
			transform: "translateY(-2px)",
			borderColor: theme.palette.mode === "dark" 
				? "rgba(255,255,255,0.12)" 
				: "rgba(0,0,0,0.1)",
		},
		"&.Mui-selected": {
			backgroundColor: theme.palette.mode === "dark" 
				? "rgba(0, 113, 193, 0.12)" 
				: "rgba(0, 113, 193, 0.06)",
			borderColor: theme.palette.primary.main,
			borderWidth: 2,
			boxShadow: theme.palette.mode === "dark"
				? "0 6px 16px rgba(0, 113, 193, 0.35), 0 0 0 3px rgba(0, 113, 193, 0.1)"
				: "0 6px 16px rgba(0, 113, 193, 0.2), 0 0 0 3px rgba(0, 113, 193, 0.08)",
			"&:hover": {
				backgroundColor: theme.palette.mode === "dark" 
					? "rgba(0, 113, 193, 0.18)" 
					: "rgba(0, 113, 193, 0.1)",
				transform: "translateY(-2px)",
			},
		},
		[theme.breakpoints.down('sm')]: {
			margin: "0 0 6px 0 !important",
			padding: "10px !important",
			gap: 8,
			borderRadius: 10,
		},
	},
	pendingTicket: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(255,193,7,0.1)" : "rgba(255,243,205,0.5)",
		borderColor: theme.palette.mode === "dark" ? "rgba(251,191,36,0.6)" : "rgba(251,191,36,0.7)",
		borderWidth: 2,
		boxShadow: theme.palette.mode === "dark"
			? "0 2px 8px rgba(255,193,7,0.15)"
			: "0 1px 3px rgba(251,191,36,0.15)",
	},
	openTicket: {
		borderColor: theme.palette.mode === "dark" ? "rgba(33,150,243,0.6)" : "rgba(25,118,210,0.7)",
		borderWidth: 2,
	},
	closedTicket: {
		borderColor: theme.palette.mode === "dark" ? "rgba(76,175,80,0.6)" : "rgba(22,163,74,0.7)",
		borderWidth: 2,
	},
	ticketQueueColor: {
		width: 4,
		borderRadius: 4,
		alignSelf: "stretch",
		backgroundColor: theme.palette.primary.light,
		boxShadow: "0 0 8px currentColor",
		opacity: 0.9,
	},
	cardContent: {
		width: "100%",
		display: "flex",
		flexDirection: "column",
		gap: 10,
	},
	mainContentButton: {
		textAlign: "left",
		display: "flex",
		flexDirection: "column",
		gap: 8,
		alignItems: "stretch",
		width: "100%",
		padding: 0,
		borderRadius: 10,
		transition: "background-color 0.2s ease",
		"&:hover": {
			backgroundColor: "transparent",
		},
	},
	headerRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
		width: "100%",
	},
	nameInfo: {
		display: "flex",
		alignItems: "center",
		gap: 6,
		minWidth: 0,
	},
	metaChips: {
		display: "flex",
		flexWrap: "wrap",
		gap: 5,
		justifyContent: "flex-end",
		alignItems: "center",
		[theme.breakpoints.down('sm')]: {
			gap: 3,
		},
	},
	connectionChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(76,175,80,0.2)" : "rgba(220,252,231,0.8)",
		color: theme.palette.mode === "dark" ? "#66bb6a" : "#16a34a",
		fontWeight: 600,
		borderRadius: 8,
		boxShadow: theme.palette.mode === "dark" 
			? "0 1px 3px rgba(76,175,80,0.2)" 
			: "0 1px 2px rgba(22,163,74,0.15)",
		"& .MuiChip-icon": {
			color: "inherit",
		},
		[theme.breakpoints.down('sm')]: {
			display: "none",
		},
	},
	queueChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(33,150,243,0.22)" : "rgba(231,241,255,0.9)",
		color: theme.palette.mode === "dark" ? "#42a5f5" : "#1976d2",
		fontWeight: 600,
		borderRadius: 8,
		boxShadow: theme.palette.mode === "dark" 
			? "0 1px 3px rgba(33,150,243,0.2)" 
			: "0 1px 2px rgba(25,118,210,0.15)",
		"& .MuiChip-icon": {
			color: "inherit",
		},
		[theme.breakpoints.down('sm')]: {
			"& .MuiChip-label": {
				padding: "0 6px",
				fontSize: "0.65rem",
			},
			"& .MuiChip-icon": {
				display: "none",
			},
		},
	},
	userChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(158,158,158,0.2)" : "rgba(229,231,235,0.9)",
		color: theme.palette.mode === "dark" ? "#bdbdbd" : "#374151",
		fontWeight: 600,
		borderRadius: 8,
		boxShadow: theme.palette.mode === "dark" 
			? "0 1px 3px rgba(158,158,158,0.15)" 
			: "0 1px 2px rgba(107,114,128,0.15)",
		"& .MuiChip-icon": {
			color: "inherit",
		},
		[theme.breakpoints.down('sm')]: {
			display: "none",
		},
	},
	statusPill: {
		padding: "3px 10px",
		borderRadius: 999,
		fontSize: "0.65rem",
		fontWeight: 700,
		letterSpacing: "0.04em",
		textTransform: "uppercase",
		boxShadow: theme.palette.mode === "dark"
			? "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
			: "0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
		[theme.breakpoints.down('sm')]: {
			padding: "2px 8px",
			fontSize: "0.6rem",
		},
	},
	ticketBody: {
		display: "flex",
		alignItems: "center",
		gap: 10,
	},
	avatar: {
		height: 40,
		width: 40,
		borderRadius: 10,
		flexShrink: 0,
		border: `2px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
		boxShadow: theme.palette.mode === "dark"
			? "0 2px 8px rgba(0,0,0,0.3)"
			: "0 2px 6px rgba(0,0,0,0.1)",
		[theme.breakpoints.down('sm')]: {
			height: 34,
			width: 34,
			borderRadius: 8,
		},
	},
	contactRow: {
		flex: 1,
		minWidth: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	messageRow: {
		display: "flex",
		alignItems: "flex-start",
		gap: 8,
		width: "100%",
		paddingLeft: 2,
	},
	messageTime: {
		fontSize: "0.75rem",
		color: theme.palette.text.secondary,
		fontWeight: 600,
		whiteSpace: "nowrap",
		letterSpacing: "0.01em",
	},
	waitBadge: {
		marginTop: 2,
		padding: "3px 9px",
		borderRadius: 999,
		fontSize: "0.7rem",
		fontWeight: 700,
		lineHeight: 1.2,
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
		boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
		letterSpacing: "0.02em",
	},
	waitOk: {
		color: "#166534",
		backgroundColor: "#dcfce7",
		border: "1px solid #86efac",
	},
	waitWarn: {
		color: "#92400e",
		backgroundColor: "#fef3c7",
		border: "1px solid #fde68a",
	},
	waitDanger: {
		color: "#991b1b",
		backgroundColor: "#fee2e2",
		border: "1px solid #fca5a5",
	},
	lastMessagePreview: {
		color: theme.palette.text.secondary,
		fontSize: "0.8rem",
		lineHeight: 1.5,
		display: "-webkit-box",
		WebkitLineClamp: 2,
		WebkitBoxOrient: "vertical",
		overflow: "hidden",
		wordBreak: "break-word",
		[theme.breakpoints.down('sm')]: {
			fontSize: "0.75rem",
			WebkitLineClamp: 1,
			lineHeight: 1.4,
		},
	},
	ticketFooter: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		flexWrap: "wrap",
		paddingTop: 2,
	},
	tagContainer: {
		display: "flex",
		flexWrap: "wrap",
		gap: 4,
		flex: 1,
		minWidth: 0,
		maxHeight: 20,
		overflow: "hidden",
	},
	tagChip: {
		maxWidth: 90,
		height: 18,
		fontSize: "0.68rem",
		fontWeight: 600,
		textOverflow: "ellipsis",
		overflow: "hidden",
		borderRadius: 6,
		boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
		"& .MuiChip-label": {
			padding: "0 7px",
		},
	},
	tagPlaceholder: {
		flex: 1,
		minHeight: 18,
	},
	actionsWrapper: {
		display: "flex",
		alignItems: "center",
		gap: 6,
		justifyContent: "flex-end",
		flex: 1,
	},
	bottomButton: {
		padding: 6,
		borderRadius: 10,
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(255,255,255,0.05)" 
			: "rgba(0,0,0,0.03)",
		transition: "all 0.2s ease",
		"&:hover": {
			backgroundColor: theme.palette.mode === "dark" 
				? "rgba(0, 113, 193, 0.2)" 
				: "rgba(0, 113, 193, 0.1)",
			transform: "scale(1.05)",
		},
	},
	timeAndBadge: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-end",
		gap: 4,
		flexShrink: 0,
	},
	timeRow: {
		display: "flex",
		alignItems: "center",
		gap: 6,
	},
	unreadIndicator: {
		backgroundColor: theme.palette.success.main,
		color: "#fff",
		fontSize: "0.68rem",
		fontWeight: 700,
		borderRadius: 12,
		padding: "2px 7px",
		minWidth: 20,
		textAlign: "center",
		lineHeight: 1.1,
		boxShadow: theme.palette.mode === "dark"
			? "0 2px 6px rgba(76,175,80,0.4)"
			: "0 2px 4px rgba(76,175,80,0.3)",
	},
	}));

const TicketListItem = ({ handleChangeTab, ticket }) => {
    const classes = useStyles();
    const theme = useTheme();
    const history = useHistory();
    const { ticketId } = useParams();
    const { user } = useContext(AuthContext);
    const userQueues = user?.queues || [];
    const [loading, setLoading] = useState(false);
    const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);
    const isMounted = useRef(true);
    const tags = ticket?.contact?.tags || [];

    const waitMinutes = useMemo(() => {
        if (ticket.status !== "pending") return null;
        const start = ticket.queuedAt || ticket.queueAt || ticket.createdAt || ticket.updatedAt;
        if (!start) return null;
        const diff = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 60000));
        return diff;
    }, [ticket]);

    const waitLevel = useMemo(() => {
        if (waitMinutes === null) return null;
        if (waitMinutes < 5) return "ok";
        if (waitMinutes < 15) return "warn";
        return "danger";
    }, [waitMinutes]);

    const waitLabel = useMemo(() => {
        if (waitMinutes === null) return "";
        if (waitMinutes === 1) return "1 min";
        if (waitMinutes < 60) return `${waitMinutes} min`;
        const hours = Math.floor(waitMinutes / 60);
        const mins = waitMinutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }, [waitMinutes]);

    const safeHandleChangeTab = useCallback((event, nextTab) => {
        if (typeof handleChangeTab === "function") {
            handleChangeTab(event, nextTab);
        }
    }, [handleChangeTab]);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

const queueName = useCallback((selectedTicket) => {
    let name = null;
    let color = null;
    userQueues.forEach(queue => {
        if (queue.id === selectedTicket.queueId) {
            name = queue.name;
            color = queue.color;
        }
    });
    return { name, color };
}, [userQueues]);

const queueInfo = useMemo(() => queueName(ticket), [ticket, queueName]);
const queueColor = ticket.queue?.color || queueInfo.color || theme.palette.primary.light;
const queueLabel = ticket.queue?.name || queueInfo.name || i18n.t("ticketsList.items.queueless");
const assignedUserName = useMemo(() => {
    if (ticket.status === "pending" || !ticket.userId) return null;
    return ticket.user?.name || null;
}, [ticket.status, ticket.userId, ticket.user]);

const statusDisplay = useMemo(() => {
    const palette = theme.palette;
    const config = {
        pending: {
            label: i18n.t("dashboard.messages.waiting.title"),
            color: palette.warning.light || "#fbbf24",
        },
        open: {
            label: i18n.t("dashboard.messages.inAttendance.title"),
            color: palette.info?.light || palette.primary.light,
        },
        closed: {
            label: i18n.t("dashboard.messages.closed.title"),
            color: palette.success.light || "#10b981",
        },
    };

    const fallback = { label: ticket.status, color: palette.grey[400] };
    const chosen = config[ticket.status] || fallback;
    const textColor = palette.getContrastText
        ? palette.getContrastText(chosen.color)
        : palette.text.primary;

    return { ...chosen, textColor };
}, [ticket.status, theme]);

const lastMessageTime = useMemo(() => {
    if (!ticket.lastMessage || !ticket.updatedAt) return null;
    const parsed = parseISO(ticket.updatedAt);
    return isSameDay(parsed, new Date())
        ? format(parsed, "HH:mm")
        : format(parsed, "dd/MM/yyyy");
}, [ticket.lastMessage, ticket.updatedAt]);

const directionMeta = useMemo(() => {
    if (!ticket.lastMessage) return null;
    if (ticket.lastMessage.includes("🢅")) {
        return { icon: sendIcon, alt: "Msg Enviada" };
    }
    if (ticket.lastMessage.includes("🢇")) {
        return { icon: receiveIcon, alt: "Msg Recebida" };
    }
    return null;
}, [ticket.lastMessage]);

const sanitizedMessage = useMemo(() => {
    if (!ticket.lastMessage) return "";
    return ticket.lastMessage.replace("🢇", "").replace("🢅", "");
}, [ticket.lastMessage]);

const renderActionButtons = () => {
        const buttons = [];
        const needsQueueSelection = ticket.queue === null || ticket.queue === undefined;

        if (ticket.status === "pending") {
            if (needsQueueSelection) {
                buttons.push(
                    <Tooltip title={i18n.t("ticketsList.items.accept")} key="accept-without-queue">
                        <IconButton
                            className={classes.bottomButton}
                            color="primary"
                            size="small"
                            onClick={e => {
                                e.stopPropagation();
                                handleOpenAcceptTicketWithouSelectQueue();
                            }}
                            disabled={loading}
                        >
                            <DoneIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                );
            } else {
                buttons.push(
                    <Tooltip title={i18n.t("ticketsList.items.accept")} key="accept">
                        <IconButton
                            className={classes.bottomButton}
                            color="primary"
                            size="small"
                            onClick={e => {
                                e.stopPropagation();
                                handleAcepptTicket(ticket.id);
                            }}
                        >
                            <DoneIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                );
            }
        }

        if (ticket.status === "open") {
            buttons.push(
                <Tooltip title={i18n.t("ticketsList.items.return")} key="return">
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        size="small"
                        onClick={e => {
                            e.stopPropagation();
                            handleViewTicket(ticket.id);
                        }}
                    >
                        <UndoRoundedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            );
            buttons.push(
                <Tooltip title={i18n.t("ticketsList.items.close")} key="close">
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        size="small"
                        onClick={e => {
                            e.stopPropagation();
                            handleClosedTicket(ticket.id);
                        }}
                    >
                        <CancelIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            );
        }

        if (ticket.status === "closed") {
            buttons.push(
                <Tooltip title={i18n.t("ticketsList.items.reopen")} key="reopen">
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        size="small"
                        onClick={e => {
                            e.stopPropagation();
                            handleReopenTicket(ticket.id);
                        }}
                    >
                        <UndoRoundedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            );
        }

        return buttons;
    };

const handleSelectTicket = id => {
    history.push(`/tickets/${id}`);
};

const handleOpenAcceptTicketWithouSelectQueue = () => {
    setAcceptTicketWithouSelectQueueOpen(true);
};

const handleAcepptTicket = async id => {
    setLoading(true);
    try {
        await api.put(`/tickets/${id}`, {
            status: "open",
            userId: user?.id,
        });
        safeHandleChangeTab(null, "open");
        history.push(`/tickets/${id}`);
    } catch (err) {
        toastError(err);
    } finally {
        if (isMounted.current) {
            setLoading(false);
        }
    }
};

const handleReopenTicket = async id => {
    setLoading(true);
    try {
        await api.put(`/tickets/${id}`, {
            status: "open",
            userId: user?.id,
        });
        history.push(`/tickets/${id}`);
    } catch (err) {
        toastError(err);
    } finally {
        if (isMounted.current) {
            setLoading(false);
        }
    }
};

const handleViewTicket = async id => {
    setLoading(true);
    try {
        await api.put(`/tickets/${id}`, {
            status: "pending",
        });
        history.push(`/tickets/${id}`);
    } catch (err) {
        toastError(err);
    } finally {
        if (isMounted.current) {
            setLoading(false);
        }
    }
};

const handleClosedTicket = async id => {
    setLoading(true);
    try {
        await api.put(`/tickets/${id}`, {
            status: "closed",
            userId: user?.id,
        });
        history.push(`/tickets/${id}`);
    } catch (err) {
        toastError(err);
    } finally {
        if (isMounted.current) {
            setLoading(false);
        }
    }
};

const viewConection = user?.viewConection === "enabled";
const viewSector = user?.viewSector === "enabled";
const viewName = user?.viewName === "enabled";
const viewTags = user?.viewTags === "enabled";

return (
    <React.Fragment key={ticket.id}>
        <AcceptTicketWithouSelectQueue
            modalOpen={acceptTicketWithouSelectQueueOpen}
            onClose={() => isMounted.current && setAcceptTicketWithouSelectQueueOpen(false)}
            ticketId={ticket.id}
            onAccepted={() => {
                if (isMounted.current) {
                    setAcceptTicketWithouSelectQueueOpen(false);
                    safeHandleChangeTab(null, "open");
                }
            }}
        />
        <ListItem
            component="div"
            dense
            selected={ticketId && +ticketId === ticket.id}
            className={clsx(classes.ticket, {
                [classes.pendingTicket]: ticket.status === "pending",
                [classes.openTicket]: ticket.status === "open",
                [classes.closedTicket]: ticket.status === "closed",
            })}
        >
            <Tooltip title={queueLabel} placement="left">
                <span
                    className={classes.ticketQueueColor}
                    style={{ backgroundColor: queueColor }}
                    role="presentation"
                    aria-hidden="true"
                />
            </Tooltip>
            <div className={classes.cardContent}>
                <ButtonBase
                    className={classes.mainContentButton}
                    onClick={() => handleSelectTicket(ticket.id)}
                    focusRipple
                    disableRipple
                >
                {/* FILA 1: Conexión (izq) + Sector + Agente + Estado (der) */}
                    <div className={classes.headerRow}>
                    <div className={classes.nameInfo}>
                        {viewConection && ticket.whatsappId && (
                            <Chip
                                icon={<WhatsAppIcon fontSize="small" />}
                                label={ticket.whatsapp?.name || i18n.t("ticketsList.items.connection")}
                                size="small"
                                aria-label={`Conexion ${ticket.whatsapp?.name || i18n.t("ticketsList.items.connection")}`}
                                className={classes.connectionChip}
                            />
                        )}
                    </div>
                    <div className={classes.metaChips}>
                        {viewSector && ticket.queueId && (
                            <Tooltip title={i18n.t("ticketsList.items.queue")}>
                                <Chip
                                    icon={<BusinessCenterIcon style={{ fontSize: "1rem" }} />}
                                    label={queueLabel}
                                    size="small"
                                    aria-label={`Sector ${queueLabel}`}
                                    className={classes.queueChip}
                                />
                            </Tooltip>
                        )}
                        {viewName && (
                            <Can
                                role={user?.profile}
                                perform="drawer-admin-items:view"
                                yes={() => (
                                    assignedUserName ? (
                                        <Tooltip title={i18n.t("ticketsList.items.user")}>
                                            <Chip
                                                icon={<PersonOutlineIcon style={{ fontSize: "1rem" }} />}
                                                label={assignedUserName}
                                                size="small"
                                                aria-label={`Asignado a ${assignedUserName}`}
                                                className={classes.userChip}
                                            />
                                        </Tooltip>
                                    ) : null
                                )}
                            />
                        )}
                        <span
                            className={classes.statusPill}
                            style={{
                                backgroundColor: statusDisplay.color,
                                color: statusDisplay.textColor,
                            }}
                        >
                            {statusDisplay.label}
                        </span>
                    </div>
                </div>

                {/* FILA 2: Avatar + Nombre + Hora */}
                <div className={classes.ticketBody}>
                    <Avatar
                        className={classes.avatar}
                        src={ticket?.contact?.profilePicUrl}
                        alt={`Foto de perfil de ${ticket.contact?.name || 'contacto'}`}
                    />
                    <div className={classes.contactRow}>
                        <Typography
                            noWrap
                            component="span"
                            variant="body2"
                            style={{ 
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                color: theme.palette.text.primary,
                                letterSpacing: "0.01em"
                            }}
                        >
                            {ticket.contact?.name}
                        </Typography>
                        <div className={classes.timeAndBadge}>
                            <div className={classes.timeRow}>
                                {lastMessageTime && (
                                    <Typography component="span" className={classes.messageTime}>
                                        {lastMessageTime}
                                    </Typography>
                                )}
                                {ticket.unreadMessages > 0 && (
                                    <span className={classes.unreadIndicator}>{ticket.unreadMessages}</span>
                                )}
                            </div>
                            {waitMinutes !== null && (
                                <span
                                    className={clsx(
                                        classes.waitBadge,
                                        waitLevel === "ok" && classes.waitOk,
                                        waitLevel === "warn" && classes.waitWarn,
                                        waitLevel === "danger" && classes.waitDanger
                                    )}
                                >
                                    {waitLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* FILA 3: Mensaje */}
                <div className={classes.messageRow}>
                    {directionMeta && (
                        <img src={directionMeta.icon} alt={directionMeta.alt} width="12" height="12" />
                    )}
                    <Typography component="span" className={classes.lastMessagePreview}>
                        {sanitizedMessage ? (
                            <MarkdownWrapper>{sanitizedMessage}</MarkdownWrapper>
                        ) : (
                            <span></span>
                        )}
                    </Typography>
                </div>

                </ButtonBase>

                {/* FILA 4: Etiquetas (izq) + Botones (der) */}
                <div className={classes.ticketFooter}>
                    {viewTags && tags.length > 0 ? (
                        <div className={classes.tagContainer}>
                            {tags.map(currentTag => (
                                <Chip
                                    key={`ticket-contact-tag-${ticket.id}-${currentTag.id}`}
                                    label={currentTag.name}
                                    size="small"
                                    className={classes.tagChip}
                                    style={{
                                        backgroundColor: currentTag.color,
                                        color: theme.palette.getContrastText
                                            ? theme.palette.getContrastText(currentTag.color)
                                            : "#111"
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={classes.tagPlaceholder} />
                    )}

                    <div className={classes.actionsWrapper}>{renderActionButtons()}</div>
                </div>
            </div>
        </ListItem>
    </React.Fragment>
);
};

export default TicketListItem;
