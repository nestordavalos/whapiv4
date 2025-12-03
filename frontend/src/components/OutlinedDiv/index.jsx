import React from "react";

import TextField from "@mui/material/TextField";

const InputComponent = React.forwardRef(function InputComponent(props, ref) {
  return <div ref={ref} {...props} />;
});

const OutlinedDiv = ({
  InputProps,
  children,
  InputLabelProps,
  label,
  ...other
}) => {
  return (
    <TextField
      {...other}
      variant="outlined"
      label={label}
      multiline
      InputLabelProps={{ shrink: true, ...InputLabelProps }}
      InputProps={{
        inputComponent: InputComponent,
        ...InputProps
      }}
      inputProps={{ children: children }}
    />
  );
};

export default OutlinedDiv;
