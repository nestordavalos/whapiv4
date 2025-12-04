import React, { useState, useEffect, useContext, useMemo } from "react";

import * as Yup from "yup";
import {
    Formik,
    Form,
    Field
} from "formik";
import { toast } from "react-toastify";

import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    TextField,
} from "@mui/material";

import makeStyles from '@mui/styles/makeStyles';

import { Colorize } from "@mui/icons-material";
import { green } from "@mui/material/colors";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
    },
    dialog: {
        "& .MuiDialog-paper": {
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        },
    },
    dialogPaper: {
        maxWidth: 520,
    },
    dialogTitle: {
        padding: "20px 24px 16px",
        "& .MuiTypography-root": {
            fontWeight: 600,
            fontSize: "1.25rem",
            color: "#212529",
        },
    },
    dialogContent: {
        padding: "16px 24px",
    },
    multFieldLine: {
        display: "flex",
        "& > *:not(:last-child)": {
            marginRight: theme.spacing(1),
        },
    },
    textField: {
        "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            transition: "all 0.2s ease",
            "&:hover": {
                "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.primary.main,
                },
            },
            "&.Mui-focused": {
                boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
            },
        },
        "& .MuiInputLabel-root": {
            fontWeight: 500,
        },
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
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    colorAdorment: {
        width: 20,
        height: 20,
        borderRadius: "50%",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        border: "1px solid #fff",
    },
    colorPickerContainer: {
        marginTop: 16,
        padding: 16,
        borderRadius: 14,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.04)"
            : theme.palette.action.hover,
        display: "flex",
        justifyContent: "center",
    },
    colorPickerInner: {
        width: "100%",
        maxWidth: 320,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        margin: "0 auto",
    },
    swatchesGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(44px, 1fr))",
        gap: 8,
        width: "100%",
    },
    swatchButton: {
        width: "100%",
        height: 36,
        borderRadius: 10,
        border: `1px solid ${theme.palette.divider}`,
        cursor: "pointer",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
        },
    },
    swatchActive: {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
        boxShadow: `0 4px 12px ${theme.palette.primary.main}33`,
    },
    dialogActions: {
        padding: "16px 24px",
        gap: 8,
    },
    cancelButton: {
        borderRadius: 10,
        textTransform: "none",
        fontWeight: 500,
        padding: "8px 20px",
    },
    submitButton: {
        borderRadius: 10,
        textTransform: "none",
        fontWeight: 500,
        padding: "8px 20px",
        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.25)",
        "&:hover": {
            boxShadow: "0 4px 12px rgba(25, 118, 210, 0.35)",
        },
    },
    colorPickerButton: {
        borderRadius: 8,
        padding: 8,
        transition: "all 0.2s ease",
        "&:hover": {
            backgroundColor: "rgba(25, 118, 210, 0.1)",
            transform: "scale(1.1)",
        },
    },
}));

const TagSchema = Yup.object().shape({
    name: Yup.string()
        .min(3, "Mensagem muito curta")
        .required("Obrigatório")
});

