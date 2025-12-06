import React, { useState, useRef, useEffect, useContext, useCallback } from "react";

import { useHistory } from "react-router-dom";
import { format, parseISO } from "date-fns";
import openSocket from "../../services/socket-io";

import Popover from "@mui/material/Popover";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import makeStyles from '@mui/styles/makeStyles';
import Badge from "@mui/material/Badge";
import ChatIcon from "@mui/icons-material/Chat";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

import { i18n } from "../../translate/i18n";
import useTickets from "../../hooks/useTickets";
import alertSound from "../../assets/sound.mp3";

import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	tabContainer: {
		overflowY: "auto",
		maxHeight: 450,
		...theme.scrollbarStyles,
	},
	popoverPaper: {
		width: "100%",
		maxWidth: 380,
		marginLeft: theme.spacing(2),
		marginRight: theme.spacing(1),
		borderRadius: 12,
		boxShadow: theme.palette.mode === "dark"
			? "0 8px 32px rgba(0,0,0,0.4)"
			: "0 8px 32px rgba(0,0,0,0.15)",
		[theme.breakpoints.down('md')]: {
			maxWidth: 320,
		},
	},
	noShadow: {
		boxShadow: "none !important",
	},
	notificationHeader: {
		padding: theme.spacing(2),
		borderBottom: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.background.default,
	},
	notificationTitle: {
		fontWeight: 600,
		fontSize: "1rem",
	},
	compactTicketItem: {
		padding: "10px 16px !important",
		borderBottom: `1px solid ${theme.palette.divider}`,
		cursor: "pointer",
		transition: "background-color 0.2s ease",
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
		"&:last-child": {
			borderBottom: "none",
		},
	},
	ticketContent: {
		display: "flex",
		gap: 12,
		alignItems: "flex-start",
		width: "100%",
	},
	ticketAvatar: {
		width: 40,
		height: 40,
		flexShrink: 0,
	},
	ticketInfo: {
		flex: 1,
		minWidth: 0,
		display: "flex",
		flexDirection: "column",
		gap: 4,
	},
	ticketMainRow: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		gap: 8,
	},
	contactName: {
		fontWeight: 600,
		fontSize: "0.875rem",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		color: theme.palette.text.primary,
	},
	ticketTime: {
		fontSize: "0.7rem",
		color: theme.palette.text.secondary,
		flexShrink: 0,
	},
	lastMessage: {
		fontSize: "0.8rem",
		color: theme.palette.text.secondary,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		display: "block",
	},
	ticketMetaRow: {
		display: "flex",
		gap: 6,
		alignItems: "center",
		flexWrap: "wrap",
	},
	compactChip: {
		height: 20,
		fontSize: "0.65rem",
		fontWeight: 500,
		"& .MuiChip-label": {
			padding: "0 6px",
		},
	},
	unreadBadge: {
		backgroundColor: theme.palette.primary.main,
		color: "white",
		borderRadius: "50%",
		width: 20,
		height: 20,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "0.65rem",
		fontWeight: 600,
		flexShrink: 0,
	},
	emptyState: {
		padding: theme.spacing(4, 2),
		textAlign: "center",
		color: theme.palette.text.secondary,
	},
}));

