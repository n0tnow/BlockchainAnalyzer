import React, { useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material";
import { Box, CssBaseline, Container } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import styled from "styled-components";
import GlobalStyles from "./styles/GlobalStyles";
import Analyze from "./pages/Analyze";
import LiveAnalysis from "./pages/LiveAnalysis";
import ModelComparison from "./pages/ModelComparison"; // Yeni sayfa
import Navbar from "./components/Navbar";
import StarBackground from "./components/StarBackground";

const StyledContainer = styled(Container)`
  padding-top: 6rem;
  min-height: 100vh;
  position: relative;
  z-index: 1;
`;

const PageWrapper = styled(motion.div)`
  width: 100%;
`;

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#00c6ff",
    },
    secondary: {
      main: "#7928ca",
    },
    background: {
      default: "#000000",
      paper: "#1a1a1a",
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(10px)",
          borderRadius: 15,
          border: "1px solid rgba(255, 255, 255, 0.1)",
        },
      },
    },
  },
});

const App = () => {
  const [view, setView] = useState("wallet");

  const pageVariants = {
    initial: {
      opacity: 0,
      x: -20,
    },
    animate: {
      opacity: 1,
      x: 0,
    },
    exit: {
      opacity: 0,
      x: 20,
    },
  };

  const getActivePage = () => {
    switch (view) {
      case "wallet":
        return <Analyze />;
      case "live":
        return <LiveAnalysis />;
      case "models":
        return <ModelComparison />;
      default:
        return <Analyze />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      <StarBackground />
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar view={view} setView={setView} />
        <StyledContainer maxWidth="xl">
          <AnimatePresence mode="wait">
            <PageWrapper
              key={view}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.3 }}
            >
              {getActivePage()}
            </PageWrapper>
          </AnimatePresence>
        </StyledContainer>
      </Box>
    </ThemeProvider>
  );
};

export default App;