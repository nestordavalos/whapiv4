import React, { useState, useEffect, useReducer, useContext } from "react";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Paper from "@material-ui/core/Paper";

import TicketListItem from "../TicketListItem";
import TicketsListSkeleton from "../TicketsListSkeleton";

import useTickets from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
	ticketListWrapper: {
		position: "relative",
		display: "flex",
		flex: 1,
		height: "100%",
		minHeight: 0,
		flexDirection: "column",
		overflow: "hidden",
		borderTopRightRadius: 0,
		borderBottomRightRadius: 0,
		backgroundColor: theme.palette.background.default,
	},

	ticketsList: {
		flex: 1,
		overflowY: "auto",
		overflowX: "hidden",
		minHeight: 0,
		height: "100%",
		...theme.scrollbarStyles,
		borderTop: `1px solid ${theme.palette.divider}`,
		padding: "4px 8px 4px 0",
	},

	ticketsListHeader: {
		color: theme.palette.text.primary,
		zIndex: 2,
		backgroundColor: theme.palette.background.paper,
		borderBottom: `1px solid ${theme.palette.divider}`,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},

	ticketsCount: {
		fontWeight: "normal",
		color: theme.palette.text.secondary,
		marginLeft: "8px",
		fontSize: "14px",
	},

	noTicketsText: {
		textAlign: "center",
		color: theme.palette.text.secondary,
		fontSize: "14px",
		lineHeight: "1.4",
	},

	noTicketsTitle: {
		textAlign: "center",
		fontSize: "16px",
		fontWeight: "600",
		margin: "0px",
		color: theme.palette.text.primary,
	},

	noTicketsDiv: {
		display: "flex",
		height: "100px",
		margin: 40,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},
}));

const reducer = (state, action) => {
	if (action.type === "LOAD_TICKETS") {
		const newTickets = action.payload;

		newTickets.forEach((ticket) => {
			const ticketIndex = state.findIndex((t) => t.id === ticket.id);
			if (ticketIndex !== -1) {
				state[ticketIndex] = ticket;
				if (ticket.unreadMessages > 0) {
					state.unshift(state.splice(ticketIndex, 1)[0]);
				}
			} else {
				state.push(ticket);
			}
		});

		return [...state];
	}

	if (action.type === "RESET_UNREAD") {
		const ticketId = action.payload;

		const ticketIndex = state.findIndex((t) => t.id === ticketId);
		if (ticketIndex !== -1) {
			state[ticketIndex].unreadMessages = 0;
		}

		return [...state];
	}

	if (action.type === "UPDATE_TICKET") {
		const ticket = action.payload;

		const ticketIndex = state.findIndex((t) => t.id === ticket.id);
		if (ticketIndex !== -1) {
			state[ticketIndex] = ticket;
		} else {
			state.unshift(ticket);
		}

		return [...state];
	}

	if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
		const ticket = action.payload;

		const ticketIndex = state.findIndex((t) => t.id === ticket.id);
		if (ticketIndex !== -1) {
			state[ticketIndex] = ticket;
			state.unshift(state.splice(ticketIndex, 1)[0]);
		} else {
			state.unshift(ticket);
		}

		return [...state];
	}

	if (action.type === "UPDATE_TICKET_CONTACT") {
		const contact = action.payload;
		const ticketIndex = state.findIndex((t) => t.contactId === contact.id);
		if (ticketIndex !== -1) {
			state[ticketIndex].contact = contact;
		}
		return [...state];
	}

	if (action.type === "DELETE_TICKET") {
		const ticketId = action.payload;
		const ticketIndex = state.findIndex((t) => t.id === ticketId);
		if (ticketIndex !== -1) {
			state.splice(ticketIndex, 1);
		}

		return [...state];
	}

	if (action.type === "RESET") {
		return [];
	}
};

