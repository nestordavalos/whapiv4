import React, { useEffect, useMemo, useState } from "react";
import Routes from "./routes";
import "react-toastify/dist/ReactToastify.css";

import { alpha, createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { esES } from "@mui/material/locale";

import { CssBaseline } from "@mui/material";

import api from "./services/api";
import toastError from "./errors/toastError";

import lightBackground from "./assets/wa-background-light.png";
import darkBackground from "./assets/wa-background-dark.jpg";
import config from "./config.json";

const { system } = config;

const sanitizeColor = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === "string" && value.startsWith("linear-gradient")) {
    return fallback;
  }
  return value;
};

const buildScrollbarStyles = (mode) => ({
  "&::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  "&::-webkit-scrollbar-thumb": {
    boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
    backgroundColor: mode === "light" ? "#c1c1c1" : "#4a5568",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: mode === "light" ? "#f1f1f1" : "#1a202c",
  },
});

const buildPalette = (mode) => {
  const themeColors = mode === "light" ? system.color.lightTheme : system.color.darkTheme;
  const primaryFallback = "#0071c1";
  const secondaryFallback = mode === "light" ? "#0D0D0D" : "#0071c1";

  return {
    mode,
    primary: { main: sanitizeColor(themeColors.palette?.primary, primaryFallback) },
    secondary: { main: sanitizeColor(themeColors.palette?.secondary, secondaryFallback) },
    toolbar: {
      main: sanitizeColor(
        themeColors.toolbar?.background,
        sanitizeColor(themeColors.palette?.primary, primaryFallback)
      ),
    },
    menuItens: { main: themeColors.menuItens || (mode === "light" ? "#ffffff" : "#181d22") },
    sub: { main: themeColors.sub || (mode === "light" ? "#ffffff" : "#181d22") },
    toolbarIcon: { main: themeColors.toolbarIcon || (mode === "light" ? "#ffffff" : "#0071c1") },
    divide: { main: themeColors.divide || (mode === "light" ? "#E0E0E0" : "#2d3748") },
    background: {
      default: themeColors.palette?.background?.default || (mode === "light" ? "#f5f7fa" : "#080d14"),
      paper: themeColors.palette?.background?.paper || (mode === "light" ? "#ffffff" : "#181d22"),
    },
    text: {
      primary: themeColors.palette?.text?.primary || (mode === "light" ? "#1a1a2e" : "#F2F0E4"),
      secondary: themeColors.palette?.text?.secondary || (mode === "light" ? "#4a5568" : "#a0aec0"),
    },
    action: {
      active: mode === "dark" ? "#F2F0E4" : "#1a1a2e",
      hover: mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      selected: mode === "dark" ? "rgba(0, 113, 193, 0.16)" : "rgba(0, 113, 193, 0.12)",
      disabled: mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.38)",
      disabledBackground: mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
    },
    divider: themeColors.divide || (mode === "light" ? "#E0E0E0" : "#2d3748"),
  };
};

