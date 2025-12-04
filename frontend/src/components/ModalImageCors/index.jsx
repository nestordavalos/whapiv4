import React, { useState, useEffect } from "react";
import makeStyles from '@mui/styles/makeStyles';
import axios from "axios";

import ModalImage from "react-modal-image";

const useStyles = makeStyles(theme => ({
	messageMedia: {
		objectFit: "cover",
		width: 250,
		height: 200,
		borderRadius: 12,
		display: "block",
		cursor: "pointer",
		transition: "transform 0.2s ease",
		"&:hover": {
			transform: "scale(1.02)",
		},
	},
}));

const ModalImageCors = ({ imageUrl }) => {
	const classes = useStyles();
	const [fetching, setFetching] = useState(true);
	const [blobUrl, setBlobUrl] = useState("");
	const [imageError, setImageError] = useState(false);

	useEffect(() => {
		if (!imageUrl) return;
		let isMounted = true;
		const source = axios.CancelToken.source();
		let createdUrl = "";
		const fetchImage = async () => {
			try {
				const { data, headers } = await axios.get(imageUrl, {
					responseType: "blob",
					cancelToken: source.token,
				});
				createdUrl = window.URL.createObjectURL(
					new Blob([data], { type: headers["content-type"] })
				);
				if (isMounted) {
					setBlobUrl(createdUrl);
					setFetching(false);
					setImageError(false);
				} else {
					window.URL.revokeObjectURL(createdUrl);
				}
			} catch (err) {
				if (axios.isCancel(err)) return;
				if (isMounted) {
					// Si es 404, marcar como error y no mostrar nada
					if (err.response && err.response.status === 404) {
						setImageError(true);
					}
					setFetching(false);
				}
			}
		};
		fetchImage();

		return () => {
			isMounted = false;
			source.cancel("modal-image-unmounted");
			if (createdUrl) {
				window.URL.revokeObjectURL(createdUrl);
			}
			if (blobUrl) {
				window.URL.revokeObjectURL(blobUrl);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [imageUrl]);

	// No renderizar nada si la imagen no existe
	if (imageError) {
		return null;
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

export default ModalImageCors;
