import React, { useState, useCallback, useContext, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";

import makeStyles from '@mui/styles/makeStyles';
import { green } from "@mui/material/colors";
import {
	Button,
	IconButton,
	Paper,
	Tooltip,
	Typography,
	CircularProgress,
	Box,
	Menu,
	MenuItem,
	ListItemIcon,
	ListItemText,
	LinearProgress,
} from "@mui/material";
import {
	Edit,
	SignalCellularConnectedNoInternet2Bar,
	SignalCellularConnectedNoInternet0Bar,
	SignalCellular4Bar,
	CropFree,
	DeleteOutline,
	SyncOutlined,
	WhatsApp,
	Replay,
	Phone,
	Schedule,
	CloudDownload,
	History,
	MailOutline,
	ErrorOutline,
	ForumOutlined,
	AccountCircleOutlined,
} from "@mui/icons-material";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import openSocket from "../../services/socket-io";

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(2),
		margin: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
		borderRadius: 8,
		backgroundColor: "transparent",
		border: "none",
	},
	connectionsGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
		gap: theme.spacing(2),
	},
	connectionCard: {
		padding: theme.spacing(2.5),
		border: `1px solid ${theme.palette.divider}`,
		borderRadius: 12,
		backgroundColor: theme.palette.background.paper,
		boxShadow: theme.palette.mode === "dark" 
			? "0 2px 4px rgba(0,0,0,0.3)" 
			: "0 2px 4px rgba(0,0,0,0.05)",
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
		transition: "all 0.3s ease",
		position: "relative",
		"&:hover": {
			boxShadow: theme.palette.mode === "dark" 
				? "0 4px 12px rgba(0,0,0,0.5)" 
				: "0 4px 12px rgba(0,0,0,0.1)",
			transform: "translateY(-2px)",
		},
	},
	connectionInfo: {
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1.5),
		flex: 1,
	},
	connectionHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: theme.spacing(1),
	},
	connectionTitle: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		flex: 1,
	},
	connectionName: {
		fontWeight: 600,
		fontSize: "1.125rem",
		color: theme.palette.text.primary,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	connectionId: {
		fontSize: "0.7rem",
		color: theme.palette.text.secondary,
		backgroundColor: theme.palette.action.hover,
		padding: "2px 6px",
		borderRadius: 8,
		fontWeight: 500,
	},
	connectionDetails: {
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1),
		paddingTop: theme.spacing(1),
		borderTop: `1px solid ${theme.palette.divider}`,
	},
	detailItem: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		fontSize: "0.875rem",
		color: theme.palette.text.secondary,
	},
	detailIcon: {
		fontSize: "1.125rem",
		color: theme.palette.action.active,
	},
	detailLabel: {
		fontWeight: 500,
		minWidth: 70,
		color: theme.palette.text.secondary,
	},
	detailValue: {
		color: theme.palette.text.primary,
	},
	statusChip: {
		display: "inline-flex",
		alignItems: "center",
		gap: theme.spacing(0.5),
		padding: "6px 12px",
		borderRadius: 20,
		fontSize: "0.75rem",
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: "0.5px",
	},
	statusConnected: {
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(76, 175, 80, 0.2)" 
			: "rgba(76, 175, 80, 0.1)",
		color: green[theme.palette.mode === "dark" ? 400 : 700],
	},
	statusDisconnected: {
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(244, 67, 54, 0.2)" 
			: "rgba(244, 67, 54, 0.1)",
		color: theme.palette.mode === "dark" ? "#ef5350" : "#d32f2f",
	},
	statusOpening: {
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(33, 150, 243, 0.2)" 
			: "rgba(33, 150, 243, 0.1)",
		color: theme.palette.mode === "dark" ? "#42a5f5" : "#1976d2",
	},
	statusQrcode: {
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(255, 152, 0, 0.2)" 
			: "rgba(255, 152, 0, 0.1)",
		color: theme.palette.mode === "dark" ? "#ffb74d" : "#f57c00",
	},
	statusRestricted: {
		backgroundColor: theme.palette.mode === "dark"
			? "rgba(211, 47, 47, 0.28)"
			: "rgba(211, 47, 47, 0.12)",
		color: theme.palette.mode === "dark" ? "#ff8a80" : "#b71c1c",
	},
	reasonBox: {
		display: "flex",
		alignItems: "flex-start",
		gap: theme.spacing(1),
		padding: theme.spacing(1),
		borderRadius: 8,
		backgroundColor: theme.palette.mode === "dark"
			? "rgba(211, 47, 47, 0.14)"
			: "rgba(211, 47, 47, 0.06)",
		color: theme.palette.mode === "dark" ? "#ffab91" : "#b71c1c",
		fontSize: "0.8rem",
	},
	zapoHealthBox: {
		padding: theme.spacing(1.25),
		borderRadius: 10,
		border: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.action.hover,
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(0.75),
	},
	zapoHealthHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		fontSize: "0.78rem",
		fontWeight: 600,
	},
	zapoHealthTitle: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(0.75),
	},
	zapoHealthNumbers: {
		display: "flex",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		fontSize: "0.76rem",
		color: theme.palette.text.secondary,
	},
	zapoHealthHistory: {
		display: "flex",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		paddingTop: theme.spacing(0.5),
		borderTop: `1px solid ${theme.palette.divider}`,
		fontSize: "0.72rem",
		color: theme.palette.text.secondary,
	},
	zapoPauseNotice: {
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(0.5),
		padding: theme.spacing(1, 1.25),
		borderRadius: 8,
		border: `1px solid ${
			theme.palette.mode === "dark"
				? "rgba(239, 154, 154, 0.5)"
				: "rgba(211, 47, 47, 0.28)"
		}`,
		backgroundColor:
			theme.palette.mode === "dark"
				? "rgba(211, 47, 47, 0.16)"
				: "rgba(211, 47, 47, 0.07)",
		color: theme.palette.mode === "dark" ? "#ef9a9a" : "#b71c1c",
		fontSize: "0.82rem",
	},
	zapoPauseRemaining: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(0.5),
		fontSize: "1rem",
		fontWeight: 700,
		lineHeight: 1.25,
	},
	zapoPauseEnd: {
		paddingLeft: theme.spacing(2.5),
		fontSize: "0.8rem",
		fontWeight: 500,
	},
	zapoHealthMeta: {
		fontSize: "0.7rem",
		color: theme.palette.text.secondary,
	},
	zapoHealthHealthy: {
		color: theme.palette.mode === "dark" ? "#81c784" : "#2e7d32",
	},
	zapoHealthWarning: {
		color: theme.palette.mode === "dark" ? "#ffb74d" : "#ed6c02",
	},
	zapoHealthDanger: {
		color: theme.palette.mode === "dark" ? "#ef9a9a" : "#d32f2f",
	},
	zapoHealthNeutral: {
		color: theme.palette.text.secondary,
	},
	connectionActions: {
		display: "flex",
		gap: theme.spacing(1),
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: theme.spacing(1),
		flexWrap: "nowrap",
		[theme.breakpoints.down('sm')]: {
			flexWrap: "wrap",
			gap: theme.spacing(0.5),
		},
	},
	actionButtons: {
		display: "flex",
		gap: theme.spacing(1),
		flex: 1,
		minWidth: 0,
		[theme.breakpoints.down('sm')]: {
			flexWrap: "wrap",
			gap: theme.spacing(0.5),
		},
	},
	actionButton: {
		minWidth: 0,
		padding: "6px 12px",
		textTransform: "none",
		fontSize: "0.75rem",
		borderRadius: 8,
		flex: "1 1 0",
		whiteSpace: "nowrap",
	},
	iconButtons: {
		display: "flex",
		gap: theme.spacing(0.5),
		flexShrink: 0,
	},
	iconButton: {
		padding: 6,
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
	},
	defaultBadge: {
		backgroundColor: theme.palette.primary.main,
		color: "white",
		padding: "3px 10px",
		borderRadius: 10,
		fontSize: "0.65rem",
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: "0.5px",
	},
	customTableCell: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	tooltip: {
		backgroundColor: theme.palette.background.paper,
		color: theme.palette.text.primary,
		fontSize: theme.typography.pxToRem(14),
		border: `1px solid ${theme.palette.divider}`,
		maxWidth: 450,
	},
	tooltipPopper: {
		textAlign: "center",
	},
	buttonProgress: {
		color: green[500],
	},
	emptyState: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		padding: theme.spacing(8, 2),
		color: theme.palette.text.secondary,
	},
	headerButton: {
		borderRadius: 8,
		minWidth: 40,
		height: 40,
		boxShadow: theme.palette.mode === "dark" 
			? "0 2px 8px rgba(0, 113, 193, 0.4)" 
			: "0 2px 8px rgba(25, 118, 210, 0.25)",
		transition: "all 0.2s ease",
		"&:hover": {
			transform: "translateY(-2px)",
			boxShadow: theme.palette.mode === "dark" 
				? "0 4px 12px rgba(0, 113, 193, 0.5)" 
				: "0 4px 12px rgba(25, 118, 210, 0.35)",
		},
	},
}));

