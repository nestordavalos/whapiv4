import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, FieldArray, Form, Field } from "formik";
import { toast } from "react-toastify";

import makeStyles from '@mui/styles/makeStyles';
import { green } from "@mui/material/colors";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CircularProgress from "@mui/material/CircularProgress";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
		"& .MuiDialog-paper": {
			borderRadius: 16,
			boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
			minWidth: 450,
		},
		"& .MuiDialogTitle-root": {
			padding: "20px 24px 16px",
			borderBottom: `1px solid ${theme.palette.divider}`,
			"& .MuiTypography-root": {
				fontSize: "1.15rem",
				fontWeight: 600,
			},
		},
		"& .MuiDialogContent-root": {
			padding: "20px 24px",
		},
		"& .MuiDialogContent-dividers": {
			borderTop: "none",
			borderBottom: "none",
		},
		"& .MuiDialogActions-root": {
			padding: "16px 24px 20px",
			borderTop: `1px solid ${theme.palette.divider}`,
		},
	},
	formRow: {
		display: "flex",
		gap: 12,
		marginBottom: 12,
	},
	textField: {
		flex: 1,
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
		"& .MuiInputLabel-root": {
			fontSize: "0.9rem",
		},
		"& .MuiOutlinedInput-input": {
			padding: "12px 14px",
		},
	},
	extraAttr: {
		display: "flex",
		alignItems: "center",
		gap: 8,
		marginBottom: 8,
	},
	btnWrapper: {
		position: "relative",
	},
	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
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
	sectionTitle: {
		fontSize: "0.8rem",
		fontWeight: 600,
		color: theme.palette.text.secondary,
		textTransform: "uppercase",
		letterSpacing: "0.5px",
		marginBottom: 12,
		marginTop: 8,
	},
	addExtraButton: {
		flex: 1,
		marginTop: 8,
		borderRadius: 10,
		textTransform: "none",
		fontWeight: 500,
		padding: "10px 16px",
		borderStyle: "dashed",
	},
	deleteButton: {
		color: theme.palette.error.main,
		padding: 8,
		"&:hover": {
			backgroundColor: theme.palette.error.main + "14",
		},
	},
}));

const ContactSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
	number: Yup.string().min(8, "Too Short!").max(50, "Too Long!"),
	email: Yup.string().email("Invalid email"),
});

const ContactModal = ({ open, onClose, contactId, initialValues, onSave }) => {
	const classes = useStyles();
	const isMounted = useRef(true);

	const initialState = {
		name: "",
		number: "",
		email: "",
	};

	const [contact, setContact] = useState(initialState);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	useEffect(() => {
		const fetchContact = async () => {
			if (initialValues) {
				setContact(prevState => {
					return { ...prevState, ...initialValues };
				});
			}

			if (!contactId) return;

			try {
				const { data } = await api.get(`/contacts/${contactId}`);
				if (isMounted.current) {
					setContact(data);
				}
			} catch (err) {
				toastError(err);
			}
		};

		fetchContact();
	}, [contactId, open, initialValues]);

	const handleClose = () => {
		onClose();
		setContact(initialState);
	};

	const handleSaveContact = async values => {
		try {
			if (contactId) {
				await api.put(`/contacts/${contactId}`, values);
				handleClose();
			} else {
				const { data } = await api.post("/contacts", values);
				if (onSave) {
					onSave(data);
				}
				handleClose();
			}
			toast.success(i18n.t("contactModal.success"));
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.root}>
			<Dialog open={open} onClose={handleClose} maxWidth="lg" scroll="paper">
				<DialogTitle id="form-dialog-title">
					{contactId
						? `${i18n.t("contactModal.title.edit")}`
						: `${i18n.t("contactModal.title.add")}`}
				</DialogTitle>
				<Formik
					initialValues={contact}
					enableReinitialize={true}
					validationSchema={ContactSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveContact(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, errors, touched, isSubmitting }) => (
						<Form>
							<DialogContent dividers>
								<Typography variant="subtitle1" className={classes.sectionTitle}>
									{i18n.t("contactModal.form.mainInfo")}
								</Typography>
								<div className={classes.formRow}>
									<Field
										as={TextField}
										label={i18n.t("contactModal.form.name")}
										name="name"

										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										variant="outlined"
										size="small"
										className={classes.textField}
									/>
									<Field
										as={TextField}
										label={i18n.t("contactModal.form.number")}
										name="number"
										error={touched.number && Boolean(errors.number)}
										helperText={touched.number && errors.number}
										placeholder="5513912344321"
										variant="outlined"
										size="small"
										className={classes.textField}
									/>
								</div>
								<Field
									as={TextField}
									label={i18n.t("contactModal.form.email")}
									name="email"
									error={touched.email && Boolean(errors.email)}
									helperText={touched.email && errors.email}
									placeholder="correo@ejemplo.com"
									fullWidth
									size="small"
									variant="outlined"
									className={classes.textField}
								/>
								
								<Typography variant="subtitle1" className={classes.sectionTitle} style={{ marginTop: 20 }}>
									{i18n.t("contactModal.form.extraInfo")}
								</Typography>
								<FieldArray name="extraInfo">
									{({ push, remove }) => (
										<>
											{values.extraInfo &&
												values.extraInfo.length > 0 &&
												values.extraInfo.map((info, index) => (
													<div
														className={classes.extraAttr}
														key={`${index}-info`}
													>
														<Field
															as={TextField}
															label={i18n.t("contactModal.form.extraName")}
															name={`extraInfo[${index}].name`}
															variant="outlined"
															size="small"
															className={classes.textField}
														/>
														<Field
															as={TextField}
															label={i18n.t("contactModal.form.extraValue")}
															name={`extraInfo[${index}].value`}
															variant="outlined"
															size="small"
															className={classes.textField}
														/>
														<IconButton
															size="small"
															className={classes.deleteButton}
															onClick={() => remove(index)}
														>
															<DeleteOutlineIcon fontSize="small" />
														</IconButton>
													</div>
												))}
											<Button
												className={classes.addExtraButton}
												variant="outlined"
												color="primary"
												onClick={() => push({ name: "", value: "" })}
											>
												{`+ ${i18n.t("contactModal.buttons.addExtraInfo")}`}
											</Button>
										</>
									)}
								</FieldArray>
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
									className={classes.cancelButton}
								>
									{i18n.t("contactModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={`${classes.btnWrapper} ${classes.submitButton}`}
								>
									{contactId
										? `${i18n.t("contactModal.buttons.okEdit")}`
										: `${i18n.t("contactModal.buttons.okAdd")}`}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default ContactModal;
