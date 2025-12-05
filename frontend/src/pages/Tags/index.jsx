import React, { useContext, useState, useEffect, useReducer, useCallback } from "react";
import { toast } from "react-toastify";
import openSocket from "socket.io-client";

import makeStyles from '@mui/styles/makeStyles';
import { CSVLink } from "react-csv";
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
} from "@mui/material";

import {
  AddCircleOutline,
  DeleteForever,
  DeleteOutline,
  Archive,
  Edit,
  Search
} from "@mui/icons-material";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import TagModal from "../../components/TagModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { Can } from "../../components/Can"
import { AuthContext } from "../../context/Auth/AuthContext";


const reducer = (state, action) => {
  if (action.type === "LOAD_TAGS") {
    const tags = action.payload;
    const newTags = [];

    tags.forEach((tag) => {
      const tagIndex = state.findIndex((s) => s.id === tag.id);
      if (tagIndex !== -1) {
        state[tagIndex] = tag;
      } else {
        newTags.push(tag);
      }
    });

    return [...state, ...newTags];
  }

  if (action.type === "UPDATE_TAGS") {
    const tag = action.payload;
    const tagIndex = state.findIndex((s) => s.id === tag.id);

    if (tagIndex !== -1) {
      state[tagIndex] = tag;
      return [...state];
    } else {
      return [tag, ...state];
    }
  }

  if (action.type === "DELETE_TAG") {
    const tagId = action.payload;

    const tagIndex = state.findIndex((s) => s.id === tagId);
    if (tagIndex !== -1) {
      state.splice(tagIndex, 1);
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
  csvbtn: {
    textDecoration: 'none'
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
  tagName: {
    fontWeight: 500,
    color: theme.palette.text.primary,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "inline-block",
    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
    border: `2px solid ${theme.palette.background.paper}`,
  },
  contactsBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.palette.mode === "dark"
      ? theme.palette.primary.main + "26"
      : theme.palette.primary.main + "14",
    color: theme.palette.primary.main,
    fontWeight: 700,
    fontSize: "0.78rem",
    padding: "0 10px",
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 10,
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
    color: theme.palette.secondary.main,
    "&:hover": {
      backgroundColor: theme.palette.secondary.main + "14",
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
        borderColor: theme.palette.primary.light,
      },
      "&.Mui-focused fieldset": {
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
    minWidth: 44,
    height: 44,
    boxShadow: "none",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: `0 10px 24px ${theme.palette.action.hover}`,
    },
    [theme.breakpoints.down('sm')]: {
      minWidth: 38,
      height: 38,
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
  actionsCell: {
    whiteSpace: "nowrap",
    [theme.breakpoints.down('sm')]: {
      "& .MuiIconButton-root": {
        padding: 6,
      },
    },
  },
}));

const Tags = () => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [deletingTag, setDeletingTag] = useState(null);
  const [deletingAllTags, setDeletingAllTags] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [tags, dispatch] = useReducer(reducer, []);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const { user } = useContext(AuthContext);

  const fetchTags = useCallback(async () => {
    try {
      const { data } = await api.get("/tags/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_TAGS", payload: data.tags });
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
      fetchTags();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, fetchTags]);

  useEffect(() => {
    const socket = openSocket();
    if (socket) {
      socket.on("tags", (data) => {
        if (data.action === "update" || data.action === "create") {
          dispatch({ type: "UPDATE_TAGS", payload: data.tags });
        }

        if (data.action === "delete") {
          dispatch({ type: "DELETE_TAGS", payload: +data.tagId });
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("tags");
      }
    };
  }, []);

  const handleOpenTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(true);
  };

  const handleCloseTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditTag = (tag) => {
    setSelectedTag(tag);
    setTagModalOpen(true);
  };

  const handleDeleteTag = async (tagId) => {
    try {
      await api.delete(`/tags/${tagId}`);
      toast.success(i18n.t("tags.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingTag(null);
    setSearchParam("");
    setPageNumber(1);

    dispatch({ type: "RESET" });
    setPageNumber(1);
    await fetchTags();
  };

  const handleDeleteAllTags = async () => {
    try {
      await api.delete(`/tags`);
      toast.success(i18n.t("tags.toasts.deletedAll"));
    } catch (err) {
      toastError(err);
    }
    setDeletingAllTags(null);
    setSearchParam("");
    setPageNumber();

    dispatch({ type: "RESET" });
    setPageNumber(1);
    await fetchTags();
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
          deletingTag ? `${i18n.t("tags.confirmationModal.deleteTitle")}`
            : `${i18n.t("tags.confirmationModal.deleteAllTitle")}`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() =>
          deletingTag ? handleDeleteTag(deletingTag.id)
            : handleDeleteAllTags(deletingAllTags)
        }
      >
        {
          deletingTag ? `${i18n.t("tags.confirmationModal.deleteMessage")}`
            : `${i18n.t("tags.confirmationModal.deleteAllMessage")}`
        }
      </ConfirmationModal>
      <TagModal
        open={tagModalOpen}
        onClose={handleCloseTagModal}
        reload={fetchTags}
        aria-labelledby="form-dialog-title"
        tagId={selectedTag && selectedTag.id}
      />
      <MainHeader>
        <div className={classes.headerTopRow}>
          <Title>{i18n.t("tags.title")} ({tags.length})</Title>
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
                    <Search style={{ color: "inherit", opacity: 0.5 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title={i18n.t("tags.buttons.add")}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenTagModal}
                className={classes.headerButton}
              >
                <AddCircleOutline />
              </Button>
            </Tooltip>

            <Can
              role={user.profile}
              perform="drawer-admin-items:view"
              yes={() => (
                <CSVLink
                  className={classes.csvbtn}
                  separator=";"
                  filename="mkthub-contacts.csv"
                  data={tags.flatMap((tag) => tag.contacts.map((contact) => ({
                    tagName: tag.name,
                    contactName: contact.name,
                    contactNumber: contact.number
                  })))}>
                  <Tooltip title={i18n.t("tags.buttons.download")}>
                    <Button
                      variant="contained"
                      color="primary"
                      className={classes.headerButton}
                    >
                      <Archive />
                    </Button>
                  </Tooltip>
                </CSVLink>
              )}
            />

            <Can
              role={user.profile}
              perform="drawer-admin-items:view"
              yes={() => (
                <Tooltip title={i18n.t("tags.buttons.deleteAll")}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={(e) => {
                      setConfirmModalOpen(true);
                      setDeletingAllTags(tags);
                    }}
                    className={classes.headerButton}
                  >
                    <DeleteForever />
                  </Button>
                </Tooltip>
              )}
            />
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
                  <Search style={{ color: "inherit", opacity: 0.5 }} />
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
              <TableCell align="center">{i18n.t("tags.table.id")}</TableCell>
              <TableCell align="center">{i18n.t("tags.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("tags.table.color")}</TableCell>
              <TableCell align="center">{i18n.t("tags.table.contacts")}</TableCell>
              <TableCell align="center" className={classes.actionsCell}>{i18n.t("tags.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell align="center">
                    {tag.id}
                  </TableCell>
                  <TableCell align="center">
                    <span className={classes.tagName}>{tag.name}</span>
                  </TableCell>
                  <TableCell align="center">
                    <span
                      className={classes.colorCircle}
                      style={{ backgroundColor: tag.color }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <span className={classes.contactsBadge}>
                      {tag.contacttag.length || 0}
                    </span>
                  </TableCell>
                  <TableCell align="center" className={classes.actionsCell}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditTag(tag)}
                      className={`${classes.actionButton} ${classes.editButton}`}
                    >
                      <Edit fontSize="small" />
                    </IconButton>

                    <Can
                      role={user.profile}
                      perform="drawer-admin-items:view"
                      yes={() => (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setConfirmModalOpen(true);
                            setDeletingTag(tag);
                          }}
                          className={`${classes.actionButton} ${classes.deleteButton}`}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={4} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Tags;
