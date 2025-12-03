import React, { useState, useContext } from "react";
import { useHistory } from "react-router-dom";

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
} from "@mui/material";


import makeStyles from '@mui/styles/makeStyles';


import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import ButtonWithSpinner from "../ButtonWithSpinner";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

// const filter = createFilterOptions({
// 	trim: true,
// });

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
		textTransform: "none",
		fontWeight: 500,
		borderRadius: 8,
		padding: "8px 20px",
	},
	dialog: {
		"& .MuiDialog-paper": {
			borderRadius: 12,
			minWidth: 340,
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
	},
	dialogActions: {
		padding: "12px 24px 20px",
		gap: 8,
	},
	formControl: {
		width: "100%",
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

const AcceptTicketWithouSelectQueue = ({ modalOpen, onClose, ticketId }) => {
	const history = useHistory();
	const classes = useStyles();
	const [selectedQueue, setSelectedQueue] = useState('');
	const [loading, setLoading] = useState(false);
	const { user } = useContext(AuthContext);

const handleClose = () => {
	onClose();
	setSelectedQueue("");
};

const handleUpdateTicketStatus = async (queueId) => {
	setLoading(true);
	try {
		await api.put(`/tickets/${ticketId}`, {
			status: "open",
			userId: user?.id || null,
            queueId: queueId
		});

		setLoading(false);
		history.push(`/tickets/${ticketId}`);
        handleClose();
	} catch (err) {
		setLoading(false);
		toastError(err);
	}
};

return (
	<>
		<Dialog open={modalOpen} onClose={handleClose} className={classes.dialog}>
			<DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
				{i18n.t("ticketsList.acceptModal.title")}
			</DialogTitle>
			<DialogContent className={classes.dialogContent}>
				<FormControl variant="outlined" className={classes.formControl}>
					<InputLabel>{i18n.t("ticketsList.acceptModal.queue")}</InputLabel>
					<Select
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
					className={classes.buttonColorError}
					disabled={loading}
					variant="outlined"
				>
					{i18n.t("ticketsList.buttons.cancel")}
				</Button>
				<ButtonWithSpinner
					variant="contained"
					type="button"
					disabled={(selectedQueue === "")}
					onClick={() => handleUpdateTicketStatus(selectedQueue)}
					color="primary"
					loading={loading}
					className={classes.saveButton}
				>
					{i18n.t("ticketsList.buttons.start")}
				</ButtonWithSpinner>
			</DialogActions>
		</Dialog>
	</>
);
};

export default AcceptTicketWithouSelectQueue;