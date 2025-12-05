import React, { useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import { Badge, Button, FormControlLabel, Paper, Tab, Tabs, Switch } from "@mui/material";

import makeStyles from '@mui/styles/makeStyles';

import {
  AllInboxRounded,
  HourglassEmptyRounded,
  MoveToInbox,
  Search
} from "@mui/icons-material";

import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { Can } from "../Can";
import TicketsManagerFilters from "../TicketsManagerFilters";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: theme.palette.background.default,
    [theme.breakpoints.down('md')]: {
      borderRadius: 0,
    },
  },

  tabPanels: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  tabPanel: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    height: "100%",
  },

  tabPanelContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    minHeight: 0,
  },

  tabsHeader: {
    flex: "none",
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },

  settingsIcon: {
    alignSelf: "center",
    marginLeft: "auto",
    padding: 8,
  },

  tab: {
    minWidth: 100,
    width: "auto",
    flex: 1,
    textTransform: "uppercase",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.5px",
    padding: "8px 12px",
    minHeight: 64,
    "& .MuiTab-wrapper": {
      flexDirection: "column",
      gap: 4,
    },
    "& .MuiSvgIcon-root": {
      fontSize: "1.3rem",
      marginBottom: "2px !important",
    },
    [theme.breakpoints.down('sm')]: {
      minWidth: 70,
      padding: "6px 8px",
      fontSize: "0.65rem",
      minHeight: 56,
      "& .MuiSvgIcon-root": {
        fontSize: "1.1rem",
      },
    },
  },

  ticketOptionsBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.palette.background.paper,
    padding: "8px 12px",
    borderBottom: `1px solid ${theme.palette.divider}`,
    position: "relative",
    [theme.breakpoints.down('sm')]: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 4,
      padding: "8px 8px",
    },
  },

  serachInputWrapper: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
    display: "flex",
    borderRadius: 40,
    padding: 4,
    marginRight: theme.spacing(1),
  },

  searchIcon: {
    color: theme.palette.text.secondary,
    marginLeft: 12,
    marginRight: 8,
    alignSelf: "center",
    fontSize: "1.3rem",
  },

  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: 8,
    padding: "10px 12px",
    outline: "none",
    fontSize: "0.9rem",
    backgroundColor: "transparent",
    color: theme.palette.text.primary,
    "&::placeholder": {
      color: theme.palette.text.secondary,
      opacity: 0.7,
    },
  },

  badge: {
    right: 0,
    "& .MuiBadge-badge": {
      fontSize: "0.65rem",
      height: 16,
      minWidth: 16,
      padding: "0 4px",
    },
  },
  show: {
    display: "block",
  },
  hide: {
    display: "none !important",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  searchInputWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    backgroundColor: theme.palette.background.default,
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    transition: "all 0.2s ease",
    "&:focus-within": {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 2px ${theme.palette.primary.light}20`,
    },
  },
  newTicketButton: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.8rem",
    borderRadius: 8,
    padding: "6px 16px",
    borderWidth: 1.5,
    "&:hover": {
      borderWidth: 1.5,
      backgroundColor: theme.palette.primary.main,
      color: "#fff",
    },
    [theme.breakpoints.down('sm')]: {
      padding: "5px 10px",
      fontSize: "0.7rem",
      justifySelf: "start",
    },
  },
  showAllSwitch: {
    display: "flex",
    alignItems: "center",
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    "& .MuiFormControlLabel-label": {
      fontSize: "0.8rem",
      fontWeight: 500,
      color: theme.palette.text.secondary,
    },
    "& .MuiSwitch-root": {
      marginLeft: 4,
    },
    [theme.breakpoints.down('sm')]: {
      position: "static",
      transform: "none",
      marginLeft: 0,
      justifySelf: "center",
      "& .MuiFormControlLabel-label": {
        fontSize: "0.7rem",
      },
    },
  },
  newTicketButtonMobile: {
    [theme.breakpoints.down('sm')]: {
      order: 1,
    },
  },
}));

const tabA11yProps = (value) => ({
  id: `simple-tab-${value}`,
  "aria-controls": `simple-tabpanel-${value}`,
});

const TicketsManager = () => {
  const classes = useStyles();
  const history = useHistory();

  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const [tabOpen] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [showAllInitialized, setShowAllInitialized] = useState(false);
  const { user } = useContext(AuthContext);

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedWhatsappIds, setSelectedWhatsappIds] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);

  const normalizedProfile = (user?.profile || "").toUpperCase();

  useEffect(() => {
    if (showAllInitialized) return;
    if (!normalizedProfile) return;

    if (normalizedProfile === "ADMIN") {
      setShowAllTickets(true);
    }
    setShowAllInitialized(true);
  }, [normalizedProfile, showAllInitialized]);

  // Detectar cambios de tab desde el history state
  useEffect(() => {
    const locationState = history.location.state;
    if (locationState && locationState.tab) {
      setTab(locationState.tab);
      // Limpiar el state después de un pequeño delay para evitar que persista
      // pero sin afectar la navegación actual
      const timer = setTimeout(() => {
        if (history.location.state && history.location.state.tab) {
          history.replace({
            pathname: history.location.pathname,
            search: history.location.search,
            state: undefined
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [history.location.pathname, history.location.state]);

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();


    setSearchParam(searchedTerm);
    if (searchedTerm === "") {
      setTab("open");
    } else if (tab !== "search") {
      setTab("search");
    }

  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { display: "none" };
    }

    return { display: "flex", flex: 1, minHeight: 0 };
  };


  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(e) => setNewTicketModalOpen(false)}
      />
      <Paper elevation={0} square className={classes.searchContainer}>
        <div className={classes.searchInputWrapper}>
          <Search className={classes.searchIcon} />
          <input
            type="text"
            placeholder={i18n.t("tickets.search.placeholder")}
            className={classes.searchInput}
            value={searchParam}
            onChange={handleSearch}
          />
        </div>
      </Paper>
      <Paper elevation={0} square className={classes.tabsHeader}>
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="icon label tabs example"
        >
          <Tab
            value={"open"}
            icon={<MoveToInbox />}
            label={
              <Badge
                className={classes.badge}
                badgeContent={openCount}
                overlap="rectangular"
                color="secondary"
              >
                {i18n.t("tickets.tabs.open.title")}
              </Badge>
            }
            classes={{ root: classes.tab }}
            {...tabA11yProps("open")}
          />
          <Tab
            value={"pending"}
            icon={<HourglassEmptyRounded />}
            label={
              <Badge
                className={classes.badge}
                badgeContent={pendingCount}
                overlap="rectangular"
                color="secondary"
              >
                {i18n.t("ticketsList.pendingHeader")}
              </Badge>
            }
            classes={{ root: classes.tab }}
            {...tabA11yProps("pending")}
          />
          <Tab
            value={"closed"}
            icon={<AllInboxRounded />}
            label={i18n.t("tickets.tabs.closed.title")}
            classes={{ root: classes.tab }}
            {...tabA11yProps("closed")}
          />
        </Tabs>
      </Paper>
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setNewTicketModalOpen(true)}
          className={classes.newTicketButton}
        >
          {i18n.t("ticketsManager.buttons.newTicket")}
        </Button>
        <Can
          role={user.profile}
          perform="tickets-manager:showall"
          yes={() => (
            <div className={classes.showAllSwitch}>
              <FormControlLabel
                label={i18n.t("tickets.buttons.showAll")}
                labelPlacement="start"
                control={
                  <Switch
                    size="small"
                    checked={showAllTickets}
                    onChange={() =>
                      setShowAllTickets((prevState) => !prevState)
                    }
                    name="showAllTickets"
                    color="primary"
                  />
                }
              />
            </div>
          )}
        />
      </Paper>
      
      {/* Filtros Avanzados */}
      <TicketsManagerFilters
        selectedQueueIds={selectedQueueIds}
        onQueueChange={setSelectedQueueIds}
        selectedTagIds={selectedTags}
        onTagChange={setSelectedTags}
        selectedWhatsappIds={selectedWhatsappIds}
        onWhatsappChange={setSelectedWhatsappIds}
        selectedUserIds={selectedUserIds}
        onUserChange={setSelectedUserIds}
        userQueues={user?.queues}
      />
      
      <div className={classes.tabPanels}>
        <TabPanel value={tab} name="open" className={classes.tabPanel}>
          <Paper className={classes.tabPanelContent}>
          <TicketsList
            handleChangeTab={handleChangeTab}
            status="open"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            selectedTagIds={selectedTags}
            selectedWhatsappIds={selectedWhatsappIds}
            selectedUserIds={selectedUserIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle("open")}
          />
          <TicketsList
            handleChangeTab={handleChangeTab}
            status="pending"
            selectedQueueIds={selectedQueueIds}
            selectedTagIds={selectedTags}
            selectedWhatsappIds={selectedWhatsappIds}
            selectedUserIds={selectedUserIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle("pending")}
          />
          </Paper>
        </TabPanel>

        <TabPanel value={tab} name="pending" className={classes.tabPanel}>
          <Paper className={classes.tabPanelContent}>
            <TicketsList
              handleChangeTab={handleChangeTab}
              status="pending"
              showAll={true}
              selectedQueueIds={selectedQueueIds}
              selectedTagIds={selectedTags}
              selectedWhatsappIds={selectedWhatsappIds}
              selectedUserIds={selectedUserIds}
              updateCount={(val) => setPendingCount(val)}
            />
          </Paper>
        </TabPanel>

        <TabPanel value={tab} name="closed" className={classes.tabPanel}>
          <Paper className={classes.tabPanelContent}>
            <TicketsList
              status="closed"
              showAll={true}
              selectedQueueIds={selectedQueueIds}
              selectedTagIds={selectedTags}
              selectedWhatsappIds={selectedWhatsappIds}
              selectedUserIds={selectedUserIds}
            />
          </Paper>
        </TabPanel>
        <TabPanel value={tab} name="search" className={classes.tabPanel}>
          <Paper className={classes.tabPanelContent}>
            <TicketsList
              searchParam={searchParam}
              tags={selectedTags}
              showAll={true}
              selectedQueueIds={selectedQueueIds}
              selectedTagIds={selectedTags}
              selectedWhatsappIds={selectedWhatsappIds}
              selectedUserIds={selectedUserIds}
            />
          </Paper>
        </TabPanel>
      </div>
    </Paper>
  );
};

export default TicketsManager;
