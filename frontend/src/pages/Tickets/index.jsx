import React from "react";
import { useParams } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import makeStyles from '@mui/styles/makeStyles';

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";

// import { i18n } from "../../translate/i18n";
import Hidden from "@mui/material/Hidden";

import logo from "../../assets/Logo_circle.png";

const useStyles = makeStyles((theme) => ({
  chatContainer: {
    flex: 1,
    height: `calc(100% - 8px)`,
    minHeight: 0,
    overflowY: "hidden",
    margin: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
      margin: 0,
      height: "100%",
    },
  },

  chatPapper: {
    display: "flex",
    height: "100%",
    minHeight: 0,
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "auto",
    minHeight: 0,
  },
  contactsWrapperSmall: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "auto",
    minHeight: 0,
    [theme.breakpoints.down('md')]: {
      display: "none",
    },
  },
  messagessWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    minHeight: 0,
  },
  welcomeMsg: {
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    justifyContent: "space-evenly",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
    borderRadius: 12,
    [theme.breakpoints.down('md')]: {
      borderRadius: 8,
    },
  },
  ticketsManager: {},
  ticketsManagerClosed: {
    [theme.breakpoints.down('md')]: {
      display: "none",
    },
  },
}));

const Chat = () => {
  const classes = useStyles();
  const { ticketId } = useParams();

  return (
    <div className={classes.chatContainer}>
      <div className={classes.chatPapper}>
        <Grid container spacing={0}>
          {/* <Grid item xs={4} className={classes.contactsWrapper}> */}
          <Grid
            item
            xs={12}
            md={4}
            className={
              ticketId ? classes.contactsWrapperSmall : classes.contactsWrapper
            }
          >
            <TicketsManager />
          </Grid>
          <Grid item xs={12} md={8} className={classes.messagessWrapper}>
            {/* <Grid item xs={8} className={classes.messagessWrapper}> */}
            {ticketId ? (
              <>
                <Ticket />
              </>
            ) : (
              <Hidden only={["sm", "xs"]}>
                <Paper className={classes.welcomeMsg}>
                  {/* <Paper square variant="outlined" className={classes.welcomeMsg}> */}
                  <span>
                    <center>
                      <img src={logo} width="40%" alt="logo"/>
                    </center>
                    {/* {i18n.t("chat.noTicketMessage")} */}
                    </span>
                </Paper>
              </Hidden>
            )}
          </Grid>
        </Grid>
      </div>
    </div>
  );
};

export default Chat;