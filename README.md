# attendance-board-raspberry-controller

開発用のプライベートリポジトリです。  
Raspberry Pi上で動作するコントローラーがユーザーを識別し、出席ボード上のユーザーに対応するライトを制御します。

This is a private repository for development. A controller running on a Raspberry Pi identifies users and controls the corresponding lights on the attendance board.

---

## 📝 Overview
本リポジトリは、出席管理システムにおけるRaspberry Pi側の制御プログラムを管理します。
This repository manages the control program for the Raspberry Pi side of the attendance management system.

主な役割 (Main functions)：
- ユーザー識別 (User identification)
- 出席状態の判定 (Attendance status determination)
- LED（ライト）の制御 (LED (light) control)

---

## 🏗️ System Overview
- Raspberry Piがbluetoothでユーザーを識別 (Raspberry Pi identifies users via Bluetooth)
- 対応するユーザーのLEDを点灯／消灯 (Turns the corresponding user's LED on/off)
- 出席状況を物理的に可視化 (Physically visualizes attendance status)

---

## 🔧 Development Environment
- Raspberry Pi（specify the model）
- OS：Raspberry Pi OS
- Python：3.x
