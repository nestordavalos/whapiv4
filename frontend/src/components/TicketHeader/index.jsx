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
    padding: "4px 8px",
    gap: 8,
    minHeight: 56,
    [theme.breakpoints.down('md')]: {
      padding: "8px",
      minHeight: "auto",
      gap: 6,
    },
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 8,
    [theme.breakpoints.down('md')]: {
      flexWrap: "wrap",
    },
  },
  backButton: {
    backgroundColor: theme.palette.success.main,
    padding: 4,
    paddingLeft: 8,
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
      padding: 3,
      paddingLeft: 6,
      borderRadius: 10,
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
