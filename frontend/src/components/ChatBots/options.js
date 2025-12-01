import React from "react";
import * as Yup from "yup";
import { makeStyles } from "@material-ui/core/styles";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionActions from "@material-ui/core/AccordionActions";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import api from "../../services/api";
import Typography from "@material-ui/core/Typography";
import EditIcon from "@material-ui/icons/Edit";
import { IconButton, Button, Box, Chip } from "@material-ui/core";
import { Formik, Field, FieldArray } from "formik";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import SaveIcon from "@material-ui/icons/Save";
import AddIcon from "@material-ui/icons/Add";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import TextField from "@material-ui/core/TextField";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import HelpOutlineOutlinedIcon from "@material-ui/icons/HelpOutlineOutlined";
import ConfirmationModal from "../ConfirmationModal";
import Switch from "@material-ui/core/Switch";
import { FormControlLabel, Divider } from "@material-ui/core";

const QueueSchema = Yup.object().shape({
  options: Yup.array()
    .of(
      Yup.object().shape({
        name: Yup.string().min(1, "Muy corto").required("Requerido"),
      })
    )
    .required("Debe tener opciones"),
});

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
  fieldRow: {
    display: "flex",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    alignItems: "flex-start",
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
}));

function getStepContent(step) {
  return <VerticalLinearStepper chatBotId={step} isSubOption={true} />;
}

