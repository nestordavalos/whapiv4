import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Typography,
} from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    minWidth: 400,
  },
  timeWarning: {
    color: theme.palette.warning.main,
    fontSize: "0.85rem",
    marginTop: theme.spacing(1),
  },
  timeExpired: {
    color: theme.palette.error.main,
    fontSize: "0.85rem",
    marginTop: theme.spacing(1),
  },
  charCount: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    textAlign: "right",
    marginTop: theme.spacing(0.5),
  },
}));

// Tiempo máximo para editar (15 minutos en milisegundos)
const MAX_EDIT_TIME_MS = 15 * 60 * 1000;

const EditMessageModal = ({ open, onClose, message }) => {
  const classes = useStyles();
  const [newBody, setNewBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeRemaining = useCallback(() => {
    if (!message || !message.createdAt) return;

    const messageCreatedAt = new Date(message.createdAt).getTime();
    const currentTime = Date.now();
    const elapsedTime = currentTime - messageCreatedAt;
    const remaining = MAX_EDIT_TIME_MS - elapsedTime;

    if (remaining <= 0) {
      setIsExpired(true);
      setTimeRemaining(0);
    } else {
      setIsExpired(false);
      setTimeRemaining(remaining);
    }
  }, [message]);

  useEffect(() => {
    if (message && open) {
      setNewBody(message.body || "");
      calculateTimeRemaining();
    }
  }, [message, open, calculateTimeRemaining]);

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      calculateTimeRemaining();
    }, 1000);

    return () => clearInterval(interval);
  }, [open, calculateTimeRemaining]);

  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleEditMessage = async () => {
    if (!newBody.trim() || isExpired) return;

    setLoading(true);
    try {
      await api.put(`/messages/${message.id}`, { body: newBody.trim() });
      toast.success(i18n.t("editMessageModal.success"));
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNewBody("");
      onClose();
    }
  };

  const hasChanges = message && newBody.trim() !== message.body;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="edit-message-dialog-title"
    >
      <DialogTitle id="edit-message-dialog-title">
        {i18n.t("editMessageModal.title")}
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <TextField

          multiline
          minRows={4}
          variant="outlined"
          fullWidth
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          disabled={loading || isExpired}
          placeholder={i18n.t("editMessageModal.placeholder")}
          label={i18n.t("editMessageModal.messageLabel")}
        />
        <div className={classes.charCount}>
          {newBody.length} {i18n.t("editMessageModal.characters")}
        </div>
        {isExpired ? (
          <Typography className={classes.timeExpired}>
            {i18n.t("editMessageModal.timeExpired")}
          </Typography>
        ) : (
          timeRemaining !== null && (
            <Typography
              className={
                timeRemaining < 60000 ? classes.timeExpired : classes.timeWarning
              }
            >
              {i18n.t("editMessageModal.timeRemaining")}: {formatTimeRemaining(timeRemaining)}
            </Typography>
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {i18n.t("editMessageModal.cancel")}
        </Button>
        <Button
          onClick={handleEditMessage}
          color="primary"
          variant="contained"
          disabled={loading || isExpired || !hasChanges || !newBody.trim()}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            i18n.t("editMessageModal.save")
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditMessageModal;
