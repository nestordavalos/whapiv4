import React from "react";

import makeStyles from '@mui/styles/makeStyles';
import Container from "@mui/material/Container";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    flex: 1,
    padding: "8px 16px 16px",
    height: "calc(100vh - 64px)",
  },

  contentWrapper: {
    height: "100%",
    overflowY: "hidden",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.default,
    borderRadius: 12,
  },
}));

const MainContainer = ({ children }) => {
  const classes = useStyles();

  return (
    <Container className={classes.mainContainer} maxWidth={false}>
      <div className={classes.contentWrapper}>{children}</div>
    </Container>
  );
};

export default MainContainer;