const TagModal = ({ open, onClose, tagId, reload }) => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);

    const initialState = {
        name: "",
        color: ""
    };

    const [tag, setTag] = useState(initialState);
    const colorOptions = useMemo(
        () => [
            "#0071c1",
            "#2b9348",
            "#d72638",
            "#efb700",
            "#8b5cf6",
            "#ff7f50",
            "#0ea5e9",
            "#6366f1",
            "#0f172a",
            "#f59e0b",
            "#10b981",
            "#ec4899",
        ],
        []
    );

    useEffect(() => {
        try {
            (async () => {
                if (!tagId) return;

                const { data } = await api.get(`/tags/${tagId}`);
                setTag(prevState => {
                    return { ...prevState, ...data };
                });
            })()
        } catch (err) {
            toastError(err);
        }
    }, [tagId, open]);

    const handleClose = () => {
        setTag(initialState);
        setColorPickerModalOpen(false);
        onClose();
    };

    const handleSaveTag = async values => {
        const tagData = { ...values, userId: user.id };
        try {
            if (tagId) {
                await api.put(`/tags/${tagId}`, tagData);
            } else {
                await api.post("/tags", tagData);
            }
            toast.success(i18n.t("tagModal.success"));
            if (typeof reload == 'function') {
                reload();
            }
        } catch (err) {
            toastError(err);
        }
        handleClose();
    };

    return (
        <div className={classes.root}>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                scroll="paper"
                className={classes.dialog}
                PaperProps={{ className: classes.dialogPaper }}
            >
                <DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
                    {(tagId ? `${i18n.t("tagModal.title.edit")}` : `${i18n.t("tagModal.title.add")}`)}
                </DialogTitle>
                <Formik
                    initialValues={tag}
                    enableReinitialize={true}
                    validationSchema={TagSchema}
                    onSubmit={(values, actions) => {
                        setTimeout(() => {
                            handleSaveTag(values);
                            actions.setSubmitting(false);
                        }, 400);
                    }}
                >
                    {({ touched, errors, isSubmitting, values, setFieldValue }) => (
                        <Form>
                            <DialogContent dividers className={classes.dialogContent}>
                                <div className={classes.multFieldLine}>
                                    <Field
                                        as={TextField}
                                        label={i18n.t("tagModal.form.name")}
                                        name="name"
                                        error={touched.name && Boolean(errors.name)}
                                        helperText={touched.name && errors.name}
                                        variant="outlined"
                                        margin="dense"
                                        onChange={(e) => setTag(prev => ({ ...prev, name: e.target.value }))}
                                        fullWidth
                                        className={classes.textField}
                                    />
                                </div>
                                <br />
                                <div className={classes.multFieldLine}>
                                    <Field
                                        as={TextField}
                                        fullWidth
                                        label={i18n.t("tagModal.form.color")}
                                        name="color"
                                        id="color"
                                        error={touched.color && Boolean(errors.color)}
                                        helperText={touched.color && errors.color}
                                        className={classes.textField}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <div
                                                        style={{ backgroundColor: values.color || tag.color }}
                                                        className={classes.colorAdorment}
                                                    ></div>
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => setColorPickerModalOpen(!colorPickerModalOpen)}
                                                    className={classes.colorPickerButton}
                                                >
                                                    <Colorize />
                                                </IconButton>
                                            ),
                                        }}
                                        variant="outlined"
                                        margin="dense"
                                    />
                                </div>

                                {colorPickerModalOpen && (
                                    <div className={classes.colorPickerContainer}>
                                        <div className={classes.colorPickerInner}>
                                            <div className={classes.swatchesGrid}>
                                                {colorOptions.map(color => {
                                                    const active = (values.color || tag.color || "").toUpperCase() === color.toUpperCase();
                                                    return (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            className={`${classes.swatchButton} ${active ? classes.swatchActive : ""}`}
                                                            style={{ backgroundColor: color }}
                                                            onClick={() => {
                                                                setTag(prev => ({ ...prev, color }));
                                                                setFieldValue("color", color);
                                                            }}
                                                            aria-label={color}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <input
                                                type="color"
                                                value={(values.color || tag.color || "#0071c1").toUpperCase()}
                                                onChange={e => {
                                                    const hexValue = e.target.value;
                                                    setTag(prev => ({ ...prev, color: hexValue }));
                                                    setFieldValue("color", hexValue);
                                                }}
                                                style={{
                                                    width: "100%",
                                                    height: 48,
                                                    border: `1px solid ${"#00000022"}`,
                                                    borderRadius: 12,
                                                    cursor: "pointer",
                                                    background: "none",
                                                    padding: 8,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                            <DialogActions className={classes.dialogActions}>
                                <Button
                                    onClick={handleClose}
                                    color="secondary"
                                    disabled={isSubmitting}
                                    variant="outlined"
                                    className={classes.cancelButton}
                                >
                                    {i18n.t("tagModal.buttons.cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={isSubmitting}
                                    variant="contained"
                                    className={`${classes.btnWrapper} ${classes.submitButton}`}
                                >
                                    {tagId
                                        ? `${i18n.t("tagModal.buttons.okEdit")}`
                                        : `${i18n.t("tagModal.buttons.okAdd")}`}
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

export default TagModal;
