import React, { useState, useContext } from "react";

import MenuItem from "@mui/material/MenuItem";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import ForwardMessageModal from "../ForwardMessageModal";
import EditMessageModal from "../EditMessageModal";
import { Menu } from "@mui/material";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import toastError from "../../errors/toastError";

// Tiempo máximo para editar un mensaje (15 minutos en milisegundos)
const MAX_EDIT_TIME_MS = 15 * 60 * 1000;

const MessageOptionsMenu = ({ message, menuOpen, handleClose, anchorEl }) => {
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

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
      <Menu
        anchorEl={anchorEl}
        getContentAnchorEl={null}
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
