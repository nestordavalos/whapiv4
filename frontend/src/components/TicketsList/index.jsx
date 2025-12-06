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
import api from "../../services/api";

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
	console.log('[TicketsList Reducer]', {
		type: action.type,
		currentStateLength: state.length,
		payloadLength: Array.isArray(action.payload) ? action.payload.length : 'N/A',
		isReset: action.isReset,
		timestamp: new Date().toISOString()
	});

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
			updatedState[ticketIndex] = ticket;
		} else {
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
	const previousTicketsCount = useRef(0);
	const prefetchCacheRef = useRef({});
	const usingCacheRef = useRef(false); // Flag para indicar que estamos mostrando datos del cache

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

	// Ref para detectar cambios en filtros y forzar carga limpia
	const previousStatusRef = useRef(status);
	const previousSearchRef = useRef(searchParam);
	const isInitialMount = useRef(true);
	
	useEffect(() => {
		const statusChanged = previousStatusRef.current !== status;
		const searchChanged = previousSearchRef.current !== searchParam;
		
		if (!isInitialMount.current && (statusChanged || searchChanged)) {
			console.log('[TicketsList] Filter changed:', { 
				from: previousStatusRef.current, 
				to: status,
				searchChanged 
			});
			
			// Intentar cargar desde cache primero
			const cacheKey = `${status || 'all'}-${searchParam || ''}`;
			const cachedTickets = prefetchCacheRef.current[cacheKey];
			
			if (cachedTickets && cachedTickets.length > 0) {
				console.log('[TicketsList] Loading from cache IMMEDIATELY:', cachedTickets.length);
				usingCacheRef.current = true; // Marcar que estamos usando cache
				dispatch({ 
					type: "LOAD_TICKETS", 
					payload: cachedTickets,
					isReset: true 
				});
			} else {
				// Si no hay cache, permitir que se vacíe (pero mostrar skeleton)
				usingCacheRef.current = false;
			}
		}
		
		previousStatusRef.current = status;
		previousSearchRef.current = searchParam;
		isInitialMount.current = false;
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
		// PROTECCIÓN CRÍTICA: Si estamos usando cache y tickets aún está vacío, NO sobrescribir
		if (usingCacheRef.current && tickets.length === 0 && loading) {
			console.log('[TicketsList Effect] Using cache, waiting for fresh data...');
			return;
		}

		// Si llegan datos reales, desactivar flag de cache
		if (usingCacheRef.current && tickets.length > 0) {
			console.log('[TicketsList Effect] Fresh data arrived, replacing cache');
			usingCacheRef.current = false;
		}

		const queueIds = queues.map((q) => q.id);
		const filteredTickets = tickets.filter((t) => queueIds.indexOf(t.queueId) > -1 || t.queueId === null || typeof t.queueId === "undefined");
		const allticket = user.allTicket === "enabled";
		const isAdmin = (profile || "").toUpperCase() === "ADMIN";
		const shouldShowAll = showAll || isAdmin || allticket;

		console.log('[TicketsList Effect]', {
			tickets: tickets.length,
			filteredTickets: filteredTickets.length,
			shouldShowAll,
			pageNumber,
			hasMore,
			loading,
			status,
			currentListLength: ticketsList.length,
			timestamp: new Date().toISOString()
		});

		const ticketsToUse = shouldShowAll ? tickets : filteredTickets;
		
		// Guardar en prefetch cache si es página 1
		if (pageNumber === 1 && ticketsToUse.length > 0) {
			const cacheKey = `${status || 'all'}-${searchParam || ''}`;
			prefetchCacheRef.current[cacheKey] = ticketsToUse;
		}

		// Determinar si es reset (página 1 con datos nuevos) o paginación
		const isFirstPage = pageNumber === 1;
		const isReset = isFirstPage;

		// Guardar el conteo anterior antes de actualizar (solo para paginación)
		const previousCount = previousTicketsCount.current;

		dispatch({ 
			type: "LOAD_TICKETS", 
			payload: ticketsToUse,
			isReset // Si es reset, reemplaza todo; si no, agrega
		});

		// Si es paginación (no reset), mantener posición de scroll suavemente
		if (!isReset && pageNumber > 1 && previousCount > 0 && ticketsToUse.length > 0) {
			// Pequeño delay para que react-window procese los nuevos items
			setTimeout(() => {
				if (listRef.current && ticketsList.length > previousCount) {
					// Mantener scroll cerca de donde estábamos (8 items antes del threshold)
					const targetIndex = Math.max(0, previousCount - 12);
					listRef.current.scrollToItem(targetIndex, "start");
				}
			}, 30);
		}

		// Actualizar el conteo anterior
		if (!isReset) {
			previousTicketsCount.current = ticketsList.length;
		}
	}, [tickets, status, searchParam, queues, profile, user.allTicket, showAll, pageNumber, hasMore, loading, ticketsList.length]);

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

	// Prefetch: Precargar primera página de otros tabs en background
	useEffect(() => {
		if (loading || !status) return;

		const prefetchOtherTabs = async () => {
			const tabsToPrefetch = ['open', 'pending', 'closed'].filter(s => s !== status);
			
			for (const tabStatus of tabsToPrefetch) {
				const cacheKey = `${tabStatus}-${searchParam || ''}`;
				
				// Solo precargar si no está en cache
				if (!prefetchCacheRef.current[cacheKey]) {
					try {
						const params = {
							searchParam,
							pageNumber: 1,
							status: tabStatus,
							showAll,
							queueIds: JSON.stringify(selectedQueueIds || []),
						};

						if (selectedTagIds && selectedTagIds.length > 0) {
							params.tags = JSON.stringify(selectedTagIds);
						}
						if (selectedWhatsappIds && selectedWhatsappIds.length > 0) {
							params.whatsappIds = JSON.stringify(selectedWhatsappIds);
						}
						if (selectedUserIds && selectedUserIds.length > 0) {
							params.userIds = JSON.stringify(selectedUserIds);
						}

						const { data } = await api.get("/tickets", { params });
						prefetchCacheRef.current[cacheKey] = data.tickets;
						console.log(`[TicketsList Prefetch] Cached ${tabStatus}:`, data.tickets.length);
					} catch (err) {
						console.error(`[TicketsList Prefetch] Error prefetching ${tabStatus}:`, err.message);
					}
				}
			}
		};

		// Delay de 800ms para no interferir con carga principal
		const prefetchTimer = setTimeout(prefetchOtherTabs, 800);
		return () => clearTimeout(prefetchTimer);
	}, [loading, status, searchParam, showAll, selectedQueueIds, selectedTagIds, selectedWhatsappIds, selectedUserIds]);

	// Reiniciar cache de alturas cuando cambian filtros relevantes
	useEffect(() => {
		itemSizeMap.current = {};
		listRef.current?.resetAfterIndex(0, true);
	}, [status, searchParam, showAll, selectedQueueIds, selectedTagIds, selectedWhatsappIds, selectedUserIds, tags]);

	const loadMore = useCallback(() => {
		console.log('[TicketsList loadMore]', {
			loading,
			hasMore,
			currentPage: pageNumber,
			ticketCount: ticketsList.length,
			timestamp: new Date().toISOString()
		});

		if (!loading && hasMore) {
			setPageNumber((prevState) => {
				console.log('[TicketsList] Incrementing page:', prevState, '->', prevState + 1);
				return prevState + 1;
			});
		} else {
			console.log('[TicketsList] loadMore blocked:', { loading, hasMore });
		}
	}, [loading, hasMore, pageNumber, ticketsList.length]);

	const handleItemsRendered = useCallback(
		({ visibleStopIndex }) => {
			console.log('[TicketsList handleItemsRendered]', {
				visibleStopIndex,
				ticketListLength: ticketsList.length,
				threshold: ticketsList.length - 10,
				shouldLoad: visibleStopIndex >= ticketsList.length - 10,
				hasMore,
				loading,
				timestamp: new Date().toISOString()
			});

			if (!hasMore || loading) {
				console.log('[TicketsList] Scroll load blocked:', { hasMore, loading });
				return;
			}
			// Cargar más cuando estamos cerca del final (10 items antes)
			if (visibleStopIndex >= ticketsList.length - 10) {
				console.log('[TicketsList] Triggering loadMore from scroll');
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
			{loading && pageNumber === 1 && ticketsList.length === 0 && (
				<div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.7)", zIndex: 10 }}>
					<TicketsListSkeleton />
				</div>
			)}
		</Paper>
	);
};

export default TicketsList;
