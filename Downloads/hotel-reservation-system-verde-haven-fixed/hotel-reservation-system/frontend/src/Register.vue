<script setup>
import { ref } from "vue";
import axios from "axios";

const emit = defineEmits(["go-login"]);

const fullName = ref("");
const email = ref("");
const phone = ref("");
const password = ref("");
const error = ref("");
const success = ref("");
const loading = ref(false);

const register = async () => {
  error.value = "";
  success.value = "";

  if (!fullName.value || !email.value || !password.value) {
    error.value = "Full name, email, and password are required.";
    return;
  }

  try {
    loading.value = true;

    const response = await axios.post(
      "http://localhost:4000/api/auth/register",
      {
        full_name: fullName.value,
        email: email.value,
        phone: phone.value,
        password: password.value
      }
    );

    success.value =
      response.data.message || "Registration successful.";

    setTimeout(() => {
      emit("go-login");
    }, 1000);

  } catch (err) {
    console.error(err);

    error.value =
      err.response?.data?.message ||
      "Registration failed. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <main class="auth-page register-page">
    <section class="auth-showcase" aria-label="Hotel welcome">
      <div class="showcase-brand"><span class="brand-mark">✦</span><span>VERDE HAVEN</span></div>
      <div class="showcase-copy">
        <p class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
        <h2>Make room for<br><em>something lovely.</em></h2>
        <p class="showcase-description">Create an account to keep your reservations together and make every stay feel effortless.</p>
      </div>
      <div class="showcase-footer"><span>PERSONALIZED HOSPITALITY</span><span>YOUR STAY, SIMPLIFIED</span></div>
      <div class="showcase-orbit orbit-one"></div><div class="showcase-orbit orbit-two"></div>
    </section>
    <section class="auth-panel">
      <div class="auth-card">
        <div class="mobile-brand"><span class="brand-mark">✦</span> VERDE HAVEN</div>
        <p class="auth-kicker">JOIN VERDE HAVEN</p>
        <h1>Create your account</h1>
        <p class="auth-intro">A few details now, a more convenient stay later.</p>
        <form @submit.prevent="register">
          <div class="form-group"><label for="fullName">Full name</label><input id="fullName" v-model="fullName" type="text" placeholder="Enter your full name" autocomplete="name" required /></div>
          <div class="form-group"><label for="email">Email address</label><input id="email" v-model="email" type="email" placeholder="you@example.com" autocomplete="email" required /></div>
          <div class="form-group"><label for="phone">Phone number <span class="optional-label">Optional</span></label><input id="phone" v-model="phone" type="tel" placeholder="Enter your phone number" autocomplete="tel" /></div>
          <div class="form-group"><label for="password">Create password</label><input id="password" v-model="password" type="password" placeholder="Create a secure password" autocomplete="new-password" required /></div>
          <p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="success" class="success" role="status">{{ success }}</p>
          <button type="submit" class="auth-submit" :disabled="loading">{{ loading ? "Creating account…" : "Create account" }} <span aria-hidden="true">→</span></button>
        </form>
        <div class="auth-switch"><span>Already have an account?</span><button type="button" @click="emit('go-login')">Sign in</button></div>
        <p class="auth-legal">Your account details are used to support your reservation experience.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth-page{min-height:100vh;display:grid;grid-template-columns:minmax(340px, .92fr) 1.08fr;background:#fbfcf8;color:#25352e;font-family:'DM Sans',Inter,sans-serif}.auth-showcase{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:100vh;padding:38px clamp(28px,5vw,76px);overflow:hidden;color:#fff;background:radial-gradient(ellipse at 80% 25%,rgba(200,174,123,.22),transparent 24%),radial-gradient(ellipse at 5% 95%,rgba(112,148,120,.2),transparent 35%),linear-gradient(145deg,#102e27,#1c4b3b 62%,#315d49)}.showcase-brand,.mobile-brand{display:flex;align-items:center;gap:11px;font-size:13px;font-weight:700;letter-spacing:2.4px}.brand-mark{display:inline-flex;align-items:center;justify-content:center;width:35px;height:35px;border:1px solid rgba(220,197,147,.7);border-radius:11px;color:#ddc797;font-size:18px}.showcase-copy{position:relative;z-index:1;max-width:480px;margin:70px 0}.eyebrow,.auth-kicker{margin:0 0 17px;color:#cbb582;font-size:10px;font-weight:700;letter-spacing:2.2px}.showcase-copy h2{margin:0;color:#fff;font-family:'Playfair Display',Georgia,serif;font-size:clamp(38px,4.6vw,64px);font-weight:500;line-height:1.12;letter-spacing:-1px}.showcase-copy h2 em{color:#dec99e;font-weight:500}.showcase-description{max-width:370px;margin:22px 0 0;color:#d0ded4;font-size:13px;line-height:1.9}.showcase-footer{position:relative;z-index:1;display:flex;justify-content:space-between;gap:16px;color:#adc2b3;font-size:8px;letter-spacing:1.5px}.showcase-orbit{position:absolute;right:-150px;top:22%;width:410px;height:410px;border:1px solid rgba(221,199,151,.19);border-radius:50%;pointer-events:none}.orbit-two{right:-95px;top:28%;width:300px;height:300px;border-color:rgba(221,199,151,.13)}.auth-panel{display:flex;align-items:center;justify-content:center;padding:42px 28px}.auth-card{width:100%;max-width:410px}.mobile-brand{display:none;color:#1b4a3b;margin-bottom:34px}.auth-kicker{margin-bottom:10px;color:#a78348}.auth-card h1{margin:0;color:#203a2e;font-family:'Playfair Display',Georgia,serif;font-size:clamp(28px,3vw,36px);font-weight:600;letter-spacing:-.5px;line-height:1.2}.auth-intro{margin:12px 0 24px;color:#7b887e;font-size:13px;line-height:1.7}.form-group{margin-bottom:20px}.form-group label{display:block;margin-bottom:8px;color:#354b3e;font-size:12px;font-weight:700}.label-row{display:flex;align-items:center;justify-content:space-between}.secure-note{color:#9aa49b;font-size:10px}.form-group input{width:100%;height:48px;padding:0 14px;border:1px solid #dce4da;border-radius:10px;outline:none;background:#fff;color:#25352e;font-size:13px;transition:border-color .2s,box-shadow .2s}.form-group input::placeholder{color:#a3aca4}.form-group input:focus{border-color:#6f987d;box-shadow:0 0 0 3px rgba(74,125,91,.1)}.auth-submit{display:flex;align-items:center;justify-content:center;gap:14px;width:100%;height:49px;margin-top:8px;border:0;border-radius:10px;background:#1b4a3b;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:background .2s,transform .2s}.auth-submit span{font-size:18px;font-weight:400}.auth-submit:hover{background:#28634e;transform:translateY(-1px)}.auth-submit:disabled{opacity:.65;cursor:wait;transform:none}.error{margin:0 0 14px;color:#b5473d;font-size:12px}.success{margin:0 0 14px;color:#39764b;font-size:12px}.optional-label{float:right;color:#9aa49b;font-size:10px;font-weight:500}.auth-switch{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:5px;margin-top:26px;color:#7c897f;font-size:12px}.auth-switch button{padding:0;border:0;background:none;color:#245642;font-size:12px;font-weight:700;cursor:pointer}.auth-switch button:hover{text-decoration:underline}.auth-legal{margin:34px 0 0;color:#a1aaa1;font-size:10px;line-height:1.6;text-align:center}@media(max-width:760px){.auth-page{grid-template-columns:1fr}.auth-showcase{display:none}.auth-panel{min-height:100vh;padding:30px 22px}.auth-card{max-width:430px}.mobile-brand{display:flex}.auth-intro{margin-bottom:26px}}@media(min-width:761px) and (max-height:700px){.auth-showcase{padding-top:25px;padding-bottom:25px}.showcase-copy{margin:30px 0}.showcase-copy h2{font-size:42px}.auth-panel{padding-top:25px;padding-bottom:25px}.auth-legal{margin-top:22px}}

/* Boutique-hotel visual refinement */
.auth-page{background:#f8f6f0}
.auth-showcase{background-image:linear-gradient(90deg,rgba(11,35,28,.78),rgba(11,35,28,.24)),url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=85');background-size:cover;background-position:center}
.auth-showcase:before{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,31,25,.34),transparent 55%);pointer-events:none}
.showcase-brand,.showcase-copy,.showcase-footer{position:relative;z-index:1}
.brand-mark{border-radius:50%;width:39px;height:39px;font-size:20px}
.auth-panel{background:linear-gradient(135deg,#fbfaf6,#f3f0e7)}
.auth-card{padding:clamp(8px,1vw,18px) 0}
.auth-card h1{font-size:clamp(30px,3vw,39px);letter-spacing:-.8px}
.form-group input{height:50px;border-radius:7px;background:rgba(255,255,255,.92)}
.auth-submit{height:51px;border-radius:7px;background:#174638;letter-spacing:.15px}
.auth-submit:hover{background:#245c48}
@media(min-width:761px){.auth-panel{padding:48px clamp(32px,5vw,86px)}.auth-card{max-width:420px}}
</style>
