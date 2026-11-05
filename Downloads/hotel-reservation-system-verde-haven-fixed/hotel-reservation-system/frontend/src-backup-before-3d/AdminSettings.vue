<script setup>
import { onMounted, reactive, ref, computed } from "vue";
import axios from "axios";

const API_URL = "http://localhost:4000/api/admin/settings";

const activeTab = ref("profile");
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const success = ref("");
const searchQuery = ref("");
const hotelImage = ref("");
const imageInput = ref(null);

const settings = reactive({
  hotel_name: "Verde Haven Boutique Hotel",
  tagline: "Stay. Relax. Discover.",
  email: "verdehavenhotel@gmail.com",
  phone: "09915975630",
  location: "Calapan City, Oriental Mindoro, Philippines",
  check_in_time: "14:00",
  check_out_time: "12:00",
  currency: "PHP"
});

const defaults = {
  allow_online_booking: true,
  require_confirmation: true,
  enable_cancellation: true,
  email_notifications: true,
  reservation_alerts: true,
  payment_alerts: true,
  marketing_emails: false,
  compact_tables: false,
  show_welcome_message: true,
  dark_mode: false,
  theme_color: "forest"
};

const preferences = reactive({ ...defaults });

const tabs = [
  { id: "profile", label: "Hotel Profile", icon: "⌂", description: "Business details and contact information" },
  { id: "reservations", label: "Reservations", icon: "▣", description: "Booking rules and guest preferences" },
  { id: "notifications", label: "Notifications", icon: "♧", description: "Alerts and email preferences" },
  { id: "appearance", label: "Appearance", icon: "◉", description: "Dashboard display preferences" }
];

const activeTabInfo = computed(() =>
  tabs.find((tab) => tab.id === activeTab.value) || tabs[0]
);

const filteredTabs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return tabs;
  return tabs.filter((tab) =>
    `${tab.label} ${tab.description}`.toLowerCase().includes(query)
  );
});

const loadSettings = async () => {
  loading.value = true;
  error.value = "";
  success.value = "";

  try {
    const response = await axios.get(API_URL);
    const data = response.data?.settings || response.data || {};

    Object.keys(settings).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        settings[key] = data[key];
      }
    });
  } catch (err) {
    console.error("Load settings error:", err);
    error.value =
      err.response?.data?.message ||
      "Could not load hotel settings. Check that the backend server is running.";
  } finally {
    loading.value = false;
  }
};

const saveSettings = async () => {
  saving.value = true;
  error.value = "";
  success.value = "";

  try {
    const response = await axios.put(API_URL, { ...settings });

    if (response.data?.settings) {
      Object.assign(settings, response.data.settings);
    }

    success.value =
      response.data?.message || "Hotel settings saved successfully.";
  } catch (err) {
    console.error("Save settings error:", err);
    error.value =
      err.response?.data?.message ||
      "Could not save settings. Please try again.";
  } finally {
    saving.value = false;
  }
};

const resetSettings = async () => {
  const confirmed = window.confirm(
    "Reload the saved hotel settings and reset the dashboard preferences?"
  );

  if (!confirmed) return;

  Object.assign(preferences, defaults);
  await loadSettings();
  success.value = "Saved hotel information has been reloaded.";
};

const openImagePicker = () => {
  imageInput.value?.click();
};

const handleImageUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    error.value = "Please select an image file.";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = "Please choose an image smaller than 5 MB.";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    hotelImage.value = reader.result;
    success.value = "Hotel image preview updated.";
    error.value = "";
  };
  reader.readAsDataURL(file);
};

const selectTab = (id) => {
  activeTab.value = id;
  searchQuery.value = "";
  error.value = "";
  success.value = "";
};

onMounted(loadSettings);
</script>

