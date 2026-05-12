import RPi.GPIO as GPIO
import time

LEDS = [17, 27, 22, 23]

GPIO.setmode(GPIO.BCM)

for pin in LEDS:
    GPIO.setup(pin, GPIO.OUT)

try:

    while True:

        for number in range(16):

            for i in range(4):

                bit = (number >> i) & 1

                GPIO.output(LEDS[i], bit)

            print(number)

            time.sleep(1)

finally:

    GPIO.cleanup()