import React, { useState, useContext } from "react";

import {
  Button,
  CssBaseline,
  TextField,
  // Grid,
  // Box,
  Typography,
  Container,
  InputAdornment,
  IconButton,
  Link
} from '@mui/material';

import { Visibility, VisibilityOff } from '@mui/icons-material';
import makeStyles from '@mui/styles/makeStyles';

import { AuthContext } from "../../context/Auth/AuthContext";
import config from "../../config.json";
import pkg from "../../../package.json";
import logo from '../../assets/logo.jpeg';

const { system } = config;
const { systemVersion } = pkg;


const useStyles = makeStyles(theme => ({
  root: {
    width: "100vw",
    height: "100vh",
    background: theme.palette.mode === "dark" 
      ? "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)"
      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "55px 30px",
    borderRadius: "12.5px",
    boxShadow: theme.palette.mode === "dark" 
      ? "0 8px 32px rgba(0, 0, 0, 0.5)"
      : "0 8px 32px rgba(0, 0, 0, 0.15)",
    border: theme.palette.mode === "dark" 
      ? `1px solid ${theme.palette.divider}`
      : "none",
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
    fontWeight: 600,
    padding: "10px 24px",
    borderRadius: 8,
  },
  powered: {
    color: theme.palette.mode === "dark" ? theme.palette.text.secondary : "white"
  },
  loginTitle: {
    color: theme.palette.text.primary,
    fontWeight: 600,
  },
}));




const Login = () => {
  const classes = useStyles();

  const [user, setUser] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const { handleLogin } = useContext(AuthContext);

  const handleChangeInput = e => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handlSubmit = e => {
    e.preventDefault();
    handleLogin(user);
  };

  return (
    <div className={classes.root}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <div className={classes.paper}>
          <div>
            <img style={{ margin: "0 auto", height: "70px", width: "100%" }} src={logo} alt="Whats" />
          </div>
          <Typography component="h1" variant="h5" className={classes.loginTitle}>
            Login
          </Typography>
          <form className={classes.form} noValidate onSubmit={handlSubmit}>
            <TextField
              variant="standard"
              margin="normal"
              required
              fullWidth
              id="email"
              label="E-mail"
              name="email"
              value={user.email}
              onChange={handleChangeInput}
              autoComplete="email"

            />
            <TextField
              variant="standard"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              id="password"
              value={user.password}
              onChange={handleChangeInput}
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((e) => !e)}
                    size="large">
                    {showPassword ? <VisibilityOff color="secondary" /> : <Visibility color="secondary" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              className={classes.submit}
            >
              Entrar
            </Button>
            {/* <Grid container>
						<Grid item>
							<Link
								href="#"
								variant="body2"
								component={RouterLink}
								to="/signup"
							>
								{i18n.t("login.buttons.register")}
							</Link>
						</Grid>
					</Grid> */}
          </form>

          <Typography variant="body2" color="textSecondary" align="center">
            <Link color="inherit" href={system.url}>
              {system.name}
              <br></br>
              Todos os direitos reservados - <b>v{systemVersion}</b>
              <br></br>
              © 2022 - {new Date().getFullYear()}
            </Link>
            {"."}
          </Typography>
        </div>
        <br />
      </Container>
    </div>
  );
};

export default Login;