<template>
  <div class="settings-page">
    <!-- TOP HEADER -->
    <header class="topbar">
      <div class="topbar-search">
        <span>⌕</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search settings..."
          aria-label="Search settings"
          @keydown.enter="filteredTabs.length && selectTab(filteredTabs[0].id)"
        />
        <kbd>↵</kbd>
      </div>

      <div class="topbar-right">
        <button class="icon-button" type="button" title="Notifications">♧</button>
        <div class="admin-mini">
          <div class="admin-avatar">A</div>
          <div>
            <strong>Admin</strong>
            <small>Administrator</small>
          </div>
          <span class="chevron">⌄</span>
        </div>
      </div>
    </header>

    <!-- HOTEL BANNER -->
    <section class="hero-banner">
      <div class="hero-content">
        <span class="eyebrow">HOTEL MANAGEMENT</span>
        <h1>Settings</h1>
        <p>Manage your hotel's information and personalize your admin experience.</p>
      </div>

      <div class="hero-actions">
        <button
          class="button button-light"
          type="button"
          @click="resetSettings"
          :disabled="loading || saving"
        >
          ↻ Reset to Default
        </button>
        <button
          class="button button-gold"
          type="button"
          @click="saveSettings"
          :disabled="loading || saving"
        >
          {{ saving ? "Saving..." : "✓ Save Changes" }}
        </button>
      </div>

      <div class="banner-palm palm-one">♧</div>
      <div class="banner-palm palm-two">♧</div>
      <div class="banner-caption">Stay. Relax. Discover.</div>
    </section>

    <div v-if="loading" class="loading-state">
      <span class="loader"></span>
      Loading your hotel settings...
    </div>

    <template v-else>
      <div v-if="error" class="alert alert-error" role="alert">
        <span>!</span> {{ error }}
      </div>

      <div v-if="success" class="alert alert-success" role="status">
        <span>✓</span> {{ success }}
      </div>

      <!-- SETTINGS TABS -->
      <nav class="settings-tabs" aria-label="Settings sections">
        <button
          v-for="tab in filteredTabs"
          :key="tab.id"
          type="button"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="selectTab(tab.id)"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-copy">
            <strong>{{ tab.label }}</strong>
            <small>{{ tab.description }}</small>
          </span>
        </button>

        <div v-if="!filteredTabs.length" class="no-results">
          No matching settings found.
        </div>
      </nav>

      <div class="dashboard-grid">
        <!-- MAIN SETTINGS AREA -->
        <main class="main-settings">
          <!-- HOTEL PROFILE -->
          <template v-if="activeTab === 'profile'">
            <section class="panel profile-panel">
              <div class="panel-heading">
                <div class="section-icon">♧</div>
                <div>
                  <h2>Hotel Profile</h2>
                  <p>Update your hotel basic information and contact details.</p>
                </div>
              </div>

              <div class="profile-layout">
                <form class="profile-form" @submit.prevent="saveSettings">
                  <label class="field">
                    <span>Hotel Name <b>*</b></span>
                    <input
                      v-model.trim="settings.hotel_name"
                      required
                      maxlength="150"
                      placeholder="Hotel name"
                    />
                  </label>

                  <label class="field">
                    <span>Tagline</span>
                    <input
                      v-model.trim="settings.tagline"
                      maxlength="200"
                      placeholder="Your hotel's tagline"
                    />
                  </label>

                  <label class="field">
                    <span>Email <b>*</b></span>
                    <input
                      v-model.trim="settings.email"
                      type="email"
                      required
                      maxlength="255"
                      placeholder="hello@example.com"
                    />
                  </label>

                  <label class="field">
                    <span>Phone <b>*</b></span>
                    <input
                      v-model.trim="settings.phone"
                      type="tel"
                      required
                      maxlength="50"
                      placeholder="Contact number"
                    />
                  </label>

                  <label class="field field-wide">
                    <span>Location <b>*</b></span>
                    <input
                      v-model.trim="settings.location"
                      required
                      maxlength="255"
                      placeholder="City, province, country"
                    />
                  </label>

                  <div class="profile-save">
                    <button class="button button-green" type="submit" :disabled="saving">
                      {{ saving ? "Saving..." : "✓ Save Hotel Profile" }}
                    </button>
                  </div>
                </form>

                <aside class="hotel-preview">
                  <div class="preview-photo" :class="{ 'has-upload': hotelImage }">
                    <img
                      v-if="hotelImage"
                      :src="hotelImage"
                      alt="Uploaded hotel preview"
                    />
                    <div v-else class="preview-art">
                      <span class="preview-leaf">♧</span>
                      <span class="preview-brand">VERDE HAVEN</span>
                      <small>BOUTIQUE HOTEL</small>
                      <span class="preview-line"></span>
                      <span class="preview-tagline">Stay. Relax. Discover.</span>
                    </div>
                  </div>

                  <div class="preview-details">
                    <span class="eyebrow">PROPERTY PREVIEW</span>
                    <h3>{{ settings.hotel_name || "Verde Haven Boutique Hotel" }}</h3>
                    <ul>
                      <li><span>⌂</span>{{ settings.location }}</li>
                      <li><span>✉</span>{{ settings.email }}</li>
                      <li><span>☎</span>{{ settings.phone }}</li>
                      <li><span>✦</span>{{ settings.tagline }}</li>
                    </ul>
                    <input
                      ref="imageInput"
                      class="visually-hidden"
                      type="file"
                      accept="image/*"
                      @change="handleImageUpload"
                    />
                    <button class="button button-outline upload-button" type="button" @click="openImagePicker">
                      ↑ Upload Hotel Image
                    </button>
                    <small class="upload-note">Image preview only · Maximum 5 MB</small>
                  </div>
                </aside>
              </div>
            </section>

            <section class="panel operating-panel">
              <div class="panel-heading">
                <div class="section-icon">◷</div>
                <div>
                  <h2>Stay &amp; Payment Preferences</h2>
                  <p>Set the standard arrival and departure times and display currency.</p>
                </div>
              </div>

              <div class="operating-fields">
                <label class="field">
                  <span>Check-in Time <b>*</b></span>
                  <input v-model="settings.check_in_time" type="time" required />
                </label>
                <label class="field">
                  <span>Check-out Time <b>*</b></span>
                  <input v-model="settings.check_out_time" type="time" required />
                </label>
                <label class="field">
                  <span>Currency <b>*</b></span>
                  <select v-model="settings.currency" required>
                    <option value="PHP">PHP — Philippine Peso (₱)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="JPY">JPY — Japanese Yen (¥)</option>
                  </select>
                </label>
              </div>
            </section>
          </template>

          <!-- RESERVATIONS -->
          <section v-else-if="activeTab === 'reservations'" class="panel preference-panel">
            <div class="panel-heading">
              <div class="section-icon">▣</div>
              <div>
                <h2>Reservation Settings</h2>
                <p>Configure booking rules and guest preferences.</p>
              </div>
            </div>

            <div class="preference-list">
              <div class="preference-item">
                <div class="preference-icon">⌂</div>
                <div class="preference-copy">
                  <strong>Allow Online Reservations</strong>
                  <p>Allow guests to submit booking requests through the website.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.allow_online_booking }"
                  :aria-pressed="preferences.allow_online_booking"
                  @click="preferences.allow_online_booking = !preferences.allow_online_booking"
                ><span></span></button>
              </div>

              <div class="preference-item">
                <div class="preference-icon">✓</div>
                <div class="preference-copy">
                  <strong>Require Confirmation</strong>
                  <p>Require staff confirmation before treating a reservation as confirmed.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.require_confirmation }"
                  :aria-pressed="preferences.require_confirmation"
                  @click="preferences.require_confirmation = !preferences.require_confirmation"
                ><span></span></button>
              </div>

              <div class="preference-item">
                <div class="preference-icon">↺</div>
                <div class="preference-copy">
                  <strong>Enable Cancellation</strong>
                  <p>Display cancellation options where supported by your booking process.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.enable_cancellation }"
                  :aria-pressed="preferences.enable_cancellation"
                  @click="preferences.enable_cancellation = !preferences.enable_cancellation"
                ><span></span></button>
              </div>
            </div>

            <div class="panel-footer">
              <span>Changes to these switches are currently for this dashboard session.</span>
              <button class="button button-green" type="button" @click="success = 'Reservation preferences updated for this session.'">
                ✓ Apply Preferences
              </button>
            </div>
          </section>

          <!-- NOTIFICATIONS -->
          <section v-else-if="activeTab === 'notifications'" class="panel preference-panel">
            <div class="panel-heading">
              <div class="section-icon">♧</div>
              <div>
                <h2>Notification Settings</h2>
                <p>Manage admin alerts and notification preferences.</p>
              </div>
            </div>

            <div class="preference-list">
              <div class="preference-item">
                <div class="preference-icon">✉</div>
                <div class="preference-copy">
                  <strong>Email Notifications</strong>
                  <p>Enable email notifications for supported system events.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.email_notifications }"
                  :aria-pressed="preferences.email_notifications"
                  @click="preferences.email_notifications = !preferences.email_notifications"
                ><span></span></button>
              </div>

              <div class="preference-item">
                <div class="preference-icon">▣</div>
                <div class="preference-copy">
                  <strong>Reservation Alerts</strong>
                  <p>Show alerts for new or updated reservations.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.reservation_alerts }"
                  :aria-pressed="preferences.reservation_alerts"
                  @click="preferences.reservation_alerts = !preferences.reservation_alerts"
                ><span></span></button>
              </div>

              <div class="preference-item">
                <div class="preference-icon">₱</div>
                <div class="preference-copy">
                  <strong>Payment Alerts</strong>
                  <p>Show alerts for payment activity when supported by the system.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.payment_alerts }"
                  :aria-pressed="preferences.payment_alerts"
                  @click="preferences.payment_alerts = !preferences.payment_alerts"
                ><span></span></button>
              </div>

              <div class="preference-item">
                <div class="preference-icon">✦</div>
                <div class="preference-copy">
                  <strong>Marketing Emails</strong>
                  <p>Preference for optional promotional messages.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.marketing_emails }"
                  :aria-pressed="preferences.marketing_emails"
                  @click="preferences.marketing_emails = !preferences.marketing_emails"
                ><span></span></button>
              </div>
            </div>

            <div class="panel-footer">
              <span>Notification switches update the current interface only; sending emails requires backend support.</span>
            </div>
          </section>

          <!-- APPEARANCE -->
          <section v-else-if="activeTab === 'appearance'" class="panel preference-panel">
            <div class="panel-heading">
              <div class="section-icon">◉</div>
              <div>
                <h2>Appearance Settings</h2>
                <p>Personalize the dashboard display.</p>
              </div>
            </div>

            <div class="appearance-options">
              <div class="appearance-row">
                <div>
                  <strong>Compact Tables</strong>
                  <p>Use a more compact layout for data tables.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.compact_tables }"
                  :aria-pressed="preferences.compact_tables"
                  @click="preferences.compact_tables = !preferences.compact_tables"
                ><span></span></button>
              </div>

              <div class="appearance-row">
                <div>
                  <strong>Show Welcome Message</strong>
                  <p>Display welcome messages where supported.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.show_welcome_message }"
                  :aria-pressed="preferences.show_welcome_message"
                  @click="preferences.show_welcome_message = !preferences.show_welcome_message"
                ><span></span></button>
              </div>

              <div class="appearance-row">
                <div>
                  <strong>Dark Mode</strong>
                  <p>Preview a darker settings workspace.</p>
                </div>
                <button
                  type="button"
                  class="toggle"
                  :class="{ on: preferences.dark_mode }"
                  :aria-pressed="preferences.dark_mode"
                  @click="preferences.dark_mode = !preferences.dark_mode"
                ><span></span></button>
              </div>

              <div class="theme-selector">
                <strong>Theme Color</strong>
                <p>Choose an accent color for this settings page.</p>
                <div class="color-options">
                  <button
                    v-for="color in [
                      { id: 'forest', name: 'Forest green', value: '#205743' },
                      { id: 'sage', name: 'Sage', value: '#8aa58a' },
                      { id: 'gold', name: 'Gold', value: '#c9aa70' },
                      { id: 'blue', name: 'Blue', value: '#5687a8' },
                      { id: 'purple', name: 'Purple', value: '#8a6bb5' }
                    ]"
                    :key="color.id"
                    type="button"
                    class="color-choice"
                    :class="{ selected: preferences.theme_color === color.id }"
                    :style="{ '--swatch': color.value }"
                    :aria-label="color.name"
                    :title="color.name"
                    @click="preferences.theme_color = color.id"
                  >
                    <span></span>
                    <small>{{ color.name }}</small>
                  </button>
                </div>
              </div>
            </div>

            <div class="panel-footer">
              <span>Appearance preferences are currently stored in this page session.</span>
              <button class="button button-green" type="button" @click="success = 'Appearance preferences applied for this session.'">
                ✓ Apply Appearance
              </button>
            </div>
          </section>
        </main>

        <!-- RIGHT SIDEBAR -->
        <aside class="right-sidebar">
          <section class="panel saved-panel">
            <div class="saved-heading">
              <span class="saved-check">✓</span>
              <strong>Settings are saved</strong>
            </div>
            <p>Your changes are saved successfully when you use Save Changes.</p>
            <div class="saved-divider"></div>
            <blockquote>
              “Great stays start with great settings.”
            </blockquote>
            <span class="quote-leaf">❧</span>
          </section>

          <section class="panel summary-panel">
            <span class="eyebrow">YOUR PROPERTY</span>
            <h3>{{ settings.hotel_name }}</h3>
            <div class="summary-row">
              <span>⌂</span>
              <p>{{ settings.location }}</p>
            </div>
            <div class="summary-row">
              <span>◷</span>
              <p>Check-in: {{ settings.check_in_time || "14:00" }}</p>
            </div>
            <div class="summary-row">
              <span>◷</span>
              <p>Check-out: {{ settings.check_out_time || "12:00" }}</p>
            </div>
            <div class="summary-row">
              <span>₱</span>
              <p>Currency: {{ settings.currency }}</p>
            </div>
            <div class="property-status">
              <span class="status-dot"></span>
              Settings workspace active
            </div>
          </section>

          <section class="panel help-panel">
            <div class="help-icon">i</div>
            <div>
              <strong>Need help?</strong>
              <p>Review your property details before saving changes.</p>
            </div>
          </section>
        </aside>
      </div>

      <footer class="settings-footer">
        <span>VERDE HAVEN · SETTINGS</span>
        <span>Hotel Management System · Verde Haven Boutique Hotel</span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.settings-page {
  --forest: #174b39;
  --forest-dark: #10372d;
  --forest-light: #27644d;
  --gold: #c9aa70;
  --cream: #f7f5ee;
  --ink: #193b30;
  --muted: #77837b;
  --line: #e8e4da;
  --panel: #ffffff;
  min-height: 100%;
  padding: 0 28px 26px;
  color: var(--ink);
  background: var(--cream);
  font-family: "DM Sans", Arial, sans-serif;
  font-size: 12px;
}

