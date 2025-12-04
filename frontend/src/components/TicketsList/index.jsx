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
	const listRef = useRef(null);
	const wrapperRef = useRef(null);
	const itemSizeMap = useRef({});
	const [listHeight, setListHeight] = useState(0);

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
		const filteredTickets = tickets.filter((t) => queueIds.indexOf(t.queueId) > -1 || t.queueId === null || typeof t.queueId === "undefined");
		const allticket = user.allTicket === "enabled";
		const isAdmin = (profile || "").toUpperCase() === "ADMIN";
		const shouldShowAll = showAll || isAdmin || allticket;

		// Função para identificação liberação da settings
		if (shouldShowAll) {
			dispatch({ type: "LOAD_TICKETS", payload: tickets });
		} else {
			dispatch({ type: "LOAD_TICKETS", payload: filteredTickets });
		}
	}, [tickets, status, searchParam, queues, profile, user.allTicket, showAll]);

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
				shouldUpdate: data.ticket ? shouldUpdateTicket(data.ticket) : "N/A",
				isAdmin,
				showAll,
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

	// Reiniciar cache de alturas cuando cambian filtros relevantes
	useEffect(() => {
		itemSizeMap.current = {};
		listRef.current?.resetAfterIndex(0, true);
	}, [status, searchParam, showAll, selectedQueueIds, selectedTagIds, selectedWhatsappIds, selectedUserIds, tags]);

	const loadMore = () => {
		setPageNumber((prevState) => prevState + 1);
	};

	const handleItemsRendered = useCallback(
		({ visibleStopIndex }) => {
			if (!hasMore || loading) return;
			if (visibleStopIndex >= ticketsList.length - 5) {
				loadMore();
			}
		},
		[hasMore, loading, ticketsList.length],
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
			{loading && (
				<div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "flex-end" }}>
					<TicketsListSkeleton />
				</div>
			)}
		</Paper>
	);
};

export default TicketsList;
