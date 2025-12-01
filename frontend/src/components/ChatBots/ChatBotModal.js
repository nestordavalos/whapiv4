import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Chip,
  Divider,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import CloseIcon from "@material-ui/icons/Close";
import HelpOutlineOutlinedIcon from "@material-ui/icons/HelpOutlineOutlined";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    minHeight: "60vh",
    maxHeight: "90vh",
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    fontWeight: 600,
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  helpIcon: {
    fontSize: 18,
    color: theme.palette.text.secondary,
  },
  fileInput: {
    display: "none",
  },
  mediaPreview: {
    maxWidth: "100%",
    maxHeight: 200,
    marginTop: theme.spacing(2),
    borderRadius: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
  },
  uploadButton: {
    marginTop: theme.spacing(1),
  },
  helpText: {
    fontSize: "0.875rem",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
  },
  requiredBadge: {
    backgroundColor: theme.palette.error.main,
    color: "white",
    fontSize: "0.75rem",
    padding: "2px 8px",
    borderRadius: 12,
    marginLeft: theme.spacing(1),
  },
}));

const ChatBotSchema = Yup.object().shape({
  name: Yup.string()
    .min(1, "Muy corto")
    .max(50, "Muy largo")
    .required("El nombre es obligatorio"),
  greetingMessage: Yup.string().min(1, "El mensaje es obligatorio"),
});

