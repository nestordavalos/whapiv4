import React, { useState, useContext } from "react";

import MenuItem from "@mui/material/MenuItem";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import ForwardMessageModal from "../ForwardMessageModal";
import EditMessageModal from "../EditMessageModal";
import { IconButton, Menu, Popover } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

// Tiempo máximo para editar un mensaje (15 minutos en milisegundos)
const MAX_EDIT_TIME_MS = 15 * 60 * 1000;

const MessageOptionsMenu = ({ message, menuOpen, handleClose, anchorEl, anchorPosition }) => {
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState(null);

  const handleDeleteMessage = async () => {
    try {
      await api.delete(`/messages/${message.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const hanldeReplyMessage = () => {
    setReplyingMessage(message);
    handleClose();
  };

  const handleOpenConfirmationModal = (e) => {
    setConfirmationOpen(true);
    handleClose();
  };

  const handleOpenForwardModal = () => {
    setForwardModalOpen(true);
    handleClose();
  };

  const handleCloseForwardModal = () => {
    setForwardModalOpen(false);
  };

  const handleOpenEditModal = () => {
    setEditModalOpen(true);
    handleClose();
  };

  const handleCopyMessage = async () => {
    const messageText = message?.body || "";

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(messageText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = messageText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error("Clipboard copy failed");
        }
      }

      toast.success(i18n.t("copyToClipboard.copied"));
    } catch (err) {
      toast.error(i18n.t("copyToClipboard.error"));
    } finally {
      handleClose();
    }
  };

  const handleReaction = async (emoji) => {
    try {
      await api.post(`/messages/${message.id}/reaction`, { emoji });
      setEmojiPickerAnchor(null);
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenEmojiPicker = (event) => {
    event.stopPropagation();
    setEmojiPickerAnchor(event.currentTarget);
  };

  const handlePickReaction = (emoji) => {
    handleReaction(emoji.native);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
  };

  // Verificar si el mensaje puede ser editado (dentro de 15 minutos y es de texto)
  const canEditMessage = () => {
    if (!message || !message.fromMe) return false;
    if (message.isDeleted) return false;
    if (message.mediaType && message.mediaType !== "chat") return false;
    
    const messageCreatedAt = new Date(message.createdAt).getTime();
    const currentTime = Date.now();
    const elapsedTime = currentTime - messageCreatedAt;
    
    return elapsedTime <= MAX_EDIT_TIME_MS;
  };

  return (
    <>
      <ConfirmationModal
        title={i18n.t("messageOptionsMenu.confirmationModal.title")}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDeleteMessage}
      >
        {i18n.t("messageOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>
      <ForwardMessageModal
        open={forwardModalOpen}
        onClose={handleCloseForwardModal}
        messages={[message]}
      />
      <EditMessageModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        message={message}
      />
      <Popover
        open={Boolean(emojiPickerAnchor)}
        anchorEl={emojiPickerAnchor}
        onClose={() => setEmojiPickerAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Picker
          title="Elegir reacción"
          emoji="slightly_smiling_face"
          showPreview={false}
          showSkinTones={false}
          onSelect={handlePickReaction}
        />
      </Popover>
      <Menu
        anchorEl={anchorEl}
        anchorReference={anchorPosition ? "anchorPosition" : "anchorEl"}
        anchorPosition={anchorPosition}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={menuOpen}
        onClose={handleClose}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "6px 8px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.08)"
          }}
        >
          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
            <IconButton
              key={emoji}
              size="small"
              aria-label={`Reaccionar con ${emoji}`}
              onClick={() => handleReaction(emoji)}
              style={{ fontSize: 22, padding: 5 }}
            >
              {emoji}
            </IconButton>
          ))}
          <IconButton
            size="small"
            aria-label="Más emojis"
            onClick={handleOpenEmojiPicker}
            style={{ marginLeft: 2 }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </div>
        {message.fromMe && (
          <MenuItem onClick={handleOpenConfirmationModal}>
            {i18n.t("messageOptionsMenu.delete")}
          </MenuItem>
        )}
        {canEditMessage() && (
          <MenuItem onClick={handleOpenEditModal}>
            {i18n.t("messageOptionsMenu.edit")}
          </MenuItem>
        )}
        <MenuItem onClick={handleCopyMessage}>
          {i18n.t("messageOptionsMenu.copy")}
        </MenuItem>
        <MenuItem onClick={hanldeReplyMessage}>
          {i18n.t("messageOptionsMenu.reply")}
        </MenuItem>
        <MenuItem onClick={handleOpenForwardModal}>
          {i18n.t("messageOptionsMenu.forward")}
        </MenuItem>
      </Menu>
    </>
  );
};

export default MessageOptionsMenu;