.settings-page:has(.toggle.on) {
  --active-green: var(--forest);
}

.topbar {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin: 0 -28px 18px;
  padding: 0 28px;
  background: rgba(255, 255, 255, .96);
  border-bottom: 1px solid #eae7df;
}

.topbar-search {
  width: min(350px, 55%);
  height: 35px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 11px;
  background: #f5f6f3;
  border: 1px solid #eceee8;
  border-radius: 8px;
  color: #839087;
}

.topbar-search > span {
  font-size: 21px;
}

.topbar-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
}

.topbar-search kbd {
  padding: 2px 5px;
  border: 1px solid #e0e3dc;
  border-radius: 4px;
  background: white;
  font-size: 10px;
}

.topbar-right, .admin-mini {
  display: flex;
  align-items: center;
}

.topbar-right {
  gap: 18px;
}

.icon-button {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 20px;
  cursor: pointer;
}

.admin-mini {
  gap: 9px;
}

.admin-avatar {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--forest-dark);
  color: #fff;
  font-weight: 700;
}

.admin-mini strong, .admin-mini small {
  display: block;
}

.admin-mini strong {
  font-size: 11px;
}

.admin-mini small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

.chevron {
  color: #8b948c;
}

.hero-banner {
  position: relative;
  min-height: 145px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  overflow: hidden;
  padding: 25px 30px;
  margin-bottom: 19px;
  border-radius: 12px;
  color: white;
  background:
    linear-gradient(90deg, rgba(11, 48, 37, .98) 0%, rgba(14, 56, 43, .91) 39%, rgba(16, 55, 43, .42) 100%),
    url("https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1600&q=85") center 52% / cover,
    #174b39;
  box-shadow: 0 7px 18px rgba(26, 57, 43, .08);
}

