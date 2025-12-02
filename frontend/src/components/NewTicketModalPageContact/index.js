import React, { useState, useEffect, useContext } from "react";

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
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ContactModal from "../ContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Grid, ListItemText, MenuItem, Select, Typography } from "@material-ui/core";
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
	const [newContact, setNewContact] = useState({});
	const [contactModalOpen, setContactModalOpen] = useState(false);
	const { user } = useContext(AuthContext);

	useEffect(() => {
		if (initialContact?.id !== undefined) {
			setOptions([initialContact]);
			setSelectedContact(initialContact);
		}
	}, [initialContact]);

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
		if (selectedQueue === "" && user.profile !== 'admin') {
			toast.error("Selecione um Sector");
			return;
		}
		setLoading(true);
		try {
			const queueId = selectedQueue !== "" ? selectedQueue : null;
			const { data: ticket } = await api.post("/tickets", {
				contactId: contactId,
				queueId,
				userId: user.id,
				status: "open",
			});
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
						filterOptions={createAddContactOption}
						onChange={(e, newValue) => handleSelectOption(e, newValue)}
						className={classes.autocomplete}
						renderInput={params => (
							<TextField
								{...params}
								placeholder="Buscar contacto..."
								variant="outlined"
								size="small"
								autoFocus
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
									getContentAnchorEl: null,
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
						disabled={!selectedContact}
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
