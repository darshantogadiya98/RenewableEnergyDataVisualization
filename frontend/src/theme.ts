import { createTheme } from "@mui/material";
import { grey, amber, cyan } from "@mui/material/colors";

/** Site‑wide dark palette */
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: cyan,
    secondary: amber,
    background: {
      default: grey[900], // page background
      paper: grey[800], // cards & menus
    },
    divider: grey[700],
  },
  shape: { borderRadius: 10 },
});
