import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function TermsScreen() {
  const { theme } = useThemeCustom();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Terms and Conditions</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Last updated: December 2024</Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            By accessing and using this application, you accept and agree to be bound by the terms 
            and provision of this agreement.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>2. User Conduct</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            You agree to use the application only for lawful purposes and in a way that does not 
            infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the application.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>3. Account Responsibilities</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            You are responsible for maintaining the confidentiality of your account and password 
            and for restricting access to your device.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>4. Termination</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            We reserve the right to terminate or suspend access to our application immediately, 
            without prior notice or liability, for any reason whatsoever.
          </Text>
          
          <Text style={[styles.heading, { color: theme.text }]}>5. Limitation of Liability</Text>
          <Text style={[styles.text, { color: theme.secondary }]}>
            In no event shall the application, nor its directors, employees, partners, agents, 
            suppliers, or affiliates, be liable for any indirect, incidental, special, consequential 
            or punitive damages.
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