import React, { useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import {
  Avatar,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  EmailOutlined,
  Person,
  PhoneOutlined,
} from "@mui/icons-material";
import makeStyles from "@mui/styles/makeStyles";

import NewTicketModalPageContact from "../NewTicketModalPageContact";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
  container: {
    width: "min(360px, 100%)",
    minWidth: 260,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "6px 0",
  },
  title: {
    color: theme.palette.text.secondary,
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    padding: "0 4px",
  },
  card: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: theme.palette.background.paper,
  },
  contactHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    backgroundColor: theme.palette.action.hover,
  },
  avatar: {
    width: 42,
    height: 42,
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[600],
  },
  contactName: {
    minWidth: 0,
    color: theme.palette.text.primary,
    fontSize: "0.9rem",
    fontWeight: 600,
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  contactMeta: {
    color: theme.palette.text.secondary,
    fontSize: "0.72rem",
    marginTop: 2,
  },
  methods: {
    display: "flex",
    flexDirection: "column",
  },
  methodRow: {
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "7px 10px",
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  methodIcon: {
    color: theme.palette.text.secondary,
    fontSize: 19,
    flexShrink: 0,
  },
  methodInfo: {
    minWidth: 0,
    flex: 1,
  },
  methodValue: {
    color: theme.palette.text.primary,
    fontSize: "0.82rem",
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },
  methodType: {
    color: theme.palette.text.secondary,
    fontSize: "0.68rem",
    lineHeight: 1.2,
    textTransform: "capitalize",
  },
  chatButton: {
    minWidth: 84,
    padding: "4px 8px",
    borderRadius: 7,
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "none",
  },
  empty: {
    color: theme.palette.text.secondary,
    fontSize: "0.78rem",
    padding: "11px 12px",
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

const normalizeContacts = (contacts, legacyContact, legacyNumber) => {
  if (Array.isArray(contacts) && contacts.length) return contacts;

  return [
    {
      name: legacyContact || "Contacto",
      phones: legacyNumber
        ? [
            {
              value: legacyNumber,
              normalized: String(legacyNumber).replace(/\D/g, ""),
              type: "",
            },
          ]
        : [],
      emails: [],
    },
  ];
};

const VcardPreview = ({ contacts, contact, numbers }) => {
  const classes = useStyles();
  const history = useHistory();
  const parsedContacts = useMemo(
    () => normalizeContacts(contacts, contact, numbers),
    [contacts, contact, numbers]
  );
  const [selectedContact, setSelectedContact] = useState();
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState("");

  const handleOpenChat = async (sharedContact, phone, phoneKey) => {
    const normalizedNumber =
      phone.normalized || String(phone.value || "").replace(/\D/g, "");
    if (normalizedNumber.length < 6) return;

    setLoadingPhone(phoneKey);
    try {
      const { data } = await api.post("/contact", {
        name: sharedContact.name || "Contacto",
        number: normalizedNumber,
        email: sharedContact.emails?.[0]?.value || "",
      });
      setSelectedContact(data);
      setNewTicketModalOpen(true);
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingPhone("");
    }
  };

  const handleCloseOrOpenTicket = ticket => {
    setNewTicketModalOpen(false);
    if (ticket?.id !== undefined) {
      history.push(`/tickets/${ticket.id}`);
    }
  };

  return (
    <>
      {selectedContact && (
        <NewTicketModalPageContact
          modalOpen={newTicketModalOpen}
          initialContact={selectedContact}
          onClose={handleCloseOrOpenTicket}
        />
      )}

      <div className={classes.container}>
        <Typography className={classes.title}>
          {parsedContacts.length === 1
            ? "Contacto compartido"
            : `${parsedContacts.length} contactos compartidos`}
        </Typography>

        {parsedContacts.map((sharedContact, contactIndex) => {
          const phones = sharedContact.phones || [];
          const emails = sharedContact.emails || [];
          const methodCount = phones.length + emails.length;

          return (
            <div
              className={classes.card}
              key={`${sharedContact.name}-${contactIndex}`}
            >
              <div className={classes.contactHeader}>
                <Avatar className={classes.avatar}>
                  <Person />
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Typography className={classes.contactName}>
                    {sharedContact.name || "Contacto"}
                  </Typography>
                  <Typography className={classes.contactMeta}>
                    {methodCount
                      ? `${phones.length} teléfono(s) · ${emails.length} email(s)`
                      : "Sin datos de contacto"}
                  </Typography>
                </div>
              </div>

              <div className={classes.methods}>
                {phones.map((phone, phoneIndex) => {
                  const phoneKey = `${contactIndex}-${phoneIndex}`;
                  const normalizedNumber =
                    phone.normalized ||
                    String(phone.value || "").replace(/\D/g, "");
                  const canChat = normalizedNumber.length >= 6;

                  return (
                    <div className={classes.methodRow} key={phoneKey}>
                      <PhoneOutlined className={classes.methodIcon} />
                      <div className={classes.methodInfo}>
                        <Typography className={classes.methodValue}>
                          {phone.value}
                        </Typography>
                        {phone.type && (
                          <Typography className={classes.methodType}>
                            {phone.type}
                          </Typography>
                        )}
                      </div>
                      <Button
                        className={classes.chatButton}
                        color="primary"
                        size="small"
                        variant="outlined"
                        disabled={!canChat || Boolean(loadingPhone)}
                        onClick={() =>
                          handleOpenChat(sharedContact, phone, phoneKey)
                        }
                      >
                        {loadingPhone === phoneKey ? (
                          <CircularProgress size={16} />
                        ) : (
                          "Conversar"
                        )}
                      </Button>
                    </div>
                  );
                })}

                {emails.map((email, emailIndex) => (
                  <div
                    className={classes.methodRow}
                    key={`email-${contactIndex}-${emailIndex}`}
                  >
                    <EmailOutlined className={classes.methodIcon} />
                    <div className={classes.methodInfo}>
                      <Typography className={classes.methodValue}>
                        {email.value}
                      </Typography>
                      {email.type && (
                        <Typography className={classes.methodType}>
                          {email.type}
                        </Typography>
                      )}
                    </div>
                  </div>
                ))}

                {!methodCount && (
                  <Typography className={classes.empty}>
                    Este contacto no incluye teléfono ni email.
                  </Typography>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default VcardPreview;