const NotificationsPopOver = () => {
	const classes = useStyles();

        const history = useHistory();
        const { user } = useContext(AuthContext);
        const anchorEl = useRef();
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [notificationPermission, setNotificationPermission] = useState(
                typeof window !== "undefined" && "Notification" in window 
                        ? Notification.permission 
                        : "unsupported"
        );
	const { profile, queues } = user;

        const [, setDesktopNotifications] = useState([]);

        const { tickets } = useTickets({ withUnreadMessages: "true" });
        const audioRef = useRef(null);

        const historyRef = useRef(history);

        useEffect(() => {
                historyRef.current = history;
        }, [history]);

        useEffect(() => {
                console.log('[NotificationsPopOver] Initializing audio, alertSound path:', alertSound);
                // Inicializar el audio
                const audio = new Audio(alertSound);
                audio.preload = "auto";
                audio.volume = 0.8; // Establecer volumen al 80%
                audioRef.current = audio;
                
                // Pre-cargar el audio
                audio.load();
                
                audio.addEventListener('canplaythrough', () => {
                        console.log('[NotificationsPopOver] Audio loaded and ready to play');
                });
                audio.addEventListener('error', (e) => {
                        console.log('[NotificationsPopOver] Audio load error:', e);
                });
        }, []);

        useEffect(() => {
                // Desbloquear el audio después de la primera interacción del usuario
                const unlock = () => {
                        if (!audioRef.current) return;
                        
                        const audio = audioRef.current;
                        audio.play()
                                .then(() => {
                                        audio.pause();
                                        audio.currentTime = 0;
                                })
                                .catch(() => {});
                        document.removeEventListener("click", unlock);
                        document.removeEventListener("touchstart", unlock);
                };
                
                document.addEventListener("click", unlock);
                document.addEventListener("touchstart", unlock);
                
                return () => {
                        document.removeEventListener("click", unlock);
                        document.removeEventListener("touchstart", unlock);
                };
        }, []);

	useEffect(() => {
		const queueIds = queues.map((q) => q.id);
		const filteredTickets = tickets.filter((t) => queueIds.indexOf(t.queueId) > -1);

		if (profile === "user") {
			setNotifications(filteredTickets);
		} else {
			setNotifications(tickets);
		}
        }, [tickets, queues, profile]);

        // Función para reproducir el sonido de notificación
        const playNotificationSound = useCallback(() => {
                console.log('[NotificationsPopOver] playNotificationSound called, audioRef:', !!audioRef.current);
                if (!audioRef.current) return;

                try {
                        const audio = audioRef.current;
                        audio.currentTime = 0;
                        audio.play()
                                .then(() => console.log('[NotificationsPopOver] Sound played successfully'))
                                .catch((err) => {
                                        console.log('[NotificationsPopOver] First play failed, retrying...', err.message);
                                        // Intentar una vez más
                                        setTimeout(() => audio.play().catch((e) => console.log('[NotificationsPopOver] Retry failed:', e.message)), 100);
                                });
                } catch (err) {
                        console.log('[NotificationsPopOver] playNotificationSound error:', err);
                }
        }, []);

        const handleReactionNotification = useCallback((data) => {
                const { reaction, contact, ticket } = data;

                const senderName = reaction.senderName || contact.name;
                const options = {
                        body: `${senderName} reaccionó ${reaction.emoji} - ${format(new Date(), "HH:mm")}`,
                        icon: contact.profilePicUrl,
                        tag: `reaction-${ticket.id}-${reaction.id}`,
                        renotify: true,
                        requireInteraction: false,
                };

                try {
                        if (!("Notification" in window)) {
                                playNotificationSound();
                                return;
                        }

                        if (Notification.permission === "granted") {
                                const notification = new Notification(
                                        `${i18n.t("tickets.notification.reaction") || "Reacción de"} ${contact.name}`,
                                        options
                                );

                                notification.onclick = e => {
                                        e.preventDefault();
                                        window.focus();
                                        historyRef.current.push(`/tickets/${ticket.id}`);
                                };

                                setDesktopNotifications(prevState => {
                                        const notfiticationIndex = prevState.findIndex(
                                                n => n.tag === notification.tag
                                        );
                                        if (notfiticationIndex !== -1) {
                                                prevState[notfiticationIndex] = notification;
                                                return [...prevState];
                                        }
                                        return [notification, ...prevState];
                                });

                                playNotificationSound();
                        } else if (Notification.permission === "default") {
                                playNotificationSound();
                                Notification.requestPermission().then(permission => {
                                        setNotificationPermission(permission);
                                        
                                        if (permission === "granted") {
                                                const notification = new Notification(
                                                        `${i18n.t("tickets.notification.reaction") || "Reacción de"} ${contact.name}`,
                                                        options
                                                );
                                                notification.onclick = e => {
                                                        e.preventDefault();
                                                        window.focus();
                                                        historyRef.current.push(`/tickets/${ticket.id}`);
                                                };
                                        }
                                });
                        } else {
                                playNotificationSound();
                        }
                } catch (err) {
                        playNotificationSound();
                }
        }, [playNotificationSound]);

        const handleNotifications = useCallback((data) => {
                console.log('[NotificationsPopOver] handleNotifications called with data:', data);
                const { message, contact, ticket } = data;

                const messageBody = message.body || "📎 Archivo multimedia";
                const options = {
                        body: `${messageBody} - ${format(new Date(), "HH:mm")}`,
                        icon: contact.profilePicUrl,
                        tag: String(ticket.id),
                        renotify: true,
                        requireInteraction: false,
                };

                try {
                        if (!("Notification" in window)) {
                                console.log('[NotificationsPopOver] Notifications not supported in this browser');
                                playNotificationSound();
                                return;
                        }

                        console.log('[NotificationsPopOver] Notification.permission:', Notification.permission);

                        if (Notification.permission === "granted") {
                                const notification = new Notification(
                                        `${i18n.t("tickets.notification.message")} ${contact.name}`,
                                        options
                                );

                                notification.onclick = e => {
                                        e.preventDefault();
                                        window.focus();
                                        historyRef.current.push(`/tickets/${ticket.id}`);
                                };

                                setDesktopNotifications(prevState => {
                                        const notfiticationIndex = prevState.findIndex(
                                                n => n.tag === notification.tag
                                        );
                                        if (notfiticationIndex !== -1) {
                                                prevState[notfiticationIndex] = notification;
                                                return [...prevState];
                                        }
                                        return [notification, ...prevState];
                                });

                                console.log('[NotificationsPopOver] Notification created, playing sound...');
                                playNotificationSound();
                        } else if (Notification.permission === "default") {
                                console.log('[NotificationsPopOver] Requesting notification permission...');
                                playNotificationSound();
                                Notification.requestPermission().then(permission => {
                                        setNotificationPermission(permission);
                                        
                                        if (permission === "granted") {
                                                const notification = new Notification(
                                                        `${i18n.t("tickets.notification.message")} ${contact.name}`,
                                                        options
                                                );
                                                notification.onclick = e => {
                                                        e.preventDefault();
                                                        window.focus();
                                                        historyRef.current.push(`/tickets/${ticket.id}`);
                                                };
                                        }
                                });
                        } else {
                                console.log('[NotificationsPopOver] Notification permission denied, only playing sound');
                                playNotificationSound();
                        }
                } catch (err) {
                        console.log('[NotificationsPopOver] Error in handleNotifications:', err);
                        playNotificationSound();
                }
        }, [playNotificationSound]);

        useEffect(() => {
                const socket = openSocket();
                if (!socket) return;
                const queueIds = queues.map((q) => q.id);

                const join = () => socket.emit("joinNotification");
                if (socket.connected) {
                        join();
                } else {
                        socket.on("connect", join);
                }

                const handleTicketEvent = data => {
                        if (data.action === "updateUnread" || data.action === "delete") {
                                setNotifications(prevState => {
                                        const ticketIndex = prevState.findIndex(t => t.id === data.ticketId);
                                        if (ticketIndex !== -1) {
                                                prevState.splice(ticketIndex, 1);
                                                return [...prevState];
                                        }
                                        return prevState;
                                });

                                setDesktopNotifications(prevState => {
                                        const notfiticationIndex = prevState.findIndex(
                                                n => n.tag === String(data.ticketId)
                                        );
                                        if (notfiticationIndex !== -1) {
                                                prevState[notfiticationIndex].close();
                                                prevState.splice(notfiticationIndex, 1);
                                                return [...prevState];
                                        }
                                        return prevState;
                                });
                        }
                };
                socket.on("ticket", handleTicketEvent);

                const handleAppMessageEvent = data => {
                        console.log('[NotificationsPopOver] appMessage event received:', data.action, 'fromMe:', data.message?.fromMe);
                        
                        // Manejar notificaciones de reacciones
                        if (data.action === "reactionUpdate" && !data.reaction.fromMe) {
                                if (data.ticket && data.contact) {
                                        const shouldNotNotificate =
                                                (data.ticket.userId && data.ticket.userId !== user?.id) ||
                                                data.ticket.isGroup ||
                                                data.ticket.chatbot;

                                        if (!shouldNotNotificate) {
                                                handleReactionNotification(data);
                                        }
                                }
                                return;
                        }

                        if (
                                data.action === "create" &&
                                !data.message.read &&
                                (data.ticket.userId === user?.id || !data.ticket.userId)
                        ) {
                                console.log('[NotificationsPopOver] New message for notification, profile:', profile, 'queueId:', data.ticket.queue?.id);
                                
                                if (
                                        profile === "user" &&
                                        data.ticket.queue &&
                                        queueIds.indexOf(data.ticket.queue.id) === -1
                                ) {
                                        console.log('[NotificationsPopOver] Queue not allowed for user profile');
                                        return;
                                }

                                setNotifications(prevState => {
                                        const ticketIndex = prevState.findIndex(t => t.id === data.ticket.id);
                                        if (ticketIndex !== -1) {
                                                prevState[ticketIndex] = data.ticket;
                                                return [...prevState];
                                        }
                                        return [data.ticket, ...prevState];
                                });

                                const shouldNotNotificate =
                                        (data.ticket.userId && data.ticket.userId !== user?.id) ||
                                        data.ticket.isGroup ||
                                        data.ticket.chatbot;

                                console.log('[NotificationsPopOver] shouldNotNotificate:', shouldNotNotificate, 'userId:', data.ticket.userId, 'currentUser:', user?.id);

                                if (!shouldNotNotificate) {
                                        handleNotifications(data);
                                }
                        }
                };
                socket.on("appMessage", handleAppMessageEvent);

                return () => {
                        socket.off("connect", join);
                        socket.off("ticket", handleTicketEvent);
                        socket.off("appMessage", handleAppMessageEvent);
                };
        }, [user, profile, queues, handleNotifications, handleReactionNotification]);

        const handleClick = () => {
                if ("Notification" in window && Notification.permission === "default") {
                        Notification.requestPermission().then(permission => {
                                setNotificationPermission(permission);
                        }).catch(() => {});
                }
                
                setIsOpen(prevState => !prevState);
        };

	const handleClickAway = () => {
		setIsOpen(false);
	};

	const handleTicketClick = (ticketId) => {
		history.push(`/tickets/${ticketId}`);
		handleClickAway();
	};

	const formatTime = (timestamp) => {
		try {
			const date = parseISO(timestamp);
			const now = new Date();
			const diff = now - date;
			const minutes = Math.floor(diff / 60000);
			const hours = Math.floor(diff / 3600000);
			
			if (minutes < 1) return "Ahora";
			if (minutes < 60) return `${minutes}m`;
			if (hours < 24) return `${hours}h`;
			return format(date, "dd/MM");
		} catch {
			return "";
		}
	};

	const getLastMessage = (ticket) => {
		if (!ticket.lastMessage) return "Sin mensajes";
		const msg = ticket.lastMessage;
		if (msg.mediaType) {
			const mediaTypes = {
				image: "📷 Imagen",
				video: "🎥 Video",
				audio: "🎵 Audio",
				document: "📄 Documento",
				sticker: "🎨 Sticker",
			};
			return mediaTypes[msg.mediaType] || "📎 Archivo";
		}
		return msg.body || "Sin texto";
	};

	const CompactTicketItem = ({ ticket }) => (
		<ListItem 
			className={classes.compactTicketItem}
			onClick={() => handleTicketClick(ticket.id)}
		>
			<Box className={classes.ticketContent}>
				<Avatar 
					src={ticket.contact?.profilePicUrl} 
					alt={ticket.contact?.name}
					className={classes.ticketAvatar}
				>
					{ticket.contact?.name?.charAt(0).toUpperCase()}
				</Avatar>
				<Box className={classes.ticketInfo}>
					<Box className={classes.ticketMainRow}>
						<Typography className={classes.contactName}>
							{ticket.contact?.name || "Sin nombre"}
						</Typography>
						<Typography className={classes.ticketTime}>
							{formatTime(ticket.updatedAt)}
						</Typography>
					</Box>
					<Typography className={classes.lastMessage}>
						{getLastMessage(ticket)}
					</Typography>
					<Box className={classes.ticketMetaRow}>
						{ticket.queue && (
							<Chip 
								label={ticket.queue.name} 
								size="small"
								className={classes.compactChip}
								style={{ 
									backgroundColor: ticket.queue.color + "20",
									color: ticket.queue.color,
								}}
							/>
						)}
						{ticket.user && (
							<Chip 
								label={ticket.user.name} 
								size="small"
								className={classes.compactChip}
							/>
						)}
						{ticket.unreadMessages > 0 && (
							<Box className={classes.unreadBadge}>
								{ticket.unreadMessages}
							</Box>
						)}
					</Box>
				</Box>
			</Box>
		</ListItem>
	);

        const getTooltipTitle = () => {
                if (notificationPermission === "denied") {
                        return "Notificaciones bloqueadas. Por favor, habilítalas en la configuración del navegador.";
                }
                if (notificationPermission === "unsupported") {
                        return "Este navegador no soporta notificaciones";
                }
                return `Notificaciones: ${notifications.length} mensajes sin leer`;
        };

	return (
            <>
                    <Tooltip title={getTooltipTitle()} arrow>
                            <IconButton
                                    onClick={handleClick}
                                    ref={anchorEl}
                                    aria-label={getTooltipTitle()}
                                    color="inherit"
                                    size="large">
                                <Badge badgeContent={notifications.length} color="secondary" overlap="rectangular" >
                                    {notificationPermission === "denied" ? (
                                            <NotificationsOffIcon />
                                    ) : (
                                            <ChatIcon />
                                    )}
                                </Badge>
                            </IconButton>
                    </Tooltip>
                    <Popover
                        disableScrollLock
                        open={isOpen}
                        anchorEl={anchorEl.current}
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                        }}
                        transformOrigin={{
                            vertical: "top",
                            horizontal: "right",
                        }}
                        classes={{ paper: classes.popoverPaper }}
                        onClose={handleClickAway}
                    >
                        <Box className={classes.notificationHeader}>
                            <Typography className={classes.notificationTitle}>
                                {i18n.t("notifications.title") || "Notificaciones"}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {notifications.length} {notifications.length === 1 ? "mensaje" : "mensajes"}
                            </Typography>
                        </Box>
                        <List dense className={classes.tabContainer}>
                            {notifications.length === 0 ? (
                                <Box className={classes.emptyState}>
                                    <Typography variant="body2">
                                        {i18n.t("notifications.noTickets")}
                                    </Typography>
                                </Box>
                            ) : (
                                notifications.map(ticket => (
                                    <CompactTicketItem key={ticket.id} ticket={ticket} />
                                ))
                            )}
                        </List>
                    </Popover>
            </>
    );
};

export default NotificationsPopOver;
