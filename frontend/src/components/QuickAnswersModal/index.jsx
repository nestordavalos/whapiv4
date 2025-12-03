import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";
import WithSkeleton from "../WithSkeleton";
import MessageVariablesPicker from "../MessageVariablesPicker";
import ButtonWithSpinner from "../ButtonWithSpinner";
import FormikTextField from "../FormikTextField";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
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
  fieldLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: 8,
    display: "block",
  },
  textField: {
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
  actions: {
    padding: "16px 24px 20px",
    borderTop: `1px solid ${theme.palette.divider}`,
    gap: 8,
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
  variablesPicker: {
    marginTop: 12,
  },
}));

const QuickAnswerSchema = Yup.object().shape({
  shortcut: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  message: Yup.string()
    .min(8, "Too Short!")
    .max(30000, "Too Long!")
    .required("Required"),
});

const QuickAnswersModal = ({
  open,
  onClose,
  onSave,
  quickAnswerId,
  initialValues
}) => {
  const classes = useStyles();

  const initialState = {
    shortcut: "",
    message: "",
  };

  const isMounted = useRef(true);
  const messageInputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [quickAnswer, setQuickAnswer] = useState(initialState);

  useEffect(() => {
    return () => {
      isMounted.current = false; 
    };
  }, []);

  useEffect(() => {
    if (initialValues && isMounted.current) {
      setQuickAnswer(prevState => {
        return { ...prevState, ...initialValues  };
      });
    }

(async () => {
      if (!quickAnswerId) return ;
      
      setLoading(true);
      try {
        const { data } = await api.get(`/quickAnswers/${quickAnswerId}`);
                if (!isMounted.current) return; 

        setQuickAnswer(prevState => {
          return { ...prevState, ...data };
        });
        
        setLoading(false);
      } catch (err) {
        setLoading(false);
        toastError(err);
      }       
    })();    
    setQuickAnswer(initialState);
    // eslint-disable-next-line
  }, [quickAnswerId, open, initialValues]);

  const handleSaveQuickAnswer = async values => {
    try {
      if (quickAnswerId) {
        await api.put(`/quickAnswers/${quickAnswerId}`, values);
        onClose();
      } else {
        const { data } = await api.post("/quickAnswers", values);
        if (onSave) {
          onSave(data);
        }
        onClose();
      }
      toast.success(i18n.t("quickAnswersModal.success"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleClickMsgVar = async (msgVar, setValueFunc) => {
    const el = messageInputRef.current;
    const firstHalfText = el.value.substring(0, el.selectionStart);
    const secondHalfText = el.value.substring(el.selectionEnd);
    const newCursorPos = el.selectionStart + msgVar.length;

    setValueFunc("message", `${firstHalfText}${msgVar}${secondHalfText}`);

    await new Promise(r => setTimeout(r, 100));
    messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
  };

  return (
    <div className={classes.root}>
      <Dialog
        maxWidth="sm"
        fullWidth
        open={open}
        onClose={onClose}
        scroll="paper"
      >
        <DialogTitle className={classes.title}>
          {quickAnswerId
            ? i18n.t("quickAnswersModal.title.edit")
            : i18n.t("quickAnswersModal.title.add")}
        </DialogTitle>
        <Formik
          initialValues={quickAnswer}
          enableReinitialize={true}
          validationSchema={QuickAnswerSchema}
          onSubmit={handleSaveQuickAnswer}
        >
          {({ touched, errors, isSubmitting, setFieldValue }) => (
            <Form>
              <DialogContent dividers className={classes.content}>
                <WithSkeleton loading={loading}>
                  <FormikTextField
                    label={i18n.t("quickAnswersModal.form.shortcut")}

                    name="shortcut"
                    touched={touched}
                    errors={errors}
                    variant="outlined"
                    size="small"
                    disabled={isSubmitting}
                    className={classes.textField}
                  />
                </WithSkeleton>
                <WithSkeleton fullWidth loading={loading}>
                  <FormikTextField
                    label={i18n.t("quickAnswersModal.form.message")}
                    multiline
                    inputRef={messageInputRef}
                    minRows={5}
                    fullWidth
                    name="message"
                    touched={touched}
                    errors={errors}
                    variant="outlined"
                    size="small"
                    disabled={isSubmitting}
                    className={classes.textField}
                    style={{ marginTop: 16 }}
                  />
                </WithSkeleton>
                <div className={classes.variablesPicker}>
                  <WithSkeleton loading={loading}>
                    <MessageVariablesPicker
                      disabled={isSubmitting}
                      onClick={value => handleClickMsgVar(value, setFieldValue)}
                    />
                  </WithSkeleton>
                </div>
              </DialogContent>
              <DialogActions className={classes.actions}>
                <Button
                  onClick={onClose}
                  disabled={isSubmitting}
                  variant="outlined"
                  color="secondary"
                  className={classes.cancelButton}
                >
                  {i18n.t("quickAnswersModal.buttons.cancel")}
                </Button>
                <ButtonWithSpinner
                  type="submit"
                  color="primary"
                  disabled={loading || isSubmitting}
                  loading={isSubmitting}
                  variant="contained"
                  className={classes.submitButton}
                >
                  {quickAnswerId
                    ? i18n.t("quickAnswersModal.buttons.okEdit")
                    : i18n.t("quickAnswersModal.buttons.okAdd")}                  
                </ButtonWithSpinner>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default QuickAnswersModal;
