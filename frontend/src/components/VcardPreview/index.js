import React, { useEffect, useState } from 'react';
import { useHistory } from "react-router-dom";
import toastError from "../../errors/toastError";
import api from "../../services/api";

import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";

import { Button, makeStyles } from "@material-ui/core";
import { Person } from "@material-ui/icons";
import NewTicketModalPageContact from "../../components/NewTicketModalPageContact";

const useStyles = makeStyles((theme) => ({
    vcardContainer: {
        minWidth: 220,
        maxWidth: 280,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
    },
    avatarWrapper: {
        width: 56,
        height: 56,
        borderRadius: "50%",
        backgroundColor: theme.palette.grey[200],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatar: {
        width: 56,
        height: 56,
    },
    fallbackIcon: {
        fontSize: 32,
        color: theme.palette.grey[500],
    },
    contactInfo: {
        textAlign: "center",
        width: "100%",
    },
    contactName: {
        fontSize: "0.9rem",
        fontWeight: 600,
        color: theme.palette.text.primary,
        marginBottom: 2,
        wordBreak: "break-word",
    },
    contactNumber: {
        fontSize: "0.8rem",
        color: theme.palette.primary.main,
        fontWeight: 500,
    },
    divider: {
        width: "100%",
        height: 1,
        backgroundColor: theme.palette.divider,
        margin: "4px 0",
    },
    conversarButton: {
        textTransform: "none",
        fontWeight: 600,
        fontSize: "0.85rem",
        borderRadius: 8,
        padding: "6px 16px",
        width: "100%",
        color: theme.palette.primary.main,
        "&:hover": {
            backgroundColor: theme.palette.primary.light + "20",
        },
    },
}));


const VcardPreview = ({ contact, numbers }) => {
    const classes = useStyles();
    const history = useHistory();

    const [selectedContact, setContact] = useState({
        name: "",
        number: 0,
        profilePicUrl: ""
    });
    const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            const fetchContacts = async () => {
                try {
                    let contactObj = {
                        name: contact,
                        number: numbers.replace(/\D/g, ""),
                        email: ""
                    }
                    const { data } = await api.post("/contact", contactObj);
                    setContact(data)

                } catch (err) {
                    console.log(err)
                    toastError(err);
                }
            };
            fetchContacts();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [contact, numbers]);

    // const handleNewChat = async () => {
    //     try {
    //         const { data: ticket } = await api.post("/tickets", {
    //             contactId: selectedContact.id,
    //             userId: user.id,
    //             status: "open",
    //         });
    //         history.push(`/tickets/${ticket.id}`);
    //     } catch (err) {
    //         toastError(err);
    //     }
    // }

    const handleCloseOrOpenTicket = (ticket) => {
        setNewTicketModalOpen(false);
        if (ticket !== undefined && ticket.id !== undefined) {
            history.push(`/tickets/${ticket.id}`);
        }
    };

    return (
        <>
            <NewTicketModalPageContact
                modalOpen={newTicketModalOpen}
                initialContact={selectedContact}
                onClose={(ticket) => {
                    handleCloseOrOpenTicket(ticket);
                }}
            />
            <div className={classes.vcardContainer}>
                <div className={classes.avatarWrapper}>
                    {selectedContact.profilePicUrl ? (
                        <Avatar 
                            src={selectedContact.profilePicUrl} 
                            className={classes.avatar}
                        />
                    ) : (
                        <Person className={classes.fallbackIcon} />
                    )}
                </div>
                <div className={classes.contactInfo}>
                    <Typography className={classes.contactName}>
                        {selectedContact.name}
                    </Typography>
                    <Typography className={classes.contactNumber}>
                        {selectedContact.number}
                    </Typography>
                </div>
                <div className={classes.divider} />
                <Button
                    className={classes.conversarButton}
                    onClick={() => setNewTicketModalOpen(true)}
                    disabled={!selectedContact.number}
                >
                    Conversar
                </Button>
            </div>
        </>
    );
};

export default VcardPreview;