.hero-content, .hero-actions {
  position: relative;
  z-index: 2;
}

.eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #b9cbbd;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.7px;
}

.hero-content h1 {
  margin: 0 0 5px;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -.5px;
}

.hero-content p {
  max-width: 440px;
  margin: 0;
  color: #e1e9e2;
  font-size: 11px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 9px;
}

.button {
  min-height: 35px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border-radius: 7px;
  font: 700 10px "DM Sans", Arial, sans-serif;
  cursor: pointer;
  transition: .18s ease;
}

.button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.button-light {
  color: #345344;
  border: 1px solid #e3e8e0;
  background: white;
}

.button-light:hover:not(:disabled), .button-outline:hover:not(:disabled) {
  background: #f0f4ee;
}

.button-gold {
  color: #243d2e;
  border: 1px solid var(--gold);
  background: var(--gold);
}

.button-gold:hover:not(:disabled) {
  background: #d7bb85;
}

.button-green {
  color: white;
  border: 1px solid var(--forest);
  background: var(--forest);
}

.button-green:hover:not(:disabled) {
  background: #246248;
}

.button-outline {
  color: var(--forest);
  border: 1px solid #b9cabb;
  background: white;
}

.banner-palm {
  position: absolute;
  z-index: 1;
  right: 25%;
  color: rgba(233, 224, 191, .12);
  font-size: 135px;
  line-height: 1;
  transform: rotate(-25deg);
  pointer-events: none;
}

