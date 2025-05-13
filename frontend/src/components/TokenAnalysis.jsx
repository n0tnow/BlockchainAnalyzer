import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import ForceGraph2D from 'react-force-graph-2d';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const StyledCard = styled(Card)`
  background: var(--card-gradient);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

const RiskScore = styled(Box)`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    const score = props.score;
    if (score < 30) return 'var(--primary-gradient)';
    if (score < 70) return 'var(--accent-gradient)';
    return 'var(--secondary-gradient)';
  }};
  color: white;
  font-size: 2rem;
  font-weight: bold;
  margin: 1rem auto;
`;

const CardContentFixed = styled(CardContent)`
  min-height: 370px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

// Helper for number formatting
function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  if (typeof num === 'string') {
    // Bilimsel gösterim varsa
    if (num.includes('e+')) {
      const [base, exp] = num.split('e+');
      const exponent = parseInt(exp, 10);
      if (exponent > 20) return 'Çok Büyük';
      num = Number(num);
    } else {
      num = Number(num);
    }
  }
  if (isNaN(num)) return '-';
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

// Helper: Tokenları benzersiz olarak grupla ve toplam bakiyeyi hesapla
function groupTokens(tokens) {
  if (!tokens) return [];
  const map = new Map();
  tokens.forEach(token => {
    const key = token.contract_address || token.token_symbol;
    const prev = map.get(key);
    const value = typeof token.value === 'string' ? Number(token.value) : token.value;
    if (prev) {
      prev.value += value;
    } else {
      map.set(key, {
        ...token,
        value: value,
      });
    }
  });
  return Array.from(map.values());
}

const TOKENS_PER_PAGE = 6;

