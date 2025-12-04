import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";

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

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ContactModal from "../ContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { toast } from "react-toastify";

import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";



import makeStyles from '@mui/styles/makeStyles';



const useStyles = makeStyles((theme) => ({
	autoComplete: {
		width: "100%",
	},
	maxWidth: {
		width: "100%",
	},
	buttonColorError: {
		color: theme.palette.error.main,
		borderColor: theme.palette.error.main,
	},
	dialog: {
		"& .MuiDialog-paper": {
			borderRadius: 12,
			minWidth: 380,
		},
	},
	dialogTitle: {
		padding: "20px 24px 12px",
		"& .MuiTypography-root": {
			fontSize: "1.1rem",
			fontWeight: 600,
			color: theme.palette.text.primary,
		},
	},
	dialogContent: {
		padding: "16px 24px",
		display: "flex",
		flexDirection: "column",
		gap: 16,
	},
	dialogActions: {
		padding: "12px 24px 20px",
		gap: 8,
	},
	input: {
		"& .MuiOutlinedInput-root": {
			borderRadius: 10,
			"& fieldset": {
				borderColor: theme.palette.divider,
			},
			"&:hover fieldset": {
				borderColor: theme.palette.primary.light,
			},
			"&.Mui-focused fieldset": {
				borderColor: theme.palette.primary.main,
				borderWidth: 1,
			},
		},
		"& .MuiInputLabel-outlined": {
			fontSize: "0.9rem",
		},
	},
	cancelButton: {
		textTransform: "none",
		fontWeight: 500,
		borderRadius: 8,
		padding: "8px 20px",
	},
	saveButton: {
		textTransform: "none",
		fontWeight: 600,
		borderRadius: 8,
		padding: "8px 24px",
		boxShadow: "none",
		"&:hover": {
			boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
		},
	},
}));

const filter = createFilterOptions({
	trim: true,
});

const NewTicketModal = ({ modalOpen, onClose }) => {
	const history = useHistory();

	const [options, setOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchParam, setSearchParam] = useState("");
	const [selectedContact, setSelectedContact] = useState(null);
	const [newContact, setNewContact] = useState({});
	const [contactModalOpen, setContactModalOpen] = useState(false);
	const { user } = useContext(AuthContext);
	const { whatsApps } = useContext(WhatsAppsContext);
	const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
	const [selectedQueue, setSelectedQueue] = useState('');
	const classes = useStyles();

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
		const connectionActive = isConnectionActive(selectedWhatsapp);
		if (!connectionActive) {
			toast.error(i18n.t("notifications.connectionOffline") || "La conexión no está conectada.");
			return;
		}
		setLoading(true);
		try {
			const payload = {
				contactId: contactId,
				userId: user.id,
				status: "open",
				queueId: selectedQueue
			};
			if (selectedWhatsapp) {
				payload.whatsappId = selectedWhatsapp;
			}
			const { data: ticket } = await api.post("/tickets", payload);
			history.push(`/tickets/${ticket.id}`);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
		handleClose();
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

	return (
		<>
			<ContactModal
				open={contactModalOpen}
				initialValues={newContact}
				onClose={handleCloseContactModal}
				onSave={handleAddNewContactTicket}
			></ContactModal>
			<Dialog open={modalOpen} onClose={handleClose} className={classes.dialog}>
				<DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
					{i18n.t("newTicketModal.title")}
				</DialogTitle>
				<DialogContent className={classes.dialogContent}>
					<Autocomplete
						options={options}
						loading={loading}
						fullWidth
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
						className={classes.input}
						renderInput={params => (
							<TextField
								{...params}
								label={i18n.t("newTicketModal.fieldLabel")}
								variant="outlined"

								required
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

					<FormControl variant="outlined" className={`${classes.maxWidth} ${classes.input}`}>
						<InputLabel>{i18n.t("newTicketModal.connectionLabel")}</InputLabel>
						<Select
							value={selectedWhatsapp}
							onChange={(e) => setSelectedWhatsapp(e.target.value)}
							label={i18n.t("newTicketModal.connectionLabel")}
						>
							<MenuItem value={''}>&nbsp;</MenuItem>
							{whatsApps?.map((connection) => (
								<MenuItem key={connection.id} value={connection.id}>
									{renderConnection(connection)}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<FormControl variant="outlined" className={`${classes.maxWidth} ${classes.input}`}>
						<InputLabel>{i18n.t("ticketsList.acceptModal.queue")}</InputLabel>
						<Select
							required
							value={selectedQueue}
							onChange={(e) => setSelectedQueue(e.target.value)}
							label={i18n.t("ticketsList.acceptModal.queue")}
						>
							<MenuItem value={''}>&nbsp;</MenuItem>
							{user.queues.map((queue) => (
								<MenuItem key={queue.id} value={queue.id}>{queue.name}</MenuItem>
							))}
						</Select>
					</FormControl>
				</DialogContent>
				<DialogActions className={classes.dialogActions}>
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
						disabled={!selectedContact || !selectedQueue || !isConnectionActive(selectedWhatsapp)}
						onClick={() => handleSaveTicket(selectedContact.id)}
						color="primary"
						loading={loading}
						className={classes.saveButton}
					>
						{i18n.t("newTicketModal.buttons.ok")}
					</ButtonWithSpinner>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default NewTicketModal;
