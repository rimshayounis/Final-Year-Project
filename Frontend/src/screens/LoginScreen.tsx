import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import { Ionicons } from "@expo/vector-icons";
import { userAPI, doctorAPI } from "../services/api";
import { storeUser } from "../services/storage";

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
  route: RouteProp<RootStackParamList, "Login">;
};

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const { userType } = route.params;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setLoading(true);
    try {
      // Call appropriate API based on userType
      const response =
        userType === "doctor"
          ? await doctorAPI.login({
              email: email.trim(),
              password,
              userType,
            })
          : await userAPI.login({
              email: email.trim(),
              password,
              userType,
            });

      console.log("Full Response:", JSON.stringify(response.data, null, 2));

      // Extract user object from response
      let userData;
      if (response.data.success) {
        userData = response.data.user || response.data.doctor;
      } else if (response.data._id) {
        userData = response.data;
      } else {
        userData = response.data.user || response.data.doctor || response.data;
      }

      if (userData && userData._id) {
        const userName = userData.fullName || userData.name || "User";

        // ✅ Store user in AsyncStorage for later use
        await storeUser(userData);

        Alert.alert("Success", `Welcome back, ${userName}!`, [
          {
            text: "OK",
            onPress: () => {
              navigation.replace("Dashboard", {
                id: userData._id,
                role: userType,
              });
            },
          },
        ]);
      } else {
        Alert.alert("Login Failed", "Unexpected response from server");
      }
    } catch (error: any) {
      console.log(
        "Error Response:",
        JSON.stringify(error.response?.data, null, 2),
      );
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "Invalid email or password",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    if (userType === "doctor") {
      navigation.navigate("CreateDoctorAccount");
    } else {
      navigation.navigate("CreateAccount", { userType: "user" });
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Password reset feature coming soon!");
  };

  const handleBackToSelection = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerCard}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToSelection}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.userTypeBadge}>
          {userType === "user" ? "👤 User" : "⚕️ Doctor"}
        </Text>
        <Text style={styles.headerText}>Welcome to{"\n"}TruHeal-Link</Text>
      </View>

      <View style={styles.loginSection}>
        <Text style={styles.loginTitle}>Login</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <Ionicons
            name="mail-outline"
            size={20}
            color="#999"
            style={styles.icon}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#999"
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleForgotPassword}
          style={styles.forgotPasswordContainer}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have account? </Text>
          <TouchableOpacity onPress={handleSignUp} disabled={loading}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8E8E8" },
  headerCard: {
    backgroundColor: "#6B7FED",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
  },
  backButton: { position: "absolute", top: 20, left: 20 },
  userTypeBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    color: "#FFF",
    marginBottom: 10,
  },
  headerText: { fontSize: 28, color: "#FFF", textAlign: "center" },
  loginSection: { paddingHorizontal: 20 },
  loginTitle: { fontSize: 24, textAlign: "center", marginBottom: 30 },
  inputContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
  },
  input: { flex: 1 },
  icon: { marginLeft: 10 },
  forgotPasswordContainer: { alignItems: "flex-end", marginBottom: 30 },
  forgotPasswordText: { fontSize: 13 },
  loginButton: {
    backgroundColor: "#6B7FED",
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonText: { color: "#FFF", fontSize: 16 },
  signUpContainer: { flexDirection: "row", justifyContent: "center" },
  signUpText: { fontSize: 13 },
  signUpLink: { fontSize: 13, color: "#6B7FED" },
});
