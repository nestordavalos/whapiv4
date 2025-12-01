import React, { useState, useEffect, useCallback } from "react";
import * as Yup from "yup";
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
  CircularProgress,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import SaveIcon from "@material-ui/icons/Save";
import AddIcon from "@material-ui/icons/Add";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import HelpOutlineOutlinedIcon from "@material-ui/icons/HelpOutlineOutlined";
import { Formik, Field, FieldArray } from "formik";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import ConfirmationModal from "../ConfirmationModal";

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
  addButton: {
    marginTop: theme.spacing(2),
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(3),
  },
}));

export default function VerticalLinearStepper(props) {
  const initialState = {
    name: "",
    greetingMessage: "",
    options: [],
  };

  const classes = useStyles();
  const [steps, setSteps] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isNameEdit, setIsNamedEdit] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState({});

  const isQueue = !props.isSubOption;

  const handleSaveOption = async (option, index, values) => {
    try {
      console.log('[ChatBot Options] ========== SAVING ==========');
      console.log('[ChatBot Options] option:', JSON.stringify(option, null, 2));
      console.log('[ChatBot Options] index:', index);
      console.log('[ChatBot Options] all values:', JSON.stringify(values, null, 2));
      console.log('[ChatBot Options] chatBotId:', props.chatBotId);
      console.log('[ChatBot Options] isQueue:', isQueue);
      console.log('[ChatBot Options] isSubOption:', props.isSubOption);

      if (!option.name || !option.name.trim()) {
        console.error('[ChatBot Options] ERROR: Name is empty!');
        toast.error("El nombre es obligatorio");
        return;
      }

      const dataToSend = {
        name: option.name.trim(),
        greetingMessage: option.greetingMessage || "",
        mediaPath: option.mediaPath || "",
        isAgent: option.isAgent || false,
      };

      console.log('[ChatBot Options] MediaPath being sent:', dataToSend.mediaPath);

      // Determinar si es una opción de queue (principal) o subopción
      if (isQueue) {
        dataToSend.queueId = props.chatBotId;
        console.log('[ChatBot Options] Adding queueId:', props.chatBotId);
      } else {
        dataToSend.chatbotId = props.chatBotId;
        console.log('[ChatBot Options] Adding chatbotId:', props.chatBotId);
      }

      console.log('[ChatBot Options] Final dataToSend:', JSON.stringify(dataToSend, null, 2));

      let response;
      if (option.id) {
        // Actualizar opción existente
        console.log('[ChatBot Options] Updating option ID:', option.id);
        response = await api.put(`/chatbot/${option.id}`, dataToSend);
        console.log('[ChatBot Options] Update response:', response.data);
        toast.success("Opción actualizada correctamente");
      } else {
        // Crear nueva opción
        console.log('[ChatBot Options] Creating new option with POST /chatbot');
        response = await api.post("/chatbot", dataToSend);
        console.log('[ChatBot Options] Create response:', response.data);
        toast.success("Opción creada correctamente");
      }
      
      // Recargar opciones
      console.log('[ChatBot Options] Reloading options...');
      await loadOptions();
      setIsNamedEdit(null);
      setExpanded(false);
      console.log('[ChatBot Options] ========== SAVE COMPLETE ==========');
    } catch (err) {
      console.error('[ChatBot Options] ========== SAVE ERROR ==========');
      console.error('[ChatBot Options] Error:', err);
      console.error('[ChatBot Options] Error response:', err.response);
      console.error('[ChatBot Options] Error response data:', err.response?.data);
      toastError(err);
    }
  };

  const loadOptions = async () => {
    if (!props.chatBotId) {
      console.log('[ChatBot Options] No chatBotId provided');
      return;
    }

    try {
      console.log('[ChatBot Options] Loading options for:', props.chatBotId, 'isQueue:', isQueue);
      
      // Usar el endpoint correcto según si es queue o subopción
      const endpoint = isQueue 
        ? `/chatbot/queue/${props.chatBotId}`
        : `/chatbot/chatbot/${props.chatBotId}`;
      
      console.log('[ChatBot Options] Fetching from:', endpoint);
      const { data } = await api.get(endpoint);
      console.log('[ChatBot Options] Loaded data:', data);
      
      // Los endpoints de list devuelven array directamente
      setSteps({
        name: "",
        greetingMessage: "",
        options: Array.isArray(data) ? data : []
      });
    } catch (err) {
      console.error('[ChatBot Options] Load error:', err);
      if (err.response?.status !== 404) {
        toastError(err);
      }
      // Si no hay opciones aún, inicializar vacío
      setSteps({
        name: "",
        greetingMessage: "",
        options: []
      });
    }
  };

  useEffect(() => {
    setLoading(true);

    const delayDebounceFn = setTimeout(() => {
      loadOptions().finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [props.chatBotId]);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedQueue(null);
  };

  const handleDeleteQueue = async (queueId) => {
    try {
      await api.delete(`/chatbot/${queueId}`);
      await loadOptions();
      setIsNamedEdit(null);
      toast.success("Opción eliminada correctamente");
    } catch (err) {
      toastError(err);
    }
    setSelectedQueue(null);
  };

  const handleMediaUpload = async (file, index, setFieldValue, values) => {
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

    setUploadingMedia({ ...uploadingMedia, [index]: true });

    try {
      console.log('[ChatBot Options] Uploading media file:', file.name);
      const formData = new FormData();
      formData.append("medias", file);

      const { data } = await api.post("/messages/media-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data && data.length > 0) {
        const mediaPath = data[0];
        console.log('[ChatBot Options] Media uploaded successfully:', mediaPath);
        
        // Actualizar Formik state
        setFieldValue(`options[${index}].mediaPath`, mediaPath);
        toast.success("Archivo subido. Haz clic en GUARDAR para confirmar.");
      }
    } catch (err) {
      console.error("[ChatBot Options] Error uploading media:", err);
      toastError(err);
    } finally {
      setUploadingMedia({ ...uploadingMedia, [index]: false });
    }
  };

  return (
    <div className={classes.root}>
      <ConfirmationModal
        title={
          selectedQueue && `¿Eliminar opción "${selectedQueue.name}"?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteQueue(selectedQueue.id)}
      >
        ¿Está seguro? Todas las sub-opciones también se eliminarán
      </ConfirmationModal>

      {loading ? (
        <div className={classes.loading}>
          <CircularProgress />
        </div>
      ) : (
        <div>
          <Formik
            initialValues={steps}
            validateOnChange={false}
            enableReinitialize={true}
            validationSchema={QueueSchema}
          >
            {({ touched, errors, isSubmitting, values, setFieldValue }) => (
              <FieldArray name="options">
                {({ push, remove }) => (
                  <>
                    {values.options && values.options.length === 0 && (
                      <Typography variant="body2" color="textSecondary" style={{ padding: '16px', textAlign: 'center' }}>
                        No hay opciones configuradas. Haz clic en "Añadir nueva opción" para comenzar.
                      </Typography>
                    )}

                    {values.options &&
                      values.options.length > 0 &&
                      values.options.map((info, index) => (
                        <Accordion
                          key={`${info.id ? info.id : index}-options`}
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
                                  {values.options[index].name || "Sin nombre"}
                                </Typography>
                                {info.isAgent && (
                                  <Chip label="Agente" size="small" color="primary" />
                                )}
                                {info.mediaPath && (
                                  <Chip
                                    icon={<AttachFileIcon />}
                                    label="Media"
                                    size="small"
                                    color="secondary"
                                  />
                                )}
                              </div>

                              <Box onClick={(e) => e.stopPropagation()}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsNamedEdit(index);
                                    setExpanded(index);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedQueue(values.options[index]);
                                    setConfirmModalOpen(true);
                                  }}
                                >
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </Box>
                            </div>
                          </AccordionSummary>

                          <AccordionDetails className={classes.accordionDetails}>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              Configurar opción
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

                            {!values.options[index]?.greetingMessage && (
                              <Box display="flex" alignItems="center" mt={1}>
                                <HelpOutlineOutlinedIcon
                                  color="secondary"
                                  fontSize="small"
                                  style={{ marginRight: 4 }}
                                />
                                <Typography variant="caption" color="secondary">
                                  El mensaje es obligatorio para crear sub-opciones
                                </Typography>
                              </Box>
                            )}

                            <Divider style={{ margin: "16px 0" }} />

                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              Archivo multimedia (opcional)
                            </Typography>
                            <Typography variant="caption" color="textSecondary" gutterBottom>
                              Adjunte una imagen, video, audio o PDF (máx. 20MB)
                            </Typography>

                            <Box display="flex" alignItems="center" gap={1} mt={1}>
                              <input
                                accept="image/*,video/*,audio/*,application/pdf"
                                style={{ display: "none" }}
                                id={`file-upload-${index}`}
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    handleMediaUpload(file, index, setFieldValue, values);
                                  }
                                }}
                              />
                              <label htmlFor={`file-upload-${index}`}>
                                <Button
                                  variant="outlined"
                                  component="span"
                                  startIcon={<AttachFileIcon />}
                                  disabled={uploadingMedia[index]}
                                >
                                  {uploadingMedia[index] ? "Subiendo..." : "Adjuntar archivo"}
                                </Button>
                              </label>

                              {values.options[index].mediaPath && (
                                <Box>
                                  <Chip
                                    label={values.options[index].mediaPath.split('/').pop() || "Archivo adjunto"}
                                    onDelete={() => {
                                      setFieldValue(`options[${index}].mediaPath`, "");
                                      toast.info("Archivo eliminado. Haz clic en GUARDAR para confirmar.");
                                    }}
                                    color="primary"
                                    size="small"
                                  />
                                  <Typography variant="caption" display="block" color="textSecondary" style={{ marginTop: 4 }}>
                                    Ruta: {values.options[index].mediaPath}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {values.options[index]?.mediaPath && (
                              <Box mt={2}>
                                <Typography variant="caption" color="textSecondary">
                                  Archivo: {values.options[index].mediaPath}
                                </Typography>
                              </Box>
                            )}

                            {values.options[index]?.greetingMessage && info.id && (
                              <Box mt={3}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Sub-opciones:
                                </Typography>
                                <VerticalLinearStepper chatBotId={info.id} isSubOption={true} />
                              </Box>
                            )}
                          </AccordionDetails>

                          <AccordionActions>
                            <Button size="small" onClick={() => setExpanded(false)}>
                              Cerrar
                            </Button>
                            <Button
                              size="small"
                              color="primary"
                              variant="contained"
                              startIcon={<SaveIcon />}
                              onClick={() => handleSaveOption(values.options[index], index, values)}
                              disabled={isSubmitting || uploadingMedia[index]}
                            >
                              Guardar
                            </Button>
                          </AccordionActions>
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
                        setIsNamedEdit(values.options.length);
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
