import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  Email as EmailIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Speed as SpeedIcon,
  DragIndicator as DragIcon,
  Science as TestIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { contactService } from '../../services/api';
import { addNotification } from '../../store/slices/uiSlice';

// Validation schema
const contactSchema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  phone: yup.string()
    .required('Phone number is required')
    .matches(/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number'),
  email: yup.string().email('Invalid email').optional(),
  relationship: yup.string().required('Relationship is required'),
  priority: yup.number().min(1).max(10).required('Priority is required'),
  notificationMethods: yup.array().min(1, 'At least one notification method is required'),
});

const ContactsPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [verificationDialog, setVerificationDialog] = useState({ open: false, contact: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(contactSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      relationship: '',
      priority: 5,
      notificationMethods: ['sms', 'call'],
      notes: '',
      isEmergencyContact: true,
    },
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await contactService.getContacts();
      setContacts(response.data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      showSnackbar('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddContact = () => {
    setEditingContact(null);
    reset();
    setDialogOpen(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    reset({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      relationship: contact.relationship,
      priority: contact.priority,
      notificationMethods: contact.notificationMethods,
      notes: contact.notes || '',
      isEmergencyContact: contact.isEmergencyContact,
    });
    setDialogOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;

    try {
      await contactService.deleteContact(contactId);
      await loadContacts();
      showSnackbar('Contact deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting contact:', error);
      showSnackbar('Failed to delete contact', 'error');
    }
  };

  const handleTestContact = async (contact) => {
    try {
      await contactService.testContact(contact._id);
      showSnackbar(`Test message sent to ${contact.name}`, 'success');
    } catch (error) {
      console.error('Error testing contact:', error);
      showSnackbar('Failed to send test message', 'error');
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editingContact) {
        await contactService.updateContact(editingContact._id, data);
        showSnackbar('Contact updated successfully', 'success');
      } else {
        await contactService.addContact(data);
        showSnackbar('Contact added successfully', 'success');
      }
      
      setDialogOpen(false);
      await loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      showSnackbar(
        error.response?.data?.message || 'Failed to save contact',
        'error'
      );
    }
  };

  const getPriorityColor = (priority) => {
    if (priority <= 3) return 'error';
    if (priority <= 6) return 'warning';
    return 'success';
  };

  const getRelationshipIcon = (relationship) => {
    const rel = relationship.toLowerCase();
    if (rel.includes('family') || rel.includes('parent') || rel.includes('spouse')) {
      return '👨‍👩‍👧‍👦';
    }
    if (rel.includes('friend')) return '👥';
    if (rel.includes('doctor') || rel.includes('medical')) return '🏥';
    if (rel.includes('work') || rel.includes('colleague')) return '💼';
    return '👤';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Emergency Contacts - SafeConnect</title>
      </Helmet>

      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Emergency Contacts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your emergency contacts and notification preferences
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddContact}
            size="large"
          >
            Add Contact
          </Button>
        </Box>

        {/* Stats */}
        {contacts.length > 0 && (
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {contacts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Contacts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {contacts.filter(c => c.verification?.isVerified).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verified
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {contacts.filter(c => c.priority <= 3).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Priority
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {contacts.filter(c => !c.verification?.isVerified).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unverified
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Emergency Contacts Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Add your first emergency contact to get started with safety notifications
              </Typography>
              <Button variant="contained" onClick={handleAddContact}>
                Add Your First Contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {contacts.map((contact) => (
              <Grid item xs={12} md={6} lg={4} key={contact._id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    {/* Contact Header */}
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getRelationshipIcon(contact.relationship)}
                      </Avatar>
                      <Box flexGrow={1}>
                        <Typography variant="h6" noWrap>
                          {contact.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {contact.relationship}
                        </Typography>
                      </Box>
                      {contact.verification?.isVerified ? (
                        <Tooltip title="Verified Contact">
                          <VerifiedIcon color="success" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Unverified Contact">
                          <WarningIcon color="warning" />
                        </Tooltip>
                      )}
                    </Box>

                    {/* Contact Info */}
                    <Box mb={2}>
                      <Typography variant="body2" display="flex" alignItems="center" gap={1} mb={1}>
                        <PhoneIcon fontSize="small" />
                        {contact.phone}
                      </Typography>
                      {contact.email && (
                        <Typography variant="body2" display="flex" alignItems="center" gap={1} mb={1}>
                          <EmailIcon fontSize="small" />
                          {contact.email}
                        </Typography>
                      )}
                    </Box>

                    {/* Priority */}
                    <Box mb={2}>
                      <Chip
                        size="small"
                        label={`Priority ${contact.priority}`}
                        color={getPriorityColor(contact.priority)}
                        icon={<SpeedIcon />}
                      />
                    </Box>

                    {/* Notification Methods */}
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        Notification Methods:
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {contact.notificationMethods.map((method) => (
                          <Chip
                            key={method}
                            size="small"
                            label={method.toUpperCase()}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Last Contacted */}
                    {contact.lastContacted && (
                      <Typography variant="caption" color="text.secondary">
                        Last contacted: {new Date(contact.lastContacted).toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions>
                    <Tooltip title="Edit Contact">
                      <IconButton size="small" onClick={() => handleEditContact(contact)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test Contact">
                      <IconButton size="small" onClick={() => handleTestContact(contact)}>
                        <TestIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Contact">
                      <IconButton size="small" onClick={() => handleDeleteContact(contact._id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Add/Edit Contact Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle>
              {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Basic Info */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Full Name"
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Phone Number"
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Email (Optional)"
                        type="email"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="relationship"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.relationship}>
                        <InputLabel>Relationship</InputLabel>
                        <Select {...field} label="Relationship">
                          <MenuItem value="Family Member">Family Member</MenuItem>
                          <MenuItem value="Spouse">Spouse</MenuItem>
                          <MenuItem value="Parent">Parent</MenuItem>
                          <MenuItem value="Sibling">Sibling</MenuItem>
                          <MenuItem value="Friend">Friend</MenuItem>
                          <MenuItem value="Doctor">Doctor</MenuItem>
                          <MenuItem value="Colleague">Colleague</MenuItem>
                          <MenuItem value="Neighbor">Neighbor</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                
                {/* Priority */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Priority (1=Highest)</InputLabel>
                        <Select {...field} label="Priority (1=Highest)">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <MenuItem key={num} value={num}>
                              {num} {num <= 3 ? '(High)' : num <= 6 ? '(Medium)' : '(Low)'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Notification Methods */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Notification Methods
                  </Typography>
                  <Controller
                    name="notificationMethods"
                    control={control}
                    render={({ field }) => (
                      <FormGroup row>
                        {['sms', 'call', 'email', 'push'].map((method) => (
                          <FormControlLabel
                            key={method}
                            control={
                              <Checkbox
                                checked={field.value.includes(method)}
                                onChange={(e) => {
                                  const methods = [...field.value];
                                  if (e.target.checked) {
                                    methods.push(method);
                                  } else {
                                    const index = methods.indexOf(method);
                                    methods.splice(index, 1);
                                  }
                                  field.onChange(methods);
                                }}
                              />
                            }
                            label={method.toUpperCase()}
                          />
                        ))}
                      </FormGroup>
                    )}
                  />
                  {errors.notificationMethods && (
                    <Typography variant="caption" color="error">
                      {errors.notificationMethods.message}
                    </Typography>
                  )}
                </Grid>

                {/* Notes */}
                <Grid item xs={12}>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Notes (Optional)"
                        multiline
                        rows={3}
                        placeholder="Any additional notes about this contact..."
                      />
                    )}
                  />
                </Grid>

                {/* Emergency Contact Toggle */}
                <Grid item xs={12}>
                  <Controller
                    name="isEmergencyContact"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox {...field} checked={field.value} />}
                        label="This is an emergency contact"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {editingContact ? 'Update' : 'Add'} Contact
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default ContactsPage;
