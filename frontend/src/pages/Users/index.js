import React, { useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";

import {
  Avatar,
  Button,
  Chip,
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
  Search,
  Schedule,
  WhatsApp
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import UserModal from "../../components/UserModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

const reducer = (state, action) => {
  if (action.type === "LOAD_USERS") {
    const users = action.payload;
    const newUsers = [];

    users.forEach((user) => {
      const userIndex = state.findIndex((u) => u.id === user.id);
      if (userIndex !== -1) {
        state[userIndex] = user;
      } else {
        newUsers.push(user);
      }
    });

    return [...state, ...newUsers];
  }

  if (action.type === "UPDATE_USERS") {
    const user = action.payload;
    const userIndex = state.findIndex((u) => u.id === user.id);

    if (userIndex !== -1) {
      state[userIndex] = user;
      return [...state];
    } else {
      return [user, ...state];
    }
  }

  if (action.type === "DELETE_USER") {
    const userId = action.payload;

    const userIndex = state.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      state.splice(userIndex, 1);
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.palette.primary.main,
    fontWeight: 600,
    fontSize: "1rem",
    [theme.breakpoints.down("xs")]: {
      width: 32,
      height: 32,
      fontSize: "0.8rem",
      borderRadius: 8,
    },
  },
  userName: {
    fontWeight: 600,
    color: theme.palette.text.primary,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userEmail: {
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
  },
  profileChip: {
    height: 24,
    fontSize: "0.72rem",
    fontWeight: 600,
    borderRadius: 6,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  adminChip: {
    backgroundColor: theme.palette.primary.main + "18",
    color: theme.palette.primary.main,
    border: `1px solid ${theme.palette.primary.main}40`,
  },
  userChip: {
    backgroundColor: theme.palette.success.main + "18",
    color: theme.palette.success.main,
    border: `1px solid ${theme.palette.success.main}40`,
  },
  whatsappChip: {
    height: 24,
    fontSize: "0.72rem",
    fontWeight: 500,
    borderRadius: 6,
    backgroundColor: "#25D36618",
    color: "#25D366",
    border: "1px solid #25D36640",
    "& .MuiChip-icon": {
      color: "#25D366",
      fontSize: "0.9rem",
    },
  },
  scheduleInfo: {
    display: "flex",
    alignItems: "center",
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
  searchField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: theme.palette.background.paper,
      "& fieldset": {
        borderColor: theme.palette.divider,
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary.main,
      },
    },
    "& .MuiInputBase-input": {
      padding: "10px 14px",
      fontSize: "0.875rem",
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
    [theme.breakpoints.down("xs")]: {
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
    [theme.breakpoints.down("xs")]: {
      gap: 6,
    },
  },
  headerButtons: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    [theme.breakpoints.down("xs")]: {
      gap: 4,
    },
  },
  searchRow: {
    display: "none",
    [theme.breakpoints.down("xs")]: {
      display: "flex",
      width: "100%",
      justifyContent: "center",
    },
  },
  searchFieldMobile: {
    width: "100%",
    maxWidth: 400,
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: theme.palette.background.paper,
      "& fieldset": {
        borderColor: theme.palette.divider,
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary.main,
      },
    },
    "& .MuiInputBase-input": {
      padding: "10px 14px",
      fontSize: "0.875rem",
    },
  },
  hideOnMobileSearch: {
    [theme.breakpoints.down("xs")]: {
      display: "none",
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
}));

const Users = () => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [users, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchUsers = async () => {
        try {
          const { data } = await api.get("/users/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_USERS", payload: data.users });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("user", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_USERS", payload: data.user });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_USER", payload: +data.userId });
      }
    });

    return () => {
      socket.off("user");
    };
  }, []);

  const handleOpenUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      toast.success(i18n.t("users.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingUser(null);
    setSearchParam("");
    setPageNumber(1);
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
          deletingUser &&
          `${i18n.t("users.confirmationModal.deleteTitle")} ${deletingUser.name
          }?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteUser(deletingUser.id)}
      >
        {i18n.t("users.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <UserModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        aria-labelledby="form-dialog-title"
        userId={selectedUser && selectedUser.id}
      />
      <MainHeader>
        <div className={classes.headerTopRow}>
          <Title>{i18n.t("users.title")} ({users.length})</Title>
          <div className={classes.headerButtons}>
            <TextField
              placeholder={i18n.t("contacts.searchPlaceholder")}
              type="search"
              value={searchParam}
              onChange={handleSearch}
              variant="outlined"
              size="small"
              className={`${classes.searchField} ${classes.hideOnMobileSearch}`}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search style={{ color: "#999", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title={i18n.t("users.buttons.add")}>
              <Button
                variant="contained"
                color="primary"
                className={classes.headerButton}
                onClick={handleOpenUserModal}
              >
                <AddCircleOutline style={{ fontSize: 20 }} />
              </Button>
            </Tooltip>
          </div>
        </div>
        <div className={classes.searchRow}>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            variant="outlined"
            size="small"
            className={classes.searchFieldMobile}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search style={{ color: "#999", fontSize: 20 }} />
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
              <TableCell align="center">{i18n.t("users.table.id")}</TableCell>
              <TableCell>{i18n.t("users.table.name")}</TableCell>
              <TableCell align="center">
                {i18n.t("users.table.email")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("users.table.profile")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("users.table.whatsapp")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("users.table.startWork")} / {i18n.t("users.table.endWork")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("users.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell align="center">
                    <span className={classes.idCell}>{user.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className={classes.userName}>
                      <Avatar className={classes.avatar}>
                        {user.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <span className={classes.userEmail}>{user.email}</span>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={user.profile}
                      className={`${classes.profileChip} ${
                        user.profile === "admin" ? classes.adminChip : classes.userChip
                      }`}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {user.whatsapp?.name ? (
                      <Chip
                        size="small"
                        icon={<WhatsApp />}
                        label={user.whatsapp.name}
                        className={classes.whatsappChip}
                      />
                    ) : (
                      <span style={{ color: "#999", fontSize: "0.8rem" }}>-</span>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {user.startWork || user.endWork ? (
                      <div className={classes.scheduleInfo}>
                        <Schedule />
                        {user.startWork || "--:--"} - {user.endWork || "--:--"}
                      </div>
                    ) : (
                      <span style={{ color: "#999", fontSize: "0.8rem" }}>-</span>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.editButton}`}
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit style={{ fontSize: 20 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.deleteButton}`}
                      onClick={(e) => {
                        setConfirmModalOpen(true);
                        setDeletingUser(user);
                      }}
                    >
                      <DeleteOutline style={{ fontSize: 20 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={7} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Users;