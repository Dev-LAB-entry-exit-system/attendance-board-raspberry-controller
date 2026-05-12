# attendance-board-raspberry-controller

開発用のプライベートリポジトリです。  
Raspberry Pi上で動作するコントローラーが、研究室ネットワーク内のユーザー端末を検出し、出席ボード上の対応するLEDを制御します。

This is a private repository for development.  
A controller running on a Raspberry Pi detects user devices on the local network and controls the corresponding LEDs on the attendance board.

---

## 📝 Overview

本リポジトリは、出席管理システムにおけるRaspberry Pi側の制御プログラムを管理します。

This repository manages the Raspberry Pi-side control program for the attendance management system.

### 主な役割 (Main Functions)

- LAN内端末の検出 (Local network device detection)
- ユーザー識別 (User identification)
- 出席状態の判定 (Attendance status determination)
- LED（ライト）の制御 (LED control)
- 出席状況の物理的可視化 (Physical visualization of attendance status)

---

## 🏗️ System Overview

### システム構成 (System Flow)

```text
User Device
    ↓
Research Lab Wi-Fi
    ↓
Raspberry Pi Device Scanner
    ↓
User Identification
    ↓
LED Control
    ↓
Attendance Board Visualization
```

### 動作概要 (Behavior)

- Raspberry Piが研究室ネットワーク内の端末を検出
- 登録済みユーザー情報と照合
- 対応するユーザーのLEDを点灯／消灯
- 出席状況を物理的に可視化

The Raspberry Pi scans devices on the local network, matches them with registered users, and controls the corresponding LEDs to visualize attendance status physically.

---

## 🔧 Development Environment

- Raspberry Pi 3 / 4
- OS：Raspberry Pi OS
- Node.js：v18+
- npm
- Express
- local-devices

---

## ⚙️ Setup

### 0. Install Node.js

#### Windows

Install the LTS version of Node.js from the official website.

https://nodejs.org/

After installation, verify it with:

```bash
node -v
npm -v
```

---

#### Raspberry Pi / Linux

Update packages:

```bash
sudo apt update
sudo apt upgrade -y
```

Install Node.js and npm:

```bash
sudo apt install -y nodejs npm
```

Verify installation:

```bash
node -v
npm -v
```

---

### 1. Clone Repository

```bash
git clone <repository-url>
cd attendance-board-raspberry-controller
```

---

### 2. Install Dependencies

バックエンドは `backend/` ディレクトリで実行します。

```bash
cd backend
npm install
```

---

### 3. Start Server

`backend` ディレクトリ内で次のコマンドを実行してください。

```bash
node index.js
```

リポジトリルートで `node index.js` を実行すると `index.js` が見つからないエラーになります。

サーバが正常に起動すると、以下のように表示されます。

When the server starts successfully, the following message will appear:
```text
Scanner running on port 3000
```

---

### 4. Start Frontend (Vue + Vite)

フロントエンドを起動するには、別ターミナルで `http://localhost:3000/api/devicesdebug-frontend` ディレクトリへ移動して依存関係をインストールします。

To start the frontend, open another terminal, move into the `debug-frontend` directory, and install dependencies.

```bash
cd debug-frontend
npm install
npm run dev
```

起動後はブラウザで以下にアクセスします。

After startup, open:

```text
http://localhost:5173
```

---

### 5. Access API

バックエンドが起動したら、ブラウザや API クライアントで直接確認できます。

Access the backend directly from your browser or API client:
```text
http://localhost:3000/api/devices
```

この URL を開くと、検出済みデバイスと登録済みユーザー情報を含む JSON レスポンスが表示されます。

---

## 📡 API

### GET `/api/devices`

検出されたLAN内端末一覧を取得します。

Returns the list of detected devices on the local network.

---

### POST `/api/register`

ユーザー情報を登録します。

Registers user information.

#### Request Body

```json
{
  "name": "Takato",
  "ledId": 3,
  "ip": "172.16.0.143"
}
```

---

## 🚧 Future Tasks

- フロントエンド登録画面の作成
- MACアドレスベース認識への移行
- GPIOによるLED制御
- Bluetooth / BLE対応
- データベース対応
- リアルタイム在室表示UIの追加