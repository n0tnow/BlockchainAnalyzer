import React, { useState, useEffect } from "react";
import { TextField, Button, Box, Paper, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox } from "@mui/material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";

const StyledPaper = styled(Paper)`
  background: var(--card-gradient);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem;
  margin: 2rem 0;
`;

const StyledTextField = styled(TextField)`
  & .MuiOutlinedInput-root {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: white;
    
    &:hover fieldset {
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    &.Mui-focused fieldset {
      border-color: #1a237e;
    }
  }
  
  & .MuiInputLabel-root {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const StyledSelect = styled(Select)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: white;
  
  &:hover {
    & .MuiOutlinedInput-notchedOutline {
      border-color: rgba(255, 255, 255, 0.3);
    }
  }
  
  &.Mui-focused {
    & .MuiOutlinedInput-notchedOutline {
      border-color: #1a237e;
    }
  }
`;

const StyledFormControl = styled(FormControl)`
  & .MuiInputLabel-root {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const StyledButton = styled(Button)`
  background: var(--primary-gradient);
  color: white;
  padding: 0.8rem 2rem;
  border-radius: 8px;
  text-transform: none;
  font-weight: 600;
  transition: all 0.3s ease;
  width: 100%;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 198, 255, 0.3);
  }
`;

const StyledCheckbox = styled(FormControlLabel)`
  & .MuiTypography-root {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const AddressForm = ({ onResult, setLoading }) => {
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [includeML, setIncludeML] = useState(true);
  const [mlAlgorithm, setMlAlgorithm] = useState("isoforest");
  const [availableModels, setAvailableModels] = useState([]);

  // Mevcut modelleri yükle
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/models");
        if (response.data.status === "success") {
          setAvailableModels(response.data.models);
        }
      } catch (error) {
        console.error("Modeller yüklenemedi:", error);
        // API yanıt vermezse varsayılan modelleri ekle
        const defaultModels = [
          { id: "isoforest", name: "Isolation Forest" },
          { id: "ocsvm", name: "One-Class SVM" },
          { id: "lof", name: "Local Outlier Factor" }
        ];
        setAvailableModels(defaultModels);
      }
    };

    fetchModels();
  }, []);

  // ML algoritması değiştiğinde konsola yazdır (debug için)
  useEffect(() => {
    console.log("Seçilen ML algoritması:", mlAlgorithm);
  }, [mlAlgorithm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!address) {
      setError("Lütfen bir adres girin");
      return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError("Geçerli bir Ethereum adresi girin");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/analyze", { 
        address,
        include_ml: includeML,
        ml_algorithm: mlAlgorithm
      });
      onResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Bir hata oluştu");
      onResult({ status: "error", message: err.message });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <StyledPaper elevation={0}>
        <Box component="form" onSubmit={handleSubmit}>
          <StyledTextField
            label="Ethereum Adresi"
            variant="outlined"
            fullWidth
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={!!error}
            helperText={error}
            placeholder="0x..."
            sx={{ mb: 2 }}
          />
          
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} mb={2}>
            <StyledCheckbox
              control={
                <Checkbox 
                  checked={includeML} 
                  onChange={(e) => setIncludeML(e.target.checked)}
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.5)',
                    '&.Mui-checked': {
                      color: '#00c6ff',
                    },
                  }}
                />
              }
              label="ML Analizi Ekle"
            />
            
            {includeML && (
              <StyledFormControl fullWidth variant="outlined">
                <InputLabel id="ml-algorithm-label">ML Algoritması</InputLabel>
                <StyledSelect
                  labelId="ml-algorithm-label"
                  value={mlAlgorithm}
                  onChange={(e) => setMlAlgorithm(e.target.value)}
                  label="ML Algoritması"
                >
                  <MenuItem value="isoforest">Isolation Forest</MenuItem>
                  <MenuItem value="ocsvm">One-Class SVM</MenuItem>
                  <MenuItem value="lof">Local Outlier Factor</MenuItem>
                </StyledSelect>
              </StyledFormControl>
            )}
          </Box>
          
          <StyledButton
            type="submit"
            variant="contained"
            startIcon={<SearchIcon />}
            size="large"
          >
            Analizi Başlat
          </StyledButton>
        </Box>
      </StyledPaper>
    </motion.div>
  );
};

export default AddressForm;