import React, { useState, useEffect } from "react";
import openSocket from "../../services/socket-io";
import { useHistory } from "react-router-dom";

import { makeStyles, withStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Select from "@material-ui/core/Select";
import { toast } from "react-toastify";

import Tooltip from "@material-ui/core/Tooltip";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

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
		[theme.breakpoints.down("sm")]: {
			maxWidth: "100%",
			padding: theme.spacing(0, 1),
		},
	},
	columnsWrapper: {
		display: "flex",
		gap: theme.spacing(3),
		[theme.breakpoints.down('sm')]: {
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

	const [settings, setSettings] = useState([]);

	useEffect(() => {
		const fetchSession = async () => {
			try {
				const { data } = await api.get("/settings");
				setSettings(data);
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, []);

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
			</div>
		</div>
	);
};

export default Settings;