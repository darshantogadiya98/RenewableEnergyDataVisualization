// src/main.tsx  (or wherever you bootstrap React)
import ReactDOM from "react-dom/client";
import App from "./App";

import "antd/dist/reset.css"; // base reset
import "./globals.css";
import { ConfigProvider, theme as antdTheme } from "antd";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { darkTheme } from "./theme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm }}>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </ConfigProvider>
);
