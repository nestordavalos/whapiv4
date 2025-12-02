import React from "react";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	title: {
		fontSize: "1.35rem",
		fontWeight: 600,
		color: theme.palette.primary.main,
		marginBottom: 0,
		letterSpacing: "-0.02em",
		[theme.breakpoints.down("xs")]: {
			fontSize: "1.1rem",
		},
	},
}));

export default function Title(props) {
	const classes = useStyles();
	return (
		<Typography variant="h5" className={classes.title}>
			{props.children}
		</Typography>
	);
}
