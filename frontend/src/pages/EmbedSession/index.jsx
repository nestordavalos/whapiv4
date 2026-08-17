import React, { useContext, useEffect, useState } from "react";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import { getBackendUrl } from "../../config";

const EmbedSession = () => {
  const { publicId } = useParams();
  const { handleEmbedLogin } = useContext(AuthContext);
  const [error, setError] = useState("");

  useEffect(() => {
    const backendOrigin = new URL(getBackendUrl()).origin;
    let consumed = false;
    const timer = window.setTimeout(() => {
      if (!consumed) setError("No se recibió la autorización del portal.");
    }, 10000);

    const handleMessage = async event => {
      if (
        consumed ||
        event.source !== window.parent ||
        event.origin !== backendOrigin ||
        event.data?.type !== "WHAPI_EMBED_AUTH"
      ) return;

      consumed = true;
      window.clearTimeout(timer);
      try {
        const { data } = await api.post(`/embed-integrations/${publicId}/exchange`, {
          token: event.data.token,
          parentOrigin: event.data.parentOrigin,
          next: event.data.next || undefined
        });
        sessionStorage.setItem("embedPublicId", publicId);
        handleEmbedLogin(data);
      } catch (requestError) {
        setError(requestError.response?.data?.error || "No se pudo iniciar la sesión embebida.");
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "WHAPI_EMBED_READY" }, backendOrigin);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
    };
  }, [handleEmbedLogin, publicId]);

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={2}>
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 480, textAlign: "center" }}>
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            <CircularProgress size={36} />
            <Typography sx={{ mt: 2 }}>Validando acceso seguro…</Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default EmbedSession;
