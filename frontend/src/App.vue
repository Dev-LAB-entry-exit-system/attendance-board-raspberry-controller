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
     <header class="topbar">
      <h1>Attendance Board</h1>

      <div class="status online">
        ● System Online
      </div>
    </header>
  <div class="dashboard">

    <div class="card">
      <div class="card-header">
        Active Users
      </div>

      <div class="user-list">
        <ul v-if="activeUsers.length > 0">
          <li
          v-for="user in activeUsers"
          :key="user.ip"
          class="user-item"
        >
         <span class="user-name">
              {{ user.name }}
            </span>

            <span class="led-badge">
              LED {{ user.ledId }}
            </span>
          </li>
        </ul>

        <p
          v-else
          class="empty"
        >
          No active users detected.
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        User Management
      </div>
      <div class="user-list">
        <button class="manage-button">
          + Add User
          </button>
        <button class="manage-button">
          Edit User
        </button>

        <button class="manage-button">
          Delete User
        </button>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  min-height: 100vh;

  padding: 40px;

  background-color: #f4f7fb;

  font-family: Arial, sans-serif;

  color: #222;
}

h1 {
  color: #1f57b5;
  
  font-size: 42px;
  
  margin-bottom: 32px;

  font-weight: bold;
}

.topbar {
  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 40px;
}

.status {
  padding: 8px 16px;

  border-radius: 999px;

  font-weight: bold;
}

.online {
  background: #d7f5df;

  color: #0f7a31;
}

.card {
  background: white;
  
  border: 2px solid #c7dbf7;
  
  border-radius: 10px;
  
  overflow: hidden;
  
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); 

  min-width: 0;
    
  height: fit-content;
  }

.card-header {
  background: #dcecff;

  color: #1f57b5;

  font-size: 24px;

  font-weight: bold;

  padding: 10px 24px;

  border-bottom: 2px solid #c7dbf7;
}

.user-list {
  padding: 20px;
}

.user-item {
  display: flex;

  justify-content: space-between;

  align-items: center;

  padding: 14px 18px;

  margin-bottom: 12px;

  background: #f8fbff;

  border-left: 6px solid #1f57b5;

  border-radius: 8px;

  transition: 0.2s;
}

.user-item:hover {
  background: #edf5ff;
}

.user-name {
  font-size: 18px;

  font-weight: bold;
}

.led-badge {
  background: #1f57b5;

  color: white;

  padding: 6px 14px;

  border-radius: 999px;

  font-size: 14px;

  font-weight: bold;
}

.empty {
  padding: 70px;

  text-align: center;

  color: #666;
}

.dashboard {
  display: grid;

  grid-template-columns: 2fr 1fr;

  gap: 24px;

  align-items: start;

  width: 100%;
}

.manage-button {
  width: 100%;

  margin-top: 12px;

  padding: 14px;

  background: #edf5ff;

  color: #1f57b5;

  border: 2px solid #c7dbf7;

  border-radius: 8px;

  font-size: 16px;

  font-weight: bold;

  cursor: pointer;

  transition: 0.2s;
}

.manage-button:hover {
  background: #dcecff;
}
</style>