.palm-one {
  top: -45px;
}

.palm-two {
  top: 33px;
  right: 17%;
  font-size: 100px;
  transform: rotate(28deg);
}

.banner-caption {
  position: absolute;
  right: 25px;
  bottom: 12px;
  color: rgba(255, 255, 255, .8);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 13px;
  font-style: italic;
  letter-spacing: .4px;
}

.settings-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 17px;
}

.tab-button {
  min-width: 0;
  min-height: 65px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  text-align: left;
  border: 1px solid #e4e4da;
  border-radius: 9px;
  background: white;
  color: var(--ink);
  cursor: pointer;
  transition: border-color .18s, background .18s, box-shadow .18s;
}

.tab-button:hover {
  border-color: #a6bca8;
}

.tab-button.active {
  border-color: #87a58e;
  background: #f0f5ee;
  box-shadow: inset 0 -2px 0 #2c684b;
}

.tab-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #edf2eb;
  color: var(--forest);
  font-size: 17px;
}

.tab-button.active .tab-icon {
  color: white;
  background: var(--forest);
}

.tab-copy {
  min-width: 0;
}

.tab-copy strong, .tab-copy small {
  display: block;
}

.tab-copy strong {
  margin-bottom: 4px;
  font-size: 10px;
}

.tab-copy small {
  color: var(--muted);
  font-size: 9px;
  line-height: 1.4;
}

