import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  makeStyles,
  TextField,
  Typography,
  Tabs,
  Tab,
  Box,
} from "@material-ui/core";

import { green } from "@material-ui/core/colors";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import ColorPicker from "../ColorPicker";
import { Colorize } from "@material-ui/icons";
import ConfirmationModal from "../ConfirmationModal";
import VerticalLinearStepper from "../ChatBots/options_fixed";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },

  container: {
    display: "flex",
    flexWrap: "wrap",
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },

  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },

  colorAdorment: {
    width: 20,
    height: 20,
  },

  sectionTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 600,
    color: theme.palette.primary.main,
  },

  helpText: {
    fontSize: "0.875rem",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },

  timeFieldsContainer: {
    display: "flex",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },

  tabs: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2),
  },

  tabPanel: {
    padding: theme.spacing(2, 0),
  },
}));

const QueueSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  color: Yup.string().min(3, "Too Short!").max(9, "Too Long!").required(),
  greetingMessage: Yup.string(),
  startWork: Yup.string(),
  endWork: Yup.string(),
  absenceMessage: Yup.string(),
  chatbots: Yup.array()
    .of(
      Yup.object().shape({
        name: Yup.string().min(4, "too short").required("Required"),
      })
    )
    .required("Must have friends"),
});

const QueueModal = ({ open, onClose, queueId, onEdit }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    color: "",
    greetingMessage: "",
    startWork: "",
    endWork: "",
    absenceMessage: "",
    chatbots: [],
  };

  const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);
  const [queue, setQueue] = useState(initialState);
  const [currentQueueId, setCurrentQueueId] = useState(queueId);
  const greetingRef = useRef();
  const absenceRef = useRef();
  const startWorkRef = useRef();
  const endWorkRef = useRef();
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Log para debug cuando cambie currentQueueId
  useEffect(() => {
    console.log('[QueueModal] currentQueueId changed:', currentQueueId);
  }, [currentQueueId]);

  useEffect(() => {
    setCurrentQueueId(queueId);
  }, [queueId]);

  useEffect(() => {
    (async () => {
      if (!currentQueueId) return;
      try {
        const { data } = await api.get(`/queue/${currentQueueId}`);
        setQueue((prevState) => {
          return { ...prevState, ...data };
        });
      } catch (err) {
        toastError(err);
      }
    })();

    return () => {
      setQueue({
        name: "",
        color: "",
        greetingMessage: "",
        chatbots: [],
        startWork: "",
        endWork: "",
        absenceMessage: "",
      });
    };
  }, [currentQueueId, open]);

  useEffect(() => {
    console.log(tabValue);
  }, [tabValue]);

  const handleClose = () => {
    onClose();
    setQueue(initialState);
    setCurrentQueueId(null);
    setTabValue(0);
  };

  const handleSaveQueue = async (values) => {
    try {
      const isNewQueue = !currentQueueId;
      let savedQueueId = currentQueueId;

      if (currentQueueId) {
        await api.put(`/queue/${currentQueueId}`, values);
      } else {
        console.log('[QueueModal] Creating new queue...');
        const { data } = await api.post("/queue", values);
        savedQueueId = data.id;
        console.log('[QueueModal] New queue created with ID:', data.id);
        // Actualizar el ID local y el estado del queue
        setCurrentQueueId(data.id);
        setQueue(data);
      }

      toast.success(`${i18n.t("queueModal.notification.title")}`);
      
      // Si es un nuevo queue, cambiar a la pestaña de opciones
      if (isNewQueue) {
        console.log('[QueueModal] Switching to tab 1 (Chatbot Options)');
        setTabValue(1);
        // Actualizar el prop onEdit para recargar la lista
        if (onEdit) {
          const { data } = await api.get(`/queue/${savedQueueId}`);
          onEdit(data);
        }
      } else {
        handleClose();
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedQueue(null);
  };

  const handleDeleteQueue = async (queueId) => {
    try {
      await api.delete(`/queue/${queueId}`);
      toast.success(i18n.t("queues.toasts.deleted"));
      if (onEdit) {
        onEdit();
      }
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteOptions = async (optionsId) => {
    try {
      await api.delete(`/chatbot/${optionsId}`);
      const { data } = await api.get(`/queue/${currentQueueId}`);
      setQueue(initialState);
      setQueue(data);
      toast.success("Opción eliminada correctamente");
    } catch (err) {
      toastError(err);
    }
  };

  const handleSaveChatbot = async (chatbotData) => {
    // Refrescar datos de la cola
    const { data } = await api.get(`/queue/${currentQueueId}`);
    setQueue(data);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`queue-tabpanel-${index}`}
        aria-labelledby={`queue-tab-${index}`}
        {...other}
      >
        {value === index && <Box className={classes.tabPanel}>{children}</Box>}
      </div>
    );
  };

  return (
    <div className={classes.root}>
      <ConfirmationModal
        title={
          selectedQueue &&
          `${i18n.t("queues.confirmationModal.deleteTitle")} ${
            selectedQueue.name
          }?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteQueue(selectedQueue.id)}
      >
        {i18n.t(
          "¿Está seguro? Todas las opciones integradas también se eliminarán"
        )}
      </ConfirmationModal>
      <Dialog open={open} onClose={handleClose} scroll="paper">
        <DialogTitle>
          {currentQueueId
            ? `${i18n.t("queueModal.title.edit")}`
            : `${i18n.t("queueModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={queue}
          validateOnChange={false}
          enableReinitialize={true}
          validationSchema={QueueSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveQueue(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ handleChange, touched, errors, isSubmitting, values }) => (
            <Form>
              <DialogContent dividers>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  className={classes.tabs}
                  variant="fullWidth"
                >
                  <Tab label="Configuración del Queue" />
                  <Tab label="Opciones de Chatbot" disabled={!currentQueueId} />
                </Tabs>

                {/* Tab 1: Configuración completa del Queue */}
                <TabPanel value={tabValue} index={0}>
                  {/* Sección: Información Básica */}
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Información Básica
                  </Typography>
                  <Typography variant="body2" className={classes.helpText}>
                    Nombre y color identificativo del queue
                  </Typography>

                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.name")}
                    autoFocus
                    name="name"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />

                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.color")}
                    name="color"
                    id="color"
                    onFocus={() => {
                      setColorPickerModalOpen(true);
                      greetingRef.current.focus();
                    }}
                    error={touched.color && Boolean(errors.color)}
                    helperText={touched.color && errors.color}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <div
                            style={{ backgroundColor: values.color }}
                            className={classes.colorAdorment}
                          ></div>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <IconButton
                          size="small"
                          color="default"
                          onClick={() => setColorPickerModalOpen(true)}
                        >
                          <Colorize />
                        </IconButton>
                      ),
                    }}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                  <ColorPicker
                    open={colorPickerModalOpen}
                    handleClose={() => setColorPickerModalOpen(false)}
                    onChange={(color) => {
                      values.color = color;
                      setQueue(() => {
                        return { ...values, color };
                      });
                    }}
                  />

                  {/* Sección: Mensajes */}
                  <Typography variant="h6" className={classes.sectionTitle} style={{ marginTop: 32 }}>
                    Mensajes
                  </Typography>
                  <Typography variant="body2" className={classes.helpText}>
                    Configure los mensajes automáticos
                  </Typography>

                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.greetingMessage")}
                    type="greetingMessage"
                    multiline
                    inputRef={greetingRef}
                    minRows={5}
                    fullWidth
                    name="greetingMessage"
                    error={
                      touched.greetingMessage && Boolean(errors.greetingMessage)
                    }
                    helperText={
                      touched.greetingMessage && errors.greetingMessage ||
                      "Mensaje que se envía cuando un usuario es asignado a esta cola"
                    }
                    variant="outlined"
                    margin="dense"
                  />

                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.absenceMessage")}
                    type="absenceMessage"
                    multiline
                    inputRef={absenceRef}
                    minRows={3}
                    fullWidth
                    name="absenceMessage"
                    error={
                      touched.absenceMessage && Boolean(errors.absenceMessage)
                    }
                    helperText={
                      touched.absenceMessage && errors.absenceMessage ||
                      "Mensaje que se envía fuera del horario de atención"
                    }
                    variant="outlined"
                    margin="dense"
                  />

                  {/* Sección: Horario */}
                  <Typography variant="h6" className={classes.sectionTitle} style={{ marginTop: 32 }}>
                    Horario de Atención
                  </Typography>
                  <Typography variant="body2" className={classes.helpText}>
                    Defina el horario en el que la cola está activa
                  </Typography>

                  <div className={classes.timeFieldsContainer}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueModal.form.startWork")}
                      type="time"
                      inputRef={startWorkRef}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        step: 600,
                      }}
                      fullWidth
                      name="startWork"
                      error={touched.startWork && Boolean(errors.startWork)}
                      helperText={
                        touched.startWork && errors.startWork || "Hora de inicio"
                      }
                      variant="outlined"
                      margin="dense"
                    />
                    <Field
                      as={TextField}
                      label={i18n.t("queueModal.form.endWork")}
                      type="time"
                      inputRef={endWorkRef}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        step: 600,
                      }}
                      fullWidth
                      name="endWork"
                      error={touched.endWork && Boolean(errors.endWork)}
                      helperText={touched.endWork && errors.endWork || "Hora de fin"}
                      variant="outlined"
                      margin="dense"
                    />
                  </div>
                </TabPanel>

                {/* Tab 2: Opciones de Chatbot */}
                <TabPanel value={tabValue} index={1}>
                  <Typography variant="h6" gutterBottom>
                    Opciones de Chatbot
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Configura las opciones y subopciones que el chatbot mostrará.
                    Puedes crear niveles anidados para una navegación más compleja.
                  </Typography>

                  {currentQueueId ? (
                    <>
                      {console.log('[QueueModal] Rendering VerticalLinearStepper with chatBotId:', currentQueueId)}
                      <VerticalLinearStepper chatBotId={currentQueueId} />
                    </>
                  ) : (
                    <Box 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center" 
                      justifyContent="center"
                      py={4}
                    >
                      <Typography variant="body1" color="textSecondary" gutterBottom>
                        Primero debes guardar el queue
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Las opciones de chatbot se configuran después de crear el queue
                      </Typography>
                    </Box>
                  )}
                </TabPanel>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("queueModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {currentQueueId
                    ? `${i18n.t("queueModal.buttons.okEdit")}`
                    : `${i18n.t("queueModal.buttons.okAdd")}`}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default QueueModal;
