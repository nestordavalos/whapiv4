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
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  filterAccordion: {
    margin: "0",
    boxShadow: "none",
    border: "1px solid rgba(0, 0, 0, 0.12)",
    "&:before": {
      display: "none",
    },
  },
  accordionSummary: {
    minHeight: "48px",
    padding: "0 16px",
    "&.Mui-expanded": {
      minHeight: "48px",
    },
    "& .MuiAccordionSummary-content": {
      margin: "12px 0",
    },
  },
  accordionDetails: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.background.default,
  },
  filterTitle: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: theme.palette.text.primary,
  },
  autocomplete: {
    "& .MuiAutocomplete-inputRoot": {
      padding: "2px",
    },
    "& .MuiInputLabel-outlined": {
      transform: "translate(14px, 12px) scale(1)",
    },
    "& .MuiInputLabel-outlined.MuiInputLabel-shrink": {
      transform: "translate(14px, -6px) scale(0.75)",
    },
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
          Filtros Avanzados
          {hasActiveFilters && (
            <span style={{ marginLeft: "8px", color: "#2196f3", fontSize: "0.75rem" }}>
              ({selectedQueueIds.length + selectedTagIds.length + selectedWhatsappIds.length + selectedUserIds.length} activos)
            </span>
          )}
        </Typography>
      </AccordionSummary>
      <AccordionDetails className={classes.accordionDetails}>
        {hasActiveFilters && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              style={{ textTransform: "none" }}
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
              placeholder="Seleccionar sectores"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                size="small"
                label={option.name}
                {...getTagProps({ index })}
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
              placeholder="Seleccionar etiquetas"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                size="small"
                label={option.name}
                {...getTagProps({ index })}
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
              placeholder="Seleccionar conexiones"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                size="small"
                label={option.name}
                {...getTagProps({ index })}
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
              placeholder="Seleccionar agentes"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                size="small"
                label={option.name}
                {...getTagProps({ index })}
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