.no-results {
  grid-column: 1 / -1;
  padding: 15px;
  color: var(--muted);
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 218px;
  align-items: start;
  gap: 16px;
}

.main-settings {
  min-width: 0;
}

.panel {
  min-width: 0;
  padding: 17px;
  border: 1px solid #e7e3d9;
  border-radius: 10px;
  background: var(--panel);
  box-shadow: 0 3px 12px rgba(34, 58, 42, .025);
}

.profile-panel, .operating-panel, .preference-panel {
  margin-bottom: 15px;
}

.panel-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid #eeeae1;
}

.section-icon {
  width: 35px;
  height: 35px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--forest);
  background: #edf2eb;
  font-size: 19px;
}

.panel-heading h2 {
  margin: 0 0 4px;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
}

.panel-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.5;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(190px, .85fr);
  align-items: start;
  gap: 15px;
}

.profile-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px 12px;
}

.field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-wide {
  grid-column: 1 / -1;
}

.field > span {
  color: #405849;
  font-size: 10px;
  font-weight: 700;
}

.field b {
  color: #ba8b4a;
}

.field input, .field select {
  width: 100%;
  height: 34px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid #e0e2d8;
  border-radius: 6px;
  outline: none;
  background: white;
  color: var(--ink);
  font: 400 10px "DM Sans", Arial, sans-serif;
  transition: border-color .15s, box-shadow .15s;
}

