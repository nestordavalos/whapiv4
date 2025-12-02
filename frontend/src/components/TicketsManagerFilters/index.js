import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  makeStyles,
  TextField,
  Typography,
  Button,
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ClearIcon from "@material-ui/icons/Clear";
import FilterListIcon from "@material-ui/icons/FilterList";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  filterAccordion: {
    margin: "8px 12px",
    boxShadow: "none",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "10px !important",
    overflow: "hidden",
    "&:before": {
      display: "none",
    },
    "&.Mui-expanded": {
      margin: "8px 12px",
    },
    [theme.breakpoints.down("xs")]: {
      margin: "6px 8px",
      "&.Mui-expanded": {
        margin: "6px 8px",
      },
    },
  },
  accordionSummary: {
    minHeight: "44px",
    padding: "0 16px",
    backgroundColor: theme.palette.background.paper,
    "&.Mui-expanded": {
      minHeight: "44px",
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    "& .MuiAccordionSummary-content": {
      margin: "10px 0",
      "&.Mui-expanded": {
        margin: "10px 0",
      },
    },
    "& .MuiAccordionSummary-expandIcon": {
      color: theme.palette.text.secondary,
      padding: 8,
    },
    [theme.breakpoints.down("xs")]: {
      padding: "0 12px",
      minHeight: "40px",
      "&.Mui-expanded": {
        minHeight: "40px",
      },
    },
  },
  accordionDetails: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
  },
  filterTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: theme.palette.text.primary,
    display: "flex",
    alignItems: "center",
    gap: 8,
    [theme.breakpoints.down("xs")]: {
      fontSize: "0.78rem",
      gap: 6,
    },
  },
  activeCount: {
    marginLeft: 8,
    color: theme.palette.primary.main,
    fontSize: "0.75rem",
    fontWeight: 500,
    backgroundColor: theme.palette.primary.light + "20",
    padding: "2px 8px",
    borderRadius: 12,
  },
  clearButton: {
    textTransform: "none",
    fontSize: "0.75rem",
    color: theme.palette.error.main,
    padding: "4px 12px",
    borderRadius: 8,
    "&:hover": {
      backgroundColor: theme.palette.error.light + "15",
    },
  },
  autocomplete: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      backgroundColor: theme.palette.background.paper,
      fontSize: "0.85rem",
      "& fieldset": {
        borderColor: theme.palette.divider,
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary.light,
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
      },
    },
    "& .MuiAutocomplete-inputRoot": {
      padding: "4px 8px",
    },
    "& .MuiInputLabel-outlined": {
      fontSize: "0.85rem",
      transform: "translate(14px, 10px) scale(1)",
    },
    "& .MuiInputLabel-outlined.MuiInputLabel-shrink": {
      transform: "translate(14px, -6px) scale(0.75)",
      fontWeight: 500,
    },
    "& .MuiAutocomplete-tag": {
      margin: 2,
    },
  },
  filterChip: {
    height: 24,
    fontSize: "0.75rem",
    fontWeight: 500,
    borderRadius: 6,
  },
}));

