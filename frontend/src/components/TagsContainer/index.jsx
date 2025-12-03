import { Chip, Paper, TextField, Typography } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import Autocomplete from '@mui/material/Autocomplete';
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import React, { useContext, useEffect, useState } from "react";
import { isArray, isString } from "lodash";
import toastError from "../../errors/toastError";
import api from "../../services/api";

import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
    container: {
        padding: 16,
        backgroundColor: theme.palette.background.paper,
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    headerIcon: {
        fontSize: "1rem",
        color: theme.palette.text.secondary,
    },
    headerTitle: {
        fontWeight: 600,
        fontSize: "0.85rem",
        color: theme.palette.text.secondary,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    tagChip: {
        height: 24,
        fontSize: "0.75rem",
        fontWeight: 600,
        borderRadius: 6,
        margin: 2,
        "& .MuiChip-label": {
            padding: "0 10px",
        },
        "& .MuiChip-deleteIcon": {
            fontSize: "1rem",
            color: "rgba(255,255,255,0.7)",
            "&:hover": {
                color: "rgba(255,255,255,1)",
            },
        },
    },
    autocomplete: {
        "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            backgroundColor: theme.palette.background.default,
            "& fieldset": {
                borderColor: theme.palette.divider,
            },
            "&:hover fieldset": {
                borderColor: theme.palette.primary.light,
            },
            "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
            },
        },
        "& .MuiInputBase-input::placeholder": {
            fontSize: "0.85rem",
        },
    },
}));

export function TagsContainer({ contact }) {
    const classes = useStyles();
    const [tags, setTags] = useState([]);
    const [selecteds, setSelecteds] = useState([]);
    const { user } = useContext(AuthContext);
    useEffect(() => {
        if (contact) {
            async function fetchData() {
                await loadTags();
                if (Array.isArray(contact.tags)) {
                    setSelecteds(contact.tags);
                }
            }
            fetchData();
        }
    }, [contact]);

    const createTag = async (data) => {

        try {
            const { data: responseData } = await api.post(`/tags`, data);
            return responseData;
        } catch (err) {
            toastError(err);
        }
    }

    const loadTags = async () => {
        try {
            const { data } = await api.get(`/tags/list`);
            setTags(data);
        } catch (err) {
            toastError(err);
        }
    }

    const syncTags = async (data) => {
        try {
            const { data: responseData } = await api.post(`/tags/sync`, data);
            return responseData;
        } catch (err) {
            toastError(err);
        }
    }

    const onChange = async (value, reason) => {
        let optionsChanged = []
        if (reason === 'create-option') {
            if (isArray(value)) {
                for (let item of value) {
                    if (isString(item)) {
                        const newTag = await createTag({ name: item })
                        optionsChanged.push(newTag);
                    } else {
                        optionsChanged.push(item);
                    }
                }
            }
            await loadTags();
        } else {
            optionsChanged = value;
        }
        setSelecteds(optionsChanged);
        await syncTags({ contactId: contact.id, tags: optionsChanged });
    }
    const isRemoveTags = user.isRemoveTags === 'enabled';
    return (
        <Paper elevation={0} className={classes.container}>
            <div className={classes.header}>
                <LocalOfferIcon className={classes.headerIcon} />
                <Typography className={classes.headerTitle}>Tags</Typography>
            </div>
            <Autocomplete
                className={classes.autocomplete}
                disableClearable={true}
                multiple
                size="small"
                options={tags}
                value={selecteds}
                freeSolo
                onChange={(e, v, r) => onChange(v, r)}
                getOptionLabel={(option) => option.name}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            key={option.id || index}
                            className={classes.tagChip}
                            style={{ 
                                backgroundColor: option.color || '#3b82f6', 
                                color: 'white',
                            }}
                            label={option.name}
                            {...(isRemoveTags && getTagProps({ index }))}
                            size="small"
                        />
                    ))
                }
                renderInput={(params) => (
                    <TextField 
                        {...params} 
                        variant="outlined" 
                        placeholder="Agregar tags..." 
                    />
                )}
                PaperComponent={({ children }) => (
                    <Paper style={{ width: 280, marginTop: 4, borderRadius: 8 }}>
                        {children}
                    </Paper>
                )}
            />
        </Paper>
    )
}