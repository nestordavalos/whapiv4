import React, { useEffect, useState } from "react";
import {
  Container,
  IconButton,
  makeStyles,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  paper: {
    padding: theme.spacing(2),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)"
  },
  integrationRow: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5)
  },
  textFieldContainer: {
    position: "relative",
    width: "100%"
  },
  iconButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: "50%",
    transform: "translateY(-50%)"
  }
}));

const Integrations = () => {
  const classes = useStyles();
  const { t } = useTranslation();

  const [integrations, setIntegrations] = useState([]);
  const [showHubToken, setShowHubToken] = useState(false);
  const [maskedValues, setMaskedValues] = useState({ hubToken: "" });

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const { data } = await api.get("/integrations");
        setIntegrations(data);
        const hubValue = data.find(i => i.key === "hubToken")?.value || "";
        setMaskedValues({ hubToken: maskValue(hubValue) });
      } catch (err) {
        toastError(err);
      }
    };
    fetchIntegrations();
  }, []);

  const handleChangeHubToken = async e => {
    const selectedValue = e.target.value;
    try {
      await api.put("/integrations/hubToken", { value: selectedValue });
      toast.success(t("integrations.success"));
      setMaskedValues({ hubToken: maskValue(selectedValue) });
    } catch (err) {
      toastError(err);
    }
  };

  const maskValue = value => value.replace(/./g, "*");

  const getHubToken = () => {
    const integration = integrations.find(s => s.key === "hubToken");
    return integration ? integration.value : "";
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>{t("integrations.title")}</Title>
      </MainHeader>

      <Container maxWidth="sm" disableGutters>
        <Paper className={classes.paper} variant="outlined">
          <div className={classes.integrationRow}>
            <Typography align="left" variant="body1">
              {t("integrations.integrations.hub.title")}
            </Typography>
            <div className={classes.textFieldContainer}>
              <TextField
                fullWidth
                id="hubToken"
                name="hubToken"
                margin="dense"
                label={t("integrations.integrations.hub.hubToken")}
                variant="outlined"
                onChange={handleChangeHubToken}
                value={showHubToken ? getHubToken() : maskedValues.hubToken}
                type="text"
              />
              <IconButton
                className={classes.iconButton}
                onClick={() => setShowHubToken(prev => !prev)}
              >
                {showHubToken ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </div>
          </div>
        </Paper>
      </Container>
    </MainContainer>
  );
};

export default Integrations;
