import React, { useState, useEffect, useReducer, useContext } from "react";
import openSocket from "../../services/socket-io";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { CSVLink } from "react-csv";

import { makeStyles } from "@material-ui/core/styles";

import {
  Avatar,
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
  DeleteForever,
  DeleteOutline,
  ImportContacts,
  Archive,
  Edit,
  Search,
  WhatsApp
} from "@material-ui/icons";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";

import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal/";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainContainer from "../../components/MainContainer";
import { Can } from "../../components/Can";

import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import NewTicketModalPageContact from "../../components/NewTicketModalPageContact";


const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload;
    const newContacts = [];

    contacts.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;

    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
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
  csvbtn: {
    textDecoration: 'none'
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    border: `2px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("xs")]: {
      width: 32,
      height: 32,
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
  contactName: {
    fontWeight: 500,
    color: theme.palette.text.primary,
  },
  contactNumber: {
    color: theme.palette.text.secondary,
    fontFamily: "monospace",
    fontSize: "0.85rem",
  },
  contactEmail: {
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
      transform: "scale(1.1)",
    },
  },
  whatsappButton: {
    color: "#25D366",
    "&:hover": {
      backgroundColor: "rgba(37, 211, 102, 0.08)",
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
  hideOnMobile: {
    [theme.breakpoints.down("xs")]: {
      display: "none",
    },
  },
  actionsCell: {
    whiteSpace: "nowrap",
    [theme.breakpoints.down("xs")]: {
      "& .MuiIconButton-root": {
        padding: 6,
      },
    },
  },
  mobileNameCell: {
    [theme.breakpoints.down("xs")]: {
      maxWidth: 120,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
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
}));

const Contacts = () => {
  const classes = useStyles();
  const history = useHistory();

  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [deletingAllContact, setDeletingAllContact] = useState(null);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [contactTicket, setContactTicket] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("contact", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
      }
    });

    return () => {
      socket.off("contact");
    };
  }, []);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.id !== undefined) {
      history.push(`/tickets/${ticket.id}`);
    }
  };
  const hadleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleDeleteAllContact = async () => {
    try {
      await api.delete("/contacts");
      toast.success(i18n.t("contacts.toasts.deletedAll"));
      history.go(0);
    } catch (err) {
      toastError(err);
    }
    setDeletingAllContact(null);
    setSearchParam("");
    setPageNumber();
  };

  const handleimportContact = async () => {
    try {
      await api.post("/contacts/import");
      history.go(0);
    } catch (err) {
      toastError(err);
    }
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
    <MainContainer className={classes.mainContainer}>
      <NewTicketModalPageContact
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />
      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
      ></ContactModal>
      <ConfirmationModal
        title={
          deletingContact ? `${i18n.t("contacts.confirmationModal.deleteTitle")} ${deletingContact.name}?`
            : deletingAllContact ? `${i18n.t("contacts.confirmationModal.deleteAllTitle")}`
              : `${i18n.t("contacts.confirmationModal.importTitle")}`
        }
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={(e) =>
          deletingContact ? handleDeleteContact(deletingContact.id)
            : deletingAllContact ? handleDeleteAllContact(deletingAllContact)
              : handleimportContact()
        }
      >
        {
          deletingContact ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
            : deletingAllContact ? `${i18n.t("contacts.confirmationModal.deleteAllMessage")}`
              : `${i18n.t("contacts.confirmationModal.importMessage")}`
        }
      </ConfirmationModal>
      <MainHeader>
        <div className={classes.headerTopRow}>
          <Title>{i18n.t("contacts.title")} ({contacts.length})</Title>
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
                    <Search style={{ color: "inherit", opacity: 0.5, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Can
              role={user.profile}
              perform="drawer-admin-items:view"
              yes={() => (
                <>
                  <Tooltip title={i18n.t("contacts.buttons.import")}>
                    <Button
                      variant="contained"
                      color="primary"
                      className={classes.headerButton}
                      onClick={(e) => setConfirmOpen(true)}
                    >
                      <ImportContacts style={{ fontSize: 20 }} />
                    </Button>
                  </Tooltip>
                </>
              )}
            />
            <Tooltip title={i18n.t("contacts.buttons.add")}>
              <Button
                variant="contained"
                color="primary"
                className={classes.headerButton}
                onClick={handleOpenContactModal}
              >
                <AddCircleOutline style={{ fontSize: 20 }} />
              </Button>
            </Tooltip>
            <Can
              role={user.profile}
              perform="drawer-admin-items:view"
              yes={() => (
                <>
                  <Tooltip title={i18n.t("contacts.buttons.export")}>
                    <CSVLink
                      className={classes.csvbtn}
                      separator=";"
                      filename={'contacts.csv'}
                      data={
                        contacts.map((contact) => ({
                          name: contact.name,
                          number: contact.number,
                          email: contact.email
                        }))
                      }>
                      <Button
                        variant="contained"
                        color="primary"
                        className={classes.headerButton}
                      >
                        <Archive style={{ fontSize: 20 }} />
                      </Button>
                    </CSVLink>
                  </Tooltip>

                  <Tooltip title={i18n.t("contacts.buttons.delete")}>
                    <Button
                      variant="contained"
                      color="primary"
                      className={classes.headerButton}
                      onClick={(e) => {
                        setConfirmOpen(true);
                        setDeletingAllContact(contacts);
                      }}
                    >
                      <DeleteForever style={{ fontSize: 20 }} />
                    </Button>
                  </Tooltip>
                </>
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
              <TableCell padding="checkbox" />
              <TableCell>
                {i18n.t("contacts.table.name")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.whatsapp")}
              </TableCell>
              <TableCell align="center" className={classes.hideOnMobile}>
                {i18n.t("contacts.table.email")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell style={{ paddingRight: 0, width: 50 }}>
                    <Avatar src={contact.profilePicUrl} className={classes.avatar} />
                  </TableCell>
                  <TableCell className={classes.mobileNameCell}>
                    <span className={classes.contactName}>{contact.name}</span>
                  </TableCell>
                  <TableCell align="center">
                    <span className={classes.contactNumber}>{contact.number}</span>
                  </TableCell>
                  <TableCell align="center" className={classes.hideOnMobile}>
                    <span className={classes.contactEmail}>{contact.email || "-"}</span>
                  </TableCell>
                  <TableCell align="center" className={classes.actionsCell}>
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.whatsappButton}`}
                      onClick={() => {
                        setContactTicket(contact);
                        setNewTicketModalOpen(true);
                      }}
                    >
                      <WhatsApp style={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.editButton}`}
                      onClick={() => hadleEditContact(contact.id)}
                    >
                      <Edit style={{ fontSize: 18 }} />
                    </IconButton>
                    <Can
                      role={user.profile}
                      perform="contacts-page:deleteContact"
                      yes={() => (
                        <IconButton
                          size="small"
                          className={`${classes.actionButton} ${classes.deleteButton}`}
                          onClick={(e) => {
                            setConfirmOpen(true);
                            setDeletingContact(contact);
                          }}
                        >
                          <DeleteOutline style={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton avatar columns={3} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Contacts;
