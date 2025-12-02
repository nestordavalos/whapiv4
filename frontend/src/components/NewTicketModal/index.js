import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";

import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Autocomplete, {
	createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ContactModal from "../ContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

import {
	FormControl,
	InputLabel,
	makeStyles,
	MenuItem,
	Select
} from "@material-ui/core";



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
	const [selectedQueue, setSelectedQueue] = useState('');
	const classes = useStyles();

	useEffect(() => {
		if (!modalOpen || searchParam.length < 3) {
			setLoading(false);
			return;
		}
		setLoading(true);
		const delayDebounceFn = setTimeout(() => {
			const fetchContacts = async () => {
				try {
					const { data } = await api.get("contacts", {
						params: { searchParam },
					});
					setOptions(data.contacts);
					setLoading(false);
				} catch (err) {
					setLoading(false);
					toastError(err);
				}
			};

			fetchContacts();
		}, 500);
		return () => clearTimeout(delayDebounceFn);
	}, [searchParam, modalOpen]);

	const handleClose = () => {
		onClose();
		setSearchParam("");
		setSelectedContact(null);
	};

	const handleSaveTicket = async contactId => {
		if (!contactId) return;
		setLoading(true);
		try {
			const { data: ticket } = await api.post("/tickets", {
				contactId: contactId,
				userId: user.id,
				status: "open",
				queueId: selectedQueue
			});
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

		if (params.inputValue !== "" && !loading && searchParam.length >= 3) {
			filtered.push({
				name: `${params.inputValue}`,
			});
		}

		return filtered;
	};

	const renderOption = option => {
		if (option.number) {
			return `${option.name} - ${option.number}`;
		} else {
			return `${i18n.t("newTicketModal.add")} ${option.name}`;
		}
	};

	const renderOptionLabel = option => {
		if (option.number) {
			return `${option.name} - ${option.number}`;
		} else {
			return `${option.name}`;
		}
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
						filterOptions={createAddContactOption}
						onChange={(e, newValue) => handleSelectOption(e, newValue)}
						className={classes.input}
						renderInput={params => (
							<TextField
								{...params}
								label={i18n.t("newTicketModal.fieldLabel")}
								variant="outlined"
								autoFocus
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
						<InputLabel>{i18n.t("ticketsList.acceptModal.queue")}</InputLabel>
						<Select
							autoHighlight
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
						disabled={!selectedContact || !selectedQueue}
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
