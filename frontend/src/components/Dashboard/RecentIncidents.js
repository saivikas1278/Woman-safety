import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

const RecentIncidents = ({ incidents = [] }) => {
  if (incidents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No recent incidents
        </Typography>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'error';
      case 'escalated': return 'warning';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  return (
    <List>
      {incidents.map((incident, index) => (
        <ListItem key={incident._id || index} divider>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">
                  {incident.type || 'Emergency Incident'}
                </Typography>
                <Chip
                  label={incident.status}
                  size="small"
                  color={getStatusColor(incident.status)}
                />
              </Box>
            }
            secondary={
              <Typography variant="body2" color="text.secondary">
                {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default RecentIncidents;
