<script setup>
import { ref } from "vue";
import Register from "./Register.vue";
import Login from "./Login.vue";
import GuestDashboard from "./GuestDashboard.vue";
import AdminDashboard from "./AdminDashboard.vue";

const currentPage = ref("register");

const goToLogin = () => {
  currentPage.value = "login";
};

const goToRegister = () => {
  currentPage.value = "register";
};

const handleLoginSuccess = () => {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    currentPage.value = "login";
    return;
  }

  try {
    const user = JSON.parse(savedUser);

    if (user.role === "admin") {
      currentPage.value = "admin-dashboard";
    } else {
      currentPage.value = "dashboard";
    }

  } catch (error) {
    console.error("User data error:", error);
    currentPage.value = "login";
  }
};
</script>

<template>

  <Register
    v-if="currentPage === 'register'"
    @go-login="goToLogin"
  />

  <Login
    v-else-if="currentPage === 'login'"
    @login-success="handleLoginSuccess"
    @go-register="goToRegister"
  />

  <GuestDashboard
    v-else-if="currentPage === 'dashboard'"
  />

  <AdminDashboard
    v-else-if="currentPage === 'admin-dashboard'"
  />

</template>
