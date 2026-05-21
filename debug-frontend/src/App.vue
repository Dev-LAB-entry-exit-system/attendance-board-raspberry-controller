<script setup>
import {ref, onMounted, onUnmounted} from 'vue'

const activeUsers = ref([])
const scanResults = ref([])
const isFormVisible = ref(false)
const isTutorialVisible = ref(true)
const username = ref('');
const ledId = ref('');
const ipAddress = ref('');
const ipAddressPlaceholder = ref('auto-detect');
const discordId = ref('');
const statusMessage = ref('');
const isError = ref(false);

const UPDATE_INTERVAL = 60 * 1000 // 60 seconds
let intervalId

const fetchDevices = async () => {
  try {
    const response = await fetch('/api/devices')
    const data = await response.json()

    let nonDeletedUsers = data.activeUsers.filter(user => user.ledId !== -1)

    scanResults.value = data.allDevices
    activeUsers.value = nonDeletedUsers
  } catch (error) {
    console.error('Failed to fetch devices:', error)
  }
}

async function isClientRegistered() {
  try {
    const response = await fetch('/api/whoami');
    const data = await response.json();

    if (response.status !== 200 || !data) {
      ipAddressPlaceholder.value = "unable to detect IP";
      return null;
    }

    return data.isRegistered;
  } catch (error) {
    console.error('Failed to fetch device information:', error);
  }
}

async function registerDevice() {
  // Construct the payload
  const payload = {
    name: username.value,
    ledId: Number(ledId.value),
  };

  if (discordId.value.trim() !== '' && discordId.value.length >= 17) {
    payload.discordId = discordId.value;
  }

  if (ipAddress.value.trim() !== '') {
    payload.ip = ipAddress.value.trim();
  }

  try {
    console.log(payload)
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();

    // 4. Handle success
    statusMessage.value = 'Successfully registered! Update may take a minute';
    isError.value = false;

    // Optional: Clear the form fields after success
    username.value = '';
    ledId.value = '';
    ipAddress.value = '';
    discordId.value = '';

    // Hide the form after a short delay so the user sees the success message
    setTimeout(() => {
      isFormVisible.value = false;
      statusMessage.value = '';
      fetchDevices();
    }, 5000);

  } catch (error) {
    // 5. Handle errors
    console.error('Failed to send data:', error);
    statusMessage.value = 'Failed to register device. Please try again.';
    isError.value = true;
  }
}

function cancelForm() {
  isFormVisible.value = false;
  statusMessage.value = '';
  username.value = '';
  ledId.value = '';
  ipAddress.value = '';
  discordId.value = '';
}

function openTutorial() {
    isTutorialVisible.value = true;

  setTimeout(() => {
    const tutorial = document.getElementById('tutorial');
    tutorial.classList.remove('deactivated');
  }, 1000)
}

function closeTutorial() {
  const tutorial = document.getElementById('tutorial');
  tutorial.classList.add('deactivated');

  setTimeout(() => {
    isTutorialVisible.value = false;
  }, 1000)
}

async function loadTutorial() {
  const clientIsRegistered = await isClientRegistered();
  if (clientIsRegistered !== null && !clientIsRegistered) {
    openTutorial();
  }
}

onMounted(() => {
  fetchDevices()
  loadTutorial()
  intervalId = setInterval(fetchDevices, UPDATE_INTERVAL)
})

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>

