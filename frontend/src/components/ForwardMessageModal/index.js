import React, { useState, useEffect } from "react";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Chip, makeStyles, Typography } from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
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
  forwardButton: {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 8,
    padding: "8px 24px",
    boxShadow: "none",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
    },
  },
  messagePreview: {
    backgroundColor: theme.palette.type === "dark" ? theme.palette.grey[800] : theme.palette.grey[100],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    maxHeight: 150,
    overflow: "auto",
  },
  previewLabel: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginBottom: 4,
  },
  previewText: {
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
    wordBreak: "break-word",
  },
  messagesCount: {
    marginBottom: 8,
  },
  messageItem: {
    padding: "6px 0",
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:last-child": {
      borderBottom: "none",
    },
  },
}));

const ForwardMessageModal = ({ open, onClose, messages = [] }) => {
  const classes = useStyles();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [forwarding, setForwarding] = useState(false);

  // Ensure messages is always an array
  const messageList = Array.isArray(messages) ? messages : (messages ? [messages] : []);

  useEffect(() => {
    if (!open || searchParam.length < 3) {
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
  }, [searchParam, open]);

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setSelectedContact(null);
    setOptions([]);
  };

  const handleForwardMessages = async () => {
    if (!selectedContact || messageList.length === 0) return;
    
    setForwarding(true);
    try {
      // Forward all messages sequentially
      for (const message of messageList) {
        await api.post(`/messages/${message.id}/forward`, {
          contactId: selectedContact.number,
        });
      }
      toast.success(
        messageList.length > 1 
          ? i18n.t("forwardMessageModal.successMultiple", { count: messageList.length })
          : i18n.t("forwardMessageModal.success")
      );
      handleClose();
    } catch (err) {
      toastError(err);
    }
    setForwarding(false);
  };

  const handleSelectOption = (e, newValue) => {
    setSelectedContact(newValue);
  };

  const renderOptionLabel = (option) => {
    if (option.number) {
      return `${option.name} - ${option.number}`;
    }
    return option.name || "";
  };

  const getMessagePreview = (message) => {
    if (!message) return "";
    if (message.mediaType) {
      const mediaTypes = {
        image: i18n.t("forwardMessageModal.mediaTypes.image"),
        video: i18n.t("forwardMessageModal.mediaTypes.video"),
        audio: i18n.t("forwardMessageModal.mediaTypes.audio"),
        application: i18n.t("forwardMessageModal.mediaTypes.document"),
      };
      return mediaTypes[message.mediaType] || `📎 ${message.mediaType}`;
    }
    return message.body || "";
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <Dialog open={open} onClose={handleClose} className={classes.dialog}>
      <DialogTitle className={classes.dialogTitle}>
        {i18n.t("forwardMessageModal.title")}
        {messageList.length > 1 && (
          <Chip 
            label={`${messageList.length} ${i18n.t("forwardMessageModal.messagesSelected")}`}
            size="small"
            color="primary"
            style={{ marginLeft: 10 }}
          />
        )}
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        {messageList.length > 0 && (
          <div className={classes.messagePreview}>
            <Typography className={classes.previewLabel}>
              {i18n.t("forwardMessageModal.messagePreview")}
            </Typography>
            {messageList.length === 1 ? (
              <Typography className={classes.previewText}>
                {getMessagePreview(messageList[0])}
              </Typography>
            ) : (
              messageList.slice(0, 5).map((msg, index) => (
                <div key={msg.id} className={classes.messageItem}>
                  <Typography className={classes.previewText}>
                    {index + 1}. {truncateText(getMessagePreview(msg))}
                  </Typography>
                </div>
              ))
            )}
            {messageList.length > 5 && (
              <Typography className={classes.previewLabel} style={{ marginTop: 8 }}>
                ... {i18n.t("forwardMessageModal.andMore", { count: messageList.length - 5 })}
              </Typography>
            )}
          </div>
        )}
        <Autocomplete
          options={options}
          loading={loading}
          fullWidth
          clearOnBlur
          autoHighlight
          getOptionLabel={renderOptionLabel}
          onChange={handleSelectOption}
          className={classes.input}
          renderInput={(params) => (
            <TextField
              {...params}
              label={i18n.t("forwardMessageModal.fieldLabel")}
              variant="outlined"
              autoFocus
              required
              onChange={(e) => setSearchParam(e.target.value)}
              onKeyPress={(e) => {
                if (forwarding || !selectedContact) return;
                if (e.key === "Enter") {
                  handleForwardMessages();
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
      </DialogContent>
      <DialogActions className={classes.dialogActions}>
        <Button
          onClick={handleClose}
          color="secondary"
          disabled={forwarding}
          variant="outlined"
          className={classes.cancelButton}
        >
          {i18n.t("forwardMessageModal.buttons.cancel")}
        </Button>
        <ButtonWithSpinner
          variant="contained"
          type="button"
          disabled={!selectedContact}
          onClick={handleForwardMessages}
          color="primary"
          loading={forwarding}
          className={classes.forwardButton}
        >
          {i18n.t("forwardMessageModal.buttons.forward")}
        </ButtonWithSpinner>
      </DialogActions>
    </Dialog>
  );
};

export default ForwardMessageModal;
