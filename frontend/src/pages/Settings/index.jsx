/* eslint-disable no-unexpected-multiline, no-empty */
import React, { useState, useEffect, useCallback, useRef } from "react";
import openSocket from "../../services/socket-io";
import { useHistory } from "react-router-dom";

import makeStyles from '@mui/styles/makeStyles';
import withStyles from '@mui/styles/withStyles';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import { toast } from "react-toastify";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SyncIcon from "@mui/icons-material/Sync";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SearchIcon from "@mui/icons-material/Search";
import BackupIcon from "@mui/icons-material/Backup";
import FolderIcon from "@mui/icons-material/Folder";

import Tooltip from "@mui/material/Tooltip";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

const useStyles = makeStyles(theme => ({
	root: {
		backgroundColor: theme.palette.background.default,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "column",
		padding: theme.spacing(4),
		minHeight: "100%",
	},
	titlePaper: {
		padding: theme.spacing(2, 4),
		marginBottom: theme.spacing(3),
		borderRadius: 12,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
		backgroundColor: theme.palette.background.paper,
	},
	titleText: {
		fontWeight: 600,
		color: theme.palette.text.primary,
		fontSize: "1.5rem",
	},
	settingsContainer: {
		maxWidth: 700,
		width: "100%",
		[theme.breakpoints.down('md')]: {
			maxWidth: "100%",
			padding: theme.spacing(0, 1),
		},
	},
	columnsWrapper: {
		display: "flex",
		gap: theme.spacing(3),
		[theme.breakpoints.down('md')]: {
			flexDirection: "column",
			gap: theme.spacing(2),
		},
	},
	column: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
	},
	paper: {
		padding: theme.spacing(2, 2.5),
		display: "flex",
		alignItems: "center",
		borderRadius: 10,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
		transition: "all 0.2s ease",
		"&:hover": {
			boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
			borderColor: theme.palette.primary.light,
		},
	},
	settingLabel: {
		fontSize: "0.9rem",
		fontWeight: 500,
		color: theme.palette.text.primary,
	},
	settingOption: {
		marginLeft: "auto",
	},
	selectPaper: {
		padding: theme.spacing(2, 2.5),
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: 10,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
		transition: "all 0.2s ease",
		"&:hover": {
			boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
			borderColor: theme.palette.primary.light,
		},
	},
	selectLabel: {
		fontSize: "0.9rem",
		fontWeight: 500,
		color: theme.palette.text.primary,
		maxWidth: 140,
	},
	select: {
		borderRadius: 8,
		fontSize: "0.85rem",
		"& .MuiOutlinedInput-notchedOutline": {
			borderColor: theme.palette.divider,
		},
		"&:hover .MuiOutlinedInput-notchedOutline": {
			borderColor: theme.palette.primary.main,
		},
	},
	// Storage section styles
	storageSection: {
		marginTop: theme.spacing(3),
		width: "100%",
	},
	storagePaper: {
		padding: theme.spacing(2.5),
		borderRadius: 12,
		border: `1px solid ${theme.palette.divider}`,
		boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
		backgroundColor: theme.palette.background.paper,
	},
	storageTitleRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: theme.spacing(2),
	},
	storageTitle: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		fontWeight: 600,
		fontSize: "1rem",
	},
	storageStats: {
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(1),
		marginBottom: theme.spacing(2),
	},
	statusChip: {
		fontWeight: 500,
	},
	syncButton: {
		borderRadius: 8,
	},
}));