const TicketsList = (props) => {
	const {
		handleChangeTab,
		status,
		searchParam,
		showAll,
		selectedQueueIds,
		selectedTagIds,
		selectedWhatsappIds,
		selectedUserIds,
		updateCount,
		style,
		tags,
	} = props;
	const classes = useStyles();
	const [pageNumber, setPageNumber] = useState(1);
	const [ticketsList, dispatch] = useReducer(reducer, []);
	const { user } = useContext(AuthContext);
	const { profile, queues } = user;


	useEffect(() => {
		dispatch({ type: "RESET" });
		setPageNumber(1);
	}, [status, searchParam, dispatch, showAll, selectedQueueIds, selectedTagIds, selectedWhatsappIds, selectedUserIds, tags]);

	const { tickets, hasMore, loading } = useTickets({
		pageNumber,
		searchParam,
		status,
		showAll,
		tags: (tags && tags.length > 0) ? JSON.stringify(tags) 
			: (selectedTagIds && selectedTagIds.length > 0) ? JSON.stringify(selectedTagIds) 
			: undefined,
		queueIds: JSON.stringify(selectedQueueIds || []),
		whatsappIds: (selectedWhatsappIds && selectedWhatsappIds.length > 0) 
			? JSON.stringify(selectedWhatsappIds) 
			: undefined,
		userIds: (selectedUserIds && selectedUserIds.length > 0) 
			? JSON.stringify(selectedUserIds) 
			: undefined,
	});



	useEffect(() => {

		const queueIds = queues.map((q) => q.id);
		const filteredTickets = tickets.filter((t) => queueIds.indexOf(t.queueId) > -1);
		const allticket = user.allTicket === 'enabled';




		// Função para identificação liberação da settings 
		if ((profile || "").toUpperCase() === "ADMIN" || allticket) {
			dispatch({ type: "LOAD_TICKETS", payload: tickets });
		} else {
			dispatch({ type: "LOAD_TICKETS", payload: filteredTickets });
		}




	}, [tickets, status, searchParam, queues, profile, user.allTicket]);

        useEffect(() => {
                const socket = openSocket();
                if (!socket) return;

                const join = () => {
                        if (status) {
                                socket.emit("joinTickets", status);
                        } else {
                                socket.emit("joinNotification");
                        }
                };

                if (socket.connected) {
                        join();
                } else {
                        socket.on("connect", join);
                }

				const matchesQueueFilter = (ticket) => {
					if (!ticket.queueId) return true;
					if (!selectedQueueIds || selectedQueueIds.length === 0) return true;
					return selectedQueueIds.indexOf(ticket.queueId) > -1;
				};

				// Check if user is admin
				const isAdmin = (profile || "").toUpperCase() === "ADMIN";

				const shouldUpdateTicket = (ticket) => {
					// Status must match if specified
					if (status && ticket.status !== status) return false;
					
					// Queue filter
					if (!matchesQueueFilter(ticket)) return false;
					
					// Admin or showAll can see all tickets
					if (isAdmin || showAll) return true;
					
					// Non-admin users can only see their own tickets or unassigned
					return !ticket.userId || ticket.userId === user?.id;
				};

                const handleTicket = (data) => {
                        console.debug(`[TicketsList ${status}] Received ticket event:`, {
                                action: data.action,
                                ticketId: data.ticket?.id || data.ticketId,
                                ticketStatus: data.ticket?.status,
                                ticketUserId: data.ticket?.userId,
                                shouldUpdate: data.ticket ? shouldUpdateTicket(data.ticket) : 'N/A',
                                isAdmin,
                                showAll
                        });

                        if (data.action === "updateUnread") {
                                dispatch({
                                        type: "RESET_UNREAD",
                                        payload: data.ticketId,
                                });
                                return;
                        }

                        if (data.action === "create" && shouldUpdateTicket(data.ticket)) {
                                dispatch({
                                        type: "UPDATE_TICKET",
                                        payload: data.ticket,
                                });
                                return;
                        }

                        if (data.action === "update") {
                                if (shouldUpdateTicket(data.ticket)) {
                                        dispatch({
                                                type: "UPDATE_TICKET",
                                                payload: data.ticket,
                                        });
                                } else {
                                        dispatch({ type: "DELETE_TICKET", payload: data.ticket.id });
                                }
                                return;
                        }

                        if (data.action === "delete") {
                                dispatch({ type: "DELETE_TICKET", payload: data.ticketId });
                        }
                };
                socket.on("ticket", handleTicket);

        let handleAppMessage;
        let handleContact;

        if (status) {
                handleAppMessage = (data) => {
                        console.debug("TicketsList received appMessage", data);
                        if (data.action === "create" && shouldUpdateTicket(data.ticket)) {
                                dispatch({
                                        type: "UPDATE_TICKET_UNREAD_MESSAGES",
                                        payload: data.ticket,
                                });
                        }
                };
                socket.on("appMessage", handleAppMessage);

                handleContact = (data) => {
                        if (data.action === "update") {
                                dispatch({
                                        type: "UPDATE_TICKET_CONTACT",
                                        payload: data.contact,
                                });
                        }
                };
                socket.on("contact", handleContact);
        }

                return () => {
                        socket.off("connect", join);
                        socket.off("ticket", handleTicket);
                        if (status) {
                                socket.off("appMessage", handleAppMessage);
                                socket.off("contact", handleContact);
                        }
                };
        }, [status, showAll, user, selectedQueueIds, profile]);

	useEffect(() => {
		if (typeof updateCount === "function") {
			updateCount(ticketsList.length);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ticketsList]);

	const loadMore = () => {
		setPageNumber((prevState) => prevState + 1);
	};

	const handleScroll = (e) => {
		if (!hasMore || loading) return;

		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

		if (scrollHeight - (scrollTop + 100) < clientHeight) {
			loadMore();
		}
	};

	return (
		<Paper className={classes.ticketsListWrapper} style={style}>
			<Paper
				square
				name="closed"
				elevation={0}
				className={classes.ticketsList}
				onScroll={handleScroll}
			>
				<List style={{ paddingTop: 0 }}>
					{ticketsList.length === 0 && !loading ? (
						<div className={classes.noTicketsDiv}>
							<span className={classes.noTicketsTitle}>
								{i18n.t("ticketsList.noTicketsTitle")}
							</span>
							<p className={classes.noTicketsText}>
								{i18n.t("ticketsList.noTicketsMessage")}
							</p>
						</div>
					) : (
						<>
							{ticketsList.map((ticket) => (
								<TicketListItem handleChangeTab={handleChangeTab} ticket={ticket} key={ticket.id} />
							))}
						</>
					)}
					{loading && <TicketsListSkeleton />}
				</List>
			</Paper>
		</Paper>
	);
};

export default TicketsList;
