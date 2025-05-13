import React, { useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  
  CircularProgress,
  Chip,
  Divider,
  LinearProgress,
  Tooltip as MuiTooltip,
} from "@mui/material";
import { motion } from "framer-motion";
import styled from "styled-components";
import InfoIcon from "@mui/icons-material/Info";
import AddressForm from "../components/AddressForm";
import TokenAnalysis from "../components/TokenAnalysis";
import {
  LineChart,
  Line,
  BarChart,  // Eklendi
  Bar,       // Eklendi
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const StyledCard = styled(Card)`
  background: var(--card-gradient);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

const MetricValue = styled(Typography)`
  font-size: 2rem;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 1rem 0;
`;

const RiskScoreCircle = styled(Box)`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  background: ${props => {
    if (props.score < 30) return "var(--primary-gradient)";
    if (props.score < 70) return "linear-gradient(135deg, #ffa726 0%, #ff9800 100%)";
    return "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)";
  }};
  color: white;
  box-shadow: 0 4px 20px 0 ${props => {
    if (props.score < 30) return "rgba(0, 198, 255, 0.5)";
    if (props.score < 70) return "rgba(255, 152, 0, 0.5)";
    return "rgba(244, 67, 54, 0.5)";
  }};
`;

// Risk seviyesine göre renk hesaplama
const getRiskColor = (score) => {
  if (score < 30) return "#2196f3";
  if (score < 70) return "#ff9800";
  return "#f44336";
};

const Analyze = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");

  const handleResult = (data) => {
    console.log("API Response:", data); // Debugging için
    setResult(data);
    setLoading(false);
    if (data.status === "success") {
      setAddress(data.address);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  // Anomali skoru görseli
  const renderAnomalyScore = () => {
    if (!result || !result.analysis || !result.analysis.ml_analysis) return null;
    
    const { anomaly_score, risk_level } = result.analysis.ml_analysis;
    
    return (
      <Grid item xs={12} md={6}>
        <StyledCard>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                Anomali Analizi
              </Typography>
              <MuiTooltip 
                title="Bu skor, makine öğrenimi modelinin adresin işlem davranışını ne kadar anormal bulduğunu gösterir. Yüksek skorlar daha şüpheli aktivitelere işaret eder."
                placement="top"
              >
                <InfoIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.7)", cursor: "help" }} />
              </MuiTooltip>
            </Box>
            
            <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
              <RiskScoreCircle score={anomaly_score}>
                <Typography variant="h4" fontWeight="bold">
                  {Math.round(anomaly_score)}
                </Typography>
                <Typography variant="caption">
                  {risk_level} Risk
                </Typography>
              </RiskScoreCircle>
              
              <Box mt={2} textAlign="center">
                <Chip 
                  label={`${result.analysis.ml_analysis.algorithm} Algoritması`} 
                  sx={{ 
                    bgcolor: "rgba(255,255,255,0.1)", 
                    color: "white",
                    mt: 1
                  }} 
                />
              </Box>
              
              <Box mt={3} width="100%">
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Risk Değerlendirmesi
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={anomaly_score} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getRiskColor(anomaly_score)
                    }
                  }} 
                />
                
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="textSecondary">Düşük Risk</Typography>
                  <Typography variant="caption" color="textSecondary">Yüksek Risk</Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>
    );
  };

  // Özellik analizi görseli
  const renderFeatureAnalysis = () => {
    if (!result || !result.analysis || !result.analysis.ml_analysis) return null;
    
    const { features } = result.analysis.ml_analysis;
    
    // Özellik verilerini grafik için hazırla
    const featureData = [
      { name: "İşlem Sayısı", value: features.tx_count },
      { name: "Toplam Gönderim", value: features.total_sent },
      { name: "Ort. Gönderim", value: features.avg_sent },
      { name: "Maks. Gönderim", value: features.max_sent },
      { name: "Farklı Alıcılar", value: features.unique_receivers },
      { name: "Günlük İşlem", value: features.tx_per_day }
    ];
    
    return (
      <Grid item xs={12}>
        <StyledCard>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                Adres Özellikleri
              </Typography>
              <MuiTooltip 
                title="Bu özellikler makine öğrenmesi modelinin adresin anomali skorunu hesaplarken kullandığı değerlerdir."
                placement="top"
              >
                <InfoIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.7)", cursor: "help" }} />
              </MuiTooltip>
            </Box>
            
            <Box height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)' }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.7)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#colorGradient)" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c6ff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0072ff" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>
    );
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ mb: 4 }}
          className="gradient-text"
        >
          Blockchain Analiz Aracı
        </Typography>

        <AddressForm onResult={handleResult} setLoading={setLoading} />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {result && result.status === "success" && (
          <>
            <motion.div variants={itemVariants}>
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <StyledCard>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Temel Metrikler
                      </Typography>
                      <MetricValue>
                        {result.analysis.total_eth_sent} ETH
                      </MetricValue>
                      <Typography color="textSecondary">
                        Toplam İşlem Sayısı: {result.analysis.tx_count}
                      </Typography>
                    </CardContent>
                  </StyledCard>
                </Grid>

                {/* Anomali Analizi Kartı */}
                {renderAnomalyScore()}

                <Grid item xs={12} md={6}>
                  <StyledCard>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        İşlem Değeri Analizi
                      </Typography>
                      <MetricValue>
                        {result.analysis.avg_transaction_value} ETH
                      </MetricValue>
                      <Typography color="textSecondary">
                        Ortalama İşlem Değeri
                      </Typography>
                    </CardContent>
                  </StyledCard>
                </Grid>

                <Grid item xs={12} md={12}>
                  <StyledCard>
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" gutterBottom>
                          Anomaliler
                        </Typography>
                        <MuiTooltip 
                          title="Bu grafik işlem değerlerini gösterir. Yüksek değerli işlemler potansiyel anomalileri işaret eder."
                          placement="top"
                        >
                          <InfoIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.7)", cursor: "help" }} />
                        </MuiTooltip>
                      </Box>
                      <Box sx={{ height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={result.analysis.anomalies.high_value_txs}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="timestamp" tick={{ fill: 'rgba(255,255,255,0.7)' }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.7)' }} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(0,0,0,0.8)', 
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px'
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              name="ETH Değeri"
                              stroke="#8884d8"
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                      <Typography variant="caption" color="textSecondary" align="center" sx={{ display: 'block', mt: 1 }}>
                        Yüksek Değerli İşlemler (ETH)
                      </Typography>
                    </CardContent>
                  </StyledCard>
                </Grid>

                {/* Özellik Analizi Kartı */}
                {renderFeatureAnalysis()}
              </Grid>
            </motion.div>

            {address && <TokenAnalysis address={address} />}
          </>
        )}
      </Container>
    </motion.div>
  );
};

export default Analyze;