const CustomToolTip = ({ title, content, children }) => {
	const classes = useStyles();

	return (
		<Tooltip
			arrow
			classes={{
				tooltip: classes.tooltip,
				popper: classes.tooltipPopper,
			}}
			title={
				<React.Fragment>
					<Typography gutterBottom color="inherit">
						{title}
					</Typography>
					{content && <Typography>{content}</Typography>}
				</React.Fragment>
			}
		>
			{children}
		</Tooltip>
	);
};

const RESET_REQUIRED_REASONS = new Set([
	"failure_banned",
	"failure_locked",
	"failure_not_authorized",
	"stream_error_device_removed",
	"stream_error_force_logout",
]);

const requiresFullZapoReset = whatsApp =>
	whatsApp.provider === "zapo" &&
	(whatsApp.status === "BANNED" ||
		RESET_REQUIRED_REASONS.has(whatsApp.disconnectReason));

const getStatusLabel = status =>
	i18n.t(`connections.status.${status}`, { defaultValue: status });

const getDisconnectReasonLabel = whatsApp => {
	const reason = whatsApp.disconnectReason || "unknown";
	const label = i18n.t(`connections.disconnectReasons.${reason}`, {
		defaultValue: reason,
	});
	return whatsApp.disconnectCode ? `${label} (${whatsApp.disconnectCode})` : label;
};

