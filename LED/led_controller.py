import RPi.GPIO as GPIO
import time
import sys

# LED番号とGPIOピンの対応リスト
led_pins = [4, 17, 27, 22, 5, 6, 13, 19, 26, 18, 23, 24, 25, 16, 20]

# LEDの状態を管理するリスト
led_states = [False] * len(led_pins)

def init_led():
    """
    LEDのGPIOピンを初期化する関数
    A function to initialize the GPIO pins for the LEDs
    """
    # 警告をオフにする（別プロセスから何度も呼ばれると警告が出るため）
    GPIO.setwarnings(False) 
    GPIO.setmode(GPIO.BCM)

    for pin in led_pins:
        # OUTに設定するだけで、初期状態(LOW)にはしないように変更
        # （毎回LOWにすると、すでに光っているLEDが一瞬消えてチラつくため）
        GPIO.setup(pin, GPIO.OUT)


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

    # Node.jsから渡された引数（例: "1 3 5"）を取得し、整数のリストにする
    # sys.argv[0] はファイル名なので無視する
    active_ids = []
    for arg in sys.argv[1:]:
        try:
            active_ids.append(int(arg))
        except ValueError:
            pass # 数値に変換できないものは無視

    print(f"Active LED IDs: {active_ids}")

    # すべてのLEDピンに対して、点灯か消灯かを判定して設定する
    for i in range(len(led_pins)):
        if i in active_ids:
            set_led(i, True)  # リストにあれば点灯
        else:
            set_led(i, False) # リストになければ消灯

    # 注意: ここで cleanup() を呼ぶと、スクリプト終了時にすべてのLEDが消えてしまうため、
    # 状態を保持したい場合は cleanup() を呼び出しません。
    # 完全にサーバーを終了する際などに別のスクリプトで cleanup を呼ぶのが良いでしょう。