import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { useTheme } from "@mui/material/styles";
import makeStyles from '@mui/styles/makeStyles';
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
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
		padding: "6px 8px !important",
		margin: "0 !important",
		borderRadius: 8,
		border: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.paper,
		alignItems: "flex-start",
		gap: 6,
		transition: "box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease",
		overflow: "hidden",
		"&:hover": {
			boxShadow: theme.palette.mode === "dark"
				? "0 8px 18px rgba(0,0,0,0.45)"
				: "0 10px 24px rgba(15,23,42,0.12)",
			transform: "translateY(-1px)",
		},
		"&.Mui-selected": {
			backgroundColor: theme.palette.mode === "dark" 
				? "rgba(0, 113, 193, 0.15)" 
				: "rgba(0, 113, 193, 0.08)",
			borderColor: theme.palette.primary.main,
			boxShadow: theme.palette.mode === "dark"
				? "0 4px 12px rgba(0, 113, 193, 0.3)"
				: "0 4px 12px rgba(0, 113, 193, 0.15)",
			"&:hover": {
				backgroundColor: theme.palette.mode === "dark" 
					? "rgba(0, 113, 193, 0.2)" 
					: "rgba(0, 113, 193, 0.12)",
			},
		},
		[theme.breakpoints.down('sm')]: {
			margin: "4px 6px 4px 4px !important",
			padding: "5px 8px !important",
			gap: 5,
		},
	},
	pendingTicket: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(255,193,7,0.08)" : "#fffef7",
		borderColor: theme.palette.mode === "dark" ? "rgba(255,193,7,0.3)" : "#fde68a",
	},
	ticketQueueColor: {
		width: 3,
		borderRadius: 3,
		alignSelf: "stretch",
		backgroundColor: theme.palette.primary.light,
	},
	cardContent: {
		width: "100%",
		display: "flex",
		flexDirection: "column",
		gap: 6,
	},
	mainContentButton: {
		textAlign: "left",
		display: "flex",
		flexDirection: "column",
		gap: 6,
		alignItems: "stretch",
		width: "100%",
		padding: 0,
		borderRadius: 8,
		"&:hover": {
			backgroundColor: "transparent",
		},
	},
	headerRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		width: "100%",
	},
	nameInfo: {
		display: "flex",
		alignItems: "center",
		gap: 4,
		minWidth: 0,
	},
	metaChips: {
		display: "flex",
		flexWrap: "wrap",
		gap: 4,
		justifyContent: "flex-end",
		alignItems: "center",
		[theme.breakpoints.down('sm')]: {
			gap: 2,
		},
	},
	connectionChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(76,175,80,0.18)" : "#ecfdf5",
		color: theme.palette.success.main,
		[theme.breakpoints.down('sm')]: {
			display: "none",
		},
	},
	queueChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(33,150,243,0.2)" : "#e7f1ff",
		color: theme.palette.primary.main,
		[theme.breakpoints.down('sm')]: {
			"& .MuiChip-label": {
				padding: "0 4px",
				fontSize: "0.6rem",
			},
			"& .MuiChip-icon": {
				display: "none",
			},
		},
	},
	userChip: {
		backgroundColor: theme.palette.mode === "dark" ? "rgba(44,62,80,0.6)" : "#e5e7eb",
		color: theme.palette.text.primary,
		[theme.breakpoints.down('sm')]: {
			display: "none",
		},
	},
	statusPill: {
		padding: "0 6px",
		borderRadius: 999,
		fontSize: "0.62rem",
		fontWeight: 700,
		letterSpacing: "0.06em",
		textTransform: "uppercase",
		[theme.breakpoints.down('sm')]: {
			padding: "0 4px",
			fontSize: "0.55rem",
		},
	},
	ticketBody: {
		display: "flex",
		alignItems: "center",
		gap: 8,
	},
	avatar: {
		height: 34,
		width: 34,
		borderRadius: 8,
		flexShrink: 0,
		[theme.breakpoints.down('sm')]: {
			height: 30,
			width: 30,
			borderRadius: 6,
		},
	},
	contactRow: {
		flex: 1,
		minWidth: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	messageRow: {
		display: "flex",
		alignItems: "flex-start",
		gap: 6,
		width: "100%",
	},
	messageTime: {
		fontSize: "0.78rem",
		color: theme.palette.text.secondary,
		fontWeight: 500,
		whiteSpace: "nowrap",
	},
	waitBadge: {
		marginTop: 2,
		padding: "2px 8px",
		borderRadius: 999,
		fontSize: "0.68rem",
		fontWeight: 600,
		lineHeight: 1.2,
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
	},
	waitOk: {
		color: "#166534",
		backgroundColor: "#dcfce7",
	},
	waitWarn: {
		color: "#92400e",
		backgroundColor: "#fef3c7",
	},
	waitDanger: {
		color: "#991b1b",
		backgroundColor: "#fee2e2",
	},
	lastMessagePreview: {
		color: theme.palette.text.secondary,
		fontSize: "0.78rem",
		display: "-webkit-box",
		WebkitLineClamp: 2,
		WebkitBoxOrient: "vertical",
		overflow: "hidden",
		[theme.breakpoints.down('sm')]: {
			fontSize: "0.72rem",
			WebkitLineClamp: 1,
		},
	},
	ticketFooter: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 6,
		flexWrap: "wrap",
	},
	tagContainer: {
		display: "flex",
		flexWrap: "wrap",
		gap: 3,
		flex: 1,
		minWidth: 0,
		maxHeight: 18,
		overflow: "hidden",
	},
	tagChip: {
		maxWidth: 80,
		height: 16,
		fontSize: "0.65rem",
		textOverflow: "ellipsis",
		overflow: "hidden",
		"& .MuiChip-label": {
			padding: "0 6px",
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
		padding: 4,
		borderRadius: 8,
	},
	timeAndBadge: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-end",
		gap: 2,
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
		fontSize: "0.65rem",
		fontWeight: 700,
		borderRadius: 10,
		padding: "2px 6px",
		minWidth: 18,
		textAlign: "center",
		lineHeight: 1,
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
                        alt={ticket.contact?.name || "contact"}
                    />
                    <div className={classes.contactRow}>
                        <Typography
                            noWrap
                            component="span"
                            variant="body2"
                            style={{ fontWeight: 700 }}
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
