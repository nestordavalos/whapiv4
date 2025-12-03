import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  CircularProgress,
  TextField,
  Switch,
  FormControlLabel,
  FormControl,
  FormGroup,
  Grid,
  MenuItem,
  InputLabel,
  Select,
  Checkbox,
  Typography,
  Box,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Paper,
  Collapse,
  Slider,
} from "@material-ui/core";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },

  dialog: {
    "& .MuiDialog-paper": {
      borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      [theme.breakpoints.down("xs")]: {
        borderRadius: 12,
        margin: 12,
        maxHeight: "calc(100% - 24px)",
      },
    },
  },

  dialogTitle: {
    padding: "20px 24px 16px",
    "& .MuiTypography-root": {
      fontWeight: 600,
      fontSize: "1.25rem",
      color: "#212529",
    },
    [theme.breakpoints.down("xs")]: {
      padding: "16px 16px 12px",
      "& .MuiTypography-root": {
        fontSize: "1.1rem",
      },
    },
  },

  dialogContent: {
    padding: "16px 24px",
    [theme.breakpoints.down("xs")]: {
      padding: "12px 16px",
    },
  },

  multFieldLine: {
    display: "flex",
    gap: theme.spacing(1.5),
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
  },

  textField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      transition: "all 0.2s ease",
      "&:hover": {
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
      },
      "&.Mui-focused": {
        boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
      },
    },
    "& .MuiInputLabel-root": {
      fontWeight: 500,
    },
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

  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: theme.palette.primary.main,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },

  messageField: {
    marginBottom: theme.spacing(2),
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
    },
  },

  switchControlBox: {
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.04)',
    borderRadius: 10,
    border: `1px solid ${theme.palette.primary.main}33`,
    marginBottom: theme.spacing(2),
  },

  workHoursBox: {
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
    borderRadius: 10,
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
  },

  tabsContainer: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },

  tabs: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    "& .MuiTabs-indicator": {
      backgroundColor: theme.palette.primary.main,
      height: 3,
      borderRadius: "3px 3px 0 0",
    },
  },

  tab: {
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.9rem",
    minHeight: 48,
    "&.Mui-selected": {
      color: theme.palette.primary.main,
      fontWeight: 600,
    },
    [theme.breakpoints.down("xs")]: {
      fontSize: "0.8rem",
      minHeight: 42,
      padding: "6px 12px",
    },
  },

  tabPanel: {
    padding: theme.spacing(2, 0),
  },

  dialogActions: {
    padding: "16px 24px",
    gap: 12,
  },

  cancelButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 500,
    padding: "8px 20px",
  },

  submitButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 500,
    padding: "8px 20px",
    boxShadow: "0 2px 8px rgba(25, 118, 210, 0.25)",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(25, 118, 210, 0.35)",
    },
  },

  expediente: {
    display: "flex",
    flexWrap: "wrap",
  },
  tituloReceberMsg: {
    fontSize: 12,
    marginLeft: theme.spacing(1),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  reabrirTicket: {
    fontSize: 12,
    display: "flex",
    marginLeft: theme.spacing(2),
  },
  textSize: {
    fontSize: 12,
  },
  paperReceberMsg: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  diasSemana: {
    marginLeft: theme.spacing(1),
  },
  hora: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    width: 170,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
  },
  textoExpediente: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(1),
    marginBottom: theme.spacing(3),
    width: "100%",
  },
  // Sync config styles
  syncConfigBox: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2),
  },
  syncSliderLabel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  syncSliderValue: {
    fontWeight: 600,
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
    padding: "4px 12px",
    borderRadius: 8,
    fontSize: "0.85rem",
  },
  syncInfoBox: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === "dark" 
      ? "rgba(33, 150, 243, 0.1)" 
      : "rgba(33, 150, 243, 0.05)",
    borderRadius: 8,
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.type === "dark" 
      ? "rgba(33, 150, 243, 0.3)" 
      : "rgba(33, 150, 243, 0.2)"}`,
  },
}));

const SessionSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`whatsapp-tabpanel-${index}`}
      aria-labelledby={`whatsapp-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const WhatsAppModal = ({ open, onClose, whatsAppId }) => {
  const classes = useStyles();
  const [activeTab, setActiveTab] = useState(0);
  const initialState = {
    name: "",
    greetingMessage: "",
    farewellMessage: "",
    ratingMessage: "",
    isDefault: false,
    isDisplay: false,
    transferTicketMessage: "",
    isGroup: false,
    inactiveMessage: "",
    sendInactiveMessage: false,
    timeInactiveMessage: "",
    webhookEnabled: false,
    archiveOnClose: false,
    // Sync configuration
    syncMaxMessagesPerChat: 50,
    syncMaxChats: 100,
    syncMaxMessageAgeHours: 24,
    syncDelayBetweenChats: 100,
    syncMarkAsSeen: true,
    syncCreateClosedForRead: true,
  };
  const [whatsApp, setWhatsApp] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [expandedWebhook, setExpandedWebhook] = useState(null);

  const [defineWorkHours, SetDefineWorkHours] = useState("");
  const [outOfWorkMessage, setOutOfWorkMessage] = useState("");

  const [StartDefineWorkHoursMonday, setStartDefineWorkHoursMonday] = useState('08:00');
  const [EndDefineWorkHoursMonday, setEndDefineWorkHoursMonday] = useState('18:00')
  const [StartDefineWorkHoursMondayLunch, setStartDefineWorkHoursMondayLunch] = useState('12:00')
  const [EndDefineWorkHoursMondayLunch, setEndDefineWorkHoursMondayLunch] = useState('13:00')

  const [StartDefineWorkHoursTuesday, setStartDefineWorkHoursTuesday] = useState('08:00')
  const [EndDefineWorkHoursTuesday, setEndDefineWorkHoursTuesday] = useState('18:00')
  const [StartDefineWorkHoursTuesdayLunch, setStartDefineWorkHoursTuesdayLunch] = useState('12:00')
  const [EndDefineWorkHoursTuesdayLunch, setEndDefineWorkHoursTuesdayLunch] = useState('13:00')

  const [StartDefineWorkHoursWednesday, setStartDefineWorkHoursWednesday] = useState('08:00')
  const [EndDefineWorkHoursWednesday, setEndDefineWorkHoursWednesday] = useState('18:00')
  const [StartDefineWorkHoursWednesdayLunch, setStartDefineWorkHoursWednesdayLunch] = useState('12:00')
  const [EndDefineWorkHoursWednesdayLunch, setEndDefineWorkHoursWednesdayLunch] = useState('13:00')

  const [StartDefineWorkHoursThursday, setStartDefineWorkHoursThursday] = useState('08:00')
  const [EndDefineWorkHoursThursday, setEndDefineWorkHoursThursday] = useState('18:00')
  const [StartDefineWorkHoursThursdayLunch, setStartDefineWorkHoursThursdayLunch] = useState('12:00')
  const [EndDefineWorkHoursThursdayLunch, setEndDefineWorkHoursThursdayLunch] = useState('13:00')

  const [StartDefineWorkHoursFriday, setStartDefineWorkHoursFriday] = useState('08:00')
  const [EndDefineWorkHoursFriday, setEndDefineWorkHoursFriday] = useState('18:00')
  const [StartDefineWorkHoursFridayLunch, setStartDefineWorkHoursFridayLunch] = useState('12:00')
  const [EndDefineWorkHoursFridayLunch, setEndDefineWorkHoursFridayLunch] = useState('13:00')

  const [StartDefineWorkHoursSaturday, setStartDefineWorkHoursSaturday] = useState("");
  const [EndDefineWorkHoursSaturday, setEndDefineWorkHoursSaturday] = useState("");
  const [StartDefineWorkHoursSaturdayLunch, setStartDefineWorkHoursSaturdayLunch] = useState("");
  const [EndDefineWorkHoursSaturdayLunch, setEndDefineWorkHoursSaturdayLunch] = useState("");

  const [StartDefineWorkHoursSunday, setStartDefineWorkHoursSunday] = useState("");
  const [EndDefineWorkHoursSunday, setEndDefineWorkHoursSunday] = useState("");
  const [StartDefineWorkHoursSundayLunch, setStartDefineWorkHoursSundayLunch] = useState("");
  const [EndDefineWorkHoursSundayLunch, setEndDefineWorkHoursSundayLunch] = useState("");

  // const [startWorkHour, setStartWorkHour] = useState("08:00");
  // const [endWorkHour, setEndWorkHour] = useState("17:30");
  // const [startWorkHourWeekend, setStartWorkHourWeekend] = useState("08:00");
  // const [endWorkHourWeekend, setEndWorkHourWeekend] = useState("17:30");
  const [seg, setSeg] = useState(true);
  const [ter, setTer] = useState(true);
  const [quar, setQuar] = useState(true);
  const [quin, setQuin] = useState(true);
  const [sex, setSex] = useState(true);
  const [sab, setSab] = useState(false);
  const [dom, setDom] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`whatsapp/${whatsAppId}`);
        setWhatsApp(data);

        setSeg(data.monday);
        setTer(data.tuesday);
        setQuar(data.wednesday);
        setQuin(data.thursday);
        setSex(data.friday);
        setSab(data.saturday);
        setDom(data.sunday);
        setStartDefineWorkHoursMonday(data.StartDefineWorkHoursMonday);
        setEndDefineWorkHoursMonday(data.EndDefineWorkHoursMonday);
        setStartDefineWorkHoursMondayLunch(data.StartDefineWorkHoursMondayLunch);
        setEndDefineWorkHoursMondayLunch(data.EndDefineWorkHoursMondayLunch);

        setStartDefineWorkHoursTuesday(data.StartDefineWorkHoursTuesday);
        setEndDefineWorkHoursTuesday(data.EndDefineWorkHoursTuesday);
        setStartDefineWorkHoursTuesdayLunch(data.StartDefineWorkHoursTuesdayLunch);
        setEndDefineWorkHoursTuesdayLunch(data.EndDefineWorkHoursTuesdayLunch);

        setStartDefineWorkHoursWednesday(data.StartDefineWorkHoursWednesday);
        setEndDefineWorkHoursWednesday(data.EndDefineWorkHoursWednesday);
        setStartDefineWorkHoursWednesdayLunch(data.StartDefineWorkHoursWednesdayLunch);
        setEndDefineWorkHoursWednesdayLunch(data.EndDefineWorkHoursWednesdayLunch);

        setStartDefineWorkHoursThursday(data.StartDefineWorkHoursThursday);
        setEndDefineWorkHoursThursday(data.EndDefineWorkHoursThursday);
        setStartDefineWorkHoursThursdayLunch(data.StartDefineWorkHoursThursdayLunch);
        setEndDefineWorkHoursThursdayLunch(data.EndDefineWorkHoursThursdayLunch);

        setStartDefineWorkHoursFriday(data.StartDefineWorkHoursFriday);
        setEndDefineWorkHoursFriday(data.EndDefineWorkHoursFriday);
        setStartDefineWorkHoursFridayLunch(data.StartDefineWorkHoursFridayLunch);
        setEndDefineWorkHoursFridayLunch(data.EndDefineWorkHoursFridayLunch);

        setStartDefineWorkHoursSaturday(data.StartDefineWorkHoursSaturday);
        setEndDefineWorkHoursSaturday(data.EndDefineWorkHoursSaturday);
        setStartDefineWorkHoursSaturdayLunch(data.StartDefineWorkHoursSaturdayLunch);
        setEndDefineWorkHoursSaturdayLunch(data.EndDefineWorkHoursSaturdayLunch);

        setStartDefineWorkHoursSunday(data.StartDefineWorkHoursSunday);
        setEndDefineWorkHoursSunday(data.EndDefineWorkHoursSunday);
        setStartDefineWorkHoursSundayLunch(data.StartDefineWorkHoursSundayLunch);
        setEndDefineWorkHoursSundayLunch(data.EndDefineWorkHoursSundayLunch);



        SetDefineWorkHours(data.defineWorkHours);
        setOutOfWorkMessage(data.outOfWorkMessage);
        // setStartWorkHour(data.startWorkHour);
        // setEndWorkHour(data.endWorkHour);
        // setStartWorkHourWeekend(data.startWorkHourWeekend);
        // setEndWorkHourWeekend(data.endWorkHourWeekend);

        const whatsQueueIds = data.queues?.map(queue => queue.id);
        setSelectedQueueIds(whatsQueueIds);

        // Load webhooks (multiple webhooks support)
        if (data.webhookUrls) {
          try {
            const loadedWebhooks = JSON.parse(data.webhookUrls);
            setWebhooks(loadedWebhooks);
          } catch {
            setWebhooks([]);
          }
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  // Helper functions for managing webhooks
  const generateWebhookId = () => {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addWebhook = () => {
    const newWebhook = {
      id: generateWebhookId(),
      name: `Webhook ${webhooks.length + 1}`,
      url: "",
      enabled: true,
      events: ["message_received"],
    };
    setWebhooks([...webhooks, newWebhook]);
    setExpandedWebhook(newWebhook.id);
  };

  const updateWebhook = (webhookId, field, value) => {
    setWebhooks(webhooks.map(wh => 
      wh.id === webhookId ? { ...wh, [field]: value } : wh
    ));
  };

  const removeWebhook = (webhookId) => {
    setWebhooks(webhooks.filter(wh => wh.id !== webhookId));
    if (expandedWebhook === webhookId) {
      setExpandedWebhook(null);
    }
  };

  const toggleWebhookEvent = (webhookId, eventValue) => {
    setWebhooks(webhooks.map(wh => {
      if (wh.id !== webhookId) return wh;
      const events = wh.events || [];
      if (events.includes(eventValue)) {
        return { ...wh, events: events.filter(e => e !== eventValue) };
      } else {
        return { ...wh, events: [...events, eventValue] };
      }
    }));
  };




  const handleChange = (e) => {
    if (e.target.value === "MON") {
      setSeg(e.target.checked);
    }
    if (e.target.value === "TUE") {
      setTer(e.target.checked);
    }
    if (e.target.value === "WED") {
      setQuar(e.target.checked);
    }
    if (e.target.value === "THU") {
      setQuin(e.target.checked);
    }
    if (e.target.value === "FRI") {
      setSex(e.target.checked);
    }
    if (e.target.value === "SAT") {
      setSab(e.target.checked);
    }
    if (e.target.value === "SUN") {
      setDom(e.target.checked);
    }

    if (e.target.value === "defineWorkHours") {
      SetDefineWorkHours(e.target.checked);
    }
  };

  const handleSaveWhatsApp = async values => {
    const whatsappData = {
      ...values, queueIds: selectedQueueIds,

      StartDefineWorkHoursMonday: StartDefineWorkHoursMonday,
      EndDefineWorkHoursMonday: EndDefineWorkHoursMonday,
      StartDefineWorkHoursMondayLunch: StartDefineWorkHoursMondayLunch,
      EndDefineWorkHoursMondayLunch: EndDefineWorkHoursMondayLunch,

      StartDefineWorkHoursTuesday: StartDefineWorkHoursTuesday,
      EndDefineWorkHoursTuesday: EndDefineWorkHoursTuesday,
      StartDefineWorkHoursTuesdayLunch: StartDefineWorkHoursTuesdayLunch,
      EndDefineWorkHoursTuesdayLunch: EndDefineWorkHoursTuesdayLunch,

      StartDefineWorkHoursWednesday: StartDefineWorkHoursWednesday,
      EndDefineWorkHoursWednesday: EndDefineWorkHoursWednesday,
      StartDefineWorkHoursWednesdayLunch: StartDefineWorkHoursWednesdayLunch,
      EndDefineWorkHoursWednesdayLunch: EndDefineWorkHoursWednesdayLunch,

      StartDefineWorkHoursThursday: StartDefineWorkHoursThursday,
      EndDefineWorkHoursThursday: EndDefineWorkHoursThursday,
      StartDefineWorkHoursThursdayLunch: StartDefineWorkHoursThursdayLunch,
      EndDefineWorkHoursThursdayLunch: EndDefineWorkHoursThursdayLunch,

      StartDefineWorkHoursFriday: StartDefineWorkHoursFriday,
      EndDefineWorkHoursFriday: EndDefineWorkHoursFriday,
      StartDefineWorkHoursFridayLunch: StartDefineWorkHoursFridayLunch,
      EndDefineWorkHoursFridayLunch: EndDefineWorkHoursFridayLunch,

      StartDefineWorkHoursSaturday: StartDefineWorkHoursSaturday,
      EndDefineWorkHoursSaturday: EndDefineWorkHoursSaturday,
      StartDefineWorkHoursSaturdayLunch: StartDefineWorkHoursSaturdayLunch,
      EndDefineWorkHoursSaturdayLunch: EndDefineWorkHoursSaturdayLunch,

      StartDefineWorkHoursSunday: StartDefineWorkHoursSunday,
      EndDefineWorkHoursSunday: EndDefineWorkHoursSunday,
      StartDefineWorkHoursSundayLunch: StartDefineWorkHoursSundayLunch,
      EndDefineWorkHoursSundayLunch: EndDefineWorkHoursSundayLunch,

      defineWorkHours: defineWorkHours,
      outOfWorkMessage: outOfWorkMessage,
      monday: seg,
      tuesday: ter,
      wednesday: quar,
      thursday: quin,
      friday: sex,
      saturday: sab,
      sunday: dom,
      webhookUrls: webhooks,
    };

    try {
      if (whatsAppId) {
        await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
      } else {
        await api.post("/whatsapp", whatsappData);
      }
      toast.success(i18n.t("whatsappModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleClose = () => {
    onClose();
    setWhatsApp(initialState);

    setStartDefineWorkHoursMonday();
    setEndDefineWorkHoursMonday();
    setStartDefineWorkHoursMondayLunch();
    setEndDefineWorkHoursMondayLunch();

    setStartDefineWorkHoursTuesday();
    setEndDefineWorkHoursTuesday();
    setStartDefineWorkHoursTuesdayLunch();
    setEndDefineWorkHoursTuesdayLunch();

    setStartDefineWorkHoursWednesday();
    setEndDefineWorkHoursWednesday();
    setStartDefineWorkHoursWednesdayLunch();
    setEndDefineWorkHoursWednesdayLunch();

    setStartDefineWorkHoursThursday();
    setEndDefineWorkHoursThursday();
    setStartDefineWorkHoursThursdayLunch();
    setEndDefineWorkHoursThursdayLunch();

    setStartDefineWorkHoursFriday();
    setEndDefineWorkHoursFriday();
    setStartDefineWorkHoursFridayLunch();
    setEndDefineWorkHoursFridayLunch();

    setStartDefineWorkHoursSaturday();
    setEndDefineWorkHoursSaturday();
    setStartDefineWorkHoursSaturdayLunch();
    setEndDefineWorkHoursSaturdayLunch();

    setStartDefineWorkHoursSunday();
    setEndDefineWorkHoursSunday();
    setStartDefineWorkHoursSundayLunch();
    setEndDefineWorkHoursSundayLunch();

    setSelectedQueueIds([]);
    setWebhooks([]);
    // SetDefineWorkHours();
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
        className={classes.dialog}
      >
        <DialogTitle className={classes.dialogTitle}>
          <Box display="flex" alignItems="center" gap={1}>
            <span role="img" aria-label="chat" style={{ fontSize: 24 }}>💬</span>
            <span>
              {whatsAppId
                ? i18n.t("whatsappModal.title.edit")
                : i18n.t("whatsappModal.title.add")}
            </span>
          </Box>
        </DialogTitle>
        <Formik
          initialValues={whatsApp}
          enableReinitialize={true}
          validationSchema={SessionSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveWhatsApp(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, touched, errors, isSubmitting }) => (
            <Form>
              <DialogContent dividers className={classes.dialogContent}>
                {/* Tabs principales */}
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  className={classes.tabs}
                  indicatorColor="primary"
                  textColor="primary"
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span role="img" aria-label="settings">⚙️</span> Configuración
                      </Box>
                    } 
                    className={classes.tab}
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span role="img" aria-label="timer">⏱️</span> Inactividad
                      </Box>
                    } 
                    className={classes.tab}
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span role="img" aria-label="clock">🕐</span> Horarios
                      </Box>
                    } 
                    className={classes.tab}
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span role="img" aria-label="clipboard">📋</span> Colas
                      </Box>
                    } 
                    className={classes.tab}
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span role="img" aria-label="sync">🔄</span> Sincronización
                      </Box>
                    } 
                    className={classes.tab}
                  />
                  <Tab 
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span role="img" aria-label="webhook">🔗</span> Webhook
                      </Box>
                    } 
                    className={classes.tab}
                  />
                </Tabs>

                {/* Tab 0: Configuración Básica */}
                <TabPanel value={activeTab} index={0} className={classes.tabPanel}>
                  <Field
                    as={TextField}
                    label={i18n.t("whatsappModal.form.name")}
                    autoFocus
                    name="name"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    className={classes.textField}
                    style={{ marginBottom: 16 }}
                  />
                  <div className={classes.multFieldLine} style={{ padding: '12px 16px' }}>
                    <FormControlLabel
                      control={
                        <Field
                          as={Switch}
                          color="primary"
                          name="isDefault"
                          checked={values.isDefault}
                        />
                      }
                      label={i18n.t("whatsappModal.form.default")}
                    />
                    <FormControlLabel
                      control={
                        <Field
                          as={Switch}
                          color="primary"
                          name="isDisplay"
                          checked={values.isDisplay}
                        />
                      }
                      label={i18n.t("whatsappModal.form.display")}
                    />
                    <FormControlLabel
                      control={
                        <Field
                          as={Switch}
                          color="primary"
                          name="isGroup"
                          checked={values.isGroup}
                        />
                      }
                      label={i18n.t("whatsappModal.form.group")}
                    />
                    <FormControlLabel
                      control={
                        <Field
                          as={Switch}
                          color="primary"
                          name="archiveOnClose"
                          checked={values.archiveOnClose}
                        />
                      }
                      label={i18n.t("whatsappModal.form.archiveOnClose")}
                    />
                  </div>
                  <div className={classes.messageField} style={{ marginTop: 16 }}>
                    <Field
                      as={TextField}
                      label={i18n.t("queueModal.form.greetingMessage")}
                      type="greetingMessage"
                      multiline
                      minRows={4}
                      fullWidth
                      name="greetingMessage"
                      error={
                        touched.greetingMessage && Boolean(errors.greetingMessage)
                      }
                      helperText={
                        touched.greetingMessage && errors.greetingMessage
                      }
                      variant="outlined"
                      margin="dense"
                    />
                  </div>
                  <div className={classes.messageField}>
                    <Field
                      as={TextField}
                      label={i18n.t("whatsappModal.form.farewellMessage")}
                      type="farewellMessage"
                      multiline
                      minRows={4}
                      fullWidth
                      name="farewellMessage"
                      error={
                        touched.farewellMessage && Boolean(errors.farewellMessage)
                      }
                      helperText={
                        touched.farewellMessage && errors.farewellMessage
                      }
                      variant="outlined"
                      margin="dense"
                    />
                  </div>
                  <div className={classes.messageField}>
                    <Field
                      as={TextField}
                      label={i18n.t("whatsappModal.form.ratingMessage")}
                      type="ratingMessage"
                      multiline
                      minRows={4}
                      fullWidth
                      name="ratingMessage"
                      helperText={i18n.t("whatsappModal.form.instructionRatingMessage")}
                      error={
                        touched.instructionRatingMessage && Boolean(errors.instructionRatingMessage)
                      }
                      variant="outlined"
                      margin="dense"
                    />
                  </div>
                </TabPanel>

                {/* Tab 1: Mensajes de Inactividad */}
                <TabPanel value={activeTab} index={1} className={classes.tabPanel}>
                  <Box className={classes.switchControlBox}>
                    <FormControlLabel
                      control={
                        <Field
                          as={Switch}
                          color="primary"
                          name="sendInactiveMessage"
                          checked={values.sendInactiveMessage}
                        />
                      }
                      label={i18n.t("whatsappModal.form.sendInactiveMessage")}
                    />
                  </Box>
                  
                  <div className={classes.messageField}>
                    <Field
                      as={TextField}
                      label={i18n.t("whatsappModal.form.inactiveMessage")}
                      type="inactiveMessage"
                      multiline
                      minRows={4}
                      fullWidth
                      name="inactiveMessage"
                      error={
                        touched.inactiveMessage && Boolean(errors.inactiveMessage)
                      }
                      helperText={
                        touched.inactiveMessage && errors.inactiveMessage
                      }
                      variant="outlined"
                      margin="dense"
                    />
                  </div>
                  <Grid xs={12} md={12} item>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel id="timeInactiveMessage-selection-label">
                        {i18n.t("whatsappModal.form.timeInactiveMessage")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("whatsappModal.form.timeInactiveMessage")}
                        placeholder={i18n.t(
                          "whatsappModal.form.timeInactiveMessage"
                        )}
                        labelId="timeInactiveMessage-selection-label"
                        id="timeInactiveMessage"
                        name="timeInactiveMessage"
                      >
                        <MenuItem value={"0"}>Desabilitado</MenuItem>
                        <MenuItem value={"0.08"}>5 minutos</MenuItem>
                        <MenuItem value={"0.25"}>15 minutos</MenuItem>
                        <MenuItem value={"1"}>1 hora</MenuItem>
                        <MenuItem value={"4"}>4 horas</MenuItem>
                        <MenuItem value={"8"}>8 horas</MenuItem>
                        <MenuItem value={"12"}>12 horas</MenuItem>
                        <MenuItem value={"24"}>24 horas</MenuItem>
                        <MenuItem value={"36"}>36 horas</MenuItem>
                        <MenuItem value={"96"}>4 dias</MenuItem>
                        <MenuItem value={"168"}>7 dias</MenuItem>
                      </Field>
                    </FormControl>
                  </Grid>
                </TabPanel>

                {/* Tab 2: Horarios de Atención */}
                <TabPanel value={activeTab} index={2} className={classes.tabPanel}>
                  <Box className={classes.switchControlBox}>
                    <FormControlLabel
                      control={
                        <Field
                          as={Switch}
                          value="defineWorkHours"
                          name="outOfWorkMessage"
                          color="primary"
                          checked={defineWorkHours}
                          onChange={handleChange}
                        />
                      }
                      label="Definir horario de Atención"
                      labelPlacement="end"
                    />
                  </Box>

                  {defineWorkHours === true && (
                    <>
                      <Box className={classes.workHoursBox}>
                        <TextField
                          label={i18n.t("whatsappModal.form.outOfWorkMessage")}
                          minRows={3}
                          multiline
                          fullWidth
                          name="outOfWorkMessage"
                          value={outOfWorkMessage}
                          error={
                            touched.outOfWorkMessage &&
                            Boolean(errors.outOfWorkMessage)
                          }
                          helperText={
                            touched.outOfWorkMessage &&
                            errors.outOfWorkMessage
                          }
                          variant="outlined"
                          margin="dense"
                          onChange={(e) => setOutOfWorkMessage(e.target.value)}
                        />
                      </Box>
                        <FormControl component="fieldset" sx={{ display: "flex", justifyContent: "center" }}>
                          <FormGroup
                            aria-label="position"
                            row
                            sx={{
                              width: {
                                xs: 100,
                                sm: 200,
                                md: 300,
                                lg: 600,
                                xl: 700,
                              },
                              justifyContent: "space-between",
                            }}
                          >
                            {/* _______________________________________________ */}
                            <FormControlLabel
                              value="MON"
                              control={
                                <Checkbox
                                  size="small"
                                  checked={seg}
                                  onChange={handleChange}
                                />
                              }
                              label={i18n.t("whatsappModal.form.monday")}
                              labelPlacement="end"
                              style={{ marginRight: 25 }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.startWorkHour")}
                              name="StartDefineWorkHoursMonday"
                              value={StartDefineWorkHoursMonday}
                              onChange={(e) => setStartDefineWorkHoursMonday(e.target.value)}
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.startWorkHourLunch")}</mark>` }} />}
                              name="StartDefineWorkHoursMondayLunch"
                              value={StartDefineWorkHoursMondayLunch}
                              onChange={(e) =>
                                setStartDefineWorkHoursMondayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />

                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.endWorkHourLunch")}</mark>` }} />}
                              name="EndDefineWorkHoursMondayLunch"
                              value={EndDefineWorkHoursMondayLunch}
                              onChange={(e) =>
                                setEndDefineWorkHoursMondayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}

                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.endWorkHour")}
                              name="EndDefineWorkHoursMonday"
                              value={EndDefineWorkHoursMonday}
                              onChange={(e) =>
                                setEndDefineWorkHoursMonday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />

                            {/* ____________________________________________________________________________________________________________ */}

                            <FormControlLabel
                              value="TUE"
                              control={
                                <Checkbox
                                  size="small"
                                  checked={ter}
                                  onChange={handleChange}
                                />
                              }
                              label={i18n.t("whatsappModal.form.tuesday")}
                              labelPlacement="end"
                              style={{ marginRight: 45 }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.startWorkHour")}
                              name="StartDefineWorkHoursTuesday"
                              value={StartDefineWorkHoursTuesday}
                              onChange={(e) =>
                                setStartDefineWorkHoursTuesday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.startWorkHourLunch")}</mark>` }} />}
                              name="StartDefineWorkHoursTuesdayLunch"
                              value={StartDefineWorkHoursTuesdayLunch}
                              onChange={(e) =>
                                setStartDefineWorkHoursTuesdayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />

                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.endWorkHourLunch")}</mark>` }} />}
                              name="EndDefineWorkHoursTuesdayLunch"
                              value={EndDefineWorkHoursTuesdayLunch}
                              onChange={(e) =>
                                setEndDefineWorkHoursTuesdayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.endWorkHour")}
                              name="EndDefineWorkHoursTuesday"
                              value={EndDefineWorkHoursTuesday}
                              onChange={(e) =>
                                setEndDefineWorkHoursTuesday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            {/* ____________________________________________________________________________________________________________ */}
                            <FormControlLabel
                              value="WED"
                              control={
                                <Checkbox
                                  size="small"
                                  checked={quar}
                                  onChange={handleChange}
                                />
                              }
                              label={i18n.t("whatsappModal.form.wednesday")}
                              labelPlacement="end"
                              style={{ marginRight: 40 }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.startWorkHour")}
                              name="StartDefineWorkHoursWednesday"
                              value={StartDefineWorkHoursWednesday}
                              onChange={(e) =>
                                setStartDefineWorkHoursWednesday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.startWorkHourLunch")}</mark>` }} />}
                              name="StartDefineWorkHoursWednesdayLunch"
                              value={StartDefineWorkHoursWednesdayLunch}
                              onChange={(e) =>
                                setStartDefineWorkHoursWednesdayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />

                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.endWorkHourLunch")}</mark>` }} />}
                              name="EndDefineWorkHoursWednesdayLunch"
                              value={EndDefineWorkHoursWednesdayLunch}
                              onChange={(e) =>
                                setEndDefineWorkHoursWednesdayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.endWorkHour")}
                              name="EndDefineWorkHoursWednesday"
                              value={EndDefineWorkHoursWednesday}
                              onChange={(e) =>
                                setEndDefineWorkHoursWednesday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            {/* ____________________________________________________________________________________________________________ */}
                            <FormControlLabel
                              value="THU"
                              control={
                                <Checkbox
                                  size="small"
                                  checked={quin}
                                  onChange={handleChange}
                                />
                              }
                              label={i18n.t("whatsappModal.form.thursday")}
                              labelPlacement="end"
                              style={{ marginRight: 40 }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.startWorkHour")}
                              name="StartDefineWorkHoursThursday"
                              value={StartDefineWorkHoursThursday}
                              onChange={(e) =>
                                setStartDefineWorkHoursThursday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.startWorkHourLunch")}</mark>` }} />}
                              name="StartDefineWorkHoursThursdayLunch"
                              value={StartDefineWorkHoursThursdayLunch}
                              onChange={(e) =>
                                setStartDefineWorkHoursThursdayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />

                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.endWorkHourLunch")}</mark>` }} />}
                              name="EndDefineWorkHoursThursdayLunch"
                              value={EndDefineWorkHoursThursdayLunch}
                              onChange={(e) =>
                                setEndDefineWorkHoursThursdayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.endWorkHour")}
                              name="EndDefineWorkHoursThursday"
                              value={EndDefineWorkHoursThursday}
                              onChange={(e) =>
                                setEndDefineWorkHoursThursday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            {/* ____________________________________________________________________________________________________________ */}
                            <FormControlLabel
                              value="FRI"
                              control={
                                <Checkbox
                                  size="small"
                                  checked={sex}
                                  onChange={handleChange}
                                />
                              }
                              label={i18n.t("whatsappModal.form.friday")}
                              labelPlacement="end"
                              style={{ marginRight: 45 }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.startWorkHour")}
                              name="StartDefineWorkHoursFriday"
                              value={StartDefineWorkHoursFriday}
                              onChange={(e) =>
                                setStartDefineWorkHoursFriday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.startWorkHourLunch")}</mark>` }} />}
                              name="StartDefineWorkHoursFridayLunch"
                              value={StartDefineWorkHoursFridayLunch}
                              onChange={(e) =>
                                setStartDefineWorkHoursFridayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />

                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.endWorkHourLunch")}</mark>` }} />}
                              name="EndDefineWorkHoursFridayLunch"
                              value={EndDefineWorkHoursFridayLunch}
                              onChange={(e) =>
                                setEndDefineWorkHoursFridayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.endWorkHour")}
                              name="EndDefineWorkHoursFriday"
                              value={EndDefineWorkHoursFriday}
                              onChange={(e) =>
                                setEndDefineWorkHoursFriday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            {/* ____________________________________________________________________________________________________________ */}
                            <FormControlLabel
                              value="SAT"
                              control={
                                <Checkbox
                                  size="small"
                                  checked={sab}
                                  onChange={handleChange}
                                />
                              }
                              label={i18n.t("whatsappModal.form.saturday")}
                              labelPlacement="end"
                              style={{ marginRight: 30 }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.startWorkHour")}
                              name="StartDefineWorkHoursSaturday"
                              value={StartDefineWorkHoursSaturday}
                              onChange={(e) =>
                                setStartDefineWorkHoursSaturday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.startWorkHourLunch")}</mark>` }} />}
                              name="StartDefineWorkHoursSaturdayLunch"
                              value={StartDefineWorkHoursSaturdayLunch}
                              onChange={(e) =>
                                setStartDefineWorkHoursSaturdayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />

                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.endWorkHourLunch")}</mark>` }} />}
                              name="EndDefineWorkHoursSaturdayLunch"
                              value={EndDefineWorkHoursSaturdayLunch}
                              onChange={(e) =>
                                setEndDefineWorkHoursSaturdayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.endWorkHour")}
                              name="EndDefineWorkHoursSaturday"
                              value={EndDefineWorkHoursSaturday}
                              onChange={(e) =>
                                setEndDefineWorkHoursSaturday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            {/* ____________________________________________________________________________________________________________ */}
                            <FormControlLabel
                              value="SUN"
                              control={
                                <Checkbox
                                  size="small"
                                  checked={dom}
                                  onChange={handleChange}
                                />
                              }
                              label={i18n.t("whatsappModal.form.sunday")}
                              labelPlacement="end"
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.startWorkHour")}
                              name="StartDefineWorkHoursSunday"
                              value={StartDefineWorkHoursSunday}
                              onChange={(e) =>
                                setStartDefineWorkHoursSunday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.startWorkHourLunch")}</mark>` }} />}
                              name="StartDefineWorkHoursSundayLunch"
                              value={StartDefineWorkHoursSundayLunch}
                              onChange={(e) =>
                                setStartDefineWorkHoursSundayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />

                            <TextField
                              className={classes.hora}
                              type="time"
                              label={<span dangerouslySetInnerHTML={{ __html: `<mark>${i18n.t("whatsappModal.form.endWorkHourLunch")}</mark>` }} />}
                              name="EndDefineWorkHoursSundayLunch"
                              value={EndDefineWorkHoursSundayLunch}
                              onChange={(e) =>
                                setEndDefineWorkHoursSundayLunch(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            <TextField
                              className={classes.hora}
                              type="time"
                              label={i18n.t("whatsappModal.form.endWorkHour")}
                              name="EndDefineWorkHoursSunday"
                              value={EndDefineWorkHoursSunday}
                              onChange={(e) =>
                                setEndDefineWorkHoursSunday(e.target.value)
                              }
                              InputLabelProps={{
                                shrink: true,
                                position: "top",
                              }}
                            />
                            {/* ____________________________________________________________________________________________________________ */}
                          </FormGroup>
                        </FormControl>
                      </>
                    )}
                  </TabPanel>

                  {/* Tab 3: Colas */}
                  <TabPanel value={activeTab} index={3} className={classes.tabPanel}>
                    <Box className={classes.tabContent}>
                      <Typography className={classes.sectionTitle}>
                        <span role="img" aria-label="clipboard">📋</span> {i18n.t("whatsappModal.form.queues")}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                        {i18n.t("whatsappModal.form.queuesDescription")}
                      </Typography>
                      <QueueSelect
                        selectedQueueIds={selectedQueueIds}
                        onChange={selectedIds => setSelectedQueueIds(selectedIds)}
                      />
                    </Box>
                  </TabPanel>

                  {/* Tab 4: Sincronización */}
                  <TabPanel value={activeTab} index={4} className={classes.tabPanel}>
                    <Box className={classes.tabContent}>
                      <Typography className={classes.sectionTitle}>
                        <span role="img" aria-label="sync">🔄</span> {i18n.t("whatsappModal.form.syncTitle")}
                      </Typography>
                      
                      <Box className={classes.syncInfoBox}>
                        <Typography variant="body2" color="textSecondary">
                          {i18n.t("whatsappModal.form.syncDescription")}
                        </Typography>
                      </Box>

                      <Box className={classes.syncConfigBox}>
                        <Typography variant="subtitle2" style={{ marginBottom: 16, fontWeight: 600 }}>
                          {i18n.t("whatsappModal.form.syncLimits")}
                        </Typography>

                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <Box className={classes.syncSliderLabel}>
                              <Typography variant="body2">
                                {i18n.t("whatsappModal.form.syncMaxMessagesPerChat")}
                              </Typography>
                              <span className={classes.syncSliderValue}>
                                {values.syncMaxMessagesPerChat || 50}
                              </span>
                            </Box>
                            <Field name="syncMaxMessagesPerChat">
                              {({ field, form }) => (
                                <Slider
                                  value={field.value || 50}
                                  onChange={(e, value) => form.setFieldValue("syncMaxMessagesPerChat", value)}
                                  min={1}
                                  max={500}
                                  step={10}
                                  valueLabelDisplay="auto"
                                />
                              )}
                            </Field>
                            <Typography variant="caption" color="textSecondary">
                              {i18n.t("whatsappModal.form.syncMaxMessagesPerChatDesc")}
                            </Typography>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Box className={classes.syncSliderLabel}>
                              <Typography variant="body2">
                                {i18n.t("whatsappModal.form.syncMaxChats")}
                              </Typography>
                              <span className={classes.syncSliderValue}>
                                {values.syncMaxChats || 100}
                              </span>
                            </Box>
                            <Field name="syncMaxChats">
                              {({ field, form }) => (
                                <Slider
                                  value={field.value || 100}
                                  onChange={(e, value) => form.setFieldValue("syncMaxChats", value)}
                                  min={1}
                                  max={1000}
                                  step={10}
                                  valueLabelDisplay="auto"
                                />
                              )}
                            </Field>
                            <Typography variant="caption" color="textSecondary">
                              {i18n.t("whatsappModal.form.syncMaxChatsDesc")}
                            </Typography>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Box className={classes.syncSliderLabel}>
                              <Typography variant="body2">
                                {i18n.t("whatsappModal.form.syncMaxMessageAgeHours")}
                              </Typography>
                              <span className={classes.syncSliderValue}>
                                {values.syncMaxMessageAgeHours || 24} {(values.syncMaxMessageAgeHours || 24) === 1 ? "hora" : "horas"}
                              </span>
                            </Box>
                            <Field name="syncMaxMessageAgeHours">
                              {({ field, form }) => (
                                <Slider
                                  value={field.value || 24}
                                  onChange={(e, value) => form.setFieldValue("syncMaxMessageAgeHours", value)}
                                  min={1}
                                  max={720}
                                  step={1}
                                  marks={[
                                    { value: 1, label: "1h" },
                                    { value: 24, label: "24h" },
                                    { value: 168, label: "7d" },
                                    { value: 720, label: "30d" },
                                  ]}
                                  valueLabelDisplay="auto"
                                />
                              )}
                            </Field>
                            <Typography variant="caption" color="textSecondary">
                              {i18n.t("whatsappModal.form.syncMaxMessageAgeHoursDesc")}
                            </Typography>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Box className={classes.syncSliderLabel}>
                              <Typography variant="body2">
                                {i18n.t("whatsappModal.form.syncDelayBetweenChats")}
                              </Typography>
                              <span className={classes.syncSliderValue}>
                                {values.syncDelayBetweenChats || 100} ms
                              </span>
                            </Box>
                            <Field name="syncDelayBetweenChats">
                              {({ field, form }) => (
                                <Slider
                                  value={field.value || 100}
                                  onChange={(e, value) => form.setFieldValue("syncDelayBetweenChats", value)}
                                  min={0}
                                  max={5000}
                                  step={50}
                                  valueLabelDisplay="auto"
                                />
                              )}
                            </Field>
                            <Typography variant="caption" color="textSecondary">
                              {i18n.t("whatsappModal.form.syncDelayBetweenChatsDesc")}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      <Box className={classes.syncConfigBox}>
                        <Typography variant="subtitle2" style={{ marginBottom: 16, fontWeight: 600 }}>
                          {i18n.t("whatsappModal.form.syncBehavior")}
                        </Typography>

                        <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <FormControlLabel
                            control={
                              <Field
                                as={Switch}
                                color="primary"
                                name="syncMarkAsSeen"
                                checked={values.syncMarkAsSeen !== false}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2">{i18n.t("whatsappModal.form.syncMarkAsSeen")}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {i18n.t("whatsappModal.form.syncMarkAsSeenDesc")}
                                </Typography>
                              </Box>
                            }
                          />

                          <FormControlLabel
                            control={
                              <Field
                                as={Switch}
                                color="primary"
                                name="syncCreateClosedForRead"
                                checked={values.syncCreateClosedForRead !== false}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2">{i18n.t("whatsappModal.form.syncCreateClosedForRead")}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {i18n.t("whatsappModal.form.syncCreateClosedForReadDesc")}
                                </Typography>
                              </Box>
                            }
                          />
                        </Box>
                      </Box>
                    </Box>
                  </TabPanel>

                  {/* Tab 5: Webhook */}
                  <TabPanel value={activeTab} index={5} className={classes.tabPanel}>
                    <Box className={classes.tabContent}>
                      <Typography className={classes.sectionTitle}>
                        <span role="img" aria-label="webhook">🔗</span> {i18n.t("whatsappModal.form.webhooksTitle")}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                        {i18n.t("whatsappModal.form.webhooksDescription")}
                      </Typography>
                      
                      <Box className={classes.switchControlBox}>
                        <FormControlLabel
                          control={
                            <Field
                              as={Switch}
                              color="primary"
                              name="webhookEnabled"
                              checked={values.webhookEnabled}
                            />
                          }
                          label={i18n.t("whatsappModal.form.webhookEnabled")}
                        />
                      </Box>

                      {values.webhookEnabled && (
                        <>
                          <Box style={{ marginTop: 16, marginBottom: 16 }}>
                            <Button
                              variant="outlined"
                              color="primary"
                              startIcon={<AddIcon />}
                              onClick={addWebhook}
                            >
                              {i18n.t("whatsappModal.form.addWebhook")}
                            </Button>
                          </Box>

                          {webhooks.length === 0 && (
                            <Typography variant="body2" color="textSecondary" style={{ fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
                              {i18n.t("whatsappModal.form.noWebhooks")}
                            </Typography>
                          )}

                          {webhooks.map((webhook, index) => (
                            <Paper 
                              key={webhook.id} 
                              variant="outlined" 
                              style={{ 
                                marginBottom: 12, 
                                borderRadius: 8,
                                borderColor: webhook.enabled ? '#4caf50' : '#bdbdbd'
                              }}
                            >
                              <Box 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  padding: '8px 16px',
                                  backgroundColor: 'rgba(0,0,0,0.02)',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setExpandedWebhook(expandedWebhook === webhook.id ? null : webhook.id)}
                              >
                                <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <Switch
                                    size="small"
                                    checked={webhook.enabled}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateWebhook(webhook.id, 'enabled', e.target.checked);
                                    }}
                                    color="primary"
                                  />
                                  <Typography variant="subtitle2">
                                    {webhook.name || `Webhook ${index + 1}`}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {webhook.url || i18n.t("whatsappModal.form.noUrlConfigured")}
                                  </Typography>
                                </Box>
                                <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeWebhook(webhook.id);
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" color="error" />
                                  </IconButton>
                                  {expandedWebhook === webhook.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </Box>
                              </Box>

                              <Collapse in={expandedWebhook === webhook.id}>
                                <Box style={{ padding: 16 }}>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label={i18n.t("whatsappModal.form.webhookName")}
                                        value={webhook.name}
                                        onChange={(e) => updateWebhook(webhook.id, 'name', e.target.value)}
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                        placeholder="Ej: n8n, Make, Zapier"
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label={i18n.t("whatsappModal.form.webhookUrl")}
                                        value={webhook.url}
                                        onChange={(e) => updateWebhook(webhook.id, 'url', e.target.value)}
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                        placeholder="https://your-server.com/webhook"
                                      />
                                    </Grid>
                                  </Grid>

                                  <Typography variant="subtitle2" style={{ marginTop: 16, marginBottom: 8 }}>
                                    {i18n.t("whatsappModal.form.webhookEvents")}
                                  </Typography>

                                  <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {[
                                      { value: 'message_received', label: i18n.t("whatsappModal.form.webhookEventMessageReceived") },
                                      { value: 'message_sent', label: i18n.t("whatsappModal.form.webhookEventMessageSent") },
                                      { value: 'message_ack', label: i18n.t("whatsappModal.form.webhookEventMessageAck") },
                                      { value: 'connection_update', label: i18n.t("whatsappModal.form.webhookEventConnectionUpdate") },
                                      { value: 'ticket_created', label: i18n.t("whatsappModal.form.webhookEventTicketCreated") },
                                      { value: 'ticket_updated', label: i18n.t("whatsappModal.form.webhookEventTicketUpdated") },
                                      { value: 'ticket_closed', label: i18n.t("whatsappModal.form.webhookEventTicketClosed") },
                                      { value: 'contact_created', label: i18n.t("whatsappModal.form.webhookEventContactCreated") },
                                      { value: 'contact_updated', label: i18n.t("whatsappModal.form.webhookEventContactUpdated") },
                                    ].map((event) => (
                                      <Chip
                                        key={event.value}
                                        label={event.label}
                                        size="small"
                                        clickable
                                        color={(webhook.events || []).includes(event.value) ? "primary" : "default"}
                                        onClick={() => toggleWebhookEvent(webhook.id, event.value)}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              </Collapse>
                            </Paper>
                          ))}

                          <Typography variant="body2" color="textSecondary" style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                            <strong><span role="img" aria-label="nota">📝</span> {i18n.t("whatsappModal.form.webhookPayloadExample")}:</strong><br/>
                            <code style={{ fontSize: '0.85em', whiteSpace: 'pre-wrap' }}>
                              {`{
  "event": "message_received",
  "timestamp": "2024-12-01T10:30:00Z",
  "connectionId": 1,
  "connectionName": "WhatsApp Principal",
  "data": {
    "messageId": "3EB0...",
    "body": "Descripción del archivo",
    "fromMe": false,
    "hasMedia": true,
    "ticketId": 123,
    "contact": {
      "id": 1,
      "name": "Juan",
      "number": "595991234567"
    },
    "media": {
      "url": "http://localhost:8080/public/...",
      "mimeType": "image",
      "type": "image"
    }
  }
}`}
                            </code>
                          </Typography>
                        </>
                      )}
                    </Box>
                  </TabPanel>
              </DialogContent>
              <DialogActions className={classes.dialogActions}>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                  className={classes.cancelButton}
                >
                  {i18n.t("whatsappModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={`${classes.btnWrapper} ${classes.submitButton}`}
                >
                  {whatsAppId
                    ? i18n.t("whatsappModal.buttons.okEdit")
                    : i18n.t("whatsappModal.buttons.okAdd")}
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

export default React.memo(WhatsAppModal);