const TicketsManagerFilters = ({ 
  selectedQueueIds, 
  onQueueChange,
  selectedTagIds,
  onTagChange,
  selectedWhatsappIds,
  onWhatsappChange,
  selectedUserIds,
  onUserChange,
  userQueues 
}) => {
  const classes = useStyles();

  const [queues, setQueues] = useState([]);
  const [tags, setTags] = useState([]);
  const [whatsapps, setWhatsapps] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiltersData = async () => {
      try {
        setLoading(true);
        
        // Fetch queues
        const { data: queuesData } = await api.get("/queue");
        setQueues(queuesData);

        // Fetch tags
        const { data: tagsData } = await api.get("/tags/list");
        setTags(tagsData);

        // Fetch whatsapps
        const { data: whatsappsData } = await api.get("/whatsapp");
        setWhatsapps(whatsappsData);

        // Fetch users
        const { data: usersData } = await api.get("/users");
        setUsers(usersData.users || []);

      } catch (err) {
        console.error("Error fetching filters data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiltersData();
  }, []);

  const handleQueueChange = (event, newValue) => {
    const ids = newValue.map(q => q.id);
    onQueueChange(ids);
  };

  const handleTagChange = (event, newValue) => {
    const ids = newValue.map(t => t.id);
    onTagChange(ids);
  };

  const handleWhatsappChange = (event, newValue) => {
    const ids = newValue.map(w => w.id);
    onWhatsappChange(ids);
  };

  const handleUserChange = (event, newValue) => {
    const ids = newValue.map(u => u.id);
    onUserChange(ids);
  };

  const getSelectedQueues = () => {
    return queues.filter(q => selectedQueueIds && selectedQueueIds.includes(q.id));
  };

  const getSelectedTags = () => {
    return tags.filter(t => selectedTagIds && selectedTagIds.includes(t.id));
  };

  const getSelectedWhatsapps = () => {
    return whatsapps.filter(w => selectedWhatsappIds && selectedWhatsappIds.includes(w.id));
  };

  const getSelectedUsers = () => {
    return users.filter(u => selectedUserIds && selectedUserIds.includes(u.id));
  };

  const handleClearFilters = () => {
    onQueueChange([]);
    onTagChange([]);
    onWhatsappChange([]);
    onUserChange([]);
  };

  const hasActiveFilters = selectedQueueIds.length > 0 || selectedTagIds.length > 0 || selectedWhatsappIds.length > 0 || selectedUserIds.length > 0;

  if (loading) {
    return null;
  }

  return (
    <Accordion className={classes.filterAccordion} elevation={0} defaultExpanded={false}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        className={classes.accordionSummary}
      >
        <Typography className={classes.filterTitle}>
          <FilterListIcon style={{ fontSize: 18 }} />
          Filtros Avanzados
          {hasActiveFilters && (
            <span className={classes.activeCount}>
              {selectedQueueIds.length + selectedTagIds.length + selectedWhatsappIds.length + selectedUserIds.length} activos
            </span>
          )}
        </Typography>
      </AccordionSummary>
      <AccordionDetails className={classes.accordionDetails}>
        {hasActiveFilters && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <Button
              size="small"
              startIcon={<ClearIcon style={{ fontSize: 16 }} />}
              onClick={handleClearFilters}
              className={classes.clearButton}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
        
        {/* Filtro por Sectores */}
        <Autocomplete
          multiple
          size="small"
          options={queues}
          value={getSelectedQueues()}
          onChange={handleQueueChange}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Sectores"
              placeholder="Seleccionar..."
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                key={option.id}
                size="small"
                label={option.name}
                {...getTagProps({ index })}
                className={classes.filterChip}
                style={{ backgroundColor: option.color, color: "#fff" }}
              />
            ))
          }
          className={classes.autocomplete}
        />

        {/* Filtro por Etiquetas */}
        <Autocomplete
          multiple
          size="small"
          options={tags}
          value={getSelectedTags()}
          onChange={handleTagChange}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Etiquetas"
              placeholder="Seleccionar..."
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                key={option.id}
                size="small"
                label={option.name}
                {...getTagProps({ index })}
                className={classes.filterChip}
                style={{ backgroundColor: option.color, color: "#fff" }}
              />
            ))
          }
          className={classes.autocomplete}
        />

        {/* Filtro por Conexiones */}
        <Autocomplete
          multiple
          size="small"
          options={whatsapps}
          value={getSelectedWhatsapps()}
          onChange={handleWhatsappChange}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Conexiones"
              placeholder="Seleccionar..."
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                key={option.id}
                size="small"
                label={option.name}
                {...getTagProps({ index })}
                className={classes.filterChip}
                style={{ backgroundColor: "#25D366", color: "#fff" }}
              />
            ))
          }
          className={classes.autocomplete}
        />

        {/* Filtro por Agentes */}
        <Autocomplete
          multiple
          size="small"
          options={users}
          value={getSelectedUsers()}
          onChange={handleUserChange}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Agentes Atribuidos"
              placeholder="Seleccionar..."
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                key={option.id}
                size="small"
                label={option.name}
                {...getTagProps({ index })}
                className={classes.filterChip}
                style={{ backgroundColor: "#607d8b", color: "#fff" }}
              />
            ))
          }
          className={classes.autocomplete}
        />
      </AccordionDetails>
    </Accordion>
  );
};

export default TicketsManagerFilters;