const asDate = value => {
	if (!Number.isFinite(value) || value <= 0) return null;
	const milliseconds = value < 1e12 ? value * 1000 : value;
	const date = new Date(milliseconds);
	return Number.isNaN(date.getTime()) ? null : date;
};

const formatRemainingTime = (deadline, nowMs = Date.now()) => {
	const remainingSeconds = Math.ceil((deadline.getTime() - nowMs) / 1000);
	if (remainingSeconds <= 0) return null;

	const days = Math.floor(remainingSeconds / 86400);
	const hours = Math.floor((remainingSeconds % 86400) / 3600);
	const minutes = Math.floor((remainingSeconds % 3600) / 60);
	const seconds = remainingSeconds % 60;
	if (days > 0) return `${days} d ${hours} h ${minutes} min ${seconds} s`;
	if (hours > 0) return `${hours} h ${minutes} min ${seconds} s`;
	if (minutes > 0) return `${minutes} min ${seconds} s`;
	return `${seconds} s`;
};

const getZapoAccountType = health =>
	health?.accountInfo?.type === "business"
		? "business"
		: "personal";

const getZapoHealthPresentation = health => {
	const capping = health?.messageCapping;
	const rawTotal = capping?.totalQuota;
	const used = capping?.usedQuota;
	const configuredLimit =
		health?.messageCappingConfig?.enabled &&
		Number.isFinite(health?.messageCappingConfig?.limit) &&
		health.messageCappingConfig.limit > 0
			? health.messageCappingConfig.limit
			: null;
	const isPersonalAccount = getZapoAccountType(health) === "personal";
	const total =
		Number.isFinite(rawTotal) && rawTotal >= 0
			? rawTotal
			: configuredLimit;
	const usesConfiguredLimit =
		!Number.isFinite(rawTotal) || rawTotal < 0
			? Number.isFinite(configuredLimit)
			: false;
	const quotaNotReported =
		(!Number.isFinite(rawTotal) || rawTotal < 0) &&
		!Number.isFinite(configuredLimit);
	const hasFiniteQuota = Number.isFinite(total) && total > 0;
	const percentage =
		hasFiniteQuota && Number.isFinite(used)
			? Math.min(100, Math.max(0, Math.round((used / total) * 100)))
			: 0;
	const status = capping?.cappingStatus;
	const hasCapping = Boolean(capping);
	const hasReportedStatus =
		typeof status === "string" && status.trim().length > 0;
	const isDanger =
		health?.reachoutTimelock?.isActive ||
		status === "CAPPED" ||
		status === "SECOND_WARNING" ||
		percentage >= 90;
	const isWarning =
		!isDanger &&
		(status === "FIRST_WARNING" || percentage >= 70);
	const isHealthy =
		!isDanger &&
		!isWarning &&
		hasReportedStatus &&
		status === "NONE";

	return {
		total,
		used,
		remaining:
			hasFiniteQuota && Number.isFinite(used)
				? Math.max(0, total - used)
				: null,
		quotaNotReported,
		usesConfiguredLimit,
		cappingConfigured: health?.messageCappingConfig?.enabled ?? null,
		isPersonalAccount,
		hasFiniteQuota,
		isPaused: Boolean(health?.reachoutTimelock?.isActive),
		percentage,
		tone: isDanger
			? "danger"
			: isWarning
			? "warning"
			: isHealthy
			? "healthy"
			: "neutral",
		label: health?.reachoutTimelock?.isActive
			? "paused"
			: !hasCapping
			? "unknown"
			: status === "CAPPED"
			? "capped"
			: isDanger
			? "risk"
			: isWarning
			? "warning"
			: isHealthy
			? "healthy"
			: "unknown",
		cycleEnd: asDate(capping?.cycleEndAt),
		enforcementEnd: health?.reachoutTimelock?.isActive
			? asDate(health.reachoutTimelock.enforcementEndsAt)
			: null,
	};
};

const ZapoPauseNotice = ({ deadline, classes }) => {
	const [nowMs, setNowMs] = useState(Date.now());

	useEffect(() => {
		if (!deadline) return undefined;
		setNowMs(Date.now());
		const interval = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(interval);
	}, [deadline]);

	const remaining = deadline
		? formatRemainingTime(deadline, nowMs)
		: null;
	const remainingText = deadline
		? remaining
			? `${i18n.t("connections.zapoHealth.pauseRemaining")} ${remaining}`
			: i18n.t("connections.zapoHealth.awaitingRefresh")
		: i18n.t("connections.zapoHealth.pausedNoEnd");
	const formattedEnd = deadline ? format(deadline, "dd/MM HH:mm:ss") : null;
	const endText = deadline
		? `${i18n.t("connections.zapoHealth.pausedUntil")} ${formattedEnd}`
		: null;

	return (
		<Box className={classes.zapoPauseNotice}>
			<Box className={classes.zapoPauseRemaining}>
				<Schedule style={{ fontSize: "0.95rem" }} />
				{remainingText}
			</Box>
			{endText && <span className={classes.zapoPauseEnd}>{endText}</span>}
		</Box>
	);
};

