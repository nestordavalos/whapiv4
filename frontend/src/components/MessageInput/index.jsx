import React, {
  useState,
  useEffect,
  useContext,
  useRef
} from "react";
import { useParams } from "react-router-dom";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";
import {
  CircularProgress,
  ClickAwayListener,
  Alert,
  IconButton,
  InputBase,
  Paper,
  FormControlLabel,
  Hidden,
  Menu,
  MenuItem,
  Switch,
  Avatar,
} from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import { green } from "@mui/material/colors";
import {
  AttachFile,
  CheckCircleOutline,
  Clear,
  HighlightOff,
  Mic,
  Mood,
  MoreVert,
  Send
} from "@mui/icons-material";
import clsx from "clsx";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import RecordingTimer from "./RecordingTimer";

const useStyles = makeStyles((theme) => ({
  mainWrapper: {
    background: theme.palette.background.paper,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderTop: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('md')]: {
      position: "fixed",
      bottom: 0,
      width: "100%",
    },
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: "25%"
  },
  dropInfo: {
    background: theme.palette.background.default,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    padding: 15,
    left: 0,
    right: 0,
  },
  dropInfoOut: {
    display: "none",
  },
  mediaThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    objectFit: "cover",
  },
  mediaThumbWrapper: {
    position: "relative",
    display: "inline-block",
    margin: 2,
  },
  removeMediaButton: {
    position: "absolute",
    top: -6,
    right: -6,
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    padding: 2,
    '&:hover': {
      background: "rgba(0,0,0,0.8)",
    },
  },
  newMessageBox: {
    background: theme.palette.background.paper,
    width: "100%",
    display: "flex",
    padding: "10px 12px",
    alignItems: "center",
    gap: 4,
    flexWrap: "nowrap",
    minWidth: 0,
  },
  messageInputWrapper: {
    padding: "8px 12px",
    marginRight: 4,
    marginLeft: 4,
    background: theme.palette.background.default,
    display: "flex",
    borderRadius: 24,
    flex: 1,
    minWidth: 120,
    position: "relative",
    border: `1px solid ${theme.palette.divider}`,
    transition: "all 0.2s ease",
    "&:focus-within": {
      borderColor: theme.palette.primary.light,
      boxShadow: `0 0 0 2px ${theme.palette.primary.light}15`,
    },
  },
  messageInput: {
    paddingLeft: 8,
    flex: 1,
    border: "none",
    fontSize: "0.9rem",
    "&::placeholder": {
      color: theme.palette.text.secondary,
    },
  },
  sendMessageIcons: {
    color: theme.palette.text.secondary,
    fontSize: "1.4rem",
    transition: "color 0.2s ease",
  },
  iconButton: {
    padding: 8,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
    "&:hover $sendMessageIcons": {
      color: theme.palette.primary.main,
    },
  },
  uploadInput: {
    display: "none",
  },
  emojiBox: {
    position: "absolute",
    bottom: 63,
    width: 40,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  circleLoading: {
    color: green[500],
    opacity: "70%",
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -12,
  },
  audioLoading: {
    color: green[500],
    opacity: "70%",
  },
  recorderWrapper: {
    display: "flex",
    alignItems: "center",
    alignContent: "middle",
    gap: 4,
  },
  cancelAudioIcon: {
    color: theme.palette.error.main,
    fontSize: "1.5rem",
  },
  sendAudioIcon: {
    color: theme.palette.success.main,
    fontSize: "1.5rem",
  },
  replyginMsgWrapper: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingLeft: 73,
    paddingRight: 7,
  },
  replyginMsgContainer: {
    flex: 1,
    marginRight: 5,
    overflowY: "hidden",
    backgroundColor: theme.palette.action.hover,
    borderRadius: 10,
    display: "flex",
    position: "relative",
  },
  replyginMsgBody: {
    padding: 10,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
    fontSize: "0.85rem",
  },
  replyginContactMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: theme.palette.success.main,
    borderRadius: "4px 0 0 4px",
  },
  replyginSelfMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: theme.palette.primary.main,
    borderRadius: "4px 0 0 4px",
  },
  messageContactName: {
    display: "flex",
    color: theme.palette.primary.main,
    fontWeight: 600,
    fontSize: "0.8rem",
  },
  messageQuickAnswersWrapper: {
    margin: 0,
    position: "absolute",
    bottom: "50px",
    background: theme.palette.background.paper,
    padding: "4px",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    left: 0,
    width: "100%",
    maxHeight: "300px",
    overflowY: "auto",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    ...theme.scrollbarStyles,
    "& li": {
      listStyle: "none",
      "& a": {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "10px 12px",
        fontSize: "0.85rem",
        borderRadius: 8,
        margin: 4,
        transition: "all 0.2s ease",
        "&:hover": {
          background: theme.palette.action.hover,
          cursor: "pointer",
          transform: "translateX(4px)",
        },
      },
    },
  },
  messageQuickAnswersWrapperItem: {
    "& .shortcut": {
      display: "inline-block",
      fontWeight: 600,
      color: theme.palette.primary.main,
      fontFamily: "monospace",
      fontSize: "0.9rem",
      backgroundColor: theme.palette.mode === "dark"
        ? theme.palette.primary.main + "1F"
        : theme.palette.primary.main + "14",
      padding: "2px 8px",
      borderRadius: 4,
      marginBottom: "2px",
    },
    "& .message": {
      color: theme.palette.text.secondary,
      fontSize: "0.8rem",
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      lineHeight: "1.3",
    },
  },
  signSwitch: {
    "& .MuiFormControlLabel-label": {
      fontSize: "0.75rem",
      color: theme.palette.text.secondary,
      whiteSpace: "nowrap",
    },
    marginRight: 4,
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
  },
}));

