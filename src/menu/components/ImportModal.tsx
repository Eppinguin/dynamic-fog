import React from "react";
import styled from "@emotion/styled";
import { Box, Button, Typography } from "@mui/material";
import OBR from "@owlbear-rodeo/sdk";
// import { getPluginId } from "../../util/getPluginId";
import {
  uploadSceneFromVTT,
  addItemsFromVTT,
} from "../../background/importVTT";

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  gap: 16px;
`;

export const ImportModal: React.FC = () => {
  const handleFileSelect = async (action: "scene" | "items") => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".dd2vtt,.uvtt,.df2vtt";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    fileInput.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;

      if (files && files.length > 0) {
        const file = files[0];
        try {
          if (action === "scene") {
            await uploadSceneFromVTT(file);
          } else {
            await OBR.notification.show(
              "Adding items to current scene...",
              "INFO"
            );
            await addItemsFromVTT(file);
            console.debug("Items added to current scene");
            await OBR.notification.show(
              "Added walls, doors, and lights to the current scene",
              "SUCCESS"
            );
          }
          // await OBR.modal.close(getPluginId("import-modal"));
        } catch (error) {
          console.error("Error:", error);
          await OBR.notification.show(`Error: ${error}`, "ERROR");
        }
      }

      document.body.removeChild(fileInput);
    };

    fileInput.click();
  };

  return (
    <StyledBox>
      <Typography variant="h6" component="h2">
        Import UVTT/DD2VTT File
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          width: "100%",
          alignItems: "center",
        }}>
        <Box>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            gutterBottom>
            Select a UVTT, DD2VTT, or DF2VTT file to create a new scene.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              onClick={() => handleFileSelect("scene")}>
              Create New Scene
            </Button>
          </Box>
        </Box>

        <Box sx={{ width: "100%", textAlign: "center", py: 1 }}>
          <Typography variant="body2" color="text.disabled">
            or
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            gutterBottom>
            Add walls, doors, and lights to the current scene.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="outlined"
              onClick={() => handleFileSelect("items")}>
              Import Items to Scene
            </Button>
          </Box>
        </Box>
      </Box>
    </StyledBox>
  );
};