const IOSSwitch = withStyles((theme) => ({
	root: {
		width: 42,
		height: 26,
		padding: 0,
		margin: theme.spacing(1),
	},
	switchBase: {
		padding: 1,
		'&$checked': {
			transform: 'translateX(16px)',
			color: theme.palette.common.white,
			'& + $track': {
				backgroundColor: theme.palette.success.main,
				opacity: 1,
				border: 'none',
			},
		},
		'&$focusVisible $thumb': {
			color: theme.palette.success.main,
			border: '6px solid #fff',
		},
	},
	thumb: {
		width: 24,
		height: 24,
	},
	track: {
		borderRadius: 26 / 2,
		border: `1px solid ${theme.palette.divider}`,
		backgroundColor: theme.palette.action.disabledBackground,
		opacity: 1,
		transition: theme.transitions.create(['background-color', 'border']),
	},
	checked: {},
	focusVisible: {},
}))
	(({ classes, ...props }) => {
		return (
			<Switch
				focusVisibleClassName={classes.focusVisible}
				disableRipple
				classes={{
					root: classes.root,
					switchBase: classes.switchBase,
					thumb: classes.thumb,
					track: classes.track,
					checked: classes.checked,
				}}
				{...props}
			/>
		);
	});

const Settings = () => {
	const classes = useStyles();
	const history = useHistory();
	const isMounted = useRef(true);
	const migrationPollRef = useRef(null);

	const [settings, setSettings] = useState([]);
	
	// Storage state
	const [storageStatus, setStorageStatus] = useState(null);
	const [storageSyncStats, setStorageSyncStats] = useState(null);
	const [localFilesInfo, setLocalFilesInfo] = useState({ count: 0, needsMigration: 0, alreadyInS3: 0 });
	const [migrationStatus, setMigrationStatus] = useState(null);
	const [loadingStorage, setLoadingStorage] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [migrating, setMigrating] = useState(false);
	const [scanning, setScanning] = useState(false);

	// Fetch storage status
	const fetchStorageStatus = useCallback(async () => {
		try {
			setLoadingStorage(true);
			const [statusRes, syncRes] = await Promise.all([
				api.get("/storage/status"),
				api.get("/storage/sync/status")
			]);
			if (!isMounted.current) return;
			setStorageStatus(statusRes.data);
			setStorageSyncStats(syncRes.data);
			
			// Also get local files count and migration status
			try {
				const [localRes, migrationRes] = await Promise.all([
					api.get("/storage/local/files"),
					api.get("/storage/migration/status")
				]);
				if (!isMounted.current) return;
				setLocalFilesInfo({
					count: localRes.data.count || 0,
					needsMigration: localRes.data.needsMigration || 0,
					alreadyInS3: localRes.data.alreadyInS3 || 0
				});
				setMigrationStatus(migrationRes.data);
			} catch (e) {
				// Ignore if endpoints don't exist
			}
		} catch (err) {
			// Storage endpoints might not exist if not configured
			if (!isMounted.current) return;
			setStorageStatus(null);
			setStorageSyncStats(null);
		} finally {
			if (isMounted.current) {
				setLoadingStorage(false);
			}
		}
	}, []);

	// Scan local files
	const handleScanLocalFiles = async () => {
		try {
			setScanning(true);
			const { data } = await api.get("/storage/local/files");
			if (!isMounted.current) return;
			setLocalFilesInfo({
				count: data.count || 0,
				needsMigration: data.needsMigration || 0,
				alreadyInS3: data.alreadyInS3 || 0
			});
			toast.success(i18n.t("settings.settings.storage.scanSuccess", { count: data.count }));
		} catch (err) {
			toast.error(i18n.t("settings.settings.storage.scanError"));
		} finally {
			if (isMounted.current) setScanning(false);
		}
	};

	// Handle manual sync
	const handleSync = async () => {
		try {
			setSyncing(true);
			await api.post("/storage/sync/trigger");
			toast.success(i18n.t("settings.settings.storage.syncSuccess"));
			if (isMounted.current) {
				fetchStorageStatus();
			}
		} catch (err) {
			toast.error(i18n.t("settings.settings.storage.syncError"));
		} finally {
			if (isMounted.current) setSyncing(false);
		}
	};

	// Handle migration to S3
	const handleMigrate = async () => {
		try {
			setMigrating(true);
			const { data: startData } = await api.post("/storage/migration/to-s3", { dryRun: false });
			toast.info(i18n.t("settings.settings.storage.migrationStarted"));
			if (isMounted.current) setMigrationStatus(startData);
			
			// Poll for status
			if (migrationPollRef.current) {
				clearInterval(migrationPollRef.current);
			}
			const pollInterval = setInterval(async () => {
				try {
					const { data } = await api.get("/storage/migration/status");
					if (!isMounted.current) return;
					setMigrationStatus(data);
					
					if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
						clearInterval(pollInterval);
						migrationPollRef.current = null;
						setMigrating(false);
						
						// Refresh local files count
						try {
							const localRes = await api.get("/storage/local/files");
							if (isMounted.current) {
								setLocalFilesInfo({
									count: localRes.data.count || 0,
									needsMigration: localRes.data.needsMigration || 0,
									alreadyInS3: localRes.data.alreadyInS3 || 0
								});
							}
						} catch (e) {}
						
						if (isMounted.current) {
							fetchStorageStatus();
						}
						
						if (data.status === "completed") {
							toast.success(
								`${i18n.t("settings.settings.storage.migrationCompleted")}: ${data.migrated} ${i18n.t("settings.settings.storage.migrated")}, ${data.skipped} ${i18n.t("settings.settings.storage.skipped")}, ${data.failed} ${i18n.t("settings.settings.storage.failed")}`
							);
						} else if (data.status === "failed") {
							toast.error(i18n.t("settings.settings.storage.migrationError"));
						}
					}
				} catch (e) {
					clearInterval(pollInterval);
					migrationPollRef.current = null;
					if (isMounted.current) setMigrating(false);
				}
			}, 1500);
			migrationPollRef.current = pollInterval;
		} catch (err) {
			toast.error(i18n.t("settings.settings.storage.migrationError"));
			if (isMounted.current) setMigrating(false);
		}
	};

	useEffect(() => {
		const fetchSession = async () => {
			try {
				const { data } = await api.get("/settings");
				if (isMounted.current) setSettings(data);
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
		fetchStorageStatus();
		return () => {
			isMounted.current = false;
			if (migrationPollRef.current) {
				clearInterval(migrationPollRef.current);
				migrationPollRef.current = null;
			}
		};
	}, [fetchStorageStatus]);

       useEffect(() => {
               const socket = openSocket();
               if (!socket) return;

               socket.on("settings", data => {
                       if (data.action === "update") {
                               setSettings(prevState => {
                                       const aux = [...prevState];
                                       const settingIndex = aux.findIndex(s => s.key === data.setting.key);
                                       aux[settingIndex].value = data.setting.value;
                                       return aux;
                               });
                       }
               });

               return () => {
                       socket.off("settings");
               };
       }, []);

	const handleChangeBooleanSetting = async e => {
		const selectedValue = e.target.checked ? "enabled" : "disabled";
		const settingKey = e.target.name;

		try {
			await api.put(`/settings/${settingKey}`, {
				value: selectedValue,
			});
			toast.success(i18n.t("settings.success"));
			history.go(0);
		} catch (err) {
			toastError(err);
		}
	};
	const handleChangeSetting = async e => {
		const selectedValue = e.target.value;
		const settingKey = e.target.name;

		try {
			await api.put(`/settings/${settingKey}`, {
				value: selectedValue,
			});
			toast.success(i18n.t("settings.success"));
		} catch (err) {
			toastError(err);
		}
	};

	const getSettingValue = key => {
		const { value } = settings.find(s => s.key === key);
		return value;
	};

	return (
        <div className={classes.root}>
            <Paper className={classes.titlePaper} variant="outlined">
				<Typography className={classes.titleText}>
					{i18n.t("settings.title")}
				</Typography>
			</Paper>
            <div className={classes.settingsContainer}>
				<div className={classes.columnsWrapper}>
					{/* Columna izquierda */}
					<div className={classes.column}>
						<Paper className={classes.paper} variant="outlined">
							<Tooltip title={i18n.t("settings.settings.userCreation.note")}>
								<FormControlLabel
									control={
										<IOSSwitch
											checked={settings && settings.length > 0 && getSettingValue("userCreation") === "enabled"}
											onChange={handleChangeBooleanSetting}
											name="userCreation"
										/>
									}
									label={<span className={classes.settingLabel}>{i18n.t("settings.settings.userCreation.name")}</span>}
								/>
							</Tooltip>
						</Paper>

						<Paper className={classes.paper} variant="outlined">
							<Tooltip title={i18n.t("settings.settings.closeTicketApi.note")}>
								<FormControlLabel
									control={
										<IOSSwitch
											checked={settings && settings.length > 0 && getSettingValue("closeTicketApi") === "enabled"}
											onChange={handleChangeBooleanSetting}
											name="closeTicketApi"
										/>
									}
									label={<span className={classes.settingLabel}>{i18n.t("settings.settings.closeTicketApi.name")}</span>}
								/>
							</Tooltip>
						</Paper>

						<Paper className={classes.paper} variant="outlined">
							<Tooltip title={i18n.t("settings.settings.call.note")}>
								<FormControlLabel
									control={
										<IOSSwitch
											checked={settings && settings.length > 0 && getSettingValue("call") === "enabled"}
											onChange={handleChangeBooleanSetting}
											name="call"
										/>
									}
									label={<span className={classes.settingLabel}>{i18n.t("settings.settings.call.name")}</span>}
								/>
							</Tooltip>
						</Paper>

						<Paper className={classes.paper} variant="outlined">
							<Tooltip title={i18n.t("settings.settings.sideMenu.note")}>
								<FormControlLabel
									control={
										<IOSSwitch
											checked={settings && settings.length > 0 && getSettingValue("sideMenu") === "enabled"}
											onChange={handleChangeBooleanSetting}
											name="sideMenu"
										/>
									}
									label={<span className={classes.settingLabel}>{i18n.t("settings.settings.sideMenu.name")}</span>}
								/>
							</Tooltip>
						</Paper>
					</div>

					{/* Columna derecha */}
					<div className={classes.column}>
						<Paper className={classes.paper} variant="outlined">
							<Tooltip title={i18n.t("settings.settings.darkMode.note")}>
								<FormControlLabel
									control={
										<IOSSwitch
											checked={settings && settings.length > 0 && getSettingValue("darkMode") === "enabled"}
											onChange={handleChangeBooleanSetting}
											name="darkMode"
										/>
									}
									label={<span className={classes.settingLabel}>{i18n.t("settings.settings.darkMode.name")}</span>}
								/>
							</Tooltip>
						</Paper>

						<Paper className={classes.paper} variant="outlined">
							<Tooltip title={i18n.t("settings.settings.ASC.note")}>
								<FormControlLabel
									control={
										<IOSSwitch
											checked={settings && settings.length > 0 && getSettingValue("ASC") === "enabled"}
											onChange={handleChangeBooleanSetting}
											name="ASC"
										/>
									}
									label={<span className={classes.settingLabel}>{i18n.t("settings.settings.ASC.name")}</span>}
								/>
							</Tooltip>
						</Paper>

						<Paper className={classes.paper} variant="outlined">
							<Tooltip title={i18n.t("settings.settings.created.note")}>
								<FormControlLabel
									control={
										<IOSSwitch
											checked={settings && settings.length > 0 && getSettingValue("created") === "enabled"}
											onChange={handleChangeBooleanSetting}
											name="created"
										/>
									}
									label={<span className={classes.settingLabel}>{i18n.t("settings.settings.created.name")}</span>}
								/>
							</Tooltip>
						</Paper>

						<Tooltip title={i18n.t("settings.settings.timeCreateNewTicket.note")}>
							<Paper className={classes.selectPaper} variant="outlined">
								<Typography className={classes.selectLabel}>
									{i18n.t("settings.settings.timeCreateNewTicket.name")}
								</Typography>
								<Select
									margin="dense"
									variant="outlined"
									native
									id="timeCreateNewTicket-setting"
									name="timeCreateNewTicket"
									value={settings && settings.length > 0 && getSettingValue("timeCreateNewTicket")}
									className={classes.select}
									onChange={handleChangeSetting}
								>
									<option value="5">{i18n.t("settings.settings.timeCreateNewTicket.options.5")}</option>
									<option value="10">{i18n.t("settings.settings.timeCreateNewTicket.options.10")}</option>
									<option value="30">{i18n.t("settings.settings.timeCreateNewTicket.options.30")}</option>
									<option value="60">{i18n.t("settings.settings.timeCreateNewTicket.options.60")}</option>
									<option value="300">{i18n.t("settings.settings.timeCreateNewTicket.options.300")}</option>
									<option value="1800">{i18n.t("settings.settings.timeCreateNewTicket.options.1800")}</option>
									<option value="3600">{i18n.t("settings.settings.timeCreateNewTicket.options.3600")}</option>
									<option value="7200">{i18n.t("settings.settings.timeCreateNewTicket.options.7200")}</option>
									<option value="21600">{i18n.t("settings.settings.timeCreateNewTicket.options.21600")}</option>
									<option value="43200">{i18n.t("settings.settings.timeCreateNewTicket.options.43200")}</option>
									<option value="86400">{i18n.t("settings.settings.timeCreateNewTicket.options.86400")}</option>
									<option value="604800">{i18n.t("settings.settings.timeCreateNewTicket.options.604800")}</option>
									<option value="1296000">{i18n.t("settings.settings.timeCreateNewTicket.options.1296000")}</option>
									<option value="2592000">{i18n.t("settings.settings.timeCreateNewTicket.options.2592000")}</option>
								</Select>
							</Paper>
						</Tooltip>
					</div>
				</div>

				{/* Storage Section - Only shows if external storage is configured */}
				{storageStatus && storageStatus.type !== "local" && (
					<div className={classes.storageSection}>
						<Paper className={classes.storagePaper} variant="outlined">
							<div className={classes.storageTitleRow}>
								<Typography className={classes.storageTitle}>
									<CloudUploadIcon color="primary" />
									{i18n.t("settings.settings.storage.title")}
								</Typography>
								<Box display="flex" style={{ gap: 8 }}>
									{storageStatus.deleteLocalAfterUpload && (
										<Chip
											size="small"
											label={i18n.t("settings.settings.storage.autoCleanup")}
											color="default"
											style={{ backgroundColor: '#e3f2fd' }}
										/>
									)}
									<Chip
										size="small"
										icon={storageStatus.isPrimaryHealthy ? <CheckCircleIcon /> : <ErrorIcon />}
										label={storageStatus.isPrimaryHealthy 
											? i18n.t("settings.settings.storage.healthy")
											: i18n.t("settings.settings.storage.unhealthy")}
										color={storageStatus.isPrimaryHealthy ? "primary" : "secondary"}
										className={classes.statusChip}
									/>
								</Box>
							</div>
							
							<Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
								{i18n.t("settings.settings.storage.note")}
							</Typography>

							{loadingStorage ? (
								<Box display="flex" justifyContent="center" p={2}>
									<CircularProgress size={24} />
								</Box>
							) : (
								<>
									{/* Local files section */}
									<Box mb={2} p={2} bgcolor="action.hover" borderRadius="8px">
										<Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
											<Box display="flex" alignItems="center" style={{ gap: 8 }}>
												<FolderIcon color="action" />
												<Typography variant="subtitle2">
													{i18n.t("settings.settings.storage.localFiles")}
												</Typography>
											</Box>
											<Box display="flex" style={{ gap: 8 }}>
												<Chip
													size="small"
													label={`${i18n.t("settings.settings.storage.inS3")}: ${localFilesInfo.alreadyInS3}`}
													color="primary"
													variant="outlined"
												/>
												<Chip
													size="small"
													label={`${i18n.t("settings.settings.storage.pendingMigration")}: ${localFilesInfo.needsMigration}`}
													color={localFilesInfo.needsMigration > 0 ? "secondary" : "default"}
												/>
											</Box>
										</Box>
										<Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
											{i18n.t("settings.settings.storage.localFilesNote")} ({localFilesInfo.count} {i18n.t("settings.settings.storage.totalLocal")})
										</Typography>
										<Box display="flex" style={{ gap: 8 }}>
											<Button
												variant="outlined"
												size="small"
												startIcon={scanning ? <CircularProgress size={16} /> : <SearchIcon />}
												onClick={handleScanLocalFiles}
												disabled={scanning}
											>
												{i18n.t("settings.settings.storage.scanButton")}
											</Button>
											<Button
												variant="contained"
												size="small"
												color="secondary"
												startIcon={migrating ? <CircularProgress size={16} color="inherit" /> : <BackupIcon />}
												onClick={handleMigrate}
												disabled={migrating || !storageStatus.isPrimaryHealthy || localFilesInfo.needsMigration === 0}
											>
												{i18n.t("settings.settings.storage.migrateButton")}
											</Button>
										</Box>
										{migrationStatus && migrationStatus.status === "running" && (
											<Box mt={1}>
												<Typography variant="caption" color="textSecondary">
													{i18n.t("settings.settings.storage.migrating")}: {migrationStatus.migrated || 0}/{migrationStatus.total || 0}
												</Typography>
											</Box>
										)}
										{migrationStatus && migrationStatus.status === "completed" && migrationStatus.migrated > 0 && (
											<Box mt={1}>
												<Typography variant="caption" style={{ color: "green" }}>
													✓ {i18n.t("settings.settings.storage.lastMigration")}: {migrationStatus.migrated} {i18n.t("settings.settings.storage.migrated")}, {migrationStatus.skipped || 0} {i18n.t("settings.settings.storage.skipped")}
												</Typography>
											</Box>
										)}
									</Box>

									{/* Sync stats */}
									{storageSyncStats && (
										<>
											<div className={classes.storageStats}>
												{/* S3 files count */}
												<Chip
													size="small"
													icon={<CloudUploadIcon />}
													label={`${i18n.t("settings.settings.storage.filesInS3")}: ${storageSyncStats.s3FilesCount || 0}`}
													color="primary"
												/>
												{/* Only show pending/failed if there are any */}
												{(storageSyncStats.pending > 0 || storageSyncStats.syncing > 0) && (
													<Chip
														size="small"
														label={`${i18n.t("settings.settings.storage.pending")}: ${storageSyncStats.pending || 0}`}
														variant="outlined"
														color="secondary"
													/>
												)}
												{storageSyncStats.syncing > 0 && (
													<Chip
														size="small"
														label={`${i18n.t("settings.settings.storage.syncing")}: ${storageSyncStats.syncing}`}
														variant="outlined"
														color="primary"
													/>
												)}
												{storageSyncStats.failed > 0 && (
													<Chip
														size="small"
														label={`${i18n.t("settings.settings.storage.failed")}: ${storageSyncStats.failed}`}
														variant="outlined"
														color="secondary"
													/>
												)}
											</div>

											{/* Only show sync button if there are pending uploads */}
											{(storageSyncStats.pending > 0 || storageSyncStats.failed > 0) && (
												<Button
													variant="contained"
													color="primary"
													startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
													onClick={handleSync}
													disabled={syncing || !storageStatus.isPrimaryHealthy}
													className={classes.syncButton}
												>
													{i18n.t("settings.settings.storage.syncButton")}
												</Button>
											)}
										</>
									)}
								</>
							)}
						</Paper>
					</div>
				)}
			</div>
        </div>
    );
};

export default Settings;
