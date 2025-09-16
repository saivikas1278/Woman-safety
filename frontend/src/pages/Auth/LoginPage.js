import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Link as MuiLink,
  IconButton,
  InputAdornment,
  Divider,
  Grid,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
} from '@mui/icons-material';

import { authService } from '../../services/authService';
import { loginSuccess, loginStart, loginFailure } from '../../store/slices/authSlice';

const schema = yup.object({
  email: yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup.string()
    .required('Password is required')
    .min(1, 'Password is required'),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    dispatch(loginStart());
    try {
      const response = await authService.login(data.email, data.password);
      
      // Handle response structure - backend returns success/data format
      const responseData = response.success ? response.data : response;
      
      // Transform the response to match what authSlice expects
      const authData = {
        user: responseData.user,
        token: responseData.accessToken,
        refreshToken: responseData.refreshToken
      };
      
      dispatch(loginSuccess(authData));
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      
      // Determine the type of error
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Unable to connect to server. The system is trying alternative ports. Please try again in a moment.';
      } else if (error.response) {
        errorMessage = error.response.data?.message || 'Authentication failed. Please check your credentials.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      dispatch(loginFailure(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - SafeConnect</title>
      </Helmet>

      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #e91e63 0%, #2196f3 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={10}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                Welcome Back
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to your SafeConnect account
              </Typography>
            </Box>

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                margin="normal"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                autoComplete="email"
                autoFocus
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <MuiLink
                  component={Link}
                  to="/forgot-password"
                  variant="body2"
                  sx={{ textDecoration: 'none' }}
                >
                  Forgot your password?
                </MuiLink>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                New to SafeConnect?
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              component={Link}
              to="/signup"
              sx={{ py: 1.5 }}
            >
              Create Account
            </Button>

            {/* Demo Credentials */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="caption">
                <strong>Demo Credentials:</strong><br />
                Email: demo@safeconnect.com<br />
                Password: demo123
              </Typography>
            </Alert>
          </Paper>

          {/* Back to Home */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <MuiLink
              component={Link}
              to="/"
              variant="body2"
              sx={{ color: 'white', textDecoration: 'none' }}
            >
              ← Back to Home
            </MuiLink>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default LoginPage;