.field input:focus, .field select:focus {
  border-color: #7da18a;
  box-shadow: 0 0 0 3px rgba(62, 107, 80, .09);
}

.profile-save {
  grid-column: 1 / -1;
  padding-top: 2px;
}

.hotel-preview {
  overflow: hidden;
  border: 1px solid #e7e4d9;
  border-radius: 8px;
  background: #fff;
}

.preview-photo {
  height: 112px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(16, 55, 45, .88), rgba(33, 87, 63, .55)),
    url("https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80") center / cover;
}

.preview-photo img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.preview-art {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: white;
  text-align: center;
}

.preview-leaf {
  color: #d9c28f;
  font-size: 21px;
  line-height: 1.2;
}

.preview-brand {
  margin-top: 4px;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 1.5px;
}

.preview-art small {
  margin-top: 4px;
  color: #e4d4ac;
  font-size: 8px;
  letter-spacing: 2px;
}

.preview-line {
  width: 40px;
  height: 1px;
  margin-top: 9px;
  background: #c9aa70;
}

.preview-tagline {
  margin-top: 5px;
  color: #f5eee0;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 9px;
  font-style: italic;
}

.preview-details {
  padding: 12px;
}

.preview-details .eyebrow {
  color: #8c9b8d;
  font-size: 8px;
}

.preview-details h3 {
  margin: 0 0 10px;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 14px;
  line-height: 1.4;
}

.preview-details ul {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0 0 12px;
  list-style: none;
}

.preview-details li {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  color: #66756a;
  font-size: 9px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.preview-details li span {
  flex-shrink: 0;
  width: 12px;
  color: var(--forest);
  text-align: center;
}

.upload-button {
  width: 100%;
  min-height: 31px;
  font-size: 9px;
}

.upload-note {
  display: block;
  margin-top: 7px;
  color: #89938a;
  text-align: center;
  font-size: 8px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.operating-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13px;
}

.preference-list {
  display: grid;
}

.preference-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 1px;
  border-bottom: 1px solid #f0ede5;
}

.preference-item:first-child {
  padding-top: 1px;
}

.preference-item:last-child {
  padding-bottom: 1px;
  border-bottom: 0;
}

.preference-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--forest);
  background: #eef3ec;
  font-size: 15px;
}

.preference-copy {
  flex: 1;
  min-width: 0;
}

.preference-copy strong, .appearance-row strong {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
}

.preference-copy p, .appearance-row p, .theme-selector p {
  margin: 0;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.55;
}

.toggle {
  width: 33px;
  height: 18px;
  flex-shrink: 0;
  padding: 2px;
  border: 0;
  border-radius: 20px;
  background: #cbd0c9;
  cursor: pointer;
  transition: background .2s;
}

.toggle span {
  width: 14px;
  height: 14px;
  display: block;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px #0002;
  transition: transform .2s;
}

.toggle.on {
  background: #23714c;
}

.toggle.on span {
  transform: translateX(15px);
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid #eeeae1;
}

.panel-footer > span {
  color: var(--muted);
  font-size: 9px;
  line-height: 1.5;
}

.appearance-options {
  display: grid;
  gap: 0;
}

.appearance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 14px 0;
  border-bottom: 1px solid #f0ede5;
}

.appearance-row:first-child {
  padding-top: 0;
}

.theme-selector {
  padding-top: 17px;
}

.theme-selector > strong {
  font-size: 11px;
}

.theme-selector p {
  margin-top: 5px;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 17px;
  margin-top: 17px;
}

