import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function PrivacyPolicyScreen() {
  const { theme } = useThemeCustom();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Last updated: January 2026</Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>1. Information We Collect</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            We collect information you provide directly to us, including username, email address, 
            country, and gender when you create an account.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>2. How We Use Your Information</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            We use the information we collect to provide, maintain, and improve our services, 
            to communicate with you, and to ensure account security.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>3. Information Sharing</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            We do not share your personal information with third parties except as necessary 
            to provide our services or as required by law.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>4. Data Security</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            We implement appropriate security measures to protect your personal information 
            from unauthorized access, alteration, or destruction.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>5. Your Rights</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            You have the right to access, update, or delete your personal information at any time.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>6. Contact Us</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            If you have any questions about this Privacy Policy, please contact us.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: STATUSBAR_HEIGHT + 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
});
