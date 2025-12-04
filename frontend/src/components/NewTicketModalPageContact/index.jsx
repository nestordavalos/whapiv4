import React, { useState, useEffect, useContext } from "react";

import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";

import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Autocomplete, {
	createFilterOptions,
} from '@mui/material/Autocomplete';
import CircularProgress from "@mui/material/CircularProgress";
import makeStyles from '@mui/styles/makeStyles';

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ContactModal from "../ContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { Grid, ListItemText, MenuItem, Select, Typography } from "@mui/material";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
	root: {
		"& .MuiDialog-paper": {
			borderRadius: 16,
			boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
			minWidth: 380,
		},
	},
	title: {
		padding: "20px 24px 16px",
		borderBottom: `1px solid ${theme.palette.divider}`,
		"& .MuiTypography-root": {
			fontSize: "1.15rem",
			fontWeight: 600,
		},
	},
	content: {
		padding: "20px 24px",
	},
	actions: {
		padding: "16px 24px 20px",
		borderTop: `1px solid ${theme.palette.divider}`,
		gap: 8,
	},
	fieldLabel: {
		fontSize: "0.8rem",
		fontWeight: 600,
		color: theme.palette.text.secondary,
		marginBottom: 8,
		display: "block",
	},
	autocomplete: {
		"& .MuiOutlinedInput-root": {
			borderRadius: 10,
			backgroundColor: theme.palette.background.paper,
			"& fieldset": {
				borderColor: theme.palette.divider,
			},
			"&:hover fieldset": {
				borderColor: theme.palette.primary.main,
			},
			"&.Mui-focused fieldset": {
				borderColor: theme.palette.primary.main,
				borderWidth: 1,
			},
		},
	},
	select: {
		borderRadius: 10,
		backgroundColor: theme.palette.background.paper,
		"& .MuiOutlinedInput-notchedOutline": {
			borderColor: theme.palette.divider,
		},
		"&:hover .MuiOutlinedInput-notchedOutline": {
			borderColor: theme.palette.primary.main,
		},
		"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
			borderColor: theme.palette.primary.main,
			borderWidth: 1,
		},
	},
	cancelButton: {
		borderRadius: 10,
		padding: "10px 24px",
		textTransform: "none",
		fontWeight: 500,
		fontSize: "0.9rem",
	},
	submitButton: {
		borderRadius: 10,
		padding: "10px 24px",
		textTransform: "none",
		fontWeight: 500,
		fontSize: "0.9rem",
		boxShadow: "none",
		"&:hover": {
			boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
		},
	},
	menuItem: {
		borderRadius: 8,
		margin: "2px 8px",
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
		"&.Mui-selected": {
			backgroundColor: theme.palette.primary.main + "14",
		},
	},
}));

const filter = createFilterOptions({
	trim: true,
});

