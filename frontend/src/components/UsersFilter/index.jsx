import { Box, Chip, TextField } from "@mui/material";
import Autocomplete from '@mui/material/Autocomplete';
import React, { useEffect, useState } from "react";
import makeStyles from '@mui/styles/makeStyles';
import toastError from "../../errors/toastError";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  autocomplete: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: theme.palette.background.paper,
      borderRadius: 8,
      "& fieldset": {
        borderColor: theme.palette.divider,
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary.main,
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
      },
    },
    "& .MuiInputBase-input": {
      color: theme.palette.text.primary,
    },
    "& .MuiAutocomplete-popupIndicator": {
      color: theme.palette.text.secondary,
    },
    "& .MuiAutocomplete-clearIndicator": {
      color: theme.palette.text.secondary,
    },
  },
  chip: {
    backgroundColor: theme.palette.mode === "dark" 
      ? "rgba(0, 113, 193, 0.3)" 
      : "rgba(0, 113, 193, 0.15)",
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.primary.main}`,
    "& .MuiChip-deleteIcon": {
      color: theme.palette.text.secondary,
      "&:hover": {
        color: theme.palette.error.main,
      },
    },
  },
}));

export function UsersFilter({ onFiltered, initialUsers }) {
  const classes = useStyles();
  const [users, setUsers] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadUsers();
    }
    fetchData();
  }, []);

  useEffect(() => {
    setSelecteds([]);
    if (
      Array.isArray(initialUsers) &&
      Array.isArray(users) &&
      users.length > 0
    ) {
      onChange(initialUsers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUsers, users]);

  const loadUsers = async () => {
    try {
      const { data } = await api.get(`/users/`);
      const userList = data.users;
      console.log(userList)
      setUsers(userList);
    } catch (err) {
      toastError(err);
    }
  };

  const onChange = async (value) => {
    setSelecteds(value);
    onFiltered(value);
  };

  return (
    <Box style={{ padding: "0px 10px 10px" }}>
      <Autocomplete
        multiple
        size="small"
        options={users}
        value={selecteds}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => {
          return (
            option?.id === value?.id ||
            option?.name.toLowerCase() === value?.name.toLowerCase()
          );
        }}
        className={classes.autocomplete}
        renderTags={(value, getUserProps) =>
          value.map((option, index) => (
            <Chip
              key={option.id || index}
              variant="outlined"
              className={classes.chip}
              label={option.name}
              {...getUserProps({ index })}
              size="small"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder="Filtro por Usuários"
          />
        )}
      />
    </Box>
  );
}
