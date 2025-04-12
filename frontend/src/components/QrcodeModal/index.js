import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";

import { Dialog, DialogContent, Paper, Typography } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";

const QrcodeModal = ({ open, onClose, whatsAppId }) => {
  const [qrCode, setQrCode] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`);
        setSessionStatus(data.status);

        if (data.status === "PAIRING" && data.pairingCode) {
          setQrCode(data.pairingCode);
        } else if (data.qrcode) {
          setQrCode(data.qrcode);
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    if (!whatsAppId) return;
    const socket = openSocket();

    socket.on("whatsappSession", data => {
      if (data.action === "update" && data.session.id === whatsAppId) {
        setSessionStatus(data.session.status);

        if (data.session.status === "PAIRING" && data.session.pairingCode) {
          setQrCode(data.session.pairingCode);
        } else if (data.session.qrcode) {
          setQrCode(data.session.qrcode);
        }
      }

      if (data.action === "update" && data.session.qrcode === "") {
        onClose();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [whatsAppId, onClose]);

  const renderContent = () => {
    if (!qrCode) {
      return <Typography variant="body1">Esperando código...</Typography>;
    }

    const isNumericCode = /^\d{6,}$/.test(qrCode);

    if (sessionStatus === "PAIRING" && isNumericCode) {
      // Mostrar pairing code como texto separado
      return (
        <Typography
          variant="h3"
          align="center"
          style={{ fontWeight: "bold", letterSpacing: "6px", marginTop: 20 }}
        >
          {qrCode.replace(/(.{3})/g, "$1-").slice(0, -1)}
        </Typography>
      );
    }

    // Mostrar QR visual
    return <QRCode value={qrCode} size={256} />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" scroll="paper">
      <DialogContent style={{ background: "#ffffff" }}>
        <Paper elevation={0} style={{ background: "#ffffff" }}>
          <Typography color="primary" gutterBottom>
            {i18n.t("qrCode.message")}
          </Typography>
          {renderContent()}
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(QrcodeModal);
