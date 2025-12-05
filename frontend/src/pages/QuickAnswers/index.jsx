import React, { useContext, useState, useEffect, useReducer } from "react";
import openSocket from "../../services/socket-io";
import { useHistory } from "react-router-dom";

import {
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import {
  AddCircleOutline,
  DeleteForever,
  DeleteOutline,
  Edit,
  Search
} from "@mui/icons-material";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import QuickAnswersModal from "../../components/QuickAnswersModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { Can } from "../../components/Can"
import { AuthContext } from "../../context/Auth/AuthContext";

import { toast } from "react-toastify";
import toastError from "../../errors/toastError";

const reducer = (state, action) => {
  if (action.type === "LOAD_QUICK_ANSWERS") {
    const quickAnswers = action.payload;
    const newQuickAnswers = [];

    quickAnswers.forEach((quickAnswer) => {
      const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswer.id);
      if (quickAnswerIndex !== -1) {
        state[quickAnswerIndex] = quickAnswer;
      } else {
        newQuickAnswers.push(quickAnswer);
      }
    });

    return [...state, ...newQuickAnswers];
  }

  if (action.type === "UPDATE_QUICK_ANSWERS") {
    const quickAnswer = action.payload;
    const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswer.id);

    if (quickAnswerIndex !== -1) {
      state[quickAnswerIndex] = quickAnswer;
      return [...state];
    } else {
      return [quickAnswer, ...state];
    }
  }

  if (action.type === "DELETE_QUICK_ANSWERS") {
    const quickAnswerId = action.payload;

    const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswerId);
    if (quickAnswerIndex !== -1) {
      state.splice(quickAnswerIndex, 1);
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
    padding: theme.spacing(2.5),
    margin: theme.spacing(1.5),
    overflowY: "auto",
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
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
        padding: "12px 14px",
        backgroundColor: theme.palette.background.paper,
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
        "&:nth-of-type(even)": {
          backgroundColor: theme.palette.action.selected,
        },
      },
      "& .MuiTableCell-body": {
        fontSize: "0.875rem",
        padding: "12px 14px",
        borderBottom: `1px solid ${theme.palette.divider}`,
        [theme.breakpoints.down('sm')]: {
          padding: "8px 10px",
          fontSize: "0.75rem",
        },
      },
    },
  },
  shortcutCell: {
    fontWeight: 600,
    color: theme.palette.primary.main,
    fontFamily: "monospace",
    fontSize: "0.9rem",
    backgroundColor: theme.palette.mode === "dark"
      ? theme.palette.primary.main + "1F"
      : theme.palette.primary.main + "14",
    padding: "6px 12px",
    borderRadius: 6,
    display: "inline-block",
  },
  messageCell: {
    color: theme.palette.text.secondary,
    maxWidth: 400,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
  actionsCell: {
    whiteSpace: "nowrap",
    [theme.breakpoints.down('sm')]: {
      "& .MuiIconButton-root": {
        padding: 6,
      },
    },
  },
  searchField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      backgroundColor: theme.palette.background.paper,
      "& fieldset": {
        borderColor: theme.palette.divider,
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary.main,
      },
    },
    "& .MuiInputBase-input": {
      padding: "12px 14px",
      fontSize: "0.875rem",
    },
  },
  headerButton: {
    borderRadius: 12,
    padding: "10px 12px",
    minWidth: 44,
    boxShadow: "none",
    "&:hover": {
      boxShadow: `0 10px 24px ${theme.palette.action.hover}`,
    },
    [theme.breakpoints.down('sm')]: {
      padding: "6px 10px",
      minWidth: 38,
    },
  },
  headerTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
    [theme.breakpoints.down('sm')]: {
      gap: 6,
    },
  },
  headerButtons: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    [theme.breakpoints.down('sm')]: {
      gap: 4,
    },
  },
  searchRow: {
    display: "none",
    [theme.breakpoints.down('sm')]: {
      display: "flex",
      width: "100%",
      justifyContent: "center",
    },
  },
  searchFieldMobile: {
    width: "100%",
    maxWidth: 400,
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      backgroundColor: theme.palette.background.paper,
      "& fieldset": {
        borderColor: theme.palette.divider,
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary.main,
      },
    },
    "& .MuiInputBase-input": {
      padding: "12px 14px",
      fontSize: "0.875rem",
    },
  },
  hideOnMobileSearch: {
    [theme.breakpoints.down('sm')]: {
      display: "none",
    },
  },
}));

