import React, { useState, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
	Button,
	IconButton,
	Paper,
	Tooltip,
	Typography,
	CircularProgress,
	Box,
} from "@material-ui/core";
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
} from "@material-ui/icons";

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
		boxShadow: theme.palette.type === "dark" 
			? "0 2px 4px rgba(0,0,0,0.3)" 
			: "0 2px 4px rgba(0,0,0,0.05)",
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
		transition: "all 0.3s ease",
		position: "relative",
		"&:hover": {
			boxShadow: theme.palette.type === "dark" 
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
		backgroundColor: theme.palette.type === "dark" 
			? "rgba(76, 175, 80, 0.2)" 
			: "rgba(76, 175, 80, 0.1)",
		color: green[theme.palette.type === "dark" ? 400 : 700],
	},
	statusDisconnected: {
		backgroundColor: theme.palette.type === "dark" 
			? "rgba(244, 67, 54, 0.2)" 
			: "rgba(244, 67, 54, 0.1)",
		color: theme.palette.type === "dark" ? "#ef5350" : "#d32f2f",
	},
	statusOpening: {
		backgroundColor: theme.palette.type === "dark" 
			? "rgba(33, 150, 243, 0.2)" 
			: "rgba(33, 150, 243, 0.1)",
		color: theme.palette.type === "dark" ? "#42a5f5" : "#1976d2",
	},
	statusQrcode: {
		backgroundColor: theme.palette.type === "dark" 
			? "rgba(255, 152, 0, 0.2)" 
			: "rgba(255, 152, 0, 0.1)",
		color: theme.palette.type === "dark" ? "#ffb74d" : "#f57c00",
	},
	connectionActions: {
		display: "flex",
		gap: theme.spacing(1),
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: theme.spacing(1),
	},
	actionButtons: {
		display: "flex",
		gap: theme.spacing(1),
		flex: 1,
	},
	actionButton: {
		minWidth: "auto",
		padding: "6px 12px",
		textTransform: "none",
		fontSize: "0.75rem",
		borderRadius: 8,
		flex: 1,
	},
	iconButtons: {
		display: "flex",
		gap: theme.spacing(0.5),
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
		boxShadow: theme.palette.type === "dark" 
			? "0 2px 8px rgba(0, 113, 193, 0.4)" 
			: "0 2px 8px rgba(25, 118, 210, 0.25)",
		transition: "all 0.2s ease",
		"&:hover": {
			transform: "translateY(-2px)",
			boxShadow: theme.palette.type === "dark" 
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

const Connections = () => {
	const classes = useStyles();

	const { whatsApps, loading } = useContext(WhatsAppsContext);
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const [restartingId, setRestartingId] = useState(null);
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

		setConfirmModalInfo(confirmationModalInitialState);
	};

	const renderActionButtons = whatsApp => {
		return (
			<>
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
							onClick={() => handleRequestNewQrCode(whatsApp.id)}
						>
							{i18n.t("connections.buttons.newQr")}
						</Button>
					</>
				)}
				{(whatsApp.status === "CONNECTED" ||
					whatsApp.status === "PAIRING" ||
					whatsApp.status === "TIMEOUT") && (
						<>
							<Button
								className={classes.actionButton}
								variant="outlined"
								color="primary"
								onClick={() => handleRestartSession(whatsApp.id)}
								startIcon={restartingId === whatsApp.id ? <CircularProgress size={16} /> : <Replay />}
								disabled={restartingId === whatsApp.id}
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
								disabled={restartingId === whatsApp.id}
							>
								{i18n.t("connections.buttons.disconnect")}
							</Button>
						</>
					)}
				{whatsApp.status === "OPENING" && (
					<Button className={classes.actionButton} variant="outlined" disabled color="default">
						{i18n.t("connections.buttons.connecting")}
					</Button>
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
										{whatsApp.status === "OPENING" && (
											<CircularProgress size={12} style={{ color: "inherit" }} />
										)}
										{whatsApp.status === "qrcode" && (
											<CropFree style={{ fontSize: "0.9rem" }} />
										)}
										{(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
											<SignalCellularConnectedNoInternet2Bar style={{ fontSize: "0.9rem" }} />
										)}
										<span>{whatsApp.status}</span>
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

										<Box className={classes.detailItem}>
											<Schedule className={classes.detailIcon} />
											<span className={classes.detailLabel}>Actualizado:</span>
											<span className={classes.detailValue}>{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}</span>
										</Box>
									</Box>

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
