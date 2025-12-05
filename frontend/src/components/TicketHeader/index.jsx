import React from "react";

import { Card } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import TicketHeaderSkeleton from "../TicketHeaderSkeleton";
import ArrowBackIos from "@mui/icons-material/ArrowBackIos";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  ticketHeader: {
    display: "flex",
    alignItems: "center",
    backgroundColor: theme.palette.background.default,
    flex: "none",
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: "8px 16px",
    gap: 12,
    minHeight: 64,
    [theme.breakpoints.down('md')]: {
      padding: "8px 12px",
      minHeight: 56,
      gap: 8,
    },
    [theme.breakpoints.down('sm')]: {
      padding: "6px 8px",
      minHeight: 52,
      gap: 6,
    },
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 12,
    [theme.breakpoints.down('md')]: {
      gap: 8,
    },
    [theme.breakpoints.down('sm')]: {
      gap: 6,
    },
  },
  backButton: {
    backgroundColor: theme.palette.success.main,
    padding: 6,
    paddingLeft: 10,
    color: "#FFF",
    borderRadius: 12,
    fontSize: 20,
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.success.dark,
      transform: "scale(1.05)",
    },
    [theme.breakpoints.down('md')]: {
      fontSize: 18,
      padding: 5,
      paddingLeft: 8,
      borderRadius: 10,
    },
    [theme.breakpoints.down('sm')]: {
      fontSize: 16,
      padding: 4,
      paddingLeft: 6,
      borderRadius: 8,
    },
  },
}));

const TicketHeader = ({ loading, children }) => {
  const classes = useStyles();
  const history = useHistory();
  const handleBack = () => {
    history.push("/tickets");
  };

  return (
    <>
      {loading ? (
        <TicketHeaderSkeleton />
      ) : (
        <Card square className={classes.ticketHeader} elevation={0}>
          <div className={classes.headerContent}>
            <ArrowBackIos
              className={classes.backButton}
              onClick={handleBack}
            />
            {children}
          </div>
        </Card>
      )}
    </>
  );
};

export default TicketHeader;
