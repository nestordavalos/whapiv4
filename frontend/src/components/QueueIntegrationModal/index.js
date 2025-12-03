import React, { useState, useEffect } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  makeStyles,
  TextField,
  Typography,
  Divider,
  Grid
} from "@material-ui/core";

import { green } from "@material-ui/core/colors";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
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
  textField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
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
  sectionTitle: {
    fontWeight: 600,
    fontSize: "0.9rem",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  divider: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  helperText: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginTop: 4,
  },
}));

const IntegrationSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Demasiado corto!")
    .max(50, "Demasiado largo!")
    .required("Requerido"),
  typebotUrl: Yup.string().required("Requerido"),
  typebotSlug: Yup.string().required("Requerido"),
});

const QueueIntegrationModal = ({ open, onClose, integrationId, reload }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    typebotUrl: "",
    typebotSlug: "",
    typebotExpires: 0,
    typebotKeywordFinish: "#finalizar",
    typebotKeywordRestart: "#reiniciar",
    typebotUnknownMessage: "No entendí tu mensaje. Por favor, intenta de nuevo.",
    typebotRestartMessage: "La conversación ha sido reiniciada.",
    typebotDelayMessage: 1000,
  };

  const [integration, setIntegration] = useState(initialState);

  useEffect(() => {
    const fetchIntegration = async () => {
      if (!integrationId) {
        setIntegration(initialState);
        return;
      }
      try {
        const { data } = await api.get(`/queue-integrations/${integrationId}`);
        setIntegration(data);
      } catch (err) {
        toastError(err);
      }
    };
    fetchIntegration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationId, open]);

  const handleClose = () => {
    setIntegration(initialState);
    onClose();
  };

  const handleSaveIntegration = async (values) => {
    try {
      if (integrationId) {
        await api.put(`/queue-integrations/${integrationId}`, values);
        toast.success(i18n.t("queueIntegrationModal.success.edit"));
      } else {
        await api.post("/queue-integrations", values);
        toast.success(i18n.t("queueIntegrationModal.success.add"));
      }
      if (typeof reload === "function") {
        reload();
      }
      handleClose();
    } catch (err) {
      toastError(err);
    }
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
      >
        <DialogTitle className={classes.dialogTitle}>
          {integrationId
            ? i18n.t("queueIntegrationModal.title.edit")
            : i18n.t("queueIntegrationModal.title.add")}
        </DialogTitle>
        <Formik
          initialValues={integration}
          enableReinitialize={true}
          validationSchema={IntegrationSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveIntegration(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting }) => (
            <Form>
              <DialogContent dividers className={classes.dialogContent}>
                <Field
                  as={TextField}
                  label={i18n.t("queueIntegrationModal.form.name")}
                  autoFocus
                  name="name"
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                  variant="outlined"
                  margin="dense"
                  required
                  fullWidth
                  className={classes.textField}
                />

                <Divider className={classes.divider} />
                <Typography className={classes.sectionTitle}>
                  {i18n.t("queueIntegrationModal.form.typebotSettings")}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueIntegrationModal.form.typebotUrl")}
                      name="typebotUrl"
                      error={touched.typebotUrl && Boolean(errors.typebotUrl)}
                      helperText={touched.typebotUrl ? errors.typebotUrl : i18n.t("queueIntegrationModal.form.typebotUrlHelper")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      required
                      placeholder="https://typebot.example.com"
                      className={classes.textField}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueIntegrationModal.form.typebotSlug")}
                      name="typebotSlug"
                      error={touched.typebotSlug && Boolean(errors.typebotSlug)}
                      helperText={touched.typebotSlug ? errors.typebotSlug : i18n.t("queueIntegrationModal.form.typebotSlugHelper")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      required
                      className={classes.textField}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueIntegrationModal.form.typebotExpires")}
                      name="typebotExpires"
                      type="number"
                      error={touched.typebotExpires && Boolean(errors.typebotExpires)}
                      helperText={i18n.t("queueIntegrationModal.form.typebotExpiresHelper")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.textField}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueIntegrationModal.form.typebotDelayMessage")}
                      name="typebotDelayMessage"
                      type="number"
                      error={touched.typebotDelayMessage && Boolean(errors.typebotDelayMessage)}
                      helperText={i18n.t("queueIntegrationModal.form.typebotDelayMessageHelper")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.textField}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueIntegrationModal.form.typebotKeywordFinish")}
                      name="typebotKeywordFinish"
                      error={touched.typebotKeywordFinish && Boolean(errors.typebotKeywordFinish)}
                      helperText={i18n.t("queueIntegrationModal.form.typebotKeywordFinishHelper")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.textField}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueIntegrationModal.form.typebotKeywordRestart")}
                      name="typebotKeywordRestart"
                      error={touched.typebotKeywordRestart && Boolean(errors.typebotKeywordRestart)}
                      helperText={i18n.t("queueIntegrationModal.form.typebotKeywordRestartHelper")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.textField}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueIntegrationModal.form.typebotUnknownMessage")}
                      name="typebotUnknownMessage"
                      error={touched.typebotUnknownMessage && Boolean(errors.typebotUnknownMessage)}
                      helperText={i18n.t("queueIntegrationModal.form.typebotUnknownMessageHelper")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      multiline
                      minRows={2}
                      className={classes.textField}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueIntegrationModal.form.typebotRestartMessage")}
                      name="typebotRestartMessage"
                      error={touched.typebotRestartMessage && Boolean(errors.typebotRestartMessage)}
                      helperText={i18n.t("queueIntegrationModal.form.typebotRestartMessageHelper")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      multiline
                      minRows={2}
                      className={classes.textField}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions className={classes.dialogActions}>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                  className={classes.cancelButton}
                >
                  {i18n.t("queueIntegrationModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={`${classes.btnWrapper} ${classes.submitButton}`}
                >
                  {integrationId
                    ? i18n.t("queueIntegrationModal.buttons.okEdit")
                    : i18n.t("queueIntegrationModal.buttons.okAdd")}
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

export default QueueIntegrationModal;
