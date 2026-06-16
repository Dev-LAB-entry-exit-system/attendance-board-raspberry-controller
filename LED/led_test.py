import RPi.GPIO as GPIO
import time

led_pins = [
    4, 17, 27, 22, 5, 6, 13,
    19, 26, 18, 23, 24, 25, 16, 20
]

GPIO.setmode(GPIO.BCM)

# 初期化
for pin in led_pins:
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, GPIO.LOW)

try:
    # 一つずつ点灯
    for pin in led_pins:
        GPIO.output(pin, GPIO.HIGH)
        time.sleep(0.5)
        GPIO.output(pin, GPIO.LOW)

    # 全点灯
    for pin in led_pins:
        GPIO.output(pin,GPIO.HIGH)

    # 5秒間だけ点灯
    time.sleep(5)

    # 消灯
    for pin in led_pins:
        GPIO.output(pin,GPIO.LOW)

except KeyboardInterrupt:
    pass

finally:
    GPIO.cleanup()