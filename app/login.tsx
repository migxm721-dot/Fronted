import { devLog } from '@/utils/devLog';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
  Dimensions,
  Linking
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '@/utils/api';
import Constants from 'expo-constants';
import { setUserLoggedIn } from '@/utils/foregroundService';

const APP_VERSION = Constants.expoConfig?.version || '1.1.0';

const { height, width } = Dimensions.get('window');

export default function LoginScreen() {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [invisible, setInvisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtpVerify, setShowOtpVerify] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    loadSavedCredentials();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const loadSavedCredentials = async () => {
    try {
      const savedUsername = await AsyncStorage.getItem('saved_username');
      const savedPassword = await AsyncStorage.getItem('saved_password');
      const savedRememberMe = await AsyncStorage.getItem('remember_me');

      if (savedRememberMe === 'true' && savedUsername) {
        setUsername(savedUsername);
        setPassword(savedPassword || '');
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    if (!password || password.trim().length === 0) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      // CRITICAL: Clear ALL session data before new login to prevent token reuse
      // But preserve user preferences like theme and font settings
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter(key => 
        key !== 'saved_username' && 
        key !== 'saved_password' && 
        key !== 'remember_me' &&
        key !== '@app_theme_mode' &&
        key !== '@app_font_size'
      );
      if (sessionKeys.length > 0) {
        await AsyncStorage.multiRemove(sessionKeys);
      }
      
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          password: password,
          rememberMe,
          invisible,
          appVersion: APP_VERSION
        })
      });

      const data = await response.json();

      if (data.requiresVerification) {
        setPendingUserId(data.userId);
        setPendingEmail(data.email);
        setShowOtpVerify(true);
        setOtpCode('');
        handleResendOtp(data.userId);
        setLoading(false);
        return;
      }

      if (response.ok && data.success) {
        if (rememberMe) {
          await AsyncStorage.setItem('saved_username', username);
          await AsyncStorage.setItem('saved_password', password);
          await AsyncStorage.setItem('remember_me', 'true');
        } else {
          await AsyncStorage.removeItem('saved_username');
          await AsyncStorage.removeItem('saved_password');
          await AsyncStorage.removeItem('remember_me');
        }

        // Store authentication tokens (access + refresh)
        await AsyncStorage.setItem('auth_token', data.accessToken);
        await AsyncStorage.setItem('refresh_token', data.refreshToken);
        
        // Store user data
        const userDataToStore = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          avatar: data.user.avatar,
          level: data.user.level,
          role: data.user.role,
          statusMessage: data.user.statusMessage,
          credits: data.user.credits,
          status: data.user.status,
          invisible: invisible && data.user.role === 'admin' ? true : false
        };
        
        // Store invisible mode separately for easy access
        if (invisible && data.user.role === 'admin') {
          await AsyncStorage.setItem('invisible_mode', 'true');
        } else {
          await AsyncStorage.removeItem('invisible_mode');
        }
        
        devLog('💾 Storing user_data for user:', userDataToStore.username);
        await AsyncStorage.setItem('user_data', JSON.stringify(userDataToStore));
        
        // Enable foreground service for logged-in user
        setUserLoggedIn(true);
        
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (userIdOverride?: number) => {
    const uid = userIdOverride || pendingUserId;
    if (!uid) return;
    setResendLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.RESEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      const data = await response.json();
      if (data.success) {
        setResendCooldown(60);
      } else {
        Alert.alert('Error', data.error || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP code');
      return;
    }
    if (!pendingUserId) return;
    setOtpLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId, otp: otpCode })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Account verified! Please login now.', [
          { text: 'OK', onPress: () => {
            setShowOtpVerify(false);
            setPendingUserId(null);
            setPendingEmail(null);
            setOtpCode('');
          }}
        ]);
      } else {
        Alert.alert('Verification Failed', data.error || 'Invalid OTP code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#041F0F', '#0A3D22', '#062815', '#031A0C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        {/* Large circles */}
        <View style={[styles.circle, styles.circleLarge, { top: -100, left: -100 }]} />
        <View style={[styles.circle, styles.circleSmall, { top: 100, right: -50 }]} />
        <View style={[styles.circle, styles.circleMedium, { bottom: -80, right: 50 }]} />
        
        {/* Dots pattern */}
        <View style={[styles.dotPattern, { top: '25%', right: '15%' }]} />
        <View style={[styles.dotPattern, { bottom: '30%', left: '10%' }]} />
        
        {/* Plus signs */}
        <Text style={[styles.plus, { top: '20%', right: '10%' }]}>+</Text>
        <Text style={[styles.plus, { bottom: '25%', right: '5%' }]}>+</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
        >
          {/* Logo/Brand */}
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/logo/ic_migx.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Card Container */}
            <View style={styles.card}>
              <Text style={styles.title}>Login</Text>

              <View style={styles.form}>
                {/* Username Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={(text) => setUsername(text.toLowerCase())}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#999"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Invisible and Forgot Password Row */}
                <View style={styles.optionsRow}>
                  <TouchableOpacity
                    style={styles.checkboxRowInline}
                    onPress={() => setInvisible(!invisible)}
                  >
                    <View style={[styles.checkbox, invisible && styles.checkboxChecked]}>
                      {invisible && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Make an invisible</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                    <Text style={styles.forgotPasswordInline}>Forgot password</Text>
                  </TouchableOpacity>
                </View>

                {/* Remember Me Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Remember me</Text>
                </TouchableOpacity>

                {/* Login Button - Aqua */}
                <TouchableOpacity
                  style={[styles.loginButtonAqua, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.loginButtonText}>
                    {loading ? 'LOGGING IN...' : 'LOGIN'}
                  </Text>
                </TouchableOpacity>

                {/* Or Divider */}
                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>Or</Text>
                  <View style={styles.orLine} />
                </View>

                {/* Sign Up Button - Orange */}
                <TouchableOpacity
                  style={styles.signupButtonOrange}
                  onPress={() => router.push('/signup')}
                >
                  <Text style={styles.signupButtonText}>SIGN UP</Text>
                </TouchableOpacity>

                {/* Terms Agreement */}
                <Text style={styles.termsTextCenter}>
                  By entering or registering, you agree to the{'\n'}
                  <Text style={styles.termsLink}>privacy agreement</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>terms of service</Text>
                </Text>
              </View>
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      {showOtpVerify && (
        <View style={styles.otpOverlay}>
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Verify Your Account</Text>
            <Text style={styles.otpSubtitle}>
              Enter the 6-digit code sent to{'\n'}
              {pendingEmail || 'your email'}
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter OTP code"
              placeholderTextColor="#999"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.otpVerifyButton, otpLoading && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={otpLoading}
            >
              <Text style={styles.otpVerifyButtonText}>
                {otpLoading ? 'VERIFYING...' : 'VERIFY'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.otpResendButton, (resendLoading || resendCooldown > 0) && styles.buttonDisabled]}
              onPress={() => handleResendOtp()}
              disabled={resendLoading || resendCooldown > 0}
            >
              <Text style={styles.otpResendButtonText}>
                {resendLoading ? 'SENDING...' : resendCooldown > 0 ? `RESEND OTP (${resendCooldown}s)` : 'RESEND OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.otpCancelButton}
              onPress={() => {
                setShowOtpVerify(false);
                setPendingUserId(null);
                setPendingEmail(null);
                setOtpCode('');
              }}
            >
              <Text style={styles.otpCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#4CC9F0',
  },
  decorativeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.15,
  },
  circleLarge: {
    width: 300,
    height: 300,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  circleMedium: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  circleSmall: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotPattern: {
    position: 'absolute',
    width: 80,
    height: 80,
    opacity: 0.3,
    backgroundColor: 'transparent',
  },
  plus: {
    position: 'absolute',
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 'bold',
  },
  scrollContent: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 60,
  },
  logoImage: {
    width: 160,
    height: 160,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'transparent',
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    display: 'none',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    display: 'none',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#333',
    borderWidth: 0,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checkboxRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#00BCD4',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#00BCD4',
    borderColor: '#00BCD4',
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  termsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    marginLeft: 4,
  },
  termsLink: {
    color: '#00BCD4',
    fontWeight: '600',
  },
  forgotPasswordInline: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  loginButtonAqua: {
    backgroundColor: '#00BCD4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  orText: {
    color: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  signupButtonOrange: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  termsTextCenter: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  permissionBanner: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  otpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 999,
  },
  otpCard: {
    backgroundColor: '#0A3D22',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  otpInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    width: '100%',
    letterSpacing: 8,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  otpVerifyButton: {
    backgroundColor: '#00BCD4',
    borderRadius: 8,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpVerifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  otpResendButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpResendButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: 'bold',
  },
  otpCancelButton: {
    paddingVertical: 8,
  },
  otpCancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});