.color-choice {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.color-choice > span {
  width: 26px;
  height: 26px;
  display: block;
  border: 2px solid white;
  outline: 1px solid #d8ddd5;
  border-radius: 50%;
  background: var(--swatch);
}

.color-choice.selected {
  border-color: #cdd9cb;
  background: #f4f7f1;
}

.color-choice.selected > span {
  outline: 2px solid var(--forest);
}

.color-choice small {
  color: #69766d;
  font-size: 9px;
}

.right-sidebar {
  display: grid;
  gap: 13px;
}

.saved-panel {
  padding: 15px;
  text-align: center;
  background: #fbfcf8;
}

.saved-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 11px;
}

.saved-check {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #287148;
  background: #e4f1e3;
  font-size: 11px;
  font-weight: 800;
}

.saved-panel > p {
  margin: 10px 0 13px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.6;
}

.saved-divider {
  height: 1px;
  background: #e9e8dc;
}

.saved-panel blockquote {
  margin: 16px 0 6px;
  color: #56725b;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 17px;
  font-style: italic;
  line-height: 1.55;
}

.quote-leaf {
  color: #9eaf8b;
  font-size: 20px;
}

.summary-panel {
  padding: 15px;
}

.summary-panel .eyebrow {
  color: #89998b;
}

.summary-panel h3 {
  margin: 0 0 13px;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 16px;
  line-height: 1.45;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}

.summary-row > span {
  width: 15px;
  flex-shrink: 0;
  color: var(--forest);
  text-align: center;
}

.summary-row p {
  margin: 0;
  color: #69766d;
  font-size: 10px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.property-status {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #eeeae1;
  color: #4c7157;
  font-size: 9px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4c9b65;
}

.help-panel {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px;
  background: #f0f4ec;
  border-color: #e1e8dc;
}

.help-icon {
  width: 23px;
  height: 23px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: white;
  background: var(--forest);
  font-family: Georgia, serif;
  font-weight: bold;
}

.help-panel strong {
  font-size: 10px;
}

.help-panel p {
  margin: 5px 0 0;
  color: #68786c;
  font-size: 9px;
  line-height: 1.6;
}

.settings-footer {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 15px 2px 0;
  color: #89948a;
  font-size: 8px;
  letter-spacing: .4px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 200px;
  color: #66776a;
}

.loader {
  width: 18px;
  height: 18px;
  border: 2px solid #dce5d9;
  border-top-color: var(--forest);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 11px 13px;
  margin-bottom: 13px;
  border-radius: 7px;
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.alert-error {
  color: #963c2c;
  background: #fff1ee;
  border: 1px solid #f1c6bd;
}

.alert-success {
  color: #27623c;
  background: #edf7ee;
  border: 1px solid #cce4cf;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (min-width: 1450px) {
  .settings-page {
    padding-right: 35px;
    padding-left: 35px;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr) 245px;
    gap: 19px;
  }

  .panel {
    padding: 20px;
  }

  .preview-photo {
    height: 130px;
  }
}

@media (max-width: 1050px) {
  .settings-page {
    padding-right: 18px;
    padding-left: 18px;
  }

  .topbar {
    margin-right: -18px;
    margin-left: -18px;
    padding-right: 18px;
    padding-left: 18px;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .right-sidebar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .help-panel {
    grid-column: 1 / -1;
  }

  .settings-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .settings-page {
    padding: 0 12px 20px;
  }

  .topbar {
    margin-right: -12px;
    margin-left: -12px;
    padding: 0 12px;
  }

  .topbar-right {
    gap: 7px;
  }

  .admin-mini small, .chevron, .icon-button {
    display: none;
  }

  .hero-banner {
    align-items: flex-start;
    flex-direction: column;
    padding: 22px 18px;
  }

  .hero-content h1 {
    font-size: 28px;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .banner-caption {
    right: 12px;
    bottom: 9px;
    font-size: 10px;
  }

  .settings-tabs {
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }

  .tab-button {
    min-height: 62px;
    padding: 8px;
    gap: 7px;
  }

  .tab-copy small {
    display: none;
  }

  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-form {
    grid-template-columns: 1fr;
  }

  .field-wide {
    grid-column: auto;
  }

  .operating-fields {
    grid-template-columns: 1fr;
  }

  .right-sidebar {
    grid-template-columns: 1fr;
  }

  .help-panel {
    grid-column: auto;
  }

  .panel-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .settings-footer {
    flex-direction: column;
  }
}
</style>