<template>
  <div class="container">
    <div class="logo">
      <img class="logo-image" src="./assets/hilab-logo-full.png" alt="Human Interface Laboratory Logo">
    </div>
    <h1 class="page-title">Attendance Board</h1>

    <div id="tutorial" class="overlay-canvas hide-on-desktop deactivated" v-if="isTutorialVisible">
      <div class="scrollable-container">
        <button
            class="close-overlay"
            v-if="isTutorialVisible"
            @click="closeTutorial()"
            aria-label="Close Tutorial"
        >
          <svg viewBox="0 0 23 20" width="3em" height="3em" stroke="var(--text)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="mobile-tutorial">
          <h2><strong>登録前に<br>Before Registration</strong></h2>
          <h3>Wi-Fi経由でのデバイス検出を許可する<br>Allow Device Detection through WIFI</h3>
          <p>プライベートWi-Fiアドレス/MACアドレスを静的に変更する<br>Switch Private WIFI Address / Device MAC to static</p>
          <div class="tutorial-step">
            <p><strong>Step 1</strong></p>
            <p>研究室のWi-Fi(hilab2ghz)に接続<br>Go to WIFI for hilab2ghz or/and hilab5ghz settings</p>
            <img class="tutorial-picture" src="./assets/screenshot-1.jpg" alt="Screenshot of WIFI Settings page.">
          </div>
          <div class="tutorial-step">
            <p><strong>Step 2</strong></p>
            <p>「プライベートWi-Fiアドレス」の設定に移動して<br>Go to "Private WIFI Address" settings</p>
            <img class="tutorial-picture" src="./assets/screenshot-2.jpg" alt="Screenshot of settings page for hilab2ghz.">
          </div>
          <div class="tutorial-step">
            <p><strong>Step 3</strong></p>
            <p>プライベートWi-Fiアドレスをオフにします<br>Set WIFI Address to "Fixed"</p>
            <img class="tutorial-picture" src="./assets/screenshot-3.jpg" alt="Screenshot WIFI privacy settings.">
          </div>
          <div class="tutorial-step">
            <p><strong>Step 4</strong></p>
            <p>このチュートリアルウィンドウを閉じて、デバイスを登録してください。<br>Close this tutorial window and register your device.</p>
          </div>
          <div class="tutorial-step">
            <p><strong>問題が発生した場合は、システム管理者にご連絡ください。<br>If you have any trouble, please contact the system administrator.</strong></p>
          </div>

        </div>
      </div>
    </div>

    <div class="section">
      <h2>Active Users</h2>
      <div class="user-display">
        <div class="card"
             v-for="user in activeUsers"
             :key="user.ip">
          <p class="center mini-title"><strong>{{ user.name }}</strong></p>
          <p><span class="field-head">LED-ID: </span><span class="inline-listing">{{ user.ledId }}</span></p>
          <p><span class="field-head">Discord-ID: </span><span class="inline-listing">{{ user.discordId }}</span></p>
        </div>
        <div class="card">
          <button
            v-if="!isFormVisible"
            @click="isFormVisible = true"
            class="fab-button"
            title="Add New User"
          >
            <img class="sign-up-qrcode" src="./assets/attendance-board-qrcode.png" alt="QRCode to Sign-Up with Mobile Device.">
            <span class="sign-up-text">+</span>
          </button>
          <form v-if="isFormVisible"
              id="registration-form"
              @submit.prevent="registerDevice"
          >
            <p class="center mini-title">
              <strong>Register New User</strong>
            </p>
            <span class="field-head">
            <label for="username">Name* </label>
          </span>
            <input type="text"
                   id="username"
                   v-model="username"
                   name="username"
                   placeholder="Enter Your Name"
                   required
                   minlength="2"
                   maxlength="255"
                   class="card-field"
            />
            <br>
            <span class="field-head">
              <label for="ledId">LED-ID* </label>
            </span>
            <select id="ledId"
              v-model="ledId"
              name="ledId"
              required
              class="card-field"
            >
              <option disabled value="">選択してください</option>
              <option value="-1"> -1 (for delete) </option>
              <!-- 15回ループして0から14までの選択肢を自動生成します -->
              <option v-for="n in 15" :key="n-1" :value="n-1">
                LED {{ n - 1 }}
              </option>
            </select>
            <br>
            <span class="field-head">
            <label for="ipAddress">Local IP</label>
          </span>
            <input type="text"
                   id="ipAddress"
                   v-model="ipAddress"
                   name="ipAddress"
                   :placeholder=ipAddressPlaceholder
                   maxlength="15"
                   class="card-field"
            >
            <br>
            <span class="field-head">
            <label for="discordId">Discord ID</label>
          </span>
            <input type="text"
                   id="discordId"
                   v-model="discordId"
                   name="discordId"
                   placeholder="012345678901234567"
                   minlength="17"
                   maxlength="19"
                   class="card-field"
            >
            <div class="submit-container">
              <button type="submit"
                     value="Submit"
                     class="submit-button full-width"
              >
                Submit
              </button>
              <button type="button"
                      @click="cancelForm"
                      class="cancel-btn"
              >
                Cancel
              </button>
            </div>
            <p class="text-center"
               v-if="statusMessage"
               :class="{ 'error-text': isError, 'success-text': !isError }"
            >
              <strong>{{ statusMessage }}</strong>
            </p>
          </form>
        </div>
      </div>
      <p v-if="activeUsers.length === 0">
        No active users detected.
      </p>
    </div>

   <div class="section hide-on-mobile">
      <h2>Network Device Scan Output</h2>
      <div class="full-width" v-if="scanResults.length > 0">
        
        <!-- 1. 登録済みユーザーのみを抽出して名前とLED IDを表示 -->
        <div v-for="(device, index) in scanResults.filter(d => d.isRegistered)"
             :key="'reg-' + index">
          <p class="inline-listing">
            <span v-if="device.ledId != null"><{{ device.ledId }}> </span>{{ device.name }}
          </p>
        </div>

        <!-- 2. 未登録（Unknown）端末は「数」だけをカウントして表示 -->
        <p class="inline-listing" style="margin-top: 1em; color: gray;">
          Unknown Devices detected: {{ scanResults.filter(d => !d.isRegistered).length }}
        </p>

      </div>
      <p v-else>
        No scan results.
      </p>
    </div>

  </div>
