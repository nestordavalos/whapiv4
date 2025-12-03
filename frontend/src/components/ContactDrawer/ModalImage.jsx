import React, { useState, useEffect } from "react";
import makeStyles from '@mui/styles/makeStyles';
import axios from "axios";
import Avatar from "@mui/material/Avatar";
import PersonIcon from "@mui/icons-material/Person";

import ModalImage from "react-modal-image";

const useStyles = makeStyles(theme => ({
	messageMedia: {
		objectFit: "cover",
		width: 120,
		height: 120,
		borderRadius: 16,
		border: `3px solid ${theme.palette.primary.main}`,
		boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
		cursor: "pointer",
		transition: "transform 0.2s ease, box-shadow 0.2s ease",
		"&:hover": {
			transform: "scale(1.02)",
			boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
		},
	},
	fallbackAvatar: {
		width: 120,
		height: 120,
		borderRadius: 16,
		border: `3px solid ${theme.palette.primary.main}`,
		boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
		backgroundColor: theme.palette.grey[300],
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	fallbackIcon: {
		fontSize: 60,
		color: theme.palette.grey[500],
	},
}));
 
const ModalImageContatc = ({ imageUrl }) => {
	const classes = useStyles();
	const [fetching, setFetching] = useState(true);
	const [blobUrl, setBlobUrl] = useState("");
	const [imageError, setImageError] = useState(false);

	useEffect(() => {
		if (!imageUrl) {
			setImageError(true);
			setFetching(false);
			return;
		}
		const fetchImage = async () => {
			try {
				const { data, headers } = await axios.get(imageUrl, {
					responseType: "blob",
				});
				const url = window.URL.createObjectURL(
					new Blob([data], { type: headers["content-type"] })
				);
				setBlobUrl(url);
				setFetching(false);
				setImageError(false);
			} catch (err) {
				if (err.response && err.response.status === 404) {
					setImageError(true);
				}
				setFetching(false);
			}
		};
		fetchImage();
	}, [imageUrl]);

	// Mostrar avatar placeholder si no hay imagen
	if (imageError || !imageUrl) {
		return (
			<Avatar className={classes.fallbackAvatar} variant="rounded">
				<PersonIcon className={classes.fallbackIcon} />
			</Avatar>
		);
	}

	return (
		<ModalImage
			className={classes.messageMedia}
			smallSrcSet={fetching ? imageUrl : blobUrl}
			medium={fetching ? imageUrl : blobUrl}
			large={fetching ? imageUrl : blobUrl}
			showRotate="true"
			alt="image"
		/>
	);
};


export default ModalImageContatc;
