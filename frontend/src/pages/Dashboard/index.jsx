import React, { useState, useEffect } from "react";

import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText";
import { Typography, Avatar, Tab, Tabs, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

import SpeedIcon from "@mui/icons-material/Speed";
import GroupIcon from "@mui/icons-material/Group";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonIcon from "@mui/icons-material/Person";
import AppBar from "@mui/material/AppBar";
import SentimentSatisfiedAltIcon  from "@mui/icons-material/SentimentSatisfiedAlt";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import Score from "@mui/icons-material/Score";

import makeStyles from '@mui/styles/makeStyles';
import { toast } from "react-toastify";


//import Chart from "./Chart";
import ButtonWithSpinner from "../../components/ButtonWithSpinner";
import TabPanel from "../../components/TabPanel";
import { UsersFilter } from "../../components/UsersFilter";
import QueueSelect from "../../components/QueueSelect";
import TableAttendantsStatus from "../../components/Dashboard/TableAttendantsStatus";

//import CardCounter from "../../components/Dashboard/CardCounter";
import { isArray } from "lodash";

import useDashboard from "../../hooks/useDashboard";

import { isEmpty } from "lodash";
import moment from "moment";

const useStyles = makeStyles((theme) => ({
  page: {
    maxHeight: "calc(100vh - 72px)",
    overflowY: "auto",
    paddingBottom: theme.spacing(4),
    paddingTop: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
      maxHeight: "none",
      overflowY: "visible",
    },
  },
  tab: {
    paddingTop: theme.spacing(4),
    display: "flex",
    alignItems: "center",
    height: "auto",
    width: "100%",
    backgroundColor: theme.palette.background.paper,
    [theme.breakpoints.down('md')]: {
      paddingTop: theme.spacing(2),
    },
  },
  container: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(4),
    maxWidth: "1150px",
    minWidth: "xs",
    [theme.breakpoints.down('md')]: {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(2),
    },
  },
  cardContainer1: {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(85, 120, 235, 0.15)" : "#eef1fdff",
    width: "100%",
    height: "auto",
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid rgba(85, 120, 235, 0.3)` : "none",
    [theme.breakpoints.down('sm')]: {
      padding: "10px 12px",
      minHeight: 80,
    },
  },
  cardContainer2: {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 184, 34, 0.15)" : "#fff8e8ff",
    width: "100%",
    height: "auto",
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid rgba(255, 184, 34, 0.3)` : "none",
    [theme.breakpoints.down('sm')]: {
      padding: "10px 12px",
      minHeight: 80,
    },
  },
  cardContainer3: {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(10, 187, 135, 0.15)" : "#e6f8f3ff",
    width: "100%",
    height: "auto",
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid rgba(10, 187, 135, 0.3)` : "none",
    [theme.breakpoints.down('sm')]: {
      padding: "10px 12px",
      minHeight: 80,
    },
  },
  cardContainer4: {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(250, 112, 112, 0.15)" : "#fbe7edff",
    width: "100%",
    height: "auto",
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid rgba(250, 112, 112, 0.3)` : "none",
    [theme.breakpoints.down('sm')]: {
      padding: "10px 12px",
      minHeight: 80,
    },
  },
  cardContainer5: {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(10, 187, 135, 0.15)" : "#e6f8f3ff",
    width: "100%",
    height: "auto",
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid rgba(10, 187, 135, 0.3)` : "none",
    [theme.breakpoints.down('sm')]: {
      padding: "10px 12px",
      minHeight: 80,
    },
  },
  cardContainer6: {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(85, 120, 235, 0.15)" : "#eef1fdff",
    width: "100%",
    height: "auto",
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid rgba(85, 120, 235, 0.3)` : "none",
    [theme.breakpoints.down('sm')]: {
      padding: "10px 12px",
      minHeight: 80,
    },
  },
  cardContainer7: {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(85, 120, 235, 0.15)" : "#eef1fdff",
    width: "100%",
    height: "auto",
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid rgba(85, 120, 235, 0.3)` : "none",
    justifyItems: "center",
    [theme.breakpoints.down('sm')]: {
      padding: "10px 12px",
      minHeight: 80,
    },
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    height: 340,
    overflowY: "hidden",
    ...theme.scrollbarStyles,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    [theme.breakpoints.down('md')]: {
      height: "auto",
      minHeight: 200,
    },
  },
  cardAvatar: {
    paddingLeft: "12px",
    marginLeft: "auto",
    [theme.breakpoints.down('sm')]: {
      paddingLeft: "8px",
    },
  },
  cardAvatar1: {
    color: "#5578eb",
    width: "70px",
    height: "70px",
    display: "flex",
    fontSize: "48px",
    backgroundColor: theme.palette.mode === "dark" ? "rgba(85, 120, 235, 0.25)" : "#eef1fdff",
    borderRadius: 12,
    [theme.breakpoints.down('sm')]: {
      width: 50,
      height: 50,
      fontSize: "32px",
    },
  },
  cardAvatar2: {
    color: "#ffb822ff",
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 184, 34, 0.25)" : "#fff8e8ff",
    width: "70px",
    height: "70px",
    display: "flex",
    fontSize: "48px",
    borderRadius: 12,
    [theme.breakpoints.down('sm')]: {
      width: 50,
      height: 50,
      fontSize: "32px",
    },
  },
  cardAvatar3: {
    color: "#0abb87ff",
    backgroundColor: theme.palette.mode === "dark" ? "rgba(10, 187, 135, 0.25)" : "#e6f8f3ff",
    width: "70px",
    height: "70px",
    display: "flex",
    fontSize: "48px",
    borderRadius: 12,
    [theme.breakpoints.down('sm')]: {
      width: 50,
      height: 50,
      fontSize: "32px",
    },
  },
  cardAvatar4: {
    color: "#fa7070ff",
    backgroundColor: theme.palette.mode === "dark" ? "rgba(250, 112, 112, 0.25)" : "#fbe7edff",
    width: "70px",
    height: "70px",
    display: "flex",
    fontSize: "48px",
    borderRadius: 12,
    [theme.breakpoints.down('sm')]: {
      width: 50,
      height: 50,
      fontSize: "32px",
    },
  },
  cardAvatar5: {
    color: "#0abb87ff",
    backgroundColor: theme.palette.mode === "dark" ? "rgba(10, 187, 135, 0.25)" : "#e6f8f3ff",
    width: "70px",
    height: "70px",
    display: "flex",
    fontSize: "48px",
    borderRadius: 12,
    [theme.breakpoints.down('sm')]: {
      width: 50,
      height: 50,
      fontSize: "32px",
    },
  },
  cardAvatar6: {
    color: "#5578eb",
    backgroundColor: theme.palette.mode === "dark" ? "rgba(85, 120, 235, 0.25)" : "#eef1fdff",
    width: "70px",
    height: "70px",
    display: "flex",
    fontSize: "48px",
    borderRadius: 12,
    [theme.breakpoints.down('sm')]: {
      width: 50,
      height: 50,
      fontSize: "32px",
    },
  },
  cardTitle: {
    color: theme.palette.text.primary,
    fontSize: "0.85rem",
    fontWeight: 500,
    [theme.breakpoints.down('sm')]: {
      fontSize: "0.75rem",
    },
  },
  cardSubtitle2: {
    color: theme.palette.text.primary,
    fontSize: "1.5rem",
    fontWeight: 600,
    [theme.breakpoints.down('sm')]: {
      fontSize: "1.2rem",
    },
  },
  cardSubtitle: {
    color: theme.palette.text.primary,
    fontSize: "1.5rem",
    fontWeight: 600,
    [theme.breakpoints.down('sm')]: {
      fontSize: "1.2rem",
    },
  },
  alignRight: {
    textAlign: "right",
  },
  alignLeft: {
    textAlign: "left",
  },
  fullWidth: {
    width: "100%",
  },
  selectContainer: {
    width: "100%",
    textAlign: "left",
  },
  attendants: {
    backgroundColor: "#4287f5"
  },
  filterContainer: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    padding: theme.spacing(2.5, 2.75),
    marginBottom: theme.spacing(3),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(1.75),
    },
  },
  filterGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.5),
    alignItems: "flex-start",
  },
  filterActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: theme.spacing(1.5),
    width: "100%",
  },
  filterControl: {
    flex: "1 1 240px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 86,
    height: "100%",
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      minHeight: 54,
    },
    "& .MuiFormHelperText-root": {
      marginTop: theme.spacing(0.5),
    },
  },
  queueControl: {
    paddingTop: 0,
    alignSelf: "flex-start",
    marginTop: theme.spacing(-1.7),
  },
  tabsAppBar: {
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.4)" 
      : "0 2px 8px rgba(0,0,0,0.1)",
    backgroundColor: theme.palette.background.paper,
    border: theme.palette.mode === "dark" ? `1px solid ${theme.palette.divider}` : "none",
    "& .MuiTabs-root": {
      minHeight: 48,
    },
    "& .MuiTab-root": {
      minHeight: 48,
      fontSize: "0.85rem",
      fontWeight: 500,
      textTransform: "none",
      color: theme.palette.text.secondary,
      "&.Mui-selected": {
        color: theme.palette.primary.main,
      },
      [theme.breakpoints.down('sm')]: {
        fontSize: "0.75rem",
        minWidth: 80,
      },
    },
    "& .MuiTabs-indicator": {
      backgroundColor: theme.palette.primary.main,
    },
  },
  tableContainer: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.3)" 
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid ${theme.palette.divider}` : "none",
    "& .MuiTableHead-root": {
      backgroundColor: theme.palette.mode === "dark" 
        ? "rgba(0, 113, 193, 0.1)" 
        : "rgba(0, 113, 193, 0.05)",
    },
    "& .MuiTableCell-head": {
      color: theme.palette.text.primary,
      fontWeight: 600,
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    "& .MuiTableCell-body": {
      color: theme.palette.text.primary,
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    "& .MuiTableRow-root:hover": {
      backgroundColor: theme.palette.mode === "dark" 
        ? "rgba(255, 255, 255, 0.05)" 
        : "rgba(0, 0, 0, 0.02)",
    },
  },
  tableCard: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: theme.palette.mode === "dark"
      ? "0 2px 8px rgba(0,0,0,0.3)"
      : "0 2px 8px rgba(0,0,0,0.06)",
    border: theme.palette.mode === "dark" ? `1px solid ${theme.palette.divider}` : "none",
    marginTop: theme.spacing(2),
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
  summaryCard: {
    borderRadius: 12,
    padding: theme.spacing(1.75, 2),
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    boxShadow: theme.palette.mode === "dark"
      ? "0 2px 8px rgba(0,0,0,0.18)"
      : "0 2px 8px rgba(0,0,0,0.05)",
  },
  summaryLabel: {
    fontSize: "0.8rem",
    color: theme.palette.text.secondary,
    fontWeight: 600,
  },
  summaryValue: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
}));

const Dashboard = () => {
  const [tab, setTab] = useState("Indicadores");
  const classes = useStyles();
  const [counters, setCounters] = useState({});
  const [attendants, setAttendants] = useState([]);
  const [filterType, setFilterType] = useState(2);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedQueues, setSelectedQueues] = useState([]);
  const [period, setPeriod] = useState(7);
  const [dateFrom, setDateFrom] = useState(
    moment().subtract(7, "days").format("YYYY-MM-DD")
  );
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const { find } = useDashboard();
  const totalTickets = (Number(counters.supportPending) || 0) + (Number(counters.supportHappening) || 0) + (Number(counters.supportFinished) || 0);
  const resolvedRate = totalTickets > 0 ? Math.round((Number(counters.supportFinished) || 0) / totalTickets * 100) : 0;
  const openRate = totalTickets > 0 ? Math.round((Number(counters.supportPending) || 0) / totalTickets * 100) : 0;
  const ticketsByAgent = (attendants || []).map((att) => ({
    name: att.name,
    tickets: att.tickets || 0,
    avgWait: formatTime(att.avgWaitTime || 0),
    online: att.online,
  }));
  useEffect(() => {
    async function firstLoad() {
      await fetchData();
    }
    setTimeout(() => {
      firstLoad();
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChangePeriod(value) {
    setPeriod(value);
  }

  async function handleChangeFilterType(value) {
    setFilterType(value);
    if (value === 1) {
      setPeriod(0);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  }

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    setSelectedUsers(users);
  };


  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  async function fetchData() {
    setLoading(true);

    let params = { filterType };

    if (filterType === 2 && period > 0) {
      params = { days: period };
    }

    if (filterType === 1) {
      if (!isEmpty(dateFrom) && moment(dateFrom).isValid()) {
        params = {
          ...params,
          date_from: moment(dateFrom).format("YYYY-MM-DD"),
        };
      }

      if (!isEmpty(dateTo) && moment(dateTo).isValid()) {
        params = {
          ...params,
          date_to: moment(dateTo).format("YYYY-MM-DD"),
        };
      }
    }

    if (!isEmpty(selectedUsers)) {
       params = {
        ...params,
        userId: selectedUsers,
      };
    }

    if (!isEmpty(selectedQueues)) {
      params = {
       ...params,
       queueId: selectedQueues,
     };
   }


    if (Object.keys(params).length === 0) {
      toast.error("Parametrize o filtro");
      setLoading(false);
      return;
    }

    const data = await find(params);
    console.log("dashboard/find params", params, "response", data);

    let parsedCounters = {};
    try {
      parsedCounters = typeof data.counters === "string" ? JSON.parse(data.counters) : (data.counters || {});
    } catch (err) {
      parsedCounters = data.counters || {};
    }

    let parsedAttendants = [];
    try {
      parsedAttendants = typeof data.attendants === "string" ? JSON.parse(data.attendants) : (data.attendants || []);
    } catch (err) {
      parsedAttendants = data.attendants || [];
    }

    const toNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const pickNumber = (obj, aliases) => {
      const lowerKeys = Object.keys(obj || {}).reduce((acc, key) => {
        acc[key.toLowerCase()] = obj[key];
        return acc;
      }, {});

      for (const alias of aliases) {
        const direct = obj?.[alias];
        if (direct !== undefined && direct !== null) return toNumber(direct);
        const lower = lowerKeys[alias.toLowerCase()];
        if (lower !== undefined && lower !== null) return toNumber(lower);
      }

      // fallback: try first numeric value in object
      const numericCandidate = Object.values(obj || {}).find((v) => Number.isFinite(Number(v)));
      return toNumber(numericCandidate);
    };

    const sourceCounters = { ...(data || {}), ...(parsedCounters || {}) };

    const normalizedCounters = {
      supportPending: pickNumber(sourceCounters, ["supportPending", "pending", "waiting", "aguardando", "ticketsPending", "tickets_awaiting", "open"]),
      supportHappening: pickNumber(sourceCounters, ["supportHappening", "happening", "inProgress", "enConversacion", "ticketsHappening", "ticketsInProgress", "working"]),
      supportFinished: pickNumber(sourceCounters, ["supportFinished", "finished", "resolved", "resueltos", "resolvidos", "closed", "ticketsResolved", "ticketsFinished", "supportResolved", "resolvedCount"]),
      leads: pickNumber(sourceCounters, ["leads", "lead", "totalLeads", "leadsCount", "leadCount", "total_leads"]),
      avgSupportTime: pickNumber(sourceCounters, ["avgSupportTime", "averageSupportTime", "avgServiceTime", "avgAttendanceTime", "avgSupportDuration", "serviceTime"]),
      avgWaitTime: pickNumber(sourceCounters, ["avgWaitTime", "averageWaitTime", "avgWaitingTime", "waitTime", "waitingTime"]),
      npsPromotersPerc: toNumber(sourceCounters.npsPromotersPerc),
      npsPassivePerc: toNumber(sourceCounters.npsPassivePerc),
      npsDetractorsPerc: toNumber(sourceCounters.npsDetractorsPerc),
      npsScore: toNumber(sourceCounters.npsScore),
    };

    setCounters(normalizedCounters);
    if (isArray(parsedAttendants)) {
      setAttendants(parsedAttendants);
    } else {
      setAttendants([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  function formatTime(minutes) {
    return moment()
      .startOf("day")
      .add(minutes, "minutes")
      .format("HH[h] mm[m]");
  }

  function renderFilters() {
    if (filterType === 1) {
      return (
        <React.Fragment>
          <TextField
            label="Fecha Inicial"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={classes.filterControl}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            label="Fecha Final"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={classes.filterControl}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </React.Fragment>
      );
    } else {
      return (
        <FormControl className={classes.filterControl}>
          <InputLabel id="period-selector-label">Período</InputLabel>
          <Select
            labelId="period-selector-label"
            id="period-selector"
            value={period}
            onChange={(e) => handleChangePeriod(e.target.value)}
          >
            <MenuItem value={0}>Ninguna seleccionada</MenuItem>
            <MenuItem value={3}>Últimos 3 dias</MenuItem>
            <MenuItem value={7}>Últimos 7 dias</MenuItem>
            <MenuItem value={15}>Últimos 15 dias</MenuItem>
            <MenuItem value={30}>Últimos 30 dias</MenuItem>
            <MenuItem value={60}>Últimos 60 dias</MenuItem>
            <MenuItem value={90}>Últimos 90 dias</MenuItem>
          </Select>
          <FormHelperText>Seleccione el período deseado</FormHelperText>
        </FormControl>
      );
    }
  }

  return (
    <div className={classes.page}>
      <Container maxWidth="lg" className={classes.container}>
        <Paper className={classes.filterContainer} elevation={0}>
          <div className={classes.filterGrid}>
            <FormControl className={classes.filterControl}>
              <InputLabel id="period-selector-label">Tipo de Filtro</InputLabel>
              <Select
                labelId="period-selector-label"
                value={filterType}
                onChange={(e) => handleChangeFilterType(e.target.value)}
              >
                <MenuItem value={1}>Filtro por Fecha</MenuItem>
                <MenuItem value={2}>Filtro por Período</MenuItem>
              </Select>
              <FormHelperText>Seleccione el período deseado</FormHelperText>
            </FormControl>

            {renderFilters()}

            <FormControl className={`${classes.filterControl} ${classes.queueControl}`}>
              <QueueSelect 
                selectedQueueIds={selectedQueues} 
                onChange={values => setSelectedQueues(values)} 
              />
              <FormHelperText>Seleccione el período deseado</FormHelperText>
            </FormControl>

            <FormControl className={classes.filterControl}>
              <UsersFilter onFiltered={handleSelectedUsers} />
              <FormHelperText>Seleccione el período deseado</FormHelperText>
            </FormControl>
          </div>

          <div className={classes.filterActions}>
            <ButtonWithSpinner
              loading={loading}
              onClick={() => fetchData()}
              variant="contained"
              color="primary"
            >
              Filtrar
            </ButtonWithSpinner>
          </div>
        </Paper>

        <div className={classes.summaryRow}>
          <div className={classes.summaryCard}>
            <span className={classes.summaryLabel}>Conversaciones totales</span>
            <span className={classes.summaryValue}>{totalTickets}</span>
          </div>
          <div className={classes.summaryCard}>
            <span className={classes.summaryLabel}>Resueltos (%)</span>
            <span className={classes.summaryValue}>{resolvedRate}%</span>
          </div>
          <div className={classes.summaryCard}>
            <span className={classes.summaryLabel}>Pendientes (%)</span>
            <span className={classes.summaryValue}>{openRate}%</span>
          </div>
          <div className={classes.summaryCard}>
            <span className={classes.summaryLabel}>T.M. Atención / Espera</span>
            <span className={classes.summaryValue}>
              {formatTime(counters.avgSupportTime)} / {formatTime(counters.avgWaitTime)}
            </span>
          </div>
        </div>

        <AppBar position="static" className={classes.tabsAppBar} elevation={0}>
          <Grid container width="100%" >
            <Tabs
              value={tab}
              onChange={handleChangeTab}                
              aria-label="primary tabs example"
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab value="Indicadores" label="Indicadores" />
              <Tab value="NPS" label="NPS" />
              <Tab value="Atendentes" label="Atendentes" />
            </Tabs>
          </Grid>
        </AppBar>

          <TabPanel
            className={classes.container}
            value={tab}
            name={"Indicadores"}
          >
            <Container maxWidth="lg" className={classes.container}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                <Paper className={classes.cardContainer1} elevation={0}>
                  <div>
                    <Typography
                      variant="subtitle1"
                      component="p"
                      className={classes.cardSubtitle}
                    >
                      <span translate="no">{counters.supportPending}</span>
                    </Typography>
                    <Typography
                      variant="h6"
                      component="h2"
                      className={classes.cardTitle}
                    >
                      {"Aguardando"}
                    </Typography>
                  </div>
                  <div className={classes.cardAvatar}>
                    <Avatar className={classes.cardAvatar1}>
                      {<GroupIcon />}
                    </Avatar>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper className={classes.cardContainer2} elevation={0}>
                  <div>
                    <Typography
                      variant="subtitle1"
                      component="p"
                      className={classes.cardSubtitle}
                    >
                      {counters.supportHappening}
                    </Typography>
                    <Typography
                      variant="h6"
                      component="h2"
                      className={classes.cardTitle}
                    >
                      {"En Conversación"}
                    </Typography>
                  </div>
                  <div className={classes.cardAvatar}>
                    <Avatar className={classes.cardAvatar2}>
                      {<AssignmentIcon fontSize="inherit" />}
                    </Avatar>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper className={classes.cardContainer3} elevation={0}>
                  <div>
                    <Typography
                      variant="subtitle1"
                      component="p"
                      className={classes.cardSubtitle}
                    >
                      {counters.supportFinished}
                    </Typography>
                    <Typography
                      variant="h6"
                      component="h2"
                      className={classes.cardTitle}
                    >
                      {"Resolvidos"}
                    </Typography>
                  </div>
                  <div className={classes.cardAvatar}>
                    <Avatar className={classes.cardAvatar3}>
                      {<AssignmentIcon fontSize="inherit" />}
                    </Avatar>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper className={classes.cardContainer4} elevation={0}>
                  <div>
                    <Typography
                      variant="subtitle1"
                      component="p"
                      className={classes.cardSubtitle}
                    >
                      {counters.leads}
                    </Typography>
                    <Typography
                      variant="h6"
                      component="h2"
                      className={classes.cardTitle}
                    >
                      {"Leads"}
                    </Typography>
                  </div>
                  <div className={classes.cardAvatar}>
                    <Avatar className={classes.cardAvatar4}>
                      {<PersonIcon fontSize="inherit" />}
                    </Avatar>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper className={classes.cardContainer5} elevation={0}>
                  <div>
                    <Typography
                      variant="subtitle1"
                      component="p"
                      className={classes.cardSubtitle}
                    >
                      {formatTime(counters.avgSupportTime)}
                    </Typography>
                    <Typography
                      variant="h6"
                      component="h2"
                      className={classes.cardTitle}
                    >
                      {"T.M. de Atendimento"}
                    </Typography>
                  </div>
                  <div className={classes.cardAvatar}>
                    <Avatar className={classes.cardAvatar5}>
                      {<SpeedIcon fontSize="inherit" />}
                    </Avatar>
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper className={classes.cardContainer6} elevation={0}>
                  <div>
                    <Typography
                      variant="subtitle1"
                      component="p"
                      className={classes.cardSubtitle}
                    >
                      {formatTime(counters.avgWaitTime)}
                    </Typography>
                    <Typography
                      variant="h6"
                      component="h2"
                      className={classes.cardTitle}
                    >
                      {"T.M. de Espera"}
                    </Typography>
                  </div>
                  <div className={classes.cardAvatar}>
                    <Avatar className={classes.cardAvatar6}>
                      {<SpeedIcon fontSize="inherit" />}
                    </Avatar>
                  </div>
                </Paper>
              </Grid>
              </Grid>

              <Grid item xs={12}>
                <Paper className={classes.tableCard} elevation={0}>
                  <Typography variant="h6" style={{ marginBottom: 12, fontWeight: 600 }}>
                    Tickets por Agente
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Agente</TableCell>
                        <TableCell align="center">Tickets</TableCell>
                        <TableCell align="center">T.M. Espera</TableCell>
                        <TableCell align="center">Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ticketsByAgent.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell align="center">{row.tickets}</TableCell>
                          <TableCell align="center">{row.avgWait}</TableCell>
                          <TableCell align="center">{row.online ? "En línea" : "Offline"}</TableCell>
                        </TableRow>
                      ))}
                      {!ticketsByAgent.length && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            Sin datos de agentes
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper className={classes.tableCard} elevation={0}>
                  <Typography variant="h6" style={{ marginBottom: 12, fontWeight: 600 }}>
                    Tickets por Estado
                  </Typography>
                  <div className={classes.summaryRow}>
                    <div className={classes.summaryCard}>
                      <span className={classes.summaryLabel}>Pendientes</span>
                      <span className={classes.summaryValue}>{counters.supportPending || 0}</span>
                    </div>
                    <div className={classes.summaryCard}>
                      <span className={classes.summaryLabel}>En conversación</span>
                      <span className={classes.summaryValue}>{counters.supportHappening || 0}</span>
                    </div>
                    <div className={classes.summaryCard}>
                      <span className={classes.summaryLabel}>Resueltos</span>
                      <span className={classes.summaryValue}>{counters.supportFinished || 0}</span>
                    </div>
                    <div className={classes.summaryCard}>
                      <span className={classes.summaryLabel}>T.M. espera (pendientes)</span>
                      <span className={classes.summaryValue}>{formatTime(counters.avgWaitTime)}</span>
                    </div>
                  </div>
                </Paper>
              </Grid>
            </Container>
          </TabPanel>

          <TabPanel
            className={classes.container}
            value={tab}
            name={"NPS"}
          >
            <Container 
               width="lg%" 
               className={classes.container} 
              //  alignContent="center"
            >
            <Grid 
              container 
              spacing={3} >
            <Grid item  xs={12} sm={6} md={4}>
              <Paper className={classes.cardContainer5} elevation={0}>
                <div>
                  <Typography
                    variant="subtitle1"
                    component="p"
                    className={classes.cardSubtitle}
                  >
                    {Number(counters.npsPromotersPerc/100).toLocaleString(undefined,{style:'percent'})}
                  </Typography>
                  <Typography
                    variant="h6"
                    component="h2"
                    className={classes.cardTitle}
                  >
                    {"Promotores"}
                  </Typography>
                </div>
                <div className={classes.cardAvatar}>
                  <Avatar className={classes.cardAvatar5}>
                    {<SentimentSatisfiedAltIcon  fontSize="inherit" />}
                  </Avatar>
                </div>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Paper className={classes.cardContainer2} elevation={0}>
                <div>
                  <Typography
                    variant="subtitle1"
                    component="p"
                    className={classes.cardSubtitle}
                  >
                    {Number(counters.npsPassivePerc/100).toLocaleString(undefined,{style:'percent'})}
                  </Typography>
                  <Typography
                    variant="h6"
                    component="h2"
                    className={classes.cardTitle}
                  >
                    {"Neutros"}
                  </Typography>
                </div>
                <div className={classes.cardAvatar}>
                  <Avatar className={classes.cardAvatar2}>
                    {<SentimentNeutralIcon fontSize="inherit" />}
                  </Avatar>
                </div>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Paper className={classes.cardContainer4} elevation={0}>
                <div>
                  <Typography
                    variant="subtitle1"
                    component="p"
                    className={classes.cardSubtitle}
                  >
                    {Number(counters.npsDetractorsPerc/100).toLocaleString(undefined,{style:'percent'})}
                  </Typography>
                  <Typography
                    variant="h6"
                    component="h2"
                    className={classes.cardTitle}
                  >
                    {"Dretatores"}
                  </Typography>
                </div>
                <div className={classes.cardAvatar}>
                  <Avatar className={classes.cardAvatar4}>
                    {<SentimentVeryDissatisfiedIcon fontSize="inherit" />}
                  </Avatar>
                </div>
              </Paper>
            </Grid>

            </Grid>
          </Container>

          <Container
            width="lg%" 
            className={classes.container} 
          >
          <Grid container spacing={3} >
           <Grid item  xs={12} sm={6} md={4} >
              <Paper 
             className={classes.cardContainer7} elevation={0}    
              >
                <div>
                  <Typography
                    variant="subtitle1"
                    component="p"
                    className={classes.cardSubtitle}
                  >
                    {Number(counters.npsScore/100).toLocaleString(undefined,{style:'percent'})}
                  </Typography>
                  <Typography
                    variant="h6"
                    component="h2"
                    className={classes.cardTitle}
                  >
                    {"Score"}
                  </Typography>
                </div>
                <div className={classes.cardAvatar}>
                  <Avatar className={classes.cardAvatar6}>
                    {<Score fontSize="inherit" />}
                  </Avatar>
                </div>
              </Paper>
             </Grid>
            </Grid>
          </Container>
 
          </TabPanel>
          
          <TabPanel
            className={classes.container}
            value={tab}
            name={"Atendentes"}
          >
            <Container width="100%" className={classes.container}>
              <Grid container width="100%">
                <Grid item xs={12}>
                  {attendants.length ? (
                    <TableAttendantsStatus
                      attendants={attendants}
                      loading={loading}
                    />
                  ) : null}
                </Grid>
              </Grid>
            </Container>
          </TabPanel>
      </Container>
    </div>
  );
};

export default Dashboard;
