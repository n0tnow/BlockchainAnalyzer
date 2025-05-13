import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, List, ListItem, ListItemText, CircularProgress, Box } from '@mui/material';
import axios from 'axios';

const AddressProfile = ({ address }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/address-profile/${address}`);
        setProfile(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching address profile:', error);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [address]);

  if (loading) return <CircularProgress />;
  if (!profile) return <Typography>No profile data available.</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Adres Profili: {address}</Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">Toplam İşlem Sayısı: {profile.total_transactions}</Typography>
          <Typography variant="h6">Gönderilen ETH: {profile.total_sent} ETH</Typography>
          <Typography variant="h6">Alınan ETH: {profile.total_received} ETH</Typography>
          <Typography variant="h6">En Aktif Zaman Dilimi: {profile.most_active_time}</Typography>
          <List>
            {profile.transactions.map((tx, index) => (
              <ListItem key={index}>
                <ListItemText primary={`İşlem Hash: ${tx.hash}`} secondary={`Değer: ${tx.value} ETH`} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AddressProfile; 