const Connections = () => {
	const classes = useStyles();

	const { whatsApps, loading } = useContext(WhatsAppsContext);
	const [zapoHealthById, setZapoHealthById] = useState({});
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const [restartingId, setRestartingId] = useState(null);
	const [reusingId, setReusingId] = useState(null);
	const [syncingId, setSyncingId] = useState(null);
	const [syncMenuAnchor, setSyncMenuAnchor] = useState(null);
	const [syncMenuWhatsAppId, setSyncMenuWhatsAppId] = useState(null);
	const connectedZapoIds = useMemo(
		() =>
			whatsApps
				.filter(item => item.provider === "zapo" && item.status === "CONNECTED")
				.map(item => item.id),
		[whatsApps]
	);
	const connectedZapoIdsKey = connectedZapoIds.join(",");

	useEffect(() => {
		if (!connectedZapoIdsKey) return undefined;
		let active = true;

		const refreshHealth = async () => {
			const results = await Promise.allSettled(
				connectedZapoIds.map(id => api.get(`/whatsapp/${id}/zapo-health`))
			);
			if (!active) return;
			setZapoHealthById(current => {
				const next = { ...current };
				results.forEach((result, index) => {
					if (result.status === "fulfilled") {
						next[connectedZapoIds[index]] = result.value.data;
					}
				});
				return next;
			});
		};

		refreshHealth();
		const interval = setInterval(refreshHealth, 5 * 60 * 1000);
		return () => {
			active = false;
			clearInterval(interval);
		};
		// The key intentionally controls refreshes only when the connected set changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connectedZapoIdsKey]);

	useEffect(() => {
		const socket = openSocket();
		if (!socket) return undefined;
		const handleZapoHealth = health => {
			if (!health?.whatsappId) return;
			setZapoHealthById(current => ({
				...current,
				[health.whatsappId]: health,
			}));
		};
		socket.on("zapoHealth", handleZapoHealth);
		return () => socket.off("zapoHealth", handleZapoHealth);
	}, []);
	const confirmationModalInitialState = {
		action: "",
		title: "",
		message: "",
		whatsAppId: "",
		open: false,
	};
	const [confirmModalInfo, setConfirmModalInfo] = useState(
		confirmationModalInitialState
	);

	const handleStartWhatsAppSession = async whatsAppId => {
		try {
			await api.post(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleRequestNewQrCode = async whatsAppId => {
		try {
			await api.put(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleRestartSession = async whatsAppId => {
		let toastId;
		try {
			setRestartingId(whatsAppId);
			
			toastId = toast.info("Reiniciando sesión de WhatsApp...", {
				autoClose: false,
				closeButton: false,
			});
			
			await api.post(`/whatsapp/${whatsAppId}/restart`);
			
			if (toastId) {
				toast.dismiss(toastId);
			}
			toast.success(i18n.t("connections.toasts.restarted"));
		} catch (err) {
			if (toastId) {
				toast.dismiss(toastId);
			}
			toastError(err);
		} finally {
			setRestartingId(null);
		}
	};

	const handleSyncMessages = async (whatsAppId, mode = "unread") => {
		let toastId;
		try {
			setSyncingId(whatsAppId);
			
			const modeLabel = mode === "all" 
				? i18n.t("connections.toasts.syncingAll") 
				: i18n.t("connections.toasts.syncing");
			
			toastId = toast.info(modeLabel, {
				autoClose: false,
				closeButton: false,
			});
			
			const { data } = await api.post(`/whatsappsession/${whatsAppId}/sync?mode=${mode}`);
			
			if (toastId) {
				toast.dismiss(toastId);
			}
			
			const { result } = data;
			if (typeof result.requestedChats === "number") {
				toast.success(
					`Se solicitó el historial de ${result.requestedChats} chats. Los mensajes y archivos se importarán en segundo plano.`
				);
			} else {
				toast.success(
					i18n.t("connections.toasts.syncSuccess", {
						chats: result.chatsProcessed,
						newMessages: result.messagesNew,
						duplicates: result.messagesDuplicate,
						mode: result.mode === "all" ? "todos" : "no leídos",
					})
				);
			}
		} catch (err) {
			if (toastId) {
				toast.dismiss(toastId);
			}
			toastError(err);
		} finally {
			setSyncingId(null);
		}
	};

	const handleOpenSyncMenu = (event, whatsAppId) => {
		setSyncMenuAnchor(event.currentTarget);
		setSyncMenuWhatsAppId(whatsAppId);
	};

	const handleCloseSyncMenu = () => {
		setSyncMenuAnchor(null);
		setSyncMenuWhatsAppId(null);
	};

	const handleSyncMenuOption = (mode) => {
		if (syncMenuWhatsAppId) {
			handleSyncMessages(syncMenuWhatsAppId, mode);
		}
		handleCloseSyncMenu();
	};

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, [setSelectedWhatsApp, setWhatsAppModalOpen]);

	const handleOpenQrModal = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setQrModalOpen(true);
	};

	const handleCloseQrModal = useCallback(() => {
		setSelectedWhatsApp(null);
		setQrModalOpen(false);
	}, [setQrModalOpen, setSelectedWhatsApp]);

	const handleEditWhatsApp = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setWhatsAppModalOpen(true);
	};

	const handleOpenConfirmationModal = (action, whatsAppId) => {
		if (action === "disconnect") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.disconnectTitle"),
				message: i18n.t("connections.confirmationModal.disconnectMessage"),
				whatsAppId: whatsAppId,
			});
		}

		if (action === "delete") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.deleteTitle"),
				message: i18n.t("connections.confirmationModal.deleteMessage"),
				whatsAppId: whatsAppId,
			});
		}

		if (action === "reuse") {
			setConfirmModalInfo({
				action,
				title: i18n.t("connections.confirmationModal.reuseTitle"),
				message: i18n.t("connections.confirmationModal.reuseMessage"),
				whatsAppId,
			});
		}
		setConfirmModalOpen(true);
	};

	const handleSubmitConfirmationModal = async () => {
		if (confirmModalInfo.action === "disconnect") {
			try {
				await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
			} catch (err) {
				toastError(err);
			}
		}

		if (confirmModalInfo.action === "delete") {
			try {
				await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
				toast.success(i18n.t("connections.toasts.deleted"));
			} catch (err) {
				toastError(err);
			}
		}

		if (confirmModalInfo.action === "reuse") {
			try {
				setReusingId(confirmModalInfo.whatsAppId);
				const target = whatsApps.find(
					item => item.id === confirmModalInfo.whatsAppId
				);
				await api.post(
					`/whatsappsession/${confirmModalInfo.whatsAppId}/reuse`
				);
				toast.success(i18n.t("connections.toasts.reused"));
				if (target) {
					setSelectedWhatsApp(target);
					setQrModalOpen(true);
				}
			} catch (err) {
				toastError(err);
			} finally {
				setReusingId(null);
			}
		}

		setConfirmModalInfo(confirmationModalInitialState);
	};

	const renderActionButtons = whatsApp => {
		if (requiresFullZapoReset(whatsApp)) {
			return (
				<Button
					className={classes.actionButton}
					variant="contained"
					color="secondary"
					onClick={() => handleOpenConfirmationModal("reuse", whatsApp.id)}
					disabled={reusingId === whatsApp.id}
					startIcon={
						reusingId === whatsApp.id ? (
							<CircularProgress size={16} color="inherit" />
						) : (
							<Replay />
						)
					}
				>
					{reusingId === whatsApp.id
						? i18n.t("connections.buttons.reusing")
						: i18n.t("connections.buttons.reuse")}
				</Button>
			);
		}

		return (
            <>
				{whatsApp.status === "TEMP_BANNED" && (
					<Button className={classes.actionButton} variant="outlined" disabled>
						{i18n.t("connections.buttons.tempBanned")}
					</Button>
				)}
                {whatsApp.status === "qrcode" && (
					<Button
						className={classes.actionButton}
						variant="contained"
						color="primary"
						onClick={() => handleOpenQrModal(whatsApp)}
					>
						{i18n.t("connections.buttons.qrcode")}
					</Button>
				)}
                {whatsApp.status === "DISCONNECTED" && (
					<>
						<Button
							className={classes.actionButton}
							variant="outlined"
							color="primary"
							onClick={() => handleStartWhatsAppSession(whatsApp.id)}
						>
							{i18n.t("connections.buttons.tryAgain")}
						</Button>
						<Button
							className={classes.actionButton}
							variant="outlined"
							color="secondary"
							onClick={() =>
								whatsApp.provider === "zapo"
									? handleOpenConfirmationModal("reuse", whatsApp.id)
									: handleRequestNewQrCode(whatsApp.id)
							}
						>
							{whatsApp.provider === "zapo"
								? i18n.t("connections.buttons.reuse")
								: i18n.t("connections.buttons.newQr")}
						</Button>
					</>
				)}
                {(whatsApp.status === "CONNECTED" ||
					whatsApp.status === "PAIRING" ||
					whatsApp.status === "TIMEOUT") && (
						<>
							<Tooltip title={i18n.t("connections.buttons.syncMessages")}>
								<Button
									className={classes.actionButton}
									variant="outlined"
									style={{ 
										borderColor: "#4caf50", 
										color: "#4caf50",
										minWidth: "auto",
										padding: "6px 10px"
									}}
									onClick={(e) => handleOpenSyncMenu(e, whatsApp.id)}
									disabled={syncingId === whatsApp.id || restartingId === whatsApp.id}
								>
									{syncingId === whatsApp.id ? (
										<CircularProgress size={16} style={{ color: "#4caf50" }} />
									) : (
										<CloudDownload fontSize="small" />
									)}
								</Button>
							</Tooltip>
							<Button
								className={classes.actionButton}
								variant="outlined"
								color="primary"
								onClick={() => handleRestartSession(whatsApp.id)}
								startIcon={restartingId === whatsApp.id ? <CircularProgress size={16} /> : <Replay />}
								disabled={restartingId === whatsApp.id || syncingId === whatsApp.id}
							>
								{restartingId === whatsApp.id ? "Reiniciando..." : i18n.t("connections.buttons.restart")}
							</Button>
							<Button
								className={classes.actionButton}
								variant="outlined"
								color="secondary"
								onClick={() => {
									handleOpenConfirmationModal("disconnect", whatsApp.id);
								}}
								disabled={restartingId === whatsApp.id || syncingId === whatsApp.id}
							>
								{i18n.t("connections.buttons.disconnect")}
							</Button>
						</>
					)}
                {whatsApp.status === "OPENING" && (
					<>
						<Button className={classes.actionButton} variant="outlined" disabled>
							{i18n.t("connections.buttons.connecting")}
						</Button>
						<Button
							className={classes.actionButton}
							variant="outlined"
							color="secondary"
							onClick={() => {
								handleOpenConfirmationModal("disconnect", whatsApp.id);
							}}
							disabled={restartingId === whatsApp.id || syncingId === whatsApp.id}
						>
							{i18n.t("connections.buttons.forceStop")}
						</Button>
					</>
				)}
            </>
        );
	};

	// eslint-disable-next-line no-unused-vars
	const renderStatusToolTips = whatsApp => {
		return (
			<div className={classes.customTableCell}>
				{whatsApp.status === "DISCONNECTED" && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.disconnected.title")}
						content={i18n.t("connections.toolTips.disconnected.content")}
					>
						<SignalCellularConnectedNoInternet0Bar color="secondary" />
					</CustomToolTip>
				)}
				{whatsApp.status === "OPENING" && (
					<CircularProgress size={24} className={classes.buttonProgress} />
				)}
				{whatsApp.status === "qrcode" && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.qrcode.title")}
						content={i18n.t("connections.toolTips.qrcode.content")}
					>
						<CropFree />
					</CustomToolTip>
				)}
				{whatsApp.status === "CONNECTED" && (
					<CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
						<SignalCellular4Bar style={{ color: green[500] }} />
					</CustomToolTip>
				)}
				{(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.timeout.title")}
						content={i18n.t("connections.toolTips.timeout.content")}
					>
						<SignalCellularConnectedNoInternet2Bar color="secondary" />
					</CustomToolTip>
				)}
			</div>
		);
	};

	const restartpm2 = async () => {
		try {
			await api.post('/restartpm2');
		} catch (err) {
			toastError(err);
		}
	}

	return (
		<MainContainer>
			{/* Menú de opciones de sincronización */}
			<Menu
				anchorEl={syncMenuAnchor}
				open={Boolean(syncMenuAnchor)}
				onClose={handleCloseSyncMenu}
			>
				<MenuItem onClick={() => handleSyncMenuOption("unread")}>
					<ListItemIcon>
						<MailOutline fontSize="small" style={{ color: "#4caf50" }} />
					</ListItemIcon>
					<ListItemText 
						primary={i18n.t("connections.syncMenu.unread")}
						secondary={i18n.t("connections.syncMenu.unreadDesc")}
					/>
				</MenuItem>
				<MenuItem onClick={() => handleSyncMenuOption("all")}>
					<ListItemIcon>
						<History fontSize="small" style={{ color: "#2196f3" }} />
					</ListItemIcon>
					<ListItemText 
						primary={i18n.t("connections.syncMenu.all")}
						secondary={i18n.t("connections.syncMenu.allDesc")}
					/>
				</MenuItem>
			</Menu>

			<ConfirmationModal
				title={confirmModalInfo.title}
				open={confirmModalOpen}
				onClose={setConfirmModalOpen}
				onConfirm={handleSubmitConfirmationModal}
			>
				{confirmModalInfo.message}
			</ConfirmationModal>
			<QrcodeModal
				open={qrModalOpen}
				onClose={handleCloseQrModal}
				whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
			/>
			<WhatsAppModal
				open={whatsAppModalOpen}
				onClose={handleCloseWhatsAppModal}
				whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
			/>
			<MainHeader>
				<Title>{i18n.t("connections.title")} ({whatsApps.length})</Title>
				<MainHeaderButtonsWrapper>
					<Tooltip title={i18n.t("connections.buttons.restart")}>
						<Button
							variant="contained"
							color="primary"
							onClick={restartpm2}
							className={classes.headerButton}
						>
							<SyncOutlined />
						</Button>
					</Tooltip>
					<Tooltip title={i18n.t("connections.buttons.add")}>
						<Button
							variant="contained"
							color="primary"
							onClick={handleOpenWhatsAppModal}
							className={classes.headerButton}
						>
							<WhatsApp />
						</Button>
					</Tooltip>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} elevation={0}>
				{loading ? (
					<TableRowSkeleton />
				) : whatsApps?.length > 0 ? (
					<Box className={classes.connectionsGrid}>
						{whatsApps.map(whatsApp => (
							<Paper key={whatsApp.id} className={classes.connectionCard} elevation={0}>
				{/* Header */}
				<Box className={classes.connectionHeader}>
					<Box className={classes.connectionTitle}>
						<WhatsApp style={{ color: "#25D366", fontSize: "1.5rem" }} />
						<Typography className={classes.connectionName}>
							{whatsApp.name}
						</Typography>
						<span className={classes.connectionId}>#{whatsApp.id}</span>
					</Box>
					{whatsApp.isDefault && (
						<span className={classes.defaultBadge}>
							PRINCIPAL
						</span>
					)}
				</Box>								{/* Status */}
								<Box>
									<Box
										className={`${classes.statusChip} ${
											whatsApp.status === "CONNECTED"
												? classes.statusConnected
												: ["BANNED", "TEMP_BANNED"].includes(whatsApp.status)
												? classes.statusRestricted
												: whatsApp.status === "DISCONNECTED"
												? classes.statusDisconnected
												: whatsApp.status === "OPENING"
												? classes.statusOpening
												: classes.statusQrcode
										}`}
									>
										{whatsApp.status === "CONNECTED" && (
											<SignalCellular4Bar style={{ fontSize: "0.9rem" }} />
										)}
										{whatsApp.status === "DISCONNECTED" && (
											<SignalCellularConnectedNoInternet0Bar style={{ fontSize: "0.9rem" }} />
										)}
										{(whatsApp.status === "BANNED" ||
											whatsApp.status === "TEMP_BANNED") && (
											<ErrorOutline style={{ fontSize: "0.9rem" }} />
										)}
										{whatsApp.status === "OPENING" && (
											<CircularProgress size={12} style={{ color: "inherit" }} />
										)}
										{whatsApp.status === "qrcode" && (
											<CropFree style={{ fontSize: "0.9rem" }} />
										)}
										{(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
											<SignalCellularConnectedNoInternet2Bar style={{ fontSize: "0.9rem" }} />
										)}
										<span>{getStatusLabel(whatsApp.status)}</span>
									</Box>
								</Box>

								{/* Details */}
								<Box className={classes.connectionDetails}>
										{whatsApp.number ? (
											<Box className={classes.detailItem}>
												<Phone className={classes.detailIcon} />
												<span className={classes.detailLabel}>Número:</span>
												<span className={classes.detailValue}>+{whatsApp.number}</span>
											</Box>
										) : (
											<Box className={classes.detailItem}>
												<Phone className={classes.detailIcon} />
												<span className={classes.detailLabel}>Número:</span>
												<span className={classes.detailValue}>Sin número</span>
											</Box>
										)}

										{whatsApp.provider === "zapo" && (
											<Box className={classes.detailItem}>
												<AccountCircleOutlined className={classes.detailIcon} />
												<span className={classes.detailLabel}>
													{i18n.t("connections.accountType.label")}:
												</span>
												<span className={classes.detailValue}>
													{i18n.t(
														`connections.accountType.${getZapoAccountType(
															zapoHealthById[whatsApp.id]
														)}`
													)}
												</span>
											</Box>
										)}

										<Box className={classes.detailItem}>
											<Schedule className={classes.detailIcon} />
											<span className={classes.detailLabel}>Actualizado:</span>
											<span className={classes.detailValue}>{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}</span>
										</Box>

										{whatsApp.disconnectReason &&
											whatsApp.status !== "CONNECTED" &&
											whatsApp.status !== "qrcode" && (
												<Box className={classes.reasonBox}>
													<ErrorOutline style={{ fontSize: "1.1rem", marginTop: 1 }} />
													<span>
														<strong>{i18n.t("connections.details.reason")}:</strong>{" "}
														{getDisconnectReasonLabel(whatsApp)}
													</span>
												</Box>
											)}
									</Box>

									{whatsApp.provider === "zapo" &&
										whatsApp.status === "CONNECTED" && (() => {
											const health = zapoHealthById[whatsApp.id];
											if (!health) {
												return (
													<Box className={classes.zapoHealthBox}>
														<Box className={classes.zapoHealthHeader}>
															<Box className={classes.zapoHealthTitle}>
																<ForumOutlined fontSize="small" />
																{i18n.t("connections.zapoHealth.title")}
															</Box>
															<CircularProgress size={14} />
														</Box>
													</Box>
												);
											}
											if (!health.available) {
												return (
													<Box className={classes.zapoHealthBox}>
														<Box className={classes.zapoHealthHeader}>
															<Box className={classes.zapoHealthTitle}>
																<ForumOutlined fontSize="small" />
																{i18n.t("connections.zapoHealth.title")}
															</Box>
															<span className={classes.zapoHealthWarning}>
																{i18n.t("connections.zapoHealth.unavailable")}
															</span>
														</Box>
													</Box>
												);
											}

											const presentation = getZapoHealthPresentation(health);
											const toneClass =
												presentation.tone === "danger"
													? classes.zapoHealthDanger
													: presentation.tone === "warning"
													? classes.zapoHealthWarning
													: presentation.tone === "neutral"
													? classes.zapoHealthNeutral
													: classes.zapoHealthHealthy;
											const barColor =
												presentation.tone === "danger"
													? "#d32f2f"
													: presentation.tone === "warning"
													? "#ed6c02"
													: "#2e7d32";
											let deadlineText;
											if (!presentation.isPaused) {
												if (
													presentation.quotaNotReported &&
													presentation.cappingConfigured === false
												) {
													deadlineText = i18n.t(
														"connections.zapoHealth.cappingDisabled"
													);
												} else if (
													presentation.quotaNotReported &&
													presentation.isPersonalAccount
												) {
													deadlineText = i18n.t(
														"connections.zapoHealth.personalQuota"
													);
												} else if (presentation.quotaNotReported) {
													deadlineText = i18n.t(
														"connections.zapoHealth.quotaNotReported"
													);
												} else if (presentation.usesConfiguredLimit) {
													deadlineText = i18n.t(
														"connections.zapoHealth.configuredLimit"
													);
												} else if (presentation.cycleEnd) {
													deadlineText = `${i18n.t(
														"connections.zapoHealth.renews"
													)} ${format(presentation.cycleEnd, "dd/MM HH:mm")}`;
												} else {
													deadlineText = i18n.t(
														"connections.zapoHealth.serverManaged"
													);
												}
											}
											let availableText = "—";
											if (presentation.isPaused) {
												availableText = 0;
											} else if (Number.isFinite(presentation.remaining)) {
												availableText = presentation.remaining;
											} else if (presentation.quotaNotReported) {
												availableText = i18n.t(
													presentation.isPersonalAccount
														? "connections.zapoHealth.notApplicable"
														: "connections.zapoHealth.notReported"
												);
											}

											return (
												<Box className={classes.zapoHealthBox}>
													<Box className={classes.zapoHealthHeader}>
														<Box className={classes.zapoHealthTitle}>
															<ForumOutlined fontSize="small" />
															{i18n.t("connections.zapoHealth.title")}
														</Box>
														<span className={toneClass}>
															{i18n.t(`connections.zapoHealth.status.${presentation.label}`)}
														</span>
													</Box>
													<Box className={classes.zapoHealthNumbers}>
														<span>
															{i18n.t("connections.zapoHealth.used")}:{" "}
															<strong>
																{Number.isFinite(presentation.used)
																	? presentation.used
																	: "—"}
																{" / "}
																{Number.isFinite(presentation.total)
																	? presentation.total
																	: "—"}
															</strong>
														</span>
														<span>
															{i18n.t("connections.zapoHealth.available")}:{" "}
															<strong>{availableText}</strong>
														</span>
													</Box>
													{health.chatHistory && (
														<Box className={classes.zapoHealthHistory}>
															<span>
																{i18n.t(
																	"connections.zapoHealth.withInbound"
																)}
																:{" "}
																<strong>
																	{health.chatHistory.withInbound}
																</strong>
															</span>
															<span>
																{i18n.t(
																	"connections.zapoHealth.outboundOnly"
																)}
																:{" "}
																<strong>
																	{health.chatHistory.outboundOnly}
																</strong>
															</span>
														</Box>
													)}
													{presentation.isPaused && (
														<ZapoPauseNotice
															deadline={presentation.enforcementEnd}
															classes={classes}
														/>
													)}
													{presentation.hasFiniteQuota && (
														<LinearProgress
															variant="determinate"
															value={presentation.percentage}
															sx={{
																height: 7,
																borderRadius: 4,
																"& .MuiLinearProgress-bar": {
																	backgroundColor: barColor,
																	borderRadius: 4,
																},
															}}
														/>
													)}
													{(deadlineText || health.stale) && (
														<Box className={classes.zapoHealthMeta}>
															{deadlineText}
															{health.stale &&
																`${deadlineText ? " · " : ""}${i18n.t(
																	"connections.zapoHealth.stale"
																)}`}
														</Box>
													)}
												</Box>
											);
										})()}

									{/* Actions */}
									<Box className={classes.connectionActions}>
										<Box className={classes.actionButtons}>
											{renderActionButtons(whatsApp)}
										</Box>
										<Box className={classes.iconButtons}>
											<Tooltip title={i18n.t("connections.buttons.edit")}>
												<IconButton
													size="small"
													className={classes.iconButton}
													onClick={() => handleEditWhatsApp(whatsApp)}
													color="primary"
												>
													<Edit fontSize="small" />
												</IconButton>
											</Tooltip>
											<Tooltip title={i18n.t("connections.buttons.delete")}>
												<IconButton
													size="small"
													className={classes.iconButton}
													onClick={() => handleOpenConfirmationModal("delete", whatsApp.id)}
													color="secondary"
												>
													<DeleteOutline fontSize="small" />
												</IconButton>
											</Tooltip>
										</Box>
									</Box>
								</Paper>
						))}
					</Box>
				) : (
					<Box className={classes.emptyState}>
						<WhatsApp style={{ fontSize: 64, opacity: 0.3, marginBottom: 16 }} />
						<Typography variant="h6" gutterBottom>
							{i18n.t("connections.empty.title")}
						</Typography>
						<Typography variant="body2">
							{i18n.t("connections.empty.message")}
						</Typography>
					</Box>
				)}
			</Paper>
		</MainContainer>
	);
};

export default Connections;
