import RPi.GPIO as GPIO

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