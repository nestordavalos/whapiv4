import React, { useState, useEffect } from "react";
import Routes from "./routes";
import "react-toastify/dist/ReactToastify.css";

import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { ThemeProvider as StylesThemeProvider } from "@mui/styles";
import { esES } from "@mui/material/locale";

import { CssBaseline } from "@mui/material";

import api from "./services/api";
import toastError from "./errors/toastError";

import lightBackground from "./assets/wa-background-light.png";
import darkBackground from "./assets/wa-background-dark.jpg";
import config from "./config.json";

const { system } = config;

const App = () => {
  const [locale, setLocale] = useState();

  const sanitizeColor = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value === "string" && value.startsWith("linear-gradient")) {
      return fallback;
    }
    return value;
  };

  const lightToolbar = sanitizeColor(system.color.lightTheme.toolbar.background, system.color.lightTheme.palette.primary || "#0071c1");
  const darkToolbar = sanitizeColor(system.color.darkTheme.toolbar.background, system.color.darkTheme.palette.primary || "#0071c1");

  const lightTheme = createTheme({
    scrollbarStyles: {
      "&::-webkit-scrollbar": {
        width: "8px",
        height: "8px",
      },
      "&::-webkit-scrollbar-thumb": {
        boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
        backgroundColor: "#c1c1c1",
        borderRadius: "4px",
      },
      "&::-webkit-scrollbar-track": {
        backgroundColor: "#f1f1f1",
      },
    },
    palette: {
      mode: "light",
      primary: { main: system.color.lightTheme.palette.primary || "#0071c1" },
      secondary: { main: system.color.lightTheme.palette.secondary || "#0D0D0D" },
      toolbar: { main: lightToolbar },
      menuItens: { main: system.color.lightTheme.menuItens || "#ffffff" },
      sub: { main: system.color.lightTheme.sub || "#ffffff" },
      toolbarIcon: { main: system.color.lightTheme.toolbarIcon || "#ffffff" },
      divide: { main: system.color.lightTheme.divide || "#E0E0E0" },
      background: {
        default: "#f5f7fa",
        paper: "#ffffff",
      },
      text: {
        primary: "#1a1a2e",
        secondary: "#4a5568",
      },
    },
    backgroundImage: `url(${lightBackground})`,
    components: {
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  }, locale);

  const darkTheme = createTheme({
    scrollbarStyles: {
      "&::-webkit-scrollbar": {
        width: "8px",
        height: "8px",
      },
      "&::-webkit-scrollbar-thumb": {
        boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
        backgroundColor: "#4a5568",
        borderRadius: "4px",
      },
      "&::-webkit-scrollbar-track": {
        backgroundColor: "#1a202c",
      },
    },
    palette: {
      mode: "dark",
      primary: { main: system.color.darkTheme.palette.primary || "#0071c1" },
      secondary: { main: system.color.darkTheme.palette.secondary || "#0071c1" },
      toolbar: { main: darkToolbar },
      menuItens: { main: system.color.darkTheme.menuItens || "#181d22" },
      sub: { main: system.color.darkTheme.sub || "#181d22" },
      toolbarIcon: { main: system.color.darkTheme.toolbarIcon || "#0071c1" },
      divide: { main: system.color.darkTheme.divide || "#2d3748" },
      background: {
        default: system.color.darkTheme.palette.background.default || "#080d14",
        paper: system.color.darkTheme.palette.background.paper || "#181d22",
      },
      text: {
        primary: system.color.darkTheme.palette.text.primary || "#F2F0E4",
        secondary: system.color.darkTheme.palette.text.secondary || "#a0aec0",
      },
      action: {
        active: "#F2F0E4",
        hover: "rgba(255, 255, 255, 0.08)",
        selected: "rgba(0, 113, 193, 0.16)",
        disabled: "rgba(255, 255, 255, 0.3)",
        disabledBackground: "rgba(255, 255, 255, 0.12)",
      },
      divider: "#2d3748",
    },
    backgroundImage: `url(${darkBackground})`,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: "#080d14",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: "#181d22",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: "1px solid #2d3748",
          },
          head: {
            backgroundColor: "#0d1117",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.04) !important",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            "&.MuiButton-containedPrimary": {
              color: "#ffffff",
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            color: "#F2F0E4",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#2d3748",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#4a5568",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#0071c1",
            },
            borderRadius: 12,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: "#a0aec0",
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: "#a0aec0",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.08)",
            },
            "&.Mui-selected": {
              backgroundColor: "rgba(0, 113, 193, 0.16)",
            },
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              backgroundColor: "rgba(0, 113, 193, 0.16)",
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            backgroundColor: "#2d3748",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: "#2d3748",
          },
          outlined: {
            borderColor: "#4a5568",
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: "#0071c1",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              color: "#0071c1",
            },
          },
          textColorPrimary: {
            color: "#a0aec0",
            "&.Mui-selected": {
              color: "#0071c1",
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          track: {
            backgroundColor: "#4a5568",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: "#1a202c",
            color: "#F2F0E4",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: "#181d22",
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            backgroundColor: "#0d1117",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          colorPrimary: {
            backgroundColor: "#0d1117",
          },
        },
      },
    },
  }, locale);

  const [theme, setTheme] = useState("light");

  useEffect(() => {

    const fetchDarkMode = async () => {
      try {
        const { data } = await api.get("/settings");
        const settingIndex = data.filter(s => s.key === 'darkMode');

        if (settingIndex[0].value === "enabled") {
          setTheme("dark")
        }

      } catch (err) {
        setTheme("light")
        toastError(err);
      }
    };

    fetchDarkMode();

  }, []);

  useEffect(() => {
    const i18nlocale = localStorage.getItem("i18nextLng");
    const browserLocale = i18nlocale.substring(0, 2) + i18nlocale.substring(3, 5);

    if (browserLocale === "esES") {
      setLocale(esES);
    }
  }, []);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
        <StylesThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
          <Routes />
          <CssBaseline />
        </StylesThemeProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