const getComponentOverrides = (theme, mode) => {
  const isDark = mode === "dark";
  const dividerColor = theme.palette.divider || (isDark ? "#2d3748" : "#E0E0E0");
  const hoverOverlay = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
  const selectedOverlay = alpha(theme.palette.primary.main, isDark ? 0.16 : 0.12);
  const focusRing = alpha(theme.palette.primary.main, 0.16);
  const cardShadow = isDark ? "0 12px 40px rgba(0, 0, 0, 0.55)" : "0 10px 40px rgba(20, 30, 85, 0.12)";

  return {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: "none",
        },
        rounded: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: cardShadow,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: cardShadow,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${dividerColor}`,
          backgroundImage: "none",
          boxShadow: cardShadow,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: "20px 24px 12px",
          fontWeight: 700,
          borderBottom: `1px solid ${dividerColor}`,
          backgroundColor: isDark ? "#0d1117" : "#ffffff",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
          gap: 12,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 600,
          letterSpacing: "0.01em",
          padding: "10px 16px",
          transition: "all 0.2s ease",
        },
        containedPrimary: {
          color: "#ffffff",
          boxShadow: `0 12px 30px ${alpha(theme.palette.primary.main, 0.35)}`,
          "&:hover": {
            boxShadow: `0 14px 40px ${alpha(theme.palette.primary.main, 0.45)}`,
          },
        },
        outlined: {
          borderColor: dividerColor,
          "&:hover": {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.06),
          },
        },
        text: {
          paddingLeft: 12,
          paddingRight: 12,
        },
        sizeSmall: {
          padding: "8px 12px",
          borderRadius: 8,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: theme.palette.text.secondary,
          "&:hover": {
            backgroundColor: hoverOverlay,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          color: theme.palette.text.primary,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: isDark ? "#0f141d" : "#ffffff",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: dividerColor,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${focusRing}`,
          },
        },
        input: {
          padding: "12px 14px",
          backgroundColor: isDark ? "#0f141d" : "#ffffff",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          color: theme.palette.text.secondary,
        },
        shrink: {
          transform: "translate(14px, -9px) scale(0.75)",
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: theme.palette.text.secondary,
        },
        outlined: {
          padding: "12px 14px",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "4px 8px",
          fontWeight: 500,
          "&.Mui-selected": {
            backgroundColor: selectedOverlay,
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.22 : 0.18),
          },
        },
      },
    },
    MuiFormControl: {
      defaultProps: {
        margin: "normal",
      },
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginLeft: 0,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 8,
          borderRadius: 8,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        track: {
          opacity: 1,
          backgroundColor: isDark ? "#4a5568" : "#cbd5e1",
        },
        switchBase: {
          "&.Mui-checked + .MuiSwitch-track": {
            backgroundColor: theme.palette.primary.main,
          },
          "&.Mui-checked": {
            color: "#ffffff",
          },
        },
        thumb: {
          boxShadow: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          "&.MuiChip-colorDefault": {
            backgroundColor: isDark ? "#1f2630" : "#f4f6fb",
            color: theme.palette.text.primary,
          },
          "&.MuiChip-colorPrimary": {
            backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.22 : 0.12),
            color: theme.palette.primary.main,
          },
        },
        label: {
          position: "relative",
          zIndex: 1,
          color: theme.palette.text.primary,
        },
        outlined: {
          borderColor: dividerColor,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minWidth: 0,
          minHeight: 48,
          padding: "10px 16px",
          color: theme.palette.text.secondary,
          "&.Mui-selected": {
            color: theme.palette.primary.main,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          backgroundColor: isDark ? "#1a202c" : "#0f172a",
          color: isDark ? "#F2F0E4" : "#e2e8f0",
          fontSize: "0.85rem",
          padding: "8px 12px",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: dividerColor,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          "&.Mui-selected": {
            backgroundColor: selectedOverlay,
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.24 : 0.2),
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${dividerColor}`,
        },
        head: {
          backgroundColor: isDark ? "#0d1117" : "#f5f7fa",
          fontWeight: 700,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: hoverOverlay,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: isDark
            ? "#0d1117"
            : theme.palette.toolbar?.main || theme.palette.primary.main,
          color: theme.palette.text.primary,
        },
      },
    },
  };
};

const createAppTheme = (mode, locale) => {
  const palette = buildPalette(mode);
  const theme = createTheme(
    {
      palette,
      backgroundImage: mode === "light" ? `url(${lightBackground})` : `url(${darkBackground})`,
      mode,
      scrollbarStyles: buildScrollbarStyles(mode),
      shape: {
        borderRadius: 12,
      },
      typography: {
        button: {
          fontWeight: 700,
          textTransform: "none",
        },
      },
    },
    locale
  );

  theme.components = getComponentOverrides(theme, mode);
  return theme;
};

const App = () => {
  const [locale, setLocale] = useState();
  const [theme, setTheme] = useState("light");

  const lightTheme = useMemo(() => createAppTheme("light", locale), [locale]);
  const darkTheme = useMemo(() => createAppTheme("dark", locale), [locale]);

  useEffect(() => {

    const fetchDarkMode = async () => {
      try {
        const { data } = await api.get("/settings");
        const settingIndex = data.filter(s => s.key === 'darkMode');

        if (settingIndex[0].value === "enabled") {
          setTheme("dark")
        } else {
          setTheme("light")
        }

      } catch (err) {
        setTheme("light")
        toastError(err);
      }
    };

    fetchDarkMode();
    
    // Listen for theme changes from Settings page
    const handleThemeChange = () => {
      fetchDarkMode();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };

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
        <Routes />
        <CssBaseline />
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
