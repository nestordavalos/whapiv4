import React, {
	useState,
	useEffect,
	useReducer,
	useContext,
	useRef,
	useLayoutEffect,
	useCallback,
} from "react";
import openSocket from "../../services/socket-io";

import makeStyles from "@mui/styles/makeStyles";
import Paper from "@mui/material/Paper";
import { VariableSizeList as VirtualList } from "react-window";

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
		padding: "8px 0",
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
	if (action.type !== "LOAD_TICKETS") {
		console.log('[TicketsList Reducer - Socket]', {
			type: action.type,
			currentStateLength: state.length,
			payload: action.payload,
			timestamp: new Date().toISOString()
		});
	}

	if (action.type === "LOAD_TICKETS") {
		const newTickets = action.payload;
		
		// Si es un reset (cambio de filtro), reemplazar todo en lugar de vaciar primero
		if (action.isReset) {
			return newTickets;
		}
		
		// Paginación normal - agregar nuevos tickets
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
		const updatedState = [...state];

		const ticketIndex = updatedState.findIndex((t) => t.id === ticketId);
		if (ticketIndex !== -1) {
			updatedState[ticketIndex] = {
				...updatedState[ticketIndex],
				unreadMessages: 0
			};
		}

		return updatedState;
	}

	if (action.type === "UPDATE_TICKET") {
		const ticket = action.payload;
		const updatedState = [...state];

		const ticketIndex = updatedState.findIndex((t) => t.id === ticket.id);
		if (ticketIndex !== -1) {
			// Ticket ya existe - actualizar
			updatedState[ticketIndex] = ticket;
			
			// Si tiene mensajes no leídos, mover al principio
			if (ticket.unreadMessages > 0) {
				const [movedTicket] = updatedState.splice(ticketIndex, 1);
				updatedState.unshift(movedTicket);
			}
			
			return updatedState;
		}
		
		// Solo agregar al principio si viene de "create", no de "update"
		// Para evitar duplicados cuando un ticket cambia de status
		if (action.isNewTicket) {
			updatedState.unshift(ticket);
		}

		return updatedState;
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
		const ticketExists = state.find((t) => t.id === ticketId);
		console.log('[TicketsList Reducer] DELETE_TICKET:', {
			ticketId,
			existedInList: !!ticketExists,
			beforeLength: state.length,
			afterLength: state.filter((t) => t.id !== ticketId).length
		});
		return state.filter((t) => t.id !== ticketId);
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
	const wrapperRef = useRef(null);
	const itemSizeMap = useRef({});
	const [listHeight, setListHeight] = useState(0);
	const previousStatusRef = useRef(status);

	const getItemSize = useCallback((index) => {
		return itemSizeMap.current[index] || 148;
	}, []);

	const setItemSize = useCallback((index, size) => {
		if (itemSizeMap.current[index] !== size) {
			itemSizeMap.current[index] = size;
			// resetAfterIndex fuerza a recalcular alturas siguientes
			listRef.current?.resetAfterIndex(index);
		}
	}, []);

	useLayoutEffect(() => {
		const node = wrapperRef.current;
		if (!node) return;
		const updateHeight = () => {
			const measured = node.clientHeight || node.parentElement?.clientHeight || 0;
			setListHeight(measured > 0 ? measured : 480);
		};
		updateHeight();
		const resizeObserver = new ResizeObserver(updateHeight);
		resizeObserver.observe(node);
		return () => resizeObserver.disconnect();
	}, []);

	// Al cambiar filtros, solo resetear pageNumber (NO vaciar tickets)
	useEffect(() => {
		const statusChanged = previousStatusRef.current !== status;
		if (statusChanged) {
			console.log('[TicketsList] Status changed:', previousStatusRef.current, '->', status);
			previousStatusRef.current = status;
		}
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
		// Solo bloquear arrays vacíos durante carga inicial (pageNumber=1 + loading)
		// Permitir vacíos si hasMore=false (no hay más datos legítimamente)
		if (tickets.length === 0 && pageNumber === 1 && loading && ticketsList.length > 0) {
			console.log('[TicketsList] Skipping empty update during initial load, keeping current tickets visible');
			return;
		}

		const queueIds = queues.map((q) => q.id);
		const filteredTickets = tickets.filter((t) => queueIds.indexOf(t.queueId) > -1 || t.queueId === null || typeof t.queueId === "undefined");
		const allticket = user.allTicket === "enabled";
		const isAdmin = (profile || "").toUpperCase() === "ADMIN";
		const shouldShowAll = showAll || isAdmin || allticket;
		const ticketsToUse = shouldShowAll ? tickets : filteredTickets;

		console.log('[TicketsList Effect]', {
			tickets: tickets.length,
			pageNumber,
			status,
			currentList: ticketsList.length,
			hasMore,
			loading
		});

		// isReset = página 1 (reemplazar), paginación = agregar
		const isReset = pageNumber === 1;

		dispatch({ 
			type: "LOAD_TICKETS", 
			payload: ticketsToUse,
			isReset
		});
	}, [tickets, status, queues, profile, user.allTicket, showAll, pageNumber, hasMore, loading, ticketsList.length]);

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
			const statusMatch = !status || ticket.status === status;
			
			// Queue filter
			const queueMatch = matchesQueueFilter(ticket);
			
			// Admin or showAll can see all tickets
			const hasPermission = isAdmin || showAll || !ticket.userId || ticket.userId === user?.id;
			
			const shouldUpdate = statusMatch && queueMatch && hasPermission;
			
			console.log('[TicketsList shouldUpdateTicket]', {
				ticketId: ticket.id,
				ticketStatus: ticket.status,
				currentStatus: status,
				statusMatch,
				queueMatch,
				hasPermission,
				shouldUpdate
			});
			
			return shouldUpdate;
		};

		const handleTicket = (data) => {
			console.log('[TicketsList Socket] ticket event:', {
				action: data.action,
				ticketId: data.ticket?.id || data.ticketId,
				ticketStatus: data.ticket?.status,
				currentTabStatus: status,
				userId: data.ticket?.userId
			});

			if (data.action === "updateUnread") {
				dispatch({
					type: "RESET_UNREAD",
					payload: data.ticketId,
				});
				return;
			}

			if (data.action === "create" && shouldUpdateTicket(data.ticket)) {
				console.log('[TicketsList Socket] Adding new ticket');
				dispatch({
					type: "UPDATE_TICKET",
					payload: data.ticket,
					isNewTicket: true, // Marcar como nuevo para que se agregue
				});
				return;
			}

			if (data.action === "update") {
				const shouldKeep = shouldUpdateTicket(data.ticket);
				console.log('[TicketsList Socket] Update decision:', {
					ticketId: data.ticket.id,
					shouldKeep,
					ticketStatus: data.ticket.status,
					tabStatus: status
				});
				
				if (shouldKeep) {
					console.log('[TicketsList Socket] → Updating existing ticket');
					dispatch({
						type: "UPDATE_TICKET",
						payload: data.ticket,
						isNewTicket: false,
					});
				} else {
					console.log('[TicketsList Socket] → DELETING ticket (status mismatch)');
					dispatch({ type: "DELETE_TICKET", payload: data.ticket.id });
				}
				return;
			}

			if (data.action === "delete") {
				console.log('[TicketsList Socket] Deleting ticket');
				dispatch({ type: "DELETE_TICKET", payload: data.ticketId });
			}
		};
		socket.on("ticket", handleTicket);

		let handleAppMessage;
		let handleContact;

		if (status) {
			handleAppMessage = (data) => {
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
		
		// Forzar re-render de react-window cuando cambia la cantidad de tickets
		// Esto asegura que los DELETE se reflejen visualmente
		if (listRef.current) {
			listRef.current.resetAfterIndex(0, false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ticketsList.length]);

	// Reiniciar cache de alturas cuando cambian filtros relevantes
	useEffect(() => {
		itemSizeMap.current = {};
		listRef.current?.resetAfterIndex(0, true);
	}, [status, searchParam, showAll, selectedQueueIds, selectedTagIds, selectedWhatsappIds, selectedUserIds, tags]);

	const loadMore = useCallback(() => {
		if (!loading && hasMore) {
			console.log('[TicketsList] Loading page:', pageNumber + 1);
			setPageNumber((prev) => prev + 1);
		}
	}, [loading, hasMore, pageNumber]);

	const handleItemsRendered = useCallback(
		({ visibleStopIndex }) => {
			// Cargar más cuando estamos a 20 items del final (más anticipado)
			if (hasMore && !loading && visibleStopIndex >= ticketsList.length - 20) {
				loadMore();
			}
		},
		[hasMore, loading, ticketsList.length, loadMore],
	);

	const Row = ({ index, style, data }) => {
		const { ticketsList: list, handleChangeTab: onChangeTab, setItemSize: setSize } = data;
		const ticket = list[index];
		const rowRef = useRef(null);

		useLayoutEffect(() => {
			const node = rowRef.current;
			if (!node) return;

			const measure = () => {
				const size = node.getBoundingClientRect().height;
				if (size) setSize(index, size);
			};

			measure();

			if (typeof ResizeObserver !== "undefined") {
				const resizeObserver = new ResizeObserver(measure);
				resizeObserver.observe(node);
				return () => resizeObserver.disconnect();
			}
		}, [index, setSize, ticket]);

		return (
			<div style={style} role="listitem">
				<div ref={rowRef} style={{ paddingLeft: '8px', paddingRight: '8px', paddingBottom: '5px', paddingTop: '6px' }}>
					<TicketListItem handleChangeTab={onChangeTab} ticket={ticket} key={ticket.id} />
				</div>
			</div>
		);
	};

	const InnerElement = React.forwardRef(function TicketsListInner(innerProps, innerRef) {
		const { style, ...rest } = innerProps;
		return (
			<div
				ref={innerRef}
				style={style}
				{...rest}
			/>
		);
	});

	const OuterElement = React.forwardRef(function TicketsListOuter(outerProps, outerRef) {
		const { style, ...rest } = outerProps;
		return (
			<div
				ref={outerRef}
				{...rest}
				className={classes.ticketsList}
				style={{ ...style }}
				role="list"
			/>
		);
	});

	return (
		<Paper className={classes.ticketsListWrapper} style={style} ref={wrapperRef}>
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
				listHeight > 0 && (
					<VirtualList
						height={listHeight}
						width="100%"
						itemCount={ticketsList.length}
						itemSize={getItemSize}
						itemData={{
							ticketsList,
							handleChangeTab,
							setItemSize,
						}}
						itemKey={(index) => ticketsList[index]?.id ?? index}
						onItemsRendered={handleItemsRendered}
						ref={listRef}
						outerElementType={OuterElement}
						innerElementType={InnerElement}
					>
						{Row}
					</VirtualList>
				)
			)}
			{loading && ticketsList.length === 0 && (
				<TicketsListSkeleton />
			)}
		</Paper>
	);
};

export default TicketsList;
