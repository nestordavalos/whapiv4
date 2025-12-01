import React, { useState, useEffect, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Typography,
  IconButton,
  Button,
  Box,
  Chip,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import SaveIcon from "@material-ui/icons/Save";
import AddIcon from "@material-ui/icons/Add";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import ConfirmationModal from "../ConfirmationModal";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
  accordion: {
    marginBottom: theme.spacing(1),
    "&:before": {
      display: "none",
    },
  },
  accordionSummary: {
    backgroundColor: theme.palette.background.default,
    minHeight: 48,
    "&.Mui-expanded": {
      minHeight: 48,
    },
  },
  accordionDetails: {
    flexDirection: "column",
    padding: theme.spacing(2),
  },
  optionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: theme.spacing(1),
  },
  optionTitle: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flex: 1,
  },
  mediaPreview: {
    maxWidth: 200,
    maxHeight: 150,
    marginTop: theme.spacing(1),
    borderRadius: theme.spacing(1),
  },
  fileInput: {
    display: "none",
  },
  addButton: {
    marginTop: theme.spacing(2),
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(3),
  },
}));

// Estado inicial para una nueva opción
const newOptionState = {
  name: "",
  greetingMessage: "",
  mediaPath: "",
  isAgent: false,
};

function VerticalLinearStepper({ chatBotId, isSubOption = false }) {
  const classes = useStyles();
  const isQueue = !isSubOption;

  console.log('[ChatBot Options] Component mounted/updated with:', {
    chatBotId,
    isSubOption,
    isQueue
  });

  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Cargar opciones del chatbot
  const loadChatbots = useCallback(async () => {
    if (!chatBotId) {
      console.log('[ChatBot Options] No chatBotId provided');
      setChatbots([]);
      return;
    }

    console.log('[ChatBot Options] Loading chatbots:', {
      chatBotId,
      isQueue,
      isSubOption
    });

    setLoading(true);
    try {
      const endpoint = isQueue 
        ? `/chatbot/queue/${chatBotId}`
        : `/chatbot/chatbot/${chatBotId}`;
      
      console.log('[ChatBot Options] Fetching from:', endpoint);
      
      const { data } = await api.get(endpoint);
      
      console.log('[ChatBot Options] Data received:', data);
      
      setChatbots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ChatBot Options] Error loading:', err);
      if (err.response?.status !== 404) {
        toastError(err);
      }
      setChatbots([]);
    } finally {
      setLoading(false);
    }
  }, [chatBotId, isQueue, isSubOption]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadChatbots();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [loadChatbots]);

  const handleChange = (panel) => (event, isExpanded) => {
    // Si estamos editando este panel, no permitir que se cierre
    if (editingIndex === panel && !isExpanded) {
      console.log('[ChatBot Options] Prevented closing accordion while editing');
      return;
    }
    setExpanded(isExpanded ? panel : false);
  };

  const handleStartEdit = (index) => {
    console.log('[ChatBot Options] handleStartEdit called with index:', index);
    console.log('[ChatBot Options] chatbots array:', chatbots);
    console.log('[ChatBot Options] Current editingIndex:', editingIndex);
    
    const chatbot = chatbots[index];
    
    if (!chatbot) {
      console.error('[ChatBot Options] No chatbot found at index:', index);
      toast.error("Error: No se pudo cargar la opción");
      return;
    }
    
    console.log('[ChatBot Options] Setting edit mode for chatbot:', chatbot);
    setEditingIndex(index);
    setEditingData({ ...chatbot });
    setExpanded(index);
  };

  const handleStartNew = () => {
    console.log('[ChatBot Options] handleStartNew called');
    console.log('[ChatBot Options] Current chatbots length:', chatbots.length);
    console.log('[ChatBot Options] New option state:', newOptionState);
    setEditingIndex(chatbots.length);
    setEditingData({ ...newOptionState });
    setExpanded(chatbots.length);
    console.log('[ChatBot Options] EditingIndex set to:', chatbots.length);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingData(null);
    setExpanded(false);
  };

  const handleSave = async () => {
    try {
      console.log('[ChatBot Options] === SAVING OPTION ===');
      console.log('[ChatBot Options] editingData:', editingData);
      console.log('[ChatBot Options] chatBotId prop:', chatBotId);
      console.log('[ChatBot Options] isQueue:', isQueue);
      console.log('[ChatBot Options] isSubOption:', isSubOption);

      if (!chatBotId) {
        console.error('[ChatBot Options] ERROR: No chatBotId provided!');
        toast.error("Error: No se puede guardar sin un ID de referencia");
        return;
      }

      if (!editingData.name || !editingData.name.trim()) {
        toast.error("El nombre es obligatorio");
        return;
      }

      const dataToSend = {
        name: editingData.name.trim(),
        greetingMessage: editingData.greetingMessage || "",
        mediaPath: editingData.mediaPath || "",
        isAgent: editingData.isAgent || false,
      };

      if (isQueue) {
        dataToSend.queueId = chatBotId;
        console.log('[ChatBot Options] Adding queueId:', chatBotId);
      } else {
        dataToSend.chatbotId = chatBotId;
        console.log('[ChatBot Options] Adding chatbotId:', chatBotId);
      }

      console.log('[ChatBot Options] Final data to send:', JSON.stringify(dataToSend, null, 2));

      let response;
      if (editingData.id) {
        console.log('[ChatBot Options] Updating existing option, ID:', editingData.id);
        response = await api.put(`/chatbot/${editingData.id}`, dataToSend);
        console.log('[ChatBot Options] Update response:', response.data);
        toast.success("Opción actualizada correctamente");
      } else {
        console.log('[ChatBot Options] Creating new option with POST /chatbot');
        response = await api.post("/chatbot", dataToSend);
        console.log('[ChatBot Options] Create response:', response.data);
        toast.success("Opción creada correctamente");
      }

      console.log('[ChatBot Options] Reloading chatbots...');
      await loadChatbots();
      
      handleCancelEdit();
      console.log('[ChatBot Options] === SAVE COMPLETE ===');
    } catch (err) {
      console.error('[ChatBot Options] === SAVE ERROR ===');
      console.error('[ChatBot Options] Error object:', err);
      console.error('[ChatBot Options] Error message:', err.message);
      console.error('[ChatBot Options] Error response:', err.response);
      console.error('[ChatBot Options] Error response data:', err.response?.data);
      console.error('[ChatBot Options] Error response status:', err.response?.status);
      toastError(err);
    }
  };

  const handleDelete = async (chatbot) => {
    try {
      await api.delete(`/chatbot/${chatbot.id}`);
      toast.success("Opción eliminada correctamente");
      await loadChatbots();
      setConfirmModalOpen(false);
      setSelectedChatbot(null);
    } catch (err) {
      toastError(err);
    }
  };

  const handleMediaUpload = async (file) => {
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Archivo muy grande. Máximo 20MB");
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/webm',
      'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de archivo no permitido");
      return;
    }

    console.log('[ChatBot Options] Uploading file:', file.name);
    setUploadingMedia(true);

    try {
      const formData = new FormData();
      formData.append("medias", file);

      const { data } = await api.post("/messages/media-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log('[ChatBot Options] Upload response:', data);

      if (data && data.length > 0) {
        setEditingData({ ...editingData, mediaPath: data[0] });
        toast.success("Archivo cargado correctamente");
      }
    } catch (err) {
      console.error('[ChatBot Options] Upload error:', err);
      toastError(err);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleRemoveMedia = () => {
    setEditingData({ ...editingData, mediaPath: "" });
  };

  if (loading) {
    return (
      <div className={classes.loading}>
        <CircularProgress />
      </div>
    );
  }

  console.log('[ChatBot Options] Rendering with chatbots:', chatbots);

  return (
    <div className={classes.root}>
      {chatbots.length === 0 && (
        <Typography variant="body2" color="textSecondary" style={{ padding: '16px', textAlign: 'center' }}>
          No hay opciones configuradas. Haz clic en "Añadir nueva opción" para comenzar.
        </Typography>
      )}
      
      {chatbots.map((chatbot, index) => (
        <Accordion
          key={`chatbot-${chatbot.id}`}
          expanded={expanded === index}
          onChange={handleChange(index)}
          className={classes.accordion}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className={classes.accordionSummary}
          >
            <div className={classes.optionHeader}>
              <div className={classes.optionTitle}>
                <Typography variant="subtitle1">
                  {editingIndex === index ? `✏️ Editando: ${editingData.name || "Sin nombre"}` : chatbot.name || "Sin nombre"}
                </Typography>
                {editingIndex !== index && chatbot.isAgent && (
                  <Chip label="Agente" size="small" color="primary" />
                )}
                {editingIndex !== index && chatbot.mediaPath && (
                  <Chip
                    icon={<AttachFileIcon />}
                    label="Media"
                    size="small"
                    color="secondary"
                  />
                )}
              </div>

              {editingIndex !== index && (
                <Box onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(index);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChatbot(chatbot);
                      setConfirmModalOpen(true);
                    }}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </div>
          </AccordionSummary>

          <AccordionDetails className={classes.accordionDetails}>
            {editingIndex === index ? (
              <>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Editar opción
                </Typography>

                <TextField
                  value={editingData.name}
                  onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                  label="Nombre de la opción"
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  helperText="Ej: 1, 2, 3 o Ventas, Soporte, etc."
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={editingData.isAgent || false}
                      onChange={(e) => setEditingData({ ...editingData, isAgent: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Transferir a agente humano"
                />

                <Divider style={{ margin: "16px 0" }} />

                <TextField
                  value={editingData.greetingMessage}
                  onChange={(e) => setEditingData({ ...editingData, greetingMessage: e.target.value })}
                  label="Mensaje de respuesta"
                  fullWidth
                  multiline
                  minRows={3}
                  margin="dense"
                  variant="outlined"
                  helperText="Mensaje que se enviará cuando el usuario seleccione esta opción"
                />

                <Divider style={{ margin: "16px 0" }} />

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Archivo multimedia (opcional)
                </Typography>

                <Box display="flex" alignItems="center" gap={2}>
                  <input
                    accept="image/*,video/*,audio/*,application/pdf"
                    className={classes.fileInput}
                    id={`file-upload-${index}`}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleMediaUpload(file);
                      }
                    }}
                  />
                  <label htmlFor={`file-upload-${index}`}>
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFileIcon />}
                      disabled={uploadingMedia}
                    >
                      {uploadingMedia ? 'Subiendo...' : 'Adjuntar archivo'}
                    </Button>
                  </label>

                  {editingData.mediaPath && (
                    <Chip
                      label="Archivo adjunto"
                      onDelete={handleRemoveMedia}
                      color="secondary"
                      size="small"
                    />
                  )}
                </Box>

                {editingData.mediaPath && editingData.mediaPath.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <Box mt={2}>
                    <img
                      src={`${process.env.REACT_APP_BACKEND_URL}/public/${editingData.mediaPath}`}
                      alt="Preview"
                      className={classes.mediaPreview}
                    />
                  </Box>
                )}
              </>
            ) : (
              <>
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Mensaje:
                  </Typography>
                  <Typography variant="body1">
                    {chatbot.greetingMessage || "(Sin mensaje configurado)"}
                  </Typography>
                </Box>

                {chatbot.mediaPath && (
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Archivo adjunto:
                    </Typography>
                    {chatbot.mediaPath.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                      <img
                        src={`${process.env.REACT_APP_BACKEND_URL}/public/${chatbot.mediaPath}`}
                        alt="Media"
                        className={classes.mediaPreview}
                      />
                    )}
                  </Box>
                )}

                {chatbot.id && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Subopciones:
                    </Typography>
                    <VerticalLinearStepper chatBotId={chatbot.id} isSubOption={true} />
                  </Box>
                )}
              </>
            )}
          </AccordionDetails>

          {editingIndex === index && (
            <AccordionActions>
              <Button size="small" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button
                size="small"
                color="primary"
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!editingData.name || uploadingMedia}
              >
                Guardar
              </Button>
            </AccordionActions>
          )}
        </Accordion>
      ))}

      {editingIndex === chatbots.length && (
        <Accordion
          expanded={true}
          className={classes.accordion}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className={classes.accordionSummary}
          >
            <div className={classes.optionHeader}>
              <div className={classes.optionTitle}>
                <TextField
                  value={editingData.name}
                  onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                  placeholder="Nombre de la nueva opción"
                  variant="standard"
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </AccordionSummary>

          <AccordionDetails className={classes.accordionDetails}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Nueva opción
            </Typography>

            <TextField
              value={editingData.name}
              onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
              label="Nombre de la opción"
              fullWidth
              margin="dense"
              variant="outlined"
              helperText="Ej: 1, 2, 3 o Ventas, Soporte, etc."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editingData.isAgent || false}
                  onChange={(e) => setEditingData({ ...editingData, isAgent: e.target.checked })}
                  color="primary"
                />
              }
              label="Transferir a agente humano"
            />

            <Divider style={{ margin: "16px 0" }} />

            <TextField
              value={editingData.greetingMessage}
              onChange={(e) => setEditingData({ ...editingData, greetingMessage: e.target.value })}
              label="Mensaje de respuesta"
              fullWidth
              multiline
              minRows={3}
              margin="dense"
              variant="outlined"
              helperText="Mensaje que se enviará cuando el usuario seleccione esta opción"
            />

            <Divider style={{ margin: "16px 0" }} />

            <Typography variant="body2" color="textSecondary" gutterBottom>
              Archivo multimedia (opcional)
            </Typography>

            <Box display="flex" alignItems="center" gap={2}>
              <input
                accept="image/*,video/*,audio/*,application/pdf"
                className={classes.fileInput}
                id="file-upload-new"
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleMediaUpload(file);
                  }
                }}
              />
              <label htmlFor="file-upload-new">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<AttachFileIcon />}
                  disabled={uploadingMedia}
                >
                  {uploadingMedia ? 'Subiendo...' : 'Adjuntar archivo'}
                </Button>
              </label>

              {editingData.mediaPath && (
                <Chip
                  label="Archivo adjunto"
                  onDelete={handleRemoveMedia}
                  color="secondary"
                  size="small"
                />
              )}
            </Box>

            {editingData.mediaPath && editingData.mediaPath.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
              <Box mt={2}>
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL}/public/${editingData.mediaPath}`}
                  alt="Preview"
                  className={classes.mediaPreview}
                />
              </Box>
            )}
          </AccordionDetails>

          <AccordionActions>
            <Button size="small" onClick={handleCancelEdit}>
              Cancelar
            </Button>
            <Button
              size="small"
              color="primary"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!editingData.name || uploadingMedia}
            >
              Guardar
            </Button>
          </AccordionActions>
        </Accordion>
      )}

      <Button
        variant="outlined"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleStartNew}
        className={classes.addButton}
        fullWidth
        disabled={editingIndex !== null}
      >
        Añadir nueva opción
      </Button>

      <ConfirmationModal
        title="Eliminar opción"
        open={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedChatbot(null);
        }}
        onConfirm={() => handleDelete(selectedChatbot)}
      >
        ¿Estás seguro que deseas eliminar esta opción? Esta acción no se puede deshacer.
      </ConfirmationModal>
    </div>
  );
}

export default VerticalLinearStepper;