const QuickAnswers = () => {
  const classes = useStyles();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [quickAnswers, dispatch] = useReducer(reducer, []);
  const [selectedQuickAnswers, setSelectedQuickAnswers] = useState(null);
  const [quickAnswersModalOpen, setQuickAnswersModalOpen] = useState(false);
  const [deletingQuickAnswers, setDeletingQuickAnswers] = useState(null);
  const [deletingAllQuickAnswers, setDeletingAllQuickAnswers] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchQuickAnswers = async () => {
        try {
          const { data } = await api.get("/quickAnswers/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_QUICK_ANSWERS", payload: data.quickAnswers });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchQuickAnswers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("quickAnswer", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUICK_ANSWERS", payload: data.quickAnswer });
      }

      if (data.action === "delete") {
        dispatch({
          type: "DELETE_QUICK_ANSWERS",
          payload: +data.quickAnswerId,
        });
      }
    });

    return () => {
      socket.off("quickAnswer");
    };
  }, []);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenQuickAnswersModal = () => {
    setSelectedQuickAnswers(null);
    setQuickAnswersModalOpen(true);
  };

  const handleCloseQuickAnswersModal = () => {
    setSelectedQuickAnswers(null);
    setQuickAnswersModalOpen(false);
  };

  const handleEditQuickAnswers = (quickAnswer) => {
    setSelectedQuickAnswers(quickAnswer);
    setQuickAnswersModalOpen(true);
  };

  const handleDeleteQuickAnswers = async (quickAnswerId) => {
    try {
      await api.delete(`/quickAnswers/${quickAnswerId}`);
      toast.success(i18n.t("quickAnswers.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingQuickAnswers(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleDeleteAllQuickAnswers = async () => {
    try {
      await api.delete("/quickAnswers");
      toast.success(i18n.t("quickAnswers.toasts.deletedAll"));
      history.go(0);
    } catch (err) {
      toastError(err);
    }
    setDeletingAllQuickAnswers(null);
    setSearchParam("");
    setPageNumber();
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
          deletingQuickAnswers ? `${i18n.t("quickAnswers.confirmationModal.deleteTitle")} ${deletingQuickAnswers.shortcut}?`
            : `${i18n.t("quickAnswers.confirmationModal.deleteAllTitle")}`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() =>
          deletingQuickAnswers ? handleDeleteQuickAnswers(deletingQuickAnswers.id)
            : handleDeleteAllQuickAnswers(deletingAllQuickAnswers)
        }
      >
        {
          deletingQuickAnswers ? `${i18n.t("quickAnswers.confirmationModal.deleteMessage")}`
            : `${i18n.t("quickAnswers.confirmationModal.deleteAllMessage")}`
        }
      </ConfirmationModal>
      <QuickAnswersModal
        open={quickAnswersModalOpen}
        onClose={handleCloseQuickAnswersModal}
        aria-labelledby="form-dialog-title"
        quickAnswerId={selectedQuickAnswers && selectedQuickAnswers.id}
      ></QuickAnswersModal>
      <MainHeader>
        <div className={classes.headerTopRow}>
          <Title>{i18n.t("quickAnswers.title")} ({quickAnswers.length})</Title>
          <div className={classes.headerButtons}>
            <TextField
              placeholder={i18n.t("quickAnswers.searchPlaceholder")}
              type="search"
              value={searchParam}
              onChange={handleSearch}
              variant="outlined"
              size="small"
              className={`${classes.searchField} ${classes.hideOnMobileSearch}`}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search style={{ color: "inherit", opacity: 0.5, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title={i18n.t("quickAnswers.buttons.add")}>
              <Button
                variant="contained"
                color="primary"
                className={classes.headerButton}
                onClick={handleOpenQuickAnswersModal}
              >
                <AddCircleOutline style={{ fontSize: 20 }} />
              </Button>
            </Tooltip>

            <Can
              role={user.profile}
              perform="drawer-admin-items:view"
              yes={() => (
                <Tooltip title={i18n.t("quickAnswers.buttons.deleteAll")}>
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.headerButton}
                    onClick={(e) => {
                      setConfirmModalOpen(true);
                      setDeletingAllQuickAnswers(quickAnswers);
                    }}
                  >
                    <DeleteForever style={{ fontSize: 20 }} />
                  </Button>
                </Tooltip>
              )}
            />
          </div>
        </div>
        <div className={classes.searchRow}>
          <TextField
            placeholder={i18n.t("quickAnswers.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            variant="outlined"
            size="small"
            className={classes.searchFieldMobile}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search style={{ color: "inherit", opacity: 0.5, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
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
              <TableCell align="left">
                {i18n.t("quickAnswers.table.shortcut")}
              </TableCell>
              <TableCell align="left">
                {i18n.t("quickAnswers.table.message")}
              </TableCell>
              <TableCell align="center" className={classes.actionsCell}>
                {i18n.t("quickAnswers.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {quickAnswers.map((quickAnswer) => (
                <TableRow key={quickAnswer.id}>
                  <TableCell align="left">
                    <span className={classes.shortcutCell}>{quickAnswer.shortcut}</span>
                  </TableCell>
                  <TableCell align="left">
                    <span className={classes.messageCell}>{quickAnswer.message}</span>
                  </TableCell>
                  <TableCell align="center" className={classes.actionsCell}>
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.editButton}`}
                      onClick={() => handleEditQuickAnswers(quickAnswer)}
                    >
                      <Edit style={{ fontSize: 20 }} />
                    </IconButton>

                    <Can
                      role={user.profile}
                      perform="drawer-admin-items:view"
                      yes={() => (
                        <IconButton
                          size="small"
                          className={`${classes.actionButton} ${classes.deleteButton}`}
                          onClick={(e) => {
                            setConfirmModalOpen(true);
                            setDeletingQuickAnswers(quickAnswer);
                          }}
                        >
                          <DeleteOutline style={{ fontSize: 20 }} />
                        </IconButton>
                      )}
                    />


                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={3} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer >
  );
};

export default QuickAnswers;
