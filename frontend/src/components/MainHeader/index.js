import React from "react";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	contactsHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "16px 8px",
		flexWrap: "wrap",
		gap: 12,
		[theme.breakpoints.down("xs")]: {
			padding: "12px 8px",
			gap: 10,
		},
	},
}));

const MainHeader = ({ children }) => {
	const classes = useStyles();

	return <div className={classes.contactsHeader}>{children}</div>;
};

export default MainHeader;