const TokenAnalysis = ({ address }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [graphData, setGraphData] = useState(null);
  const [tokenPage, setTokenPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/token-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address }),
        });
        const result = await response.json();
        setData(result.analysis);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching token analysis:', error);
        setLoading(false);
      }
    };

    const fetchGraphData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/network-visualization?address=${address}`);
        const result = await response.json();
        setGraphData(result.visualization);
      } catch (error) {
        console.error('Error fetching graph data:', error);
      }
    };

    fetchData();
    fetchGraphData();
  }, [address]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Typography align="center" color="error">
        Veri yüklenemedi
      </Typography>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Pie chart ve token listesi için gruplanmış tokenlar kullan
  const groupedERC20 = groupTokens(data.erc20);
  const totalTokenPages = Math.ceil((groupedERC20?.length || 0) / TOKENS_PER_PAGE);
  const pagedTokens = groupedERC20?.slice(tokenPage * TOKENS_PER_PAGE, (tokenPage + 1) * TOKENS_PER_PAGE) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        centered
        sx={{ mb: 3 }}
      >
        <Tab label="Token Analizi" />
        <Tab label="Gas Kullanımı" />
        <Tab label="Risk Analizi" />
        <Tab label="İşlem Ağı" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8} lg={7}>
            <StyledCard>
              <CardContentFixed>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="h6" gutterBottom sx={{ mr: 1, background: 'linear-gradient(90deg, #00c6ff, #0072ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>
                    ERC20 Tokenler
                  </Typography>
                  <Tooltip title="Cüzdanda bulunan ERC20 tokenlarının dağılımı. Değerler insan tarafından okunabilir şekilde gösterilir.">
                    <InfoOutlinedIcon fontSize="small" color="action" />
                  </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', height: 300 }}>
                  {/* Pie chart sol */}
                  <Box sx={{ flex: 1, minWidth: 0, height: 250 }}>
                    {groupedERC20 && groupedERC20.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={groupedERC20}
                            dataKey="value"
                            nameKey="token_symbol"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ value, token_symbol }) => `${token_symbol}: ${formatNumber(value)}`}
                          >
                            {groupedERC20.map((entry, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [formatNumber(value), name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : groupedERC20 && groupedERC20.length === 1 ? (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <Typography variant="h5" gutterBottom>
                          {groupedERC20[0].token_symbol}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {formatNumber(groupedERC20[0].value)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Bu adreste yalnızca bir token var.
                        </Typography>
                      </Box>
                    ) : (
                      <Typography align="center" color="textSecondary" sx={{ mt: 8 }}>
                        Bu adrese ait ERC20 token bulunamadı.
                      </Typography>
                    )}
                  </Box>
                  {/* Token listesi sağ */}
                  <Box sx={{ flex: 1, minWidth: 0, pl: { sm: 3, xs: 0 }, mt: { xs: 2, sm: 0 }, position: 'relative', height: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {pagedTokens.length > 0 && (
                      <>
                        <Box>
                          {pagedTokens.map((token, idx) => (
                            <Box key={idx} display="flex" alignItems="center" mb={1}>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: COLORS[(tokenPage * TOKENS_PER_PAGE + idx) % COLORS.length], mr: 1 }} />
                              <Typography variant="body1" sx={{ fontWeight: 600, mr: 1 }}>{token.token_symbol}</Typography>
                              <Typography variant="body2" color="textSecondary">{formatNumber(token.value)}</Typography>
                            </Box>
                          ))}
                        </Box>
                        {totalTokenPages > 1 && (
                          <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
                            <ArrowBackIosNewIcon
                              sx={{ cursor: tokenPage === 0 ? 'not-allowed' : 'pointer', opacity: tokenPage === 0 ? 0.3 : 1, mx: 1 }}
                              onClick={() => tokenPage > 0 && setTokenPage(tokenPage - 1)}
                            />
                            <Typography variant="body2" color="textSecondary" sx={{ mx: 1 }}>
                              {tokenPage + 1} / {totalTokenPages}
                            </Typography>
                            <ArrowForwardIosIcon
                              sx={{ cursor: tokenPage === totalTokenPages - 1 ? 'not-allowed' : 'pointer', opacity: tokenPage === totalTokenPages - 1 ? 0.3 : 1, mx: 1 }}
                              onClick={() => tokenPage < totalTokenPages - 1 && setTokenPage(tokenPage + 1)}
                            />
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
              </CardContentFixed>
            </StyledCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <StyledCard>
              <CardContentFixed>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="h6" gutterBottom sx={{ mr: 1, background: 'linear-gradient(90deg, #00c6ff, #0072ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>
                    NFT'ler (ERC721)
                  </Typography>
                  <Tooltip title="Cüzdanda bulunan ERC721 (NFT) varlıklarının dağılımı.">
                    <InfoOutlinedIcon fontSize="small" color="action" />
                  </Tooltip>
                </Box>
                <Box sx={{ height: 300 }}>
                  {data.erc721 && data.erc721.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.erc721}
                          dataKey="token_id"
                          nameKey="token_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ token_name, token_id }) => `${token_name}: #${token_id}`}
                        >
                          {data.erc721.map((entry, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography align="center" color="textSecondary" sx={{ mt: 8 }}>
                      Bu adrese ait NFT bulunamadı.
                    </Typography>
                  )}
                </Box>
              </CardContentFixed>
            </StyledCard>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <StyledCard>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Gas Kullanım Analizi
              </Typography>
              <Tooltip title="Toplam gas kullanımı, ortalama gas fiyatı ve toplam gas maliyeti analiz edilir. Değerler okunabilir formattadır.">
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Toplam Gas Kullanımı</Typography>
                <Typography variant="h4">{formatNumber(data.gas_analysis.total_gas_used)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Ortalama Gas Fiyatı</Typography>
                <Typography variant="h4">{formatNumber(data.gas_analysis.avg_gas_price / 1e9)} Gwei</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Toplam Gas Maliyeti</Typography>
                <Typography variant="h4">{formatNumber(data.gas_analysis.total_gas_cost)} ETH</Typography>
              </Grid>
            </Grid>
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.gas_analysis.transactions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={formatNumber} />
                  <YAxis tickFormatter={formatNumber} />
                  <RechartsTooltip formatter={formatNumber} />
                  <Line type="monotone" dataKey="gas_cost" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </StyledCard>
      )}

      {activeTab === 2 && (
        <StyledCard>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Risk Analizi
              </Typography>
              <Tooltip title={
                <span>
                  <b>Risk Skoru:</b> Yüksek değerli işlemler (100 ETH üzeri) ve hızlı ardışık işlemler risk puanını artırır.<br/>
                  <b>Anomali Tespiti:</b> 1 dakika içinde yapılan ardışık işlemler ve aynı adrese çok sayıda küçük işlem anomali olarak işaretlenir.
                </span>
              }>
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <RiskScore score={data.risk_score.total_score}>
                  {data.risk_score.total_score}
                </RiskScore>
                <Typography align="center" variant="subtitle2">Risk Skoru</Typography>
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="subtitle2">Risk Faktörleri</Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">Yüksek Değerli İşlemler</Typography>
                  <LinearProgress variant="determinate" value={Math.min(100, data.risk_score.high_value_transactions * 10)} sx={{ mb: 1 }} />
                  <Typography variant="body2">Hızlı İşlemler</Typography>
                  <LinearProgress variant="determinate" value={Math.min(100, data.risk_score.rapid_transactions * 5)} />
                </Box>
              </Grid>
            </Grid>
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                <b>Risk Skoru:</b> Yüksek değerli işlemler (100 ETH üzeri) ve hızlı ardışık işlemler risk puanını artırır.<br />
                <b>Anomali Tespiti:</b> 1 dakika içinde yapılan ardışık işlemler ve aynı adrese çok sayıda küçük işlem anomali olarak işaretlenir.
              </Typography>
            </Box>
          </CardContent>
        </StyledCard>
      )}

      {activeTab === 3 && (
        <StyledCard>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                İşlem Ağı
              </Typography>
              <Tooltip title="Cüzdanın işlem ağı görselleştirmesi. Düğümler adresleri, kenarlar ise işlemleri temsil eder.">
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
            <Box sx={{ height: 400 }}>
              {graphData && graphData.nodes && graphData.nodes.length > 0 ? (
                <ForceGraph2D
                  graphData={graphData}
                  nodeAutoColorBy="group"
                  nodeLabel="id"
                  linkDirectionalParticles={2}
                  linkDirectionalParticleWidth={2}
                />
              ) : (
                <Typography align="center" color="textSecondary" sx={{ mt: 8 }}>
                  Bu adrese ait işlem ağı bulunamadı.
                </Typography>
              )}
            </Box>
          </CardContent>
        </StyledCard>
      )}
    </motion.div>
  );
};

export default TokenAnalysis; 