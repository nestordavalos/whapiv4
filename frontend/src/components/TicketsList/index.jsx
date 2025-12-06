import React, {
	useState,
	useEffect,
	useReducer,
	useContext,
	useRef,
	useCallback,
} from "react";
import openSocket from "../../services/socket-io";

import makeStyles from "@mui/styles/makeStyles";
import Paper from "@mui/material/Paper";

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
		padding: "8px",
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
		if (action.isReset) {
			return newTickets;
		}
		
		const updatedState = [...state];
		newTickets.forEach((ticket) => {
			const ticketIndex = updatedState.findIndex((t) => t.id === ticket.id);
			if (ticketIndex !== -1) {
				updatedState[ticketIndex] = ticket;
				if (ticket.unreadMessages > 0) {
					updatedState.unshift(updatedState.splice(ticketIndex, 1)[0]);
				}
			} else {
				updatedState.push(ticket);
			}
		});
		return updatedState;
	}

	if (action.type === "RESET_UNREAD") {
		const ticketId = action.payload;
		const ticketIndex = state.findIndex((t) => t.id === ticketId);
		if (ticketIndex === -1 || state[ticketIndex].unreadMessages === 0) return state;
		
		const updatedState = [...state];
		updatedState[ticketIndex] = {
			...updatedState[ticketIndex],
			unreadMessages: 0
		};
		return updatedState;
	}

	if (action.type === "UPDATE_TICKET") {
		const ticket = action.payload;
		const ticketIndex = state.findIndex((t) => t.id === ticket.id);
		
		if (ticketIndex !== -1) {
			// El ticket YA existe en la lista, actualizar
			const updatedState = [...state];
			updatedState[ticketIndex] = ticket;
			
			if (ticket.unreadMessages > 0 && ticketIndex !== 0) {
				updatedState.splice(ticketIndex, 1);
				updatedState.unshift(ticket);
			}
			return updatedState;
		}
		
		// El ticket NO existe en la lista
		// Lo agregamos si es nuevo O si shouldUpdateTicket determinó que debe estar aquí
		if (action.isNewTicket || action.shouldAdd) {
			return [ticket, ...state];
		}
		
		return state;
	}

	if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
		const ticket = action.payload;
		const updatedState = [...state];
		const ticketIndex = updatedState.findIndex((t) => t.id === ticket.id);
		
		if (ticketIndex !== -1) {
			updatedState[ticketIndex] = ticket;
			updatedState.unshift(updatedState.splice(ticketIndex, 1)[0]);
		} else {
			updatedState.unshift(ticket);
		}
		return updatedState;
	}

	if (action.type === "UPDATE_TICKET_CONTACT") {
		const contact = action.payload;
		const updatedState = [...state];
		const ticketIndex = updatedState.findIndex((t) => t.contactId === contact.id);
		if (ticketIndex !== -1) {
			updatedState[ticketIndex] = {
				...updatedState[ticketIndex],
				contact
			};
		}
		return updatedState;
	}

	if (action.type === "DELETE_TICKET") {
		const ticketId = action.payload;
		const ticketExists = state.some((t) => t.id === ticketId);
		if (!ticketExists) return state;
		return state.filter((t) => t.id !== ticketId);
	}

	if (action.type === "RESET") {
		return [];
	}

	return state;
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
	const listRef = useRef(null);

	// Al cambiar filtros, resetear
	useEffect(() => {
		dispatch({ type: "RESET" });
		setPageNumber(1);
	}, [status, searchParam, showAll, selectedQueueIds, selectedTagIds, selectedWhatsappIds, selectedUserIds, tags]);

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
		if (tickets.length === 0 && pageNumber === 1 && loading) {
			return;
		}

		const queueIds = queues.map((q) => q.id);
		const filteredTickets = tickets.filter((t) => queueIds.indexOf(t.queueId) > -1 || !t.queueId);
		const allticket = user.allTicket === "enabled";
		const isAdmin = (profile || "").toUpperCase() === "ADMIN";
		const shouldShowAll = showAll || isAdmin || allticket;
		const ticketsToUse = shouldShowAll ? tickets : filteredTickets;

		console.log('[TicketsList] Cargando tickets:', {
			page: pageNumber,
			ticketsReceived: tickets.length,
			ticketsToUse: ticketsToUse.length,
			currentTotal: ticketsList.length,
			hasMore,
			status
		});

		dispatch({ 
			type: "LOAD_TICKETS", 
			payload: ticketsToUse,
			isReset: pageNumber === 1
		});
	}, [tickets, queues, profile, user.allTicket, showAll, pageNumber, loading]);

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

		const isAdmin = (profile || "").toUpperCase() === "ADMIN";

		const shouldUpdateTicket = (ticket) => {
			const statusMatch = !status || ticket.status === status;
			const queueMatch = !selectedQueueIds?.length || !ticket.queueId || selectedQueueIds.indexOf(ticket.queueId) > -1;
			const hasPermission = isAdmin || showAll || !ticket.userId || ticket.userId === user?.id;
			return statusMatch && queueMatch && hasPermission;
	};

	const handleTicket = (data) => {
		if (data.action === "updateUnread") {
			dispatch({ type: "RESET_UNREAD", payload: data.ticketId });
			return;
		}

		if (data.action === "create" && shouldUpdateTicket(data.ticket)) {
			dispatch({ type: "UPDATE_TICKET", payload: data.ticket, isNewTicket: true });
			return;
		}

		if (data.action === "update") {
			const shouldKeep = shouldUpdateTicket(data.ticket);
			if (shouldKeep) {
				dispatch({ type: "UPDATE_TICKET", payload: data.ticket, isNewTicket: false, shouldAdd: true });
			} else {
				dispatch({ type: "DELETE_TICKET", payload: data.ticket.id, status });
			}
			return;
		}

		if (data.action === "delete") {
			dispatch({ type: "DELETE_TICKET", payload: data.ticketId, status });
		}
	};

	socket.on("ticket", handleTicket);		let handleAppMessage;
		let handleContact;

		if (status) {
			handleAppMessage = (data) => {
				if (data.action === "create" && shouldUpdateTicket(data.ticket)) {
					dispatch({ type: "UPDATE_TICKET_UNREAD_MESSAGES", payload: data.ticket });
				}
			};
			socket.on("appMessage", handleAppMessage);

			handleContact = (data) => {
				if (data.action === "update") {
					dispatch({ type: "UPDATE_TICKET_CONTACT", payload: data.contact });
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
	}, [ticketsList.length, status, updateCount]);

	const handleScroll = useCallback((e) => {
		console.log('[TicketsList] handleScroll triggered - hasMore:', hasMore, 'loading:', loading);
		
		if (!hasMore || loading) {
			console.log('[TicketsList] Scroll ignorado - hasMore:', hasMore, 'loading:', loading);
			return;
		}
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		
		// Calcular cuánto falta para llegar al final
		const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
		
		// Cargar más cuando falten menos de 100px para llegar al final
		// O cuando el scroll esté al 85% o más
		const scrollPercentage = ((scrollTop + clientHeight) / scrollHeight) * 100;
		
		if (distanceFromBottom < 100 || scrollPercentage >= 85) {
			console.log('[TicketsList] Cargando más tickets - página:', pageNumber + 1, 'distancia del final:', distanceFromBottom + 'px', 'scroll:', scrollPercentage.toFixed(2) + '%');
			setPageNumber((prev) => prev + 1);
		}
	}, [hasMore, loading, pageNumber]);

	return (
		<Paper className={classes.ticketsListWrapper} style={style}>
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
				<div 
					className={classes.ticketsList}
					onScroll={handleScroll}
					ref={listRef}
				>
					{ticketsList.map((ticket) => (
						<TicketListItem
							key={ticket.id}
							ticket={ticket}
							handleChangeTab={handleChangeTab}
						/>
					))}
					{loading && <TicketsListSkeleton />}
				</div>
			)}
		</Paper>
	);
};

export default TicketsList;
