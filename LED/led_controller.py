import RPi.GPIO as GPIO
import time

# LED番号とGPIOピンの対応リスト
led_pins = [4, 17, 27, 22, 5, 6, 13, 19, 26, 18, 23, 24, 25, 16, 20]

# LEDの状態を管理するリスト
led_states = [False] * len(led_pins)

def init_led():
    """
    LEDのGPIOピンを初期化する関数
    A function to initialize the GPIO pins for the LEDs
    """
    GPIO.setmode(GPIO.BCM)

    for pin in led_pins:
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.LOW)


def set_led(led_id, state):
    """
    状態を受け取り、指定したLEDを点灯または消灯させる関数
    A function that takes a state and turns on or off the specified LED
    """
    if 0 <= led_id < len(led_pins):

        pin = led_pins[led_id]

        if state:
            led_on(pin)
        else:
            led_off(pin)
        
        led_states[led_id] = state


def led_on(pin):
    """
    指定したGPIOピンのLEDを点灯させる関数
    A function to turn on the LED on a specified GPIO pin
    """
    GPIO.output(pin, True)


def led_off(pin):
    """
    指定したGPIOピンのLEDを消灯させる関数
    A function to turn off the LED on a specified GPIO pin
    """
    GPIO.output(pin, False)


def cleanup():
    """
    GPIOを解放する関数
    A function to release GPIO resources
    """
    GPIO.cleanup()



if __name__ == "__main__":

    init_led()

    set_led(0, True)
    time.sleep(1)

    set_led(1, True)
    time.sleep(1)

    set_led(1, False)
    time.sleep(1)

    set_led(0, False)

    cleanup()