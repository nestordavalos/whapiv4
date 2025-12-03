import React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import makeStyles from '@mui/styles/makeStyles';
import { Warning } from "@mui/icons-material";
import { Box } from "@mui/material";

import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
	root: {
		"& .MuiDialog-paper": {
			borderRadius: 16,
			boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
			minWidth: 360,
			maxWidth: 420,
		},
	},
	title: {
		padding: "24px 24px 16px",
		textAlign: "center",
		"& .MuiTypography-root": {
			fontSize: "1.1rem",
			fontWeight: 600,
		},
	},
	content: {
		padding: "0 24px 24px",
		textAlign: "center",
	},
	iconContainer: {
		display: "flex",
		justifyContent: "center",
		marginBottom: 16,
	},
	warningIcon: {
		fontSize: 48,
		color: theme.palette.warning.main,
		backgroundColor: theme.palette.warning.main + "18",
		borderRadius: "50%",
		padding: 12,
	},
	message: {
		fontSize: "0.95rem",
		color: theme.palette.text.secondary,
		lineHeight: 1.6,
	},
	actions: {
		padding: "16px 24px 24px",
		justifyContent: "center",
		gap: 12,
	},
	cancelButton: {
		borderRadius: 10,
		padding: "10px 28px",
		textTransform: "none",
		fontWeight: 500,
		fontSize: "0.9rem",
		backgroundColor: theme.palette.action.hover,
		color: theme.palette.text.primary,
		"&:hover": {
			backgroundColor: theme.palette.action.selected,
		},
	},
	confirmButton: {
		borderRadius: 10,
		padding: "10px 28px",
		textTransform: "none",
		fontWeight: 500,
		fontSize: "0.9rem",
		boxShadow: "none",
		backgroundColor: theme.palette.error.main,
		color: "#fff",
		"&:hover": {
			backgroundColor: theme.palette.error.dark,
			boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
		},
	},
}));

const ConfirmationModal = ({ title, children, open, onClose, onConfirm }) => {
	const classes = useStyles();
	
	return (
		<Dialog
			open={open}
			onClose={() => onClose(false)}
			aria-labelledby="confirm-dialog"
			className={classes.root}
		>
			<DialogTitle id="confirm-dialog" className={classes.title}>
				{title}
			</DialogTitle>
			<DialogContent className={classes.content}>
				<Box className={classes.iconContainer}>
					<Warning className={classes.warningIcon} />
				</Box>
				<Typography className={classes.message}>{children}</Typography>
			</DialogContent>
			<DialogActions className={classes.actions}>
				<Button
					variant="contained"
					onClick={() => onClose(false)}
					className={classes.cancelButton}
				>
					{i18n.t("confirmationModal.buttons.cancel")}
				</Button>
				<Button
					variant="contained"
					onClick={() => {
						onClose(false);
						onConfirm();
					}}
					className={classes.confirmButton}
				>
					{i18n.t("confirmationModal.buttons.confirm")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default ConfirmationModal;