const MessageInput = ({ ticketStatus, ticketSendBlocked = false }) => {
  const classes = useStyles();
  const { ticketId } = useParams();
  const [medias, setMedias] = useState([]);
  const [mediaCaption, setMediaCaption] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);

  // The Socket.IO notification is still used for every connected client, but
  // the sender already has the authoritative response from POST /messages.
  // Publish it locally as well so an out-of-order socket event cannot make a
  // newly-created reply wait for a page refresh before its quote is rendered.
  const publishCreatedMessages = (response) => {
    const messages = Array.isArray(response) ? response : [response];
    messages.filter(Boolean).forEach((createdMessage) => {
      window.dispatchEvent(
        new CustomEvent("ticket:message-created", { detail: createdMessage })
      );
    });
  };
  const [quickAnswers, setQuickAnswer] = useState([]);
  const [typeBar, setTypeBar] = useState(false);
  const inputRef = useRef();
  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const [onDragEnter, setOnDragEnter] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { setReplyingMessage, replyingMessage } = useContext(ReplyMessageContext);
  const { user } = useContext(AuthContext);
  const [signMessage, setSignMessage] = useLocalStorage("signOption", true);
  const sendingDisabled = loading || recording || ticketStatus !== "open" || ticketSendBlocked;

  const releaseRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const stopNativeRecording = () => new Promise((resolve) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      releaseRecordingStream();
      resolve(null);
      return;
    }

    recorder.addEventListener("stop", () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      recordingChunksRef.current = [];
      mediaRecorderRef.current = null;
      releaseRecordingStream();
      resolve(blob);
    }, { once: true });
    recorder.stop();
  });

  useEffect(() => {
    inputRef.current.focus();
  }, [replyingMessage]);

  useEffect(() => {
    inputRef.current.focus();
    return () => {
      stopNativeRecording();
      setInputMessage("");
      setShowEmoji(false);
      setMedias([]);
      setMediaCaption("");
      setReplyingMessage(null);
    };
  }, [ticketId, setReplyingMessage]);

  useEffect(() => {
    if (!onDragEnter) return undefined;

    const timer = setTimeout(() => {
      setOnDragEnter(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDragEnter]);

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  const handleChangeInput = (e) => {
    setInputMessage(e.target.value);
    handleLoadQuickAnswer(e.target.value);
  };

  const handleQuickAnswersClick = (value) => {
    setInputMessage(value);
    setTypeBar(false);
  };

  const handleAddEmoji = (e) => {
    let emoji = e.native;
    setInputMessage((prevState) => prevState + emoji);
  };

  const handleChangeMedias = (e) => {
    if (!e.target.files) {
      return;
    }
    const selectedMedias = Array.from(e.target.files);
    setMedias(selectedMedias);
  };

  const handleInputPaste = (e) => {
    if (e.clipboardData.files[0]) {
      const selectedMedias = Array.from(e.clipboardData.files);
      setMedias(selectedMedias);
    }
  };

  const handleInputDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      const selectedMedias = Array.from(e.dataTransfer.files);
      setMedias(selectedMedias);
    }
  };

  const handleRemoveMedia = (index) => {
    setMedias((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setMediaCaption("");
      }
      return newFiles;
    });
  };

  const handleUploadMedia = async (e) => {
    if (ticketSendBlocked) return;
    setLoading(true);
    if (e) {
      e.preventDefault();
    }
    const formData = new FormData();
    formData.append("fromMe", true);
    medias.forEach((media) => {
      formData.append("medias", media);
    });
    if (mediaCaption.trim()) {
      formData.append("body", mediaCaption.trim());
    }
    if (replyingMessage) {
      formData.append("quotedMsg", JSON.stringify(replyingMessage));
    }
    try {
      const { data } = await api.post(`/messages/${ticketId}`, formData);
      publishCreatedMessages(data);
    } catch (err) {
      toastError(err);
    }

    setLoading(false);
    setMedias([]);
    setMediaCaption("");
    setReplyingMessage(null);
  };

  const handleSendMessage = async () => {
    if (ticketSendBlocked) return;
    if (inputMessage.trim() === "") return;
    setLoading(true);
    
    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: signMessage
        ? `*${user?.name}:*\n${inputMessage.trim()}`
        : inputMessage.trim(),
      quotedMsg: replyingMessage,
    };
    
    try {
      const { data } = await api.post(`/messages/${ticketId}`, message);
      publishCreatedMessages(data);
    } catch (err) {
      toastError(err);
    }
    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
  };

  const handleStartRecording = async () => {
    if (ticketSendBlocked) return;
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Store it immediately so an unsupported MediaRecorder implementation
      // cannot leave the microphone active after throwing below.
      recordingStreamRef.current = stream;
      const mimeType = [
        "audio/ogg; codecs=opus",
        "audio/webm; codecs=opus",
        "audio/webm"
      ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recordingChunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      });
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      releaseRecordingStream();
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadQuickAnswer = async (value) => {
    if (value && value.indexOf("/") === 0) {
      try {
        const searchTerm = inputMessage.substring(1).toLowerCase();
        const { data } = await api.get("/quickAnswers/", {
          params: { searchParam: searchTerm },
        });
        
        // Filtrado y ordenamiento mejorado en el frontend
        let filteredQuickAnswers = data.quickAnswers.filter(qa => 
          qa.shortcut.toLowerCase().includes(searchTerm) || 
          qa.message.toLowerCase().includes(searchTerm)
        );
        
        // Ordenar para priorizar coincidencias exactas en el atajo
        filteredQuickAnswers.sort((a, b) => {
          const aShortcut = a.shortcut.toLowerCase();
          const bShortcut = b.shortcut.toLowerCase();
          
          // Coincidencia exacta del atajo tiene máxima prioridad
          if (aShortcut === searchTerm && bShortcut !== searchTerm) return -1;
          if (bShortcut === searchTerm && aShortcut !== searchTerm) return 1;
          
          // Coincidencia que empieza con el término en el atajo
          const aStartsWith = aShortcut.startsWith(searchTerm);
          const bStartsWith = bShortcut.startsWith(searchTerm);
          if (aStartsWith && !bStartsWith) return -1;
          if (bStartsWith && !aStartsWith) return 1;
          
          // Coincidencia en el atajo antes que en el mensaje
          const aInShortcut = aShortcut.includes(searchTerm);
          const bInShortcut = bShortcut.includes(searchTerm);
          if (aInShortcut && !bInShortcut) return -1;
          if (bInShortcut && !aInShortcut) return 1;
          
          // Por defecto, orden alfabético por atajo
          return aShortcut.localeCompare(bShortcut);
        });
        
        setQuickAnswer(filteredQuickAnswers);
        if (filteredQuickAnswers.length > 0) {
          setTypeBar(true);
        } else {
          setTypeBar(false);
        }
      } catch (err) {
        setTypeBar(false);
      }
    } else {
      setTypeBar(false);
    }
  };

  const handleUploadAudio = async () => {
    if (ticketSendBlocked) return;
    setLoading(true);
    try {
      const blob = await stopNativeRecording();
      if (!blob || blob.size < 1000) {
        return;
      }

      const formData = new FormData();
      const filename = `${new Date().getTime()}.${blob.type.includes("ogg") ? "ogg" : "webm"}`;
      formData.append("medias", blob, filename);
      formData.append("fromMe", true);
      // A browser recording is a WhatsApp voice note, not a regular audio file.
      formData.append("voiceNote", "true");
      if (replyingMessage) {
        formData.append("quotedMsg", JSON.stringify(replyingMessage));
      }

      const { data } = await api.post(`/messages/${ticketId}`, formData);
      publishCreatedMessages(data);
      setReplyingMessage(null);
    } catch (err) {
      toastError(err);
    } finally {
      setRecording(false);
      setLoading(false);
    }
  };

  const handleCancelAudio = async () => {
    try {
      await stopNativeRecording();
    } catch (err) {
      toastError(err);
    } finally {
      setRecording(false);
    }
  };

  const handleOpenMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = (event) => {
    setAnchorEl(null);
  };

  const renderReplyingMessage = (message) => {
    const renderMessageContent = () => {
      if (message.mediaType === "location") {
        const locationParts = (message.body || "").split("|");
        const descriptionLocation = locationParts.length > 2 ? locationParts[2] : "Ubicación";
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>📍</span>
            <span style={{ fontSize: '0.875rem', color: '#667781' }}>
              {descriptionLocation}
            </span>
          </div>
        );
      }
      
      if (message.mediaType === "vcard") {
        const vcardLines = (message.body || "").split("\n");
        let contactName = "Contacto";
        let phoneNumber = "";
        
        vcardLines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith("FN:")) {
            contactName = trimmedLine.substring(3);
          } else if (trimmedLine.includes("FN") && trimmedLine.includes(":")) {
            const parts = trimmedLine.split(":");
            if (parts.length > 1) {
              contactName = parts[parts.length - 1];
            }
          }
          
          if (trimmedLine.includes("TEL")) {
            const parts = trimmedLine.split(":");
            for (let i = 0; i < parts.length; i++) {
              if (parts[i].includes("+") || /^\d{10,}/.test(parts[i])) {
                phoneNumber = parts[i];
                break;
              }
            }
          }
        });
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>👤</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#303030' }}>
                {contactName}
              </span>
              {phoneNumber && (
                <span style={{ fontSize: '0.75rem', color: '#667781' }}>
                  {phoneNumber}
                </span>
              )}
            </div>
          </div>
        );
      }
      
      return message.body;
    };

    return (
      <div className={classes.replyginMsgWrapper}>
        <div className={classes.replyginMsgContainer}>
          <span
            className={clsx(classes.replyginContactMsgSideColor, {
              [classes.replyginSelfMsgSideColor]: !message.fromMe,
            })}
          ></span>
          <div className={classes.replyginMsgBody}>
            {!message.fromMe && (
              <span className={classes.messageContactName}>
                {message.contact?.name}
              </span>
            )}
            {renderMessageContent()}
          </div>
        </div>
        <IconButton
          aria-label="showRecorder"
          component="span"
          disabled={sendingDisabled}
          onClick={() => setReplyingMessage(null)}
          size="large">
          <Clear className={classes.sendMessageIcons} />
        </IconButton>
      </div>
    );
  };

  const renderMediaPreview = (files) => {
    return (
      <div className={classes.replyginMsgWrapper}>
        <div className={classes.replyginMsgContainer}>
          <span
            className={clsx(
              classes.replyginContactMsgSideColor,
              classes.replyginSelfMsgSideColor
            )}
          ></span>
          <div className={classes.replyginMsgBody}>
            {files.map((value, index) => (
              <div key={index} className={classes.mediaThumbWrapper}>
                {value.type.indexOf("image") > -1 ? (
                  <img
                    alt={value.name}
                    src={URL.createObjectURL(value)}
                    className={classes.mediaThumb}
                  />
                ) : (
                  <Avatar className={classes.avatar} alt={value.name} />
                )}
                <IconButton
                  size="small"
                  className={classes.removeMediaButton}
                  onClick={() => handleRemoveMedia(index)}
                >
                  <HighlightOff fontSize="small" />
                </IconButton>
              </div>
            ))}
          </div>
        </div>
        <IconButton
          aria-label="clear-media"
          component="span"
          disabled={sendingDisabled}
          onClick={() => {
            setMedias([]);
            setMediaCaption("");
          }}
          size="large">
          <Clear className={classes.sendMessageIcons} />
        </IconButton>
      </div>
    );
  };

  if (medias.length > 0)
    return (
      <Paper
        square
        elevation={0}
        className={classes.mainWrapper}
        onDragEnter={() => setOnDragEnter(true)}
        onDrop={(e) => handleInputDrop(e)}
      >
        <div className={onDragEnter ? classes.dropInfo : classes.dropInfoOut}>
          {i18n.t("uploads.titles.titleUploadMsgDragDrop")}
        </div>
        {replyingMessage && renderReplyingMessage(replyingMessage)}
        {renderMediaPreview(medias)}
        <div className={classes.newMessageBox}>
          <Hidden only={["sm", "xs"]}>
            <IconButton
              aria-label="emojiPicker"
              component="span"
              disabled={sendingDisabled}
              onClick={(e) => setShowEmoji((prevState) => !prevState)}
              size="large">
              <Mood className={classes.sendMessageIcons} />
            </IconButton>
            {showEmoji ? (
              <div className={classes.emojiBox}>
                <ClickAwayListener onClickAway={(e) => setShowEmoji(true)}>
                  <Picker
                    perLine={16}
                    theme={"dark"}
                    i18n={i18n}
                    showPreview={true}
                    showSkinTones={false}
                    onSelect={handleAddEmoji}
                  />
                </ClickAwayListener>
              </div>
            ) : null}
            <input
              multiple
              type="file"
              id="upload-button"
              disabled={sendingDisabled}
              className={classes.uploadInput}
              onChange={handleChangeMedias}
            />
            <label htmlFor="upload-button">
              <IconButton
                aria-label="upload"
                component="span"
                disabled={sendingDisabled}
                onMouseOver={() => setOnDragEnter(true)}
                size="large">
                <AttachFile className={classes.sendMessageIcons} />
              </IconButton>
            </label>
            <FormControlLabel
              className={classes.signSwitch}
              label={i18n.t("messagesInput.signMessage")}
              labelPlacement="start"
              control={
                <Switch
                  size="small"
                  checked={signMessage}
                  onChange={(e) => {
                    setSignMessage(e.target.checked);
                  }}
                  name="showAllTickets"
                  color="secondary"
                />
              }
            />
          </Hidden>
          <Hidden only={["md", "lg", "xl"]}>
            <IconButton
              aria-controls="simple-menu"
              aria-haspopup="true"
              onClick={handleOpenMenuClick}
              size="large">
              <MoreVert></MoreVert>
            </IconButton>
            <Menu
              id="simple-menu"
              keepMounted
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuItemClick}
            >
              <MenuItem onClick={handleMenuItemClick}>
                <IconButton
                  aria-label="emojiPicker"
                  component="span"
                  disabled={sendingDisabled}
                  onClick={(e) => setShowEmoji((prevState) => !prevState)}
                  size="large">
                  <Mood className={classes.sendMessageIcons} />
                </IconButton>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick}>
                <input
                  multiple
                  type="file"
                  id="upload-button"
                  disabled={sendingDisabled}
                  className={classes.uploadInput}
                  onChange={handleChangeMedias}
                />
                <label htmlFor="upload-button">
                  <IconButton
                    aria-label="upload"
                    component="span"
                    disabled={sendingDisabled}
                    size="large">
                    <AttachFile className={classes.sendMessageIcons} />
                  </IconButton>
                </label>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick}>
                <FormControlLabel
                  className={classes.signSwitch}
                  label={i18n.t("messagesInput.signMessage")}
                  labelPlacement="start"
                  control={
                    <Switch
                      size="small"
                      checked={signMessage}
                      onChange={(e) => {
                        setSignMessage(e.target.checked);
                      }}
                      name="showAllTickets"
                      color="primary"
                    />
                  }
                />
              </MenuItem>
            </Menu>
          </Hidden>
          <div className={classes.messageInputWrapper}>
            <InputBase
              inputRef={(input) => {
                input && input.focus();
                input && (inputRef.current = input);
              }}
              className={classes.messageInput}
              placeholder={i18n.t("messagesInput.captionPlaceholder")}
              multiline
              maxRows={5}
              value={capitalizeFirstLetter(mediaCaption)}
              onChange={(e) => setMediaCaption(e.target.value)}
              disabled={sendingDisabled}
              onKeyPress={(e) => {
                if (loading || e.shiftKey) return;
                else if (e.key === "Enter") {
                  handleUploadMedia();
                }
              }}
            />
          </div>
          <IconButton
            aria-label="send-upload"
            component="span"
            onClick={handleUploadMedia}
            disabled={sendingDisabled}
            size="large">
            <Send className={classes.sendMessageIcons} />
          </IconButton>
        </div>
      </Paper>
    );
  else {
    return (
      <Paper
        square
        elevation={0}
        className={classes.mainWrapper}
        onDragEnter={() => setOnDragEnter(true)}
        onDrop={(e) => handleInputDrop(e)}
      >
        <div className={onDragEnter ? classes.dropInfo : classes.dropInfoOut}>
          {i18n.t("uploads.titles.titleUploadMsgDragDrop")}
        </div>
        {replyingMessage && renderReplyingMessage(replyingMessage)}
        {ticketSendBlocked && (
          <Alert severity="warning" sx={{ width: "100%", borderRadius: 0 }}>
            {i18n.t("messagesInput.recipientRequiresContact")}
          </Alert>
        )}
        <div className={classes.newMessageBox}>
          <Hidden only={["sm", "xs"]}>
            <IconButton
              aria-label="emojiPicker"
              component="span"
              disabled={sendingDisabled}
              onClick={(e) => setShowEmoji((prevState) => !prevState)}
              size="large">
              <Mood className={classes.sendMessageIcons} />
            </IconButton>
            {showEmoji ? (
              <div className={classes.emojiBox}>
                <ClickAwayListener onClickAway={(e) => setShowEmoji(true)}>
                  <Picker
                    perLine={16}
                    theme={"dark"}
                    i18n={i18n}
                    showPreview={true}
                    showSkinTones={false}
                    onSelect={handleAddEmoji}
                  />
                </ClickAwayListener>
              </div>
            ) : null}

            <input
              multiple
              type="file"
              id="upload-button"
              disabled={sendingDisabled}
              className={classes.uploadInput}
              onChange={handleChangeMedias}
            />
            <label htmlFor="upload-button">
              <IconButton
                aria-label="upload"
                component="span"
                disabled={sendingDisabled}
                onMouseOver={() => setOnDragEnter(true)}
                size="large">
                <AttachFile className={classes.sendMessageIcons} />
              </IconButton>
            </label>
            <FormControlLabel
              className={classes.signSwitch}
              label={i18n.t("messagesInput.signMessage")}
              labelPlacement="start"
              control={
                <Switch
                  size="small"
                  checked={signMessage}
                  onChange={(e) => {
                    setSignMessage(e.target.checked);
                  }}
                  name="showAllTickets"
                  color="secondary"
                />
              }
            />
          </Hidden>
          <Hidden only={["md", "lg", "xl"]}>
            <IconButton
              aria-controls="simple-menu"
              aria-haspopup="true"
              onClick={handleOpenMenuClick}
              size="large">
              <MoreVert></MoreVert>
            </IconButton>
            <Menu
              id="simple-menu"
              keepMounted
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuItemClick}
            >
              <MenuItem onClick={handleMenuItemClick}>
                <IconButton
                  aria-label="emojiPicker"
                  component="span"
                  disabled={sendingDisabled}
                  onClick={(e) => setShowEmoji((prevState) => !prevState)}
                  size="large">
                  <Mood className={classes.sendMessageIcons} />
                </IconButton>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick}>
                <input
                  multiple
                  type="file"
                  id="upload-button"
                  disabled={sendingDisabled}
                  className={classes.uploadInput}
                  onChange={handleChangeMedias}
                />
                <label htmlFor="upload-button">
                  <IconButton
                    aria-label="upload"
                    component="span"
                    disabled={sendingDisabled}
                    size="large">
                    <AttachFile className={classes.sendMessageIcons} />
                  </IconButton>
                </label>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick}>
                <FormControlLabel
                  className={classes.signSwitch}
                  label={i18n.t("messagesInput.signMessage")}
                  labelPlacement="start"
                  control={
                    <Switch
                      size="small"
                      checked={signMessage}
                      onChange={(e) => {
                        setSignMessage(e.target.checked);
                      }}
                      name="showAllTickets"
                      color="primary"
                    />
                  }
                />
              </MenuItem>
            </Menu>
          </Hidden>
          <div className={classes.messageInputWrapper}>
            <InputBase
              inputRef={(input) => {
                input && input.focus();
                input && (inputRef.current = input);
              }}
              className={classes.messageInput}
              placeholder={
                ticketStatus === "open"
                  ? i18n.t("messagesInput.placeholderOpen")
                  : i18n.t("messagesInput.placeholderClosed")
              }
              multiline
              maxRows={5}
              value={capitalizeFirstLetter(inputMessage)}
              onChange={handleChangeInput}
              disabled={sendingDisabled}
              onPaste={(e) => {
                ticketStatus === "open" && handleInputPaste(e);
              }}
              onKeyPress={(e) => {
                if (loading || e.shiftKey) return;
                else if (e.key === "Enter") {
                  // Si hay respuestas rápidas visibles, seleccionar la primera en lugar de enviar
                  if (typeBar && quickAnswers.length > 0) {
                    e.preventDefault();
                    handleQuickAnswersClick(quickAnswers[0].message);
                  } else {
                    handleSendMessage();
                  }
                }
              }}
            />
            {typeBar ? (
              <ul className={classes.messageQuickAnswersWrapper}>
                {quickAnswers.map((value, index) => {
                  return (
                    <li
                      className={classes.messageQuickAnswersWrapperItem}
                      key={index}
                    >
                      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                      <a onClick={() => handleQuickAnswersClick(value.message)}>
                        <span className="shortcut">/{value.shortcut}</span>
                        <span className="message">{value.message}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div></div>
            )}
          </div>
          {inputMessage ? (
            <IconButton
              aria-label="sendMessage"
              component="span"
              onClick={handleSendMessage}
              disabled={sendingDisabled}
              size="large">
              <Send className={classes.sendMessageIcons} />
            </IconButton>
          ) : recording ? (
            <div className={classes.recorderWrapper}>
              <IconButton
                aria-label="cancelRecording"
                component="span"
                fontSize="large"
                disabled={loading}
                onClick={handleCancelAudio}
                size="large">
                <HighlightOff className={classes.cancelAudioIcon} />
              </IconButton>
              {loading ? (
                <div>
                  <CircularProgress className={classes.audioLoading} />
                </div>
              ) : (
                <RecordingTimer />
              )}

              <IconButton
                aria-label="sendRecordedAudio"
                component="span"
                onClick={handleUploadAudio}
                disabled={loading}
                size="large">
                <CheckCircleOutline className={classes.sendAudioIcon} />
              </IconButton>
            </div>
          ) : (
            <IconButton
              aria-label="showRecorder"
              component="span"
              disabled={sendingDisabled}
              onClick={handleStartRecording}
              size="large">
              <Mic className={classes.sendMessageIcons} />
            </IconButton>
          )}
        </div>
      </Paper>
    );
  }
};

export default MessageInput;