export default function VerticalLinearStepper(props) {
  const classes = useStyles();
  
  // Determinar si estamos trabajando con un queue (queueId) o un chatbot (chatbotId)
  // isQueue es true cuando NO es una subopción (es decir, opciones principales del queue)
  const isQueue = React.useMemo(() => !props.isSubOption, [props.isSubOption]);
  
  const [expanded, setExpanded] = React.useState(false);
  const [chatbots, setChatbots] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [selectedQueue, setSelectedQueue] = React.useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [uploadingMedia, setUploadingMedia] = React.useState({});

  const loadChatbots = React.useCallback(async () => {
    if (!props.chatBotId) {
      console.log('[ChatBot Options] No chatBotId provided');
      setChatbots([]);
      return;
    }

    console.log('[ChatBot Options] Loading chatbots:', {
      chatBotId: props.chatBotId,
      isQueue,
      isSubOption: props.isSubOption
    });

    setLoading(true);
    try {
      const endpoint = isQueue 
        ? `/chatbot/queue/${props.chatBotId}`
        : `/chatbot/chatbot/${props.chatBotId}`;
      
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
  }, [props.chatBotId, isQueue, props.isSubOption]);

  const handleSaveBot = async (option) => {
    try {
      console.log('[ChatBot Options] Saving option:', option);
      
      if (!option.name || !option.name.trim()) {
        toast.error("El nombre es obligatorio");
        return;
      }

      const dataToSend = {
        name: option.name.trim(),
        greetingMessage: option.greetingMessage || "",
        mediaPath: option.mediaPath || "",
        isAgent: option.isAgent || false,
      };

      // Agregar queueId o chatbotId según el contexto
      if (isQueue) {
        dataToSend.queueId = props.chatBotId;
      } else {
        dataToSend.chatbotId = props.chatBotId;
      }

      console.log('[ChatBot Options] Sending data:', dataToSend);

      if (option.id) {
        await api.put(`/chatbot/${option.id}`, dataToSend);
        toast.success("Opción actualizada correctamente");
      } else {
        await api.post("/chatbot", dataToSend);
        toast.success("Opción creada correctamente");
      }

      // Recargar las opciones
      await loadChatbots();
      
      // Resetear estado de edición
      setEditingIndex(null);
      setExpanded(false);
    } catch (err) {
      console.error('[ChatBot Options] Error saving:', err);
      toastError(err);
    }
  };

  const handleMediaUpload = async (file, index, setFieldValue) => {
    console.log('[ChatBot Options] handleMediaUpload called:', {
      file: file ? { name: file.name, size: file.size, type: file.type } : null,
      index,
      hasSetFieldValue: typeof setFieldValue === 'function'
    });

    if (!file) {
      console.log('[ChatBot Options] No file provided');
      return;
    }

    // Validar tamaño (20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      console.log('[ChatBot Options] File too large:', file.size);
      toast.error("Archivo muy grande. Máximo 20MB");
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/webm',
      'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      console.log('[ChatBot Options] Invalid file type:', file.type);
      toast.error("Tipo de archivo no permitido");
      return;
    }

    console.log('[ChatBot Options] Starting upload...');
    setUploadingMedia({ ...uploadingMedia, [index]: true });

    try {
      const formData = new FormData();
      formData.append("medias", file);

      console.log('[ChatBot Options] Uploading to /messages/media-upload');
      const { data } = await api.post("/messages/media-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log('[ChatBot Options] Upload response:', data);

      if (data && data.length > 0) {
        console.log('[ChatBot Options] Setting mediaPath:', data[0]);
        setFieldValue(`options[${index}].mediaPath`, data[0]);
        toast.success("Archivo cargado correctamente");
      } else {
        console.warn('[ChatBot Options] No data returned from upload');
      }
    } catch (err) {
      console.error('[ChatBot Options] Upload error:', {
        error: err.response?.data || err.message,
        status: err.response?.status
      });
      toastError(err);
    } finally {
      setUploadingMedia({ ...uploadingMedia, [index]: false });
      console.log('[ChatBot Options] Upload finished');
    }
  };

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadChatbots();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [loadChatbots]);

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedQueue(null);
  };

  const handleDeleteQueue = async (queueId) => {
    try {
      await api.delete(`/chatbot/${queueId}`);
      
      // Recargar usando el endpoint correcto
      const endpoint = isQueue 
        ? `/chatbot/queue/${props.chatBotId}`
        : `/chatbot/chatbot/${props.chatBotId}`;
      
      const { data } = await api.get(endpoint);
      setSteps({
        name: "",
        greetingMessage: "",
        mediaPath: "",
        options: data || []
      });
      setEditingIndex(null);
      toast.success("Opción eliminada correctamente");
    } catch (err) {
      toastError(err);
    }
    setSelectedQueue(null);
  };

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <div className={classes.root}>
      <ConfirmationModal
        title={
          selectedQueue &&
          `¿Eliminar opción "${selectedQueue.name}"?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteQueue(selectedQueue.id)}
      >
        ¿Está seguro? Esta opción y todas sus sub-opciones serán eliminadas
      </ConfirmationModal>

      {!loading && (
        <div>
          {chatbots.map((chatbot, index) => (
            <Accordion
              key={`chatbot-${chatbot.id}-${index}`}
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
                                  <>
                                    <Typography variant="subtitle1">
                                      {info.name || "Sin nombre"}
                                    </Typography>
                                    {info.isAgent && (
                                      <Chip
                                        label="Agente"
                                        size="small"
                                        color="primary"
                                      />
                                    )}
                                    {info.mediaPath && (
                                      <Chip
                                        icon={<AttachFileIcon />}
                                        label="Media"
                                        size="small"
                                        color="secondary"
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                              
                              {editingIndex !== index && (
                                <Box onClick={(e) => e.stopPropagation()}>
                                  <IconButton
                                    size="small"
                                    onClick={() => setEditingIndex(index)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedQueue(info);
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
                                
                                <Field
                                  as={TextField}
                                  name={`options[${index}].name`}
                                  label="Nombre de la opción"
                                  fullWidth
                                  margin="dense"
                                  variant="outlined"
                                  error={
                                    touched?.options?.[index]?.name &&
                                    Boolean(errors.options?.[index]?.name)
                                  }
                                  helperText="Ej: 1, 2, 3 o Ventas, Soporte, etc."
                                />

                                <FormControlLabel
                                  control={
                                    <Field
                                      as={Switch}
                                      color="primary"
                                      name={`options[${index}].isAgent`}
                                      checked={values.options[index].isAgent || false}
                                    />
                                  }
                                  label="Transferir a agente humano"
                                />

                                <Divider style={{ margin: "16px 0" }} />

                                <Field
                                  as={TextField}
                                  name={`options[${index}].greetingMessage`}
                                  label="Mensaje de respuesta"
                                  fullWidth
                                  multiline
                                  minRows={3}
                                  margin="dense"
                                  variant="outlined"
                                  helperText="Mensaje que se enviará cuando el usuario seleccione esta opción"
                                  error={
                                    touched?.options?.[index]?.greetingMessage &&
                                    Boolean(errors.options?.[index]?.greetingMessage)
                                  }
                                />

                                {!steps.options[index]?.greetingMessage && (
                                  <Box display="flex" alignItems="center" mt={1}>
                                    <HelpOutlineOutlinedIcon
                                      color="secondary"
                                      fontSize="small"
                                      style={{ marginRight: 4 }}
                                    />
                                    <Typography variant="caption" color="secondary">
                                      El mensaje es obligatorio para continuar al siguiente nivel
                                    </Typography>
                                  </Box>
                                )}

                                <Divider style={{ margin: "16px 0" }} />

                                <Typography variant="body2" gutterBottom>
                                  Archivo multimedia (opcional)
                                </Typography>
                                <Typography variant="caption" color="textSecondary" gutterBottom>
                                  Adjunte una imagen, video, audio o PDF (máx. 20MB)
                                </Typography>

                                <Box display="flex" alignItems="center" gap={1} mt={1}>
                                  <input
                                    accept="image/*,video/*,audio/*,.pdf"
                                    className={classes.fileInput}
                                    id={`file-upload-${index}`}
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        handleMediaUpload(file, index, setFieldValue);
                                      }
                                    }}
                                  />
                                  <label htmlFor={`file-upload-${index}`}>
                                    <Button
                                      variant="outlined"
                                      component="span"
                                      startIcon={<AttachFileIcon />}
                                      size="small"
                                      disabled={uploadingMedia[index]}
                                    >
                                      {uploadingMedia[index] ? "Cargando..." : "Seleccionar archivo"}
                                    </Button>
                                  </label>
                                  
                                  {values.options[index].mediaPath && (
                                    <Chip
                                      label="Archivo adjunto"
                                      onDelete={() => {
                                        values.options[index].mediaPath = "";
                                        setFieldValue(`options[${index}].mediaPath`, "");
                                      }}
                                      color="secondary"
                                      size="small"
                                    />
                                  )}
                                </Box>

                                {values.options[index].mediaPath && (
                                  <Box mt={2}>
                                    {values.options[index].mediaPath.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                      <img
                                        src={`${process.env.REACT_APP_BACKEND_URL}/public/${values.options[index].mediaPath}`}
                                        alt="Preview"
                                        className={classes.mediaPreview}
                                      />
                                    )}
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
                                    {info.greetingMessage || "(Sin mensaje configurado)"}
                                  </Typography>
                                </Box>

                                {info.mediaPath && (
                                  <Box mb={2}>
                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                      Archivo adjunto:
                                    </Typography>
                                    {info.mediaPath.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                      <img
                                        src={`${process.env.REACT_APP_BACKEND_URL}/public/${info.mediaPath}`}
                                        alt="Media"
                                        className={classes.mediaPreview}
                                      />
                                    )}
                                  </Box>
                                )}

                                {info.id && <Box mt={2}>{getStepContent(info.id)}</Box>}
                              </>
                            )}
                          </AccordionDetails>

                          {editingIndex === index && (
                            <AccordionActions>
                              <Button
                                size="small"
                                onClick={() => {
                                  // Si la opción no tiene ID, significa que es nueva y no se guardó, removerla
                                  if (!values.options[index].id) {
                                    remove(index);
                                  }
                                  setEditingIndex(null);
                                  setExpanded(false);
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="small"
                                color="primary"
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={() => handleSaveBot(values)}
                                disabled={isSubmitting || !values.options[index].name || uploadingMedia[index]}
                              >
                                {uploadingMedia[index] ? 'Subiendo...' : 'Guardar'}
                              </Button>
                            </AccordionActions>
                          )}
                        </Accordion>
                      ))}

                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        push({
                          name: "",
                          greetingMessage: "",
                          mediaPath: "",
                          isAgent: false,
                        });
                        setEditingIndex(values.options.length);
                        setExpanded(values.options.length);
                      }}
                      className={classes.addButton}
                      fullWidth
                    >
                      Añadir nueva opción
                    </Button>
                  </>
                )}
              </FieldArray>
            )}
          </Formik>
        </div>
      )}
    </div>
  );
}
