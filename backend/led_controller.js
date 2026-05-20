// led_controller.js
const { exec } = require('child_process');
const path = require('path');

// Pythonスクリプトのパス（ご自身の環境に合わせて調整してください）
// ※ ledController.js の場所を基準（__dirname）にしてパスを計算します
const PYTHON_SCRIPT_PATH = path.join(__dirname, '../LED/led_controller.py');

/**
 * 点灯させるべきLEDのID配列を受け取り、Pythonスクリプトを実行する
 * @param {Array<number>} activeLedIds - 在室中ユーザーのLED IDリスト (例: [1, 2, 4])
 * @param {boolean} logPresence - ログ出力のON/OFFフラグ
 */
function updateLeds(activeLedIds, logPresence = false) {
    // 配列をスペース区切りの文字列に変換 ("1 2 4" など)
    const args = activeLedIds.join(' ');
    const command = `python3 ${PYTHON_SCRIPT_PATH} ${args}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[${new Date().toISOString()}] LED control error:`, error.message);
            return;
        }
        
        // Python側からの警告などを出力したい場合はコメントアウトを外します
        // if (stderr) {
        //     console.warn(`[LED ERROR]:`, stderr);
        // }
        
        if (logPresence) {
             console.log(`   LED status updated! [${args}] -> ${stdout.trim()}`);
        }
    });
}

// 他のファイル（server.jsなど）からこの関数を呼び出せるようにエクスポートします
module.exports = {
    updateLeds
};