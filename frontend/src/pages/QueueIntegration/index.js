import React, { useState, useEffect, useReducer, useCallback } from "react";
import { toast } from "react-toastify";
import openSocket from "socket.io-client";

import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip
} from "@material-ui/core";

import {
  AddCircleOutline,
  DeleteOutline,
  Edit,
  Search
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import QueueIntegrationModal from "../../components/QueueIntegrationModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";

const reducer = (state, action) => {
  if (action.type === "LOAD_INTEGRATIONS") {
    const integrations = action.payload;
    const newIntegrations = [];

    integrations.forEach((integration) => {
      const integrationIndex = state.findIndex((s) => s.id === integration.id);
      if (integrationIndex !== -1) {
        state[integrationIndex] = integration;
      } else {
        newIntegrations.push(integration);
      }
    });

    return [...state, ...newIntegrations];
  }

  if (action.type === "UPDATE_INTEGRATION") {
    const integration = action.payload;
    const integrationIndex = state.findIndex((s) => s.id === integration.id);

    if (integrationIndex !== -1) {
      state[integrationIndex] = integration;
      return [...state];
    } else {
      return [integration, ...state];
    }
  }

  if (action.type === "DELETE_INTEGRATION") {
    const integrationId = action.payload;

    const integrationIndex = state.findIndex((s) => s.id === integrationId);
    if (integrationIndex !== -1) {
      state.splice(integrationIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

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
    [theme.breakpoints.down("sm")]: {
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
        [theme.breakpoints.down("xs")]: {
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
        [theme.breakpoints.down("xs")]: {
          padding: "8px 10px",
          fontSize: "0.75rem",
        },
      },
    },
  },
  integrationName: {
    fontWeight: 500,
    color: theme.palette.text.primary,
  },
  actionButton: {
    padding: 6,
    marginLeft: 4,
    borderRadius: 8,
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
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
  searchField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: theme.palette.background.paper,
      transition: "all 0.2s ease",
      "&:hover": {
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
      },
      "&.Mui-focused": {
        boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
      },
    },
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      marginBottom: theme.spacing(1),
    },
  },
  addButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 500,
    padding: "8px 16px",
    boxShadow: "0 2px 8px rgba(25, 118, 210, 0.25)",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(25, 118, 210, 0.35)",
    },
    [theme.breakpoints.down("sm")]: {
      width: "100%",
    },
  },
  headerActions: {
    display: "flex",
    gap: theme.spacing(2),
    alignItems: "center",
    flexWrap: "wrap",
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      flexDirection: "column",
    },
  },
}));

const QueueIntegration = () => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [integrations, dispatch] = useReducer(reducer, []);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingIntegration, setDeletingIntegration] = useState(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const { data } = await api.get("/queue-integrations", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_INTEGRATIONS", payload: data.queueIntegrations });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  }, [searchParam, pageNumber]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchIntegrations();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, fetchIntegrations]);

  useEffect(() => {
    const socket = openSocket(process.env.REACT_APP_BACKEND_URL);

    socket.on("queueIntegration", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_INTEGRATION", payload: data.queueIntegration });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_INTEGRATION", payload: +data.integrationId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenIntegrationModal = () => {
    setSelectedIntegration(null);
    setIntegrationModalOpen(true);
  };

  const handleCloseIntegrationModal = () => {
    setSelectedIntegration(null);
    setIntegrationModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditIntegration = (integration) => {
    setSelectedIntegration(integration);
    setIntegrationModalOpen(true);
  };

  const handleDeleteIntegration = async (integrationId) => {
    try {
      await api.delete(`/queue-integrations/${integrationId}`);
      toast.success(i18n.t("queueIntegration.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingIntegration(null);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingIntegration &&
          `${i18n.t("queueIntegration.confirmationModal.deleteTitle")}${deletingIntegration.name}?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteIntegration(deletingIntegration.id)}
      >
        {i18n.t("queueIntegration.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QueueIntegrationModal
        open={integrationModalOpen}
        onClose={handleCloseIntegrationModal}
        reload={fetchIntegrations}
        integrationId={selectedIntegration && selectedIntegration.id}
      />
      <MainHeader>
        <Title>{i18n.t("queueIntegration.title")}</Title>
        <div className={classes.headerActions}>
          <TextField
            placeholder={i18n.t("queueIntegration.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            size="small"
            variant="outlined"
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="disabled" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenIntegrationModal}
            className={classes.addButton}
            startIcon={<AddCircleOutline />}
          >
            {i18n.t("queueIntegration.buttons.add")}
          </Button>
        </div>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell align="center">
                {i18n.t("queueIntegration.table.id")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("queueIntegration.table.name")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("queueIntegration.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {integrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell align="center">{integration.id}</TableCell>
                  <TableCell align="center">
                    <span className={classes.integrationName}>
                      {integration.name}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={i18n.t("queueIntegration.buttons.edit")}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditIntegration(integration)}
                        className={`${classes.actionButton} ${classes.editButton}`}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={i18n.t("queueIntegration.buttons.delete")}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setConfirmModalOpen(true);
                          setDeletingIntegration(integration);
                        }}
                        className={`${classes.actionButton} ${classes.deleteButton}`}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={3} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default QueueIntegration;