</template>

<style scoped>

.logo {
  .logo-image {
    width: 15vh;
    height: auto;
  }
}

.container {
  display: flex;
  flex-wrap: wrap;
  gap: 3em;
  justify-content: center;
  padding: 4em;
  @media (max-width: 1024px) {
    padding-left: 1em;
    padding-right: 1em;
  }
}

.overlay-canvas {
  position: fixed;
  top: 3vh;
  left: 2vw;
  width: 96vw;
  height: 94vh;
  background-color: rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  box-shadow: 3px 3px 20px 3px rgba(0,0,0,0.3);
}

.overlay-canvas.deactivated {
  opacity: 0;
  height: 0;
}

.hide-on-desktop {
  display: none;
  visibility: hidden;
  @media (max-width: 1024px) {
    display: block;
    visibility: visible;
  }
}

.hide-on-mobile {
  display: none;
  visibility: hidden;
  @media (min-width: 1024px) {
    display: block;
    visibility: visible;
  }
}

.scrollable-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  pointer-events: auto;
}

.mobile-tutorial {
  position: absolute;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 5em 0;

  h2, h3, p {
    margin: 0.5em;
  }
}

.tutorial-step {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 12px;
  padding: 1em;
  margin: 1em;
}

.tutorial-picture {
  max-width: 100%;
  max-height: 50vh;
  border-radius: 15px;
  margin: 1em;
}

.close-overlay {
  position: fixed;
  z-index: 1000;
  top: 30px;
  right: 50px;
  height: 3vh;
  width: 3vh;
  border-radius: 2vh;
  background-color: rgba(0,0,0,0.0);
  box-shadow: 0 0 0 0;

  svg line {
    box-shadow: 3px 3px 20px 3px rgba(0,0,0,0.3);
  }

  :hover {
    transform: scale(1.1);
    transition: all 0.3s ease;
  }
}

.section {
  padding-top: 2em;
  max-width: 100%; /* Change to 45% for two column layout on desktop.*/
  @media (max-width: 1024px) {
    max-width: 100%;
  }
}

.page-title {
  width: 100%;
}

.center {
  display: flex;
  text-align: center;
  justify-content: center;
}

.text-center {
  text-align: center;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.mini-title {
  padding-bottom: 1em;
}

h1 {
  margin-bottom: 24px;
}

.user-display {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1em;
}

.card {
  padding: 24px;
  border: 1px solid #ccc;
  border-radius: 12px;
  max-width: 500px;
  text-align: left;
  justify-content: center;
  align-items: center;

  .field-head {
    display: inline-block;
    min-width: 6em;
  }

  .card-field {
    width: 60%;
    font-family: "JetBrains Mono", sans-serif;
  }

  .submit-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
    width: auto;
    justify-content: center;
    margin: 1em;
  }
}

.inline-listing {
  font-family: "JetBrains Mono", sans-serif;
  font-weight: normal;
}

ul {
  padding-left: 20px;
}

li {
  margin-bottom: 8px;
}

.error-text {
  color: red;
}

.success-text {
  color: green;
}

.submit-button {
  background-color: var(--accent-h);
  color: white;
  flex: 1;
}

.submit-button:hover {
  background-color: var(--accent);
}

.fab-button {
  width: 100%;
  min-width: 60px;
  height: 100%;
  border-radius: 15px;
  background-color: lightgrey;
  color: black;
  font-size: 2rem;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 3px 3px 3px rgba(0,0,0,0.1);
  transition: transform 0.2s, background-color 0.2s;
}

.fab-button:hover {
  background-color: var(--accent);
}

.sign-up-qrcode {
  display: inherit;
  max-width: 4em;
  visibility: visible;
  @media (max-width: 1024px) {
    display: none;
    visibility: hidden;
  }
}

.sign-up-text {
  display: none;
  visibility: hidden;
  @media (max-width: 1024px) {
    visibility: visible;
    display: inherit;
  }
}

.hidden {
  display: none;
  width: 0;
  height: 0;
  visibility: hidden;
}
</style>