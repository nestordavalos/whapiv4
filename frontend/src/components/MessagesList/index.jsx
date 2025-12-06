import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useRef,
} from "react";

import { isSameDay, parseISO, format } from "date-fns";
import openSocket from "../../services/socket-io";
import clsx from "clsx";

import { red } from "@mui/material/colors";
// import { AuthContext } from "../../context/Auth/AuthContext";
import { Badge, Button, Checkbox, CircularProgress, Fab, IconButton, Tooltip } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import {
  AccessTime,
  Block,
  Close,
  Done,
  DoneAll,
  ExpandMore,
  GetApp,
  Reply,
} from "@mui/icons-material";

import MarkdownWrapper from "../MarkdownWrapper";
import VcardPreview from "../VcardPreview";
import LocationPreview from "../LocationPreview";
//  import PDFThumbnail from "../PDFThumbnail";
import ModalImageCors from "../ModalImageCors";
import MessageOptionsMenu from "../MessageOptionsMenu";
import ForwardMessageModal from "../ForwardMessageModal";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";

import Audio from "../Audio";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
// import { Viewer } from "@react-pdf-viewer/core";
//import { PDFViewer, Document, Page } from "@react-pdf/renderer";

const drawerWidth = 320;

const useStyles = makeStyles((theme) => ({
  messagesListWrapper: {
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },

  ticketNumber: {
    color: theme.palette.secondary.main,
    padding: 8,
  },

  messagesList: {
    backgroundImage: theme.backgroundImage,
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    padding: "20px 20px 20px 20px",
    overflowY: "scroll",
    [theme.breakpoints.down('md')]: {
      paddingBottom: "90px",
    },
    ...theme.scrollbarStyles,
  },

  circleLoading: {
    color: theme.palette.primary.main,
    position: "absolute",
    opacity: "70%",
    top: 0,
    left: "50%",
    marginTop: 12,
  },

  messageLeft: {
    marginRight: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
    backgroundColor: theme.palette.mode === "dark" ? "#1e2428" : "#ffffff",
    color: theme.palette.text.primary,
    alignSelf: "flex-start",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 1px 2px rgba(0,0,0,0.3)" 
      : "0 1px 2px rgba(0,0,0,0.1)",
  },

  quotedContainerLeft: {
    margin: "-3px -80px 6px -6px",
    overflow: "hidden",
    backgroundColor: theme.palette.mode === "dark" ? "#2d3436" : "#f5f5f5",
    borderRadius: 8,
    display: "flex",
    position: "relative",
    cursor: "pointer",
  },

  quotedMsg: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
    fontSize: "0.85rem",
    color: theme.palette.text.primary,
  },

  quotedSideColorLeft: {
    flex: "none",
    width: "4px",
    backgroundColor: theme.palette.primary.main,
    borderRadius: "4px 0 0 4px",
  },

  messageRight: {
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
    backgroundColor: theme.palette.mode === "dark" ? "#0b4f30" : "#dcf8c6",
    color: theme.palette.mode === "dark" ? "#F2F0E4" : "#303030",
    alignSelf: "flex-end",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 4,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 1px 2px rgba(0,0,0,0.3)" 
      : "0 1px 2px rgba(0,0,0,0.1)",
  },

  quotedContainerRight: {
    margin: "-3px -80px 6px -6px",
    overflowY: "hidden",
    backgroundColor: theme.palette.mode === "dark" ? "#0d6940" : "#c5e8b7",
    borderRadius: 8,
    display: "flex",
    position: "relative",
    cursor: "pointer",
  },

  quotedMsgRight: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    whiteSpace: "pre-wrap",
    fontSize: "0.85rem",
    color: theme.palette.mode === "dark" ? "#F2F0E4" : "#303030",
  },

  quotedSideColorRight: {
    flex: "none",
    width: "4px",
    backgroundColor: "#25D366",
    borderRadius: "4px 0 0 4px",
  },

  messageHighlight: {
    animationName: "$highlightFade",
    animationDuration: "1s",
    animationIterationCount: 2,
  },

  "@keyframes highlightFade": {
    "0%": { backgroundColor: theme.palette.mode === "dark" ? "#5c4b1f" : "#fff59d" },
    "50%": { backgroundColor: "inherit" },
    "100%": { backgroundColor: theme.palette.mode === "dark" ? "#5c4b1f" : "#fff59d" },
  },

  messageActionsButton: {
    display: "none",
    position: "relative",
    color: theme.palette.text.secondary,
    zIndex: 1,
    backgroundColor: "inherit",
    opacity: "90%",
    "&:hover, &.Mui-focusVisible": { backgroundColor: "inherit" },
  },

  messageContactName: {
    display: "flex",
    color: theme.palette.primary.main,
    fontWeight: 600,
    fontSize: "0.8rem",
    marginBottom: 2,
  },

  textContentItem: {
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
    fontSize: "0.9rem",
    lineHeight: 1.4,
  },

  textContentItemEdited: {
    overflowWrap: "break-word",
    padding: "3px 115px 6px 6px",
    fontSize: "0.9rem",
    lineHeight: 1.4,
  },

  textContentItemDeleted: {
    fontStyle: "italic",
    color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.36)" : "rgba(0, 0, 0, 0.36)",
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  messageMedia: {
    objectFit: "cover",
    width: 250,
    height: 200,
    borderRadius: 12,
    border: "none",
    display: "block",
  },

  audioWrapper: {
    display: "flex",
    flexDirection: "column",
    "& audio": {
      borderRadius: 20,
      height: 40,
    },
  },

  timestamp: {
    fontSize: 11,
    position: "absolute",
    bottom: 2,
    right: 8,
    color: theme.palette.mode === "dark" ? "#a0aec0" : "#667781",
    display: "flex",
    alignItems: "center",
    gap: 2,
    pointerEvents: "none",
  },

  editedIndicator: {
    fontSize: 10,
    fontStyle: "italic",
    color: theme.palette.mode === "dark" ? "#a0aec0" : "#667781",
    marginRight: 3,
    whiteSpace: "nowrap",
  },

  reactionsContainer: {
    position: "absolute",
    bottom: -10,
    left: 6,
    display: "flex",
    flexWrap: "nowrap",
    gap: 2,
    zIndex: 1,
  },

  reactionBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.palette.mode === "dark" ? "#1e2428" : "#ffffff",
    borderRadius: 16,
    padding: "2px 6px",
    fontSize: "0.85rem",
    cursor: "default",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    minHeight: 20,
    "&:hover": {
      transform: "scale(1.1)",
    },
    transition: "transform 0.15s ease",
  },

  reactionBadgeRight: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.palette.mode === "dark" ? "#0b4f30" : "#dcf8c6",
    borderRadius: 16,
    padding: "2px 6px",
    fontSize: "0.85rem",
    cursor: "default",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    minHeight: 20,
    "&:hover": {
      transform: "scale(1.1)",
    },
    transition: "transform 0.15s ease",
  },

  reactionEmoji: {
    fontSize: "0.9rem",
    lineHeight: 1,
  },

  reactionCount: {
    fontSize: "0.65rem",
    color: theme.palette.mode === "dark" ? "#a0aec0" : "#667781",
    fontWeight: 600,
    marginLeft: 2,
  },

  // Añadir margen inferior a los mensajes que tienen reacciones
  messageWithReaction: {
    marginBottom: 14,
  },

  dailyTimestamp: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "auto",
    backgroundColor: theme.palette.mode === "dark" ? "#1e3a5f" : "#e1f3fb",
    margin: "10px",
    padding: "4px 12px",
    borderRadius: 8,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 1px 2px rgba(0,0,0,0.3)" 
      : "0 1px 2px rgba(0,0,0,0.1)",
  },

  dailyTimestampText: {
    color: theme.palette.mode === "dark" ? "#a0aec0" : "#667781",
    fontSize: "0.75rem",
    fontWeight: 500,
    alignSelf: "center",
    marginLeft: "0px",
  },

  ackIcons: {
    fontSize: 16,
    verticalAlign: "middle",
    marginLeft: 2,
  },

  deletedIcon: {
    fontSize: 18,
    verticalAlign: "middle",
    marginRight: 4,
    color: red[200],
  },

  deletedMsg: {
    color: red[200],
  },

  ackDoneAllIcon: {
    color: "#53bdeb",
    fontSize: 16,
    verticalAlign: "middle",
    marginLeft: 2,
  },

  downloadMedia: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    backgroundColor: "inherit",
    padding: "8px 4px",
    gap: 6,
    "& .MuiButton-root": {
      textTransform: "none",
      fontWeight: 600,
      fontSize: "0.8rem",
      borderRadius: 8,
      padding: "6px 16px",
    },
  },
  fileName: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginTop: 4,
    wordBreak: "break-word",
  },

  messageCenter: {
    marginTop: 5,
    alignItems: "center",
    verticalAlign: "center",
    alignContent: "center",
    backgroundColor: theme.palette.mode === "dark" ? "#1e3a5f" : "#E1F5FEEB",
    fontSize: "12px",
    minWidth: 100,
    maxWidth: 270,
    color: theme.palette.text.primary,
    borderRadius: 10,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 1px 2px rgba(0,0,0,0.3)" 
      : "0 1px 2px rgba(0,0,0,0.1)",
  },

  currentTick: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "auto",
    maxWidth: "80%",
    backgroundColor: theme.palette.primary.main,
    margin: "16px auto",
    padding: "10px 24px",
    borderRadius: 20,
    boxShadow: theme.palette.mode === "dark" 
      ? "0 2px 8px rgba(0,0,0,0.4)" 
      : "0 2px 8px rgba(0,0,0,0.12)",
  },

  currentTicktText: {
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.8rem",
    alignSelf: "center",
    margin: 0,
  },

  // Selection mode styles
  messageSelected: {
    backgroundColor: theme.palette.mode === "dark" 
      ? "rgba(37, 211, 102, 0.15)" 
      : "rgba(37, 211, 102, 0.1)",
  },
  checkboxContainer: {
    position: "absolute",
    left: -25,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
  },
  checkboxContainerRight: {
    position: "absolute",
    right: -35,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
  },
  messageWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  floatingActions: ({ drawerOpen }) => ({
    position: "fixed",
    bottom: 100,
    right: drawerOpen ? drawerWidth + 30 : 30,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 1000,
    [theme.breakpoints.down('md')]: {
      right: 16,
      bottom: 80,
    },
  }),
  fabForward: {
    backgroundColor: "#25D366",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#128C7E",
    },
  },
  fabCancel: {
    backgroundColor: theme.palette.error.main,
    color: "#fff",
    "&:hover": {
      backgroundColor: theme.palette.error.dark,
    },
  },
  selectionBadge: {
    "& .MuiBadge-badge": {
      backgroundColor: theme.palette.primary.main,
      color: "#fff",
    },
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload;
    const newMessages = [];
    const updatedState = [...state];

    messages.forEach((message) => {
      const messageIndex = updatedState.findIndex((m) => m.id === message.id);
      if (messageIndex !== -1) {
        updatedState[messageIndex] = message;
      } else {
        newMessages.push(message);
      }
    });

    return [...newMessages, ...updatedState];
  }

  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;
    const messageIndex = state.findIndex((m) => m.id === newMessage.id);

    if (messageIndex !== -1) {
      const updatedState = [...state];
      updatedState[messageIndex] = newMessage;
      return updatedState;
    } else {
      return [...state, newMessage];
    }
  }

  function ToastDisplay(props) {
    return (
      <>
        <h4>Mensaje Borrado por el contacto:</h4>
        <p>{props.body}</p>
      </>
    );
  }

  if (action.type === "UPDATE_MESSAGE") {
    const messageToUpdate = action.payload;

    const messageIndex = state.findIndex((m) => m.id === messageToUpdate.id);

    if (messageToUpdate.isDeleted === true) {
      toast.info(<ToastDisplay body={messageToUpdate.body}></ToastDisplay>);
    }

    if (messageIndex !== -1) {
      state[messageIndex] = messageToUpdate;
    }

    return [...state];
  }

  if (action.type === "UPDATE_REACTION") {
    const { messageId, reaction } = action.payload;
    const messageIndex = state.findIndex((m) => m.id === messageId);

    if (messageIndex !== -1) {
      const message = state[messageIndex];
      const reactions = message.reactions || [];
      const reactionIndex = reactions.findIndex(
        (r) => r.senderId === reaction.senderId
      );

      if (reactionIndex !== -1) {
        reactions[reactionIndex] = reaction;
      } else {
        reactions.push(reaction);
      }

      state[messageIndex] = { ...message, reactions };
    }

    return [...state];
  }

  if (action.type === "REMOVE_REACTION") {
    const { messageId, senderId } = action.payload;
    const messageIndex = state.findIndex((m) => m.id === messageId);

    if (messageIndex !== -1) {
      const message = state[messageIndex];
      const reactions = (message.reactions || []).filter(
        (r) => r.senderId !== senderId
      );
      state[messageIndex] = { ...message, reactions };
    }

    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const MessagesList = ({ ticketId, isGroup, isContactDrawerOpen = false }) => {
  const classes = useStyles({ drawerOpen: isContactDrawerOpen });

  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastMessageRef = useRef();
  const loadingRef = useRef(false);
  // const { user } = useContext(AuthContext);

  const [selectedMessage, setSelectedMessage] = useState({});
  const { setReplyingMessage } = useContext(ReplyMessageContext);

  const [anchorEl, setAnchorEl] = useState(null);
  const [anchorPosition, setAnchorPosition] = useState(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const currentTicketId = useRef(ticketId);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setHasMore(false);
    setLoading(false);

    currentTicketId.current = ticketId;
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    loadingRef.current = true;
    const delayDebounceFn = setTimeout(() => {
      const fetchMessages = async () => {
        if (!hasMore && pageNumber > 1) {
          setLoading(false);
          loadingRef.current = false;
          return;
        }

        try {
          const messagesListDiv = document.getElementById("messagesList");
          const previousScrollHeight = messagesListDiv ? messagesListDiv.scrollHeight : 0;
          const previousScrollTop = messagesListDiv ? messagesListDiv.scrollTop : 0;

          const { data } = await api.get("/messages/" + ticketId, {
            params: { pageNumber },
          });

          if (currentTicketId.current === ticketId) {
            dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
            setHasMore(data.hasMore);
            
            // Mantener la posición del scroll al cargar mensajes antiguos
            if (pageNumber > 1 && messagesListDiv && data.messages.length > 0) {
              requestAnimationFrame(() => {
                const newScrollHeight = messagesListDiv.scrollHeight;
                const scrollDiff = newScrollHeight - previousScrollHeight;
                messagesListDiv.scrollTop = previousScrollTop + scrollDiff;
              });
            }
            
            setLoading(false);
            loadingRef.current = false;
          }

          if (pageNumber === 1 && data.messages.length > 1) {
            setTimeout(() => scrollToBottom(), 100);
          }
        } catch (err) {
          setLoading(false);
          loadingRef.current = false;
          toastError(err);
        }
      };
      fetchMessages();
    }, 500);
    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [pageNumber, ticketId]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return undefined;

    const handleMessage = data => {
      // Verificar que el mensaje pertenece al ticket actual
      if (data.message && data.message.ticketId !== parseInt(ticketId)) {
        return;
      }

      if (data.action === "create") {
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
        scrollToBottom();
      }

      if (data.action === "update") {
        dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
      }

      if (data.action === "reactionUpdate") {
        dispatch({
          type: "UPDATE_REACTION",
          payload: { messageId: data.reaction.messageId, reaction: data.reaction }
        });
      }

      if (data.action === "reactionRemoved") {
        dispatch({
          type: "REMOVE_REACTION",
          payload: { messageId: data.messageId, senderId: data.senderId }
        });
      }
    };

    const join = () => socket.emit("joinChatBox", ticketId);
    if (socket.connected) {
      join();
    } else {
      socket.on("connect", join);
    }
    socket.on("appMessage", handleMessage);

    return () => {
      socket.off("connect", join);
      socket.off("appMessage", handleMessage);
    };
  }, [ticketId]);

  const loadMore = () => {
    if (!loadingRef.current && hasMore) {
      setPageNumber((prevPageNumber) => prevPageNumber + 1);
    }
  };

  const scrollToBottom = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({});
    }
  };

  const handleScroll = (e) => {
    if (!hasMore || loadingRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    // Evitar que el scroll llegue exactamente a 0 para prevenir rebotes
    if (scrollTop === 0) {
      e.currentTarget.scrollTop = 1;
      return;
    }

    // Verificar que no estamos en el fondo
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    if (isAtBottom) return;

    // Cargar más mensajes cuando estamos cerca del tope (dentro de los primeros 150px)
    if (scrollTop < 150) {
      loadMore();
    }
  };

  const handleOpenMessageOptionsMenu = (e, message) => {
    setAnchorEl(e.currentTarget);
    setAnchorPosition({ top: e.clientY, left: e.clientX });
    setSelectedMessage(message);
  };

  const hanldeReplyMessage = (e, message) => {
    setAnchorEl(null);
    setReplyingMessage(message);
  };

  const handleCloseMessageOptionsMenu = (e) => {
    setAnchorEl(null);
    setAnchorPosition(null);
  };

  // Selection handlers
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedMessages([]);
    }
  };

  const handleSelectMessage = (message) => {
    setSelectedMessages((prev) => {
      const isSelected = prev.find((m) => m.id === message.id);
      if (isSelected) {
        return prev.filter((m) => m.id !== message.id);
      } else {
        return [...prev, message];
      }
    });
  };

  const isMessageSelected = (messageId) => {
    return selectedMessages.some((m) => m.id === messageId);
  };

  const handleOpenForwardModal = () => {
    if (selectedMessages.length > 0) {
      setForwardModalOpen(true);
    }
  };

  const handleCloseForwardModal = () => {
    setForwardModalOpen(false);
    setSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleMessageClick = (event, message) => {
    if (selectionMode || event.ctrlKey || event.metaKey) {
      if (!selectionMode) {
        setSelectionMode(true);
      }
      handleSelectMessage(message);
    }
  };

  const checkMessageMedia = (message) => {
    // console.log(message);
    if (
      message.mediaType === "location" &&
      message.body.split("|").length >= 2
    ) {
      let locationParts = message.body.split("|");
      let imageLocation = locationParts[0];
      let linkLocation = locationParts[1];

      let descriptionLocation = null;

      if (locationParts.length > 2)
        descriptionLocation = message.body.split("|")[2];

      return (
        <LocationPreview
          image={imageLocation}
          link={linkLocation}
          description={descriptionLocation}
        />
      );
    } else if (message.mediaType === "vcard") {
      let array = message.body.split("\n");
      let obj = [];
      let contact = "";
      for (let index = 0; index < array.length; index++) {
        const v = array[index];
        let values = v.split(":");
        for (let ind = 0; ind < values.length; ind++) {
          if (values[ind].indexOf("+") !== -1) {
            obj.push({ number: values[ind] });
          }
          if (values[ind].indexOf("FN") !== -1) {
            contact = values[ind + 1];
          }
        }
      }
      return <VcardPreview contact={contact} numbers={obj[0].number} />;
    } else if (message.mediaType === "image") {
      return <ModalImageCors imageUrl={message.mediaUrl} />
    } else if (message.mediaType === "audio") {
      return (
        <div className={classes.audioWrapper}>
          <Audio url={message.mediaUrl} />
        </div>
      );
    } else if (message.mediaType === "video") {
      return (
        <video
          className={classes.messageMedia}
          src={message.mediaUrl}
          controls
        />
      );
    } else {
      // Extraer nombre del archivo de la URL
      const fileName = message.mediaUrl ? message.mediaUrl.split('/').pop() : message.body || 'archivo';
      return (
        <div className={classes.downloadMedia}>
          <Button
            startIcon={<GetApp />}
            color="primary"
            variant="outlined"
            target="_blank"
            href={message.mediaUrl}
          >
            Descargar
          </Button>
          <span className={classes.fileName}>{fileName}</span>
        </div>
      );
    }
  };

  const renderMessageAck = (message) => {
    if (message.ack === 0) {
      return <AccessTime fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 1) {
      return <Done fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 2) {
      return <DoneAll fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 3 || message.ack === 4) {
      return <DoneAll fontSize="small" className={classes.ackDoneAllIcon} />;
    }
  };

  const renderReactions = (message) => {
    if (!message.reactions || message.reactions.length === 0) {
      return null;
    }

    // Agrupar reacciones por emoji
    const groupedReactions = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {});

    const isFromMe = message.fromMe;

    return (
      <div className={classes.reactionsContainer} style={isFromMe ? { left: 'auto', right: 6 } : {}}>
        {Object.entries(groupedReactions).map(([emoji, reactions]) => (
          <Tooltip
            key={emoji}
            title={reactions.map((r) => r.senderName || r.senderId).join(", ")}
            arrow
            placement="top"
          >
            <span className={isFromMe ? classes.reactionBadgeRight : classes.reactionBadge}>
              <span className={classes.reactionEmoji}>{emoji}</span>
              {reactions.length > 1 && (
                <span className={classes.reactionCount}>{reactions.length}</span>
              )}
            </span>
          </Tooltip>
        ))}
      </div>
    );
  };

  const hasReactions = (message) => {
    return message.reactions && message.reactions.length > 0;
  };

  const renderDailyTimestamps = (message, index) => {
    if (index === 0) {
      return (
        <span
          className={classes.dailyTimestamp}
          key={`daily-timestamp-first-${message.id}`}
        >
          <div className={classes.dailyTimestampText}>
            {format(
              parseISO(messagesList[index].createdAt),
              "dd/MM/yyyy hh:mm a"
            )}
          </div>
        </span>
      );
    }
    if (index < messagesList.length - 1) {
      let messageDay = parseISO(messagesList[index].createdAt);
      let previousMessageDay = parseISO(messagesList[index - 1].createdAt);

      if (!isSameDay(messageDay, previousMessageDay)) {
        return (
          <span
            className={classes.dailyTimestamp}
            key={`daily-timestamp-${message.id}`}
          >
            <div className={classes.dailyTimestampText}>
              {format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
            </div>
          </span>
        );
      }
    }
    if (index === messagesList.length - 1) {
      return (
        <div
          key={`ref-${message.createdAt}`}
          ref={lastMessageRef}
          style={{ float: "left", clear: "both" }}
        />
      );
    }
  };

  // const renderNumberTicket = (message, index) => {
  //   if (index < messagesList.length && index > 0) {
  //     let messageTicket = message.ticketId;
  //     let previousMessageTicket = messagesList[index - 1].ticketId;

  //     if (messageTicket !== previousMessageTicket) {
  //       return (
  //         <div key={`ticket-${message.id}`} className={classes.ticketNumber}>
  //           #Chamado: {messageTicket}
  //           <hr />
  //         </div>
  //       );
  //     }
  //   }
  // };

  const renderTicketsSeparator = (message, index) => {
    let lastTicket = messagesList[index - 1]?.ticketId;
    let currentTicket = message.ticketId;

    if (lastTicket !== currentTicket && lastTicket !== undefined) {
      return (
        <span className={classes.currentTick} key={`ticket-separator-${message.id}`}>
          <div className={classes.currentTicktText}>
            #Conversación {message.ticketId}{" "}

              {message.ticket && message.ticket.createdAt && (
                <span>
                  {" "}
                  -{" "}
                  {format(
                    parseISO(message.ticket.createdAt),
                    "dd/MM/yyyy HH:mm"
                  )}
                </span>
              )}
            </div>
        </span>
      );
    }
  };

  const renderMessageDivider = (message, index) => {
    if (index < messagesList.length && index > 0) {
      let messageUser = messagesList[index].fromMe;
      let previousMessageUser = messagesList[index - 1].fromMe;

      if (messageUser !== previousMessageUser) {
        return (
          <span style={{ marginTop: 16 }} key={`divider-${message.id}`}></span>
        );
      }
    }
  };

  const renderQuotedMessage = (message) => {
    const handleQuotedMessageClick = () => {
      const element = document.getElementById(
        `message-${message.quotedMsg?.id}`
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add(classes.messageHighlight);
        setTimeout(() => {
          element.classList.remove(classes.messageHighlight);
        }, 2000);
      }
    };

    return (
      <div
        className={clsx(classes.quotedContainerLeft, {
          [classes.quotedContainerRight]: message.fromMe,
        })}
        onClick={handleQuotedMessageClick}
      >
        <span
          className={clsx(classes.quotedSideColorLeft, {
            [classes.quotedSideColorRight]: message.quotedMsg?.fromMe,
          })}
        ></span>
        <div className={classes.quotedMsg}>
          {!message.quotedMsg?.fromMe && (
            <span className={classes.messageContactName}>
              {message.quotedMsg?.contact?.name}
            </span>
          )}
          {message.quotedMsg.mediaType === "audio" && (
            <div className={classes.downloadMedia}>
              <audio controls>
                <source
                  src={message.quotedMsg.mediaUrl}
                  type="audio/ogg"
                ></source>
              </audio>
            </div>
          )}
          {message.quotedMsg.mediaType === "video" && (
            <video
              className={classes.messageMedia}
              src={message.quotedMsg.mediaUrl}
              controls
            />
          )}
          {message.quotedMsg.mediaType === "application" && (
            <div className={classes.downloadMedia}>
              <Button
                startIcon={<GetApp />}
                color="primary"
                variant="outlined"
                target="_blank"
                href={message.quotedMsg.mediaUrl}
                size="small"
              >
                Descargar
              </Button>
            </div>
          )}

          {message.quotedMsg.mediaType === "image" ? (
            <ModalImageCors imageUrl={message.quotedMsg.mediaUrl} />
          ) : (
            message.quotedMsg?.body
          )}
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    if (messagesList.length > 0) {
      const viewMessagesList = messagesList.map((message, index) => {
        if (message.mediaType === "call_log") {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              {/* {renderNumberTicket(message, index)} */}
              {renderTicketsSeparator(message, index)}
              <div
                id={`message-${message.id}`}
                className={classes.messageCenter}
                onDoubleClick={(e) => hanldeReplyMessage(e, message)}
              >
                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>
                {isGroup && (
                  <span className={classes.messageContactName}>
                    {message.contact?.name}
                  </span>
                )}
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 17"
                    width="20"
                    height="17"
                  >
                    <path
                      fill="#df3333"
                      d="M18.2 12.1c-1.5-1.8-5-2.7-8.2-2.7s-6.7 1-8.2 2.7c-.7.8-.3 2.3.2 2.8.2.2.3.3.5.3 1.4 0 3.6-.7 3.6-.7.5-.2.8-.5.8-1v-1.3c.7-1.2 5.4-1.2 6.4-.1l.1.1v1.3c0 .2.1.4.2.6.1.2.3.3.5.4 0 0 2.2.7 3.6.7.2 0 1.4-2 .5-3.1zM5.4 3.2l4.7 4.6 5.8-5.7-.9-.8L10.1 6 6.4 2.3h2.5V1H4.1v4.8h1.3V3.2z"
                    ></path>
                  </svg>{" "}
                  <span>
                    Chamada de voz/vídeo perdida às{" "}
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }
        if (!message.fromMe) {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              {/* {renderNumberTicket(message, index)} */}
              {renderTicketsSeparator(message, index)}
              <div className={classes.messageWrapper}>
                {selectionMode && (
                  <div className={classes.checkboxContainer}>
                    <Checkbox
                      checked={isMessageSelected(message.id)}
                      onChange={() => handleSelectMessage(message)}
                      color="primary"
                      size="small"
                    />
                  </div>
                )}
                <div
                  id={`message-${message.id}`}
                  className={clsx(classes.messageLeft, {
                    [classes.messageSelected]: isMessageSelected(message.id),
                    [classes.messageWithReaction]: hasReactions(message),
                  })}
                  onDoubleClick={(e) => hanldeReplyMessage(e, message)}
                  onClick={(e) => handleMessageClick(e, message)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleOpenMessageOptionsMenu(e, message);
                  }}
                >
                  <IconButton
                    variant="contained"
                    size="small"
                    id="messageActionsButton"
                    disabled={message.isDeleted}
                    className={classes.messageActionsButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMessageOptionsMenu(e, message);
                    }}
                  >
                    <ExpandMore />
                  </IconButton>
                  {isGroup && (
                    <span className={classes.messageContactName}>
                      {message.contact?.name}
                    </span>
                  )}
                  {message.isDeleted && (
                    <div>
                      <span className={classes.deletedMsg}>
                        <Block
                          color=""
                          fontSize="small"
                          className={classes.deletedIcon}
                        />
                        Mensaje Borrado por el contacto
                      </span>
                    </div>
                  )}
                  {(message.mediaUrl ||
                    message.mediaType === "location" ||
                    message.mediaType === "vcard") &&
                    //|| message.mediaType === "multi_vcard"
                    checkMessageMedia(message)}
                  <div className={clsx(classes.textContentItem, {
                    [classes.textContentItemEdited]: message.isEdited,
                  })}>
                    {message.quotedMsg && renderQuotedMessage(message)}
                    <MarkdownWrapper>{message.body}</MarkdownWrapper>
                    <span className={classes.timestamp}>
                      {message.isEdited && (
                        <span className={classes.editedIndicator}>
                          {i18n.t("messagesList.edited")}
                        </span>
                      )}
                      {format(parseISO(message.createdAt), "HH:mm")}
                    </span>
                  </div>
                  {renderReactions(message)}
                </div>
              </div>
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              {renderTicketsSeparator(message, index)}
              {/* {renderNumberTicket(message, index)} */}
              <div className={classes.messageWrapper} style={{ justifyContent: 'flex-end' }}>
                <div
                  id={`message-${message.id}`}
                  className={clsx(classes.messageRight, {
                    [classes.messageSelected]: isMessageSelected(message.id),
                    [classes.messageWithReaction]: hasReactions(message),
                  })}
                  onDoubleClick={(e) => hanldeReplyMessage(e, message)}
                  onClick={(e) => handleMessageClick(e, message)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleOpenMessageOptionsMenu(e, message);
                  }}
                >
                  <IconButton
                    variant="contained"
                    size="small"
                    id="messageActionsButton"
                    disabled={message.isDeleted}
                    className={classes.messageActionsButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMessageOptionsMenu(e, message);
                    }}
                  >
                    <ExpandMore />
                  </IconButton>
                  {(message.mediaUrl ||
                    message.mediaType === "location" ||
                    message.mediaType === "vcard") &&
                    //|| message.mediaType === "multi_vcard"
                    checkMessageMedia(message)}
                  <div
                    className={clsx(classes.textContentItem, {
                      [classes.textContentItemDeleted]: message.isDeleted,
                      [classes.textContentItemEdited]: message.isEdited && !message.isDeleted,
                    })}
                  >
                    {message.isDeleted && (
                      <Block
                        color="disabled"
                        fontSize="small"
                        className={classes.deletedIcon}
                      />
                    )}
                    {message.quotedMsg && renderQuotedMessage(message)}
                    <MarkdownWrapper>{message.body}</MarkdownWrapper>
                    <span className={classes.timestamp}>
                      {message.isEdited && (
                        <span className={classes.editedIndicator}>
                          {i18n.t("messagesList.edited")}
                        </span>
                      )}
                      {format(parseISO(message.createdAt), "HH:mm")}
                      {renderMessageAck(message)}
                    </span>
                  </div>
                  {renderReactions(message)}
                </div>
                {selectionMode && (
                  <div className={classes.checkboxContainer}>
                    <Checkbox
                      checked={isMessageSelected(message.id)}
                      onChange={() => handleSelectMessage(message)}
                      color="primary"
                      size="small"
                    />
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        }
      });
      return viewMessagesList;
    } else {
      return <div>Say hello to your new contact!</div>;
    }
  };

  return (
    <div className={classes.messagesListWrapper}>
      <MessageOptionsMenu
        message={selectedMessage}
        anchorEl={anchorEl}
        anchorPosition={anchorPosition}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
      />
      <div
        id="messagesList"
        className={classes.messagesList}
        role="region"
        tabIndex={0} // eslint-disable-line jsx-a11y/no-noninteractive-tabindex
        aria-label={i18n.t("messagesList.messagesRegion", { defaultValue: "Lista de mensajes" })}
        onScroll={handleScroll}
      >
        {messagesList.length > 0 ? renderMessages() : []}
      </div>
      {loading && (
        <div>
          <CircularProgress className={classes.circleLoading} />
        </div>
      )}
      
      {/* Floating action buttons for selection mode */}
      {selectionMode && selectedMessages.length > 0 && (
        <div className={classes.floatingActions}>
          <Tooltip title={i18n.t("messagesInput.cancel")}>
            <Fab
              color="default"
              size="small"
              className={classes.fabCancel}
              onClick={handleToggleSelectionMode}
            >
              <Close />
            </Fab>
          </Tooltip>
          <Badge
            badgeContent={selectedMessages.length}
            color="secondary"
            overlap="rectangular"
          >
            <Tooltip title={i18n.t("messageOptionsMenu.forward")}>
              <Fab
                color="primary"
                className={classes.fabForward}
                onClick={handleOpenForwardModal}
              >
                <Reply style={{ transform: 'scaleX(-1)' }} />
              </Fab>
            </Tooltip>
          </Badge>
        </div>
      )}
      
      {/* Forward message modal */}
      <ForwardMessageModal
        open={forwardModalOpen}
        onClose={handleCloseForwardModal}
        messages={selectedMessages}
      />
    </div>
  );
};

export default MessagesList;
