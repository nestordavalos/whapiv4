import { Paper } from "@material-ui/core";
// import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";

export function TagsFilter ({ onFiltered }) {

    useEffect(() => {
        async function fetchData () {
            await loadTags();
        }
        fetchData();
    }, []);

    const loadTags = async () => {
        try {
            await api.get(`/tags/list`);
        } catch (err) {
            toastError(err);
        }
    }

    return (
        <Paper style={{padding: 10}}>
            {/* <Autocomplete
                multiple
                size="small"
                options={tags}
                value={selecteds}
                onChange={(e, v, r) => onChange(v)}
                getOptionLabel={(option) => option.name}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            variant="outlined"
                            style={{backgroundColor: option.color || '#eee', textShadow: '1px 1px 1px #000', color: 'white'}}
                            label={option.name}
                            {...getTagProps({ index })}
                            size="small"
                        />
                    ))
                }
                renderInput={(params) => (
                    <TextField {...params} variant="outlined" placeholder="Filtro por Tags" />
                )}
            /> */}
        </Paper>
    )
}