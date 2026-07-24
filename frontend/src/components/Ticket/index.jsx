import React, { useState, useEffect, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";

import { toast } from "react-toastify";
import openSocket from "../../services/socket-io";
import clsx from "clsx";

import { Paper } from "@mui/material";

import makeStyles from '@mui/styles/makeStyles';

import ContactDrawer from "../ContactDrawer";
import MessageInput from "../MessageInput/";
import TicketHeader from "../TicketHeader";
import TicketInfo from "../TicketInfo";
import TicketActionButtons from "../TicketActionButtons";
import MessagesList from "../MessagesList";
import api from "../../services/api";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import toastError from "../../errors/toastError";

const drawerWidth = 320;

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.background.default,
    display: "flex",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },

  ticketInfo: {
    backgroundColor: theme.palette.background.default,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  ticketActionButtons: {
    backgroundColor: theme.palette.background.default,
    display: "flex",
    justifyContent: "flex-end",
    flexShrink: 0,
  },

  mainWrapper: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeft: "0",
    marginRight: -drawerWidth,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },

  mainWrapperShift: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
  },
}));

const Ticket = () => {
  const { ticketId } = useParams();
  const history = useHistory();
  const classes = useStyles();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState({});
  const [ticket, setTicket] = useState({});
  
  // Usar ref para mantener el estado actual sin causar re-renders
  const ticketRef = useRef(ticket);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTicket = async () => {
        try {
          const { data } = await api.get("/tickets/" + ticketId);
          setContact(data.contact);
          setTicket(data);
          ticketRef.current = data; // Actualizar ref
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchTicket();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [ticketId, history]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return undefined;

    const handleTicket = data => {
      if (data.action === "update") {
        // IMPORTANTE: Solo procesar si es el ticket actual que estamos viendo
        // Esto evita redirecciones por actualizaciones de otros tickets
        if (data.ticket.id !== parseInt(ticketId)) {
          return;
        }
        
        setTicket(prevTicket => {
          const previousStatus = ticketRef.current.status;
          const newStatus = data.ticket.status;
          
          // Fusionar datos nuevos con los existentes para mantener todas las propiedades
          const updatedTicket = { ...prevTicket, ...data.ticket };
          ticketRef.current = updatedTicket; // Actualizar ref
          
          // Solo redirigir si el estado realmente cambió DE "open" A "pending" o "closed"
          if (previousStatus === "open" && 
              newStatus !== "open" &&
              (newStatus === "pending" || newStatus === "closed")) {
            setTimeout(() => history.push("/tickets"), 0);
          }
          
          return updatedTicket;
        });
      }

      if (data.action === "delete") {
        toast.success("Chamado apagado com sucesso.");
        history.push("/tickets");
      }
    };

    const handleContact = data => {
      if (data.action === "update") {
        setContact(prevState => {
          if (prevState.id === data.contact?.id) {
            return { ...prevState, ...data.contact };
          }
          return prevState;
        });
      }
    };

    socket.on("ticket", handleTicket);
    socket.on("contact", handleContact);

    return () => {
      socket.off("ticket", handleTicket);
      socket.off("contact", handleContact);
    };
  }, [ticketId, history]);

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <div className={classes.root} id="drawer-container">
      <Paper
        variant="outlined"
        elevation={0}
        className={clsx(classes.mainWrapper, {
          [classes.mainWrapperShift]: drawerOpen,
        })}
      >
        <TicketHeader loading={loading}>
          <div className={classes.ticketInfo}>
            <TicketInfo
              contact={contact}
              ticket={ticket}
              onClick={handleDrawerOpen}
            />
          </div>
          <div className={classes.ticketActionButtons}>
            <TicketActionButtons ticket={ticket} />
          </div>
        </TicketHeader>
        <ReplyMessageProvider>
          <MessagesList
            ticketId={ticketId}
            isGroup={ticket.isGroup}
            isContactDrawerOpen={drawerOpen}
          ></MessagesList>
          <MessageInput
            ticketStatus={ticket.status}
            ticketSendBlocked={ticket.zapoSendBlocked}
          />
        </ReplyMessageProvider>
      </Paper>
      <ContactDrawer
        open={drawerOpen}
        handleDrawerClose={handleDrawerClose}
        contact={contact}
        loading={loading}
      />
    </div>
  );
};

export default Ticket;
