<script setup>
import { ref, onMounted } from 'vue'

const activeUsers = ref([])
const scanResults = ref([])

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

onMounted(() => {
  fetchDevices()
})
</script>

<template>
  <div class="container">
    <h1 class="page-title">Attendance Board</h1>

    <div class="section">
      <h2>Active Users</h2>
      <div class="user-display"
           v-if="activeUsers.length > 0">
        <div class="card"
             v-for="user in activeUsers"
             :key="user.ip">
          <p class="center mini-title"><strong>{{ user.name }}</strong></p>
          <p><span class="field-head">LED-ID: </span><span class="inline-listing">{{ user.ledId }}</span></p>
          <p><span class="field-head">IP: </span><span class="inline-listing">{{ user.ip }}</span></p>
          <p><span class="field-head">MAC: </span><span class="inline-listing">{{ user.mac }}</span></p>
        </div>
      </div>
      <p v-else>
        No active users detected.
      </p>
    </div>

    <div class="section">
      <h2>Network Device Scan Output</h2>
      <div class="full-width" v-if="scanResults.length > 0">
        <div v-for="device in scanResults"
             :key="device.ip">
          <p class="inline-listing"><span v-if="device.ledId != null"><{{ device.ledId }}> </span>{{ device.name }} | <span style="display: inline-block; width: 8em;">{{ device.ip }}</span> | {{ device.mac }} | isRegistered:{{ device.isRegistered }}</p>
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

  p {
    text-align: left;

    .field-head {
      display: inline-block;
      min-width: 5em;
    }
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
</style>