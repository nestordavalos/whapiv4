import React, { useState, useRef, useEffect, useContext } from "react";

import { useHistory } from "react-router-dom";
import { format } from "date-fns";
import openSocket from "../../services/socket-io";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import ChatIcon from "@material-ui/icons/Chat";

import TicketListItem from "../TicketListItem";
import { i18n } from "../../translate/i18n";
import useTickets from "../../hooks/useTickets";
import alertSound from "../../assets/sound.mp3";

import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	tabContainer: {
		overflowY: "auto",
		maxHeight: 350,
		...theme.scrollbarStyles,
	},
	popoverPaper: {
		width: "100%",
		maxWidth: 350,
		marginLeft: theme.spacing(2),
		marginRight: theme.spacing(1),
		[theme.breakpoints.down("sm")]: {
			maxWidth: 270,
		},
	},
	noShadow: {
		boxShadow: "none !important",
	},
}));

const NotificationsPopOver = () => {
	const classes = useStyles();

        const history = useHistory();
        const { user } = useContext(AuthContext);
        const anchorEl = useRef();
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const { profile, queues } = user;

        const [, setDesktopNotifications] = useState([]);

        const { tickets } = useTickets({ withUnreadMessages: "true" });
        const audioRef = useRef(new Audio(alertSound));

        const historyRef = useRef(history);

        useEffect(() => {
                if (!("Notification" in window)) {
                        console.log("This browser doesn't support notifications");
                } else {
                        Notification.requestPermission();
                }
        }, []);

        useEffect(() => {
                audioRef.current.load();
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
                        if (
                                data.action === "create" &&
                                !data.message.read &&
                                (data.ticket.userId === user?.id || !data.ticket.userId)
                        ) {
                                if (profile === 'user' && (queueIds.indexOf(data.ticket.queue?.id) === -1 || data.ticket.queue === null)) {
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
        }, [user, profile, queues]);

        const handleNotifications = data => {
                const { message, contact, ticket } = data;

                const options = {
                        body: `${message.body} - ${format(new Date(), "HH:mm")}`,
                        icon: contact.profilePicUrl,
                        tag: ticket.id,
                        renotify: true,
                };

                try {
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
                        }
                } catch (err) {
                        console.error("Failed to show notification", err);
                }

                try {
                        const audio = audioRef.current;
                        audio.currentTime = 0;
                        audio.play().catch(err => console.error("Failed to play sound", err));
                } catch (err) {
                        console.error("Failed to play sound", err);
                }
        };

	const handleClick = () => {
		setIsOpen(prevState => !prevState);
	};

	const handleClickAway = () => {
		setIsOpen(false);
	};

	const NotificationTicket = ({ children }) => {
		return <div onClick={handleClickAway}>{children}</div>;
	};

	return (
		<>
			<IconButton
				onClick={handleClick}
				ref={anchorEl}
				aria-label="Open Notifications"
				color="inherit"
			>
				<Badge badgeContent={notifications.length} color="secondary" overlap="rectangular" >
					<ChatIcon />
				</Badge>
			</IconButton>
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
				<List dense className={classes.tabContainer}>
					{notifications.length === 0 ? (
						<ListItem>
							<ListItemText>{i18n.t("notifications.noTickets")}</ListItemText>
						</ListItem>
					) : (
						notifications.map(ticket => (
							<NotificationTicket key={ticket.id}>
								<TicketListItem ticket={ticket} />
							</NotificationTicket>
						))
					)}
				</List>
			</Popover>
		</>
	);
};

export default NotificationsPopOver;
