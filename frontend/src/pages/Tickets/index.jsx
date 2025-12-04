import React from "react";
import { useParams } from "react-router-dom";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import makeStyles from '@mui/styles/makeStyles';

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";

// import { i18n } from "../../translate/i18n";

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
        <Box sx={{ display: "flex", width: "100%", height: "100%", gap: 0 }}>
          <Box
            sx={{
              width: { xs: "100%", md: "33.3333%" },
              display: "flex",
              height: "100%",
              minWidth: 0,
            }}
            className={
              ticketId ? classes.contactsWrapperSmall : classes.contactsWrapper
            }
          >
            <TicketsManager />
          </Box>
          <Box
            sx={{
              width: { xs: "100%", md: "66.6666%" },
              display: "flex",
              height: "100%",
              minWidth: 0,
            }}
            className={classes.messagessWrapper}
          >
            {ticketId ? (
              <>
                <Ticket />
              </>
            ) : (
              <Box sx={{ display: { xs: "none", sm: "none", md: "flex" }, height: "100%", width: "100%" }}>
                <Paper className={classes.welcomeMsg}>
                  <span>
                    <center>
                      <img src={logo} width="40%" alt="logo"/>
                    </center>
                    </span>
                </Paper>
              </Box>
            )}
          </Box>
        </Box>
      </div>
    </div>
  );
};

export default Chat;
