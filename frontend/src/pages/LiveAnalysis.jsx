import React, { useEffect, useState } from "react";
import { Container, Typography, Card, CardContent, List, ListItem, ListItemText, CircularProgress, Box, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails, ExpandMore, Button } from "@mui/material";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const anomalyExplanations = {
  high_value_transactions: {
    title: "Yüksek Değerli İşlemler",
    description: "Ağda olağan dışı yüksek miktarda transferler tespit edildi. Bu tür işlemler genellikle borsa transferleri, balina hareketleri veya potansiyel kara para aklama girişimleriyle ilişkilendirilebilir.",
    solution: "Bu adresleri izlemeye alın, transferlerin kaynağını ve amacını araştırın. Şüpheli durumlarda ilgili otoritelerle iletişime geçin.",
    reference: "https://arxiv.org/abs/1803.07447"
  },
  isolated_nodes: {
    title: "İzole Adresler",
    description: "Ağda başka adreslerle bağlantısı olmayan izole adresler bulundu. Bu adresler genellikle tek seferlik transferler veya spam işlemler için kullanılır.",
    solution: "Bu adreslerin işlem geçmişini inceleyin. Tek seferlik veya düşük hacimli işlemler genellikle düşük risklidir, ancak toplu spam için de kullanılabilir.",
    reference: "https://ieeexplore.ieee.org/document/8418611"
  },
  temporal_analysis: {
    title: "Zaman Bazlı Anomaliler",
    description: "Ağda kısa sürede olağan dışı işlem yoğunluğu tespit edildi. Bu durum genellikle bot aktiviteleri, airdrop saldırıları veya flash loan saldırılarıyla ilişkilendirilebilir.",
    solution: "Yoğunluğun yaşandığı zaman aralığındaki işlemleri detaylı inceleyin. Şüpheli adresleri kara listeye alın veya izlemeye alın.",
    reference: "https://dl.acm.org/doi/10.1145/3319535.3360670"
  }
};

const mlAnomalySolution = "Bu adres, makine öğrenmesi tabanlı anomali tespiti ile olağan dışı davranış sergilediği için işaretlenmiştir. Lütfen adresin işlem geçmişini detaylı inceleyin, büyük transferler veya alışılmadık sıklıkta işlemler varsa dikkatli olun.";

const mlAlgoInfo = {
  isoforest: {
    name: "Isolation Forest",
    desc: "Yüksek boyutlu veride hızlı ve etkili anomali tespiti için kullanılır. Her veri noktasını izole etmeye çalışır.",
    ref: "https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html"
  },
  dbscan: {
    name: "DBSCAN",
    desc: "Yoğunluk tabanlı kümeleme algoritmasıdır. Düşük yoğunluklu noktaları anomali olarak işaretler.",
    ref: "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.DBSCAN.html"
  },
  lof: {
    name: "Local Outlier Factor (LOF)",
    desc: "Her noktanın komşularına göre anomali olup olmadığını belirler.",
    ref: "https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.LocalOutlierFactor.html"
  },
  ocsvm: {
    name: "One-Class SVM",
    desc: "Sadece 'normal' verilerle eğitilip, anormal noktaları tespit eder.",
    ref: "https://scikit-learn.org/stable/modules/generated/sklearn.svm.OneClassSVM.html"
  }
};

const featureDescriptions = {
  burstiness: "Burstiness: İşlemlerin zamansal yoğunluğunu gösterir. Yüksekse, adres kısa sürede çok sayıda işlem yapmış demektir.",
  tx_per_day: "Günlük Ortalama İşlem: Adresin günde ortalama kaç işlem yaptığı.",
  total_sent: "Toplam Gönderilen ETH: Adresten toplamda gönderilen ETH miktarı.",
  avg_sent: "Ortalama Gönderim: Her işlemde ortalama gönderilen ETH miktarı.",
  max_sent: "Maksimum Gönderim: Tek bir işlemde gönderilen en yüksek ETH miktarı."
};

const LiveAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState(null);
  const [anomalyError, setAnomalyError] = useState(null);
  const [mlAnomalies, setMlAnomalies] = useState(null);
  const [mlAnomalyError, setMlAnomalyError] = useState(null);
  const [mlAlgo, setMlAlgo] = useState('isoforest');
  const [mlAllResults, setMlAllResults] = useState(null);
  const [mlAllError, setMlAllError] = useState(null);
  const [featureDist, setFeatureDist] = useState(null);
  const [featureDistError, setFeatureDistError] = useState(null);
  const [datasetType, setDatasetType] = useState('');
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [availableDatasets, setAvailableDatasets] = useState([]);

  // Function to load available datasets
  useEffect(() => {
    // Get available datasets
    axios.get(`http://localhost:5000/api/graph-analysis`)
      .then((res) => {
        if (res.data.status === "success" && res.data.data && res.data.data.available_datasets) {
          setAvailableDatasets(res.data.data.available_datasets);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Veri setleri yüklenirken hata:", err.response?.data?.message || err.message);
        setLoading(false);
      });
  }, []);

  const loadData = () => {
    if (!datasetType) return;
    
    setLoading(true);
    setAnomalyError(null);
    setMlAnomalyError(null);
    setFeatureDistError(null);
    setMlAllError(null);
    
    // Graph data
    axios.get(`http://localhost:5000/api/graph-analysis?dataset_type=${datasetType}&load_data=true`)
      .then((res) => {
        setData(res.data.graph);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        console.error("Veri yüklenirken hata:", err.response?.data?.message || err.message);
        // Specific error message to help with debugging
        if (err.response?.data?.message) {
          alert(`Hata: ${err.response.data.message}`);
        }
      });
    
    // Anomalies data
    axios.get(`http://localhost:5000/api/anomalies?dataset_type=${datasetType}&load_data=true`)
      .then((res) => {
        setAnomalies(res.data.anomalies);
        setDatasetInfo(res.data.dataset_info || null);
      })
      .catch((err) => {
        setAnomalyError(`Anomali verisi yüklenemedi: ${err.response?.data?.message || err.message}`);
      });
    
    // All ML algorithms
    axios.get(`http://localhost:5000/api/ml-anomalies?all=true&dataset_type=${datasetType}&load_data=true`)
      .then((res) => {
        setMlAllResults(res.data.all_anomalies);
      })
      .catch((err) => {
        setMlAllError(`Tüm algoritmaların sonuçları yüklenemedi: ${err.response?.data?.message || err.message}`);
      });
      
    // ML anomalies for specific algorithm
    axios.get(`http://localhost:5000/api/ml-anomalies?algo=${mlAlgo}&dataset_type=${datasetType}&load_data=true`)
      .then((res) => {
        setMlAnomalies(res.data.anomalies);
      })
      .catch((err) => {
        setMlAnomalies(null);
        setMlAnomalyError(`ML tabanlı anomali verisi yüklenemedi: ${err.response?.data?.message || err.message}`);
        console.error("ML anomali verisi yüklenirken hata:", err);
      });
      
    // Feature distributions
    axios.get(`http://localhost:5000/api/ml-feature-distribution?algo=${mlAlgo}&dataset_type=${datasetType}&load_data=true`)
      .then((res) => {
        setFeatureDist(res.data.features);
      })
      .catch((err) => {
        setFeatureDist(null);
        setFeatureDistError(`Öznitelik dağılımı verisi yüklenemedi: ${err.response?.data?.message || err.message}`);
        console.error("Öznitelik dağılımı yüklenirken hata:", err);
      });
  };

  // Don't automatically load data when dataset type changes
  // Only load when loadData is explicitly called

  useEffect(() => {
    // Only handle ML algorithm changes if a dataset is already loaded
    if (data && datasetType) {
      axios.get(`http://localhost:5000/api/ml-anomalies?algo=${mlAlgo}&dataset_type=${datasetType}&load_data=true`)
        .then((res) => {
          setMlAnomalies(res.data.anomalies);
        })
        .catch((err) => {
          setMlAnomalies(null);
          setMlAnomalyError(`ML tabanlı anomali verisi yüklenemedi: ${err.response?.data?.message || err.message}`);
          console.error("ML anomali verisi yüklenirken hata:", err);
        });
        
      axios.get(`http://localhost:5000/api/ml-feature-distribution?algo=${mlAlgo}&dataset_type=${datasetType}&load_data=true`)
        .then((res) => {
          setFeatureDist(res.data.features);
        })
        .catch((err) => {
          setFeatureDist(null);
          setFeatureDistError(`Öznitelik dağılımı verisi yüklenemedi: ${err.response?.data?.message || err.message}`);
          console.error("Öznitelik dağılımı yüklenirken hata:", err);
        });
    }
  }, [mlAlgo, data, datasetType]);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;

  if (!data) {
    if (availableDatasets.length > 0) {
      return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom align="center">Ağ Analizi</Typography>
          
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 2 }}>
            <FormControl sx={{ minWidth: 250 }} size="small">
              <InputLabel id="dataset-type-label">Veri Seti</InputLabel>
              <Select
                labelId="dataset-type-label"
                value={datasetType}
                label="Veri Seti"
                onChange={e => setDatasetType(e.target.value)}
              >
                {availableDatasets.map(dataset => (
                  <MenuItem key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button 
              variant="contained" 
              color="primary"
              onClick={loadData}
              disabled={!datasetType}
            >
              Veri Yükle
            </Button>
          </Box>
          
          <Card sx={{ maxWidth: 600, mx: 'auto', mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                Analiz için bir veri seti seçin ve "Veri Yükle" düğmesine tıklayın
              </Typography>
              <Typography variant="body2" align="center" color="textSecondary">
                Veri seti yüklendikten sonra ağ analizi ve anomali tespiti sonuçları görüntülenecektir.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      );
    }
    
    return (
      <Box sx={{ mt: 4, p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2, display: 'inline-flex' }}>Veri yüklenemedi</Alert>
        <Typography>
          Lütfen şunları kontrol edin:
        </Typography>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>Backend servisinin çalıştığından emin olun (http://localhost:5000)</li>
          <li>Elliptic veri seti dosyalarının mevcut olduğundan emin olun</li>
          <li>Konsolu açın ve hata mesajlarını kontrol edin (F12)</li>
        </ul>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Sayfayı Yenile
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom align="center">Ağ Analizi</Typography>
      
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 250 }} size="small">
            <InputLabel id="dataset-type-label">Veri Seti</InputLabel>
            <Select
              labelId="dataset-type-label"
              value={datasetType}
              label="Veri Seti"
              onChange={e => setDatasetType(e.target.value)}
            >
              {availableDatasets.map(dataset => (
                <MenuItem key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={loadData}
            disabled={!datasetType}
          >
            Veri Yükle
          </Button>
        </Box>
        
        {datasetInfo && (
          <Box>
            <Typography variant="body2" color="textSecondary">
              Düğüm Sayısı: {datasetInfo.node_count} | Kenar Sayısı: {datasetInfo.edge_count}
              {datasetInfo.type === 'elliptic' && (
                <> | İllegal: {datasetInfo.illicit_count} | Legal: {datasetInfo.licit_count} | Bilinmiyor: {datasetInfo.unknown_count}</>
              )}
            </Typography>
          </Box>
        )}
      </Box>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Genel Bilgiler</Typography>
          <Typography>Düğüm Sayısı: {data.node_count}</Typography>
          <Typography>Kenar Sayısı: {data.edge_count}</Typography>
          {datasetType === 'elliptic' && data.class_distribution && (
            <>
              <Typography variant="h6" sx={{ mt: 2 }}>Elliptic Sınıf Dağılımı</Typography>
              <Typography>İllegal İşlemler: {data.class_distribution.illicit}</Typography>
              <Typography>Legal İşlemler: {data.class_distribution.licit}</Typography>
              <Typography>Sınıflandırılmamış: {data.class_distribution.unknown}</Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6">En Yoğun 5 Adres</Typography>
          <List>
            {Array.isArray(data.top_degree) && data.top_degree.length > 0 ? (
              data.top_degree.map(([address, degree], i) => (
                <ListItem key={i}>
                  <ListItemText
                    primary={address}
                    secondary={`Bağlantı Sayısı: ${degree}`}
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="Veri bulunamadı." />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      <Box mt={4}>
        <Typography variant="h5" gutterBottom>Anomali Analizi & Çözüm Önerileri</Typography>
        {anomalyError && <Alert severity="error">{anomalyError}</Alert>}
        {anomalies && Object.entries(anomalies).map(([key, value], idx) => (
          <Card sx={{ mb: 3 }} key={key}>
            <CardContent>
              <Typography variant="h6" color="error.main">{anomalyExplanations[key]?.title || key}</Typography>
              <Typography color="textSecondary" sx={{ mb: 1 }}>{anomalyExplanations[key]?.description}</Typography>
              {Array.isArray(value) && value.length > 0 ? (
                <List sx={{ mb: 1 }}>
                  {value.slice(0, 5).map((item, i) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={item.from ? `${item.from} → ${item.to}` : item}
                        secondary={item.value ? `Değer: ${item.value}` : null}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">Anomali bulunamadı.</Typography>
              )}
              <Typography color="info.main" sx={{ mb: 1 }}><b>Çözüm:</b> {anomalyExplanations[key]?.solution}</Typography>
              {anomalyExplanations[key]?.reference && (
                <Typography variant="caption">Kaynak: <a href={anomalyExplanations[key].reference} target="_blank" rel="noopener noreferrer">{anomalyExplanations[key].reference}</a></Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box mt={4}>
        <Typography variant="h5" gutterBottom>ML Tabanlı Anomali Analizi</Typography>
        <FormControl sx={{ minWidth: 220, mb: 2 }} size="small">
          <InputLabel id="ml-algo-label">Algoritma</InputLabel>
          <Select
            labelId="ml-algo-label"
            value={mlAlgo}
            label="Algoritma"
            onChange={e => setMlAlgo(e.target.value)}
          >
            <MenuItem value="isoforest">Isolation Forest</MenuItem>
            <MenuItem value="dbscan">DBSCAN</MenuItem>
            <MenuItem value="lof">Local Outlier Factor</MenuItem>
            <MenuItem value="ocsvm">One-Class SVM</MenuItem>
          </Select>
        </FormControl>
        <Box mb={2}>
          <Typography variant="subtitle1" color="primary"><b>{mlAlgoInfo[mlAlgo].name}</b></Typography>
          <Typography variant="body2" color="textSecondary">{mlAlgoInfo[mlAlgo].desc}</Typography>
          <Typography variant="caption">Kaynak: <a href={mlAlgoInfo[mlAlgo].ref} target="_blank" rel="noopener noreferrer">{mlAlgoInfo[mlAlgo].ref}</a></Typography>
        </Box>
        {mlAnomalyError && <Alert severity="error">{mlAnomalyError}</Alert>}
        {mlAnomalies && mlAnomalies.length > 0 ? (
          <Box>
            {mlAnomalies.map((row, i) => {
              // Validate anomaly score property
              const hasValidScore = row && 
                typeof row === 'object' && 
                'anomaly_score' in row && 
                typeof row.anomaly_score === 'number' && 
                !isNaN(row.anomaly_score);
              
              const anomalyScore = hasValidScore 
                ? row.anomaly_score.toFixed(2)
                : 'N/A';
                
              return (
                <Accordion key={i} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{row.from || 'Bilinmeyen'}</Typography>
                      <Typography variant="body2" color="primary">Anomali Skoru: {anomalyScore}</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Table size="small">
                      <TableBody>
                        {row && typeof row === 'object' ? (
                          Object.entries(row).map(([k, v]) => {
                            if (k !== 'from' && k !== 'anomaly_score' && k !== 'is_anomaly') {
                              return (
                                <TableRow key={k}>
                                  <TableCell>{k}</TableCell>
                                  <TableCell>
                                    {typeof v === 'number' ? v.toFixed(2) : 
                                     v === null || v === undefined ? 'N/A' : 
                                     typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return null;
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2}>
                              <Alert severity="warning">Detaylı bilgiler yüklenemiyor</Alert>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <Box mt={2}>
                      <Typography variant="body2" color="textSecondary">
                        <b>Neden Anomali?</b> {datasetType === 'elliptic' ? 
                          'Bu işlem, Elliptic veri setinde illegal olarak işaretlenmiştir. Bu tür işlemler genellikle kara para aklama, dolandırıcılık veya yasadışı ticaret ile ilişkilendirilmiştir.' : 
                          'Bu adres, öznitelik değerleri bakımından diğer adreslerden önemli ölçüde farklılık göstermektedir. Özellikle yüksek işlem sayısı, olağan dışı toplam gönderim, yüksek burstiness veya uzun bekleme süreleri gibi faktörler anomali olarak işaretlenmesine sebep olmuş olabilir.'}
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        ) : (
          <Typography color="textSecondary">ML tabanlı anomali bulunamadı.</Typography>
        )}
        <Alert severity="info" sx={{ mt: 2 }}>{mlAnomalySolution}</Alert>
      </Box>

      {mlAllResults && (
        <Box mt={6}>
          <Typography variant="h5" gutterBottom>Algoritmalar Arası Karşılaştırma</Typography>
          {/* Bar chart: Her algoritmanın bulduğu anomali sayısı */}
          <Box sx={{ width: '100%', height: 300, mb: 3 }}>
            <ResponsiveContainer>
              <BarChart data={
                typeof mlAllResults === 'object' && mlAllResults !== null
                  ? Object.entries(mlAllResults)
                      .filter(([algo, arr]) => Array.isArray(arr))
                      .map(([algo, arr]) => ({ algo, count: arr.length }))
                  : []
              }>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="algo" />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="count" fill="#00c6ff" name="Anomali Sayısı" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          {/* Ortak anomaliler tablosu */}
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Birden Fazla Algoritmanın Ortak Bulduğu Anomaliler</Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><b>Adres</b></TableCell>
                  <TableCell align="right"><b>Algoritma Sayısı</b></TableCell>
                  <TableCell><b>Algoritmalar</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  try {
                    // Validate mlAllResults is an object
                    if (!mlAllResults || typeof mlAllResults !== 'object') {
                      return (
                        <TableRow>
                          <TableCell colSpan={3}>Veri formatı geçersiz</TableCell>
                        </TableRow>
                      );
                    }
                    
                    // Ortak anomalileri bul
                    const allAnoms = {};
                    Object.entries(mlAllResults).forEach(([algo, arr]) => {
                      if (!Array.isArray(arr)) return;
                      
                      arr.forEach(a => {
                        if (!a || typeof a !== 'object' || !a.from) return;
                        
                        if (!allAnoms[a.from]) allAnoms[a.from] = [];
                        allAnoms[a.from].push(algo);
                      });
                    });
                    
                    // Sadece birden fazla algoritmanın bulduğu adresler
                    const multi = Object.entries(allAnoms).filter(([addr, algos]) => algos.length > 1);
                    return multi.length > 0 ? multi.map(([addr, algos], i) => (
                      <TableRow key={i}>
                        <TableCell>{addr}</TableCell>
                        <TableCell align="right">{algos.length}</TableCell>
                        <TableCell>{algos.map(a => mlAlgoInfo[a]?.name || a).join(', ')}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={3}>Ortak anomali bulunamadı.</TableCell></TableRow>
                    );
                  } catch (err) {
                    console.error("Algorithm comparison error:", err);
                    return (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Alert severity="error">Veri analiz edilirken hata oluştu</Alert>
                        </TableCell>
                      </TableRow>
                    );
                  }
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Box mt={6}>
        <Typography variant="h5" gutterBottom>Öznitelik Dağılımı Karşılaştırması</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {datasetType === 'elliptic' ? 
          'Bu grafikler, Elliptic veri setindeki illegal ve legal işlemlerin öznitelik değerlerinin dağılımını karşılaştırır. Kırmızı çubuklar illegal işlemleri, mavi çubuklar ise legal işlemleri temsil eder.' : 
          'Bu grafikler, makine öğrenmesi algoritmasının anomali olarak işaretlediği adresler ile normal adreslerin öznitelik değerlerinin dağılımını karşılaştırır. Kırmızı çubuklar anomalileri, mavi çubuklar ise normal adresleri temsil eder. Dağılımlar arasındaki farklar, hangi özniteliklerin anomali tespitinde etkili olduğunu gösterir.'}
        </Typography>
        {featureDistError && <Alert severity="error">{featureDistError}</Alert>}
        {featureDist && (
          <>
            {Object.entries(featureDist).map(([feat, dist]) => {
              // Check if we have valid data for this feature
              if (!dist || typeof dist !== 'object' || !dist.anomaly || !dist.normal) {
                console.error(`Invalid data for feature ${feat}:`, dist);
                return (
                  <Box key={feat} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>{feat} Dağılımı</Typography>
                    <Alert severity="error">Bu öznitelik için geçerli veri bulunamadı.</Alert>
                  </Box>
                );
              }
              
              // Make sure anomaly and normal are arrays
              const anomalyArray = Array.isArray(dist.anomaly) ? dist.anomaly : [];
              const normalArray = Array.isArray(dist.normal) ? dist.normal : [];
              
              // Skip if both arrays are empty
              if (anomalyArray.length === 0 && normalArray.length === 0) {
                return (
                  <Box key={feat} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>{feat} Dağılımı</Typography>
                    <Alert severity="info">Bu öznitelik için veri bulunamadı.</Alert>
                  </Box>
                );
              }
              
              // Get histogram data with our validated arrays
              const histogramData = getFeatureHistogramData(anomalyArray, normalArray);
              
              return (
                <Box key={feat} sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>{feat} Dağılımı</Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                    {featureDescriptions[feat] || `${feat}: ${datasetType === 'elliptic' ? 'Elliptic veri setindeki öznitelik' : 'Adresin işlem özelliği'}`}
                  </Typography>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bin" />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="anomaly" fill="#ff4c4c" name={datasetType === 'elliptic' ? 'İllegal' : 'Anomali'} />
                      <Bar dataKey="normal" fill="#00c6ff" name={datasetType === 'elliptic' ? 'Legal' : 'Normal'} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              );
            })}
          </>
        )}
      </Box>
    </Container>
  );
};

function getFeatureHistogramData(anomalyArr, normalArr, bins = 10) {
  // Check if inputs are valid arrays
  if (!Array.isArray(anomalyArr) || !Array.isArray(normalArr)) {
    console.error('Invalid histogram data. Expected arrays but got:', { anomalyArr, normalArr });
    return [];
  }

  // Combine all values to get min/max
  const all = [...anomalyArr, ...normalArr].filter(x => typeof x === 'number' && !isNaN(x));
  if (all.length === 0) return [];
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (min === max) return [{ bin: min.toFixed(2), anomaly: anomalyArr.length, normal: normalArr.length }];
  const step = (max - min) / bins;
  const binEdges = Array.from({ length: bins + 1 }, (_, i) => min + i * step);
  const binLabels = binEdges.slice(0, -1).map((v, i) => `${v.toFixed(2)}-${binEdges[i + 1].toFixed(2)}`);
  const anomalyBins = Array(bins).fill(0);
  const normalBins = Array(bins).fill(0);
  anomalyArr.forEach(val => {
    if (typeof val !== 'number' || isNaN(val)) return;
    let idx = Math.floor((val - min) / step);
    if (idx === bins) idx = bins - 1;
    anomalyBins[idx]++;
  });
  normalArr.forEach(val => {
    if (typeof val !== 'number' || isNaN(val)) return;
    let idx = Math.floor((val - min) / step);
    if (idx === bins) idx = bins - 1;
    normalBins[idx]++;
  });
  return binLabels.map((bin, i) => ({ bin, anomaly: anomalyBins[i], normal: normalBins[i] }));
}

export default LiveAnalysis;
