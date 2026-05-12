# -*- coding: utf-8 -*-
import RPi.GPIO as GPIO
import time

COUNT = 3
PIN = 17   # GPIO17

GPIO.setmode(GPIO.BCM)
GPIO.setup(PIN, GPIO.OUT)

for _ in range(COUNT):
    GPIO.output(PIN, True) # LEDをつける
    time.sleep(1.0)

    GPIO.output(PIN, False) # LEDを消灯
    time.sleep(1.0)

GPIO.cleanup()