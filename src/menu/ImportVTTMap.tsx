import React, { useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { CircularProgress } from "@mui/material";
import { parseVTTFile, importVTTMapToOBR } from "../util/importVTTMap";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

export function ImportVTTMap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Reset states
    setError(null);
    setSuccess(null);

    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".dd2vtt") && !fileName.endsWith(".uvtt")) {
      setError(
        "Unsupported file format. Please upload a .uvtt or .dd2vtt file."
      );
      return;
    }

    setIsLoading(true);
    try {
      // Parse the VTT file
      const mapData = await parseVTTFile(file);
      if (!mapData) {
        setError(
          "Failed to parse the file. The file may be corrupted or in an unsupported format."
        );
        setIsLoading(false);
        return;
      }

      // Import walls to OBR
      const success = await importVTTMapToOBR(mapData);
      if (success) {
        setSuccess("Walls imported successfully!");
      } else {
        setError("Failed to import walls to the scene.");
      }
    } catch (err) {
      console.error("Error during import:", err);
      setError("An unexpected error occurred during import.");
    } finally {
      setIsLoading(false);

      // Clear the input value to allow the same file to be selected again
      event.target.value = "";
    }
  };

  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
        Import Walls
      </Typography>

      <Button
        component="label"
        variant="outlined"
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : undefined}>
        {isLoading ? "Importing..." : "Import UVTT/DD2VTT File"}
        <VisuallyHiddenInput
          type="file"
          onChange={handleFileUpload}
          accept=".uvtt,.dd2vtt"
        />
      </Button>

      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}

      {success && (
        <Typography variant="caption" color="success.main">
          {success}
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary">
        Import walls from Universal VTT (.uvtt) or DD2VTT (.dd2vtt) files.
      </Typography>
    </Stack>
  );
}
