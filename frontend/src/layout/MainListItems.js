import React, { useContext, useEffect, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { systemVersion } from "../../package.json";
import {
  Badge,
  Divider,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  makeStyles,
  Box,
  Typography
} from "@material-ui/core";

import {
  AccountTreeOutlined,
  ContactPhoneOutlined,
  DashboardOutlined,
  LocalOffer,
  PeopleAltOutlined,
  QuestionAnswerOutlined,
  SettingsOutlined,
  SyncAlt,
  VpnKeyRounded,
  WhatsApp,
  DeviceHub
} from "@material-ui/icons";

import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import { Can } from "../components/Can";

const useStyles = makeStyles(theme => ({
  menuItem: {
    borderRadius: 10,
    marginBottom: 4,
    padding: "10px 14px",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  menuItemClosed: {
    padding: "10px 8px",
    justifyContent: "center",
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: theme.palette.primary.main + "18",
    "&:hover": {
      backgroundColor: theme.palette.primary.main + "24",
    },
    "& $menuIcon": {
      color: theme.palette.primary.main,
    },
    "& .MuiListItemText-primary": {
      color: theme.palette.primary.main,
      fontWeight: 600,
    },
  },
  menuIcon: {
    minWidth: 40,
    color: theme.palette.text.secondary,
    "& .MuiSvgIcon-root": {
      fontSize: "1.25rem",
    },
  },
  menuIconClosed: {
    minWidth: "unset",
    marginRight: 0,
  },
  menuText: {
    "& .MuiTypography-root": {
      fontSize: "0.875rem",
      fontWeight: 500,
    },
  },
  menuTextHidden: {
    display: "none",
  },
  sectionHeader: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: theme.palette.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "16px 14px 8px",
    lineHeight: 1.5,
    backgroundColor: "transparent",
  },
  sectionHeaderHidden: {
    display: "none",
  },
  divider: {
    margin: "8px 0",
    backgroundColor: theme.palette.divider,
  },
  versionContainer: {
    padding: "12px 14px",
    marginTop: "auto",
  },
  versionContainerClosed: {
    display: "none",
  },
  versionText: {
    fontSize: "0.7rem",
    color: theme.palette.text.disabled,
    textAlign: "center",
    fontWeight: 500,
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
  },
  listItemWrapper: {
    listStyle: "none",
  },
}));

function ListItemLink(props) {
  const { icon, primary, to, className, collapsed } = props;
  const classes = useStyles();
  const location = useLocation();
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li className={classes.listItemWrapper}>
      <ListItem 
        button 
        component={renderLink} 
        className={`${classes.menuItem} ${collapsed ? classes.menuItemClosed : ""} ${isActive ? classes.menuItemActive : ""} ${className || ""}`}
      >
        {icon ? (
          <ListItemIcon className={`${classes.menuIcon} ${collapsed ? classes.menuIconClosed : ""}`}>
            {icon}
          </ListItemIcon>
        ) : null}
        <ListItemText 
          primary={primary} 
          className={`${classes.menuText} ${collapsed ? classes.menuTextHidden : ""}`} 
        />
      </ListItem>
    </li>
  );
}

const MainListItems = (props) => {
  const { drawerClose, drawerOpen } = props;
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const classes = useStyles();
  const collapsed = !drawerOpen;

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) => {
          return (
            whats.status === "qrcode" ||
            whats.status === "PAIRING" ||
            whats.status === "DISCONNECTED" ||
            whats.status === "TIMEOUT" ||
            whats.status === "OPENING"
          );
        });
        if (offlineWhats.length > 0) {
          setConnectionWarning(true);
        } else {
          setConnectionWarning(false);
        }
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  return (
    <div onClick={drawerClose} className={classes.listContainer}>

      <ListItemLink
        to="/tickets"
        primary={i18n.t("mainDrawer.listItems.tickets")}
        icon={<WhatsApp />}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/contacts"
        primary={i18n.t("mainDrawer.listItems.contacts")}
        icon={<ContactPhoneOutlined />}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/quickAnswers"
        primary={i18n.t("mainDrawer.listItems.quickAnswers")}
        icon={<QuestionAnswerOutlined />}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/tags"
        primary={i18n.t("mainDrawer.listItems.tags")}
        icon={<LocalOffer />}
        collapsed={collapsed}
      />
      <Can
        role={user.profile}
        perform="drawer-admin-items:view"
        yes={() => (
          <>
            <Divider className={classes.divider} />
            <ListSubheader 
              inset 
              className={`${classes.sectionHeader} ${collapsed ? classes.sectionHeaderHidden : ""}`}
            >
              {i18n.t("mainDrawer.listItems.administration")}
            </ListSubheader>
            <ListItemLink
              to="/"
              primary="Dashboard"
              icon={<DashboardOutlined />}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/connections"
              primary={i18n.t("mainDrawer.listItems.connections")}
              icon={
                <Badge badgeContent={connectionWarning ? "!" : 0} color="error" overlap="rectangular" >
                  <SyncAlt />
                </Badge>
              }
              collapsed={collapsed}
            />

            <ListItemLink
              to="/users"
              primary={i18n.t("mainDrawer.listItems.users")}
              icon={<PeopleAltOutlined />}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/queues"
              primary={i18n.t("mainDrawer.listItems.queues")}
              icon={<AccountTreeOutlined />}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/queue-integrations"
              primary={i18n.t("mainDrawer.listItems.integrations")}
              icon={<DeviceHub />}
              collapsed={collapsed}
            />
            <ListItemLink
              to="/settings"
              primary={i18n.t("mainDrawer.listItems.settings")}
              icon={<SettingsOutlined />}
              collapsed={collapsed}
            />
            <Divider className={classes.divider} />
            <ListItemLink
              to="/apikey"
              primary={i18n.t("mainDrawer.listItems.apikey")}
              icon={<VpnKeyRounded />}
              collapsed={collapsed}
            />

          </>
        )}
      />
      <Box className={`${classes.versionContainer} ${collapsed ? classes.versionContainerClosed : ""}`}>
        <Typography className={classes.versionText}>v{systemVersion}</Typography>
      </Box>
    </div>
  );
};

export default MainListItems;