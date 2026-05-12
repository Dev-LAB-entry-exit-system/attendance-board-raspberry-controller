<script setup>
import { ref, onMounted } from 'vue'

const activeUsers = ref([])

const fetchDevices = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/devices')
    const data = await response.json()

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
    <h1>Attendance Board</h1>

    <div class="card">
      <h2>Active Users</h2>

      <ul v-if="activeUsers.length > 0">
        <li
          v-for="user in activeUsers"
          :key="user.ip"
        >
          {{ user.name }} (LED {{ user.ledId }})
        </li>
      </ul>

      <p v-else>
        No active users detected.
      </p>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 40px;
  font-family: Arial, sans-serif;
}

h1 {
  margin-bottom: 24px;
}

.card {
  padding: 24px;
  border: 1px solid #ccc;
  border-radius: 12px;
  max-width: 500px;
}

ul {
  padding-left: 20px;
}

li {
  margin-bottom: 8px;
}
</style>