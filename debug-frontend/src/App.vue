<script setup>
import {ref, onMounted, onUnmounted} from 'vue'

const activeUsers = ref([])
const scanResults = ref([])
const isFormVisible = ref(false)
const username = ref('');
const ledId = ref('');
const ipAddress = ref('');
const statusMessage = ref('');
const isError = ref(false);

const UPDATE_INTERVAL = 60 * 1000 // 60 seconds
let intervalId

const fetchDevices = async () => {
  try {
    const response = await fetch('/api/devices')
    const data = await response.json()

    scanResults.value = data.allDevices
    activeUsers.value = data.activeUsers
  } catch (error) {
    console.error('Failed to fetch devices:', error)
  }
}

async function registerDevice() {
  // Construct the payload
  const payload = {
    name: username.value,
    ledId: Number(ledId.value),
  };

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
}

onMounted(() => {
  fetchDevices()
  intervalId = setInterval(fetchDevices, UPDATE_INTERVAL)
})

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>

<template>
  <div class="container">
    <h1 class="page-title">Attendance Board</h1>

    <div class="section">
      <h2>Active Users</h2>
      <div class="user-display">
        <div class="card"
             v-for="user in activeUsers"
             :key="user.ip">
          <p class="center mini-title"><strong>{{ user.name }}</strong></p>
          <p><span class="field-head">LED-ID: </span><span class="inline-listing">{{ user.ledId }}</span></p>
          <p><span class="field-head">IP: </span><span class="inline-listing">{{ user.ip }}</span></p>
          <p><span class="field-head">MAC: </span><span class="inline-listing">{{ user.mac }}</span></p>
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
                   minlength="3"
                   maxlength="255"
                   class="card-field"
            />
            <br>
            <span class="field-head">
            <label for="ledId">LED-ID* </label>
          </span>
            <input type="number"
                   id="ledId"
                   v-model="ledId"
                   name="ledId"
                   placeholder="LED ID of Your Seat"
                   required
                   min="0"
                   max="100"
                   step="1"
                   class="card-field"
            >
            <br>
            <span class="field-head">
            <label for="ipAddress">Local IP</label>
          </span>
            <input type="text"
                   id="ipAddress"
                   v-model="ipAddress"
                   name="ipAddress"
                   placeholder="auto-detect"
                   maxlength="15"
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
          </form>
          <p class="text-center"
             v-if="statusMessage"
             :class="{ 'error-text': isError, 'success-text': !isError }"
          >
            <strong>{{ statusMessage }}</strong>
          </p>
        </div>
      </div>
      <p v-if="activeUsers.length === 0">
        No active users detected.
      </p>
    </div>

    <div class="section">
      <h2>Network Device Scan Output</h2>
      <div class="full-width" v-if="scanResults.length > 0">
        <div v-for="device in scanResults"
             :key="device.ip">
          <p class="inline-listing"><span v-if="device.ledId != null"><{{ device.ledId }}> </span>{{ device.name }} |
            <span style="display: inline-block; width: 8em;">{{ device.ip }}</span> | {{ device.mac }} |
            isRegistered:{{ device.isRegistered }}</p>
        </div>
      </div>
      <p v-else>
        No scan results.
      </p>
    </div>

  </div>
</template>

<style scoped>
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
    min-width: 5em;
  }

  .card-field {
    width: 65%;
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
  visibility: hidden;
}
</style>