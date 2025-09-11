import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  Security,
  DevicesOther,
  Warning,
} from '@mui/icons-material';

const QuickStats = ({ stats }) => {
  const theme = useTheme();

  const statCards = [
    {
      title: 'Total Incidents',
      value: stats?.totalIncidents || 0,
      icon: <Security sx={{ fontSize: 40 }} />,
      color: theme.palette.primary.main,
      bgColor: theme.palette.primary.light,
    },
    {
      title: 'Active Incidents',
      value: stats?.activeIncidents || 0,
      icon: <Warning sx={{ fontSize: 40 }} />,
      color: theme.palette.warning.main,
      bgColor: theme.palette.warning.light,
    },
    {
      title: 'Resolved Incidents',
      value: stats?.resolvedIncidents || 0,
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: theme.palette.success.main,
      bgColor: theme.palette.success.light,
    },
    {
      title: 'Connected Devices',
      value: stats?.connectedDevices || 0,
      icon: <DevicesOther sx={{ fontSize: 40 }} />,
      color: theme.palette.info.main,
      bgColor: theme.palette.info.light,
    },
  ];

  return (
    <Grid container spacing={3}>
      {statCards.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card
            sx={{
              height: '100%',
              background: `linear-gradient(135deg, ${stat.bgColor} 0%, ${stat.color} 100%)`,
              color: 'white',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {stat.title}
                  </Typography>
                </Box>
                <Box sx={{ opacity: 0.8 }}>
                  {stat.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default QuickStats;