const NewTicketModalPageContact = ({ modalOpen, onClose, initialContact }) => {
	const classes = useStyles();
	const [options, setOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchParam, setSearchParam] = useState("");
	const [selectedContact, setSelectedContact] = useState(null);
	const [selectedQueue, setSelectedQueue] = useState("");
	const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
	const [newContact, setNewContact] = useState({});
	const [contactModalOpen, setContactModalOpen] = useState(false);
	const { user } = useContext(AuthContext);
	const { whatsApps } = useContext(WhatsAppsContext);

	const getDefaultWhatsappId = () => {
		if (user?.whatsapp?.id) {
			return user.whatsapp.id;
		}
		const defaultConnection = whatsApps?.find((connection) => connection?.isDefault);
		return defaultConnection?.id || "";
	};

	useEffect(() => {
		if (!modalOpen) return;
		setSelectedWhatsapp(getDefaultWhatsappId());
	}, [modalOpen, user, whatsApps]);

	useEffect(() => {
		if (initialContact?.id !== undefined) {
			setOptions([initialContact]);
			setSelectedContact(initialContact);
		}
	}, [initialContact]);

	useEffect(() => {
		if (!modalOpen) {
			setLoading(false);
			return;
		}
		setLoading(true);
		const delayDebounceFn = setTimeout(() => {
			const fetchContacts = async () => {
				try {
					const term = searchParam.trim();
					const numericTerm = term.replace(/\D/g, "");
					const query = numericTerm.length >= 3 ? numericTerm : term;
					const { data } = await api.get("contacts", {
						params: { searchParam: query },
					});
					setOptions(data.contacts);
				} catch (err) {
					toastError(err);
				} finally {
					setLoading(false);
				}
			};

			fetchContacts();
		}, 400);
		return () => {
			clearTimeout(delayDebounceFn);
			setLoading(false);
		};
	}, [searchParam, modalOpen]);

	const handleClose = () => {
		onClose();
		setSearchParam("");
		setSelectedContact(null);
		setSelectedWhatsapp(getDefaultWhatsappId());
	};

	const handleSaveTicket = async contactId => {
		if (!contactId) return;
		if (selectedQueue === "" && user.profile !== 'admin') {
			toast.error("Selecione um Sector");
			return;
		}
		const connectionActive = isConnectionActive(selectedWhatsapp);
		if (!connectionActive) {
			toast.error(i18n.t("notifications.connectionOffline") || "La conexión no está conectada.");
			return;
		}
		setLoading(true);
		try {
			const queueId = selectedQueue !== "" ? selectedQueue : null;
			const payload = {
				contactId: contactId,
				queueId,
				userId: user.id,
				status: "open",
			};
			if (selectedWhatsapp) {
				payload.whatsappId = selectedWhatsapp;
			}
			const { data: ticket } = await api.post("/tickets", payload);
			onClose(ticket);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	};

	const handleSelectOption = (e, newValue) => {
		if (newValue?.number) {
			setSelectedContact(newValue);
		} else if (newValue?.name) {
			setNewContact({ name: newValue.name });
			setContactModalOpen(true);
		}
	};

	const handleCloseContactModal = () => {
		setContactModalOpen(false);
	};

	const handleAddNewContactTicket = contact => {
		handleSaveTicket(contact.id);
	};

	const createAddContactOption = (filterOptions, params) => {
		const filtered = filter(filterOptions, params);

		if (params.inputValue !== "" && !loading) {
			const label = params.inputValue || searchParam;
			const alreadyExists = filtered.some(opt => opt?.name === label || opt?.number === label);
			if (!alreadyExists) {
				filtered.push({ name: label });
			}
		}

		return filtered;
	};

	const formatOptionText = option => {
		if (typeof option === "string") return option;
		const name = option?.name || "";
		const number = option?.number || "";
		if (name && number) return `${name} - ${number}`;
		return name || number || searchParam;
	};

	const isExistingContact = option => typeof option === "object" && !!option?.number;

	const renderOption = (props, option) => {
		const label = isExistingContact(option)
			? formatOptionText(option)
			: `${i18n.t("newTicketModal.add")} ${formatOptionText(option)}`;
		return (
			<li {...props} key={option?.id || option?.number || label}>
				{label}
			</li>
		);
	};

	const renderOptionLabel = option => {
		if (isExistingContact(option)) {
			return formatOptionText(option);
		}
		return option?.name || option?.number || searchParam;
	};

	const formatConnectionLabel = connection => {
		if (!connection) return "";
		const status = connection.status ? ` - ${connection.status}` : "";
		return `${connection.name}${status}`;
	};

	const getStatusColor = (status) => {
		const map = {
			CONNECTED: "#2e7d32",
			OPENING: "#ed6c02",
			PAIRING: "#0288d1",
			DISCONNECTED: "#d32f2f",
			QR_CODE: "#0288d1",
			TIMEOUT: "#ed6c02",
		};
		return map[status] || "#757575";
	};

	const renderConnection = (connection) => {
		if (!connection) return null;
		const status = connection.status || "UNKNOWN";
		const color = getStatusColor(status);
		return (
			<span style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<span
					style={{
						width: 10,
						height: 10,
						borderRadius: "50%",
						backgroundColor: color,
						display: "inline-block",
						flexShrink: 0,
					}}
				/>
				<span>{`${connection.name} - ${status}`}</span>
			</span>
		);
	};

	const isConnectionActive = (connectionId) => {
		if (!connectionId) return false;
		const connection = whatsApps?.find(c => c.id === connectionId);
		return connection?.status === "CONNECTED";
	};

	const renderContactAutocomplete = () => {
		if (initialContact === undefined || initialContact.id === undefined) {
			return (
				<Grid xs={12} item>
					<Typography className={classes.fieldLabel}>
						{i18n.t("newTicketModal.fieldLabel")}
					</Typography>
					<Autocomplete
						fullWidth
						options={options}
						loading={loading}
						clearOnBlur
						autoHighlight
						freeSolo
						clearOnEscape
						getOptionLabel={renderOptionLabel}
						renderOption={renderOption}
						isOptionEqualToValue={(option, value) =>
							option?.id === value?.id || option?.number === value?.number
						}
						filterOptions={createAddContactOption}
						onChange={(e, newValue) => handleSelectOption(e, newValue)}
						className={classes.autocomplete}
						renderInput={params => (
							<TextField
								{...params}
								placeholder="Buscar contacto..."
								variant="outlined"
								size="small"

								onChange={e => setSearchParam(e.target.value)}
								onKeyPress={e => {
									if (loading || !selectedContact) return;
									else if (e.key === "Enter") {
										handleSaveTicket(selectedContact.id);
									}
								}}
								InputProps={{
									...params.InputProps,
									endAdornment: (
										<React.Fragment>
											{loading ? (
												<CircularProgress color="inherit" size={20} />
											) : null}
											{params.InputProps.endAdornment}
										</React.Fragment>
									),
								}}
							/>
						)}
					/>
				</Grid>
			)
		}
		return null;
	}

	return (
		<>
			<ContactModal
				open={contactModalOpen}
				initialValues={newContact}
				onClose={handleCloseContactModal}
				onSave={handleAddNewContactTicket}
			></ContactModal>
			<Dialog open={modalOpen} onClose={handleClose} className={classes.root}>
				<DialogTitle id="form-dialog-title" className={classes.title}>
					{i18n.t("newTicketModal.title")}
				</DialogTitle>
				<DialogContent dividers className={classes.content}>
					<Grid container spacing={2}>
						{renderContactAutocomplete()}
						<Grid xs={12} item>
							<Typography className={classes.fieldLabel}>
								{i18n.t("newTicketModal.connectionLabel")}
							</Typography>
							<Select
								fullWidth
								displayEmpty
								variant="outlined"
								value={selectedWhatsapp}
								className={classes.select}
								onChange={(e) => {
									setSelectedWhatsapp(e.target.value)
								}}
								MenuProps={{
									anchorOrigin: {
										vertical: "bottom",
										horizontal: "left",
									},
									transformOrigin: {
										vertical: "top",
										horizontal: "left",
									},
									PaperProps: {
										style: {
											borderRadius: 12,
											marginTop: 4,
											boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
										},
									},
								}}
								renderValue={() => {
									if (selectedWhatsapp === "") {
										return <span style={{ color: "#999" }}>{i18n.t("newTicketModal.connectionPlaceholder")}</span>
									}
									const connection = whatsApps?.find(c => c.id === selectedWhatsapp)
									return renderConnection(connection) || ""
								}}
							>
								{whatsApps?.length > 0 &&
									whatsApps.map((connection) => (
										<MenuItem dense key={connection.id} value={connection.id} className={classes.menuItem}>
											<ListItemText primary={renderConnection(connection)} />
										</MenuItem>
									))}
							</Select>
						</Grid>
						<Grid xs={12} item>
							<Typography className={classes.fieldLabel}>
								Sector
							</Typography>
							<Select
								fullWidth
								displayEmpty
								variant="outlined"
								value={selectedQueue}
								className={classes.select}
								onChange={(e) => {
									setSelectedQueue(e.target.value)
								}}
								MenuProps={{
									anchorOrigin: {
										vertical: "bottom",
										horizontal: "left",
									},
									transformOrigin: {
										vertical: "top",
										horizontal: "left",
									},
									PaperProps: {
										style: {
											borderRadius: 12,
											marginTop: 4,
											boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
										},
									},
								}}
								renderValue={() => {
									if (selectedQueue === "") {
										return <span style={{ color: "#999" }}>Seleccione un sector</span>
									}
									const queue = user.queues.find(q => q.id === selectedQueue)
									return queue.name
								}}
							>
								{user.queues?.length > 0 &&
									user.queues.map((queue, key) => (
										<MenuItem dense key={key} value={queue.id} className={classes.menuItem}>
											<ListItemText primary={queue.name} />
										</MenuItem>
									))}
							</Select>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions className={classes.actions}>
					<Button
						onClick={handleClose}
						color="secondary"
						disabled={loading}
						variant="outlined"
						className={classes.cancelButton}
					>
						{i18n.t("newTicketModal.buttons.cancel")}
					</Button>
					<ButtonWithSpinner
						variant="contained"
						type="button"
						disabled={!selectedContact || !isConnectionActive(selectedWhatsapp)}
						onClick={() => handleSaveTicket(selectedContact.id)}
						color="primary"
						loading={loading}
						className={classes.submitButton}
					>
						{i18n.t("newTicketModal.buttons.ok")}
					</ButtonWithSpinner>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default NewTicketModalPageContact;
