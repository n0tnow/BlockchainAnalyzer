import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from "@mui/material";
import { motion } from "framer-motion";
import styled from "styled-components";
import axios from "axios";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const StyledCard = styled(Card)`
  background: var(--card-gradient);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease;
  height: 100%;

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
  margin: 0.5rem 0;
`;

const ModelBadge = styled(Box)`
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.8rem;
  background: ${props => props.color || "rgba(255, 255, 255, 0.1)"};
  color: white;
  display: inline-block;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
`;

// Renk paleti
const COLORS = ["#00C6FF", "#7928CA", "#FF9800", "#00BFA5", "#F44336"];
const MODEL_COLORS = {
  "isoforest": "#00C6FF",
  "ocsvm": "#7928CA",
  "lof": "#FF9800"
};

// Veri formatını düzenleyen yardımcı fonksiyon
const formatMetricValue = (value) => {
  if (value === undefined || value === null) return '-';
  if (typeof value === 'string') return value;
  
  return value.toFixed(4);
};

const ModelComparison = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [models, setModels] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Modelleri getir
        const modelsResponse = await axios.get("http://localhost:5000/api/models");
        if (modelsResponse.data.status === "success") {
          setModels(modelsResponse.data.models);
        }
        
        // Model karşılaştırma verilerini getir
        const comparisonResponse = await axios.get("http://localhost:5000/api/models/compare");
        if (comparisonResponse.data.status === "success") {
          setComparisonData(comparisonResponse.data.comparison_data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Veri getirme hatası:", err);
        setError("Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Tüm metrikleri karşılaştırma tablosu
  const renderMetricsTable = () => {
    if (!comparisonData || !comparisonData.metrics) return null;
    
    const metrics = comparisonData.metrics;
    const metricNames = {
      "silhouette_score": "Silhouette Skoru",
      "calinski_harabasz_score": "Calinski-Harabasz Skoru",
      "anomaly_ratio": "Anomali Oranı",
      "training_time": "Eğitim Süresi (sn)",
      "accuracy": "Doğruluk",
      "f1_score": "F1 Skoru"
    };
    
    const metricExplanations = {
      "silhouette_score": "Kümelemenin kalitesini -1 ile 1 arasında değerlendiren bir ölçüm. Yüksek değerler daha iyi kümeleme/ayrım anlamına gelir.",
      "calinski_harabasz_score": "Küme yoğunluğunun ve ayrımının bir ölçüsü. Yüksek değerler daha iyi kümeleme anlamına gelir.",
      "anomaly_ratio": "Modelin tespit ettiği anomali oranı. Genellikle veri setindeki gerçek anomali oranına yakın olması beklenir.",
      "training_time": "Modelin eğitim süresi (saniye). Düşük değerler daha hızlı eğitim anlamına gelir.",
      "accuracy": "Doğru tahmin edilen örneklerin tüm örneklere oranı.",
      "f1_score": "Hassasiyet ve duyarlılığın harmonik ortalaması. Sınıf dengesizliği durumunda accuracy'den daha iyi bir ölçüttür."
    };
    
    return (
      <TableContainer component={Paper} sx={{ mt: 3, bgcolor: 'rgba(0,0,0,0.2)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Metrik</strong></TableCell>
              {Object.keys(metrics.silhouette_score).map(modelName => (
                <TableCell key={modelName} align="right">
                  <Box sx={{ color: MODEL_COLORS[modelName] || 'white' }}>
                    <strong>{modelName}</strong>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(metrics).map(metricKey => (
              <TableRow key={metricKey} 
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    cursor: 'help'
                  }
                }}
                title={metricExplanations[metricKey] || ''}
              >
                <TableCell component="th" scope="row">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {metricNames[metricKey] || metricKey}
                    <Box
                      component="div"
                      sx={{
                        display: 'inline-block',
                        ml: 1,
                        px: 0.8,
                        py: 0.4,
                        fontSize: '0.7rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      {metricKey === 'silhouette_score' || metricKey === 'calinski_harabasz_score' || 
                       metricKey === 'accuracy' || metricKey === 'f1_score' ? 
                        'Yüksek = İyi' : 
                        metricKey === 'training_time' ? 'Düşük = İyi' : 'Bilgi'}
                    </Box>
                  </Box>
                </TableCell>
                {Object.keys(metrics.silhouette_score).map(modelName => (
                  <TableCell key={modelName} align="right">
                    {formatMetricValue(metrics[metricKey][modelName])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Performans metrikleri radar grafiği
  const renderRadarChart = () => {
    if (!comparisonData || !comparisonData.metrics) return null;
    
    const metrics = comparisonData.metrics;
    const radarData = [];
    
    // Her metrik için veri oluştur
    const metricNames = {
      "silhouette_score": "Silhouette",
      "accuracy": "Doğruluk",
      "f1_score": "F1 Skoru"
    };
    
    const metricExplanations = {
      "silhouette_score": "Silhouette skoru, kümeleme kalitesini ölçen bir değerdir. -1 ile 1 arasında değişir. Yüksek değerler, veri noktalarının kendi kümelerine iyi uyduğunu ve diğer kümelerden iyi ayrıldığını gösterir. Anomali tespitinde, yüksek bir silhouette skoru normal ve anormal örneklerin iyi ayrıldığını gösterir.",
      "accuracy": "Modelin doğru tahmin ettiği örneklerin tüm örneklere oranıdır. 0 ile 1 arasında değişir, daha yüksek değerler daha iyi performansı gösterir.",
      "f1_score": "Hassasiyet (precision) ve duyarlılık (recall) değerlerinin harmonik ortalamasıdır. 0 ile 1 arasında değişir, daha yüksek değerler daha iyi performansı gösterir."
    };
    
    Object.keys(metricNames).forEach(metric => {
      const metricData = { 
        name: metricNames[metric], 
        explanation: metricExplanations[metric]
      };
      Object.keys(metrics[metric]).forEach(model => {
        metricData[model] = metrics[metric][model];
      });
      radarData.push(metricData);
    });
    
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom align="center">
          Model Performans Karşılaştırması
        </Typography>
        
        <Typography variant="body2" color="textSecondary" mb={2} align="center">
          Radar grafiği, her bir modelin farklı performans metriklerindeki başarısını gösterir. 
          Tüm metrikler 0-1 arasında normalize edilmiştir ve yüksek değerler daha iyi performansı gösterir.
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1, 
            justifyContent: 'center',
            mb: 2 
          }}
        >
          {Object.keys(metricNames).map(metric => (
            <Box 
              key={metric} 
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                borderRadius: 2, 
                p: 1.5,
                maxWidth: 300
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                {metricNames[metric]}
              </Typography>
              <Typography variant="caption">
                {metricExplanations[metric]}
              </Typography>
            </Box>
          ))}
        </Box>
        
        <Box height={400}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart outerRadius={150} data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.2)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: 'white' }} />
              <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: 'white' }} />
              
              {Object.keys(metrics.silhouette_score).map((model, index) => (
                <Radar 
                  key={model}
                  name={model} 
                  dataKey={model} 
                  stroke={MODEL_COLORS[model] || COLORS[index % COLORS.length]} 
                  fill={MODEL_COLORS[model] || COLORS[index % COLORS.length]} 
                  fillOpacity={0.5} 
                  strokeWidth={2}
                />
              ))}
              
              <Legend />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
                formatter={(value, name, props) => {
                  return [`${value.toFixed(4)}`, `${name} (${props.payload.name})`];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    );
  };

  // Anomali sayıları karşılaştırma grafiği
  const renderAnomalyCountChart = () => {
    if (!comparisonData || !comparisonData.anomaly_counts) return null;
    
    const anomalyCounts = comparisonData.anomaly_counts;
    const data = Object.keys(anomalyCounts).map(model => ({
      model: model,
      count: anomalyCounts[model]
    }));
    
    return (
      <Box height={350} mt={4}>
        <Typography variant="h6" gutterBottom align="center">
          Tespit Edilen Anomali Sayıları
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="model" tick={{ fill: 'white' }} />
            <YAxis tick={{ fill: 'white' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px'
              }}
            />
            <Bar 
              dataKey="count" 
              fill="url(#anomalyCountGradient)"
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={MODEL_COLORS[entry.model] || COLORS[index % COLORS.length]} 
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="anomalyCountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00c6ff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0072ff" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  // Confusion matrix görselleştirmesi
  const renderConfusionMatrix = () => {
    if (!comparisonData || !comparisonData.confusion_matrix) return null;
    
    const confusionMatrices = comparisonData.confusion_matrix;
    
    return (
      <Grid container spacing={3} mt={2}>
        {Object.keys(confusionMatrices).map(model => (
          <Grid item xs={12} md={4} key={model}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" align="center" gutterBottom>
                  {model} Confusion Matrix
                </Typography>
                
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  justifyContent="center"
                  sx={{ mt: 2 }}
                >
                  <Box 
                    display="grid" 
                    gridTemplateColumns="repeat(2, 1fr)" 
                    gridTemplateRows="repeat(2, 1fr)"
                    sx={{ 
                      width: 200, 
                      height: 200, 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 1
                    }}
                  >
                    {confusionMatrices[model].map((row, i) => 
                      row.map((value, j) => (
                        <Box 
                          key={`${i}-${j}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: `rgba(${i === j ? '0, 198, 255' : '244, 67, 54'}, ${value / 10000})`,
                            border: '1px solid rgba(255,255,255,0.1)',
                            p: 2,
                            position: 'relative'
                          }}
                        >
                          <Typography variant="h6" fontWeight="bold">
                            {value}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" width="100%" mt={2}>
                    <Box textAlign="center">
                      <Typography variant="body2" color="textSecondary">Gerçek</Typography>
                      <Box display="flex" mt={1}>
                        <Box 
                          width={15} 
                          height={15} 
                          bgcolor="rgba(0, 198, 255, 0.5)" 
                          mr={1} 
                          borderRadius={1} 
                        />
                        <Typography variant="caption">Normal</Typography>
                      </Box>
                      <Box display="flex" mt={0.5}>
                        <Box 
                          width={15} 
                          height={15} 
                          bgcolor="rgba(244, 67, 54, 0.5)" 
                          mr={1} 
                          borderRadius={1} 
                        />
                        <Typography variant="caption">Anomali</Typography>
                      </Box>
                    </Box>
                    
                    <Box textAlign="center">
                      <Typography variant="body2" color="textSecondary">Tahmin</Typography>
                      <Box display="flex" mt={1}>
                        <Box 
                          width={15} 
                          height={15} 
                          bgcolor="rgba(0, 198, 255, 0.5)" 
                          mr={1} 
                          borderRadius={1} 
                        />
                        <Typography variant="caption">Normal</Typography>
                      </Box>
                      <Box display="flex" mt={0.5}>
                        <Box 
                          width={15} 
                          height={15} 
                          bgcolor="rgba(244, 67, 54, 0.5)" 
                          mr={1} 
                          borderRadius={1} 
                        />
                        <Typography variant="caption">Anomali</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Özellik önemleri grafiği
  const renderFeatureImportance = () => {
    if (!comparisonData || !comparisonData.feature_importance) return null;
    
    // Tüm algoritmaların özellik önemlerini alın
    const allAlgorithmData = {};
    let hasAnyData = false;
    
    // Her algoritma için veri var mı kontrol et
    Object.keys(MODEL_COLORS).forEach(algo => {
      if (comparisonData.feature_importance[algo]) {
        allAlgorithmData[algo] = comparisonData.feature_importance[algo];
        hasAnyData = true;
      }
    });
    
    if (!hasAnyData) return null;
    
    const featureNames = {
      'tx_count': 'İşlem Sayısı',
      'total_sent': 'Toplam Gönderilen',
      'avg_sent': 'Ortalama Gönderilen',
      'max_sent': 'Maksimum Gönderilen',
      'unique_receivers': 'Benzersiz Alıcılar',
      'tx_per_day': 'Günlük İşlem'
    };
    
    // Tüm özellikler için karşılaştırmalı grafik oluştur
    const combinedData = [];
    
    // İlk algoritmanın özelliklerini alarak başlayalım (tüm algoritmalar aynı özelliklere sahip olmalıdır)
    const firstAlgo = Object.keys(allAlgorithmData)[0];
    
    if (allAlgorithmData[firstAlgo]) {
      // Her bir özellik için bir satır oluştur
      allAlgorithmData[firstAlgo].forEach(feature => {
        const featureData = {
          featureName: feature.feature,
          featureLabel: featureNames[feature.feature] || feature.feature
        };
        
        // Her algoritma için o özelliğin önemini ekle
        Object.keys(allAlgorithmData).forEach(algo => {
          const algoFeature = allAlgorithmData[algo].find(f => f.feature === feature.feature);
          featureData[algo] = algoFeature ? algoFeature.importance : 0;
        });
        
        combinedData.push(featureData);
      });
      
      // Önem sıralamasına göre sırala
      combinedData.sort((a, b) => {
        // Tüm algoritmaların ortalamasına göre sırala
        const aAvg = Object.keys(allAlgorithmData).reduce((sum, algo) => sum + a[algo], 0) / Object.keys(allAlgorithmData).length;
        const bAvg = Object.keys(allAlgorithmData).reduce((sum, algo) => sum + b[algo], 0) / Object.keys(allAlgorithmData).length;
        return bAvg - aAvg;
      });
    }
    
    return (
      <Box mt={4}>
        <Typography variant="h6" gutterBottom align="center">
          Algoritmalara Göre Özellik Önem Karşılaştırması
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph align="center">
          Farklı algoritmaların özellik önem değerlerinin karşılaştırması. Yüksek değerler, o özelliğin anomali tespitinde daha etkili olduğunu gösterir.
        </Typography>
        
        <Box height={400} mt={2}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={combinedData} 
              layout="vertical"
              margin={{ left: 120, right: 30, top: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                type="number" 
                tick={{ fill: 'white' }} 
                domain={[0, 0.35]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <YAxis 
                type="category" 
                dataKey="featureLabel" 
                tick={{ fill: 'white' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
                formatter={(value, name, props) => [
                  `${(value * 100).toFixed(1)}%`, 
                  `${name}`
                ]}
              />
              <Legend />
              
              {Object.keys(allAlgorithmData).map((algo, index) => (
                <Bar 
                  key={algo}
                  dataKey={algo} 
                  name={algo === "isoforest" ? "Isolation Forest" : 
                       algo === "ocsvm" ? "One-Class SVM" : 
                       algo === "lof" ? "Local Outlier Factor" : algo}
                  fill={MODEL_COLORS[algo] || COLORS[index % COLORS.length]}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Box>
        
        {/* İzole edilmiş görselleştirmeler (sadece bir algoritma göster) */}
        <Grid container spacing={3} mt={2}>
          {Object.keys(allAlgorithmData).map((algo, index) => (
            <Grid item xs={12} md={4} key={algo}>
              <StyledCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom align="center">
                    {algo === "isoforest" ? "Isolation Forest" : 
                     algo === "ocsvm" ? "One-Class SVM" : 
                     algo === "lof" ? "Local Outlier Factor" : algo}
                  </Typography>
                  
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart 
                      data={[...allAlgorithmData[algo]].sort((a, b) => b.importance - a.importance)} 
                      layout="vertical"
                      margin={{ left: 100, right: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        type="number" 
                        tick={{ fill: 'white' }} 
                        domain={[0, Math.max(...allAlgorithmData[algo].map(d => d.importance)) * 1.1]}
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="feature" 
                        tick={{ fill: 'white' }}
                        tickFormatter={(value) => featureNames[value] || value}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.8)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px'
                        }}
                        formatter={(value, name, props) => [
                          `${(value * 100).toFixed(1)}%`, 
                          featureNames[props.payload.feature] || props.payload.feature
                        ]}
                      />
                      <Bar 
                        dataKey="importance" 
                        fill={MODEL_COLORS[algo]}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </StyledCard>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{ mb: 2 }}
        className="gradient-text"
      >
        Model Karşılaştırması
      </Typography>
      
      <Typography
        variant="body1"
        align="center"
        color="textSecondary"
        paragraph
        sx={{ mb: 4 }}
      >
        Anomali tespit modellerinin performans karşılaştırması ve analizi
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} centered sx={{ mb: 4 }}>
        <Tab label="Performans Metrikleri" />
        <Tab label="Confusion Matrix" />
        <Tab label="Özellik Analizi" />
      </Tabs>

      {/* Model Kartları */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {models.map((model, index) => (
          <Grid item xs={12} md={4} key={model.id}>
            <StyledCard>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6">
                    {model.name}
                  </Typography>
                  <ModelBadge color={MODEL_COLORS[model.id]}>
                    {model.id}
                  </ModelBadge>
                </Box>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  {model.description}
                </Typography>
                
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        mb: 0.5
                      }}
                      title="Silhouette skoru, kümeleme/sınıflandırma kalitesini ölçer. -1 ile 1 arasında değişir. Yüksek değer daha iyi ayrımı gösterir."
                    >
                      <Typography variant="body2" color="textSecondary">
                        Silhouette Skoru
                      </Typography>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          ml: 1,
                          px: 0.6,
                          py: 0.2,
                          fontSize: '0.65rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: 'success.main'
                        }}
                      >
                        Yüksek = İyi
                      </Box>
                    </Box>
                    <MetricValue>
                      {formatMetricValue(model.metrics?.silhouette_score)}
                    </MetricValue>
                  </Grid>
                  <Grid item xs={6}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        mb: 0.5
                      }}
                      title="Doğruluk (Accuracy): Doğru tahmin edilen örneklerin toplam örnek sayısına oranı."
                    >
                      <Typography variant="body2" color="textSecondary">
                        Doğruluk
                      </Typography>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          ml: 1,
                          px: 0.6,
                          py: 0.2,
                          fontSize: '0.65rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: 'success.main'
                        }}
                      >
                        Yüksek = İyi
                      </Box>
                    </Box>
                    <MetricValue>
                      {formatMetricValue(model.metrics?.accuracy)}
                    </MetricValue>
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          </Grid>
        ))}
      </Grid>

      {/* Metrik Tab İçeriği */}
      {activeTab === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <StyledCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Metrik Karşılaştırması
                  </Typography>
                  
                  {renderMetricsTable()}
                  
                  {renderRadarChart()}
                  
                  {renderAnomalyCountChart()}
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {/* Confusion Matrix Tab İçeriği */}
      {activeTab === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {renderConfusionMatrix()}
        </motion.div>
      )}

      {/* Özellik Analizi Tab İçeriği */}
      {activeTab === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Özellik Analizi ve Önem Sıralaması
              </Typography>
              
              <Typography variant="body2" color="textSecondary" paragraph>
                Anomali tespitinde hangi özellikler daha etkili? Bu analiz, fraud tespitinin arkasındaki mekanizmayı anlamanıza yardımcı olur.
              </Typography>
              
              {renderFeatureImportance()}
            </CardContent>
          </StyledCard>
        </motion.div>
      )}
    </Container>
  );
};

export default ModelComparison;