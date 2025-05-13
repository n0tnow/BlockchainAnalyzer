import React from "react";
import { AppBar, Toolbar, Button, Box, IconButton } from "@mui/material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TimelineIcon from "@mui/icons-material/Timeline";
import BarChartIcon from "@mui/icons-material/BarChart";
import MenuIcon from "@mui/icons-material/Menu";

const StyledAppBar = styled(AppBar)`
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
`;

const NavButton = styled(Button)`
  position: relative;
  margin: 0 1rem;
  padding: 0.8rem 1.5rem;
  color: ${props => props.active === "true" ? "#fff" : "rgba(255, 255, 255, 0.7)"};
  background: ${props => props.active === "true" ? "var(--primary-gradient)" : "transparent"};
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--primary-gradient);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 198, 255, 0.2);
    
    &::before {
      opacity: 0.1;
    }
  }

  .MuiButton-startIcon {
    position: relative;
    z-index: 1;
  }

  .MuiButton-label {
    position: relative;
    z-index: 1;
  }
`;

const Logo = styled(motion.div)`
  font-size: 1.5rem;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--primary-gradient);
    opacity: 0.1;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  &:hover::after {
    transform: translateX(0);
  }
`;

const Navbar = ({ view, setView }) => {
  return (
    <StyledAppBar position="fixed" elevation={0}>
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
          <Logo
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Blockchain Analyzer
          </Logo>
        </Box>

        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2 }}>
          <NavButton
            active={(view === "wallet").toString()}
            onClick={() => setView("wallet")}
            startIcon={
              <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
            }
          >
            Cüzdan Analizi
          </NavButton>
          <NavButton
            active={(view === "live").toString()}
            onClick={() => setView("live")}
            startIcon={
              <TimelineIcon sx={{ fontSize: 20 }} />
            }
          >
            Ağ Analizi
          </NavButton>
          <NavButton
            active={(view === "models").toString()}
            onClick={() => setView("models")}
            startIcon={
              <BarChartIcon sx={{ fontSize: 20 }} />
            }
          >
            Model Karşılaştırması
          </NavButton>
        </Box>

        <IconButton
          sx={{ display: { xs: "flex", md: "none" }, color: "white" }}
          className="pulse"
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Navbar;