const ChatBotModal = ({ open, onClose, chatbot, onSave, queueId }) => {
  const classes = useStyles();
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);

  const initialValues = {
    id: chatbot?.id || null,
    name: chatbot?.name || "",
    greetingMessage: chatbot?.greetingMessage || "",
    mediaPath: chatbot?.mediaPath || "",
    isAgent: chatbot?.isAgent || false,
    queueId: queueId,
  };

  useEffect(() => {
    if (chatbot?.mediaPath) {
      setMediaPreview(chatbot.mediaPath);
    }
  }, [chatbot]);

  const handleMediaUpload = async (file, setFieldValue) => {
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Archivo muy grande. Máximo 20MB");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mpeg",
      "video/webm",
      "audio/mpeg",
      "audio/mp3",
      "audio/ogg",
      "audio/wav",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de archivo no permitido");
      return;
    }

    setUploadingMedia(true);

    try {
      const formData = new FormData();
      formData.append("medias", file);

      const { data } = await api.post("/messages/media-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data && data.length > 0) {
        setFieldValue("mediaPath", data[0]);
        setMediaPreview(data[0]);
        toast.success("Archivo cargado correctamente");
      }
    } catch (err) {
      toastError(err);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      let response;
      if (values.id) {
        // Actualizar existente
        response = await api.put(`/chatbot/${values.id}`, values);
      } else {
        // Crear nuevo
        response = await api.post("/chatbot", values);
      }
      toast.success(
        values.id
          ? "Opción actualizada correctamente"
          : "Opción creada correctamente"
      );
      onSave(response.data);
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {chatbot ? "Editar Opción de Chatbot" : "Nueva Opción de Chatbot"}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Formik
        initialValues={initialValues}
        validationSchema={ChatBotSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form>
            <DialogContent dividers>
              {/* Sección 1: Información Básica */}
              <Box className={classes.section}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  1. Información Básica
                  <span className={classes.requiredBadge}>Obligatorio</span>
                </Typography>

                <Field
                  as={TextField}
                  name="name"
                  label="Nombre de la opción"
                  fullWidth
                  variant="outlined"
                  margin="dense"
                  placeholder="Ej: 1, Ventas, Soporte, etc."
                  error={touched.name && Boolean(errors.name)}
                  helperText={
                    (touched.name && errors.name) ||
                    "Este será el número o texto que el usuario debe enviar"
                  }
                  required
                />

                <Box mt={2}>
                  <FormControlLabel
                    control={
                      <Field
                        as={Switch}
                        name="isAgent"
                        color="primary"
                        checked={values.isAgent}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">
                          Transferir a agente humano
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Si está activado, el chat será asignado a un agente en lugar de
                          continuar con el chatbot
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              </Box>

              <Divider />

              {/* Sección 2: Mensaje de Respuesta */}
              <Box className={classes.section}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  2. Mensaje de Respuesta
                  <span className={classes.requiredBadge}>Obligatorio</span>
                  <HelpOutlineOutlinedIcon className={classes.helpIcon} />
                </Typography>

                <Field
                  as={TextField}
                  name="greetingMessage"
                  label="Mensaje que recibirá el usuario"
                  fullWidth
                  variant="outlined"
                  margin="dense"
                  multiline
                  rows={4}
                  placeholder="Ej: ¡Hola! Has seleccionado la opción de Ventas. ¿En qué producto estás interesado?"
                  error={touched.greetingMessage && Boolean(errors.greetingMessage)}
                  helperText={
                    (touched.greetingMessage && errors.greetingMessage) ||
                    "Este mensaje se enviará automáticamente cuando el usuario seleccione esta opción"
                  }
                  required
                />

                {!values.greetingMessage && (
                  <Box className={classes.helpText}>
                    <HelpOutlineOutlinedIcon fontSize="small" color="error" />
                    <Typography variant="caption" color="error">
                      El mensaje es obligatorio para que el chatbot pueda continuar
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider />

              {/* Sección 3: Archivo Multimedia (Opcional) */}
              <Box className={classes.section}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  3. Archivo Multimedia
                  <Chip label="Opcional" size="small" style={{ marginLeft: 8 }} />
                </Typography>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Adjunta una imagen, video, audio o PDF que se enviará junto con el
                  mensaje
                </Typography>

                <Box mt={2}>
                  <input
                    accept="image/*,video/*,audio/*,.pdf"
                    className={classes.fileInput}
                    id="file-upload-chatbot"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleMediaUpload(file, setFieldValue);
                      }
                    }}
                  />
                  <label htmlFor="file-upload-chatbot">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFileIcon />}
                      disabled={uploadingMedia}
                      className={classes.uploadButton}
                    >
                      {uploadingMedia
                        ? "Cargando..."
                        : values.mediaPath
                        ? "Cambiar archivo"
                        : "Seleccionar archivo"}
                    </Button>
                  </label>

                  {uploadingMedia && (
                    <Box display="flex" alignItems="center" mt={1}>
                      <CircularProgress size={20} style={{ marginRight: 8 }} />
                      <Typography variant="caption">
                        Subiendo archivo...
                      </Typography>
                    </Box>
                  )}

                  {values.mediaPath && !uploadingMedia && (
                    <Box mt={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label="Archivo adjunto"
                          color="secondary"
                          onDelete={() => {
                            setFieldValue("mediaPath", "");
                            setMediaPreview(null);
                          }}
                          icon={<AttachFileIcon />}
                        />
                        <Typography variant="caption" color="textSecondary">
                          {values.mediaPath}
                        </Typography>
                      </Box>

                      {mediaPreview &&
                        mediaPreview.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                          <img
                            src={`${process.env.REACT_APP_BACKEND_URL}/public/${mediaPreview}`}
                            alt="Preview"
                            className={classes.mediaPreview}
                          />
                        )}
                    </Box>
                  )}

                  <Typography
                    variant="caption"
                    color="textSecondary"
                    display="block"
                    style={{ marginTop: 8 }}
                  >
                    📁 Formatos permitidos: JPG, PNG, GIF, WebP, MP4, MP3, WAV, PDF
                    <br />
                    📏 Tamaño máximo: 20MB
                  </Typography>
                </Box>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                color="primary"
                variant="contained"
                disabled={isSubmitting || !values.name || !values.greetingMessage}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress size={20} style={{ marginRight: 8 }} />
                    Guardando...
                  </>
                ) : chatbot ? (
                  "Actualizar"
                ) : (
                  "Crear Opción"
                )}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default ChatBotModal;
