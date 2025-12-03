import React, { useEffect, useReducer, useState } from "react";

import openSocket from "../../services/socket-io";

import { 
  AddCircleOutline, 
  DeleteOutline, 
  Edit,
  Schedule 
} from "@mui/icons-material";

import {
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
} from "@mui/material";

import makeStyles from '@mui/styles/makeStyles';

import ConfirmationModal from "../../components/ConfirmationModal";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import QueueModal from "../../components/QueueModal";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";

import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    margin: theme.spacing(1),
    overflowY: "auto",
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    ...theme.scrollbarStyles,
    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(1),
      margin: theme.spacing(0.5),
      borderRadius: 8,
    },
  },
  table: {
    "& .MuiTableHead-root": {
      "& .MuiTableCell-head": {
        fontWeight: 600,
        fontSize: "0.8rem",
        color: theme.palette.text.secondary,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        borderBottom: `2px solid ${theme.palette.divider}`,
        padding: "12px 16px",
        backgroundColor: theme.palette.background.default,
        [theme.breakpoints.down('sm')]: {
          padding: "8px 10px",
          fontSize: "0.7rem",
        },
      },
    },
    "& .MuiTableBody-root": {
      "& .MuiTableRow-root": {
        transition: "background-color 0.2s ease",
        "&:hover": {
          backgroundColor: theme.palette.action.hover,
        },
      },
      "& .MuiTableCell-body": {
        fontSize: "0.875rem",
        padding: "12px 16px",
        borderBottom: `1px solid ${theme.palette.divider}`,
        [theme.breakpoints.down('sm')]: {
          padding: "8px 10px",
          fontSize: "0.75rem",
        },
      },
    },
  },
  idCell: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 24,
    borderRadius: 6,
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.secondary,
    fontSize: "0.75rem",
    fontWeight: 600,
    fontFamily: "monospace",
  },
  queueName: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
    border: "2px solid rgba(255,255,255,0.8)",
  },
  greetingMessage: {
    maxWidth: 280,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
  },
  scheduleInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
    "& .MuiSvgIcon-root": {
      fontSize: "1rem",
      opacity: 0.7,
    },
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "scale(1.1)",
    },
  },
  editButton: {
    color: theme.palette.primary.main,
    "&:hover": {
      backgroundColor: theme.palette.primary.main + "14",
    },
  },
  deleteButton: {
    color: theme.palette.error.main,
    "&:hover": {
      backgroundColor: theme.palette.error.main + "14",
    },
  },
  headerButton: {
    borderRadius: 10,
    padding: "8px 12px",
    minWidth: 44,
    boxShadow: "none",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    },
  },
  noSchedule: {
    color: theme.palette.text.disabled,
    fontSize: "0.8rem",
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_QUEUES") {
    const queues = action.payload;
    const newQueues = [];

    queues.forEach((queue) => {
      const queueIndex = state.findIndex((q) => q.id === queue.id);
      if (queueIndex !== -1) {
        state[queueIndex] = queue;
      } else {
        newQueues.push(queue);
      }
    });

    return [...state, ...newQueues];
  }

  if (action.type === "UPDATE_QUEUES") {
    const queue = action.payload;
    const queueIndex = state.findIndex((u) => u.id === queue.id);

    if (queueIndex !== -1) {
      state[queueIndex] = queue;
      return [...state];
    } else {
      return [queue, ...state];
    }
  }

  if (action.type === "DELETE_QUEUE") {
    const queueId = action.payload;
    const queueIndex = state.findIndex((q) => q.id === queueId);
    if (queueIndex !== -1) {
      state.splice(queueIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Queues = () => {
  const classes = useStyles();

  const [queues, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);

  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/queue");
        dispatch({ type: "LOAD_QUEUES", payload: data });

        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const socket = openSocket();

    socket.on("queue", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUEUES", payload: data.queue });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUEUE", payload: data.queueId });
      }
    });

    return () => {
      socket.off("queue");
    };
  }, []);

  const handleOpenQueueModal = () => {
    setQueueModalOpen(true);
    setSelectedQueue(null);
  };

  const handleCloseQueueModal = () => {
    setQueueModalOpen(false);
    setSelectedQueue(null);
  };

  const handleEditQueue = (queue) => {
    setSelectedQueue(queue);
    setQueueModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedQueue(null);
  };

  const handleDeleteQueue = async (queueId) => {
    try {
      await api.delete(`/queue/${queueId}`);
      toast.success(i18n.t("queues.notifications.queueDeleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedQueue(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          selectedQueue &&
          `${i18n.t("queues.confirmationModal.deleteTitle")} ${
            selectedQueue.name
          }?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteQueue(selectedQueue.id)}
      >
        {i18n.t("queues.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QueueModal
        open={queueModalOpen}
        onClose={handleCloseQueueModal}
        queueId={selectedQueue?.id}
      />
      <MainHeader>
        <Title>{i18n.t("queues.title")} ({queues.length})</Title>
        <MainHeaderButtonsWrapper>
          <Tooltip title={i18n.t("queues.buttons.add")}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenQueueModal}
              className={classes.headerButton}
            >
              <AddCircleOutline />
            </Button>
          </Tooltip>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell align="center">ID</TableCell>
              <TableCell>{i18n.t("queues.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("queues.table.color")}</TableCell>
              <TableCell>{i18n.t("queues.table.greeting")}</TableCell>
              <TableCell align="center">{i18n.t("queues.table.schedule")}</TableCell>
              <TableCell align="center">{i18n.t("queues.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowSkeleton columns={6} />
            ) : (
              queues.map((queue) => (
                <TableRow key={queue.id}>
                  <TableCell align="center">
                    <span className={classes.idCell}>{queue.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className={classes.queueName}>
                      <span
                        className={classes.colorDot}
                        style={{ backgroundColor: queue.color }}
                      />
                      {queue.name}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={queue.color}
                      size="small"
                      style={{ 
                        backgroundColor: queue.color,
                        color: "#fff",
                        fontWeight: 500,
                        fontSize: "0.7rem",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={queue.greetingMessage || "-"} placement="top-start">
                      <Typography className={classes.greetingMessage}>
                        {queue.greetingMessage || "-"}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    {queue.startWork && queue.endWork ? (
                      <div className={classes.scheduleInfo}>
                        <Schedule />
                        <span>{queue.startWork} - {queue.endWork}</span>
                      </div>
                    ) : (
                      <span className={classes.noSchedule}>Sin horario</span>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.editButton}`}
                      onClick={() => handleEditQueue(queue)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>

                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.deleteButton}`}
                      onClick={() => {
                        setSelectedQueue(queue);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Queues;
