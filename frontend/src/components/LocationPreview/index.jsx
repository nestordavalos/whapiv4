import React, { useEffect } from 'react';
import DOMPurify from 'dompurify';
import toastError from "../../errors/toastError";

import Typography from "@mui/material/Typography";

import { Button, Divider, } from "@mui/material";

const LocationPreview = ({ image, link, description }) => {
    useEffect(() => {}, [image, link, description]);

    const handleLocation = async() => {
        try {
            // Validate URL scheme to prevent javascript: protocol attacks
            if (link && !/^https?:\/\//i.test(link)) {
                return;
            }
            window.open(link);
        } catch (err) {
            toastError(err);
        }
    }

    return (
		<>
			<div style={{
				minWidth: "250px",
			}}>
				<div>
					<div style={{ float: "left" }}>
						{image ? (
							<img src={image} alt="Mapa de ubicación" onClick={handleLocation} style={{ width: "100px", cursor: "pointer" }} />
						) : (
							<button
								type="button"
								onClick={handleLocation}
								style={{ width: "100px", height: "80px", border: 0, borderRadius: 4, cursor: "pointer", fontSize: "30px" }}
								aria-label="Abrir ubicación"
							>
								📍
							</button>
						)}
					</div>
					{ description && (
					<div style={{ display: "flex", flexWrap: "wrap" }}>
						<Typography component="div" style={{ marginTop: "12px", marginLeft: "15px", marginRight: "15px", float: "left" }} variant="body2" color="primary" gutterBottom>
							<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description.replace('\\n', '<br />')) }}></div>
						</Typography>
					</div>
					)}
					<div style={{ display: "block", content: "", clear: "both" }}></div>
					<div>
						<Divider />
						<Button
							fullWidth
							color="primary"
							onClick={handleLocation}
							disabled={!link}
						>Visualizar</Button>
					</div>
				</div>
			</div>
		</>
	);

};

export default LocationPreview;
