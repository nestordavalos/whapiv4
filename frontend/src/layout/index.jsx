import React, { useState, useContext, useEffect } from "react";
import clsx from "clsx";

import { AppBar, Divider, Drawer, IconButton, List, Menu, MenuItem, Toolbar, Typography } from "@mui/material";

import makeStyles from '@mui/styles/makeStyles';

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AccountCircle from "@mui/icons-material/AccountCircle";

import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import UserModal from "../components/UserModal";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";

import api from "../services/api";
import toastError from "../errors/toastError";
import config from "../config.json";
import logodash from "../assets/logo-dash.jpeg";

const drawerWidth = 240;
const { system } = config;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100vh",
    [theme.breakpoints.down('md')]: {
      height: "calc(100vh - 56px)",
    },
  },
  toolbar: {
    paddingRight: 24,
    color: "#ffffff",
    background: theme.palette.toolbar.main,
    "& .MuiIconButton-root": {
      color: "#ffffff",
    },
    "& .MuiSvgIcon-root": {
      color: "#ffffff",
    },
    [theme.breakpoints.down('sm')]: {
      paddingRight: 8,
      paddingLeft: 8,
    },
  },
  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    minHeight: "64px",
    backgroundColor: theme.palette.toolbarIcon.main,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  toolbarIconClosed: {
    justifyContent: "center",
    padding: "12px 8px",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    overflow: "hidden",
    "& img": {
      height: 40,
      width: "auto",
      borderRadius: 8,
    }
  },
  logoContainerClosed: {
    display: "none",
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    [theme.breakpoints.down('md')]: {
      marginLeft: 0,
      width: "100%",
    },
  },
  menuButton: {
    marginRight: 36,
  },
  menuButtonHidden: {
    display: "none",
  },
  title: {
    flexGrow: 1,
    fontSize: "0.9rem",
    [theme.breakpoints.down('sm')]: {
      display: "none",
    },
  },
  titleMobile: {
    display: "none",
    [theme.breakpoints.down('sm')]: {
      display: "block",
      flexGrow: 1,
      fontSize: "0.8rem",
    },
  },
  drawerPaper: {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
    [theme.breakpoints.down('md')]: {
      position: "fixed",
      zIndex: theme.zIndex.drawer + 2,
    },
  },
  drawerPaperClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: 60,
    [theme.breakpoints.up("sm")]: {
      width: 60,
    },
  },
  drawerList: {
    padding: "8px 12px",
  },
  drawerListClosed: {
    padding: "8px 6px",
  },
  drawerDivider: {
    margin: "8px 16px",
    backgroundColor: theme.palette.divider,
  },
  appBarSpacer: {
    minHeight: "48px",
    [theme.breakpoints.down('md')]: {
      minHeight: "48px",
    },
  },
  content: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.default,
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
  systemCss: {
    display: "flex",
    justifyContent: "center",
    opacity: 0.2,
    fontSize: 12
  },
  collapseButton: {
    borderRadius: 8,
    padding: 6,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    }
  }
}));

const LoggedInLayout = ({ children }) => {
  const classes = useStyles();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { handleLogout, loading } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariant, setDrawerVariant] = useState("permanent");
  const { user } = useContext(AuthContext);

  useEffect(() => {
    let isMounted = true;

    if (document.body.offsetWidth > 600) {
      const fetchDrawerState = async () => {
        try {
          const { data } = await api.get("/settings");

          const settingIndex = data.filter(s => s.key === 'sideMenu');

          if (isMounted) {
            setDrawerOpen(settingIndex[0].value === "disabled" ? false : true);
          }

        } catch (err) {
          if (isMounted) {
            setDrawerOpen(true);
          }
          toastError(err);
        }
      };
      fetchDrawerState();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (document.body.offsetWidth < 600) {
      setDrawerVariant("temporary");
    } else {
      setDrawerVariant("permanent");
    }
  }, [drawerOpen]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleOpenUserModal = () => {
    setUserModalOpen(true);
    handleCloseMenu();
  };

  const handleClickLogout = () => {
    handleCloseMenu();
    handleLogout();
  };

  const drawerClose = () => {
    if (document.body.offsetWidth < 600) {
      setDrawerOpen(false);
    }
  };

  if (loading) {
    return <BackdropLoading />;
  }

  return (
    <div className={classes.root}>
      <Drawer
        variant={drawerVariant}
        className={drawerOpen ? classes.drawerPaper : classes.drawerPaperClose}
        classes={{
          paper: clsx(
            classes.drawerPaper,
            !drawerOpen && classes.drawerPaperClose
          ),
        }}
        open={drawerOpen}
      >
        <div className={clsx(classes.toolbarIcon, !drawerOpen && classes.toolbarIconClosed)}>
          <div className={clsx(classes.logoContainer, !drawerOpen && classes.logoContainerClosed)} aria-hidden="true">
            <img src={logodash} alt="Logo T-Chateo" />
          </div>
          <IconButton
            className={classes.collapseButton}
            color="secondary"
            aria-label={drawerOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
            onClick={() => setDrawerOpen(!drawerOpen)}
            size="large">
            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </div>
        <nav aria-label="MenÃº principal">
          <List
            component="ul"
            className={clsx(classes.drawerList, !drawerOpen && classes.drawerListClosed)}
          >
            <MainListItems drawerClose={drawerClose} drawerOpen={drawerOpen} />
          </List>
        </nav>
      </Drawer>
      <UserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        userId={user?.id}
      />
      <AppBar
        position="absolute"
        className={clsx(classes.appBar, drawerOpen && classes.appBarShift)}
        color={import.meta.env.DEV ? "inherit" : "primary"}
      >
        <Toolbar variant="dense" className={classes.toolbar}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label={drawerOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={clsx(
              classes.menuButton,
              drawerOpen && classes.menuButtonHidden
            )}
            size="large">
            <MenuIcon />
          </IconButton>
          <Typography component="h1" variant="h6" color="inherit" className={classes.title}>
            {i18n.t("mainDrawer.appBar.message.hi")} <b>{user.name}</b>, {i18n.t("mainDrawer.appBar.message.text")} <b>{system.name || "T-Chateo"}</b>
          </Typography>
          <Typography className={classes.titleMobile}>
            <b>{system.name || "T-Chateo"}</b>
          </Typography>
          {user.id && <NotificationsPopOver />}

          <div>
            <IconButton
              aria-label="Cuenta de usuario: abrir menú de perfil"
              aria-controls={menuOpen ? "menu-appbar" : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? "true" : undefined}
              onClick={handleMenu}
              color="inherit"
              size="large">
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={menuOpen}
              onClose={handleCloseMenu}
            >
              <MenuItem onClick={handleOpenUserModal}>
                {i18n.t("mainDrawer.appBar.user.profile")}
              </MenuItem>
              <MenuItem onClick={handleClickLogout}>
                {i18n.t("mainDrawer.appBar.user.logout")}
              </MenuItem>
              <Divider />
              {/* <span className={classes.systemCss}>
                <Link color="inherit" href={"https://mkthub.tech"}>
                  v{systemVersion}
                </Link>
              </span> */}
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <main className={classes.content}>
        <div className={classes.appBarSpacer} />

        {children ? children : null}
      </main>
    </div>
  );
};

export default LoggedInLayout;
