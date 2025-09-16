import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSelector, useDispatch } from 'react-redux';
import {
  Typography, Box, Card, CardContent, Avatar, Grid, Button, 
  TextField, Divider, CircularProgress, Tabs, Tab, Paper,
  IconButton, Snackbar, Alert, List, ListItem, ListItemText, 
  ListItemAvatar, Badge, Chip, Fade, Grow, Slide, Tooltip,
  LinearProgress, Container
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CameraAlt as CameraIcon,
  DevicesOther as DevicesIcon,
  Verified as VerifiedIcon,
  Favorite as FavoriteIcon,
  Shield as ShieldIcon,
  Person as PersonIcon,
  ContactPhone as ContactPhoneIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';
import { authService } from '../../services/api';

// Animations
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(139, 69, 19, 0.5); }
  50% { box-shadow: 0 0 20px rgba(139, 69, 19, 0.8), 0 0 30px rgba(139, 69, 19, 0.6); }
  100% { box-shadow: 0 0 5px rgba(139, 69, 19, 0.5); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

// Styled components
const ProfileContainer = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${theme.palette.primary.light}15 0%, 
    ${theme.palette.secondary.light}15 25%, 
    ${theme.palette.error.light}15 50%, 
    ${theme.palette.warning.light}15 75%, 
    ${theme.palette.success.light}15 100%)`,
  minHeight: '100vh',
  padding: theme.spacing(2),
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 20% 20%, ${theme.palette.primary.main}10 0%, transparent 70%),
                 radial-gradient(circle at 80% 80%, ${theme.palette.secondary.main}10 0%, transparent 70%)`,
    pointerEvents: 'none',
  }
}));

const ProfileCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper} 0%, 
    ${theme.palette.grey[50]} 100%)`,
  borderRadius: theme.spacing(3),
  overflow: 'visible',
  position: 'relative',
  boxShadow: `0 20px 40px rgba(0,0,0,0.1), 
              0 8px 16px rgba(0,0,0,0.1),
              inset 0 1px 0 rgba(255,255,255,0.8)`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: `0 32px 64px rgba(0,0,0,0.15), 
                0 16px 32px rgba(0,0,0,0.15),
                inset 0 1px 0 rgba(255,255,255,0.9)`,
  }
}));

const GradientHeader = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    #667eea 0%, 
    #764ba2 25%, 
    #f093fb 50%, 
    #f5576c 75%, 
    #4facfe 100%)`,
  backgroundSize: '400% 400%',
  animation: `${glow} 4s ease-in-out infinite`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    animation: `${float} 3s ease-in-out infinite`,
  }
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: theme.spacing(15),
  height: theme.spacing(15),
  border: `6px solid ${theme.palette.background.paper}`,
  boxShadow: `0 8px 32px rgba(0,0,0,0.3), 
              0 0 0 4px rgba(255,255,255,0.1),
              inset 0 2px 4px rgba(255,255,255,0.3)`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${pulse} 2s ease-in-out infinite`,
  background: `linear-gradient(145deg, 
    ${theme.palette.primary.main}, 
    ${theme.palette.secondary.main})`,
  fontSize: theme.spacing(6),
  fontWeight: 'bold',
  position: 'relative',
  '&:hover': {
    transform: 'scale(1.1) rotate(5deg)',
    boxShadow: `0 12px 48px rgba(0,0,0,0.4), 
                0 0 0 6px rgba(255,255,255,0.2)`,
  }
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
    width: 24,
    height: 24,
    borderRadius: '50%',
    animation: `${pulse} 1.5s ease-in-out infinite`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '2px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper}, 
    ${theme.palette.grey[100]})`,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.05)',
    boxShadow: `0 8px 16px rgba(0,0,0,0.15)`,
    background: `linear-gradient(145deg, 
      ${theme.palette.primary.light}20, 
      ${theme.palette.secondary.light}20)`,
  }
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1.5, 3),
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    transition: 'left 0.5s',
  },
  '&:hover::before': {
    left: '100%',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  }
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 600,
  minHeight: 64,
  borderRadius: `${theme.spacing(2)} ${theme.spacing(2)} 0 0`,
  margin: theme.spacing(0, 0.5),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    background: `${theme.palette.primary.main}08`,
    transform: 'translateY(-2px)',
  },
  '&.Mui-selected': {
    background: `linear-gradient(145deg, 
      ${theme.palette.primary.main}15, 
      ${theme.palette.secondary.main}15)`,
    color: theme.palette.primary.main,
  }
}));

const InfoCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper}, 
    ${theme.palette.grey[50]})`,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '4px',
    height: '100%',
    background: `linear-gradient(45deg, 
      ${theme.palette.primary.main}, 
      ${theme.palette.secondary.main})`,
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[12],
    '&::before': {
      width: '100%',
      opacity: 0.05,
    }
  }
}));

const ContactItem = styled(ListItem)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  margin: theme.spacing(1, 0),
  background: `linear-gradient(145deg, 
    ${theme.palette.background.paper}, 
    ${theme.palette.grey[50]})`,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateX(8px)',
    boxShadow: `0 4px 20px rgba(0,0,0,0.1)`,
    background: `linear-gradient(145deg, 
      ${theme.palette.primary.light}10, 
      ${theme.palette.secondary.light}10)`,
  }
}));

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [editMode, setEditMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    emergencyContact: '',
    address: '',
    bloodGroup: '',
    medicalNotes: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Initialize form with user data when available
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        emergencyContact: user.emergencyContact || '',
        address: user.address || '',
        bloodGroup: user.bloodGroup || '',
        medicalNotes: user.medicalNotes || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await authService.updateProfile(profileData);
      setEditMode(false);
      setNotification({
        open: true,
        message: 'Profile updated successfully!',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        open: true,
        message: `Failed to update profile: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setNotification({
        open: true,
        message: 'New passwords do not match',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotification({
        open: true,
        message: 'Password changed successfully!',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        open: true,
        message: `Failed to change password: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Profile - SafeConnect</title>
      </Helmet>
      
      <ProfileContainer>
        <Container maxWidth="xl">
          <Fade in timeout={800}>
            <ProfileCard sx={{ mb: 4 }}>
              <GradientHeader sx={{ p: 4, height: 140, position: 'relative' }}>
                <Box sx={{ position: 'absolute', bottom: -60, left: 40 }}>
                  <StyledBadge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                  >
                    <Tooltip title="Change Profile Picture" arrow>
                      <ProfileAvatar 
                        src={user?.profileImage || '/static/images/avatar/default.jpg'} 
                        alt={profileData.name}
                        sx={{ cursor: 'pointer' }}
                      >
                        {profileData.name?.charAt(0) || <PersonIcon sx={{ fontSize: 40 }} />}
                      </ProfileAvatar>
                    </Tooltip>
                  </StyledBadge>
                  <Tooltip title="Upload Photo">
                    <IconButton
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: -8,
                        background: 'linear-gradient(145deg, #667eea, #764ba2)',
                        color: 'white',
                        '&:hover': {
                          background: 'linear-gradient(145deg, #764ba2, #667eea)',
                          transform: 'scale(1.1)',
                        },
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                      size="small"
                    >
                      <PhotoCameraIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box sx={{ position: 'absolute', right: 30, top: 30 }}>
                  {!editMode ? (
                    <AnimatedButton 
                      variant="contained" 
                      startIcon={<EditIcon />}
                      onClick={() => setEditMode(true)}
                      sx={{
                        background: 'linear-gradient(145deg, #667eea, #764ba2)',
                        '&:hover': {
                          background: 'linear-gradient(145deg, #764ba2, #667eea)',
                        }
                      }}
                    >
                      Edit Profile
                    </AnimatedButton>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <AnimatedButton 
                        variant="contained" 
                        startIcon={<SaveIcon />}
                        onClick={handleSaveProfile}
                        disabled={loading}
                        sx={{
                          background: 'linear-gradient(145deg, #4caf50, #45a049)',
                          '&:hover': {
                            background: 'linear-gradient(145deg, #45a049, #4caf50)',
                          }
                        }}
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </AnimatedButton>
                      <AnimatedButton 
                        variant="contained" 
                        startIcon={<CancelIcon />}
                        onClick={() => setEditMode(false)}
                        sx={{
                          background: 'linear-gradient(145deg, #f44336, #d32f2f)',
                          '&:hover': {
                            background: 'linear-gradient(145deg, #d32f2f, #f44336)',
                          }
                        }}
                      >
                        Cancel
                      </AnimatedButton>
                    </Box>
                  )}
                </Box>
              </GradientHeader>
              
              <CardContent sx={{ pt: 8, pb: 4 }}>
                <Slide direction="up" in timeout={600}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {profileData.name || 'Your Name'}
                      </Typography>
                      <VerifiedIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
                      <StyledChip 
                        icon={<PhoneIcon sx={{ color: 'primary.main' }} />} 
                        label={profileData.phone || 'No phone number'} 
                        size="medium"
                      />
                      <StyledChip 
                        icon={<EmailIcon sx={{ color: 'secondary.main' }} />} 
                        label={profileData.email || 'No email'} 
                        size="medium"
                      />
                      <StyledChip 
                        icon={<LocationIcon sx={{ color: 'error.main' }} />} 
                        label={profileData.address || 'No address'} 
                        size="medium"
                      />
                      {profileData.bloodGroup && (
                        <StyledChip 
                          icon={<FavoriteIcon />}
                          label={`Blood Group: ${profileData.bloodGroup}`} 
                          sx={{
                            background: 'linear-gradient(145deg, #f44336, #d32f2f)',
                            color: 'white',
                            '&:hover': {
                              background: 'linear-gradient(145deg, #d32f2f, #f44336)',
                            }
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Slide>
              </CardContent>
            </ProfileCard>
          </Fade>

          <Grow in timeout={1000}>
            <Paper 
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                variant="fullWidth"
                sx={{
                  '& .MuiTabs-indicator': {
                    height: 4,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  }
                }}
              >
                <StyledTab 
                  icon={<PersonIcon />} 
                  label="Personal Info" 
                  iconPosition="start"
                />
                <StyledTab 
                  icon={<ContactPhoneIcon />} 
                  label="Emergency Contacts" 
                  iconPosition="start"
                />
                <StyledTab 
                  icon={<DevicesIcon />} 
                  label="Connected Devices" 
                  iconPosition="start"
                />
                <StyledTab 
                  icon={<ShieldIcon />} 
                  label="Security" 
                  iconPosition="start"
                />
              </Tabs>
              
              <Box p={4}>
                {tabValue === 0 && (
                  <Fade in timeout={600}>
                    <InfoCard>
                      <Grid container spacing={3}>
                        {editMode ? (
                          <>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Full Name"
                                name="name"
                                value={profileData.name}
                                onChange={handleInputChange}
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }
                                  }
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                value={profileData.email}
                                onChange={handleInputChange}
                                type="email"
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }
                                  }
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Phone Number"
                                name="phone"
                                value={profileData.phone}
                                onChange={handleInputChange}
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }
                                  }
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Address"
                                name="address"
                                value={profileData.address}
                                onChange={handleInputChange}
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }
                                  }
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Blood Group"
                                name="bloodGroup"
                                value={profileData.bloodGroup}
                                onChange={handleInputChange}
                                placeholder="e.g., A+, B-, O+, AB-"
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }
                                  }
                                }}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Medical Notes"
                                name="medicalNotes"
                                value={profileData.medicalNotes}
                                onChange={handleInputChange}
                                multiline
                                rows={3}
                                placeholder="Any allergies, medical conditions, or important medical information"
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }
                                  }
                                }}
                              />
                            </Grid>
                          </>
                        ) : (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <EmailIcon sx={{ color: 'primary.main' }} />
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {profileData.email || 'Not provided'}
                                  </Typography>
                                </Box>
                              </Box>
                              <Divider />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <PhoneIcon sx={{ color: 'secondary.main' }} />
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {profileData.phone || 'Not provided'}
                                  </Typography>
                                </Box>
                              </Box>
                              <Divider />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <LocationIcon sx={{ color: 'error.main' }} />
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {profileData.address || 'Not provided'}
                                  </Typography>
                                </Box>
                              </Box>
                              <Divider />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <FavoriteIcon sx={{ color: 'error.main' }} />
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Blood Group</Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {profileData.bloodGroup || 'Not provided'}
                                  </Typography>
                                </Box>
                              </Box>
                              {profileData.medicalNotes && (
                                <>
                                  <Divider />
                                  <Box>
                                    <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                                      Medical Notes
                                    </Typography>
                                    <Paper 
                                      variant="outlined" 
                                      sx={{ 
                                        p: 3, 
                                        backgroundColor: 'grey.50',
                                        borderRadius: 2,
                                        border: '2px dashed',
                                        borderColor: 'grey.300'
                                      }}
                                    >
                                      <Typography variant="body2">{profileData.medicalNotes}</Typography>
                                    </Paper>
                                  </Box>
                                </>
                              )}
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </InfoCard>
                  </Fade>
                )}
                
                {tabValue === 1 && (
                  <Fade in timeout={600}>
                    <InfoCard>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ContactPhoneIcon sx={{ color: 'primary.main' }} />
                        Emergency Contacts
                      </Typography>
                      {user?.emergencyContacts?.length > 0 ? (
                        <List sx={{ p: 0 }}>
                          {user.emergencyContacts.slice(0, 3).map((contact, index) => (
                            <Slide direction="right" in timeout={300 + index * 100} key={index}>
                              <ContactItem divider={index < user.emergencyContacts.length - 1}>
                                <ListItemAvatar>
                                  <Avatar 
                                    sx={{ 
                                      bgcolor: contact.priority === 'high' ? 'error.main' : 'primary.main',
                                      background: contact.priority === 'high' 
                                        ? 'linear-gradient(145deg, #f44336, #d32f2f)'
                                        : 'linear-gradient(145deg, #2196f3, #1976d2)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                    }}
                                  >
                                    {contact.name.charAt(0)}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                  primary={
                                    <Typography variant="subtitle1" fontWeight={600}>
                                      {contact.name}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                      <Typography variant="body2" color="text.primary" fontWeight={500}>
                                        {contact.phone}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        — {contact.relationship}
                                      </Typography>
                                      {contact.priority === 'high' && 
                                        <StyledChip 
                                          size="small" 
                                          label="Primary" 
                                          sx={{
                                            background: 'linear-gradient(145deg, #f44336, #d32f2f)',
                                            color: 'white',
                                            fontSize: '0.75rem'
                                          }}
                                        />
                                      }
                                    </Box>
                                  } 
                                />
                              </ContactItem>
                            </Slide>
                          ))}
                        </List>
                      ) : (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 4, 
                            textAlign: 'center',
                            borderRadius: 2,
                            border: '2px dashed',
                            borderColor: 'grey.300',
                            background: 'grey.50'
                          }}
                        >
                          <ContactPhoneIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                          <Typography variant="body1" color="text.secondary" gutterBottom>
                            No emergency contacts found. Add contacts to enhance your safety.
                          </Typography>
                          <AnimatedButton 
                            variant="contained" 
                            size="large"
                            href="/contacts"
                            sx={{
                              mt: 2,
                              background: 'linear-gradient(145deg, #667eea, #764ba2)',
                              '&:hover': {
                                background: 'linear-gradient(145deg, #764ba2, #667eea)',
                              }
                            }}
                          >
                            Add Emergency Contacts
                          </AnimatedButton>
                        </Paper>
                      )}
                      <Box sx={{ mt: 3, textAlign: 'right' }}>
                        <AnimatedButton 
                          variant="outlined" 
                          href="/contacts"
                          sx={{
                            borderColor: 'primary.main',
                            '&:hover': {
                              background: 'primary.main',
                              color: 'white',
                            }
                          }}
                        >
                          Manage All Contacts
                        </AnimatedButton>
                      </Box>
                    </InfoCard>
                  </Fade>
                )}
                
                {tabValue === 2 && (
                  <Fade in timeout={600}>
                    <InfoCard>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DevicesIcon sx={{ color: 'primary.main' }} />
                        Connected Safety Devices
                      </Typography>
                      {user?.connectedDevices?.length > 0 ? (
                        <List sx={{ p: 0 }}>
                          {user.connectedDevices.map((device, index) => (
                            <Slide direction="left" in timeout={300 + index * 100} key={index}>
                              <ContactItem divider={index < user.connectedDevices.length - 1}>
                                <ListItemAvatar>
                                  <Avatar 
                                    sx={{ 
                                      bgcolor: device.status === 'active' ? 'success.main' : 'warning.main',
                                      background: device.status === 'active'
                                        ? 'linear-gradient(145deg, #4caf50, #45a049)'
                                        : 'linear-gradient(145deg, #ff9800, #f57c00)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                    }}
                                  >
                                    <DevicesIcon />
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                  primary={
                                    <Typography variant="subtitle1" fontWeight={600}>
                                      {device.name || `Device ${device.serialNumber}`}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                      <Typography variant="body2" color="text.primary" fontWeight={500}>
                                        SN: {device.serialNumber}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        — {device.status === 'active' ? 'Connected' : 'Disconnected'}
                                      </Typography>
                                      {device.batteryLevel && 
                                        <StyledChip 
                                          size="small" 
                                          label={`Battery: ${device.batteryLevel}%`} 
                                          sx={{
                                            background: device.batteryLevel > 20 
                                              ? 'linear-gradient(145deg, #4caf50, #45a049)'
                                              : 'linear-gradient(145deg, #f44336, #d32f2f)',
                                            color: 'white',
                                            fontSize: '0.75rem'
                                          }}
                                        />
                                      }
                                    </Box>
                                  } 
                                />
                              </ContactItem>
                            </Slide>
                          ))}
                        </List>
                      ) : (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 4, 
                            textAlign: 'center',
                            borderRadius: 2,
                            border: '2px dashed',
                            borderColor: 'grey.300',
                            background: 'grey.50'
                          }}
                        >
                          <DevicesIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                          <Typography variant="body1" color="text.secondary" gutterBottom>
                            No safety devices connected. Connect your safety band or IoT devices.
                          </Typography>
                          <AnimatedButton 
                            variant="contained" 
                            size="large"
                            href="/devices"
                            sx={{
                              mt: 2,
                              background: 'linear-gradient(145deg, #667eea, #764ba2)',
                              '&:hover': {
                                background: 'linear-gradient(145deg, #764ba2, #667eea)',
                              }
                            }}
                          >
                            Connect Safety Device
                          </AnimatedButton>
                        </Paper>
                      )}
                      <Box sx={{ mt: 3, textAlign: 'right' }}>
                        <AnimatedButton 
                          variant="outlined" 
                          href="/devices"
                          sx={{
                            borderColor: 'primary.main',
                            '&:hover': {
                              background: 'primary.main',
                              color: 'white',
                            }
                          }}
                        >
                          Manage All Devices
                        </AnimatedButton>
                      </Box>
                    </InfoCard>
                  </Fade>
                )}
                
                {tabValue === 3 && (
                  <Fade in timeout={600}>
                    <InfoCard>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShieldIcon sx={{ color: 'primary.main' }} />
                        Security Settings
                      </Typography>
                      
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                          Change Password
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              label="Current Password"
                              type="password"
                              name="currentPassword"
                              value={passwordData.currentPassword}
                              onChange={handlePasswordChange}
                              variant="outlined"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  transition: 'all 0.3s',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  }
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              label="New Password"
                              type="password"
                              name="newPassword"
                              value={passwordData.newPassword}
                              onChange={handlePasswordChange}
                              variant="outlined"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  transition: 'all 0.3s',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  }
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              label="Confirm New Password"
                              type="password"
                              name="confirmPassword"
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordChange}
                              variant="outlined"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  transition: 'all 0.3s',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  }
                                }
                              }}
                            />
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 3 }}>
                          <AnimatedButton 
                            variant="contained" 
                            startIcon={<SecurityIcon />}
                            onClick={handleChangePassword}
                            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
                            sx={{
                              background: 'linear-gradient(145deg, #667eea, #764ba2)',
                              '&:hover': {
                                background: 'linear-gradient(145deg, #764ba2, #667eea)',
                              }
                            }}
                          >
                            {loading ? 'Updating...' : 'Update Password'}
                          </AnimatedButton>
                        </Box>
                      </Box>
                      
                      <Divider sx={{ my: 4 }} />
                      
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                          Two-Factor Authentication
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Enable two-factor authentication to add an extra layer of security to your account.
                        </Typography>
                        <AnimatedButton 
                          variant="outlined" 
                          sx={{
                            borderColor: 'secondary.main',
                            color: 'secondary.main',
                            '&:hover': {
                              background: 'secondary.main',
                              color: 'white',
                            }
                          }}
                        >
                          Enable 2FA
                        </AnimatedButton>
                      </Box>
                      
                      <Divider sx={{ my: 4 }} />
                      
                      <Box>
                        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                          Account Information
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Account created:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Last login:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Unknown'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Account status:
                            </Typography>
                            <StyledChip 
                              size="small" 
                              label={user?.isActive ? 'Active' : 'Inactive'} 
                              sx={{
                                background: user?.isActive 
                                  ? 'linear-gradient(145deg, #4caf50, #45a049)'
                                  : 'linear-gradient(145deg, #f44336, #d32f2f)',
                                color: 'white',
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </InfoCard>
                  </Fade>
                )}
              </Box>
            </Paper>
          </Grow>
        </Container>
        
        <Snackbar 
          open={notification.open} 
          autoHideDuration={6000} 
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={Slide}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            sx={{ 
              borderRadius: 2,
              fontWeight: 600,
              '& .MuiAlert-icon': {
                fontSize: 24
              }
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </ProfileContainer>
    </>
  );
};

export default ProfilePage;
