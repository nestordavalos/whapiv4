import React from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import { Warning } from "@material-ui/icons";
import { Box } from "@material-ui/core";

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
